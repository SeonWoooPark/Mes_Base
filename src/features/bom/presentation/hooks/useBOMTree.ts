import { useCallback, useMemo } from 'react';
import { 
  GetBOMTreeRequest, 
  GetBOMTreeResponse, 
  BOMTreeNode, 
  BOMInfo 
} from '../../application/usecases/bom/GetBOMTreeUseCase';
import { ComponentType } from '../../domain/entities/BOMItem';
import { BOMDI } from '../../config/BOMDIModule';
import { useFeatureQuery, useFeatureMutation } from '@shared/hooks/useFeatureQuery';
import { useAppStore, useAppStoreSelectors } from '@shared/stores/appStore';
import { createQueryKey } from '@app/providers/QueryProvider';

/**
 * BOM 트리 필터 옵션
 */
export interface BOMTreeFilter {
  searchKeyword?: string;                // 구성품명/코드 검색
  componentTypes?: ComponentType[];       // 구성품 유형 필터
  levels?: number[];                     // 레벨 필터 (예: [0, 1, 2])
  levelRange?: {                         // 레벨 범위 필터
    min?: number;
    max?: number;
  };
  includeInactive?: boolean;             // 비활성 아이템 포함
  includeOptional?: boolean;             // 선택사항 포함
  processStep?: string;                  // 공정 단계 필터
  costRange?: {                          // 비용 범위
    min?: number;
    max?: number;
  };
}

/**
 * 현대화된 useBOMTree Hook
 * 
 * TanStack Query v5 + Zustand를 활용한 새로운 상태 관리:
 * - 서버 상태: TanStack Query로 캐싱 및 동기화
 * - UI 상태: Zustand로 트리 확장/축소, 필터 등 관리
 * - 자동 에러 처리 및 알림
 * - 백그라운드 동기화
 * - 트리 상태 최적화
 */
export const useBOMTree = (productId?: string) => {
  // Zustand 스토어에서 BOM UI 상태 조회
  const bomTree = useAppStoreSelectors.useBomTree();
  const bomComparison = useAppStoreSelectors.useBomComparison();
  const { bom: bomActions } = useAppStore();

  // UseCase 가져오기
  const getBOMTreeUseCase = BOMDI.getBOMTreeUseCase();

  // 현재 요청 구성 (useMemo로 최적화)
  const currentRequest: GetBOMTreeRequest = useMemo(() => ({
    productId: productId || '',
    includeInactive: true, // TODO: 필터에서 가져오기
    maxLevel: 10, // TODO: 설정 가능하도록
  }), [productId]);

  // TanStack Query를 통한 BOM 트리 조회
  const bomTreeQuery = useFeatureQuery<GetBOMTreeResponse>({
    feature: 'bom',
    operation: 'tree',
    params: currentRequest,
    queryFn: () => getBOMTreeUseCase.execute(currentRequest),
    enabled: !!productId, // productId가 있을 때만 실행
    staleTime: 1000 * 60 * 5, // 5분간 fresh
    gcTime: 1000 * 60 * 15,   // 15분간 캐시 유지 (BOM은 좀 더 짧게)
    onError: (error) => {
      console.error('BOM tree query error:', error);
    },
  });

  // 편의 메서드들 - 트리 노드 확장/축소
  const expandNode = useCallback((nodeId: string) => {
    bomActions.expandNode(nodeId);
  }, [bomActions]);

  const collapseNode = useCallback((nodeId: string) => {
    bomActions.collapseNode(nodeId);
  }, [bomActions]);

  const toggleNode = useCallback((nodeId: string) => {
    if (bomTree.expandedNodes.has(nodeId)) {
      bomActions.collapseNode(nodeId);
    } else {
      bomActions.expandNode(nodeId);
    }
  }, [bomTree.expandedNodes, bomActions]);

  const expandAll = useCallback(() => {
    bomActions.expandAllNodes();
  }, [bomActions]);

  const collapseAll = useCallback(() => {
    bomActions.collapseAllNodes();
  }, [bomActions]);

  const expandToLevel = useCallback((level: number) => {
    // 특정 레벨까지만 확장하는 로직
    const response = bomTreeQuery.data;
    if (!response?.treeNodes) return;

    const nodesToExpand = new Set<string>();
    
    const collectNodesToLevel = (nodes: BOMTreeNode[], currentLevel: number) => {
      for (const node of nodes) {
        if (currentLevel < level) {
          nodesToExpand.add(node.id);
          if (node.children) {
            collectNodesToLevel(node.children, currentLevel + 1);
          }
        }
      }
    };

    collectNodesToLevel(response.treeNodes, 0);
    
    // Zustand 액션으로 한번에 설정
    bomActions.setExpandedNodes(nodesToExpand);
  }, [bomTreeQuery.data, bomActions]);

  // 필터링 관련
  const setFilter = useCallback((filter: BOMTreeFilter) => {
    // TODO: 필터 상태를 Zustand에 저장하고 필터링 로직 구현
    console.log('Setting BOM filter:', filter);
  }, []);

  const clearFilter = useCallback(() => {
    // TODO: 필터 초기화
    console.log('Clearing BOM filter');
  }, []);

  // 파생된 상태들 (useMemo로 최적화)
  const derivedState = useMemo(() => {
    const response = bomTreeQuery.data;
    const bomInfo = response?.bomInfo || null;
    const treeNodes = response?.treeNodes || [];
    
    return {
      bomInfo,
      treeNodes,
      filteredNodes: treeNodes, // 현재는 원본과 동일, 추후 필터 로직 구현
      totalItems: response?.totalItems || 0,
      totalCost: response?.totalCost || 0,
      maxLevel: response?.maxLevel || 0,
    };
  }, [bomTreeQuery.data]);

  return useMemo(() => ({
    // 데이터
    ...derivedState,
    expandedNodes: bomTree.expandedNodes,

    // 상태
    loading: bomTreeQuery.isLoading,
    error: bomTreeQuery.error?.message || null,
    isStale: bomTreeQuery.isStale,
    isFetching: bomTreeQuery.isFetching,

    // 액션 - 트리 조작
    expandNode,
    collapseNode,
    toggleNode,
    expandAll,
    collapseAll,
    expandToLevel,

    // 액션 - 데이터 관리
    loadBOMTree: bomTreeQuery.refetch, // refetch로 대체
    refresh: bomTreeQuery.refetch,

    // 액션 - 필터링
    setFilter,
    clearFilter,

    // TanStack Query 원본 객체 (고급 사용을 위해)
    query: bomTreeQuery,
  }), [
    derivedState,
    bomTree.expandedNodes,
    bomTreeQuery.isLoading,
    bomTreeQuery.error,
    bomTreeQuery.isStale,
    bomTreeQuery.isFetching,
    bomTreeQuery.refetch,
    expandNode,
    collapseNode,
    toggleNode,
    expandAll,
    collapseAll,
    expandToLevel,
    setFilter,
    clearFilter,
  ]);
};

