// 외부 엔티티 import
import { BOM } from '../../../domain/entities/BOM';
import { BOMItem, ComponentType } from '../../../domain/entities/BOMItem';
import { Product, ProductId } from '@features/product/domain/entities/Product';
import { BOMRepository } from '../../../domain/repositories/BOMRepository';
import { BOMItemRepository } from '../../../domain/repositories/BOMItemRepository';
import { ProductRepository } from '@features/product/domain/repositories/ProductRepository';

/**
 * BOM 트리 조회 유스케이스
 * 
 * 워크플로우:
 * 1. 요청 데이터 검증 (제품 ID, 버전)
 * 2. 제품 정보 확인
 * 3. BOM 조회 (버전별 또는 최신 활성)
 * 4. BOM 아이템들을 트리 구조로 변환
 * 5. 필터링 적용 (레벨, 활성 상태)
 * 6. 통계 정보 계산
 * 7. 트리 노드 구조로 변환하여 응답
 * 
 * 데이터 흐름:
 * UI Request → UseCase → Repository → Domain Entity → TreeNode DTO → UI
 */

/**
 * BOM 트리 조회 요청 인터페이스
 */
export interface GetBOMTreeRequest {
  productId: string;                   // 제품 ID
  version?: string;                    // 특정 버전 조회 (없으면 최신 활성 버전)
  maxLevel?: number;                   // 최대 전개 레벨 (없으면 전체)
  includeInactive?: boolean;           // 비활성 아이템 포함 여부
  expandAll?: boolean;                 // 전체 펼침 여부
  includeOptional?: boolean;           // 선택사항 구성품 포함 여부
  filterByProcessStep?: string;        // 특정 공정 구성품만 조회
  filterByComponentType?: ComponentType; // 특정 구성품 유형만 조회
}

/**
 * BOM 기본 정보 DTO
 */
export interface BOMInfo {
  id: string;                          // BOM ID
  productId: string;                   // 제품 ID
  productCode: string;                 // 제품 코드
  productName: string;                 // 제품명
  version: string;                     // BOM 버전
  isActive: boolean;                   // 활성화 상태
  effectiveDate: Date;                 // 적용일
  expiryDate?: Date;                   // 만료일
  description?: string;                // 설명
  lastUpdated: Date;                   // 최종 수정일
  totalCost: number;                   // 총 비용
}

/**
 * BOM 트리 노드 DTO
 * UI에서 트리 테이블 렌더링을 위한 구조
 */
export interface BOMTreeNode {
  id: string;                          // 노드 고유 ID
  bomItemId: string;                   // BOM Item ID
  componentId: string;                 // 구성품 제품 ID
  componentCode: string;               // 구성품 코드
  componentName: string;               // 구성품명
  componentType: string;               // 구성품 유형
  componentTypeDisplay: string;        // 구성품 유형 표시명
  parentId?: string;                   // 부모 노드 ID
  level: number;                       // 트리 레벨
  sequence: number;                    // 동일 레벨 내 순서
  quantity: number;                    // 소요량
  unit: string;                        // 단위 코드
  unitName: string;                    // 단위 명
  unitCost: number;                    // 단가
  totalCost: number;                   // 총 비용 (수량 × 단가)
  scrapRate: number;                   // 스크랩률
  actualQuantity: number;              // 실제 소요량 (스크랩 포함)
  isOptional: boolean;                 // 선택사항 여부
  position?: string;                   // 조립 위치
  processStep?: string;                // 투입 공정
  remarks?: string;                    // 비고
  isActive: boolean;                   // 활성 상태
  hasChildren: boolean;                // 하위 노드 존재 여부
  isExpanded: boolean;                 // 펼침 상태
  children: BOMTreeNode[];             // 하위 노드들
  // UI 상태 관리용
  isSelected?: boolean;                // 선택 상태
  isHighlighted?: boolean;             // 하이라이트 상태
  depth?: number;                      // 실제 렌더링 깊이
}

/**
 * BOM 트리 조회 응답 인터페이스
 */
export interface GetBOMTreeResponse {
  bomInfo: BOMInfo;                    // BOM 기본 정보
  treeNodes: BOMTreeNode[];            // 트리 노드 구조
  totalItems: number;                  // 총 아이템 수
  activeItems: number;                 // 활성 아이템 수
  maxLevel: number;                    // 최대 레벨
  totalCost: number;                   // 총 비용
  statistics: BOMStatistics;           // 통계 정보
}

/**
 * BOM 통계 정보
 */
export interface BOMStatistics {
  componentTypeCount: Map<ComponentType, number>; // 구성품 유형별 개수
  processStepCount: Map<string, number>;          // 공정별 개수
  levelCount: Map<number, number>;                // 레벨별 개수
  costByLevel: Map<number, number>;               // 레벨별 비용
  optionalItemsCount: number;                     // 선택사항 개수
  criticalItemsCount: number;                     // 중요 구성품 개수
  averageCostPerItem: number;                     // 아이템당 평균 비용
}

