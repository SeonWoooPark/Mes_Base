// 외부 엔티티 import
import { BOM } from '../entities/BOM';
import { BOMId } from '../entities/BOMItem';
import { BOMItem } from '../entities/BOMItem';
import { ProductId } from '@features/product/domain/entities/Product';
import { BOMRepository } from '../repositories/BOMRepository';
import { BOMItemRepository } from '../repositories/BOMItemRepository';

/**
 * BOM 순환 참조 검사 서비스
 * 
 * 역할:
 * - BOM 구조에서 순환 참조 탐지
 * - 새로운 구성품 추가 시 순환 참조 방지
 * - 트리 구조 무결성 보장
 * - 성능 최적화된 순환 검사 알고리즘
 * 
 * 순환 참조 시나리오:
 * - 직접 순환: A → B → A
 * - 간접 순환: A → B → C → A  
 * - 자기 참조: A → A
 * - 복합 순환: 여러 경로를 통한 순환
 * 
 * 알고리즘:
 * - DFS(깊이 우선 탐색) 기반
 * - 방문 노드 추적으로 순환 탐지
 * - 메모이제이션으로 성능 최적화
 */

/**
 * 순환 참조 검사 결과
 */
export interface CircularReferenceResult {
  hasCircularReference: boolean;       // 순환 참조 존재 여부
  circularPath?: ProductId[];          // 순환 경로 (순환이 있을 경우)
  circularDepth?: number;              // 순환이 발생한 깊이
  message?: string;                    // 사용자 친화적 메시지
}

/**
 * 순환 참조 검사 옵션
 */
export interface CircularCheckOptions {
  maxDepth?: number;                   // 최대 검사 깊이 (기본: 50)
  includeSelfReference?: boolean;      // 자기 참조 포함 여부 (기본: true)
  useCache?: boolean;                  // 캐시 사용 여부 (기본: true)
}

/**
 * BOM 순환 참조 검사 서비스 인터페이스
 */
export interface BOMCircularChecker {
  /**
   * BOM에 새로운 아이템 추가 시 순환 참조 검사
   * @param bom 기존 BOM
   * @param newItem 추가할 새로운 BOM 아이템
   * @param options 검사 옵션
   * @returns 순환 참조 검사 결과
   */
  hasCircularReference(bom: BOM, newItem: BOMItem, options?: CircularCheckOptions): Promise<CircularReferenceResult>;

  /**
   * 전체 BOM 구조의 순환 참조 검사
   * @param bom 검사할 BOM
   * @param options 검사 옵션
   * @returns 순환 참조 검사 결과
   */
  checkBOMStructure(bom: BOM, options?: CircularCheckOptions): Promise<CircularReferenceResult>;

  /**
   * 특정 구성품을 추가할 때의 순환 참조 검사
   * @param parentProductId 부모 제품 ID
   * @param componentId 추가할 구성품 ID
   * @param options 검사 옵션
   * @returns 순환 참조 검사 결과
   */
  checkComponentAddition(parentProductId: ProductId, componentId: ProductId, options?: CircularCheckOptions): Promise<CircularReferenceResult>;

  /**
   * 검사 캐시 초기화
   */
  clearCache(): void;
}

/**
 * BOM 순환 참조 검사 서비스 기본 구현
 */
export class DefaultBOMCircularChecker implements BOMCircularChecker {
  private readonly checkCache = new Map<string, CircularReferenceResult>();
  private readonly maxDefaultDepth = 50;

  constructor(
    private readonly bomRepository: BOMRepository,
    private readonly bomItemRepository: BOMItemRepository
  ) {}

