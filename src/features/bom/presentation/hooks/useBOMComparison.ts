import { useCallback } from 'react';
import { BOMTreeNode } from '../../application/usecases/bom/GetBOMTreeUseCase';
import { 
  CompareBOMRequest, 
  CompareBOMResponse,
  BOMComparison, 
  BOMComparisonDifference, 
  DifferenceType 
} from '../../application/usecases/bom/CompareBOMUseCase';
import { BOMDI } from '../../config/BOMDIModule';
import { useFeatureQuery, useFeatureMutation } from '@shared/hooks/useFeatureQuery';
import { useAppStore, useAppStoreSelectors } from '@shared/stores/appStore';
import { createQueryKey } from '@app/providers/QueryProvider';

/**
 * 현대화된 useBOMComparison Hook
 * 
 * TanStack Query v5 + Zustand를 활용한 BOM 비교 상태 관리:
 * - 서버 상태: TanStack Query로 비교 결과 캐싱
 * - UI 상태: Zustand로 선택된 제품, 필터, 확장 상태 관리
 * - 자동 에러 처리 및 알림
 * - 비교 결과 캐싱으로 성능 최적화
 */
export const useBOMComparison = (
  sourceProductId?: string,
  targetProductId?: string
) => {
  // Zustand 스토어에서 BOM 비교 UI 상태 조회
  const bomComparison = useAppStoreSelectors.useBomComparison();
  const { bom: bomActions } = useAppStore();

  // UseCase 가져오기
  const compareBOMUseCase = BOMDI.compareBOMUseCase();

  // 현재 비교 요청 구성 (BOM ID로 변경)
  const currentRequest: CompareBOMRequest = {
    sourceBOMId: sourceProductId || bomComparison.sourceBOM?.id || '',
    targetBOMId: targetProductId || bomComparison.targetBOM?.id || '',
    compareOptions: {
      ignoreInactiveItems: false,
      ignoreOptionalItems: false,
      ignoreMinorCostChanges: false,
      minorCostThreshold: 1000,
      includeCostImpactAnalysis: true,
      includeStructuralAnalysis: true,
    },
  };

  // 비교 실행 조건: 두 BOM ID가 모두 있어야 함
  const shouldCompare = !!(currentRequest.sourceBOMId && currentRequest.targetBOMId);

  // TanStack Query를 통한 BOM 비교
  const comparisonQuery = useFeatureQuery<CompareBOMResponse>({
    feature: 'bom',
    operation: 'compare',
    params: currentRequest,
    queryFn: () => compareBOMUseCase.execute(currentRequest),
    enabled: shouldCompare,
    staleTime: 1000 * 60 * 10, // 10분간 fresh (비교는 상대적으로 오래 유지)
    gcTime: 1000 * 60 * 30,    // 30분간 캐시 유지
    onError: (error) => {
      console.error('BOM comparison query error:', error);
    },
  });

  // 제품 선택 메서드들
  const setSourceProduct = useCallback((productId: string | null, productName?: string) => {
    bomActions.setComparison(
      productId ? { id: productId, name: productName || '' } : null,
      bomComparison.targetBOM
    );
  }, [bomActions, bomComparison.targetBOM]);

  const setTargetProduct = useCallback((productId: string | null, productName?: string) => {
    bomActions.setComparison(
      bomComparison.sourceBOM,
      productId ? { id: productId, name: productName || '' } : null
    );
  }, [bomActions, bomComparison.sourceBOM]);

  // 비교 초기화
  const reset = useCallback(() => {
    bomActions.setComparison(null, null);
  }, [bomActions]);

  // 필터 및 보기 옵션
  const toggleDifferenceType = useCallback((type: DifferenceType) => {
    // TODO: Zustand에 selectedDifferenceTypes 상태 추가 후 구현
    console.log('Toggle difference type:', type);
  }, []);

  const setShowOnlyDifferences = useCallback((show: boolean) => {
    // TODO: Zustand에 showOnlyDifferences 상태 추가 후 구현
    console.log('Set show only differences:', show);
  }, []);

  // 트리 확장/축소 (BOM Tree와 동일한 로직 사용)
  const expandNode = useCallback((nodeId: string) => {
    bomActions.expandNode(nodeId);
  }, [bomActions]);

  const collapseNode = useCallback((nodeId: string) => {
    bomActions.collapseNode(nodeId);
  }, [bomActions]);

  const expandAll = useCallback(() => {
    bomActions.expandAllNodes();
  }, [bomActions]);

  const collapseAll = useCallback(() => {
    bomActions.collapseAllNodes();
  }, [bomActions]);

  // 파생된 상태들
  const comparisonResponse = comparisonQuery.data || null;
  const comparison = comparisonResponse?.comparison || null;
  const differences = comparison?.differences || [];

  // 통계 계산
  const statistics = {
    totalItems: differences.length,
    addedItems: differences.filter(d => d.type === DifferenceType.ADDED).length,
    removedItems: differences.filter(d => d.type === DifferenceType.REMOVED).length,
    modifiedItems: differences.filter(d => d.type === DifferenceType.PROPERTIES_CHANGED || d.type === DifferenceType.QUANTITY_CHANGED || d.type === DifferenceType.COST_CHANGED).length,
    unchangedItems: 0, // 이 enum에는 UNCHANGED가 없음
    costDifference: comparisonResponse?.summary?.totalCostDifference || 0,
  };

  return {
    // 데이터
    comparison,
    differences,
    statistics,

    // 선택된 제품들 
    sourceProductId: bomComparison.sourceBOM?.id || null,
    targetProductId: bomComparison.targetBOM?.id || null,
    sourceProduct: bomComparison.sourceBOM,
    targetProduct: bomComparison.targetBOM,

    // 상태
    loading: comparisonQuery.isLoading,
    error: comparisonQuery.error?.message || null,
    isStale: comparisonQuery.isStale,
    isFetching: comparisonQuery.isFetching,

    // UI 상태 (TODO: Zustand에서 관리)
    showOnlyDifferences: false, // TODO: 실제 상태값으로 교체
    selectedDifferenceTypes: new Set<DifferenceType>(), // TODO: 실제 상태값으로 교체
    expandedNodes: new Set<string>(), // TODO: 실제 확장된 노드들

    // 액션 - 제품 선택
    setSourceProduct,
    setTargetProduct,
    reset,

    // 액션 - 비교 실행
    compareProducts: useCallback(async (sourceId?: string, targetId?: string) => {
      // 매개변수가 주어진 경우 상태 업데이트 후 쿼리 실행
      if (sourceId && targetId) {
        bomActions.setComparison(
          { id: sourceId, name: '' },
          { id: targetId, name: '' }
        );
        // 상태 업데이트 후 쿼리 다시 실행하기 위해 약간의 지연
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      return comparisonQuery.refetch();
    }, [bomActions, comparisonQuery.refetch, comparisonQuery]),
    refresh: comparisonQuery.refetch,

    // 액션 - 필터 및 보기
    toggleDifferenceType,
    setShowOnlyDifferences,

    // 액션 - 트리 조작
    expandNode,
    collapseNode,
    expandAll,
    collapseAll,

    // 추가 액션들 (임시 구현)
    expandDifferences: useCallback(() => {
      // TODO: 차이점 확장 로직
      console.log('Expanding differences');
    }, []),

    exportComparison: useCallback(() => {
      // TODO: 비교 결과 내보내기
      console.log('Exporting comparison');
    }, []),

    // TanStack Query 원본 객체 (고급 사용을 위해)
    query: comparisonQuery,
  };
};

/**
 * BOM 비교 결과를 기반으로 새 BOM 생성을 위한 Mutation Hook
 */
export const useCreateBOMFromComparison = () => {
  // TODO: 새 BOM 생성 UseCase 구현 후 추가
  return useFeatureMutation({
    feature: 'bom',
    operation: 'createFromComparison',
    mutationFn: (variables: any) => Promise.resolve(variables), // 임시 구현
    invalidateQueries: [createQueryKey.bom.all()],
    onSuccess: () => {
      useAppStore.getState().bom.closeCompareModal();
    },
  });
};

/**
 * 레거시 호환성을 위한 인터페이스 유지
 * @deprecated 새 컴포넌트에서는 useBOMComparison() 직접 사용 권장
 */
export interface BOMComparisonState {
  loading: boolean;
  error: string | null;
  comparison: BOMComparison | null;
  differences: BOMComparisonDifference[];
  sourceProductId: string | null;
  targetProductId: string | null;
  showOnlyDifferences: boolean;
  selectedDifferenceTypes: Set<DifferenceType>;
  expandedNodes: Set<string>;
  statistics: {
    totalItems: number;
    addedItems: number;
    removedItems: number;
    modifiedItems: number;
    unchangedItems: number;
    costDifference: number;
  };
}

export interface BOMComparisonActions {
  compareProducts: (sourceProductId: string, targetProductId: string) => Promise<void>;
  reset: () => void;
  setSourceProduct: (productId: string | null) => void;
  setTargetProduct: (productId: string | null) => void;
  toggleDifferenceType: (type: DifferenceType) => void;
  setShowOnlyDifferences: (show: boolean) => void;
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
}