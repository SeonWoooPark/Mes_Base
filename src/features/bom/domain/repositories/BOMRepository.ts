// 외부 엔티티 import
import { BOM } from '../entities/BOM';
import { BOMId } from '../entities/BOMItem';
import { ProductId } from '@features/product/domain/entities/Product';

/**
 * BOM 검색 조건 인터페이스
 * 다양한 조건으로 BOM을 검색하기 위한 필터 기준
 */
export interface BOMSearchCriteria {
  searchKeyword?: string;              // 제품명, BOM 버전으로 검색
  filters?: BOMFilter[];               // 추가 필터 조건들
  sortBy?: string;                     // 정렬 기준 필드
  sortDirection?: 'asc' | 'desc';      // 정렬 방향
}

/**
 * BOM 필터 인터페이스
 * 구체적인 필터 조건을 정의
 */
export interface BOMFilter {
  field: string;                       // 필터 대상 필드
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between'; // 비교 연산자
  value: any;                          // 필터 값
}

/**
 * BOM 상태 기반 검색 조건
 */
export interface BOMStatusFilter {
  isActive?: boolean;                  // 활성화 상태 필터
  isCurrentlyActive?: boolean;         // 현재 유효한 BOM만 조회
  hasItems?: boolean;                  // 구성품이 있는 BOM만 조회
  minCost?: number;                    // 최소 총 비용
  maxCost?: number;                    // 최대 총 비용
}

/**
 * BOM Repository 인터페이스
 * 
 * 역할:
 * - BOM 데이터의 영속성 관리
 * - CRUD 연산 제공
 * - 복잡한 검색 및 필터링 지원
 * - 트리 구조 데이터 조회 최적화
 * 
 * Clean Architecture 원칙:
 * - Domain Layer의 인터페이스
 * - Infrastructure Layer에서 구현
 * - 외부 의존성 추상화
 */
export interface BOMRepository {
  // === 기본 CRUD 연산 ===
  
  /**
   * BOM ID로 단건 조회
   * @param id BOM 고유 ID
   * @returns BOM 엔티티 또는 null
   */
  findById(id: BOMId): Promise<BOM | null>;

  /**
   * 여러 BOM ID로 다건 조회
   * @param ids BOM ID 배열
   * @returns BOM 엔티티 배열
   */
  findByIds(ids: BOMId[]): Promise<BOM[]>;

  /**
   * BOM 저장 (생성 또는 수정)
   * @param bom 저장할 BOM 엔티티
   */
  save(bom: BOM): Promise<void>;

  /**
   * BOM 삭제 (논리적 삭제)
   * @param id 삭제할 BOM ID
   */
  delete(id: BOMId): Promise<void>;

  // === 제품 기반 조회 ===

  /**
   * 특정 제품의 모든 BOM 조회
   * @param productId 제품 ID
   * @returns 해당 제품의 BOM 목록 (버전별)
   */
  findByProductId(productId: ProductId): Promise<BOM[]>;

  /**
   * 제품 ID와 버전으로 BOM 조회
   * @param productId 제품 ID
   * @param version BOM 버전
   * @returns 해당 버전의 BOM 또는 null
   */
  findByProductIdAndVersion(productId: ProductId, version: string): Promise<BOM | null>;

  /**
   * 특정 제품의 현재 활성 BOM 조회
   * @param productId 제품 ID
   * @returns 현재 활성화된 BOM 또는 null
   */
  findActiveByProductId(productId: ProductId): Promise<BOM | null>;

  /**
   * 여러 제품의 활성 BOM 일괄 조회
   * @param productIds 제품 ID 배열
   * @returns 제품별 활성 BOM 맵
   */
  findActiveByProductIds(productIds: ProductId[]): Promise<Map<string, BOM>>;

  // === 검색 및 필터링 ===

  /**
   * 검색 조건에 따른 BOM 조회 (페이지네이션)
   * @param criteria 검색 조건
   * @param page 페이지 번호
   * @param pageSize 페이지 크기
   * @returns BOM 목록
   */
  findByPageWithCriteria(
    criteria: BOMSearchCriteria, 
    page: number, 
    pageSize: number
  ): Promise<BOM[]>;

  /**
   * 검색 조건에 해당하는 전체 개수 조회
   * @param criteria 검색 조건
   * @returns 총 개수
   */
  countByCriteria(criteria: BOMSearchCriteria): Promise<number>;

  /**
   * 상태 기반 BOM 검색
   * @param statusFilter 상태 필터
   * @returns 조건에 맞는 BOM 목록
   */
  findByStatus(statusFilter: BOMStatusFilter): Promise<BOM[]>;

  // === 버전 관리 ===

  /**
   * 버전 패턴으로 BOM 검색
   * @param pattern 버전 패턴 (예: "v1.*", "2024*")
   * @returns 패턴에 맞는 BOM 목록
   */
  findByVersionPattern(pattern: string): Promise<BOM[]>;

  /**
   * 특정 제품의 최신 버전 번호 조회
   * @param productId 제품 ID
   * @returns 최신 버전 문자열 또는 null
   */
  getLatestVersionByProductId(productId: ProductId): Promise<string | null>;

  /**
   * 특정 제품의 다음 버전 번호 생성
   * @param productId 제품 ID
   * @param baseVersion 기준 버전 (선택사항)
   * @returns 생성된 다음 버전 번호
   */
  generateNextVersion(productId: ProductId, baseVersion?: string): Promise<string>;

  // === 날짜 기반 조회 ===

  /**
   * 유효기간 내 활성 BOM 조회
   * @param startDate 시작일
   * @param endDate 종료일
   * @returns 해당 기간에 활성인 BOM 목록
   */
  findActiveBOMsWithinDateRange(startDate: Date, endDate: Date): Promise<BOM[]>;

  /**
   * 특정 날짜에 유효했던 BOM 조회
   * @param productId 제품 ID
   * @param targetDate 기준 날짜
   * @returns 해당 날짜에 유효한 BOM 또는 null
   */
  findBOMValidAtDate(productId: ProductId, targetDate: Date): Promise<BOM | null>;

  // === 통계 및 분석 ===

  /**
   * 제품별 BOM 개수 통계
   * @returns 제품 ID별 BOM 개수 맵
   */
  getBOMCountByProduct(): Promise<Map<string, number>>;

  /**
   * 총 비용 순으로 BOM 정렬 조회
   * @param limit 조회 제한 수
   * @param ascending 오름차순 여부 (기본: false)
   * @returns 비용 순 정렬된 BOM 목록
   */
  findBOMsOrderedByCost(limit?: number, ascending?: boolean): Promise<BOM[]>;

  /**
   * 복잡도가 높은 BOM 조회 (아이템 개수 기준)
   * @param minItemCount 최소 아이템 개수
   * @returns 복잡한 BOM 목록
   */
  findComplexBOMs(minItemCount: number): Promise<BOM[]>;

  // === 유틸리티 ===

  /**
   * BOM 존재 여부 확인
   * @param id BOM ID
   * @returns 존재하면 true
   */
  exists(id: BOMId): Promise<boolean>;

  /**
   * 특정 제품의 BOM 존재 여부 확인
   * @param productId 제품 ID
   * @returns 해당 제품의 BOM이 있으면 true
   */
  existsByProductId(productId: ProductId): Promise<boolean>;
}