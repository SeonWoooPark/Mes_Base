/**
 * useOrderHistory 수주 이력 관리 커스텀 훅
 * 
 * 수주 이력 조회 및 상태 관리를 제공합니다.
 */

import { useState, useCallback } from 'react';
import { OrderHistoryItem, GetOrderHistoryRequest } from '../../application/usecases/order/GetOrderHistoryUseCase';
import { DIContainer } from '../../config/DIContainer';

interface UseOrderHistoryState {
  histories: OrderHistoryItem[];
  loading: boolean;
  error: string | null;
}

const initialState: UseOrderHistoryState = {
  histories: [],
  loading: false,
  error: null
};

export const useOrderHistory = () => {
  const [state, setState] = useState<UseOrderHistoryState>(initialState);
  
  // UseCase 인스턴스 획득
  const getOrderHistoryUseCase = DIContainer.getInstance().getOrderHistoryUseCase();

  // 수주 이력 조회
  const loadHistory = useCallback(async (orderId: string) => {
    if (!orderId) {
      setState(prev => ({ ...prev, error: '수주 ID가 필요합니다.' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const request: GetOrderHistoryRequest = { orderId };
      const response = await getOrderHistoryUseCase.execute(request);
      
      setState(prev => ({
        ...prev,
        histories: response.histories,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '이력 조회 중 오류가 발생했습니다.'
      }));
    }
  }, [getOrderHistoryUseCase]);

  // 이력 초기화
  const clearHistory = useCallback(() => {
    setState(initialState);
  }, []);

  // 에러 초기화
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 새로고침
  const refresh = useCallback((orderId: string) => {
    if (orderId) {
      loadHistory(orderId);
    }
  }, [loadHistory]);

  return {
    ...state,
    loadHistory,
    clearHistory,
    clearError,
    refresh
  };
};