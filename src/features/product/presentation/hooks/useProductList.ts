import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GetProductListRequest, GetProductListResponse, ProductListItem } from '../../application/usecases/product/GetProductListUseCase';
import { ProductFilter } from '../../domain/repositories/ProductRepository';
import { ProductDI } from '../../config/ProductDIModule';
import { useFeatureMutation, createFeatureQueryHooks } from '@shared/hooks/useFeatureQuery';
import { useAppStore, useAppStoreSelectors } from '@shared/stores/appStore';
import { createQueryKey } from '@app/providers/QueryProvider';

/**
 * Product Feature Query Hooks 생성
 */
const productQueryHooks = createFeatureQueryHooks('product');

/**
 * 현대화된 useProductList Hook
 * 
 * TanStack Query v5 + Zustand를 활용한 새로운 상태 관리:
 * - 서버 상태: TanStack Query로 캐싱 및 동기화
 * - UI 상태: Zustand로 모달, 필터 등 관리
 * - 자동 에러 처리 및 알림
 * - 백그라운드 동기화
 * - 낙관적 업데이트
 */
export const useProductList = () => {
  // Zustand 스토어에서 UI 상태 조회
  const productView = useAppStoreSelectors.useProductView();
  const productFilters = useAppStoreSelectors.useProductFilters();
  // Zustand 액션들을 개별 selector로 안정적으로 참조 (불필요한 재생성/리렌더 방지)
  const setViewAction = useAppStore(s => s.product.setView);
  const setSearchKeywordAction = useAppStore(s => s.product.setSearchKeyword);
  const setFiltersAction = useAppStore(s => s.product.setFilters);

  // UseCase 가져오기
  const getProductListUseCase = ProductDI.getProductListUseCase();

  // 현재 요청 구성 (useMemo로 최적화)
  const currentRequest: GetProductListRequest = useMemo(() => {
    // activeFilters 배열을 ProductFilter 객체로 변환
    const mappedFilters: ProductFilter[] = productFilters.activeFilters.map(filterString => {
      const [field, value] = filterString.split(':');
      
      // 문자열 값을 적절한 타입으로 변환
      let parsedValue: any = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(Number(value))) parsedValue = Number(value);
      
      return {
        field: field as 'type' | 'category' | 'unit' | 'isActive',
        value: parsedValue
      };
    });

    const request = {
      page: productView.currentPage,
      pageSize: productView.pageSize,
      sortBy: productView.sortBy,
      sortDirection: productView.sortDirection,
      searchKeyword: productFilters.searchKeyword || undefined,
      filters: mappedFilters,
    };
    
    // 디버깅: 검색 요청 추적
    console.log('🔍 Product Search Request:', {
      searchKeyword: request.searchKeyword,
      page: request.page,
      filters: request.filters,
      timestamp: new Date().toISOString()
    });
    
    return request;
  }, [
    productView.currentPage,
    productView.pageSize,
    productView.sortBy,
    productView.sortDirection,
    productFilters.searchKeyword,
    productFilters.activeFilters, // activeFilters 의존성 추가
  ]);

  // TanStack Query를 직접 사용하여 쿼리 키 강제 갱신
  const productListQuery = useQuery<GetProductListResponse>({
    // 검색어와 필터를 쿼리 키에 명시적으로 포함
    queryKey: [
      'product', 
      'list', 
      productFilters.searchKeyword || '', // 검색어 명시적 포함
      productView.currentPage,
      productView.pageSize,
      productView.sortBy,
      productView.sortDirection,
      productFilters.activeFilters, // 필터 배열 명시적 포함
    ],
    queryFn: async () => {
      console.log('🚀 Executing ProductList Query with params:', currentRequest);
      const result = await getProductListUseCase.execute(currentRequest);
      console.log('✅ ProductList Query Result:', {
        totalCount: result.totalCount,
        currentPage: result.currentPage,
        productsLength: result.products.length,
        searchKeyword: currentRequest.searchKeyword
      });
      return result;
    },
    staleTime: 1000 * 30, // 30초간 fresh 상태 유지
    gcTime: 1000 * 60 * 5,   // 5분간 캐시 유지
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // 편의 메서드들
  const setPage = useCallback((page: number) => {
    setViewAction({ currentPage: page });
  }, [setViewAction]);

  const setPageSize = useCallback((pageSize: number) => {
    setViewAction({ 
      pageSize, 
      currentPage: 1 // 페이지 크기 변경시 첫 페이지로
    });
  }, [setViewAction]);

  const setSearchKeyword = useCallback((keyword: string) => {
    setSearchKeywordAction(keyword);
    // 검색어 변경 시 첫 페이지로 이동 (중요!)
    setViewAction({ currentPage: 1 });
  }, [setSearchKeywordAction, setViewAction]);

  const setFilters = useCallback((filters: ProductFilter[]) => {
    // ProductFilter[]를 string[] 형태로 변환하여 저장 (호환성을 위해)
    const filterStrings = filters.map(f => `${f.field}:${String(f.value)}`);
    setFiltersAction(filterStrings);
    // 필터 변경 시 첫 페이지로 이동
    setViewAction({ currentPage: 1 });
  }, [setFiltersAction, setViewAction]);

  const setSortBy = useCallback((sortBy: string, direction: 'asc' | 'desc') => {
    setViewAction({ sortBy, sortDirection: direction });
  }, [setViewAction]);

  // 파생된 상태들 (useMemo로 최적화)
  const derivedState = useMemo(() => {
    const response = productListQuery.data;
    return {
      products: response?.products || [],
      totalCount: response?.totalCount || 0,
      currentPage: response?.currentPage || productView.currentPage,
      totalPages: response?.totalPages || 0,
      hasNextPage: response?.hasNextPage || false,
    };
  }, [productListQuery.data, productView.currentPage]);

  return useMemo(() => ({
    // 데이터
    ...derivedState,

    // 상태
    loading: productListQuery.isLoading,
    error: productListQuery.error?.message || null,
    isStale: productListQuery.isStale,
    isFetching: productListQuery.isFetching,

    // 액션
    setPage,
    setPageSize,
    setSearchKeyword,
    setFilters,
    setSortBy,
    refresh: productListQuery.refetch,
    
    // TanStack Query 원본 객체 (고급 사용을 위해)
    query: productListQuery,
  }), [
    derivedState,
    productListQuery.isLoading,
    productListQuery.error,
    productListQuery.isStale,
    productListQuery.isFetching,
    productListQuery.refetch,
    productListQuery,
    setPage,
    setPageSize,
    setSearchKeyword,
    setFilters,
    setSortBy,
  ]);
};

/**
 * 제품 생성을 위한 Mutation Hook
 */
export const useCreateProduct = () => {
  const createProductUseCase = ProductDI.createProductUseCase();

  return useFeatureMutation({
    feature: 'product',
    operation: 'create',
    mutationFn: (variables: any) => createProductUseCase.execute(variables),
    invalidateQueries: [createQueryKey.product.all()],
    onSuccess: () => {
      // 성공시 폼 모달 닫기
      useAppStore.getState().product.closeFormModal();
    },
  });
};

/**
 * 제품 수정을 위한 Mutation Hook
 */
export const useUpdateProduct = () => {
  const updateProductUseCase = ProductDI.updateProductUseCase();

  return useFeatureMutation({
    feature: 'product', 
    operation: 'update',
    mutationFn: (variables: any) => updateProductUseCase.execute(variables),
    invalidateQueries: [
      createQueryKey.product.all(),
      // 특정 제품 상세도 무효화 필요시
      // createQueryKey.product.detail(variables.id)
    ],
    onSuccess: () => {
      useAppStore.getState().product.closeFormModal();
    },
  });
};

/**
 * 제품 삭제를 위한 Mutation Hook
 */
export const useDeleteProduct = () => {
  const deleteProductUseCase = ProductDI.deleteProductUseCase();

  return useFeatureMutation({
    feature: 'product',
    operation: 'delete',
    mutationFn: (variables: { productId: string; id_updated: string; reason: string }) => 
      deleteProductUseCase.execute(variables),
    invalidateQueries: [createQueryKey.product.all()],
    optimisticUpdate: (variables) => {
      // 낙관적 업데이트: UI에서 즉시 항목 제거
      // TODO: 실제 구현 시 queryClient.setQueryData 활용
    },
  });
};

/**
 * 레거시 호환성을 위한 인터페이스 유지 (점진적 마이그레이션용)
 * @deprecated 새 컴포넌트에서는 useProductList() 직접 사용 권장
 */
export interface UseProductListState {
  products: ProductListItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  loading: boolean;
  error: string | null;
}

export interface UseProductListActions {
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearchKeyword: (keyword: string) => void;
  setFilters: (filters: ProductFilter[]) => void;
  setSortBy: (sortBy: string, direction: 'asc' | 'desc') => void;
  refresh: () => void;
}