import React from 'react';
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

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  loading,
  onSort,
  onEdit,
  onDelete,
  onViewHistory,
  onBOMManage,
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = React.useMemo<ColumnDef<ProductListItem, any>[]>(
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
          <StatusBadge active={info.row.original.isActive}>
            {info.getValue()}
          </StatusBadge>
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
          <Flex gap={4}>
            <Button 
              variant="secondary" 
              onClick={() => onEdit(info.row.original)}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              수정
            </Button>
            <Button 
              variant="danger" 
              onClick={() => onDelete(info.row.original)}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              삭제
            </Button>
            <Button 
              onClick={() => onViewHistory(info.row.original)}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              이력
            </Button>
            {onBOMManage && (
              <Button 
                onClick={() => onBOMManage(info.row.original)}
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

  React.useEffect(() => {
    if (sorting.length > 0) {
      const sort = sorting[0];
      onSort(sort.id, sort.desc ? 'desc' : 'asc');
    }
  }, [sorting, onSort]);

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
};