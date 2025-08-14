import { useState, useEffect, useCallback } from 'react';
import { GetProductListRequest, GetProductListResponse, ProductListItem } from '../../application/usecases/product/GetProductListUseCase';
import { ProductFilter } from '../../domain/repositories/ProductRepository';
import { DIContainer } from '../../config/DIContainer';

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
  loadProducts: (request: GetProductListRequest) => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearchKeyword: (keyword: string) => void;
  setFilters: (filters: ProductFilter[]) => void;
  setSortBy: (sortBy: string, direction: 'asc' | 'desc') => void;
  refresh: () => Promise<void>;
}

export const useProductList = (): UseProductListState & UseProductListActions => {
  const [state, setState] = useState<UseProductListState>({
    products: [],
    totalCount: 0,
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
    loading: false,
    error: null,
  });

  const [request, setRequest] = useState<GetProductListRequest>({
    page: 1,
    pageSize: 10,
    sortBy: 'cd_material',
    sortDirection: 'asc',
  });

  const getProductListUseCase = DIContainer.getInstance().getProductListUseCase();

  const loadProducts = useCallback(async (newRequest: GetProductListRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response: GetProductListResponse = await getProductListUseCase.execute(newRequest);
      
      setState(prev => ({
        ...prev,
        products: response.products,
        totalCount: response.totalCount,
        currentPage: response.currentPage,
        totalPages: response.totalPages,
        hasNextPage: response.hasNextPage,
        loading: false,
      }));

      setRequest(newRequest);
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, [getProductListUseCase]);

  const setPage = useCallback((page: number) => {
    const newRequest = { ...request, page };
    loadProducts(newRequest);
  }, [request, loadProducts]);

  const setPageSize = useCallback((pageSize: number) => {
    const newRequest = { ...request, pageSize, page: 1 };
    loadProducts(newRequest);
  }, [request, loadProducts]);

  const setSearchKeyword = useCallback((searchKeyword: string) => {
    const newRequest = { ...request, searchKeyword: searchKeyword || undefined, page: 1 };
    loadProducts(newRequest);
  }, [request, loadProducts]);

  const setFilters = useCallback((filters: ProductFilter[]) => {
    const newRequest = { ...request, filters, page: 1 };
    loadProducts(newRequest);
  }, [request, loadProducts]);

  const setSortBy = useCallback((sortBy: string, sortDirection: 'asc' | 'desc') => {
    const newRequest = { ...request, sortBy, sortDirection };
    loadProducts(newRequest);
  }, [request, loadProducts]);

  const refresh = useCallback(() => {
    return loadProducts(request);
  }, [request, loadProducts]);

  useEffect(() => {
    loadProducts(request);
  }, [loadProducts, request]);

  return {
    ...state,
    loadProducts,
    setPage,
    setPageSize,
    setSearchKeyword,
    setFilters,
    setSortBy,
    refresh,
  };
};