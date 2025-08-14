// 외부 엔티티 및 서비스 import
import { BOM } from '../../../domain/entities/BOM';
import { BOMId } from '../../../domain/entities/BOMItem';
import { BOMItem, BOMItemId, ComponentType } from '../../../domain/entities/BOMItem';
import { BOMHistory, BOMHistoryAction, ChangedField } from '../../../domain/entities/BOMHistory';
import { Product, ProductId } from '@features/product/domain/entities/Product';
import { BOMRepository } from '../../../domain/repositories/BOMRepository';
import { BOMItemRepository } from '../../../domain/repositories/BOMItemRepository';
import { BOMHistoryRepository } from '../../../domain/repositories/BOMHistoryRepository';
import { ProductRepository } from '@features/product/domain/repositories/ProductRepository';

/**
 * BOM 복사 유스케이스
 * 
 * 워크플로우:
 * 1. 원본 BOM 존재 확인 및 권한 검증
 * 2. 대상 제품 확인 및 유효성 검증
 * 3. 새 버전 중복 확인
 * 4. 복사 옵션에 따른 데이터 필터링
 * 5. 새로운 BOM 엔티티 생성
 * 6. BOM 아이템 복사 (계층 구조 유지)
 * 7. 단가 조정 및 데이터 변환
 * 8. ID 매핑 관리 (부모-자식 관계 재구성)
 * 9. 데이터 저장 (트랜잭션)
 * 10. 복사 이력 기록
 * 11. 복사 결과 응답
 * 
 * 복사 시나리오:
 * - 동일 제품 새 버전 (버전 업그레이드)
 * - 다른 제품으로 복사 (유사 제품 생성)
 * - 일부 구성품만 복사 (선택적 복사)
 * - 단가 조정하여 복사 (인플레이션 반영)
 */

/**
 * BOM 복사 요청 인터페이스
 */
export interface CopyBOMRequest {
  sourceBOMId: string;                 // 원본 BOM ID
  targetProductId: string;             // 대상 제품 ID
  newVersion: string;                  // 새 버전명
  copyOptions: BOMCopyOptions;        // 복사 옵션
  effectiveDate: Date;                 // 새 BOM 적용일
  expiryDate?: Date;                   // 새 BOM 만료일
  description?: string;                // 새 BOM 설명
  id_create: string;                   // 생성자 ID
  reason?: string;                     // 복사 사유
}

/**
 * BOM 복사 옵션
 */
export interface BOMCopyOptions {
  includeInactiveItems: boolean;       // 비활성 아이템 포함 여부
  includeOptionalItems: boolean;       // 선택사항 아이템 포함 여부
  adjustCosts: boolean;                // 단가 조정 여부
  costAdjustmentRate?: number;         // 단가 조정률 (%) - adjustCosts가 true일 때 필수
  copyToLevel?: number;                // 복사할 최대 레벨 (전체 복사 시 생략)
  filterByComponentTypes?: ComponentType[]; // 특정 구성품 유형만 복사
  filterByProcessSteps?: string[];     // 특정 공정 구성품만 복사
  preserveStructure: boolean;          // 트리 구조 보존 여부
  updateEffectiveDates: boolean;       // 구성품별 적용일 갱신 여부
}

/**
 * BOM 복사 응답 인터페이스
 */
export interface CopyBOMResponse {
  newBOMId: string;                    // 새로 생성된 BOM ID
  copiedItemsCount: number;            // 복사된 아이템 수
  skippedItemsCount: number;           // 건너뛴 아이템 수
  totalCost: number;                   // 새 BOM 총 비용
  success: boolean;                    // 성공 여부
  message: string;                     // 결과 메시지
  copyStatistics: CopyStatistics;     // 복사 통계
  warnings?: string[];                 // 경고 메시지들
}

/**
 * 복사 통계 정보
 */
export interface CopyStatistics {
  originalItemCount: number;           // 원본 아이템 수
  copiedByLevel: Map<number, number>;  // 레벨별 복사 수
  costComparison: {                    // 비용 비교
    originalCost: number;
    newCost: number;
    difference: number;
    changePercentage: number;
  };
  componentTypeBreakdown: Map<ComponentType, number>; // 구성품 유형별 복사 수
  processStepBreakdown: Map<string, number>; // 공정별 복사 수
  adjustedItemsCount: number;          // 단가 조정된 아이템 수
}

/**
 * BOM 복사 유스케이스 클래스
 */
export class CopyBOMUseCase {
  constructor(
    private bomRepository: BOMRepository,
    private bomItemRepository: BOMItemRepository,
    private productRepository: ProductRepository,
    private bomHistoryRepository: BOMHistoryRepository
  ) {}

