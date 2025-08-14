/**
 * 테이블 컴포넌트
 * 
 * 데이터를 테이블 형태로 표시하고 정렬, 액션 버튼 등을 제공합니다.
 * 기존 ProductTable을 일반화한 버전입니다.
 */

import React, { useCallback } from 'react';
import { TableConfig } from './types';
import { TableColumn } from '../../../shared/types/common';
import { Button } from '../../../presentation/utils/styled';

interface TableProps<T> {
  config: TableConfig<T>;
  data: T[];
  loading: boolean;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onView: (item: T) => void;
  onSort: (sortBy: string, direction: 'asc' | 'desc') => void;
}

export function TableComponent<T extends { id: string }>({
  config,
  data,
  loading,
  onEdit,
  onDelete,
  onView,
  onSort
}: TableProps<T>) {
  
  // === 정렬 상태 관리 ===
  const [sortBy, setSortBy] = React.useState(config.defaultSort?.field || 'id');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>(
    config.defaultSort?.direction || 'desc'
  );

  // === 정렬 핸들러 ===
  const handleSort = useCallback((columnKey: string) => {
    const newDirection = sortBy === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortBy(columnKey);
    setSortDirection(newDirection);
    onSort(columnKey, newDirection);
  }, [sortBy, sortDirection, onSort]);

  // === 정렬 아이콘 표시 ===
  const getSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) return '↕️';
    return sortDirection === 'asc' ? '🔼' : '🔽';
  };

  // === 셀 값 렌더링 ===
  const renderCell = useCallback((column: TableColumn<T>, item: T, index: number) => {
    const value = (item as any)[column.key];
    
    if (column.render) {
      return column.render(value, item, index);
    }
    
    // 기본 렌더링
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '예' : '아니오';
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'number') return value.toLocaleString();
    
    return String(value);
  }, []);

  // === 액션 버튼들 ===
  const renderActions = useCallback((item: T) => {
    const actions = [];

    // 상세보기
    if (config.actions.view) {
      actions.push(
        <Button
          key="view"
          size="small"
          variant="secondary"
          onClick={() => onView(item)}
          style={{ marginRight: '4px' }}
        >
          {config.actions.view.label || '보기'}
        </Button>
      );
    }

    // 수정
    if (config.actions.edit) {
      actions.push(
        <Button
          key="edit"
          size="small"
          onClick={() => onEdit(item)}
          style={{ marginRight: '4px' }}
        >
          {config.actions.edit.label || '수정'}
        </Button>
      );
    }

    // 삭제
    if (config.actions.delete) {
      actions.push(
        <Button
          key="delete"
          size="small"
          variant="danger"
          onClick={() => onDelete(item)}
        >
          {config.actions.delete.label || '삭제'}
        </Button>
      );
    }

    // 커스텀 액션들
    if (config.actions.custom) {
      config.actions.custom.forEach(action => {
        if (action.visible && !action.visible(item)) return;

        actions.push(
          <Button
            key={action.key}
            size="small"
            variant={action.variant || 'secondary'}
            onClick={() => action.handler(item)}
            disabled={action.disabled ? action.disabled(item) : false}
            style={{ marginRight: '4px' }}
          >
            {action.icon && <span style={{ marginRight: '4px' }}>{action.icon}</span>}
            {action.label}
          </Button>
        );
      });
    }

    return actions;
  }, [config, onView, onEdit, onDelete]);

  // === 스타일 ===
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    backgroundColor: 'white',
    border: '1px solid #e9ecef'
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
    fontWeight: 'bold',
    color: '#495057'
  };

  const headerCellStyle: React.CSSProperties = {
    padding: '12px 8px',
    textAlign: 'left',
    borderRight: '1px solid #dee2e6',
    cursor: 'pointer',
    userSelect: 'none'
  };

  const cellStyle: React.CSSProperties = {
    padding: '8px',
    borderRight: '1px solid #dee2e6',
    borderBottom: '1px solid #dee2e6'
  };

  const rowStyle: React.CSSProperties = {
    ':hover': {
      backgroundColor: '#f8f9fa'
    }
  };

  // === 로딩 상태 ===
  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px', 
        color: '#666',
        fontSize: '16px' 
      }}>
        <div style={{ marginBottom: '8px' }}>⏳</div>
        데이터를 불러오는 중...
      </div>
    );
  }

  // === 데이터 없음 ===
  if (data.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px', 
        color: '#666',
        fontSize: '16px',
        background: '#f8f9fa',
        borderRadius: '4px',
        border: '1px dashed #dee2e6'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
        <div>표시할 데이터가 없습니다.</div>
      </div>
    );
  }

  // === 테이블 렌더링 ===
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        {/* 헤더 */}
        <thead style={headerStyle}>
          <tr>
            {config.columns.map(column => (
              <th
                key={column.key}
                style={{
                  ...headerCellStyle,
                  width: column.width,
                  textAlign: column.align || 'left'
                }}
                onClick={column.sortable ? () => handleSort(column.key) : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{column.label}</span>
                  {column.sortable && (
                    <span style={{ marginLeft: '4px' }}>
                      {getSortIcon(column.key)}
                    </span>
                  )}
                </div>
              </th>
            ))}
            {(config.actions.view || config.actions.edit || config.actions.delete || config.actions.custom) && (
              <th style={{ ...headerCellStyle, width: '200px' }}>작업</th>
            )}
          </tr>
        </thead>

        {/* 바디 */}
        <tbody>
          {data.map((item, index) => (
            <tr key={item.id} style={rowStyle}>
              {config.columns.map(column => (
                <td
                  key={`${item.id}-${column.key}`}
                  style={{
                    ...cellStyle,
                    textAlign: column.align || 'left'
                  }}
                >
                  {renderCell(column, item, index)}
                </td>
              ))}
              {(config.actions.view || config.actions.edit || config.actions.delete || config.actions.custom) && (
                <td style={cellStyle}>
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {renderActions(item)}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}