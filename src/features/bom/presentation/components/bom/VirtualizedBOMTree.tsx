import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { BOMTreeNode } from '../../../application/usecases/bom/GetBOMTreeUseCase';
import { ComponentType } from '../../../domain/entities/BOMItem';
import { BOMItemActions } from './BOMItemActions';
import { LoadingSpinner, StatusBadge, Flex } from '@shared/utils/styled';
import styled from 'styled-components';

/**
 * 가상화 BOM 트리 Props
 */
interface VirtualizedBOMTreeProps {
  nodes: BOMTreeNode[];                    // 표시할 트리 노드들
  expandedNodes: Set<string>;              // 펼쳐진 노드 ID들
  loading: boolean;                        // 로딩 상태
  width?: number;                          // 컨테이너 너비
  height?: number;                         // 컨테이너 높이
  itemHeight?: number;                     // 각 항목 높이
  onToggleNode: (nodeId: string) => void;  // 노드 펼침/접기
  onEditItem: (node: BOMTreeNode) => void; // 아이템 수정
  onDeleteItem: (node: BOMTreeNode) => void; // 아이템 삭제
  onAddChild: (node: BOMTreeNode) => void; // 하위 아이템 추가
  onNodeSelect?: (node: BOMTreeNode) => void; // 노드 선택
  selectedNodes?: Set<string>;             // 선택된 노드들
  readonly?: boolean;                      // 읽기 전용 모드
}

/**
 * 가상화된 노드 아이템 Props
 */
interface VirtualizedNodeItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    visibleNodes: BOMTreeNode[];
    expandedNodes: Set<string>;
    selectedNodes: Set<string>;
    hasChildren: (nodeId: string) => boolean;
    onToggleNode: (nodeId: string) => void;
    onEditItem: (node: BOMTreeNode) => void;
    onDeleteItem: (node: BOMTreeNode) => void;
    onAddChild: (node: BOMTreeNode) => void;
    onNodeSelect?: (node: BOMTreeNode) => void;
    readonly: boolean;
  };
}

/**
 * 트리 노드 스타일 컴포넌트
 */
const VirtualTreeItem = styled.div<{ 
  level: number; 
  selected: boolean;
  hover?: boolean;
}>`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  padding-left: ${props => 12 + props.level * 20}px;
  background: ${props => {
    if (props.selected) return '#e3f2fd';
    if (props.hover) return '#f5f5f5';
    return 'white';
  }};
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.15s;
  
  &:hover {
    background-color: ${props => props.selected ? '#e3f2fd' : '#f5f5f5'};
  }
`;

const TreeToggle = styled.button`
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
  margin-right: 8px;
  
  &:hover {
    background-color: #f0f0f0;
    border-radius: 2px;
  }
`;

const ComponentTypeIcon = styled.span<{ type: ComponentType }>`
  width: 16px;
  height: 16px;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  color: white;
  margin-right: 8px;
  
  ${props => {
    switch (props.type) {
      case ComponentType.RAW_MATERIAL:
        return 'background-color: #6c757d;';
      case ComponentType.SEMI_FINISHED:
        return 'background-color: #fd7e14;';
      case ComponentType.PURCHASED_PART:
        return 'background-color: #20c997;';
      case ComponentType.SUB_ASSEMBLY:
        return 'background-color: #0d6efd;';
      case ComponentType.CONSUMABLE:
        return 'background-color: #dc3545;';
      default:
        return 'background-color: #6c757d;';
    }
  }}
`;

const NodeContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0; // 텍스트 오버플로우 처리
`;

const NodeInfo = styled.div`
  flex: 1;
  min-width: 0;
  
  .name {
    font-weight: bold;
    font-size: 14px;
    color: #333;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .code {
    font-size: 12px;
    color: #666;
    font-family: monospace;
  }
`;

const NodeStats = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  
  .stat {
    text-align: right;
    
    .value {
      font-weight: bold;
      font-size: 13px;
    }
    
    .label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
    }
  }
`;

/**
 * 가상화된 노드 아이템 컴포넌트
 */
