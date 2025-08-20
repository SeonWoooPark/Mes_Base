import { useState, useCallback } from 'react';
import { 
  AddBOMItemRequest, 
  AddBOMItemResponse 
} from '../../application/usecases/bom/AddBOMItemUseCase';
import { 
  UpdateBOMItemRequest, 
  UpdateBOMItemResponse 
} from '../../application/usecases/bom/UpdateBOMItemUseCase';
import { 
  DeleteBOMItemRequest, 
  DeleteBOMItemResponse 
} from '../../application/usecases/bom/DeleteBOMItemUseCase';
import { 
  CopyBOMRequest, 
  CopyBOMResponse 
} from '../../application/usecases/bom/CopyBOMUseCase';
import { DIContainer } from '@app/config/DIContainer';

/**
 * BOM 작업 상태 인터페이스
 */
export interface UseBOMOperationsState {
  adding: boolean;                       // 아이템 추가 중
  updating: boolean;                     // 아이템 수정 중
  deleting: boolean;                     // 아이템 삭제 중
  copying: boolean;                      // BOM 복사 중
  lastError: string | null;              // 마지막 에러 메시지
  lastSuccess: string | null;            // 마지막 성공 메시지
}

/**
 * BOM 작업 결과 타입
 */
export interface BOMOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * BOM 작업 콜백 함수들
 */
export interface BOMOperationCallbacks {
  onSuccess?: (message: string, data?: any) => void;
  onError?: (message: string) => void;
  onComplete?: () => void;              // 성공/실패 관계없이 작업 완료 시
  onRefreshNeeded?: () => Promise<void>; // 트리 새로고침 필요 시
}

/**
 * BOM 작업 액션 인터페이스
 */
export interface UseBOMOperationsActions {
  addBOMItem: (
    request: AddBOMItemRequest, 
    callbacks?: BOMOperationCallbacks
  ) => Promise<BOMOperationResult<AddBOMItemResponse>>;
  
  updateBOMItem: (
    request: UpdateBOMItemRequest, 
    callbacks?: BOMOperationCallbacks
  ) => Promise<BOMOperationResult<UpdateBOMItemResponse>>;
  
  deleteBOMItem: (
    request: DeleteBOMItemRequest, 
    callbacks?: BOMOperationCallbacks
  ) => Promise<BOMOperationResult<DeleteBOMItemResponse>>;
  
  copyBOM: (
    request: CopyBOMRequest, 
    callbacks?: BOMOperationCallbacks
  ) => Promise<BOMOperationResult<CopyBOMResponse>>;
  
  clearMessages: () => void;
  isAnyOperationInProgress: () => boolean;
}

/**
 * BOM 작업 관리 커스텀 훅
 * 
 * 주요 기능:
 * - BOM CRUD 작업 처리
 * - 낙관적 업데이트 지원
 * - 에러 처리 및 사용자 피드백
 * - 작업 상태 추적
 * - 다른 컴포넌트와의 연동 (콜백 시스템)
 */
