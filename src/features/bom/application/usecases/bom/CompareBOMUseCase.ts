// 외부 엔티티 및 서비스 import
import { BOM } from '../../../domain/entities/BOM';
import { BOMId } from '../../../domain/entities/BOMItem';
import { BOMItem, ComponentType } from '../../../domain/entities/BOMItem';
import { BOMHistory, BOMHistoryAction, ChangedField } from '../../../domain/entities/BOMHistory';
import { BOMRepository } from '../../../domain/repositories/BOMRepository';
import { BOMItemRepository } from '../../../domain/repositories/BOMItemRepository';
import { BOMHistoryRepository } from '../../../domain/repositories/BOMHistoryRepository';
import { ProductRepository } from '@features/product/domain/repositories/ProductRepository';
import { BOMTreeNode as GetBOMTreeNode } from './GetBOMTreeUseCase';

/**
 * BOM 비교 유스케이스
 * 
 * 워크플로우:
 * 1. 요청 검증 (두 BOM ID 유효성)
 * 2. 소스/타겟 BOM 조회 및 존재 확인
 * 3. 비교 옵션에 따른 필터링 설정
 * 4. BOM 구조 차이 분석
 * 5. 아이템별 상세 비교 (추가/삭제/수정)
 * 6. 비용 차이 분석
 * 7. 통계 및 요약 정보 생성
 * 8. 비교 결과 포매팅 및 응답
 * 
 * 비교 유형:
 * - 구조적 차이: 계층 구조, 레벨 변화
 * - 아이템 차이: 신규/삭제/수정된 구성품
 * - 속성 차이: 수량, 단가, 스크랩률 등 필드별 변경
 * - 비용 차이: 총 비용 변화 및 영향도
 */

/**
 * BOM 비교 요청 인터페이스
 */
export interface CompareBOMRequest {
  sourceBOMId: string;                 // 원본 BOM ID (비교 기준)
  targetBOMId: string;                 // 대상 BOM ID (비교 대상)
  compareOptions: BOMCompareOptions;   // 비교 옵션
  id_request?: string;                 // 요청자 ID (이력 기록용)
}

/**
 * BOM 비교 옵션
 */
export interface BOMCompareOptions {
  ignoreInactiveItems: boolean;        // 비활성 아이템 무시 여부
  ignoreOptionalItems: boolean;        // 선택사항 아이템 무시 여부
  ignoreMinorCostChanges: boolean;     // 소액 비용 변경 무시 여부
  minorCostThreshold: number;          // 소액 기준 금액 (원)
  compareToLevel?: number;             // 비교할 최대 레벨
  ignoreFields?: string[];             // 무시할 필드들 (remarks, position 등)
  includeCostImpactAnalysis: boolean;  // 비용 영향도 분석 포함 여부
  includeStructuralAnalysis: boolean;  // 구조적 분석 포함 여부
}

/**
 * BOM 비교 응답 인터페이스
 */
export interface CompareBOMResponse {
  comparisonId: string;                // 비교 결과 ID
  sourceBOMInfo: BOMComparisonInfo;    // 원본 BOM 정보
  targetBOMInfo: BOMComparisonInfo;    // 대상 BOM 정보
  differences: BOMDifferences;         // 차이점 상세
  summary: BOMComparisonSummary;       // 비교 요약
  recommendations: string[];           // 권장사항
  comparedAt: Date;                    // 비교 수행 시각
  // useBOMComparison에서 사용하는 필드들 추가
  comparison: BOMComparison;
}

/**
 * BOM 비교 결과 (useBOMComparison용)
 */
export interface BOMComparison {
  sourceTree: GetBOMTreeNode[];
  targetTree: GetBOMTreeNode[];
  differences: BOMComparisonDifference[];
}

/**
 * BOM 비교 차이점 (useBOMComparison용)
 */
export interface BOMComparisonDifference {
  type: DifferenceType;
  sourceNode?: GetBOMTreeNode;
  targetNode?: GetBOMTreeNode;
  description: string;
}

/**
 * BOM 비교 정보
 */