const VirtualizedNodeItem: React.FC<VirtualizedNodeItemProps> = ({ index, style, data }) => {
  const {
    visibleNodes,
    expandedNodes,
    selectedNodes,
    hasChildren,
    onToggleNode,
    onEditItem,
    onDeleteItem,
    onAddChild,
    onNodeSelect,
    readonly,
  } = data;
  
  const node = visibleNodes[index];
  const [isHovered, setIsHovered] = useState(false);
  
  if (!node) return null;
  
  const nodeHasChildren = hasChildren(node.id);
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNodes.has(node.id);
  
  const componentTypeLabels: Record<ComponentType, string> = {
    [ComponentType.RAW_MATERIAL]: '원자재',
    [ComponentType.SEMI_FINISHED]: '반제품',
    [ComponentType.PURCHASED_PART]: '구매품',
    [ComponentType.SUB_ASSEMBLY]: '조립품',
    [ComponentType.CONSUMABLE]: '소모품',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNodeSelect) {
      onNodeSelect(node);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleNode(node.id);
  };

  return (
    <div style={style}>
      <VirtualTreeItem
        level={node.level}
        selected={isSelected}
        hover={isHovered}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 트리 토글 버튼 */}
        <TreeToggle
          onClick={handleToggle}
          style={{ visibility: nodeHasChildren ? 'visible' : 'hidden' }}
          title={isExpanded ? '접기' : '펼치기'}
        >
          {nodeHasChildren ? (isExpanded ? '▼' : '▶') : ''}
        </TreeToggle>

        {/* 노드 콘텐츠 */}
        <NodeContent>
          {/* 구성품 유형 아이콘 */}
          <ComponentTypeIcon type={node.componentType as ComponentType}>
            {componentTypeLabels[node.componentType as ComponentType]?.[0] || 'C'}
          </ComponentTypeIcon>

          {/* 노드 정보 */}
          <NodeInfo>
            <div className="name" title={node.componentName}>
              {node.componentName}
            </div>
            <div className="code">{node.componentCode}</div>
          </NodeInfo>

          {/* 통계 정보 */}
          <NodeStats>
            <div className="stat">
              <div className="value">{node.quantity.toLocaleString()}</div>
              <div className="label">{node.unitName}</div>
            </div>
            
            <div className="stat">
              <div className="value">₩{node.unitCost.toLocaleString()}</div>
              <div className="label">단가</div>
            </div>
            
            <div className="stat">
              <div className="value">₩{node.totalCost.toLocaleString()}</div>
              <div className="label">총액</div>
            </div>
          </NodeStats>

          {/* 상태 배지 */}
          <Flex gap={4}>
            <StatusBadge active={node.isActive}>
              {node.isActive ? '활성' : '비활성'}
            </StatusBadge>
            {node.isOptional && (
              <StatusBadge active={false} style={{ fontSize: '10px' }}>
                선택
              </StatusBadge>
            )}
          </Flex>

          {/* 액션 버튼들 */}
          {!readonly && (isHovered || isSelected) && (
            <BOMItemActions
              node={node}
              onEdit={() => onEditItem(node)}
              onDelete={() => onDeleteItem(node)}
              onAddChild={() => onAddChild(node)}
              readonly={readonly}
            />
          )}
        </NodeContent>
      </VirtualTreeItem>
    </div>
  );
};

/**
 * 가상화된 BOM 트리 컴포넌트
 * 
 * 기능:
 * - 대량 데이터 성능 최적화 (react-window 사용)
 * - 키보드 네비게이션 지원
 * - 선택 상태 관리
 * - 부드러운 스크롤 및 애니메이션
 * - 동적 높이 조정
 */