/**
 * BOM 트리 조회 유스케이스 클래스
 */
export class GetBOMTreeUseCase {
  constructor(
    private bomRepository: BOMRepository,
    private bomItemRepository: BOMItemRepository,
    private productRepository: ProductRepository,
    private bomPresenter: BOMPresenter
  ) {}

  /**
   * BOM 트리 조회 실행
   * @param request 조회 요청 정보
   * @returns BOM 트리 구조 응답
   */
  async execute(request: GetBOMTreeRequest): Promise<GetBOMTreeResponse> {
    // 1. 입력 검증
    this.validateRequest(request);

    // 2. 제품 정보 확인
    const product = await this.productRepository.findById(new ProductId(request.productId));
    if (!product) {
      throw new Error('존재하지 않는 제품입니다.');
    }

    // 제품이 BOM을 가질 수 있는지 확인
    if (!product.canHaveBOM()) {
        throw new Error('이 제품 유형은 BOM을 가질 수 없습니다.');
    }

    console.log('🚀 request.productId:', request.productId);
    console.log('🚀 request.version:', request.version);
    // 3. BOM 조회 (버전별)
    const bom = await this.findBOMByProductAndVersion(request.productId, request.version);
    console.log('🚀 bom:', bom);
    if (!bom) {
      return this.createEmptyResponse(product);
    }

    // 4. BOM 아이템들을 트리 구조로 변환
    // BOM에서 직접 가져오는 대신 BOMItemRepository를 통해 조회
    const bomItems = await this.bomItemRepository.findByBOMId(bom.getId());
    const filteredItems = this.filterItems(bomItems, request);
    console.log('🚀 filteredItems:', filteredItems);
    const treeNodes = await this.buildTreeStructure(filteredItems, request.expandAll || false);

    // 5. 통계 정보 계산
    const statistics = this.calculateStatistics(filteredItems);
    const totalItems = filteredItems.length;
    const activeItems = filteredItems.filter(item => item.isCurrentlyActive()).length;
    const maxLevel = Math.max(...filteredItems.map(item => item.getLevel()), 0);
    const totalCost = bom.calculateTotalCost();

    // 6. BOM 정보 구성
    const bomInfo: BOMInfo = {
      id: bom.getId().getValue(),
      productId: product.getId().getValue(),
      productCode: product.getCdMaterial(),
      productName: product.getNmMaterial(),
      version: bom.getVersion(),
      isActive: bom.getIsActive(),
      effectiveDate: bom.getEffectiveDate(),
      expiryDate: bom.getExpiryDate(),
      description: bom.getDescription(),
      lastUpdated: bom.getDtUpdate(),
      totalCost
    };

    return {
      bomInfo,
      treeNodes,
      totalItems,
      activeItems,
      maxLevel,
      totalCost,
      statistics
    };
  }

  // === Private 메서드들 ===

  /**
   * BOM 조회 (버전별 또는 최신)
   */
  private async findBOMByProductAndVersion(productId: string, version?: string): Promise<BOM | null> {
    const productIdObj = new ProductId(productId);
    
    if (version) {
      return await this.bomRepository.findByProductIdAndVersion(productIdObj, version);
    } else {
      return await this.bomRepository.findActiveByProductId(productIdObj);
    }
  }

  /**
   * 아이템 필터링
   */
  private filterItems(bomItems: BOMItem[], request: GetBOMTreeRequest): BOMItem[] {
    let filteredItems = bomItems;

    // 레벨 필터링
    if (request.maxLevel !== undefined) {
      filteredItems = filteredItems.filter(item => item.getLevel() <= request.maxLevel!);
    }

    // 활성 상태 필터링
    if (!request.includeInactive) {
      filteredItems = filteredItems.filter(item => item.isCurrentlyActive());
    }

    // 선택사항 필터링
    if (!request.includeOptional) {
      filteredItems = filteredItems.filter(item => !item.getIsOptional());
    }

    // 공정별 필터링
    if (request.filterByProcessStep) {
      filteredItems = filteredItems.filter(item => 
        item.getProcessStep() === request.filterByProcessStep
      );
    }

    // 구성품 유형별 필터링
    if (request.filterByComponentType) {
      filteredItems = filteredItems.filter(item => 
        item.getComponentType() === request.filterByComponentType
      );
    }

    return filteredItems;
  }

