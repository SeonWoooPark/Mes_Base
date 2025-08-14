import { useState, useEffect, useCallback } from 'react';
import { 
  GetBOMTreeRequest, 
  GetBOMTreeResponse, 
  BOMTreeNode, 
  BOMInfo 
} from '../../application/usecases/bom/GetBOMTreeUseCase';
import { ComponentType } from '../../domain/entities/BOMItem';
import { DIContainer } from '../../config/DIContainer';

/**
 * BOM 트리 상태 인터페이스
 */
export interface UseBOMTreeState {
  bomInfo: BOMInfo | null;               // BOM 기본 정보
  treeNodes: BOMTreeNode[];              // 트리 노드 목록
  expandedNodes: Set<string>;            // 펼쳐진 노드 ID 집합
  filteredNodes: BOMTreeNode[];          // 필터링된 노드 목록
  totalItems: number;                    // 총 아이템 수
  totalCost: number;                     // 총 비용
  maxLevel: number;                      // 최대 레벨
  loading: boolean;                      // 로딩 상태
  error: string | null;                  // 에러 상태
}

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
 * BOM 트리 액션 인터페이스
 */
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

/**
 * BOM 트리 관리 커스텀 훅
 * 
 * 주요 기능:
 * - BOM 트리 데이터 조회 및 상태 관리
 * - 트리 노드 펼침/접기 상태 관리
 * - 실시간 필터링 기능
 * - 트리 네비게이션 유틸리티
 * - 성능 최적화 (메모이제이션)
 */