export interface BOMComparisonInfo {
  id: string;                          // BOM ID
  productCode: string;                 // 제품 코드
  productName: string;                 // 제품명
  version: string;                     // BOM 버전
  totalItems: number;                  // 총 아이템 수
  totalCost: number;                   // 총 비용
  lastUpdated: Date;                   // 최종 수정일
  maxLevel: number;                    // 최대 레벨
}

/**
 * BOM 차이점 상세
 */
export interface BOMDifferences {
  addedItems: BOMItemComparison[];     // 추가된 아이템들
  deletedItems: BOMItemComparison[];   // 삭제된 아이템들
  modifiedItems: BOMItemComparison[];  // 수정된 아이템들
  structuralChanges: StructuralChange[]; // 구조적 변경사항
  costChanges: CostChange[];           // 비용 변경사항
}

/**
 * 차이점 유형 열거형
 */
export enum DifferenceType {
  ADDED = 'ADDED',
  REMOVED = 'REMOVED',
  QUANTITY_CHANGED = 'QUANTITY_CHANGED',
  COST_CHANGED = 'COST_CHANGED',
  PROPERTIES_CHANGED = 'PROPERTIES_CHANGED'
}

/**
 * BOM 아이템 비교 정보
 */
export interface BOMItemComparison {
  sourceItem?: BOMItemSnapshot;        // 원본 아이템 (삭제된 경우 null)
  targetItem?: BOMItemSnapshot;        // 대상 아이템 (추가된 경우 null)
  changeType: 'ADDED' | 'DELETED' | 'MODIFIED';
  changedFields?: FieldChange[];       // 수정된 필드들 (수정인 경우)
  costImpact: number;                  // 비용 영향
  significanceLevel: 'HIGH' | 'MEDIUM' | 'LOW'; // 중요도
}

/**
 * BOM 아이템 스냅샷
 */
export interface BOMItemSnapshot {
  id: string;                          // BOM Item ID
  componentCode: string;               // 구성품 코드
  componentName: string;               // 구성품명
  componentType: ComponentType;        // 구성품 유형
  level: number;                       // 레벨
  sequence: number;                    // 순서
  quantity: number;                    // 수량
  unitCost: number;                    // 단가
  totalCost: number;                   // 총 비용
  scrapRate: number;                   // 스크랩률
  isOptional: boolean;                 // 선택사항 여부
  position?: string;                   // 조립 위치
  processStep?: string;                // 투입 공정
  remarks?: string;                    // 비고
  parentPath: string;                  // 부모 경로 (구조 추적용)
}

/**
 * 필드 변경 정보
 */
export interface FieldChange {
  fieldName: string;                   // 필드명
  displayName: string;                 // 표시명
  oldValue: any;                       // 이전 값
  newValue: any;                       // 새로운 값
  changeType: 'INCREASE' | 'DECREASE' | 'CHANGE';
  percentageChange?: number;           // 변화율 (수치형 필드)
}

/**
 * 구조적 변경사항
 */
export interface StructuralChange {
  type: 'LEVEL_CHANGE' | 'PARENT_CHANGE' | 'SEQUENCE_CHANGE';
  componentCode: string;               // 영향받은 구성품 코드
  description: string;                 // 변경 설명
  impact: 'HIGH' | 'MEDIUM' | 'LOW';   // 영향도
}

/**
 * 비용 변경사항
 */
export interface CostChange {
  componentCode: string;               // 구성품 코드
  changeType: 'UNIT_COST' | 'QUANTITY' | 'TOTAL_COST';
  oldValue: number;                    // 이전 값
  newValue: number;                    // 새로운 값
  difference: number;                  // 차이
  percentageChange: number;            // 변화율
}

/**
 * BOM 비교 요약
 */
export interface BOMComparisonSummary {
  totalChanges: number;                // 총 변경사항 수
  addedItemsCount: number;             // 추가된 아이템 수
  deletedItemsCount: number;           // 삭제된 아이템 수
  modifiedItemsCount: number;          // 수정된 아이템 수
  totalCostDifference: number;         // 총 비용 차이
  costChangePercentage: number;        // 비용 변화율
  majorChanges: number;                // 주요 변경사항 수
  structuralChanges: number;           // 구조적 변경 수
  comparisonComplexity: 'HIGH' | 'MEDIUM' | 'LOW'; // 비교 복잡도
  confidenceLevel: number;             // 신뢰도 (0-100)
}

