// 외부 엔티티 import
import { BOM } from '../entities/BOM';
import { BOMId } from '../entities/BOMItem';
import { BOMItem, BOMItemId } from '../entities/BOMItem';
import { ProductId } from '../entities/Product';
import { BOMRepository } from '../repositories/BOMRepository';
import { BOMItemRepository } from '../repositories/BOMItemRepository';

/**
 * BOM 사용여부 검증 서비스
 * 
 * 역할:
 * - BOM 삭제 전 사용여부 확인
 * - BOM Item 삭제 전 의존성 검사
 * - 생산 계획, 작업 지시에서의 사용여부 확인
 * - 다른 BOM에서의 참조 여부 확인
 * - 안전한 삭제를 위한 종합적 검증
 * 
 * 검사 범위:
 * - 생산 계획 시스템
 * - 작업 지시 시스템  
 * - 재고 관리 시스템
 * - 다른 BOM에서의 참조
 * - 진행 중인 제조 작업
 */

/**
 * 사용처 유형 열거형
 */
export enum UsageType {
  PRODUCTION_PLAN = 'PRODUCTION_PLAN',     // 생산 계획
  WORK_ORDER = 'WORK_ORDER',               // 작업 지시
  INVENTORY = 'INVENTORY',                 // 재고 관리
  OTHER_BOM = 'OTHER_BOM',                 // 다른 BOM 참조
  MANUFACTURING = 'MANUFACTURING',         // 제조 진행 중
  QUALITY_CONTROL = 'QUALITY_CONTROL',     // 품질 관리
  COSTING = 'COSTING'                      // 원가 계산
}

/**
 * 사용처 정보
 */
export interface UsageInfo {
  type: UsageType;                         // 사용처 유형
  id: string;                             // 사용처 ID
  name: string;                           // 사용처 명
  status: string;                         // 상태
  description?: string;                   // 상세 설명
  createdDate: Date;                      // 생성일
  importance: 'HIGH' | 'MEDIUM' | 'LOW';  // 중요도
}

/**
 * BOM 사용여부 검사 결과
 */
export interface BOMUsageResult {
  isUsed: boolean;                        // 사용 여부
  usages: UsageInfo[];                    // 사용처 목록
  canDelete: boolean;                     // 삭제 가능 여부
  warningMessage?: string;                // 경고 메시지
  blockingReasons: string[];              // 삭제 차단 사유들
  impactAnalysis: {                       // 영향도 분석
    highImpact: number;                   // 높은 영향도 개수
    mediumImpact: number;                 // 중간 영향도 개수
    lowImpact: number;                    // 낮은 영향도 개수
    totalAffected: number;                // 총 영향받는 개수
  };
}

/**
 * BOM Item 사용여부 검사 결과
 */
export interface BOMItemUsageResult {
  isUsed: boolean;                        // 사용 여부
  usages: UsageInfo[];                    // 사용처 목록
  canDelete: boolean;                     // 삭제 가능 여부
  hasChildren: boolean;                   // 하위 아이템 존재 여부
  childrenCount: number;                  // 하위 아이템 개수
  warningMessage?: string;                // 경고 메시지
  suggestions: string[];                  // 삭제 전 권장사항
}

/**
 * 사용여부 검사 옵션
 */
export interface UsageCheckOptions {
  checkProductionPlan?: boolean;          // 생산 계획 확인 (기본: true)
  checkWorkOrder?: boolean;               // 작업 지시 확인 (기본: true)
  checkInventory?: boolean;               // 재고 확인 (기본: false)
  checkOtherBOM?: boolean;                // 다른 BOM 확인 (기본: true)
  checkManufacturing?: boolean;           // 제조 진행 확인 (기본: true)
  includeInactive?: boolean;              // 비활성 항목 포함 (기본: false)
  deepCheck?: boolean;                    // 심화 검사 수행 (기본: false)
}

/**
 * BOM 사용여부 검증 서비스 인터페이스
 */
