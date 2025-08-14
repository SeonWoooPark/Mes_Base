/**
 * 제품 이력 관리 커스텀 훅
 * 
 * 기능:
 * - 제품 이력 조회 및 상태 관리
 * - 로딩 및 에러 상태 처리
 * - 이력 새로고침
 */

import { useState, useCallback } from 'react';
import { 
  GetProductHistoryUseCase, 
  ProductHistoryItem 
} from '../../application/usecases/product/GetProductHistoryUseCase';
import { DIContainer } from '@app/config/DIContainer';

interface UseProductHistoryState {
  histories: ProductHistoryItem[];
  loading: boolean;
  error: string | null;
}

interface UseProductHistoryReturn {
  histories: ProductHistoryItem[];
  loading: boolean;
  error: string | null;
  loadHistory: (productId: string) => Promise<void>;
  clearHistory: () => void;
  refresh: (productId?: string) => Promise<void>;
}

export const useProductHistory = (): UseProductHistoryReturn => {
  // 상태 관리
  const [state, setState] = useState<UseProductHistoryState>({
    histories: [],
    loading: false,
    error: null
  });

  // 현재 조회 중인 제품 ID 저장 (새로고침용)
  const [currentProductId, setCurrentProductId] = useState<string | undefined>();

  // UseCase 인스턴스 가져오기
  const getProductHistoryUseCase = DIContainer.getInstance().getProductHistoryUseCase();

  /**
   * 제품 이력 조회
   * @param productId 조회할 제품 ID
   */
  const loadHistory = useCallback(async (productId: string) => {
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null 
    }));

    setCurrentProductId(productId);

    try {
      const response = await getProductHistoryUseCase.execute({ productId });
      
      setState(prev => ({
        ...prev,
        histories: response.histories,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error 
          ? error.message 
          : '제품 이력 조회 중 오류가 발생했습니다.'
      }));
    }
  }, [getProductHistoryUseCase]);

  /**
   * 이력 데이터 초기화
   */
  const clearHistory = useCallback(() => {
    setState({
      histories: [],
      loading: false,
      error: null
    });
    setCurrentProductId(undefined);
  }, []);

  /**
   * 이력 새로고침
   * @param productId 새로고침할 제품 ID (미제공 시 현재 제품 ID 사용)
   */
  const refresh = useCallback(async (productId?: string) => {
    const targetProductId = productId || currentProductId;
    if (!targetProductId) {
      console.warn('새로고침할 제품 ID가 없습니다.');
      return;
    }

    await loadHistory(targetProductId);
  }, [loadHistory, currentProductId]);

  return {
    histories: state.histories,
    loading: state.loading,
    error: state.error,
    loadHistory,
    clearHistory,
    refresh
  };
};