/**
 * BOM 비교 유스케이스 클래스
 */
export class CompareBOMUseCase {
  constructor(
    private bomRepository: BOMRepository,
    private bomItemRepository: BOMItemRepository,
    private productRepository: ProductRepository,
    private bomHistoryRepository: BOMHistoryRepository
  ) {}

  /**
   * BOM 비교 실행
   * @param request 비교 요청 정보
   * @returns 비교 결과 응답
   */
  async execute(request: CompareBOMRequest): Promise<CompareBOMResponse> {
    // 1. 입력 검증
    this.validateRequest(request);

    // 2. 소스/타겟 BOM 조회
    const [sourceBOM, targetBOM] = await Promise.all([
      this.bomRepository.findById(new BOMId(request.sourceBOMId)),
      this.bomRepository.findById(new BOMId(request.targetBOMId))
    ]);

    if (!sourceBOM) {
      throw new Error('원본 BOM이 존재하지 않습니다.');
    }
    if (!targetBOM) {
      throw new Error('대상 BOM이 존재하지 않습니다.');
    }

    // 3. BOM 정보 구성
    const sourceBOMInfo = await this.createBOMComparisonInfo(sourceBOM);
    const targetBOMInfo = await this.createBOMComparisonInfo(targetBOM);

    // 4. 아이템 스냅샷 생성
    const sourceSnapshots = await this.createItemSnapshots(sourceBOM, request.compareOptions);
    const targetSnapshots = await this.createItemSnapshots(targetBOM, request.compareOptions);

    // 5. 차이점 분석
    const differences = await this.analyzeDifferences(sourceSnapshots, targetSnapshots, request.compareOptions);

    // 6. 비교 요약 생성
    const summary = this.createComparisonSummary(differences, sourceBOMInfo, targetBOMInfo);

    // 7. 권장사항 생성
    const recommendations = this.generateRecommendations(differences, summary);

    // 8. 비교 이력 기록 (선택적)
    if (request.id_request) {
      await this.recordComparisonHistory(request, summary);
    }

    const comparisonId = this.generateComparisonId();

    // 7. useBOMComparison용 comparison 데이터 생성
    const comparison: BOMComparison = {
      sourceTree: await this.convertToTreeNodes(sourceSnapshots),
      targetTree: await this.convertToTreeNodes(targetSnapshots),
      differences: this.convertToBOMComparisonDifferences(differences, sourceSnapshots, targetSnapshots)
    };

    return {
      comparisonId,
      sourceBOMInfo,
      targetBOMInfo,
      differences,
      summary,
      recommendations,
      comparedAt: new Date(),
      comparison
    };
  }

  // === Private 메서드들 ===

  /**
   * 요청 검증
   */
  private validateRequest(request: CompareBOMRequest): void {
    if (!request.sourceBOMId) {
      throw new Error('원본 BOM ID는 필수입니다.');
    }
    if (!request.targetBOMId) {
      throw new Error('대상 BOM ID는 필수입니다.');
    }
    if (request.sourceBOMId === request.targetBOMId) {
      throw new Error('동일한 BOM을 비교할 수 없습니다.');
    }

    // 비교 옵션 검증
    if (request.compareOptions.minorCostThreshold < 0) {
      throw new Error('소액 기준 금액은 0 이상이어야 합니다.');
    }
    if (request.compareOptions.compareToLevel !== undefined && request.compareOptions.compareToLevel < 0) {
      throw new Error('비교 레벨은 0 이상이어야 합니다.');
    }
  }

  /**
   * BOM 비교 정보 생성
   */
  private async createBOMComparisonInfo(bom: BOM): Promise<BOMComparisonInfo> {
    const product = await this.productRepository.findById(bom.getProductId());
    const bomItems = bom.getBOMItems();
    const maxLevel = Math.max(...bomItems.map(item => item.getLevel()), 0);

    return {
      id: bom.getId().getValue(),
      productCode: product?.getCdMaterial() || 'Unknown',
      productName: product?.getNmMaterial() || 'Unknown Product',
      version: bom.getVersion(),
      totalItems: bomItems.length,
      totalCost: bom.calculateTotalCost(),
      lastUpdated: bom.getDtUpdate(),
      maxLevel
    };
  }

