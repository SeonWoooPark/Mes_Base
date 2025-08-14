// 외부 엔티티 import
import { BOMItem, BOMItemId, ComponentType } from '../entities/BOMItem';
import { BOMId } from '../entities/BOMItem';
import { ProductId } from '@features/product/domain/entities/Product';

/**
 * BOM Item 검색 조건 인터페이스
 * 트리 구조 특성을 고려한 검색 조건
 */
export interface BOMItemSearchCriteria {
  bomId?: BOMId;                       // 특정 BOM의 아이템만 조회
  componentIds?: ProductId[];          // 특정 구성품들만 조회
  levels?: number[];                   // 특정 레벨들만 조회
  parentItemId?: BOMItemId;           // 특정 부모의 직접 자식들만 조회
  componentTypes?: ComponentType[];    // 구성품 유형 필터
  isOptional?: boolean;               // 선택사항 여부 필터
  isActive?: boolean;                 // 활성 상태 필터
  minCost?: number;                   // 최소 비용
  maxCost?: number;                   // 최대 비용
  processSteps?: string[];            // 특정 공정들만 조회
}

/**
 * 트리 구조 조회 옵션
 */
export interface TreeQueryOptions {
  maxLevel?: number;                  // 최대 조회 레벨
  includeInactive?: boolean;          // 비활성 아이템 포함 여부
  sortBySequence?: boolean;           // 순서별 정렬 여부
  expandAll?: boolean;                // 모든 레벨 전개 여부
}

/**
 * BOMItem Repository 인터페이스
 * 
 * 역할:
 * - BOM Item 데이터의 영속성 관리
 * - 트리 구조 데이터 최적화된 조회
 * - 계층 구조 기반 CRUD 연산
 * - 부모-자식 관계 무결성 관리
 * 
 * 트리 구조 특성:
 * - 부모-자식 관계 관리
 * - 레벨 기반 계층 구조
 * - 순서(sequence) 관리
 * - 순환 참조 방지
 */
export interface BOMItemRepository {
  // === 기본 CRUD 연산 ===
  
  /**
   * BOM Item ID로 단건 조회
   * @param id BOM Item 고유 ID
   * @returns BOM Item 엔티티 또는 null
   */
  findById(id: BOMItemId): Promise<BOMItem | null>;

  /**
   * 여러 BOM Item ID로 다건 조회
   * @param ids BOM Item ID 배열
   * @returns BOM Item 엔티티 배열
   */
  findByIds(ids: BOMItemId[]): Promise<BOMItem[]>;

  /**
   * BOM Item 저장 (생성 또는 수정)
   * @param bomItem 저장할 BOM Item 엔티티
   */
  save(bomItem: BOMItem): Promise<void>;

  /**
   * BOM Item 삭제 (논리적 삭제)
   * @param id 삭제할 BOM Item ID
   */
  delete(id: BOMItemId): Promise<void>;

  /**
   * 여러 BOM Item 일괄 저장
   * @param bomItems 저장할 BOM Item 배열
   */
  saveAll(bomItems: BOMItem[]): Promise<void>;

  /**
   * 여러 BOM Item 일괄 삭제
   * @param ids 삭제할 BOM Item ID 배열
   */
  deleteAll(ids: BOMItemId[]): Promise<void>;

  // === BOM 기반 조회 ===

  /**
   * 특정 BOM의 모든 아이템 조회
   * @param bomId BOM ID
   * @returns 해당 BOM의 모든 아이템
   */
  findByBOMId(bomId: BOMId): Promise<BOMItem[]>;

  /**
   * 특정 BOM의 최상위 아이템들 조회 (레벨 0)
   * @param bomId BOM ID
   * @returns 최상위 레벨 아이템들
   */
  findRootItemsByBOMId(bomId: BOMId): Promise<BOMItem[]>;

  /**
   * 특정 BOM의 아이템 개수 조회
   * @param bomId BOM ID
   * @returns 해당 BOM의 총 아이템 개수
   */
  countByBOMId(bomId: BOMId): Promise<number>;

  // === 트리 구조 조회 ===

  /**
   * 특정 부모의 직접 자식 아이템들 조회
   * @param parentId 부모 아이템 ID
   * @returns 직접 자식 아이템들
   */
  findByParentId(parentId: BOMItemId): Promise<BOMItem[]>;

  /**
   * 특정 부모와 레벨 조건으로 아이템 조회
   * @param bomId BOM ID
   * @param parentId 부모 아이템 ID (undefined면 최상위)
   * @param level 레벨
   * @returns 조건에 맞는 아이템들
   */
  findByParentAndLevel(bomId: BOMId, parentId: BOMItemId | undefined, level: number): Promise<BOMItem[]>;

  /**
   * 특정 아이템의 모든 하위 아이템 조회 (재귀적)
   * @param parentId 부모 아이템 ID
   * @param maxLevel 최대 하위 레벨 (선택사항)
   * @returns 모든 하위 아이템들
   */
  findAllDescendants(parentId: BOMItemId, maxLevel?: number): Promise<BOMItem[]>;

  /**
   * 특정 아이템의 상위 경로 조회 (루트까지)
   * @param itemId 아이템 ID
   * @returns 루트부터 해당 아이템까지의 경로
   */
  findAncestorPath(itemId: BOMItemId): Promise<BOMItem[]>;

  /**
   * 하위 아이템 존재 여부 확인
   * @param id 아이템 ID
   * @returns 하위 아이템이 있으면 true
   */
  hasChildren(id: BOMItemId): Promise<boolean>;

