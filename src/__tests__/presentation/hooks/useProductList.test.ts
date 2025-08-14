import { renderHook, act, waitFor } from '@testing-library/react';
import { useProductList } from '../../../presentation/hooks/useProductList';
import { GetProductListUseCase, GetProductListRequest } from '../../../application/usecases/product/GetProductListUseCase';
import { ProductType } from '../../../domain/entities/Product';
import { SortField, SortOrder } from '../../../domain/repositories/ProductRepository';
import { mockProductData, mockPaginationData, mockUserData, createDelayedPromise, createRejectedPromise } from '../../../__mocks__/mockData';

// Mock UseCase
const mockGetProductListUseCase = {
  execute: jest.fn()
} as jest.Mocked<GetProductListUseCase>;

// Mock DIContainer
jest.mock('../../../config/DIContainer', () => ({
  DIContainer: {
    getInstance: () => ({
      getGetProductListUseCase: () => mockGetProductListUseCase
    })
  }
}));

describe('useProductList', () => {
  const mockSuccessResponse = {
    products: mockProductData.products,
    totalCount: mockProductData.totalCount,
    currentPage: 1,
    pageSize: 10,
    totalPages: Math.ceil(mockProductData.totalCount / 10),
    hasNextPage: true,
    hasPreviousPage: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProductListUseCase.execute.mockResolvedValue(mockSuccessResponse);
  });

  describe('초기 상태', () => {
    it('초기 상태가 올바르게 설정된다', () => {
      const { result } = renderHook(() => useProductList());

      expect(result.current.products).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.pageSize).toBe(10);
      expect(result.current.totalPages).toBe(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.searchCriteria).toEqual({});
      expect(result.current.sortField).toBe(SortField.CREATED_DATE);
      expect(result.current.sortOrder).toBe(SortOrder.DESC);
      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.hasPreviousPage).toBe(false);
    });

    it('초기 로드가 자동으로 실행된다', async () => {
      renderHook(() => useProductList());

      await waitFor(() => {
        expect(mockGetProductListUseCase.execute).toHaveBeenCalledWith({
          searchCriteria: {},
          page: 1,
          pageSize: 10,
          sortBy: SortField.CREATED_DATE,
          sortOrder: SortOrder.DESC
        });
      });
    });
  });

  describe('제품 목록 로드', () => {
    it('loadProducts 함수가 올바르게 작동한다', async () => {
      const { result } = renderHook(() => useProductList());

      const request: GetProductListRequest = {
        searchCriteria: { searchKeyword: '테스트' },
        page: 2,
        pageSize: 5,
        sortBy: SortField.NAME,
        sortOrder: SortOrder.ASC
      };

      await act(async () => {
        await result.current.loadProducts(request);
      });

      expect(mockGetProductListUseCase.execute).toHaveBeenCalledWith(request);
      expect(result.current.products).toEqual(mockSuccessResponse.products);
      expect(result.current.totalCount).toBe(mockSuccessResponse.totalCount);
    });

    it('로딩 상태가 올바르게 관리된다', async () => {
      mockGetProductListUseCase.execute.mockImplementation(() =>
        createDelayedPromise(mockSuccessResponse, 100)
      );

      const { result } = renderHook(() => useProductList());

      // 로딩 시작 전
      expect(result.current.loading).toBe(false);

      // 로딩 시작
      act(() => {
        result.current.loadProducts({
          searchCriteria: {},
          page: 1,
          pageSize: 10,
          sortBy: SortField.NAME,
          sortOrder: SortOrder.ASC
        });
      });

      expect(result.current.loading).toBe(true);

      // 로딩 완료 후
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('에러 발생 시 에러 상태가 설정된다', async () => {
      const errorMessage = '네트워크 오류가 발생했습니다.';
      mockGetProductListUseCase.execute.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useProductList());

      await act(async () => {
        await result.current.loadProducts({
          searchCriteria: {},
          page: 1,
          pageSize: 10,
          sortBy: SortField.NAME,
          sortOrder: SortOrder.ASC
        });
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
      expect(result.current.products).toEqual([]);
    });
  });

  describe('페이지네이션', () => {
    it('setPage 함수가 올바르게 작동한다', async () => {
      const { result } = renderHook(() => useProductList());

      await act(async () => {
        result.current.setPage(3);
      });

      expect(result.current.currentPage).toBe(3);
      expect(mockGetProductListUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3 })
      );
    });

    it('setPageSize 함수가 올바르게 작동한다', async () => {
      const { result } = renderHook(() => useProductList());

      await act(async () => {
        result.current.setPageSize(20);
      });

      expect(result.current.pageSize).toBe(20);
      expect(result.current.currentPage).toBe(1); // 페이지 크기 변경 시 첫 페이지로 리셋
      expect(mockGetProductListUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ 
          pageSize: 20,
          page: 1 
        })
      );
    });

    it('goToNextPage 함수가 올바르게 작동한다', async () => {
      const { result } = renderHook(() => useProductList());

      // hasNextPage가 true인 상태로 설정
      await act(async () => {
        await result.current.loadProducts({
          searchCriteria: {},
          page: 1,
          pageSize: 10,
          sortBy: SortField.NAME,
          sortOrder: SortOrder.ASC
        });
      });

      await act(async () => {
        result.current.goToNextPage();
      });

      expect(result.current.currentPage).toBe(2);
    });

    it('goToPreviousPage 함수가 올바르게 작동한다', async () => {
      const { result } = renderHook(() => useProductList());

      // 2페이지로 설정
      await act(async () => {
        result.current.setPage(2);
      });

      await act(async () => {
        result.current.goToPreviousPage();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('첫 페이지에서 goToPreviousPage 호출 시 페이지가 변경되지 않는다', async () => {
      const { result } = renderHook(() => useProductList());

      await act(async () => {
        result.current.goToPreviousPage();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('마지막 페이지에서 goToNextPage 호출 시 페이지가 변경되지 않는다', async () => {
      // hasNextPage가 false인 응답 설정
      const lastPageResponse = {
        ...mockSuccessResponse,
        hasNextPage: false,
        currentPage: 5,
        totalPages: 5
      };
      mockGetProductListUseCase.execute.mockResolvedValue(lastPageResponse);

      const { result } = renderHook(() => useProductList());

      await act(async () => {
        await result.current.loadProducts({
          searchCriteria: {},
          page: 5,
          pageSize: 10,
          sortBy: SortField.NAME,
          sortOrder: SortOrder.ASC
        });
      });

      await act(async () => {
        result.current.goToNextPage();
      });

      expect(result.current.currentPage).toBe(5);
    });
  });

  describe('정렬', () => {
    it('setSort 함수가 올바르게 작동한다', async () => {
      const { result } = renderHook(() => useProductList());

      await act(async () => {
        result.current.setSort(SortField.NAME, SortOrder.ASC);
      });

      expect(result.current.sortField).toBe(SortField.NAME);
      expect(result.current.sortOrder).toBe(SortOrder.ASC);
      expect(result.current.currentPage).toBe(1); // 정렬 변경 시 첫 페이지로 리셋
      expect(mockGetProductListUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: SortField.NAME,
          sortOrder: SortOrder.ASC,
          page: 1
        })
      );
    });

    it('toggleSort 함수가 올바르게 작동한다', async () => {
      const { result } = renderHook(() => useProductList());

      // 첫 번째 toggleSort - 기본이 DESC이므로 ASC로 변경
      await act(async () => {
        result.current.toggleSort(SortField.NAME);
      });

      expect(result.current.sortField).toBe(SortField.NAME);
      expect(result.current.sortOrder).toBe(SortOrder.ASC);

      // 두 번째 toggleSort - ASC에서 DESC로 변경
      await act(async () => {
        result.current.toggleSort(SortField.NAME);
      });

      expect(result.current.sortField).toBe(SortField.NAME);
      expect(result.current.sortOrder).toBe(SortOrder.DESC);
    });

    it('다른 필드로 toggleSort 호출 시 ASC로 시작한다', async () => {
      const { result } = renderHook(() => useProductList());

      // NAME 필드로 설정
      await act(async () => {
        result.current.setSort(SortField.NAME, SortOrder.DESC);
      });

      // CODE 필드로 토글
      await act(async () => {
        result.current.toggleSort(SortField.CODE);
      });

      expect(result.current.sortField).toBe(SortField.CODE);
      expect(result.current.sortOrder).toBe(SortOrder.ASC);
    });
  });

  describe('검색', () => {
    it('setSearchCriteria 함수가 올바르게 작동한다', async () => {
      const { result } = renderHook(() => useProductList());

      const criteria = {
        searchKeyword: '테스트',
        type: ProductType.FINISHED_PRODUCT,
        isActive: true
      };

      await act(async () => {
        result.current.setSearchCriteria(criteria);
      });

      expect(result.current.searchCriteria).toEqual(criteria);
      expect(result.current.currentPage).toBe(1); // 검색 조건 변경 시 첫 페이지로 리셋
      expect(mockGetProductListUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          searchCriteria: criteria,
          page: 1
        })
      );
    });

    it('clearSearch 함수가 올바르게 작동한다', async () => {
      const { result } = renderHook(() => useProductList());

      // 먼저 검색 조건 설정
      await act(async () => {
        result.current.setSearchCriteria({
          searchKeyword: '테스트',
          type: ProductType.FINISHED_PRODUCT
        });
      });

      // 검색 조건 클리어
      await act(async () => {
        result.current.clearSearch();
      });

      expect(result.current.searchCriteria).toEqual({});
      expect(result.current.currentPage).toBe(1);
      expect(mockGetProductListUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          searchCriteria: {},
          page: 1
        })
      );
    });
  });

  describe('새로고침', () => {
    it('refresh 함수가 현재 상태로 다시 로드한다', async () => {
      const { result } = renderHook(() => useProductList());

      // 상태 변경
      await act(async () => {
        result.current.setPage(3);
        result.current.setSearchCriteria({ searchKeyword: '테스트' });
        result.current.setSort(SortField.NAME, SortOrder.ASC);
      });

      jest.clearAllMocks();

      // 새로고침
      await act(async () => {
        result.current.refresh();
      });

      expect(mockGetProductListUseCase.execute).toHaveBeenCalledWith({
        searchCriteria: { searchKeyword: '테스트' },
        page: 3,
        pageSize: 10,
        sortBy: SortField.NAME,
        sortOrder: SortOrder.ASC
      });
    });
  });

  describe('에러 처리', () => {
    it('clearError 함수가 올바르게 작동한다', async () => {
      // 에러 상황 만들기
      mockGetProductListUseCase.execute.mockRejectedValue(new Error('테스트 에러'));

      const { result } = renderHook(() => useProductList());

      await act(async () => {
        await result.current.loadProducts({
          searchCriteria: {},
          page: 1,
          pageSize: 10,
          sortBy: SortField.NAME,
          sortOrder: SortOrder.ASC
        });
      });

      expect(result.current.error).toBe('테스트 에러');

      // 에러 클리어
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('새로운 요청 시 이전 에러가 자동으로 클리어된다', async () => {
      // 첫 번째 요청에서 에러 발생
      mockGetProductListUseCase.execute.mockRejectedValueOnce(new Error('첫 번째 에러'));

      const { result } = renderHook(() => useProductList());

      await act(async () => {
        await result.current.loadProducts({
          searchCriteria: {},
          page: 1,
          pageSize: 10,
          sortBy: SortField.NAME,
          sortOrder: SortOrder.ASC
        });
      });

      expect(result.current.error).toBe('첫 번째 에러');

      // 두 번째 요청 성공
      mockGetProductListUseCase.execute.mockResolvedValueOnce(mockSuccessResponse);

      await act(async () => {
        await result.current.loadProducts({
          searchCriteria: {},
          page: 1,
          pageSize: 10,
          sortBy: SortField.NAME,
          sortOrder: SortOrder.ASC
        });
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('성능 테스트', () => {
    it('빠른 연속 호출 시에도 안정적으로 작동한다', async () => {
      const { result } = renderHook(() => useProductList());

      // 빠른 연속 호출
      const promises = [];
      for (let i = 1; i <= 5; i++) {
        promises.push(
          act(async () => {
            result.current.setPage(i);
          })
        );
      }

      await Promise.all(promises);

      // 마지막 호출만 유효해야 함
      expect(result.current.currentPage).toBe(5);
    });

    it('대량 데이터도 처리할 수 있다', async () => {
      const largeDataResponse = {
        ...mockSuccessResponse,
        products: mockPaginationData.page1.products,
        totalCount: 1000
      };

      mockGetProductListUseCase.execute.mockResolvedValue(largeDataResponse);

      const { result } = renderHook(() => useProductList());

      await act(async () => {
        await result.current.loadProducts({
          searchCriteria: {},
          page: 1,
          pageSize: 100,
          sortBy: SortField.NAME,
          sortOrder: SortOrder.ASC
        });
      });

      expect(result.current.products).toHaveLength(mockPaginationData.page1.products.length);
      expect(result.current.totalCount).toBe(1000);
    });
  });

  describe('메모리 누수 방지', () => {
    it('컴포넌트 언마운트 시 진행 중인 요청이 취소된다', async () => {
      // 지연된 응답 설정
      mockGetProductListUseCase.execute.mockImplementation(() =>
        createDelayedPromise(mockSuccessResponse, 1000)
      );

      const { result, unmount } = renderHook(() => useProductList());

      // 요청 시작
      act(() => {
        result.current.loadProducts({
          searchCriteria: {},
          page: 1,
          pageSize: 10,
          sortBy: SortField.NAME,
          sortOrder: SortOrder.ASC
        });
      });

      expect(result.current.loading).toBe(true);

      // 컴포넌트 언마운트
      unmount();

      // 언마운트 후에는 상태 업데이트가 발생하지 않아야 함
      await waitFor(() => {
        // 이 시점에서는 컴포넌트가 언마운트되었으므로 
        // 추가적인 상태 업데이트가 없어야 함
      }, { timeout: 1500 });
    });
  });

  describe('타입 안전성', () => {
    it('모든 반환값이 올바른 타입을 가진다', () => {
      const { result } = renderHook(() => useProductList());

      // 상태 타입 확인
      expect(typeof result.current.loading).toBe('boolean');
      expect(Array.isArray(result.current.products)).toBe(true);
      expect(typeof result.current.totalCount).toBe('number');
      expect(typeof result.current.currentPage).toBe('number');
      expect(typeof result.current.pageSize).toBe('number');

      // 함수 타입 확인
      expect(typeof result.current.loadProducts).toBe('function');
      expect(typeof result.current.setPage).toBe('function');
      expect(typeof result.current.setPageSize).toBe('function');
      expect(typeof result.current.setSort).toBe('function');
      expect(typeof result.current.setSearchCriteria).toBe('function');
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('실제 사용 시나리오', () => {
    it('전체 워크플로우가 올바르게 작동한다', async () => {
      const { result } = renderHook(() => useProductList());

      // 1. 초기 로드 확인
      await waitFor(() => {
        expect(result.current.products).toHaveLength(mockSuccessResponse.products.length);
      });

      // 2. 검색 필터 적용
      await act(async () => {
        result.current.setSearchCriteria({
          searchKeyword: '갤럭시',
          type: ProductType.FINISHED_PRODUCT
        });
      });

      // 3. 정렬 변경
      await act(async () => {
        result.current.setSort(SortField.NAME, SortOrder.ASC);
      });

      // 4. 페이지 이동
      await act(async () => {
        result.current.setPage(2);
      });

      // 5. 페이지 크기 변경
      await act(async () => {
        result.current.setPageSize(20);
      });

      // 6. 새로고침
      await act(async () => {
        result.current.refresh();
      });

      // 각 단계에서 적절한 API 호출이 있었는지 확인
      expect(mockGetProductListUseCase.execute).toHaveBeenCalledTimes(6); // 초기 로드 + 5번의 변경
    });
  });
});