  /**
   * 아이템 스냅샷 생성
   */
  private async createItemSnapshots(bom: BOM, options: BOMCompareOptions): Promise<BOMItemSnapshot[]> {
    let bomItems = bom.getBOMItems();

    // 필터링 적용
    if (options.ignoreInactiveItems) {
      bomItems = bomItems.filter(item => item.isCurrentlyActive());
    }
    if (options.ignoreOptionalItems) {
      bomItems = bomItems.filter(item => !item.getIsOptional());
    }
    if (options.compareToLevel !== undefined) {
      bomItems = bomItems.filter(item => item.getLevel() <= options.compareToLevel!);
    }

    const snapshots: BOMItemSnapshot[] = [];

    for (const item of bomItems) {
      const component = await this.productRepository.findById(item.getComponentId());
      if (!component) continue;

      // 부모 경로 생성 (구조 추적용)
      const parentPath = await this.buildParentPath(item, bom);

      const snapshot: BOMItemSnapshot = {
        id: item.getId().getValue(),
        componentCode: component.getCdMaterial(),
        componentName: component.getNmMaterial(),
        componentType: item.getComponentType(),
        level: item.getLevel(),
        sequence: item.getSequence(),
        quantity: item.getQuantity(),
        unitCost: item.getUnitCost(),
        totalCost: item.getTotalCost(),
        scrapRate: item.getScrapRate(),
        isOptional: item.getIsOptional(),
        position: item.getPosition(),
        processStep: item.getProcessStep(),
        remarks: item.getRemarks(),
        parentPath
      };

      snapshots.push(snapshot);
    }

    return snapshots;
  }

  /**
   * 부모 경로 구성
   */
  private async buildParentPath(item: BOMItem, bom: BOM): Promise<string> {
    const path: string[] = [];
    let currentItem = item;

    // 루트까지 역순으로 추적
    while (currentItem.getParentItemId()) {
      const parentItemId = currentItem.getParentItemId()!;
      const parentItem = bom.getBOMItems().find(i => 
        i.getId().equals(parentItemId)
      );
      if (!parentItem) break;

      const parentComponent = await this.productRepository.findById(parentItem.getComponentId());
      if (parentComponent) {
        path.unshift(parentComponent.getCdMaterial());
      }

      currentItem = parentItem;
    }

    return path.join(' > ');
  }

  /**
   * 차이점 분석
   */
  private async analyzeDifferences(
    sourceSnapshots: BOMItemSnapshot[],
    targetSnapshots: BOMItemSnapshot[],
    options: BOMCompareOptions
  ): Promise<BOMDifferences> {
    const differences: BOMDifferences = {
      addedItems: [],
      deletedItems: [],
      modifiedItems: [],
      structuralChanges: [],
      costChanges: []
    };

    // 키 기반 매핑 (구성품 코드 + 부모 경로)
    const sourceMap = new Map<string, BOMItemSnapshot>();
    const targetMap = new Map<string, BOMItemSnapshot>();

    sourceSnapshots.forEach(item => {
      const key = `${item.componentCode}|${item.parentPath}`;
      sourceMap.set(key, item);
    });

    targetSnapshots.forEach(item => {
      const key = `${item.componentCode}|${item.parentPath}`;
      targetMap.set(key, item);
    });

    // 1. 추가된 아이템 찾기
    for (const [key, targetItem] of Array.from(targetMap.entries())) {
      if (!sourceMap.has(key)) {
        differences.addedItems.push({
          targetItem,
          changeType: 'ADDED',
          costImpact: targetItem.totalCost,
          significanceLevel: this.calculateSignificanceLevel(targetItem.totalCost, 'ADD')
        });
      }
    }

    // 2. 삭제된 아이템 찾기
    for (const [key, sourceItem] of Array.from(sourceMap.entries())) {
      if (!targetMap.has(key)) {
        differences.deletedItems.push({
          sourceItem,
          changeType: 'DELETED',
          costImpact: -sourceItem.totalCost,
          significanceLevel: this.calculateSignificanceLevel(sourceItem.totalCost, 'DELETE')
        });
      }
    }

    // 3. 수정된 아이템 찾기
    for (const [key, sourceItem] of Array.from(sourceMap.entries())) {
      const targetItem = targetMap.get(key);
      if (targetItem) {
        const changedFields = this.compareItems(sourceItem, targetItem, options);
        if (changedFields.length > 0) {
          const costImpact = targetItem.totalCost - sourceItem.totalCost;
          differences.modifiedItems.push({
            sourceItem,
            targetItem,
            changeType: 'MODIFIED',
            changedFields,
            costImpact,
            significanceLevel: this.calculateSignificanceLevel(Math.abs(costImpact), 'MODIFY')
          });

          // 비용 변경사항 추가
          if (Math.abs(costImpact) > 0) {
            differences.costChanges.push({
              componentCode: sourceItem.componentCode,
              changeType: 'TOTAL_COST',
              oldValue: sourceItem.totalCost,
              newValue: targetItem.totalCost,
              difference: costImpact,
              percentageChange: sourceItem.totalCost > 0 ? (costImpact / sourceItem.totalCost) * 100 : 0
            });
          }
        }

        // 구조적 변경 확인
        const structuralChanges = this.checkStructuralChanges(sourceItem, targetItem);
        differences.structuralChanges.push(...structuralChanges);
      }
    }

    return differences;
  }