/**
 * BOM 아이템 추가를 위한 Mutation Hook
 */
export const useAddBOMItem = () => {
  const addBOMItemUseCase = BOMDI.addBOMItemUseCase();

  return useFeatureMutation({
    feature: 'bom',
    operation: 'addItem',
    mutationFn: (variables: any) => addBOMItemUseCase.execute(variables),
    invalidateQueries: [createQueryKey.bom.all()],
    onSuccess: () => {
      // 성공시 아이템 모달 닫기
      useAppStore.getState().bom.closeItemModal();
    },
  });
};

/**
 * BOM 아이템 수정을 위한 Mutation Hook
 */
export const useUpdateBOMItem = () => {
  const updateBOMItemUseCase = BOMDI.updateBOMItemUseCase();

  return useFeatureMutation({
    feature: 'bom',
    operation: 'updateItem',
    mutationFn: (variables: any) => updateBOMItemUseCase.execute(variables),
    invalidateQueries: [createQueryKey.bom.all()],
    onSuccess: () => {
      useAppStore.getState().bom.closeItemModal();
    },
  });
};

/**
 * BOM 아이템 삭제를 위한 Mutation Hook
 */
export const useDeleteBOMItem = () => {
  const deleteBOMItemUseCase = BOMDI.deleteBOMItemUseCase();

  return useFeatureMutation({
    feature: 'bom',
    operation: 'deleteItem',
    mutationFn: (variables: { bomItemId: string; reason: string; id_updated: string }) => 
      deleteBOMItemUseCase.execute({
        bomItemId: variables.bomItemId,
        deleteReason: variables.reason,
        id_updated: variables.id_updated,
      }),
    invalidateQueries: [createQueryKey.bom.all()],
    optimisticUpdate: () => {
      // 낙관적 업데이트: UI에서 즉시 항목 제거
      // TODO: 실제 구현 시 queryClient.setQueryData 활용
    },
  });
};

/**
 * BOM 복사를 위한 Mutation Hook
 */
export const useCopyBOM = () => {
  const copyBOMUseCase = BOMDI.copyBOMUseCase();

  return useFeatureMutation({
    feature: 'bom',
    operation: 'copy',
    mutationFn: (variables: any) => copyBOMUseCase.execute(variables),
    invalidateQueries: [createQueryKey.bom.all()],
    onSuccess: () => {
      useAppStore.getState().bom.closeCopyModal();
    },
  });
};

/**
 * 레거시 호환성을 위한 인터페이스 유지 (점진적 마이그레이션용)
 * @deprecated 새 컴포넌트에서는 useBOMTree() 직접 사용 권장
 */
export interface UseBOMTreeState {
  bomInfo: BOMInfo | null;
  treeNodes: BOMTreeNode[];
  expandedNodes: Set<string>;
  filteredNodes: BOMTreeNode[];
  totalItems: number;
  totalCost: number;
  maxLevel: number;
  loading: boolean;
  error: string | null;
}

export interface UseBOMTreeActions {
  loadBOMTree: (request: GetBOMTreeRequest) => Promise<void>;
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  expandToLevel: (level: number) => void;
  setFilter: (filter: BOMTreeFilter) => void;
  clearFilter: () => void;
  refresh: () => Promise<void>;
  toggleNode: (nodeId: string) => void;
}