  /**
   * 트리 구조 구성
   */
  private async buildTreeStructure(bomItems: BOMItem[], expandAll: boolean): Promise<BOMTreeNode[]> {
    // 1. 모든 아이템을 노드로 변환
    const nodeMap = new Map<string, BOMTreeNode>();
    
    for (const item of bomItems) {
      const component = await this.productRepository.findById(item.getComponentId());
      if (!component) continue;

      const node: BOMTreeNode = {
        id: `node-${item.getId().getValue()}`,
        bomItemId: item.getId().getValue(),
        componentId: item.getComponentId().getValue(),
        componentCode: component.getCdMaterial(),
        componentName: component.getNmMaterial(),
        componentType: item.getComponentType(),
        componentTypeDisplay: this.bomPresenter.getComponentTypeDisplayName(item.getComponentType()),
        parentId: item.getParentItemId()?.getValue(),
        level: item.getLevel(),
        sequence: item.getSequence(),
        quantity: item.getQuantity(),
        unit: item.getUnit().code,
        unitName: item.getUnit().name,
        unitCost: item.getUnitCost(),
        totalCost: item.getTotalCost(),
        scrapRate: item.getScrapRate(),
        actualQuantity: item.getActualQuantity(),
        isOptional: item.getIsOptional(),
        position: item.getPosition(),
        processStep: item.getProcessStep(),
        remarks: item.getRemarks(),
        isActive: item.isCurrentlyActive(),
        hasChildren: false,
        isExpanded: expandAll,
        children: [],
        depth: item.getLevel()
      };

      nodeMap.set(item.getId().getValue(), node);
    }

    // 2. 트리 구조 구성
    const rootNodes: BOMTreeNode[] = [];
    const allNodes = Array.from(nodeMap.values());

    // 부모-자식 관계 설정
    allNodes.forEach(node => {
      if (node.parentId) {
        const parent = Array.from(nodeMap.values()).find(n => 
          n.bomItemId === node.parentId
        );
        if (parent) {
          parent.children.push(node);
          parent.hasChildren = true;
        }
      } else {
        rootNodes.push(node);
      }
    });

    // 3. 각 레벨에서 sequence 순으로 정렬
    this.sortNodesBySequence(rootNodes);

    return rootNodes;
  }

  /**
   * 노드들을 순서별로 정렬
   */
  private sortNodesBySequence(nodes: BOMTreeNode[]): void {
    nodes.sort((a, b) => a.sequence - b.sequence);
    nodes.forEach(node => {
      if (node.children.length > 0) {
        this.sortNodesBySequence(node.children);
      }
    });
  }

  /**
   * 통계 정보 계산
   */
  private calculateStatistics(bomItems: BOMItem[]): BOMStatistics {
    const componentTypeCount = new Map<ComponentType, number>();
    const processStepCount = new Map<string, number>();
    const levelCount = new Map<number, number>();
    const costByLevel = new Map<number, number>();
    
    let optionalItemsCount = 0;
    let criticalItemsCount = 0;
    let totalCost = 0;

    bomItems.forEach(item => {
      // 구성품 유형별 카운트
      const type = item.getComponentType();
      componentTypeCount.set(type, (componentTypeCount.get(type) || 0) + 1);

      // 공정별 카운트
      const processStep = item.getProcessStep() || '미지정';
      processStepCount.set(processStep, (processStepCount.get(processStep) || 0) + 1);

      // 레벨별 카운트 및 비용
      const level = item.getLevel();
      levelCount.set(level, (levelCount.get(level) || 0) + 1);
      costByLevel.set(level, (costByLevel.get(level) || 0) + item.getTotalCost());

      // 기타 통계
      if (item.getIsOptional()) optionalItemsCount++;
      if (item.isCriticalComponent()) criticalItemsCount++;
      totalCost += item.getTotalCost();
    });

    const averageCostPerItem = bomItems.length > 0 ? totalCost / bomItems.length : 0;

    return {
      componentTypeCount,
      processStepCount,
      levelCount,
      costByLevel,
      optionalItemsCount,
      criticalItemsCount,
      averageCostPerItem
    };
  }

  /**
   * 빈 응답 생성 (BOM이 없는 경우)
   */
  private createEmptyResponse(product: Product): GetBOMTreeResponse {
    const bomInfo: BOMInfo = {
      id: '',
      productId: product.getId().getValue(),
      productCode: product.getCdMaterial(),
      productName: product.getNmMaterial(),
      version: '',
      isActive: false,
      effectiveDate: new Date(),
      lastUpdated: new Date(),
      totalCost: 0
    };

    const emptyStatistics: BOMStatistics = {
      componentTypeCount: new Map(),
      processStepCount: new Map(),
      levelCount: new Map(),
      costByLevel: new Map(),
      optionalItemsCount: 0,
      criticalItemsCount: 0,
      averageCostPerItem: 0
    };

    return {
      bomInfo,
      treeNodes: [],
      totalItems: 0,
      activeItems: 0,
      maxLevel: 0,
      totalCost: 0,
      statistics: emptyStatistics
    };
  }

  /**
   * 요청 검증
   */
  private validateRequest(request: GetBOMTreeRequest): void {
    if (!request.productId) {
      throw new Error('제품 ID는 필수입니다.');
    }
    if (request.maxLevel !== undefined && request.maxLevel < 0) {
      throw new Error('최대 레벨은 0 이상이어야 합니다.');
    }
  }
}

/**
 * BOM 프레젠터 인터페이스
 * 도메인 데이터를 UI 표시용으로 변환
 */
export interface BOMPresenter {
  getComponentTypeDisplayName(type: ComponentType): string;
}