  /**
   * BOM에 새로운 아이템 추가 시 순환 참조 검사
   */
  async hasCircularReference(bom: BOM, newItem: BOMItem, options?: CircularCheckOptions): Promise<CircularReferenceResult> {
    const opts = this.getDefaultOptions(options);
    const cacheKey = this.generateCacheKey(bom.getId(), newItem.getComponentId(), opts);

    // 캐시 확인
    if (opts.useCache && this.checkCache.has(cacheKey)) {
      return this.checkCache.get(cacheKey)!;
    }

    try {
      const result = await this.performCircularCheck(bom, newItem, opts);
      
      // 결과 캐싱
      if (opts.useCache) {
        this.checkCache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      return {
        hasCircularReference: true,
        message: `순환 참조 검사 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    }
  }

  /**
   * 전체 BOM 구조의 순환 참조 검사
   */
  async checkBOMStructure(bom: BOM, options?: CircularCheckOptions): Promise<CircularReferenceResult> {
    const opts = this.getDefaultOptions(options);
    const bomItems = bom.getBOMItems();

    // 각 최상위 아이템부터 DFS 탐색
    for (const rootItem of bomItems.filter(item => item.isTopLevel())) {
      const result = await this.checkItemStructure(rootItem, bomItems, new Set(), [], opts);
      if (result.hasCircularReference) {
        return result;
      }
    }

    return {
      hasCircularReference: false,
      message: 'BOM 구조에 순환 참조가 없습니다.'
    };
  }

  /**
   * 특정 구성품을 추가할 때의 순환 참조 검사
   */
  async checkComponentAddition(parentProductId: ProductId, componentId: ProductId, options?: CircularCheckOptions): Promise<CircularReferenceResult> {
    const opts = this.getDefaultOptions(options);

    // 자기 참조 검사
    if (opts.includeSelfReference && parentProductId.equals(componentId)) {
      return {
        hasCircularReference: true,
        circularPath: [parentProductId, componentId],
        circularDepth: 1,
        message: '자기 자신을 구성품으로 추가할 수 없습니다.'
      };
    }

    // 부모 제품이 추가하려는 구성품의 하위에 있는지 확인
    const hasIndirectCircular = await this.checkIndirectCircular(parentProductId, componentId, opts);
    if (hasIndirectCircular.hasCircularReference) {
      return hasIndirectCircular;
    }

    return {
      hasCircularReference: false,
      message: '순환 참조가 없습니다.'
    };
  }

  /**
   * 검사 캐시 초기화
   */
  clearCache(): void {
    this.checkCache.clear();
  }

  // === Private 메서드들 ===

  /**
   * 실제 순환 참조 검사 수행
   */
  private async performCircularCheck(bom: BOM, newItem: BOMItem, options: CircularCheckOptions): Promise<CircularReferenceResult> {
    const parentProductId = bom.getProductId();
    const componentId = newItem.getComponentId();

    // 자기 참조 검사
    if (options.includeSelfReference && parentProductId.equals(componentId)) {
      return {
        hasCircularReference: true,
        circularPath: [parentProductId],
        circularDepth: 0,
        message: '자기 자신을 구성품으로 추가할 수 없습니다.'
      };
    }

    // 기존 BOM 구조에서 순환 참조 검사
    return await this.checkIndirectCircular(parentProductId, componentId, options);
  }

  /**
   * 간접 순환 참조 검사 (DFS)
   */
  private async checkIndirectCircular(
    startProductId: ProductId, 
    targetComponentId: ProductId, 
    options: CircularCheckOptions
  ): Promise<CircularReferenceResult> {
    const visited = new Set<string>();
    const path: ProductId[] = [];

    return await this.dfsCircularCheck(startProductId, targetComponentId, visited, path, 0, options);
  }

  /**
   * 깊이 우선 탐색으로 순환 참조 검사
   */
  private async dfsCircularCheck(
    currentProductId: ProductId,
    targetComponentId: ProductId,
    visited: Set<string>,
    path: ProductId[],
    depth: number,
    options: CircularCheckOptions
  ): Promise<CircularReferenceResult> {
    // 최대 깊이 검사
    if (depth >= (options.maxDepth || this.maxDefaultDepth)) {
      return {
        hasCircularReference: false,
        message: '최대 검사 깊이에 도달했습니다.'
      };
    }

    // 방문 표시
    const currentId = currentProductId.getValue();
    if (visited.has(currentId)) {
      return {
        hasCircularReference: true,
        circularPath: [...path, currentProductId],
        circularDepth: depth,
        message: `순환 참조가 발견되었습니다: ${path.map(p => p.getValue()).join(' → ')} → ${currentId}`
      };
    }

    visited.add(currentId);
    path.push(currentProductId);

    try {
      // 현재 제품의 BOM에서 대상 구성품 찾기
      const currentBOM = await this.bomRepository.findActiveByProductId(currentProductId);
      if (!currentBOM) {
        return { hasCircularReference: false };
      }

      const bomItems = currentBOM.getBOMItems();
      
      // 각 구성품에 대해 재귀 검사
      for (const item of bomItems) {
        const itemComponentId = item.getComponentId();
        
        // 대상 구성품을 찾았다면 순환 참조
        if (itemComponentId.equals(targetComponentId)) {
          return {
            hasCircularReference: true,
            circularPath: [...path, itemComponentId],
            circularDepth: depth + 1,
            message: `순환 참조가 발견되었습니다: ${path.map(p => p.getValue()).join(' → ')} → ${itemComponentId.getValue()}`
          };
        }

        // 재귀적으로 하위 검사
        const result = await this.dfsCircularCheck(itemComponentId, targetComponentId, new Set(visited), [...path], depth + 1, options);
        if (result.hasCircularReference) {
          return result;
        }
      }

      return { hasCircularReference: false };

    } finally {
      // 백트래킹을 위해 방문 표시 제거
      visited.delete(currentId);
      path.pop();
    }
  }

  /**
   * 개별 아이템의 구조 순환 검사
   */
  private async checkItemStructure(
    item: BOMItem,
    allItems: BOMItem[],
    visited: Set<string>,
    path: ProductId[],
    options: CircularCheckOptions
  ): Promise<CircularReferenceResult> {
    const componentId = item.getComponentId();
    const componentKey = componentId.getValue();

    if (visited.has(componentKey)) {
      return {
        hasCircularReference: true,
        circularPath: [...path, componentId],
        circularDepth: path.length,
        message: `BOM 구조에서 순환 참조가 발견되었습니다: ${path.map(p => p.getValue()).join(' → ')} → ${componentKey}`
      };
    }

    visited.add(componentKey);
    path.push(componentId);

    try {
      // 자식 아이템들 검사
      const childItems = allItems.filter(childItem => 
        childItem.getParentItemId()?.equals(item.getId())
      );

      for (const childItem of childItems) {
        const result = await this.checkItemStructure(childItem, allItems, new Set(visited), [...path], options);
        if (result.hasCircularReference) {
          return result;
        }
      }

      return { hasCircularReference: false };

    } finally {
      visited.delete(componentKey);
      path.pop();
    }
  }

  /**
   * 기본 옵션 생성
   */
  private getDefaultOptions(options?: CircularCheckOptions): CircularCheckOptions {
    return {
      maxDepth: options?.maxDepth ?? this.maxDefaultDepth,
      includeSelfReference: options?.includeSelfReference ?? true,
      useCache: options?.useCache ?? true
    };
  }

  /**
   * 캐시 키 생성
   */
  private generateCacheKey(bomId: BOMId, componentId: ProductId, options: CircularCheckOptions): string {
    return `${bomId.getValue()}-${componentId.getValue()}-${options.maxDepth}-${options.includeSelfReference}`;
  }
}