export const VirtualizedBOMTree: React.FC<VirtualizedBOMTreeProps> = ({
  nodes,
  expandedNodes,
  loading,
  width = 800,
  height = 600,
  itemHeight = 60,
  onToggleNode,
  onEditItem,
  onDeleteItem,
  onAddChild,
  onNodeSelect,
  selectedNodes = new Set(),
  readonly = false,
}) => {
  const listRef = useRef<List>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // === 가시적 노드 필터링 ===
  const visibleNodes = useMemo(() => {
    const result: BOMTreeNode[] = [];
    
    const addNodeAndChildren = (node: BOMTreeNode) => {
      result.push(node);
      
      // 현재 노드가 펼쳐져 있으면 자식 노드들도 추가
      if (expandedNodes.has(node.id)) {
        const children = nodes
          .filter(child => child.parentId === node.id)
          .sort((a, b) => a.sequence - b.sequence);
          
        children.forEach(child => addNodeAndChildren(child));
      }
    };
    
    // 최상위 노드들부터 시작
    const rootNodes = nodes
      .filter(node => !node.parentId)
      .sort((a, b) => a.sequence - b.sequence);
      
    rootNodes.forEach(rootNode => addNodeAndChildren(rootNode));
    
    return result;
  }, [nodes, expandedNodes]);

  // === 하위 노드 확인 함수 ===
  const hasChildren = useCallback((nodeId: string): boolean => {
    return nodes.some(node => node.parentId === nodeId);
  }, [nodes]);

  // === 키보드 네비게이션 ===
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!visibleNodes.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, visibleNodes.length - 1));
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        const currentNode = visibleNodes[focusedIndex];
        if (currentNode && hasChildren(currentNode.id) && !expandedNodes.has(currentNode.id)) {
          onToggleNode(currentNode.id);
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        const currentNodeLeft = visibleNodes[focusedIndex];
        if (currentNodeLeft && expandedNodes.has(currentNodeLeft.id)) {
          onToggleNode(currentNodeLeft.id);
        }
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        const selectedNode = visibleNodes[focusedIndex];
        if (selectedNode && onNodeSelect) {
          onNodeSelect(selectedNode);
        }
        break;
    }
  }, [visibleNodes, focusedIndex, expandedNodes, hasChildren, onToggleNode, onNodeSelect]);

  // === 키보드 이벤트 등록 ===
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // === 포커스된 아이템으로 스크롤 ===
  useEffect(() => {
    if (listRef.current && focusedIndex >= 0) {
      listRef.current.scrollToItem(focusedIndex, 'smart');
    }
  }, [focusedIndex]);

  // === 아이템 데이터 메모이제이션 ===
  const itemData = useMemo(() => ({
    visibleNodes,
    expandedNodes,
    selectedNodes,
    hasChildren,
    onToggleNode,
    onEditItem,
    onDeleteItem,
    onAddChild,
    onNodeSelect,
    readonly,
  }), [
    visibleNodes,
    expandedNodes,
    selectedNodes,
    hasChildren,
    onToggleNode,
    onEditItem,
    onDeleteItem,
    onAddChild,
    onNodeSelect,
    readonly,
  ]);

  // === 로딩 상태 렌더링 ===
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: height,
        background: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <LoadingSpinner />
        <span style={{ marginLeft: '12px' }}>BOM 트리를 불러오는 중...</span>
      </div>
    );
  }

  // === 데이터 없음 상태 ===
  if (visibleNodes.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px', 
        color: '#666',
        background: '#f8f9fa',
        borderRadius: '8px',
        border: '1px dashed #ddd',
        height: height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
        <div style={{ fontSize: '18px', marginBottom: '8px' }}>BOM 데이터가 없습니다</div>
        <div style={{ fontSize: '14px' }}>
          구성품을 추가하여 BOM을 구성하세요.
        </div>
      </div>
    );
  }

  // === 메인 렌더링 ===
  return (
    <div style={{ 
      border: '1px solid #ddd',
      borderRadius: '8px',
      overflow: 'hidden',
      background: 'white'
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '12px 16px',
        background: '#f8f9fa',
        borderBottom: '1px solid #ddd',
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#666'
      }}>
        BOM 트리 구조 ({visibleNodes.length}개 항목)
      </div>

      {/* 가상화된 리스트 */}
      <List
        ref={listRef}
        width={width}
        height={height - 50} // 헤더 높이 제외
        itemCount={visibleNodes.length}
        itemSize={itemHeight}
        itemData={itemData}
        overscanCount={5} // 성능 최적화를 위한 오버스캔
      >
        {VirtualizedNodeItem}
      </List>
    </div>
  );
};