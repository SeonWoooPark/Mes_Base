/**
 * 테이블 데이터 관리 훅
 * 
 * 모든 테이블 관련 상태와 로직을 관리합니다.
 * 기존 useProductList 훅을 단순화하고 일반화한 버전입니다.
 */

import { useState, useEffect, useCallback } from 'react';
import { TableConfig } from './types';
import { SearchRequest, FilterCondition, UseTableState, UseTableActions } from '../../../shared/types/common';

export function useTableData<T extends { id: string }>(
  config: TableConfig<T>
): UseTableState<T> & UseTableActions<T> {
  
  // === 상태 관리 ===
  const [state, setState] = useState<UseTableState<T>>({
    data: [],
    totalCount: 0,
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
    selectedItems: [],
    loading: false,
    error: null,
  });

  const [searchParams, setSearchParams] = useState<SearchRequest>({
    page: 1,
    pageSize: 10,
    sortBy: config.defaultSort?.field || 'id',
    sortDirection: config.defaultSort?.direction || 'desc',
    keyword: '',
    filters: [],
  });

  // === 데이터 로드 함수 ===
  const loadData = useCallback(async (params?: SearchRequest) => {
    const requestParams = params || searchParams;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await config.api.list(requestParams);
      
      setState(prev => ({
        ...prev,
        data: response.items,
        totalCount: response.totalCount,
        currentPage: response.currentPage,
        totalPages: response.totalPages,
        hasNextPage: response.hasNextPage,
        loading: false,
      }));

      if (params) {
        setSearchParams(requestParams);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '데이터 조회 중 오류가 발생했습니다.';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [config.api, searchParams]);

  // === 페이지 변경 ===
  const setPage = useCallback((page: number) => {
    const newParams = { ...searchParams, page };
    loadData(newParams);
  }, [searchParams, loadData]);

  // === 페이지 크기 변경 ===
  const setPageSize = useCallback((pageSize: number) => {
    const newParams = { ...searchParams, pageSize, page: 1 };
    loadData(newParams);
  }, [searchParams, loadData]);

  // === 검색어 설정 ===
  const setSearch = useCallback((keyword: string) => {
    const newParams = { ...searchParams, keyword: keyword || undefined, page: 1 };
    loadData(newParams);
  }, [searchParams, loadData]);

  // === 필터 설정 ===
  const setFilters = useCallback((filters: FilterCondition[]) => {
    const newParams = { ...searchParams, filters, page: 1 };
    loadData(newParams);
  }, [searchParams, loadData]);

  // === 정렬 설정 ===
  const setSorting = useCallback((sortBy: string, sortDirection: 'asc' | 'desc') => {
    const newParams = { ...searchParams, sortBy, sortDirection };
    loadData(newParams);
  }, [searchParams, loadData]);

  // === 아이템 선택 ===
  const selectItem = useCallback((item: T) => {
    setState(prev => {
      const isSelected = prev.selectedItems.some(selected => selected.id === item.id);
      const newSelectedItems = isSelected
        ? prev.selectedItems.filter(selected => selected.id !== item.id)
        : [...prev.selectedItems, item];
      
      return { ...prev, selectedItems: newSelectedItems };
    });
  }, []);

  // === 전체 선택 ===
  const selectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.length === prev.data.length ? [] : [...prev.data]
    }));
  }, []);

  // === 선택 해제 ===
  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedItems: [] }));
  }, []);

  // === 새로고침 ===
  const refresh = useCallback(() => {
    return loadData();
  }, [loadData]);

  // === 초기 데이터 로드 ===
  useEffect(() => {
    loadData();
  }, []); // 의존성 배열을 비워서 처음 한 번만 실행

  return {
    // 상태
    ...state,
    
    // 액션
    loadData,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    setSorting,
    selectItem,
    selectAll,
    clearSelection,
    refresh,
  };
}