export interface BOMUsageChecker {
  /**
   * BOM 사용여부 종합 검사
   * @param bomId BOM ID
   * @param options 검사 옵션
   * @returns BOM 사용여부 검사 결과
   */
  checkBOMUsage(bomId: BOMId, options?: UsageCheckOptions): Promise<BOMUsageResult>;

  /**
   * BOM Item 사용여부 검사
   * @param bomItemId BOM Item ID
   * @param options 검사 옵션
   * @returns BOM Item 사용여부 검사 결과
   */
  checkBOMItemUsage(bomItemId: BOMItemId, options?: UsageCheckOptions): Promise<BOMItemUsageResult>;

  /**
   * 생산 계획에서의 사용여부 확인
   * @param bomId BOM ID
   * @returns 생산 계획에서 사용 중이면 true
   */
  isUsedInProduction(bomId: BOMId): Promise<boolean>;

  /**
   * 작업 지시에서의 사용여부 확인
   * @param bomId BOM ID
   * @returns 작업 지시에서 사용 중이면 true
   */
  isUsedInWorkOrder(bomId: BOMId): Promise<boolean>;

  /**
   * 다른 BOM에서의 참조여부 확인
   * @param productId 제품 ID (구성품으로 사용되는지 확인)
   * @returns 다른 BOM에서 참조하고 있으면 true
   */
  isReferencedInOtherBOM(productId: ProductId): Promise<boolean>;

  /**
   * 안전한 삭제 가능성 검증
   * @param bomId BOM ID
   * @returns 안전하게 삭제 가능하면 true
   */
  canSafelyDelete(bomId: BOMId): Promise<boolean>;
}

/**
 * BOM 사용여부 검증 서비스 기본 구현
 */
export class DefaultBOMUsageChecker implements BOMUsageChecker {
  constructor(
    private readonly bomRepository: BOMRepository,
    private readonly bomItemRepository: BOMItemRepository
  ) {}

