import React, { memo, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { ProductListItem } from '../../../application/usecases/product/GetProductListUseCase';
import { Table, Button, StatusBadge, Flex, LoadingSpinner } from '@shared/utils/styled';
import { format } from 'date-fns';

interface ProductTableProps {
  products: ProductListItem[];
  loading: boolean;
  onSort: (field: string, direction: 'asc' | 'desc') => void;
  onEdit: (product: ProductListItem) => void;
  onDelete: (product: ProductListItem) => void;
  onViewHistory: (product: ProductListItem) => void;
  onBOMManage?: (product: ProductListItem) => void;
}

const columnHelper = createColumnHelper<ProductListItem>();

// StatusBadge 메모화된 컴포넌트
const MemoizedStatusBadge = memo<{ active: boolean; children: React.ReactNode }>(
  ({ active, children }) => (
    <StatusBadge active={active}>{children}</StatusBadge>
  )
);
MemoizedStatusBadge.displayName = 'MemoizedStatusBadge';

// 액션 버튼 컴포넌트 메모화
const ActionButtons = memo<{
  product: ProductListItem;
  onEdit: (product: ProductListItem) => void;
  onDelete: (product: ProductListItem) => void;
  onViewHistory: (product: ProductListItem) => void;
  onBOMManage?: (product: ProductListItem) => void;
}>(({ product, onEdit, onDelete, onViewHistory, onBOMManage }) => {
  const handleEdit = useCallback(() => onEdit(product), [onEdit, product]);
  const handleDelete = useCallback(() => onDelete(product), [onDelete, product]);
  const handleViewHistory = useCallback(() => onViewHistory(product), [onViewHistory, product]);
  const handleBOMManage = useCallback(() => onBOMManage?.(product), [onBOMManage, product]);

  return (
    <Flex gap={4}>
      <Button 
        variant="secondary" 
        onClick={handleEdit}
        style={{ fontSize: '12px', padding: '4px 8px' }}
      >
        수정
      </Button>
      <Button 
        variant="danger" 
        onClick={handleDelete}
        style={{ fontSize: '12px', padding: '4px 8px' }}
      >
        삭제
      </Button>
      <Button 
        onClick={handleViewHistory}
        style={{ fontSize: '12px', padding: '4px 8px' }}
      >
        이력
      </Button>
      {onBOMManage && (
        <Button 
          onClick={handleBOMManage}
          style={{ 
            fontSize: '12px', 
            padding: '4px 8px',
            background: '#28a745',
            color: 'white'
          }}
        >
          BOM
        </Button>
      )}
    </Flex>
  );
});
ActionButtons.displayName = 'ActionButtons';

export const ProductTable: React.FC<ProductTableProps> = memo(({
  products,
  loading,
  onSort,
  onEdit,
  onDelete,
  onViewHistory,
  onBOMManage,
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = useMemo<ColumnDef<ProductListItem, any>[]>(
    () => [
      columnHelper.accessor('cd_material', {
        header: '제품코드',
        cell: (info) => (
          <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor('nm_material', {
        header: '제품명',
      }),
      columnHelper.accessor('typeName', {
        header: '제품유형',
      }),
      columnHelper.accessor('categoryName', {
        header: '카테고리',
      }),
      columnHelper.accessor('unitName', {
        header: '단위',
      }),
      columnHelper.accessor('safetyStock', {
        header: '안전재고',
        cell: (info) => (
          <div style={{ textAlign: 'right' }}>
            {info.getValue().toLocaleString()}
          </div>
        ),
      }),
      columnHelper.accessor('statusDisplay', {
        header: '상태',
        enableSorting: false,
        cell: (info) => (
          <MemoizedStatusBadge active={info.row.original.isActive}>
            {info.getValue()}
          </MemoizedStatusBadge>
        ),
      }),
      columnHelper.accessor('lastUpdated', {
        header: '최종수정일',
        cell: (info) => format(new Date(info.getValue()), 'yyyy-MM-dd HH:mm'),
      }),
      columnHelper.display({
        id: 'actions',
        header: '작업',
        enableSorting: false,
        cell: (info) => (
          <ActionButtons
            product={info.row.original}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewHistory={onViewHistory}
            onBOMManage={onBOMManage}
          />
        ),
      }),
    ],
    [onEdit, onDelete, onViewHistory, onBOMManage]
  );

  const table = useReactTable({
    data: products,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleSortingEffect = useCallback(() => {
    if (sorting.length > 0) {
      const sort = sorting[0];
      onSort(sort.id, sort.desc ? 'desc' : 'asc');
    }
  }, [sorting, onSort]);

  React.useEffect(() => {
    handleSortingEffect();
  }, [handleSortingEffect]);

  if (loading) {
    return (
      <Flex justify="center" style={{ padding: '40px' }}>
        <LoadingSpinner />
        <span style={{ marginLeft: '8px' }}>데이터를 불러오는 중...</span>
      </Flex>
    );
  }

  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        등록된 제품이 없습니다.
      </div>
    );
  }

  return (
    <Table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                style={{
                  cursor: header.column.getCanSort() ? 'pointer' : 'default',
                  userSelect: 'none',
                  width: header.id === 'actions' ? '200px' : 'auto',
                }}
              >
                <Flex gap={4}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getCanSort() && (
                    <span style={{ fontSize: '12px', opacity: 0.6 }}>
                      {{
                        asc: '▲',
                        desc: '▼',
                      }[header.column.getIsSorted() as string] ?? ''}
                    </span>
                  )}
                </Flex>
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
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
ProductTable.displayName = 'ProductTable';