export const useBOMOperations = (): UseBOMOperationsState & UseBOMOperationsActions => {
  // 이 Hook은 이제 useBOMTree의 개별 mutation hooks로 대체됨
  // 레거시 호환성을 위해 유지, 점진적으로 새 hooks 사용 권장
  console.warn('useBOMOperations는 deprecated됩니다. useAddBOMItem, useUpdateBOMItem 등 개별 hooks 사용을 권장합니다.');
  
  // === 상태 관리 ===
  const [state, setState] = useState<UseBOMOperationsState>({
    adding: false,
    updating: false,
    deleting: false,
    copying: false,
    lastError: null,
    lastSuccess: null,
  });

  // === 의존성 주입 ===
  const addBOMItemUseCase = DIContainer.getInstance().getAddBOMItemUseCase();
  const updateBOMItemUseCase = DIContainer.getInstance().getUpdateBOMItemUseCase();
  const deleteBOMItemUseCase = DIContainer.getInstance().getDeleteBOMItemUseCase();
  const copyBOMUseCase = DIContainer.getInstance().getCopyBOMUseCase();

  // === 공통 에러 처리 ===
  const handleError = useCallback((error: unknown, operation: string): string => {
    const message = error instanceof Error 
      ? error.message 
      : `${operation} 중 알 수 없는 오류가 발생했습니다.`;
    
    setState(prev => ({ 
      ...prev, 
      lastError: message, 
      lastSuccess: null 
    }));
    
    return message;
  }, []);

  // === 공통 성공 처리 ===
  const handleSuccess = useCallback((message: string, data?: any) => {
    setState(prev => ({ 
      ...prev, 
      lastSuccess: message, 
      lastError: null 
    }));
  }, []);

  // === BOM 아이템 추가 ===
  const addBOMItem = useCallback(async (
    request: AddBOMItemRequest, 
    callbacks?: BOMOperationCallbacks
  ): Promise<BOMOperationResult<AddBOMItemResponse>> => {
    setState(prev => ({ ...prev, adding: true, lastError: null, lastSuccess: null }));

    try {
      const response = await addBOMItemUseCase.execute(request);
      
      const successMessage = `구성품 '${request.componentId}'이(가) 성공적으로 추가되었습니다.`;
      handleSuccess(successMessage, response);
      
      // 콜백 실행
      callbacks?.onSuccess?.(successMessage, response);
      callbacks?.onRefreshNeeded?.(); // 트리 새로고침
      
      setState(prev => ({ ...prev, adding: false }));
      callbacks?.onComplete?.();
      
      return { success: true, data: response };
      
    } catch (error) {
      const errorMessage = handleError(error, 'BOM 아이템 추가');
      
      callbacks?.onError?.(errorMessage);
      setState(prev => ({ ...prev, adding: false }));
      callbacks?.onComplete?.();
      
      return { success: false, error: errorMessage };
    }
  }, [addBOMItemUseCase, handleError, handleSuccess]);

  // === BOM 아이템 수정 ===
  const updateBOMItem = useCallback(async (
    request: UpdateBOMItemRequest, 
    callbacks?: BOMOperationCallbacks
  ): Promise<BOMOperationResult<UpdateBOMItemResponse>> => {
    setState(prev => ({ ...prev, updating: true, lastError: null, lastSuccess: null }));

    try {
      const response = await updateBOMItemUseCase.execute(request);
      
      const successMessage = `구성품 정보가 성공적으로 수정되었습니다.`;
      handleSuccess(successMessage, response);
      
      // 콜백 실행
      callbacks?.onSuccess?.(successMessage, response);
      callbacks?.onRefreshNeeded?.(); // 트리 새로고침
      
      setState(prev => ({ ...prev, updating: false }));
      callbacks?.onComplete?.();
      
      return { success: true, data: response };
      
    } catch (error) {
      const errorMessage = handleError(error, 'BOM 아이템 수정');
      
      callbacks?.onError?.(errorMessage);
      setState(prev => ({ ...prev, updating: false }));
      callbacks?.onComplete?.();
      
      return { success: false, error: errorMessage };
    }
  }, [updateBOMItemUseCase, handleError, handleSuccess]);

  // === BOM 아이템 삭제 ===
  const deleteBOMItem = useCallback(async (
    request: DeleteBOMItemRequest, 
    callbacks?: BOMOperationCallbacks
  ): Promise<BOMOperationResult<DeleteBOMItemResponse>> => {
    setState(prev => ({ ...prev, deleting: true, lastError: null, lastSuccess: null }));

    try {
      const response = await deleteBOMItemUseCase.execute(request);
      
      const deletedCount = response.deletedItemIds.length;
      const successMessage = `${deletedCount}개의 구성품이 성공적으로 삭제되었습니다.`;
      handleSuccess(successMessage, response);
      
      // 콜백 실행
      callbacks?.onSuccess?.(successMessage, response);
      callbacks?.onRefreshNeeded?.(); // 트리 새로고침
      
      setState(prev => ({ ...prev, deleting: false }));
      callbacks?.onComplete?.();
      
      return { success: true, data: response };
      
    } catch (error) {
      const errorMessage = handleError(error, 'BOM 아이템 삭제');
      
      callbacks?.onError?.(errorMessage);
      setState(prev => ({ ...prev, deleting: false }));
      callbacks?.onComplete?.();
      
      return { success: false, error: errorMessage };
    }
  }, [deleteBOMItemUseCase, handleError, handleSuccess]);

  // === BOM 복사 ===
  const copyBOM = useCallback(async (
    request: CopyBOMRequest, 
    callbacks?: BOMOperationCallbacks
  ): Promise<BOMOperationResult<CopyBOMResponse>> => {
    setState(prev => ({ ...prev, copying: true, lastError: null, lastSuccess: null }));

    try {
      const response = await copyBOMUseCase.execute(request);
      
      const successMessage = `BOM이 성공적으로 복사되었습니다. (새 BOM ID: ${response.newBOMId})`;
      handleSuccess(successMessage, response);
      
      // 콜백 실행
      callbacks?.onSuccess?.(successMessage, response);
      callbacks?.onRefreshNeeded?.(); // 목록 새로고침
      
      setState(prev => ({ ...prev, copying: false }));
      callbacks?.onComplete?.();
      
      return { success: true, data: response };
      
    } catch (error) {
      const errorMessage = handleError(error, 'BOM 복사');
      
      callbacks?.onError?.(errorMessage);
      setState(prev => ({ ...prev, copying: false }));
      callbacks?.onComplete?.();
      
      return { success: false, error: errorMessage };
    }
  }, [copyBOMUseCase, handleError, handleSuccess]);

  // === 메시지 초기화 ===
  const clearMessages = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      lastError: null, 
      lastSuccess: null 
    }));
  }, []);

  // === 작업 진행 중 여부 확인 ===
  const isAnyOperationInProgress = useCallback((): boolean => {
    return state.adding || state.updating || state.deleting || state.copying;
  }, [state.adding, state.updating, state.deleting, state.copying]);

  return {
    // 상태
    ...state,
    
    // 액션
    addBOMItem,
    updateBOMItem,
    deleteBOMItem,
    copyBOM,
    clearMessages,
    isAnyOperationInProgress,
  };
};

// === 유틸리티 함수들 ===

/**
 * BOM 작업 결과를 사용자 친화적 메시지로 변환
 */
export const formatBOMOperationMessage = (
  operation: 'add' | 'update' | 'delete' | 'copy',
  success: boolean,
  details?: any
): string => {
  const operations = {
    add: { success: '구성품이 추가되었습니다', error: '구성품 추가에 실패했습니다' },
    update: { success: '구성품이 수정되었습니다', error: '구성품 수정에 실패했습니다' },
    delete: { success: '구성품이 삭제되었습니다', error: '구성품 삭제에 실패했습니다' },
    copy: { success: 'BOM이 복사되었습니다', error: 'BOM 복사에 실패했습니다' },
  };

  return success ? operations[operation].success : operations[operation].error;
};

/**
 * 작업 확인 다이얼로그 표시
 */
export const confirmBOMOperation = (
  operation: 'delete' | 'copy',
  targetName: string
): boolean => {
  const messages = {
    delete: `'${targetName}' 구성품을 삭제하시겠습니까?\n\n삭제된 구성품은 복구할 수 없습니다.`,
    copy: `'${targetName}' BOM을 복사하시겠습니까?`,
  };

  return window.confirm(messages[operation]);
};