  /**
   * 아이템 간 필드 비교
   */
  private compareItems(
    sourceItem: BOMItemSnapshot,
    targetItem: BOMItemSnapshot,
    options: BOMCompareOptions
  ): FieldChange[] {
    const changes: FieldChange[] = [];
    const ignoreFields = options.ignoreFields || [];

    // 수량 비교
    if (!ignoreFields.includes('quantity') && sourceItem.quantity !== targetItem.quantity) {
      changes.push({
        fieldName: 'quantity',
        displayName: '소요량',
        oldValue: sourceItem.quantity,
        newValue: targetItem.quantity,
        changeType: targetItem.quantity > sourceItem.quantity ? 'INCREASE' : 'DECREASE',
        percentageChange: ((targetItem.quantity - sourceItem.quantity) / sourceItem.quantity) * 100
      });
    }

    // 단가 비교
    if (!ignoreFields.includes('unitCost') && sourceItem.unitCost !== targetItem.unitCost) {
      const costDiff = targetItem.unitCost - sourceItem.unitCost;
      if (!options.ignoreMinorCostChanges || Math.abs(costDiff) > options.minorCostThreshold) {
        changes.push({
          fieldName: 'unitCost',
          displayName: '단가',
          oldValue: sourceItem.unitCost,
          newValue: targetItem.unitCost,
          changeType: targetItem.unitCost > sourceItem.unitCost ? 'INCREASE' : 'DECREASE',
          percentageChange: sourceItem.unitCost > 0 ? (costDiff / sourceItem.unitCost) * 100 : 0
        });
      }
    }

    // 스크랩률 비교
    if (!ignoreFields.includes('scrapRate') && sourceItem.scrapRate !== targetItem.scrapRate) {
      changes.push({
        fieldName: 'scrapRate',
        displayName: '스크랩률',
        oldValue: sourceItem.scrapRate,
        newValue: targetItem.scrapRate,
        changeType: targetItem.scrapRate > sourceItem.scrapRate ? 'INCREASE' : 'DECREASE',
        percentageChange: sourceItem.scrapRate > 0 ? ((targetItem.scrapRate - sourceItem.scrapRate) / sourceItem.scrapRate) * 100 : 0
      });
    }

    // 선택사항 여부 비교
    if (!ignoreFields.includes('isOptional') && sourceItem.isOptional !== targetItem.isOptional) {
      changes.push({
        fieldName: 'isOptional',
        displayName: '선택사항',
        oldValue: sourceItem.isOptional,
        newValue: targetItem.isOptional,
        changeType: 'CHANGE'
      });
    }

    // 조립 위치 비교
    if (!ignoreFields.includes('position') && sourceItem.position !== targetItem.position) {
      changes.push({
        fieldName: 'position',
        displayName: '조립 위치',
        oldValue: sourceItem.position,
        newValue: targetItem.position,
        changeType: 'CHANGE'
      });
    }

    // 공정 비교
    if (!ignoreFields.includes('processStep') && sourceItem.processStep !== targetItem.processStep) {
      changes.push({
        fieldName: 'processStep',
        displayName: '투입 공정',
        oldValue: sourceItem.processStep,
        newValue: targetItem.processStep,
        changeType: 'CHANGE'
      });
    }

    return changes;
  }

