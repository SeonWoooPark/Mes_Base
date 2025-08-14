// 외부 엔티티 및 서비스 import
import { BOMItem, BOMItemId } from '../../../domain/entities/BOMItem';
import { BOMHistory, BOMHistoryAction, ChangedField } from '../../../domain/entities/BOMHistory';
import { BOM } from '../../../domain/entities/BOM';
import { BOMItemRepository } from '../../../domain/repositories/BOMItemRepository';
import { BOMRepository } from '../../../domain/repositories/BOMRepository';
import { BOMHistoryRepository } from '../../../domain/repositories/BOMHistoryRepository';
import { ProductRepository } from '@features/product/domain/repositories/ProductRepository';
import { BOMUsageChecker } from '../../../domain/services/BOMUsageChecker';

/**
 * BOM 아이템 삭제 유스케이스
 * 
 * 워크플로우:
 * 1. BOM 아이템 존재 확인
 * 2. 삭제 권한 및 BOM 상태 검증
 * 3. 사용여부 검증 (생산 계획, 작업 지시 등)
 * 4. 하위 구성품 존재 확인
 * 5. 삭제 옵션에 따른 대상 아이템 결정
 * 6. 삭제 가능성 최종 검증
 * 7. 논리적 삭제 실행 (물리적 삭제 아님)
 * 8. BOM 수정일시 갱신
 * 9. 삭제 이력 기록 (개별 아이템별)
 * 10. 삭제된 아이템 목록 응답
 * 
 * 삭제 정책:
 * - 물리적 삭제가 아닌 논리적 삭제 (데이터 보존)
 * - 하위 구성품이 있는 경우 옵션 제공 (함께 삭제 / 별도 처리)
 * - 사용 중인 구성품 삭제 차단
 * - 중요 구성품 삭제 시 추가 확인
 * - 삭제 후 복구 가능성 고려
 */

/**
 * BOM 아이템 삭제 요청 인터페이스
 */
export interface DeleteBOMItemRequest {
  bomItemId: string;                   // 삭제할 BOM Item ID
  deleteChildren?: boolean;            // 하위 구성품도 함께 삭제할지 여부
  deleteReason?: string;               // 삭제 사유
  id_updated: string;                  // 삭제 수행자 ID
  forceDelete?: boolean;               // 강제 삭제 여부 (경고 무시)
  cascadeDelete?: boolean;             // 연쇄 삭제 여부 (관련 데이터도 삭제)
}

/**
 * BOM 아이템 삭제 응답 인터페이스
 */
export interface DeleteBOMItemResponse {
  success: boolean;                    // 성공 여부
  message: string;                     // 결과 메시지
  deletedItemIds: string[];            // 삭제된 BOM Item ID들
  deletionSummary: DeletionSummary;   // 삭제 요약 정보
  warnings?: string[];                 // 경고 메시지들
  recommendations?: string[];          // 사후 권장사항
}

/**
 * 삭제 요약 정보
 */
export interface DeletionSummary {
  totalDeleted: number;                // 총 삭제된 아이템 수
  deletedByLevel: Map<number, number>; // 레벨별 삭제 수
  costSavings: number;                 // 절약된 총 비용
  affectedComponents: string[];        // 영향받은 구성품 코드들
  childrenHandled: 'DELETED' | 'ORPHANED' | 'NONE'; // 하위 구성품 처리 방식
}

/**
 * 삭제 전 검증 결과
 */
export interface DeletionValidationResult {
  canDelete: boolean;                  // 삭제 가능 여부
  blockingReasons: string[];           // 삭제 차단 사유들
  warnings: string[];                  // 경고 사항들
  itemsToDelete: BOMItem[];           // 실제 삭제될 아이템들
  impactAnalysis: DeletionImpactAnalysis; // 삭제 영향도 분석
}

/**
 * 삭제 영향도 분석
 */
export interface DeletionImpactAnalysis {
  totalCostImpact: number;             // 총 비용 영향
  productionImpact: 'HIGH' | 'MEDIUM' | 'LOW'; // 생산 영향도
  affectedProcesses: string[];         // 영향받는 공정들
  alternativeComponents: string[];     // 대체 구성품 제안
  recoveryComplexity: 'EASY' | 'MEDIUM' | 'HARD'; // 복구 난이도
}

