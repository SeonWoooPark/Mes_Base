// 외부 엔티티 및 서비스 import
import { BOMItem, BOMItemId } from '../../../domain/entities/BOMItem';
import { BOMHistory, BOMHistoryAction, ChangedField } from '../../../domain/entities/BOMHistory';
import { BOM } from '../../../domain/entities/BOM';
import { Product } from '@features/product/domain/entities/Product';
import { BOMItemRepository } from '../../../domain/repositories/BOMItemRepository';
import { BOMRepository } from '../../../domain/repositories/BOMRepository';
import { BOMHistoryRepository } from '../../../domain/repositories/BOMHistoryRepository';
import { ProductRepository } from '@features/product/domain/repositories/ProductRepository';
import { BOMUsageChecker } from '../../../domain/services/BOMUsageChecker';
import { BOMPresenter, BOMTreeNode } from './GetBOMTreeUseCase';

/**
 * BOM 아이템 수정 유스케이스
 * 
 * 워크플로우:
 * 1. BOM 아이템 존재 확인
 * 2. 수정 권한 및 상태 검증
 * 3. 입력 데이터 유효성 검증
 * 4. 변경사항 추적 (before/after 비교)
 * 5. 비즈니스 규칙 검증 (수정 제약사항)
 * 6. 새로운 BOM 아이템 엔티티 생성 (불변성 보장)
 * 7. 데이터 저장 및 BOM 수정일시 갱신
 * 8. 변경 이력 기록 (필드별 상세)
 * 9. 업데이트된 트리 노드 응답
 * 
 * 비즈니스 규칙:
 * - 활성 BOM의 아이템만 수정 가능
 * - 사용 중인 아이템의 핵심 정보 변경 제한
 * - 수량/단가 변경 시 하위 영향도 분석
 * - 필수 구성품의 선택사항 전환 방지
 */

/**
 * BOM 아이템 수정 요청 인터페이스
 */
export interface UpdateBOMItemRequest {
  bomItemId: string;                   // BOM Item ID
  quantity?: number;                   // 수정할 소요량
  unitCost?: number;                   // 수정할 단가
  scrapRate?: number;                  // 수정할 스크랩률
  isOptional?: boolean;                // 선택사항 여부 변경
  position?: string;                   // 조립 위치 변경
  processStep?: string;                // 투입 공정 변경
  remarks?: string;                    // 비고 변경
  effectiveDate?: Date;                // 적용일 변경
  expiryDate?: Date;                   // 만료일 변경
  id_updated: string;                  // 수정자 ID
  reason?: string;                     // 수정 사유
  forceUpdate?: boolean;               // 강제 업데이트 여부 (경고 무시)
}

/**
 * BOM 아이템 수정 응답 인터페이스
 */
export interface UpdateBOMItemResponse {
  success: boolean;                    // 성공 여부
  message: string;                     // 결과 메시지
  updatedTreeNode: BOMTreeNode;       // 업데이트된 트리 노드
  changesSummary: ChangesSummary;     // 변경 사항 요약
  impactAnalysis?: ImpactAnalysis;    // 영향도 분석 (중요 변경 시)
  warnings?: string[];                 // 경고 메시지들
}

/**
 * 변경 사항 요약
 */
export interface ChangesSummary {
  totalChanges: number;                // 총 변경 필드 수
  changedFields: UpdateChangedField[]; // 변경된 필드들
  costImpact: number;                  // 비용 영향 (변경 전후 차이)
  quantityImpact: number;              // 수량 영향
  isCriticalChange: boolean;           // 중요 변경 여부
}

/**
 * 영향도 분석
 */
export interface ImpactAnalysis {
  affectedItems: string[];             // 영향받는 하위 아이템들
  totalCostChange: number;             // 전체 BOM 비용 변화
  productionImpact: 'HIGH' | 'MEDIUM' | 'LOW'; // 생산에 미치는 영향도
  recommendations: string[];           // 권장사항
}

/**
 * 변경된 필드 정보 (UpdateBOMItemUseCase용)
 */