  /**
   * 구조적 변경 확인
   */
  private checkStructuralChanges(sourceItem: BOMItemSnapshot, targetItem: BOMItemSnapshot): StructuralChange[] {
    const changes: StructuralChange[] = [];

    // 레벨 변경
    if (sourceItem.level !== targetItem.level) {
      changes.push({
        type: 'LEVEL_CHANGE',
        componentCode: sourceItem.componentCode,
        description: `레벨이 ${sourceItem.level}에서 ${targetItem.level}로 변경됨`,
        impact: Math.abs(targetItem.level - sourceItem.level) > 1 ? 'HIGH' : 'MEDIUM'
      });
    }

    // 부모 경로 변경
    if (sourceItem.parentPath !== targetItem.parentPath) {
      changes.push({
        type: 'PARENT_CHANGE',
        componentCode: sourceItem.componentCode,
        description: `부모 구성품이 변경됨: ${sourceItem.parentPath} → ${targetItem.parentPath}`,
        impact: 'HIGH'
      });
    }

    // 순서 변경
    if (sourceItem.sequence !== targetItem.sequence) {
      changes.push({
        type: 'SEQUENCE_CHANGE',
        componentCode: sourceItem.componentCode,
        description: `순서가 ${sourceItem.sequence}에서 ${targetItem.sequence}로 변경됨`,
        impact: 'LOW'
      });
    }

    return changes;
  }

