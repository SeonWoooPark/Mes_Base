import React, { useMemo, useState, useCallback, memo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnDef,
  ExpandedState,
  Row,
} from '@tanstack/react-table';
import { BOMTreeNode } from '../../../application/usecases/bom/GetBOMTreeUseCase';
import { ComponentType } from '../../../domain/entities/BOMItem';
import { Table, Button, StatusBadge, Flex, LoadingSpinner } from '@shared/utils/styled';
import { BOMItemActions } from './BOMItemActions';
import styled from 'styled-components';

/**
 * BOM 트리 테이블 Props
 */
interface BOMTreeTableProps {
  nodes: BOMTreeNode[];                    // 표시할 트리 노드들
  expandedNodes: Set<string>;              // 펼쳐진 노드 ID들
  loading: boolean;                        // 로딩 상태
  onToggleNode: (nodeId: string) => void;  // 노드 펼침/접기
  onEditItem: (node: BOMTreeNode) => void; // 아이템 수정
  onDeleteItem: (node: BOMTreeNode) => void; // 아이템 삭제
  onAddChild: (node: BOMTreeNode) => void; // 하위 아이템 추가
  onAddRootItem?: () => void;              // 루트 아이템 추가 (빈 BOM일 때)
  onSort?: (field: string, direction: 'asc' | 'desc') => void; // 정렬
  readonly?: boolean;                      // 읽기 전용 모드
}

/**
 * 트리 구조를 위한 스타일드 컴포넌트
 */
const TreeCell = styled.div<{ level: number; hasChildren: boolean }>`
  display: flex;
  align-items: center;
  padding-left: ${props => Math.max(0, props.level - 1) * 20}px;
  
  .tree-toggle {
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
    
    ${props => !props.hasChildren && `
      visibility: hidden;
    `}
  }
  
  .tree-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
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
  
  ${props => {
    switch (props.type) {
      case ComponentType.RAW_MATERIAL:
        return 'background-color: #6c757d;'; // 회색
      case ComponentType.SEMI_FINISHED:
        return 'background-color: #fd7e14;'; // 주황색
      case ComponentType.PURCHASED_PART:
        return 'background-color: #20c997;'; // 청록색
      case ComponentType.SUB_ASSEMBLY:
        return 'background-color: #0d6efd;'; // 파란색
      case ComponentType.CONSUMABLE:
        return 'background-color: #dc3545;'; // 빨간색
      default:
        return 'background-color: #6c757d;';
    }
  }}
`;

const QuantityCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  
  .primary-quantity {
    font-weight: bold;
  }
  
  .actual-quantity {
    font-size: 11px;
    color: #666;
  }
`;

const CostCell = styled.div`
  text-align: right;
  
  .unit-cost {
    font-weight: bold;
  }
  
  .total-cost {
    font-size: 11px;
    color: #666;
  }