export const useBOMTree = (
  productId?: string
): UseBOMTreeState & UseBOMTreeActions => {
  // === 상태 관리 ===
  const [state, setState] = useState<UseBOMTreeState>({
    bomInfo: null,
    treeNodes: [],
    expandedNodes: new Set(),
    filteredNodes: [],
    totalItems: 0,
    totalCost: 0,
    maxLevel: 0,
    loading: false,
    error: null,
  });

  const [currentRequest, setCurrentRequest] = useState<GetBOMTreeRequest | null>(null);
  const [currentFilter, setCurrentFilter] = useState<BOMTreeFilter>({});

  // === 의존성 주입 ===
  const getBOMTreeUseCase = DIContainer.getInstance().getBOMTreeUseCase();

  // === 트리 데이터 로드 ===
  const loadBOMTree = useCallback(async (request: GetBOMTreeRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response: GetBOMTreeResponse = await getBOMTreeUseCase.execute(request);

      // 유스케이스는 중첩 트리 형태를 반환한다.
      // 테이블은 parentId가 부모의 id를 가리키는 평면 리스트를 기대하므로 변환한다.
      const flatNodes = flattenTreeNodes(response.treeNodes);

      // 기본 확장 상태 설정 (레벨 1까지 자동 확장) - 평면화된 데이터 기준
      const autoExpandedNodes = new Set<string>(
        flatNodes
          .filter(node => node.level <= 1)
          .map(node => node.id)
      );

      setState(prev => ({
        ...prev,
        bomInfo: response.bomInfo,
        treeNodes: flatNodes,
        expandedNodes: request.expandAll ? new Set(flatNodes.map(n => n.id)) : autoExpandedNodes,
        filteredNodes: flatNodes, // 초기에는 필터링 없음
        totalItems: response.totalItems,
        totalCost: response.totalCost,
        maxLevel: response.maxLevel,
        loading: false,
      }));

      setCurrentRequest(request);
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'BOM 조회 중 오류가 발생했습니다.',
      }));
    }
  }, [getBOMTreeUseCase]);

  // === 트리 노드 제어 ===
  const expandNode = useCallback((nodeId: string) => {
    setState(prev => ({
      ...prev,
      expandedNodes: new Set([...Array.from(prev.expandedNodes), nodeId]),
    }));
  }, []);

  const collapseNode = useCallback((nodeId: string) => {
    setState(prev => {
      const newExpandedNodes = new Set(prev.expandedNodes);
      newExpandedNodes.delete(nodeId);
      
      // 하위 노드들도 함께 접기
      const childNodes = prev.treeNodes.filter(node => 
        node.parentId === nodeId || 
        prev.treeNodes.some(parent => 
          parent.id === node.parentId && isDescendantOf(node, nodeId, prev.treeNodes)
        )
      );
      
      childNodes.forEach(child => newExpandedNodes.delete(child.id));

      return {
        ...prev,
        expandedNodes: newExpandedNodes,
      };
    });
  }, []);

  const toggleNode = useCallback((nodeId: string) => {
    setState(prev => {
      if (prev.expandedNodes.has(nodeId)) {
        // 접기
        const newExpandedNodes = new Set(prev.expandedNodes);
        newExpandedNodes.delete(nodeId);
        
        // 하위 노드들도 함께 접기
        const childNodes = prev.treeNodes.filter(node => 
          isDescendantOf(node, nodeId, prev.treeNodes)
        );
        childNodes.forEach(child => newExpandedNodes.delete(child.id));

        return { ...prev, expandedNodes: newExpandedNodes };
      } else {
        // 펼치기
        return { ...prev, expandedNodes: new Set([...Array.from(prev.expandedNodes), nodeId]) };
      }
    });
  }, []);

  const expandAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      expandedNodes: new Set(prev.treeNodes.map(node => node.id)),
    }));
  }, []);

  const collapseAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      expandedNodes: new Set(), // 모든 노드 접기
    }));
  }, []);

  const expandToLevel = useCallback((level: number) => {
    setState(prev => ({
      ...prev,
      expandedNodes: new Set(
        prev.treeNodes
          .filter(node => node.level <= level)
          .map(node => node.id)
      ),
    }));
  }, []);

  // === 필터링 ===
  const applyFilter = useCallback((nodes: BOMTreeNode[], filter: BOMTreeFilter): BOMTreeNode[] => {
    if (!filter || Object.keys(filter).length === 0) {
      return nodes;
    }

    return nodes.filter(node => {
      // 검색 키워드 필터
      if (filter.searchKeyword && filter.searchKeyword.trim()) {
        const keyword = filter.searchKeyword.toLowerCase();
        const matches = 
          node.componentCode.toLowerCase().includes(keyword) ||
          node.componentName.toLowerCase().includes(keyword);
        if (!matches) return false;
      }

      // 구성품 유형 필터
      if (filter.componentTypes && filter.componentTypes.length > 0) {
        if (!filter.componentTypes.includes(node.componentType as ComponentType)) {
          return false;
        }
      }

      // 레벨 필터
      if (filter.levels && filter.levels.length > 0) {
        if (!filter.levels.includes(node.level)) {
          return false;
        }
      }

      // 비활성 아이템 포함 여부
      if (!filter.includeInactive && !node.isActive) {
        return false;
      }

      // 선택사항 포함 여부
      if (!filter.includeOptional && node.isOptional) {
        return false;
      }

      // 공정 단계 필터
      if (filter.processStep && filter.processStep.trim()) {
        if (node.processStep !== filter.processStep) {
          return false;
        }
      }

      // 비용 범위 필터
      if (filter.costRange) {
        const totalCost = node.totalCost;
        if (filter.costRange.min !== undefined && totalCost < filter.costRange.min) {
          return false;
        }
        if (filter.costRange.max !== undefined && totalCost > filter.costRange.max) {
          return false;
        }
      }

      return true;
    });
  }, []);

  const setFilter = useCallback((filter: BOMTreeFilter) => {
    setCurrentFilter(filter);
    setState(prev => ({
      ...prev,
      filteredNodes: applyFilter(prev.treeNodes, filter),
    }));
  }, [applyFilter]);

  const clearFilter = useCallback(() => {
    setCurrentFilter({});
    setState(prev => ({
      ...prev,
      filteredNodes: prev.treeNodes,
    }));
  }, []);

  // === 유틸리티 함수 ===
  const refresh = useCallback(async () => {
    if (currentRequest) {
      await loadBOMTree(currentRequest);
    }
  }, [currentRequest, loadBOMTree]);

  // === 초기 로드 ===
  useEffect(() => {
    if (productId) {
      loadBOMTree({
        productId,
        maxLevel: 10, // 기본 최대 10레벨
        includeInactive: false,
        expandAll: false,
      });
    }
  }, [productId, loadBOMTree]);

  // === 필터 적용 ===
  useEffect(() => {
    setState(prev => ({
      ...prev,
      filteredNodes: applyFilter(prev.treeNodes, currentFilter),
    }));
  }, [state.treeNodes, currentFilter, applyFilter]);

  return {
    // 상태
    ...state,
    
    // 액션
    loadBOMTree,
    expandNode,
    collapseNode,
    expandAll,
    collapseAll,
    expandToLevel,
    toggleNode,
    setFilter,
    clearFilter,
    refresh,
  };
};

// === 유틸리티 함수들 ===

/**
 * 중첩된 BOM 트리 노드 배열을 테이블용 평면 리스트로 변환한다.
 * - parentId를 부모의 id로 맞춘다 (기존 DTO는 부모의 bomItemId를 갖고 있을 수 있음)
 */
function flattenTreeNodes(nodes: BOMTreeNode[], parentId?: string): BOMTreeNode[] {
  const result: BOMTreeNode[] = [];

  nodes.forEach(node => {
    const current: BOMTreeNode = { ...node, parentId };
    result.push(current);

    if (node.children && node.children.length > 0) {
      result.push(...flattenTreeNodes(node.children, node.id));
    }
  });

  return result;
}

/**
 * 노드가 특정 노드의 후손인지 확인
 */
function isDescendantOf(node: BOMTreeNode, ancestorId: string, allNodes: BOMTreeNode[]): boolean {
  let currentNode = node;
  
  while (currentNode.parentId) {
    if (currentNode.parentId === ancestorId) {
      return true;
    }
    
    const parentNode = allNodes.find(n => n.id === currentNode.parentId);
    if (!parentNode) break;
    currentNode = parentNode;
  }
  
  return false;
}