import { useState, useCallback, useMemo } from 'react';
import { BOMTreeNode } from '../../application/usecases/bom/GetBOMTreeUseCase';
import { CompareBOMUseCase, CompareBOMRequest, BOMComparison, BOMComparisonDifference, DifferenceType } from '../../application/usecases/bom/CompareBOMUseCase';
import { DIContainer } from '../../config/DIContainer';

/**
 * BOM 비교 상태
 */
export interface BOMComparisonState {
  // 기본 상태
  loading: boolean;
  error: string | null;
  
  // 비교 데이터
  comparison: BOMComparison | null;
  differences: BOMComparisonDifference[];
  
  // 선택된 제품들
  sourceProductId: string | null;
  targetProductId: string | null;
  
  // 필터 및 보기 옵션
  showOnlyDifferences: boolean;
  selectedDifferenceTypes: Set<DifferenceType>;
  expandedNodes: Set<string>;
  
  // 통계
  statistics: {
    totalItems: number;
    addedItems: number;
    removedItems: number;
    modifiedItems: number;
    unchangedItems: number;
    costDifference: number;
  };
}

/**
 * BOM 비교 액션
 */
export interface BOMComparisonActions {
  // 비교 실행
  compareProducts: (sourceProductId: string, targetProductId: string) => Promise<void>;
  reset: () => void;
  
  // 제품 선택
  setSourceProduct: (productId: string | null) => void;
  setTargetProduct: (productId: string | null) => void;
  
  // 필터 및 보기 옵션
  setShowOnlyDifferences: (show: boolean) => void;
  toggleDifferenceType: (type: DifferenceType) => void;
  clearDifferenceTypeFilter: () => void;
  
  // 트리 제어
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  expandDifferences: () => void; // 차이점이 있는 노드들만 펼침
  
  // 내보내기
  exportComparison: () => Promise<void>;
}

/**
 * 기본 차이점 유형들
 */
const defaultDifferenceTypes: Set<DifferenceType> = new Set([
  DifferenceType.ADDED,
  DifferenceType.REMOVED,
  DifferenceType.QUANTITY_CHANGED,
  DifferenceType.COST_CHANGED,
  DifferenceType.PROPERTIES_CHANGED
]);

/**
 * 기본 상태
 */
const initialState: BOMComparisonState = {
  loading: false,
  error: null,
  comparison: null,
  differences: [],
  sourceProductId: null,
  targetProductId: null,
  showOnlyDifferences: false,
  selectedDifferenceTypes: new Set(defaultDifferenceTypes),
  expandedNodes: new Set(),
  statistics: {
    totalItems: 0,
    addedItems: 0,
    removedItems: 0,
    modifiedItems: 0,
    unchangedItems: 0,
    costDifference: 0
  }
};

/**
 * BOM 비교 커스텀 훅
 * 
 * 기능:
 * - 두 BOM 버전 간 차이점 비교
 * - 시각적 차이점 하이라이팅
 * - 필터링 및 정렬 옵션
 * - 통계 정보 제공
 * - 비교 결과 내보내기
 */
