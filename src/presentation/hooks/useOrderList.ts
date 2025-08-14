/**
 * useOrderList 커스텀 훅
 * 
 * Order 목록 관리를 위한 상태와 액션을 제공하는 훅
 * Clean Architecture 패턴을 따라 UseCase와 연동
 */

import { useState, useCallback, useEffect } from 'react';
import { GetOrderListRequest, GetOrderListResponse, OrderListItem } from '../../application/usecases/order/GetOrderListUseCase';
import { CreateOrderRequest } from '../../application/usecases/order/CreateOrderUseCase';
import { UpdateOrderStatusRequest } from '../../application/usecases/order/UpdateOrderStatusUseCase';
import { OrderType, OrderStatus, OrderPriority } from '../../domain/entities/Order';
import { DIContainer } from '../../config/DIContainer';

interface UseOrderListState {
  orders: OrderListItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  searchKeyword: string;
  selectedOrderType: OrderType | '';
  selectedStatus: OrderStatus | '';
  selectedPriority: OrderPriority | '';
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const initialState: UseOrderListState = {
  orders: [],
  totalCount: 0,
  currentPage: 1,
  pageSize: 20,
  loading: false,
  error: null,
  searchKeyword: '',
  selectedOrderType: '',
  selectedStatus: '',
  selectedPriority: '',
  sortBy: 'orderDate',
  sortDirection: 'desc'
};

export const useOrderList = () => {
  const [state, setState] = useState<UseOrderListState>(initialState);
  
  // UseCase 인스턴스 획득
  const getOrderListUseCase = DIContainer.getInstance().getOrderListUseCase();
  const createOrderUseCase = DIContainer.getInstance().getCreateOrderUseCase();
  const updateOrderStatusUseCase = DIContainer.getInstance().getUpdateOrderStatusUseCase();

  // 수주 목록 조회
  const loadOrders = useCallback(async (request?: Partial<GetOrderListRequest>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const searchRequest: GetOrderListRequest = {
        page: request?.page || state.currentPage,
        pageSize: request?.pageSize || state.pageSize,
        searchKeyword: request?.searchKeyword || state.searchKeyword,
        filters: [],
        sortBy: request?.sortBy || state.sortBy,
        sortDirection: request?.sortDirection || state.sortDirection
      };

      // 필터 조건 추가
      if (state.selectedOrderType) {
        searchRequest.filters?.push({
          field: 'orderType',
          value: state.selectedOrderType
        });
      }
      
      if (state.selectedStatus) {
        searchRequest.filters?.push({
          field: 'status',
          value: state.selectedStatus
        });
      }
      
      if (state.selectedPriority) {
        searchRequest.filters?.push({
          field: 'priority',
          value: state.selectedPriority
        });
      }

      const response: GetOrderListResponse = await getOrderListUseCase.execute(searchRequest);
      
      setState(prev => ({
        ...prev,
        orders: response.orders,
        totalCount: response.totalCount,
        currentPage: response.currentPage,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '수주 목록 조회 중 오류가 발생했습니다.'
      }));
    }
  }, [getOrderListUseCase, state.currentPage, state.pageSize, state.searchKeyword, 
      state.selectedOrderType, state.selectedStatus, state.selectedPriority, 
      state.sortBy, state.sortDirection]);

  // 새 수주 생성
  const createOrder = useCallback(async (request: CreateOrderRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      await createOrderUseCase.execute(request);
      setState(prev => ({ ...prev, loading: false }));
      
      // 목록 새로고침
      await loadOrders();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '수주 생성 중 오류가 발생했습니다.';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  }, [createOrderUseCase, loadOrders]);

  // 수주 상태 변경
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const request: UpdateOrderStatusRequest = {
        orderId,
        newStatus,
        id_updated: 'current-user', // TODO: 실제 사용자 ID
        reason: `상태를 ${newStatus}로 변경`
      };
      
      await updateOrderStatusUseCase.execute(request);
      setState(prev => ({ ...prev, loading: false }));
      
      // 목록 새로고침
      await loadOrders();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '수주 상태 변경 중 오류가 발생했습니다.';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  }, [updateOrderStatusUseCase, loadOrders]);

  // 페이지 변경
  const setPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  }, []);

  // 페이지 크기 변경
  const setPageSize = useCallback((pageSize: number) => {
    setState(prev => ({ ...prev, pageSize, currentPage: 1 }));
  }, []);

  // 검색어 변경
  const setSearchKeyword = useCallback((keyword: string) => {
    setState(prev => ({ ...prev, searchKeyword: keyword, currentPage: 1 }));
  }, []);

  // 주문 유형 필터 변경
  const setOrderTypeFilter = useCallback((orderType: OrderType | '') => {
    setState(prev => ({ ...prev, selectedOrderType: orderType, currentPage: 1 }));
  }, []);

  // 상태 필터 변경
  const setStatusFilter = useCallback((status: OrderStatus | '') => {
    setState(prev => ({ ...prev, selectedStatus: status, currentPage: 1 }));
  }, []);

  // 우선순위 필터 변경
  const setPriorityFilter = useCallback((priority: OrderPriority | '') => {
    setState(prev => ({ ...prev, selectedPriority: priority, currentPage: 1 }));
  }, []);

  // 정렬 변경
  const setSorting = useCallback((sortBy: string, sortDirection: 'asc' | 'desc' = 'asc') => {
    setState(prev => ({ ...prev, sortBy, sortDirection, currentPage: 1 }));
  }, []);

  // 필터 초기화
  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchKeyword: '',
      selectedOrderType: '',
      selectedStatus: '',
      selectedPriority: '',
      currentPage: 1
    }));
  }, []);

  // 에러 초기화
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 새로고침
  const refresh = useCallback(() => {
    loadOrders();
  }, [loadOrders]);

  // 초기 데이터 로드
  useEffect(() => {
    loadOrders();
  }, [state.currentPage, state.pageSize, state.selectedOrderType, state.selectedStatus, 
      state.selectedPriority, state.sortBy, state.sortDirection]);

  return {
    // 상태
    ...state,
    
    // 액션
    loadOrders,
    createOrder,
    updateOrderStatus,
    setPage,
    setPageSize,
    setSearchKeyword,
    setOrderTypeFilter,
    setStatusFilter,
    setPriorityFilter,
    setSorting,
    clearFilters,
    clearError,
    refresh,
    
    // 편의 함수들
    hasNextPage: state.currentPage * state.pageSize < state.totalCount,
    hasPreviousPage: state.currentPage > 1,
    totalPages: Math.ceil(state.totalCount / state.pageSize),
    startIndex: (state.currentPage - 1) * state.pageSize + 1,
    endIndex: Math.min(state.currentPage * state.pageSize, state.totalCount)
  };
};