export interface UpdateChangedField {
  fieldName: string;                   // 필드명
  oldValue: any;                       // 변경 전 값
  newValue: any;                       // 변경 후 값
  displayName: string;                 // 표시용 필드명
  changeType: 'INCREASE' | 'DECREASE' | 'CHANGE'; // 변경 유형
}

/**
 * BOM 아이템 수정 유스케이스 클래스
 */
export class UpdateBOMItemUseCase {
  constructor(
    private bomItemRepository: BOMItemRepository,
    private bomRepository: BOMRepository,
    private productRepository: ProductRepository,
    private bomHistoryRepository: BOMHistoryRepository,
    private bomUsageChecker: BOMUsageChecker,
    private bomPresenter: BOMPresenter
  ) {}

  /**
   * BOM 아이템 수정 실행
   * @param request 수정 요청 정보
   * @returns 수정 결과 응답
   */
  async execute(request: UpdateBOMItemRequest): Promise<UpdateBOMItemResponse> {
    // 1. BOM 아이템 존재 확인
    const existingItem = await this.bomItemRepository.findById(new BOMItemId(request.bomItemId));
    if (!existingItem) {
      throw new Error('존재하지 않는 BOM 아이템입니다.');
    }

    // 2. BOM 및 수정 권한 확인
    const bom = await this.bomRepository.findById(existingItem.getBOMId());
    if (!bom) {
      throw new Error('해당 BOM을 찾을 수 없습니다.');
    }

    if (!bom.isCurrentlyActive()) {
      throw new Error('비활성 BOM의 구성품은 수정할 수 없습니다.');
    }

    // 3. 입력 검증
    this.validateRequest(request);

    // 4. 변경사항 추적
    const changedFields = this.detectChanges(existingItem, request);
    if (changedFields.length === 0) {
      throw new Error('변경된 항목이 없습니다.');
    }

    // 5. 비즈니스 규칙 검증
    await this.validateBusinessRules(existingItem, request, changedFields);

    // 6. 사용 중인 아이템 변경 확인
    if (!request.forceUpdate) {
      const warnings = await this.checkUsageWarnings(existingItem, changedFields);
      if (warnings.length > 0) {
        return {
          success: false,
          message: '이 구성품은 다른 곳에서 사용 중입니다. forceUpdate 옵션을 사용하여 강제 업데이트하거나 확인 후 다시 시도하세요.',
          updatedTreeNode: {} as BOMTreeNode,
          changesSummary: this.createChangesSummary(changedFields, existingItem),
          warnings
        };
      }
    }

    // 7. 업데이트된 BOM 아이템 생성
    const updatedItem = this.createUpdatedBOMItem(existingItem, request);

    // 8. 저장 트랜잭션
    try {
      await this.bomItemRepository.save(updatedItem);

      // BOM 수정일시 업데이트
      await this.updateBOMLastModified(bom, request.id_updated);

      // 9. 변경 이력 기록
      await this.recordUpdateHistory(existingItem, changedFields, request);

      // 10. 업데이트된 트리 노드 생성
      const component = await this.productRepository.findById(updatedItem.getComponentId());
      const updatedTreeNode = await this.createTreeNode(updatedItem, component!);

      // 11. 변경 사항 요약 생성
      const changesSummary = this.createChangesSummary(changedFields, existingItem);

      // 12. 영향도 분석 (중요 변경 시)
      let impactAnalysis: ImpactAnalysis | undefined;
      if (changesSummary.isCriticalChange) {
        impactAnalysis = await this.performImpactAnalysis(updatedItem, changedFields);
      }

      return {
        success: true,
        message: `BOM 구성품이 성공적으로 수정되었습니다. (${changedFields.length}개 필드 변경)`,
        updatedTreeNode,
        changesSummary,
        impactAnalysis
      };

    } catch (error) {
      throw new Error(`BOM 아이템 수정 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  // === Private 메서드들 ===

  /**
   * 요청 데이터 유효성 검증
   */
  private validateRequest(request: UpdateBOMItemRequest): void {
    if (!request.bomItemId) {
      throw new Error('BOM Item ID는 필수입니다.');
    }
    if (!request.id_updated) {
      throw new Error('수정자 정보는 필수입니다.');
    }

    // 수량 및 비용 검증
    if (request.quantity !== undefined && request.quantity <= 0) {
      throw new Error('소요량은 0보다 커야 합니다.');
    }
    if (request.scrapRate !== undefined && (request.scrapRate < 0 || request.scrapRate > 100)) {
      throw new Error('스크랩률은 0-100% 범위여야 합니다.');
    }
    if (request.unitCost !== undefined && request.unitCost < 0) {
      throw new Error('단가는 0 이상이어야 합니다.');
    }

    // 날짜 검증
    if (request.effectiveDate && request.effectiveDate > new Date()) {
      throw new Error('적용일은 현재일보다 미래일 수 없습니다.');
    }
    if (request.expiryDate && request.effectiveDate && request.effectiveDate >= request.expiryDate) {
      throw new Error('만료일은 적용일보다 이후여야 합니다.');
    }
  }

  /**
   * 변경사항 감지
   */
  private detectChanges(existingItem: BOMItem, request: UpdateBOMItemRequest): UpdateChangedField[] {
    const changes: UpdateChangedField[] = [];

    // 수량 변경
    if (request.quantity !== undefined && request.quantity !== existingItem.getQuantity()) {
      changes.push({
        fieldName: 'quantity',
        oldValue: existingItem.getQuantity(),
        newValue: request.quantity,
        displayName: '소요량',
        changeType: request.quantity > existingItem.getQuantity() ? 'INCREASE' : 'DECREASE'
      });
    }

    // 단가 변경
    if (request.unitCost !== undefined && request.unitCost !== existingItem.getUnitCost()) {
      changes.push({
        fieldName: 'unitCost',
        oldValue: existingItem.getUnitCost(),
        newValue: request.unitCost,
        displayName: '단가',
        changeType: request.unitCost > existingItem.getUnitCost() ? 'INCREASE' : 'DECREASE'
      });
    }

    // 스크랩률 변경
    if (request.scrapRate !== undefined && request.scrapRate !== existingItem.getScrapRate()) {
      changes.push({
        fieldName: 'scrapRate',
        oldValue: existingItem.getScrapRate(),
        newValue: request.scrapRate,
        displayName: '스크랩률',
        changeType: request.scrapRate > existingItem.getScrapRate() ? 'INCREASE' : 'DECREASE'
      });
    }

    // 선택사항 변경
    if (request.isOptional !== undefined && request.isOptional !== existingItem.getIsOptional()) {
      changes.push({
        fieldName: 'isOptional',
        oldValue: existingItem.getIsOptional(),
        newValue: request.isOptional,
        displayName: '선택사항',
        changeType: 'CHANGE'
      });
    }

    // 조립 위치 변경
    if (request.position !== undefined && request.position !== existingItem.getPosition()) {
      changes.push({
        fieldName: 'position',
        oldValue: existingItem.getPosition(),
        newValue: request.position,
        displayName: '조립 위치',
        changeType: 'CHANGE'
      });
    }

    // 공정 변경
    if (request.processStep !== undefined && request.processStep !== existingItem.getProcessStep()) {
      changes.push({
        fieldName: 'processStep',
        oldValue: existingItem.getProcessStep(),
        newValue: request.processStep,
        displayName: '투입 공정',
        changeType: 'CHANGE'
      });
    }

    // 비고 변경
    if (request.remarks !== undefined && request.remarks !== existingItem.getRemarks()) {
      changes.push({
        fieldName: 'remarks',
        oldValue: existingItem.getRemarks(),
        newValue: request.remarks,
        displayName: '비고',
        changeType: 'CHANGE'
      });
    }

    return changes;
  }

  /**
   * 비즈니스 규칙 검증
   */
  private async validateBusinessRules(
    existingItem: BOMItem, 
    request: UpdateBOMItemRequest, 
    changedFields: UpdateChangedField[]
  ): Promise<void> {
    // 중요 구성품의 선택사항 전환 방지
    if (existingItem.isCriticalComponent() && request.isOptional === true) {
      throw new Error('중요한 구성품은 선택사항으로 변경할 수 없습니다.');
    }

    // 대량 수량 변경 경고
    const quantityChange = changedFields.find(c => c.fieldName === 'quantity');
    if (quantityChange) {
      const changeRate = Math.abs((quantityChange.newValue - quantityChange.oldValue) / quantityChange.oldValue);
      if (changeRate > 0.5) {
        // 50% 이상 변경 시 추가 확인
        if (!request.forceUpdate) {
          throw new Error('50% 이상의 수량 변경은 forceUpdate 옵션이 필요합니다.');
        }
      }
    }

    // 단가 변경 시 권한 확인 (실제 구현에서는 권한 서비스 연동)
    const costChange = changedFields.find(c => c.fieldName === 'unitCost');
    if (costChange && Math.abs(costChange.newValue - costChange.oldValue) > 10000) {
      // 10,000원 이상 단가 변경 시 특별 권한 필요 (Mock 구현)
      // 실제로는 사용자 권한 서비스와 연동
    }
  }

  /**
   * 사용 중인 아이템 변경 경고 확인
   */
  private async checkUsageWarnings(existingItem: BOMItem, changedFields: UpdateChangedField[]): Promise<string[]> {
    const warnings: string[] = [];

    try {
      // 사용 여부 확인
      const usageResult = await this.bomUsageChecker.checkBOMItemUsage(existingItem.getId());
      
      if (usageResult.isUsed) {
        const criticalFields = ['quantity', 'unitCost', 'isOptional'];
        const hasCriticalChange = changedFields.some(c => criticalFields.includes(c.fieldName));
        
        if (hasCriticalChange) {
          warnings.push('이 구성품은 다른 시스템에서 사용 중입니다.');
          warnings.push(`영향받는 항목: ${usageResult.usages.length}개`);
        }
      }
    } catch (error) {
      warnings.push('사용 여부 확인 중 오류가 발생했습니다.');
    }

    return warnings;
  }

  /**
   * 업데이트된 BOM 아이템 생성
   */
  private createUpdatedBOMItem(existingItem: BOMItem, request: UpdateBOMItemRequest): BOMItem {
    return new BOMItem(
      existingItem.getId(),
      existingItem.getBOMId(),
      existingItem.getComponentId(),
      existingItem.getParentItemId(),
      existingItem.getLevel(),
      existingItem.getSequence(),
      request.quantity ?? existingItem.getQuantity(),
      existingItem.getUnit(),
      request.unitCost ?? existingItem.getUnitCost(),
      request.scrapRate ?? existingItem.getScrapRate(),
      request.isOptional ?? existingItem.getIsOptional(),
      existingItem.getComponentType(),
      request.effectiveDate ?? existingItem.getEffectiveDate(),
      existingItem.getIdCreate(),
      request.id_updated,
      existingItem.getDtCreate(),
      new Date(),
      request.position ?? existingItem.getPosition(),
      request.processStep ?? existingItem.getProcessStep(),
      request.remarks ?? existingItem.getRemarks(),
      request.expiryDate ?? existingItem.getExpiryDate()
    );
  }

  /**
   * 변경 사항 요약 생성
   */
  private createChangesSummary(changedFields: UpdateChangedField[], existingItem: BOMItem): ChangesSummary {
    let costImpact = 0;
    let quantityImpact = 0;

    // 비용 영향 계산
    const costChange = changedFields.find(c => c.fieldName === 'unitCost');
    if (costChange) {
      costImpact = (costChange.newValue - costChange.oldValue) * existingItem.getQuantity();
    }

    const quantityChange = changedFields.find(c => c.fieldName === 'quantity');
    if (quantityChange) {
      quantityImpact = quantityChange.newValue - quantityChange.oldValue;
      costImpact += quantityImpact * existingItem.getUnitCost();
    }

    // 중요 변경 여부 판단
    const criticalFields = ['quantity', 'unitCost', 'isOptional'];
    const isCriticalChange = changedFields.some(c => 
      criticalFields.includes(c.fieldName) || Math.abs(costImpact) > 10000
    );

    return {
      totalChanges: changedFields.length,
      changedFields,
      costImpact,
      quantityImpact,
      isCriticalChange
    };
  }

  /**
   * 영향도 분석 수행
   */
  private async performImpactAnalysis(updatedItem: BOMItem, changedFields: UpdateChangedField[]): Promise<ImpactAnalysis> {
    // 하위 아이템 조회
    const childItems = await this.bomItemRepository.findByParentId(updatedItem.getId());
    const affectedItems = childItems.map(item => item.getId().getValue());

    // 전체 BOM 비용 변화 계산
    const costChange = changedFields.find(c => c.fieldName === 'unitCost');
    const quantityChange = changedFields.find(c => c.fieldName === 'quantity');
    
    let totalCostChange = 0;
    if (costChange) {
      totalCostChange += (costChange.newValue - costChange.oldValue) * updatedItem.getQuantity();
    }
    if (quantityChange) {
      totalCostChange += (quantityChange.newValue - quantityChange.oldValue) * updatedItem.getUnitCost();
    }

    // 생산 영향도 판단
    let productionImpact: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (Math.abs(totalCostChange) > 50000 || affectedItems.length > 10) {
      productionImpact = 'HIGH';
    } else if (Math.abs(totalCostChange) > 10000 || affectedItems.length > 5) {
      productionImpact = 'MEDIUM';
    }

    // 권장사항 생성
    const recommendations: string[] = [];
    if (totalCostChange > 10000) {
      recommendations.push('비용 증가로 인한 제품 가격 재검토를 권장합니다.');
    }
    if (affectedItems.length > 0) {
      recommendations.push('하위 구성품의 소요량도 함께 검토하시기 바랍니다.');
    }

    return {
      affectedItems,
      totalCostChange,
      productionImpact,
      recommendations
    };
  }

  /**
   * BOM 수정일시 업데이트
   */
  private async updateBOMLastModified(bom: BOM, userId: string): Promise<void> {
    // TODO: BOM 엔티티 수정일시 업데이트 로직 구현
  }

  /**
   * 변경 이력 기록
   */
  private async recordUpdateHistory(
    existingItem: BOMItem, 
    changedFields: UpdateChangedField[], 
    request: UpdateBOMItemRequest
  ): Promise<void> {
    const historyChangedFields = changedFields.map(c => 
      new ChangedField(c.fieldName, c.oldValue, c.newValue)
    );

    const history = new BOMHistory(
      this.generateHistoryId(),
      existingItem.getBOMId(),
      BOMHistoryAction.UPDATE_ITEM,
      'BOM_ITEM',
      existingItem.getId().getValue(),
      historyChangedFields,
      request.id_updated,
      request.id_updated, // 실제로는 사용자명 조회
      new Date(),
      request.reason || 'BOM 아이템 수정'
    );

    await this.bomHistoryRepository.save(history);
  }

  /**
   * 트리 노드 생성
   */
  private async createTreeNode(bomItem: BOMItem, component: Product): Promise<BOMTreeNode> {
    return {
      id: `node-${bomItem.getId().getValue()}`,
      bomItemId: bomItem.getId().getValue(),
      componentId: component.getId().getValue(),
      componentCode: component.getCdMaterial(),
      componentName: component.getNmMaterial(),
      componentType: bomItem.getComponentType(),
      componentTypeDisplay: this.bomPresenter.getComponentTypeDisplayName(bomItem.getComponentType()),
      parentId: bomItem.getParentItemId()?.getValue(),
      level: bomItem.getLevel(),
      sequence: bomItem.getSequence(),
      quantity: bomItem.getQuantity(),
      unit: bomItem.getUnit().code,
      unitName: bomItem.getUnit().name,
      unitCost: bomItem.getUnitCost(),
      totalCost: bomItem.getTotalCost(),
      scrapRate: bomItem.getScrapRate(),
      actualQuantity: bomItem.getActualQuantity(),
      isOptional: bomItem.getIsOptional(),
      position: bomItem.getPosition(),
      processStep: bomItem.getProcessStep(),
      remarks: bomItem.getRemarks(),
      isActive: bomItem.isCurrentlyActive(),
      hasChildren: false,
      isExpanded: false,
      children: [],
      depth: bomItem.getLevel()
    };
  }

  /**
   * 이력 ID 생성
   */
  private generateHistoryId(): string {
    return `BOMHIST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}