`;

const columnHelper = createColumnHelper<BOMTreeNode>();

// 메모화된 컴포넌트 타입 아이콘
const MemoizedComponentTypeIcon = memo<{ type: ComponentType; children: React.ReactNode }>(
  ({ type, children }) => (
    <ComponentTypeIcon type={type}>{children}</ComponentTypeIcon>
  )
);
MemoizedComponentTypeIcon.displayName = 'MemoizedComponentTypeIcon';

// 메모화된 상태 배지
const MemoizedStatusBadge = memo<{ 
  active: boolean; 
  children: React.ReactNode; 
  style?: React.CSSProperties 
}>(({ active, children, style }) => (
  <StatusBadge active={active} style={style}>{children}</StatusBadge>
));
MemoizedStatusBadge.displayName = 'MemoizedStatusBadge';

// 트리 토글 버튼 메모화
const TreeToggleButton = memo<{
  nodeId: string;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggle: (nodeId: string) => void;
}>(({ nodeId, hasChildren, isExpanded, onToggle }) => {
  const handleToggle = useCallback(() => onToggle(nodeId), [onToggle, nodeId]);
  
  return (
    <button 
      className="tree-toggle"
      onClick={handleToggle}
      title={isExpanded ? '접기' : '펼치기'}
    >
      {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
    </button>
  );
});
TreeToggleButton.displayName = 'TreeToggleButton';

/**
 * BOM 트리 테이블 컴포넌트
 * 
 * 기능:
 * - 계층적 트리 구조 시각화
 * - TanStack Table 기반 성능 최적화
 * - 인라인 액션 버튼
 * - 구성품 유형별 아이콘 표시
 * - 실시간 비용 계산 표시
 */
export const BOMTreeTable: React.FC<BOMTreeTableProps> = memo(({
  nodes,
  expandedNodes,
  loading,
  onToggleNode,
  onEditItem,
  onDeleteItem,
  onAddChild,
  onAddRootItem,
  onSort,
  readonly = false,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  // === 컴포넌트 유형 표시명 매핑 ===
  const componentTypeLabels: Record<ComponentType, string> = useMemo(() => ({
    [ComponentType.RAW_MATERIAL]: '원자재',
    [ComponentType.SEMI_FINISHED]: '반제품',
    [ComponentType.PURCHASED_PART]: '구매품',
    [ComponentType.SUB_ASSEMBLY]: '조립품',
    [ComponentType.CONSUMABLE]: '소모품',
  }), []);

  // === 하위 노드 확인 함수 ===
  const hasChildren = useCallback((node: BOMTreeNode): boolean => {
    // 먼저 children 배열 확인
    if (node.children && node.children.length > 0) {
      return true;
    }
    // hasChildren 플래그 확인
    if (node.hasChildren) {
      return true;
    }
    // 플랫 리스트에서 확인
    return nodes.some(n => n.parentId === node.id);
  }, [nodes]);

  // === 가시적 노드 필터링 ===
  const visibleNodes = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];
    
    const result: BOMTreeNode[] = [];
    
    const addNodeAndChildren = (node: BOMTreeNode, parentExpanded: boolean = true) => {
      // 부모가 펼쳐져 있을 때만 노드를 추가
      if (parentExpanded) {
        result.push(node);
        
        // 현재 노드가 펼쳐져 있고 자식이 있으면 자식 노드들도 추가
        const isExpanded = expandedNodes.has(node.id);
        if (node.children && node.children.length > 0) {
          node.children
            .sort((a, b) => a.sequence - b.sequence)
            .forEach(child => addNodeAndChildren(child, isExpanded));
        }
      }
    };
    
    // 트리 구조가 이미 children을 통해 형성되어 있는지 확인
    // 루트 노드가 있고, 그 루트 노드가 children을 가지고 있는지 확인
    const rootNodes = nodes.filter(node => !node.parentId);
    const hasTreeStructure = rootNodes.length > 0 && 
      rootNodes.some(root => root.children && root.children.length > 0);
    
    if (hasTreeStructure) {
      // 이미 트리 구조가 있는 경우 루트 노드들부터 시작
      rootNodes
        .sort((a, b) => a.sequence - b.sequence)
        .forEach(rootNode => addNodeAndChildren(rootNode));
    } else {
      // 플랫 리스트인 경우 - 서버에서 받은 노드들을 그대로 사용
      // 모든 노드를 레벨 순으로 정렬하여 표시
      const sortedNodes = [...nodes].sort((a, b) => {
        // 레벨이 같으면 sequence로 정렬
        if (a.level === b.level) {
          return a.sequence - b.sequence;
        }
        // 레벨이 다르면 레벨로 정렬
        return a.level - b.level;
      });
      
      // 각 노드를 확인하여 부모가 펼쳐져 있는지 확인
      sortedNodes.forEach(node => {
        // 루트 노드는 항상 표시
        if (!node.parentId) {
          result.push(node);
        } else {
          // 부모 노드가 펼쳐져 있는지 확인
          if (expandedNodes.has(node.parentId)) {
            result.push(node);
          }
        }
      });
    }
    
    return result;
  }, [nodes, expandedNodes]);

  // === 테이블 컬럼 정의 ===
  const columns = useMemo<ColumnDef<BOMTreeNode, any>[]>(() => [
    // 구성품 정보 (트리 구조 포함)
    columnHelper.accessor('componentName', {
      header: '구성품',
      enableSorting: false,
      cell: (info) => {
        const node = info.row.original;
        const nodeHasChildren = hasChildren(node);
        const isExpanded = expandedNodes.has(node.id);
        
        return (
          <TreeCell level={node.level} hasChildren={nodeHasChildren}>
            <TreeToggleButton 
              nodeId={node.id}
              hasChildren={nodeHasChildren}
              isExpanded={isExpanded}
              onToggle={onToggleNode}
            />
            
            <div className="tree-content">
              <MemoizedComponentTypeIcon type={node.componentType as ComponentType}>
                {componentTypeLabels[node.componentType as ComponentType]?.[0] || 'C'}
              </MemoizedComponentTypeIcon>
              
              <div>
                <div style={{ fontWeight: 'bold' }}>
                  {node.componentName}
                </div>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  {node.componentCode}
                </div>
              </div>
            </div>
          </TreeCell>
        );
      },
    }),

    // 구성품 유형
    columnHelper.accessor('componentTypeDisplay', {
      header: '유형',
      size: 80,
    }),

    // 수량 정보
    columnHelper.accessor('quantity', {
      header: '수량',
      size: 100,
      cell: (info) => {
        const node = info.row.original;
        return (
          <QuantityCell>
            <div className="primary-quantity">
              {node.quantity.toLocaleString()} {node.unitName}
            </div>
            {node.actualQuantity !== node.quantity && (
              <div className="actual-quantity">
                실제: {node.actualQuantity.toLocaleString()}
              </div>
            )}
          </QuantityCell>
        );
      },
    }),

    // 단가 및 총비용
    columnHelper.accessor('unitCost', {
      header: '단가/총비용',
      size: 120,
      cell: (info) => {
        const node = info.row.original;
        return (
          <CostCell>
            <div className="unit-cost">
              ₩{node.unitCost.toLocaleString()}
            </div>
            <div className="total-cost">
              총: ₩{node.totalCost.toLocaleString()}
            </div>
          </CostCell>
        );
      },
    }),

    // 스크랩률
    columnHelper.accessor('scrapRate', {
      header: '스크랩률',
      size: 80,
      cell: (info) => `${info.getValue()}%`,
    }),

    // 위치/공정
    columnHelper.accessor('position', {
      header: '위치/공정',
      size: 100,
      cell: (info) => {
        const node = info.row.original;
        return (
          <div>
            {node.position && (
              <div style={{ fontSize: '12px' }}>{node.position}</div>
            )}
            {node.processStep && (
              <div style={{ fontSize: '11px', color: '#666' }}>
                {node.processStep}
              </div>
            )}
          </div>
        );
      },
    }),

    // 상태
    columnHelper.accessor('isActive', {
      header: '상태',
      size: 70,
      enableSorting: false,
      cell: (info) => {
        const node = info.row.original;
        return (
          <Flex gap={4}>
            <MemoizedStatusBadge active={node.isActive}>
              {node.isActive ? '활성' : '비활성'}
            </MemoizedStatusBadge>
            {node.isOptional && (
              <MemoizedStatusBadge active={false} style={{ fontSize: '10px' }}>
                선택
              </MemoizedStatusBadge>
            )}
          </Flex>
        );
      },
    }),

    // 작업 버튼들
    ...(readonly ? [] : [
      columnHelper.display({
        id: 'actions',
        header: '작업',
        size: 140,
        enableSorting: false,
        cell: (info) => (
          <BOMItemActions
            node={info.row.original}
            onEdit={() => onEditItem(info.row.original)}
            onDelete={() => onDeleteItem(info.row.original)}
            onAddChild={() => onAddChild(info.row.original)}
          />
        ),
      }),
    ]),
  ], [
    hasChildren, 
    expandedNodes, 
    onToggleNode, 
    onEditItem, 
    onDeleteItem, 
    onAddChild, 
    readonly,
    componentTypeLabels,
  ]);

  // === React Table 설정 ===
  const table = useReactTable({
    data: visibleNodes,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  // === 정렬 변경 핸들러 ===
  const handleSort = useCallback((columnId: string) => {
    const column = table.getColumn(columnId);
    if (column?.getCanSort() && onSort) {
      const currentSort = column.getIsSorted();
      const newDirection = currentSort === 'asc' ? 'desc' : 'asc';
      onSort(columnId, newDirection);
    }
  }, [table, onSort]);

  // === 로딩 상태 렌더링 ===
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
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
        padding: '40px', 
        color: '#666',
        background: '#f8f9fa',
        borderRadius: '8px',
        border: '1px dashed #ddd'
      }}>
        <div style={{ fontSize: '18px', marginBottom: '8px' }}>📋</div>
        <div>BOM 데이터가 없습니다</div>
        <div style={{ fontSize: '14px', marginTop: '4px', marginBottom: '20px' }}>
          구성품을 추가하여 BOM을 구성하세요.
        </div>
        {!readonly && onAddRootItem && (
          <Button 
            variant="primary" 
            onClick={onAddRootItem}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px'
            }}
          >
            ➕ 첫 번째 구성품 추가
          </Button>
        )}
      </div>
    );
  }

  // === 메인 렌더링 ===
  return (
    <Table style={{ marginTop: 0 }}>
      <thead>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th
                key={header.id}
                style={{ 
                  width: header.getSize(),
                  cursor: header.column.getCanSort() ? 'pointer' : 'default',
                }}
                onClick={() => header.column.getCanSort() && handleSort(header.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getCanSort() && (
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      {header.column.getIsSorted() === 'asc' ? '↑' :
                       header.column.getIsSorted() === 'desc' ? '↓' : '↕'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row: Row<BOMTreeNode>) => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
});
BOMTreeTable.displayName = 'BOMTreeTable';