export const useBOMComparison = (): BOMComparisonState & BOMComparisonActions => {
  
  // === 상태 관리 ===
  const [state, setState] = useState<BOMComparisonState>(initialState);
  
  // === UseCase 인스턴스 ===
  const compareBOMUseCase = useMemo(() => 
    DIContainer.getInstance().get<CompareBOMUseCase>('CompareBOMUseCase'), []
  );
  
  // === 통계 계산 ===
  const computeStatistics = useCallback((differences: BOMComparisonDifference[], comparison: BOMComparison | null) => {
    const stats = {
      totalItems: 0,
      addedItems: 0,
      removedItems: 0,
      modifiedItems: 0,
      unchangedItems: 0,
      costDifference: 0
    };
    
    if (!comparison) return stats;
    
    // 전체 아이템 수
    stats.totalItems = Math.max(
      comparison.sourceTree.length,
      comparison.targetTree.length
    );
    
    // 차이점별 통계
    differences.forEach(diff => {
      switch (diff.type) {
        case DifferenceType.ADDED:
          stats.addedItems++;
          break;
        case DifferenceType.REMOVED:
          stats.removedItems++;
          break;
        case DifferenceType.QUANTITY_CHANGED:
        case DifferenceType.COST_CHANGED:
        case DifferenceType.PROPERTIES_CHANGED:
          stats.modifiedItems++;
          break;
      }
    });
    
    // 변경되지 않은 아이템 수
    stats.unchangedItems = stats.totalItems - stats.addedItems - stats.removedItems - stats.modifiedItems;
    
    // 총 비용 차이
    stats.costDifference = comparison.targetTree.reduce((sum, node) => sum + node.totalCost, 0) -
                          comparison.sourceTree.reduce((sum, node) => sum + node.totalCost, 0);
    
    return stats;
  }, []);
  
  // === 비교 실행 ===
  const compareProducts = useCallback(async (sourceProductId: string, targetProductId: string): Promise<void> => {
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      sourceProductId,
      targetProductId
    }));
    
    try {
      const request: CompareBOMRequest = {
        sourceBOMId: sourceProductId, // TODO: 실제로는 Product ID로 BOM을 찾아야 함
        targetBOMId: targetProductId, // TODO: 실제로는 Product ID로 BOM을 찾아야 함
        compareOptions: {
          ignoreInactiveItems: false,
          ignoreOptionalItems: false,
          ignoreMinorCostChanges: false,
          minorCostThreshold: 0.01, // 1원 이하 차이는 무시
          includeCostImpactAnalysis: true,
          includeStructuralAnalysis: true
        }
      };
      
      const response = await compareBOMUseCase.execute(request);
      
      const statistics = computeStatistics(response.comparison.differences, response.comparison);
      
      setState(prev => ({
        ...prev,
        loading: false,
        comparison: response.comparison,
        differences: response.comparison.differences,
        statistics,
        // 루트 노드들은 기본적으로 펼침
        expandedNodes: new Set(
          response.comparison.sourceTree
            .filter(node => !node.parentId)
            .map(node => node.id)
        )
      }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'BOM 비교 중 오류가 발생했습니다.';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      console.error('BOM comparison error:', error);
    }
  }, [compareBOMUseCase, computeStatistics]);
  
  // === 초기화 ===
  const reset = useCallback(() => {
    setState(initialState);
  }, []);
  
  // === 제품 선택 ===
  const setSourceProduct = useCallback((productId: string | null) => {
    setState(prev => ({ ...prev, sourceProductId: productId }));
  }, []);
  
  const setTargetProduct = useCallback((productId: string | null) => {
    setState(prev => ({ ...prev, targetProductId: productId }));
  }, []);
  
  // === 필터 및 보기 옵션 ===
  const setShowOnlyDifferences = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showOnlyDifferences: show }));
  }, []);
  
  const toggleDifferenceType = useCallback((type: DifferenceType) => {
    setState(prev => {
      const newTypes = new Set(prev.selectedDifferenceTypes);
      if (newTypes.has(type)) {
        newTypes.delete(type);
      } else {
        newTypes.add(type);
      }
      return { ...prev, selectedDifferenceTypes: newTypes };
    });
  }, []);
  
  const clearDifferenceTypeFilter = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      selectedDifferenceTypes: new Set(defaultDifferenceTypes) 
    }));
  }, []);
  
  // === 트리 제어 ===
  const expandNode = useCallback((nodeId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedNodes);
      newExpanded.add(nodeId);
      return { ...prev, expandedNodes: newExpanded };
    });
  }, []);
  
  const collapseNode = useCallback((nodeId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedNodes);
      newExpanded.delete(nodeId);
      return { ...prev, expandedNodes: newExpanded };
    });
  }, []);
  
  const expandAll = useCallback(() => {
    if (!state.comparison) return;
    
    const allNodeIds = new Set<string>();
    state.comparison.sourceTree.forEach(node => allNodeIds.add(node.id));
    state.comparison.targetTree.forEach(node => allNodeIds.add(node.id));
    
    setState(prev => ({ ...prev, expandedNodes: allNodeIds }));
  }, [state.comparison]);
  
  const collapseAll = useCallback(() => {
    setState(prev => ({ ...prev, expandedNodes: new Set() }));
  }, []);
  
  const expandDifferences = useCallback(() => {
    if (!state.comparison || !state.differences.length) return;
    
    // 차이점이 있는 노드들과 그 부모 노드들을 펼침
    const nodesToExpand = new Set<string>();
    
    state.differences.forEach(diff => {
      if (diff.sourceNode) {
        nodesToExpand.add(diff.sourceNode.id);
        // 부모 노드들도 펼침
        let parentId = diff.sourceNode.parentId;
        while (parentId) {
          nodesToExpand.add(parentId);
          const parentNode = state.comparison!.sourceTree.find(n => n.id === parentId);
          parentId = parentNode?.parentId;
        }
      }
      
      if (diff.targetNode) {
        nodesToExpand.add(diff.targetNode.id);
        // 부모 노드들도 펼침
        let parentId = diff.targetNode.parentId;
        while (parentId) {
          nodesToExpand.add(parentId);
          const parentNode = state.comparison!.targetTree.find(n => n.id === parentId);
          parentId = parentNode?.parentId;
        }
      }
    });
    
    setState(prev => {
      const newExpanded = new Set(prev.expandedNodes);
      nodesToExpand.forEach(nodeId => newExpanded.add(nodeId));
      return { ...prev, expandedNodes: newExpanded };
    });
  }, [state.comparison, state.differences]);
  
  // === 내보내기 ===
  const exportComparison = useCallback(async (): Promise<void> => {
    if (!state.comparison || !state.differences.length) {
      throw new Error('비교 데이터가 없습니다.');
    }
    
    try {
      // CSV 형식으로 비교 결과 생성
      const csvContent = generateComparisonCSV(state.comparison, state.differences, state.statistics);
      
      // 파일 다운로드
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `BOM_Comparison_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Export comparison error:', error);
      throw new Error('비교 결과 내보내기 중 오류가 발생했습니다.');
    }
  }, [state.comparison, state.differences, state.statistics]);
  
  return {
    // 상태
    ...state,
    
    // 액션
    compareProducts,
    reset,
    setSourceProduct,
    setTargetProduct,
    setShowOnlyDifferences,
    toggleDifferenceType,
    clearDifferenceTypeFilter,
    expandNode,
    collapseNode,
    expandAll,
    collapseAll,
    expandDifferences,
    exportComparison,
  };
};

/**
 * CSV 형식으로 비교 결과 생성
 */
function generateComparisonCSV(
  comparison: BOMComparison, 
  differences: BOMComparisonDifference[],
  statistics: BOMComparisonState['statistics']
): string {
  const headers = [
    'Type',
    'Node ID',
    'Component Code',
    'Component Name',
    'Source Quantity',
    'Target Quantity',
    'Source Cost',
    'Target Cost',
    'Cost Difference',
    'Description'
  ];
  
  const rows: string[] = [headers.join(',')];
  
  // 통계 정보 추가
  rows.push('# STATISTICS');
  rows.push(`Total Items,${statistics.totalItems}`);
  rows.push(`Added Items,${statistics.addedItems}`);
  rows.push(`Removed Items,${statistics.removedItems}`);
  rows.push(`Modified Items,${statistics.modifiedItems}`);
  rows.push(`Unchanged Items,${statistics.unchangedItems}`);
  rows.push(`Cost Difference,${statistics.costDifference}`);
  rows.push('');
  rows.push('# DIFFERENCES');
  
  // 차이점 데이터 추가
  differences.forEach(diff => {
    const sourceQuantity = diff.sourceNode?.quantity || 0;
    const targetQuantity = diff.targetNode?.quantity || 0;
    const sourceCost = diff.sourceNode?.totalCost || 0;
    const targetCost = diff.targetNode?.totalCost || 0;
    const costDiff = targetCost - sourceCost;
    
    const row = [
      diff.type,
      diff.sourceNode?.id || diff.targetNode?.id || '',
      diff.sourceNode?.componentCode || diff.targetNode?.componentCode || '',
      diff.sourceNode?.componentName || diff.targetNode?.componentName || '',
      sourceQuantity,
      targetQuantity,
      sourceCost,
      targetCost,
      costDiff,
      diff.description
    ].map(value => `"${value}"`);
    
    rows.push(row.join(','));
  });
  
  return rows.join('\n');
}