  /**
   * BOM 사용여부 종합 검사
   */
  async checkBOMUsage(bomId: BOMId, options?: UsageCheckOptions): Promise<BOMUsageResult> {
    const opts = this.getDefaultOptions(options);
    const usages: UsageInfo[] = [];
    const blockingReasons: string[] = [];

    try {
      // BOM 존재 확인
      const bom = await this.bomRepository.findById(bomId);
      if (!bom) {
        return {
          isUsed: false,
          usages: [],
          canDelete: false,
          blockingReasons: ['BOM을 찾을 수 없습니다.'],
          impactAnalysis: { highImpact: 0, mediumImpact: 0, lowImpact: 0, totalAffected: 0 }
        };
      }

      // 각 시스템에서 사용여부 확인
      if (opts.checkProductionPlan) {
        const productionUsages = await this.checkProductionPlanUsage(bomId);
        usages.push(...productionUsages);
        if (productionUsages.length > 0) {
          blockingReasons.push('생산 계획에서 사용 중입니다.');
        }
      }

      if (opts.checkWorkOrder) {
        const workOrderUsages = await this.checkWorkOrderUsage(bomId);
        usages.push(...workOrderUsages);
        if (workOrderUsages.length > 0) {
          blockingReasons.push('작업 지시에서 사용 중입니다.');
        }
      }

      if (opts.checkOtherBOM) {
        const bomUsages = await this.checkOtherBOMUsage(bom.getProductId());
        usages.push(...bomUsages);
        if (bomUsages.length > 0) {
          blockingReasons.push('다른 BOM에서 구성품으로 사용 중입니다.');
        }
      }

      if (opts.checkManufacturing) {
        const manufacturingUsages = await this.checkManufacturingUsage(bomId);
        usages.push(...manufacturingUsages);
        if (manufacturingUsages.length > 0) {
          blockingReasons.push('제조 작업이 진행 중입니다.');
        }
      }

      if (opts.checkInventory) {
        const inventoryUsages = await this.checkInventoryUsage(bom.getProductId());
        usages.push(...inventoryUsages);
      }

      // 영향도 분석
      const impactAnalysis = this.analyzeImpact(usages);
      
      // 삭제 가능성 판단
      const canDelete = blockingReasons.length === 0;
      const isUsed = usages.length > 0;

      // 경고 메시지 생성
      let warningMessage: string | undefined;
      if (isUsed && canDelete) {
        warningMessage = `이 BOM을 삭제하면 ${usages.length}개의 항목에 영향을 줄 수 있습니다.`;
      } else if (!canDelete) {
        warningMessage = `다음 이유로 삭제할 수 없습니다: ${blockingReasons.join(', ')}`;
      }

      return {
        isUsed,
        usages,
        canDelete,
        warningMessage,
        blockingReasons,
        impactAnalysis
      };

    } catch (error) {
      return {
        isUsed: true, // 오류 시 안전하게 사용 중으로 판단
        usages: [],
        canDelete: false,
        warningMessage: `검사 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        blockingReasons: ['시스템 오류로 인해 삭제할 수 없습니다.'],
        impactAnalysis: { highImpact: 0, mediumImpact: 0, lowImpact: 0, totalAffected: 0 }
      };
    }
  }

  /**
   * BOM Item 사용여부 검사
   */
  async checkBOMItemUsage(bomItemId: BOMItemId, options?: UsageCheckOptions): Promise<BOMItemUsageResult> {
    const opts = this.getDefaultOptions(options);
    const usages: UsageInfo[] = [];
    const suggestions: string[] = [];

    try {
      // BOM Item 존재 확인
      const bomItem = await this.bomItemRepository.findById(bomItemId);
      if (!bomItem) {
        return {
          isUsed: false,
          usages: [],
          canDelete: false,
          hasChildren: false,
          childrenCount: 0,
          warningMessage: 'BOM 아이템을 찾을 수 없습니다.',
          suggestions: []
        };
      }

      // 하위 아이템 확인
      const hasChildren = await this.bomItemRepository.hasChildren(bomItemId);
      const childrenCount = hasChildren ? (await this.bomItemRepository.findByParentId(bomItemId)).length : 0;

      if (hasChildren) {
        suggestions.push('하위 구성품을 먼저 삭제하거나 함께 삭제 옵션을 선택하세요.');
        usages.push({
          type: UsageType.OTHER_BOM,
          id: bomItemId.getValue(),
          name: '하위 구성품',
          status: 'ACTIVE',
          description: `${childrenCount}개의 하위 구성품이 있습니다.`,
          createdDate: bomItem.getDtCreate(),
          importance: 'HIGH'
        });
      }

      // 다른 검사들 수행...
      if (opts.checkProductionPlan) {
        const productionUsages = await this.checkItemProductionUsage(bomItem);
        usages.push(...productionUsages);
      }

      // 삭제 가능성 판단
      const canDelete = !hasChildren || opts.deepCheck;
      const isUsed = usages.length > 0;

      // 경고 메시지 생성
      let warningMessage: string | undefined;
      if (hasChildren && !opts.deepCheck) {
        warningMessage = `이 구성품에는 ${childrenCount}개의 하위 구성품이 있습니다.`;
      } else if (isUsed) {
        warningMessage = `이 구성품을 삭제하면 ${usages.length}개의 항목에 영향을 줄 수 있습니다.`;
      }

      return {
        isUsed,
        usages,
        canDelete,
        hasChildren,
        childrenCount,
        warningMessage,
        suggestions
      };

    } catch (error) {
      return {
        isUsed: true,
        usages: [],
        canDelete: false,
        hasChildren: true,
        childrenCount: 0,
        warningMessage: `검사 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        suggestions: ['시스템 관리자에게 문의하세요.']
      };
    }
  }

  /**
   * 생산 계획에서의 사용여부 확인
   */
  async isUsedInProduction(bomId: BOMId): Promise<boolean> {
    // Mock 구현 - 실제로는 생산 계획 시스템과 연동
    // 현재는 항상 false 반환 (실제 구현 시 수정 필요)
    return Promise.resolve(false);
  }