  /**
   * 중요도 계산
   */
  private calculateSignificanceLevel(costImpact: number, changeType: 'ADD' | 'DELETE' | 'MODIFY'): 'HIGH' | 'MEDIUM' | 'LOW' {
    const absImpact = Math.abs(costImpact);

    if (changeType === 'DELETE' && absImpact > 50000) return 'HIGH';
    if (absImpact > 100000) return 'HIGH';
    if (absImpact > 10000) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 비교 요약 생성
   */
  private createComparisonSummary(
    differences: BOMDifferences,
    sourceBOMInfo: BOMComparisonInfo,
    targetBOMInfo: BOMComparisonInfo
  ): BOMComparisonSummary {
    const totalChanges = differences.addedItems.length + 
                        differences.deletedItems.length + 
                        differences.modifiedItems.length;

    const totalCostDifference = targetBOMInfo.totalCost - sourceBOMInfo.totalCost;
    const costChangePercentage = sourceBOMInfo.totalCost > 0 ? 
      (totalCostDifference / sourceBOMInfo.totalCost) * 100 : 0;

    const majorChanges = [
      ...differences.addedItems,
      ...differences.deletedItems,
      ...differences.modifiedItems
    ].filter(change => change.significanceLevel === 'HIGH').length;

    // 복잡도 계산
    let comparisonComplexity: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (totalChanges > 50 || differences.structuralChanges.length > 10) {
      comparisonComplexity = 'HIGH';
    } else if (totalChanges > 20 || differences.structuralChanges.length > 5) {
      comparisonComplexity = 'MEDIUM';
    }

    // 신뢰도 계산 (간단한 휴리스틱)
    let confidenceLevel = 100;
    if (differences.structuralChanges.length > totalChanges * 0.5) {
      confidenceLevel = 85;
    }
    if (Math.abs(costChangePercentage) > 50) {
      confidenceLevel = Math.min(confidenceLevel, 90);
    }

    return {
      totalChanges,
      addedItemsCount: differences.addedItems.length,
      deletedItemsCount: differences.deletedItems.length,
      modifiedItemsCount: differences.modifiedItems.length,
      totalCostDifference,
      costChangePercentage,
      majorChanges,
      structuralChanges: differences.structuralChanges.length,
      comparisonComplexity,
      confidenceLevel
    };
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendations(differences: BOMDifferences, summary: BOMComparisonSummary): string[] {
    const recommendations: string[] = [];

    if (summary.majorChanges > 5) {
      recommendations.push('주요 변경사항이 많습니다. 제품 품질팀 및 생산계획팀과 협의하시기 바랍니다.');
    }

    if (Math.abs(summary.costChangePercentage) > 20) {
      recommendations.push(`총 비용이 ${summary.costChangePercentage.toFixed(1)}% 변경되었습니다. 원가 검토가 필요합니다.`);
    }

    if (summary.structuralChanges > 10) {
      recommendations.push('구조적 변경사항이 많습니다. BOM 트리 구조를 다시 확인하세요.');
    }

    if (differences.deletedItems.length > 0) {
      const highImpactDeletes = differences.deletedItems.filter(d => d.significanceLevel === 'HIGH').length;
      if (highImpactDeletes > 0) {
        recommendations.push(`${highImpactDeletes}개의 중요한 구성품이 삭제되었습니다. 생산 가능성을 확인하세요.`);
      }
    }

    if (differences.addedItems.length > differences.deletedItems.length * 2) {
      recommendations.push('새로 추가된 구성품이 많습니다. 재고 및 조달 계획을 업데이트하세요.');
    }

    if (summary.confidenceLevel < 90) {
      recommendations.push('비교 결과의 신뢰도가 낮습니다. 수동으로 주요 변경사항을 재검토하세요.');
    }

    if (recommendations.length === 0) {
      recommendations.push('비교 결과가 정상적으로 처리되었습니다.');
    }

    return recommendations;
  }

  /**
   * 비교 이력 기록
   */
  private async recordComparisonHistory(request: CompareBOMRequest, summary: BOMComparisonSummary): Promise<void> {
    const history = new BOMHistory(
      this.generateHistoryId(),
      new BOMId(request.sourceBOMId),
      BOMHistoryAction.COMPARE_BOM,
      'BOM_COMPARISON',
      `${request.sourceBOMId}_vs_${request.targetBOMId}`,
      [
        new ChangedField('targetBOMId', null, request.targetBOMId),
        new ChangedField('totalChanges', null, summary.totalChanges),
        new ChangedField('costDifference', null, summary.totalCostDifference),
        new ChangedField('confidenceLevel', null, summary.confidenceLevel)
      ],
      request.id_request || 'system',
      request.id_request || 'system',
      new Date(),
      `BOM 비교: ${summary.totalChanges}개 변경사항 발견`
    );

    await this.bomHistoryRepository.save(history);
  }

  /**
   * 비교 ID 생성
   */
  private generateComparisonId(): string {
    return `BOMCOMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 이력 ID 생성
   */
  private generateHistoryId(): string {
    return `BOMHIST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * BOMItemSnapshot을 GetBOMTreeNode로 변환
   */
  private async convertToTreeNodes(snapshots: BOMItemSnapshot[]): Promise<GetBOMTreeNode[]> {
    return snapshots.map(snapshot => ({
      id: snapshot.id,
      bomItemId: snapshot.id,
      componentId: snapshot.id, // 실제로는 Product ID가 들어가야 함
      componentCode: snapshot.componentCode,
      componentName: snapshot.componentName,
      componentType: snapshot.componentType.toString(),
      componentTypeDisplay: this.getComponentTypeDisplay(snapshot.componentType),
      parentId: undefined, // 부모 관계는 별도 로직으로 설정 필요
      level: snapshot.level,
      sequence: snapshot.sequence,
      quantity: snapshot.quantity,
      unit: 'EA',
      unitName: 'EA', // 기본값, 실제로는 Product에서 가져와야 함
      unitCost: snapshot.unitCost,
      totalCost: snapshot.totalCost,
      scrapRate: snapshot.scrapRate,
      actualQuantity: snapshot.quantity * (1 + snapshot.scrapRate / 100),
      isOptional: snapshot.isOptional,
      position: snapshot.position,
      processStep: snapshot.processStep,
      remarks: snapshot.remarks,
      isActive: true, // 스냅샷에 포함된 항목은 활성화된 것으로 간주
      hasChildren: false,
      isExpanded: false,
      children: [],
      isSelected: false,
      isHighlighted: false,
      depth: snapshot.level,
    }));
  }

  /**
   * BOMDifferences를 BOMComparisonDifference 배열로 변환
   */
  private convertToBOMComparisonDifferences(
    differences: BOMDifferences,
    sourceSnapshots: BOMItemSnapshot[],
    targetSnapshots: BOMItemSnapshot[]
  ): BOMComparisonDifference[] {
    const result: BOMComparisonDifference[] = [];

    // 추가된 아이템들
    differences.addedItems.forEach(added => {
      if (added.targetItem) {
        result.push({
          type: DifferenceType.ADDED,
          targetNode: this.snapshotToTreeNode(added.targetItem),
          description: `신규 구성품 추가: ${added.targetItem.componentName}`,
        });
      }
    });

    // 삭제된 아이템들
    differences.deletedItems.forEach(deleted => {
      if (deleted.sourceItem) {
        result.push({
          type: DifferenceType.REMOVED,
          sourceNode: this.snapshotToTreeNode(deleted.sourceItem),
          description: `구성품 삭제: ${deleted.sourceItem.componentName}`,
        });
      }
    });

    // 수정된 아이템들
    differences.modifiedItems.forEach(modified => {
      if (modified.sourceItem && modified.targetItem && modified.changedFields) {
        const hasQuantityChange = modified.changedFields.some(f => f.fieldName === 'quantity');
        const hasCostChange = modified.changedFields.some(f => f.fieldName === 'unitCost');
        
        let type = DifferenceType.PROPERTIES_CHANGED;
        if (hasQuantityChange) type = DifferenceType.QUANTITY_CHANGED;
        else if (hasCostChange) type = DifferenceType.COST_CHANGED;

        const changedFieldNames = modified.changedFields.map(f => f.displayName).join(', ');
        
        result.push({
          type,
          sourceNode: this.snapshotToTreeNode(modified.sourceItem),
          targetNode: this.snapshotToTreeNode(modified.targetItem),
          description: `${modified.sourceItem.componentName} - 변경된 필드: ${changedFieldNames}`,
        });
      }
    });

    return result;
  }

  /**
   * BOMItemSnapshot을 GetBOMTreeNode로 변환 (단일)
   */
  private snapshotToTreeNode(snapshot: BOMItemSnapshot): GetBOMTreeNode {
    return {
      id: snapshot.id,
      bomItemId: snapshot.id,
      componentId: snapshot.id, // 실제로는 Product ID가 들어가야 함
      componentCode: snapshot.componentCode,
      componentName: snapshot.componentName,
      componentType: snapshot.componentType.toString(),
      componentTypeDisplay: this.getComponentTypeDisplay(snapshot.componentType),
      parentId: undefined,
      level: snapshot.level,
      sequence: snapshot.sequence,
      quantity: snapshot.quantity,
      unit: 'EA',
      unitName: 'EA',
      unitCost: snapshot.unitCost,
      totalCost: snapshot.totalCost,
      scrapRate: snapshot.scrapRate,
      actualQuantity: snapshot.quantity * (1 + snapshot.scrapRate / 100),
      isOptional: snapshot.isOptional,
      position: snapshot.position,
      processStep: snapshot.processStep,
      remarks: snapshot.remarks,
      isActive: true,
      hasChildren: false,
      isExpanded: false,
      children: [],
      isSelected: false,
      isHighlighted: false,
      depth: snapshot.level,
    };
  }

  /**
   * ComponentType을 표시명으로 변환
   */
  private getComponentTypeDisplay(type: ComponentType): string {
    switch (type) {
      case ComponentType.RAW_MATERIAL:
        return '원자재';
      case ComponentType.SEMI_FINISHED:
        return '반제품';
      case ComponentType.PURCHASED_PART:
        return '구매품';
      case ComponentType.SUB_ASSEMBLY:
        return '조립품';
      case ComponentType.CONSUMABLE:
        return '소모품';
      default:
        return '기타';
    }
  }
}