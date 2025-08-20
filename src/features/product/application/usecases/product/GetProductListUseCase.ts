/**
 * 제품 목록 조회 유스케이스
 * 
 * 워크플로우:
 * 1. 요청 데이터 검증 (페이지, 페이지 크기)
 * 2. 검색 조건 구성 (키워드, 필터, 정렬)
 * 3. ProductRepository를 통한 데이터 조회
 * 4. 도메인 엔티티를 View용 DTO로 변환
 * 5. 페이지네이션 정보 계산
 * 6. 응답 데이터 구성
 * 
 * 데이터 흐름:
 * UI Request → UseCase → ProductRepository → Domain Entity → ProductListItem DTO → UI
 * 
 * 의존성 주입:
 * @injectable - 이 클래스가 DI 컨테이너에 의해 관리됨을 표시
 * @inject - 생성자 매개변수에 주입될 토큰을 명시
 */

import { injectable } from 'tsyringe';
import type { ProductRepository, ProductFilter, ProductSearchCriteria } from '../../../domain/repositories/ProductRepository';

/**
 * 제품 목록 조회 요청 인터페이스
 */
export interface GetProductListRequest {
  page: number;                           // 페이지 번호 (1부터 시작)
  pageSize: number;                       // 페이지당 항목 수
  sortBy?: string;                        // 정렬 필드 (기본: cd_material)
  sortDirection?: 'asc' | 'desc';         // 정렬 방향 (기본: asc)
  searchKeyword?: string;                 // 검색 키워드
  filters?: ProductFilter[];              // 추가 필터 조건들
}

/**
 * 제품 목록 아이템 DTO (Data Transfer Object)
 * 도메인 엔티티를 UI 표시용으로 변환한 형태
 */
export interface ProductListItem {
  id: string;                    // 제품 ID
  cd_material: string;           // 제품코드
  nm_material: string;           // 제품명
  type: string;                  // 제품 유형 코드
  typeName: string;              // 제품 유형 표시명
  category: string;              // 카테고리 코드
  categoryName: string;          // 카테고리 표시명
  unit: string;                  // 단위 코드
  unitName: string;              // 단위 표시명
  safetyStock: number;           // 안전재고
  isActive: boolean;             // 활성화 상태
  statusDisplay: string;         // 상태 표시명
  lastUpdated: Date;             // 최종 수정일시
}

/**
 * 제품 목록 조회 응답 인터페이스
 * 페이지네이션 정보 포함
 */
export interface GetProductListResponse {
  products: ProductListItem[];   // 제품 목록
  totalCount: number;            // 전체 항목 수
  currentPage: number;           // 현재 페이지
  totalPages: number;            // 전체 페이지 수
  hasNextPage: boolean;          // 다음 페이지 존재 여부
}

/**
 * 제품 목록 조회 유스케이스 클래스
 * Clean Architecture의 Application Layer에 위치
 * 
 * @injectable - tsyringe DI 컨테이너가 이 클래스의 인스턴스를 관리
 */
@injectable()
export class GetProductListUseCase {
  constructor(
    private productRepository: ProductRepository,    // 데이터 조회를 위한 저장소 인터페이스
    private productPresenter: ProductPresenter       // 도메인 데이터의 표시용 변환 담당
  ) {}

  /**
   * 제품 목록 조회 실행
   * @param request 조회 요청 정보
   * @returns 페이지네이션된 제품 목록
   */
  async execute(request: GetProductListRequest): Promise<GetProductListResponse> {
    // 1. 요청 데이터 유효성 검증
    this.validateRequest(request);

    // 2. 검색 조건 구성
    const searchCriteria = this.buildSearchCriteria(request);

    // 3. 저장소에서 제품 데이터 조회 (페이지네이션)
    const products = await this.productRepository.findByPageWithCriteria(
      searchCriteria,
      request.page,
      request.pageSize
    );

    // 4. 전체 개수 조회 (페이지네이션 계산용)
    const totalCount = await this.productRepository.countByCriteria(searchCriteria);

    // 5. 도메인 엔티티를 UI용 DTO로 변환
    const productListItems = products.map(product => ({
      id: product.getId().getValue(),
      cd_material: product.getCdMaterial(),
      nm_material: product.getNmMaterial(),
      type: product.getType(),
      typeName: this.productPresenter.getTypeDisplayName(product.getType()), // Presenter를 통한 표시명 변환
      category: product.getCategory().code,
      categoryName: product.getCategory().name,
      unit: product.getUnit().code,
      unitName: product.getUnit().name,
      safetyStock: product.getSafetyStock(),
      isActive: product.getIsActive(),
      statusDisplay: product.getIsActive() ? '사용' : '미사용',
      lastUpdated: product.getDtUpdate()
    }));

    // 6. 페이지네이션 정보 계산
    const totalPages = Math.ceil(totalCount / request.pageSize);
    const hasNextPage = request.page < totalPages;

    // 7. 응답 데이터 구성
    return {
      products: productListItems,
      totalCount,
      currentPage: request.page,
      totalPages,
      hasNextPage
    };
  }

  /**
   * 요청 데이터 유효성 검증
   * @param request 검증할 요청 데이터
   */
  private validateRequest(request: GetProductListRequest): void {
    if (request.page < 1) {
      throw new Error('페이지 번호는 1 이상이어야 합니다.');
    }
    if (request.pageSize < 1 || request.pageSize > 1000) {
      throw new Error('페이지 크기는 1-1000 범위여야 합니다.');
    }
  }

  /**
   * 검색 조건 구성
   * @param request 요청 정보
   * @returns 저장소에서 사용할 검색 조건
   */
  private buildSearchCriteria(request: GetProductListRequest): ProductSearchCriteria {
    return {
      searchKeyword: request.searchKeyword,
      filters: request.filters || [],
      sortBy: request.sortBy || 'cd_material',        // 기본 정렬: 제품코드
      sortDirection: request.sortDirection || 'asc'    // 기본 방향: 오름차순
    };
  }
}

/**
 * 제품 표시 담당 인터페이스
 * 도메인 데이터를 사용자 친화적인 형태로 변환
 */
export interface ProductPresenter {
  getTypeDisplayName(type: string): string;  // 제품 유형 코드를 표시명으로 변환
}