  /**
   * 특정 BOM의 전체 트리 구조 조회 (최적화됨)
   * @param bomId BOM ID
   * @param options 트리 조회 옵션
   * @returns 트리 구조로 정렬된 아이템들
   */
  findTreeStructure(bomId: BOMId, options?: TreeQueryOptions): Promise<BOMItem[]>;

  // === 레벨 기반 조회 ===

  /**
   * 특정 레벨의 아이템들 조회
   * @param bomId BOM ID
   * @param level 레벨 (0부터 시작)
   * @returns 해당 레벨의 아이템들
   */
  findByLevel(bomId: BOMId, level: number): Promise<BOMItem[]>;

  /**
   * 레벨 범위로 아이템들 조회
   * @param bomId BOM ID
   * @param minLevel 최소 레벨
   * @param maxLevel 최대 레벨
   * @returns 해당 레벨 범위의 아이템들
   */
  findByLevelRange(bomId: BOMId, minLevel: number, maxLevel: number): Promise<BOMItem[]>;

  /**
   * 특정 BOM의 최대 레벨 조회
   * @param bomId BOM ID
   * @returns 최대 레벨 수
   */
  getMaxLevel(bomId: BOMId): Promise<number>;

  /**
   * 레벨별 아이템 개수 통계
   * @param bomId BOM ID
   * @returns 레벨별 아이템 개수 맵
   */
  getItemCountByLevel(bomId: BOMId): Promise<Map<number, number>>;

  // === 구성품 기반 조회 ===

  /**
   * 특정 구성품을 사용하는 모든 BOM Item 조회
   * @param componentId 구성품 제품 ID
   * @returns 해당 구성품을 사용하는 BOM Item들
   */
  findByComponentId(componentId: ProductId): Promise<BOMItem[]>;

  /**
   * 여러 구성품을 사용하는 BOM Item 조회
   * @param componentIds 구성품 제품 ID 배열
   * @returns 해당 구성품들을 사용하는 BOM Item들
   */
  findByComponentIds(componentIds: ProductId[]): Promise<BOMItem[]>;

  /**
   * 특정 구성품이 사용된 BOM 목록 조회
   * @param componentId 구성품 제품 ID
   * @returns 해당 구성품이 포함된 BOM ID들
   */
  findBOMIdsByComponent(componentId: ProductId): Promise<BOMId[]>;

  // === 검색 및 필터링 ===

  /**
   * 검색 조건에 따른 BOM Item 조회
   * @param criteria 검색 조건
   * @returns 조건에 맞는 BOM Item들
   */
  findByCriteria(criteria: BOMItemSearchCriteria): Promise<BOMItem[]>;

  /**
   * 구성품 유형별 아이템 조회
   * @param bomId BOM ID
   * @param componentTypes 구성품 유형 배열
   * @returns 해당 유형의 아이템들
   */
  findByComponentTypes(bomId: BOMId, componentTypes: ComponentType[]): Promise<BOMItem[]>;

  /**
   * 공정별 아이템 조회
   * @param bomId BOM ID
   * @param processStep 공정명
   * @returns 해당 공정에 투입되는 아이템들
   */
  findByProcessStep(bomId: BOMId, processStep: string): Promise<BOMItem[]>;

  /**
   * 비용 범위로 아이템 조회
   * @param bomId BOM ID
   * @param minCost 최소 총 비용
   * @param maxCost 최대 총 비용
   * @returns 해당 비용 범위의 아이템들
   */
  findByCostRange(bomId: BOMId, minCost: number, maxCost: number): Promise<BOMItem[]>;

  // === 순서 관리 ===

  /**
   * 동일 부모 하에서 다음 순서 번호 조회
   * @param bomId BOM ID
   * @param parentId 부모 아이템 ID (undefined면 최상위)
   * @param level 레벨
   * @returns 다음 순서 번호
   */
  getNextSequence(bomId: BOMId, parentId: BOMItemId | undefined, level: number): Promise<number>;

  /**
   * 아이템 순서 변경
   * @param itemId 아이템 ID
   * @param newSequence 새로운 순서
   */
  updateSequence(itemId: BOMItemId, newSequence: number): Promise<void>;

  /**
   * 형제 아이템들의 순서 재정렬
   * @param bomId BOM ID
   * @param parentId 부모 아이템 ID
   * @param itemSequences 아이템 ID와 순서 매핑
   */
  reorderSiblings(bomId: BOMId, parentId: BOMItemId | undefined, itemSequences: Map<string, number>): Promise<void>;

  // === 통계 및 분석 ===

  /**
   * 구성품별 사용 빈도 통계
   * @returns 구성품 ID별 사용 횟수 맵
   */
  getComponentUsageStatistics(): Promise<Map<string, number>>;

  /**
   * 가장 비싼 구성품들 조회
   * @param limit 조회 제한 수
   * @returns 총 비용 기준 상위 아이템들
   */
  findMostExpensiveItems(limit: number): Promise<BOMItem[]>;

  /**
   * 선택사항 아이템들 조회
   * @param bomId BOM ID
   * @returns 선택사항으로 표시된 아이템들
   */
  findOptionalItems(bomId: BOMId): Promise<BOMItem[]>;

  // === 유틸리티 ===

  /**
   * BOM Item 존재 여부 확인
   * @param id BOM Item ID
   * @returns 존재하면 true
   */
  exists(id: BOMItemId): Promise<boolean>;

  /**
   * 특정 BOM에서 구성품 중복 확인
   * @param bomId BOM ID
   * @param componentId 구성품 ID
   * @param parentId 부모 아이템 ID
   * @returns 중복이면 true
   */
  isDuplicate(bomId: BOMId, componentId: ProductId, parentId: BOMItemId | undefined): Promise<boolean>;
}