  /**
   * 작업 지시에서의 사용여부 확인
   */
  async isUsedInWorkOrder(bomId: BOMId): Promise<boolean> {
    // Mock 구현 - 실제로는 작업 지시 시스템과 연동
    return Promise.resolve(false);
  }

  /**
   * 다른 BOM에서의 참조여부 확인
   */
  async isReferencedInOtherBOM(productId: ProductId): Promise<boolean> {
    try {
      const referencingItems = await this.bomItemRepository.findByComponentId(productId);
      return referencingItems.length > 0;
    } catch (error) {
      // 오류 시 안전하게 참조 중으로 판단
      return true;
    }
  }

  /**
   * 안전한 삭제 가능성 검증
   */
  async canSafelyDelete(bomId: BOMId): Promise<boolean> {
    const usageResult = await this.checkBOMUsage(bomId);
    return usageResult.canDelete && usageResult.impactAnalysis.highImpact === 0;
  }

  // === Private 메서드들 ===

  /**
   * 생산 계획 사용여부 확인
   */
  private async checkProductionPlanUsage(bomId: BOMId): Promise<UsageInfo[]> {
    // Mock 구현 - 실제로는 생산 계획 시스템 조회
    return [];
  }

  /**
   * 작업 지시 사용여부 확인
   */
  private async checkWorkOrderUsage(bomId: BOMId): Promise<UsageInfo[]> {
    // Mock 구현 - 실제로는 작업 지시 시스템 조회
    return [];
  }

  /**
   * 다른 BOM에서의 사용여부 확인
   */
  private async checkOtherBOMUsage(productId: ProductId): Promise<UsageInfo[]> {
    try {
      const referencingItems = await this.bomItemRepository.findByComponentId(productId);
      
      return referencingItems.map(item => ({
        type: UsageType.OTHER_BOM,
        id: item.getBOMId().getValue(),
        name: `BOM ${item.getBOMId().getValue()}`,
        status: 'ACTIVE',
        description: `구성품으로 사용됨`,
        createdDate: item.getDtCreate(),
        importance: 'MEDIUM' as const
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * 제조 진행 사용여부 확인
   */
  private async checkManufacturingUsage(bomId: BOMId): Promise<UsageInfo[]> {
    // Mock 구현 - 실제로는 제조 시스템 조회
    return [];
  }

  /**
   * 재고 사용여부 확인
   */
  private async checkInventoryUsage(productId: ProductId): Promise<UsageInfo[]> {
    // Mock 구현 - 실제로는 재고 시스템 조회
    return [];
  }

  /**
   * BOM Item의 생산 사용여부 확인
   */
  private async checkItemProductionUsage(bomItem: BOMItem): Promise<UsageInfo[]> {
    // Mock 구현 - 실제로는 생산 시스템 조회
    return [];
  }

  /**
   * 영향도 분석
   */
  private analyzeImpact(usages: UsageInfo[]): BOMUsageResult['impactAnalysis'] {
    const highImpact = usages.filter(u => u.importance === 'HIGH').length;
    const mediumImpact = usages.filter(u => u.importance === 'MEDIUM').length;
    const lowImpact = usages.filter(u => u.importance === 'LOW').length;

    return {
      highImpact,
      mediumImpact,
      lowImpact,
      totalAffected: usages.length
    };
  }

  /**
   * 기본 옵션 생성
   */
  private getDefaultOptions(options?: UsageCheckOptions): Required<UsageCheckOptions> {
    return {
      checkProductionPlan: options?.checkProductionPlan ?? true,
      checkWorkOrder: options?.checkWorkOrder ?? true,
      checkInventory: options?.checkInventory ?? false,
      checkOtherBOM: options?.checkOtherBOM ?? true,
      checkManufacturing: options?.checkManufacturing ?? true,
      includeInactive: options?.includeInactive ?? false,
      deepCheck: options?.deepCheck ?? false
    };
  }
}