/**
 * BOM 아이템 삭제 유스케이스 클래스
 */
export class DeleteBOMItemUseCase {
  constructor(
    private bomItemRepository: BOMItemRepository,
    private bomRepository: BOMRepository,
    private bomHistoryRepository: BOMHistoryRepository,
    private bomUsageChecker: BOMUsageChecker,
    private productRepository: ProductRepository
  ) {}

  /**
   * BOM 아이템 삭제 실행
   * @param request 삭제 요청 정보
   * @returns 삭제 결과 응답
   */
  async execute(request: DeleteBOMItemRequest): Promise<DeleteBOMItemResponse> {
    // 1. BOM 아이템 존재 확인
    const bomItem = await this.bomItemRepository.findById(new BOMItemId(request.bomItemId));
    if (!bomItem) {
      throw new Error('존재하지 않는 BOM 아이템입니다.');
    }

    // 2. BOM 상태 및 권한 확인
    const bom = await this.bomRepository.findById(bomItem.getBOMId());
    if (!bom) {
      throw new Error('해당 BOM을 찾을 수 없습니다.');
    }

    if (!bom.isCurrentlyActive()) {
      throw new Error('비활성 BOM의 구성품은 삭제할 수 없습니다.');
    }

    // 3. 삭제 전 검증 수행
    const validationResult = await this.validateDeletion(bomItem, request);
    
    if (!validationResult.canDelete && !request.forceDelete) {
      return {
        success: false,
        message: `삭제할 수 없습니다: ${validationResult.blockingReasons.join(', ')}`,
        deletedItemIds: [],
        deletionSummary: this.createEmptyDeletionSummary(),
        warnings: validationResult.warnings,
        recommendations: this.generateRecommendations(validationResult)
      };
    }

    // 4. 강제 삭제 모드에서 경고 확인
    if (request.forceDelete && validationResult.warnings.length > 0) {
      // 로그에 강제 삭제 사실 기록
      console.warn(`Force delete executed for BOM Item ${request.bomItemId}:`, validationResult.warnings);
    }

    // 5. 실제 삭제 실행
    try {
      const deletedItemIds = await this.performDeletion(validationResult.itemsToDelete, request);

      // 6. BOM 수정일시 갱신
      await this.updateBOMLastModified(bom, request.id_updated);

      // 7. 삭제 요약 정보 생성
      const deletionSummary = this.createDeletionSummary(validationResult.itemsToDelete, request);

      // 8. 성공 응답
      return {
        success: true,
        message: `${deletedItemIds.length}개의 구성품이 성공적으로 삭제되었습니다.`,
        deletedItemIds,
        deletionSummary,
        warnings: validationResult.warnings,
        recommendations: this.generatePostDeletionRecommendations(validationResult.itemsToDelete)
      };

    } catch (error) {
      throw new Error(`BOM 아이템 삭제 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  // === Private 메서드들 ===

  /**
   * 삭제 전 종합 검증
   */
  private async validateDeletion(bomItem: BOMItem, request: DeleteBOMItemRequest): Promise<DeletionValidationResult> {
    const blockingReasons: string[] = [];
    const warnings: string[] = [];
    
    // 1. 사용여부 검증
    const usageResult = await this.bomUsageChecker.checkBOMItemUsage(bomItem.getId());
    if (usageResult.isUsed && !request.forceDelete) {
      blockingReasons.push(`이 구성품은 ${usageResult.usages.length}개 시스템에서 사용 중입니다.`);
    } else if (usageResult.isUsed) {
      warnings.push(`강제 삭제: ${usageResult.usages.length}개 시스템에서 사용 중인 구성품입니다.`);
    }

    // 2. 삭제할 아이템 목록 구성
    const itemsToDelete = await this.getItemsToDelete(bomItem, request.deleteChildren || false);

    // 3. 하위 구성품 검증
    if (usageResult.hasChildren && !request.deleteChildren) {
      blockingReasons.push(`하위 구성품이 ${usageResult.childrenCount}개 있습니다. 함께 삭제하거나 별도로 처리해야 합니다.`);
    }

    // 4. 중요 구성품 검증
    if (bomItem.isCriticalComponent()) {
      warnings.push('이는 중요한 구성품입니다. 삭제 시 생산에 영향을 줄 수 있습니다.');
    }

    // 5. 비용 영향 분석
    const totalCostImpact = itemsToDelete.reduce((sum, item) => sum + item.getTotalCost(), 0);
    if (totalCostImpact > 10000) {
      warnings.push(`총 ${totalCostImpact.toLocaleString()}원의 비용 절약이 예상됩니다.`);
    }

    // 6. 영향도 분석 수행
    const impactAnalysis = await this.analyzeImpact(itemsToDelete);

    const canDelete = blockingReasons.length === 0;

    return {
      canDelete,
      blockingReasons,
      warnings,
      itemsToDelete,
      impactAnalysis
    };
  }

  /**
   * 삭제할 아이템 목록 구성
   */
  private async getItemsToDelete(bomItem: BOMItem, deleteChildren: boolean): Promise<BOMItem[]> {
    const itemsToDelete: BOMItem[] = [bomItem];

    if (deleteChildren) {
      // 하위 구성품 재귀적으로 찾기
      const childItems = await this.bomItemRepository.findAllDescendants(bomItem.getId());
      itemsToDelete.push(...childItems);
    } else {
      // 하위 구성품이 있는지 확인
      const hasChildren = await this.bomItemRepository.hasChildren(bomItem.getId());
      if (hasChildren) {
        throw new Error('하위 구성품이 있는 아이템은 하위 구성품을 먼저 삭제하거나 함께 삭제 옵션을 선택해야 합니다.');
      }
    }

    return itemsToDelete;
  }

  /**
   * 실제 삭제 수행 (논리적 삭제)
   */
  private async performDeletion(itemsToDelete: BOMItem[], request: DeleteBOMItemRequest): Promise<string[]> {
    const deletedItemIds: string[] = [];

    for (const item of itemsToDelete) {
      // 논리적 삭제 수행
      await this.bomItemRepository.delete(item.getId());
      deletedItemIds.push(item.getId().getValue());
      
      // 개별 삭제 이력 기록
      await this.recordDeleteHistory(item, request);
    }

    return deletedItemIds;
  }

  /**
   * 삭제 영향도 분석
   */
  private async analyzeImpact(itemsToDelete: BOMItem[]): Promise<DeletionImpactAnalysis> {
    const totalCostImpact = itemsToDelete.reduce((sum, item) => sum + item.getTotalCost(), 0);
    
    // 생산 영향도 판단
    let productionImpact: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    const criticalItems = itemsToDelete.filter(item => item.isCriticalComponent());
    
    if (criticalItems.length > 0 || totalCostImpact > 50000) {
      productionImpact = 'HIGH';
    } else if (totalCostImpact > 10000 || itemsToDelete.length > 5) {
      productionImpact = 'MEDIUM';
    }

    // 영향받는 공정들
    const processSteps = itemsToDelete
      .map(item => item.getProcessStep())
      .filter(step => step) as string[];
    const affectedProcesses = Array.from(new Set(processSteps));

    // 대체 구성품 제안 (실제로는 더 복잡한 로직)
    const alternativeComponents = await this.suggestAlternatives(itemsToDelete);

    // 복구 난이도 판단
    let recoveryComplexity: 'EASY' | 'MEDIUM' | 'HARD' = 'EASY';
    if (itemsToDelete.length > 10 || criticalItems.length > 0) {
      recoveryComplexity = 'HARD';
    } else if (itemsToDelete.length > 5) {
      recoveryComplexity = 'MEDIUM';
    }

    return {
      totalCostImpact,
      productionImpact,
      affectedProcesses,
      alternativeComponents,
      recoveryComplexity
    };
  }

  /**
   * 대체 구성품 제안
   */
  private async suggestAlternatives(itemsToDelete: BOMItem[]): Promise<string[]> {
    // Mock 구현 - 실제로는 유사 구성품 검색 로직
    const suggestions: string[] = [];
    
    for (const item of itemsToDelete.slice(0, 3)) { // 최대 3개만 제안
      try {
        const component = await this.productRepository.findById(item.getComponentId());
        if (component) {
          // 실제로는 카테고리나 특성 기반으로 유사 제품 검색
          suggestions.push(`${component.getCdMaterial()} 유사 제품 검토 권장`);
        }
      } catch (error) {
        // 오류 무시하고 계속
      }
    }
    
    return suggestions;
  }

  /**
   * 삭제 이력 기록
   */
  private async recordDeleteHistory(bomItem: BOMItem, request: DeleteBOMItemRequest): Promise<void> {
    const history = new BOMHistory(
      this.generateHistoryId(),
      bomItem.getBOMId(),
      BOMHistoryAction.DELETE_ITEM,
      'BOM_ITEM',
      bomItem.getId().getValue(),
      [new ChangedField('deleted', false, true)],
      request.id_updated,
      request.id_updated, // 실제로는 사용자명 조회
      new Date(),
      request.deleteReason || 'BOM 아이템 삭제'
    );

    await this.bomHistoryRepository.save(history);
  }

  /**
   * BOM 수정일시 갱신
   */
  private async updateBOMLastModified(bom: BOM, userId: string): Promise<void> {
    // TODO: BOM 엔티티 수정일시 갱신 로직 구현
  }

  /**
   * 삭제 요약 정보 생성
   */
  private createDeletionSummary(itemsToDelete: BOMItem[], request: DeleteBOMItemRequest): DeletionSummary {
    const deletedByLevel = new Map<number, number>();
    let costSavings = 0;
    const affectedComponents: string[] = [];

    itemsToDelete.forEach(item => {
      // 레벨별 카운트
      const level = item.getLevel();
      deletedByLevel.set(level, (deletedByLevel.get(level) || 0) + 1);
      
      // 비용 절약
      costSavings += item.getTotalCost();
      
      // 영향받은 구성품
      affectedComponents.push(item.getComponentId().getValue());
    });

    let childrenHandled: 'DELETED' | 'ORPHANED' | 'NONE' = 'NONE';
    if (request.deleteChildren) {
      childrenHandled = itemsToDelete.length > 1 ? 'DELETED' : 'NONE';
    }

    return {
      totalDeleted: itemsToDelete.length,
      deletedByLevel,
      costSavings,
      affectedComponents,
      childrenHandled
    };
  }

  /**
   * 빈 삭제 요약 생성
   */
  private createEmptyDeletionSummary(): DeletionSummary {
    return {
      totalDeleted: 0,
      deletedByLevel: new Map(),
      costSavings: 0,
      affectedComponents: [],
      childrenHandled: 'NONE'
    };
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendations(validationResult: DeletionValidationResult): string[] {
    const recommendations: string[] = [];

    if (validationResult.blockingReasons.length > 0) {
      recommendations.push('차단 사유를 해결한 후 다시 시도하거나 forceDelete 옵션을 사용하세요.');
    }

    if (validationResult.impactAnalysis.productionImpact === 'HIGH') {
      recommendations.push('생산 계획팀과 협의 후 삭제를 진행하시기 바랍니다.');
    }

    if (validationResult.impactAnalysis.alternativeComponents.length > 0) {
      recommendations.push('대체 구성품 검토를 먼저 진행하세요.');
    }

    return recommendations;
  }

  /**
   * 삭제 후 권장사항 생성
   */
  private generatePostDeletionRecommendations(deletedItems: BOMItem[]): string[] {
    const recommendations: string[] = [];

    recommendations.push('BOM 전체 비용이 재계산되었습니다.');
    
    if (deletedItems.length > 1) {
      recommendations.push('관련된 생산 계획을 검토하시기 바랍니다.');
    }

    const hasProcessSteps = deletedItems.some(item => item.getProcessStep());
    if (hasProcessSteps) {
      recommendations.push('영향받은 공정의 작업 지시서를 확인하세요.');
    }

    recommendations.push('필요시 BOM 이력에서 복구할 수 있습니다.');

    return recommendations;
  }

  /**
   * 이력 ID 생성
   */
  private generateHistoryId(): string {
    return `BOMHIST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}