  /**
   * BOM 복사 실행
   * @param request 복사 요청 정보
   * @returns 복사 결과 응답
   */
  async execute(request: CopyBOMRequest): Promise<CopyBOMResponse> {
    // 1. 입력 검증
    await this.validateRequest(request);

    // 2. 원본 BOM 조회
    const sourceBOM = await this.bomRepository.findById(new BOMId(request.sourceBOMId));
    if (!sourceBOM) {
      throw new Error('원본 BOM이 존재하지 않습니다.');
    }

    // 3. 대상 제품 확인
    const targetProduct = await this.productRepository.findById(new ProductId(request.targetProductId));
    if (!targetProduct) {
      throw new Error('대상 제품이 존재하지 않습니다.');
    }

    if (!targetProduct.canHaveBOM()) {
      throw new Error('대상 제품은 BOM을 가질 수 없는 유형입니다.');
    }

    // 4. 버전 중복 확인
    const existingBOM = await this.bomRepository.findByProductIdAndVersion(
      new ProductId(request.targetProductId), 
      request.newVersion
    );
    if (existingBOM) {
      throw new Error('동일한 버전의 BOM이 이미 존재합니다.');
    }

    // 5. 복사 가능성 검증
    await this.validateCopyOperation(sourceBOM, targetProduct, request);

    // 6. 복사 실행
    try {
      const copyResult = await this.performCopy(sourceBOM, targetProduct, request);

      return {
        newBOMId: copyResult.newBOM.getId().getValue(),
        copiedItemsCount: copyResult.copiedItems.length,
        skippedItemsCount: copyResult.skippedItems.length,
        totalCost: copyResult.newBOM.calculateTotalCost(),
        success: true,
        message: `BOM이 성공적으로 복사되었습니다. (${copyResult.copiedItems.length}개 아이템, 버전: ${request.newVersion})`,
        copyStatistics: copyResult.statistics,
        warnings: copyResult.warnings
      };

    } catch (error) {
      throw new Error(`BOM 복사 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  // === Private 메서드들 ===

  /**
   * 요청 데이터 유효성 검증
   */
  private async validateRequest(request: CopyBOMRequest): Promise<void> {
    // 필수 필드 검증
    if (!request.sourceBOMId) {
      throw new Error('원본 BOM ID는 필수입니다.');
    }
    if (!request.targetProductId) {
      throw new Error('대상 제품 ID는 필수입니다.');
    }
    if (!request.newVersion || request.newVersion.trim().length === 0) {
      throw new Error('새 버전명은 필수입니다.');
    }
    if (!request.id_create) {
      throw new Error('생성자 정보는 필수입니다.');
    }

    // 복사 옵션 검증
    const options = request.copyOptions;
    if (options.adjustCosts && options.costAdjustmentRate === undefined) {
      throw new Error('단가 조정 옵션 선택 시 조정률을 입력해야 합니다.');
    }
    if (options.costAdjustmentRate !== undefined && 
        (options.costAdjustmentRate < -100 || options.costAdjustmentRate > 1000)) {
      throw new Error('단가 조정률은 -100% ~ 1000% 범위여야 합니다.');
    }

    // 날짜 검증
    if (request.effectiveDate > new Date()) {
      throw new Error('적용일은 현재일보다 미래일 수 없습니다.');
    }
    if (request.expiryDate && request.effectiveDate >= request.expiryDate) {
      throw new Error('만료일은 적용일보다 이후여야 합니다.');
    }
  }

  /**
   * 복사 작업 유효성 검증
   */
  private async validateCopyOperation(sourceBOM: BOM, targetProduct: Product, request: CopyBOMRequest): Promise<void> {
    // 원본 BOM 활성 상태 확인
    if (!sourceBOM.isCurrentlyActive()) {
      console.warn(`Warning: Copying from inactive BOM ${sourceBOM.getId().getValue()}`);
    }

    // 복사할 아이템이 있는지 확인
    const sourceItems = sourceBOM.getBOMItems();
    const filteredItems = this.filterSourceItems(sourceItems, request.copyOptions);
    
    if (filteredItems.length === 0) {
      throw new Error('복사 조건에 해당하는 구성품이 없습니다.');
    }

    // 대상 제품의 기존 BOM과 충돌 확인
    const existingBOMs = await this.bomRepository.findByProductId(targetProduct.getId());
    if (existingBOMs.length > 10) {
      console.warn(`Warning: Target product already has ${existingBOMs.length} BOM versions`);
    }
  }

  /**
   * 복사 수행
   */
  private async performCopy(
    sourceBOM: BOM, 
    targetProduct: Product, 
    request: CopyBOMRequest
  ): Promise<{
    newBOM: BOM;
    copiedItems: BOMItem[];
    skippedItems: BOMItem[];
    statistics: CopyStatistics;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    // 1. 새로운 BOM 생성
    const newBOMId = new BOMId(this.generateBOMId());
    const newBOM = new BOM(
      newBOMId,
      targetProduct.getId(),
      request.newVersion,
      true, // 활성화
      [], // BOM 아이템은 별도 생성
      request.effectiveDate,
      request.id_create,
      request.id_create,
      new Date(),
      new Date(),
      request.expiryDate,
      request.description || `${sourceBOM.getVersion()}에서 복사`
    );

    // 2. BOM 저장
    await this.bomRepository.save(newBOM);

    // 3. 원본 아이템 필터링
    const sourceItems = sourceBOM.getBOMItems();
    const filteredItems = this.filterSourceItems(sourceItems, request.copyOptions);
    const skippedItems = sourceItems.filter(item => !filteredItems.includes(item));

    // 4. BOM 아이템 복사
    const { copiedItems, itemIdMapping } = await this.copyBOMItems(
      filteredItems, 
      newBOMId, 
      request
    );

    // 5. 통계 생성
    const statistics = this.calculateCopyStatistics(
      sourceItems, 
      copiedItems, 
      sourceBOM.calculateTotalCost(), 
      request.copyOptions
    );

    // 6. 복사 이력 기록
    await this.recordCopyHistory(sourceBOM, newBOM, request, statistics);

    // 7. 경고 메시지 생성
    if (skippedItems.length > 0) {
      warnings.push(`${skippedItems.length}개 아이템이 필터 조건에 의해 제외되었습니다.`);
    }

    if (request.copyOptions.adjustCosts) {
      warnings.push(`모든 단가가 ${request.copyOptions.costAdjustmentRate}% 조정되었습니다.`);
    }

    return {
      newBOM,
      copiedItems,
      skippedItems,
      statistics,
      warnings
    };
  }

  /**
   * 원본 아이템 필터링
   */
  private filterSourceItems(sourceItems: BOMItem[], copyOptions: BOMCopyOptions): BOMItem[] {
    let filteredItems = sourceItems;

    // 활성 상태 필터링
    if (!copyOptions.includeInactiveItems) {
      filteredItems = filteredItems.filter(item => item.isCurrentlyActive());
    }

    // 선택사항 필터링
    if (!copyOptions.includeOptionalItems) {
      filteredItems = filteredItems.filter(item => !item.getIsOptional());
    }

    // 레벨 필터링
    if (copyOptions.copyToLevel !== undefined) {
      filteredItems = filteredItems.filter(item => item.getLevel() <= copyOptions.copyToLevel!);
    }

    // 구성품 유형 필터링
    if (copyOptions.filterByComponentTypes && copyOptions.filterByComponentTypes.length > 0) {
      filteredItems = filteredItems.filter(item => 
        copyOptions.filterByComponentTypes!.includes(item.getComponentType())
      );
    }

    // 공정 필터링
    if (copyOptions.filterByProcessSteps && copyOptions.filterByProcessSteps.length > 0) {
      filteredItems = filteredItems.filter(item => 
        item.getProcessStep() && copyOptions.filterByProcessSteps!.includes(item.getProcessStep()!)
      );
    }

    return filteredItems;
  }

  /**
   * BOM 아이템 복사
   */
  private async copyBOMItems(
    sourceItems: BOMItem[], 
    newBOMId: BOMId, 
    request: CopyBOMRequest
  ): Promise<{
    copiedItems: BOMItem[];
    itemIdMapping: Map<string, string>;
  }> {
    const itemIdMapping = new Map<string, string>(); // 원본 ID -> 새 ID 매핑
    const copiedItems: BOMItem[] = [];

    // 레벨 순으로 정렬하여 상위부터 복사
    const sortedItems = sourceItems.sort((a, b) => a.getLevel() - b.getLevel());

    for (const sourceItem of sortedItems) {
      const newItemId = new BOMItemId(this.generateBOMItemId());
      
      // 새로운 parent ID 찾기
      const newParentId = sourceItem.getParentItemId() 
        ? itemIdMapping.get(sourceItem.getParentItemId()!.getValue())
        : undefined;

      // 단가 조정
      const adjustedUnitCost = this.calculateAdjustedCost(sourceItem.getUnitCost(), request.copyOptions);

      // 적용일 업데이트
      const effectiveDate = request.copyOptions.updateEffectiveDates 
        ? request.effectiveDate 
        : sourceItem.getEffectiveDate();

      const newItem = new BOMItem(
        newItemId,
        newBOMId,
        sourceItem.getComponentId(),
        newParentId ? new BOMItemId(newParentId) : undefined,
        sourceItem.getLevel(),
        sourceItem.getSequence(),
        sourceItem.getQuantity(),
        sourceItem.getUnit(),
        adjustedUnitCost,
        sourceItem.getScrapRate(),
        sourceItem.getIsOptional(),
        sourceItem.getComponentType(),
        effectiveDate,
        request.id_create,
        request.id_create,
        new Date(),
        new Date(),
        sourceItem.getPosition(),
        sourceItem.getProcessStep(),
        sourceItem.getRemarks(),
        sourceItem.getExpiryDate()
      );

      await this.bomItemRepository.save(newItem);
      itemIdMapping.set(sourceItem.getId().getValue(), newItemId.getValue());
      copiedItems.push(newItem);
    }

    return { copiedItems, itemIdMapping };
  }

  /**
   * 조정된 단가 계산
   */
  private calculateAdjustedCost(originalCost: number, copyOptions: BOMCopyOptions): number {
    if (!copyOptions.adjustCosts || !copyOptions.costAdjustmentRate) {
      return originalCost;
    }

    return originalCost * (1 + copyOptions.costAdjustmentRate / 100);
  }

  /**
   * 복사 통계 계산
   */
  private calculateCopyStatistics(
    originalItems: BOMItem[],
    copiedItems: BOMItem[],
    originalCost: number,
    copyOptions: BOMCopyOptions
  ): CopyStatistics {
    // 레벨별 복사 수
    const copiedByLevel = new Map<number, number>();
    copiedItems.forEach(item => {
      const level = item.getLevel();
      copiedByLevel.set(level, (copiedByLevel.get(level) || 0) + 1);
    });

    // 구성품 유형별 복사 수
    const componentTypeBreakdown = new Map<ComponentType, number>();
    copiedItems.forEach(item => {
      const type = item.getComponentType();
      componentTypeBreakdown.set(type, (componentTypeBreakdown.get(type) || 0) + 1);
    });

    // 공정별 복사 수
    const processStepBreakdown = new Map<string, number>();
    copiedItems.forEach(item => {
      const step = item.getProcessStep() || '미지정';
      processStepBreakdown.set(step, (processStepBreakdown.get(step) || 0) + 1);
    });

    // 비용 비교
    const newCost = copiedItems.reduce((sum, item) => sum + item.getTotalCost(), 0);
    const costDifference = newCost - originalCost;
    const changePercentage = originalCost > 0 ? (costDifference / originalCost) * 100 : 0;

    // 단가 조정된 아이템 수
    const adjustedItemsCount = copyOptions.adjustCosts ? copiedItems.length : 0;

    return {
      originalItemCount: originalItems.length,
      copiedByLevel,
      costComparison: {
        originalCost,
        newCost,
        difference: costDifference,
        changePercentage
      },
      componentTypeBreakdown,
      processStepBreakdown,
      adjustedItemsCount
    };
  }

  /**
   * 복사 이력 기록
   */
  private async recordCopyHistory(
    sourceBOM: BOM, 
    newBOM: BOM, 
    request: CopyBOMRequest, 
    statistics: CopyStatistics
  ): Promise<void> {
    const history = new BOMHistory(
      this.generateHistoryId(),
      newBOM.getId(),
      BOMHistoryAction.COPY_BOM,
      'BOM',
      newBOM.getId().getValue(),
      [
        new ChangedField('sourceBOMId', null, sourceBOM.getId().getValue()),
        new ChangedField('sourceVersion', null, sourceBOM.getVersion()),
        new ChangedField('targetProductId', null, request.targetProductId),
        new ChangedField('copiedItemCount', null, statistics.originalItemCount),
        new ChangedField('costAdjustmentRate', null, request.copyOptions.costAdjustmentRate || 0)
      ],
      request.id_create,
      request.id_create, // 실제로는 사용자명 조회
      new Date(),
      request.reason || `${sourceBOM.getVersion()}에서 BOM 복사`
    );

    await this.bomHistoryRepository.save(history);
  }

  /**
   * BOM ID 생성
   */
  private generateBOMId(): string {
    return `BOM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * BOM Item ID 생성
   */
  private generateBOMItemId(): string {
    return `BOMITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 이력 ID 생성
   */
  private generateHistoryId(): string {
    return `BOMHIST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}