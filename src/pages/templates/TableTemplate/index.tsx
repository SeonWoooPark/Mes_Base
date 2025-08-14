/**
 * 테이블 템플릿 컴포넌트
 * 
 * 복붙하여 쉽게 새로운 테이블 화면을 만들 수 있는 템플릿입니다.
 * 
 * 사용법:
 * 1. 이 폴더를 복사하여 새 이름으로 변경 (예: orders/)
 * 2. types.ts에서 데이터 타입 정의
 * 3. api.ts에서 API 엔드포인트 설정
 * 4. 필요시 컴포넌트들 커스터마이징
 * 
 * 기능:
 * - 검색/필터링
 * - 페이지네이션  
 * - 정렬
 * - CRUD 작업
 * - 반응형 디자인
 */

import React, { useState, useCallback } from 'react';
import { TableConfig } from './types';
import { useTableData } from './useTableData';
import { TableComponent } from './Table';
import { SearchFilter } from './SearchFilter';
import { FormModal } from './FormModal';
import { Container, Card, Button, Flex } from '../../../presentation/utils/styled';
import { Pagination } from '../../../presentation/components/common/Pagination';

interface TableTemplateProps<T> {
  config: TableConfig<T>;
  title: string;
  createPermission?: string;
  onNavigate?: (path: string) => void;
}

export function TableTemplate<T extends { id: string }>({ 
  config, 
  title,
  createPermission,
  onNavigate 
}: TableTemplateProps<T>) {
  // === 상태 관리 ===
  const [selectedItem, setSelectedItem] = useState<T | undefined>();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // === 테이블 데이터 관리 ===
  const {
    data,
    totalCount,
    currentPage,
    totalPages,
    loading,
    error,
    loadData,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    setSorting,
    refresh
  } = useTableData<T>(config);

  // === 이벤트 핸들러들 ===
  
  /**
   * 신규 등록 모달 열기
   */
  const handleCreate = useCallback(() => {
    setSelectedItem(undefined);
    setIsFormModalOpen(true);
  }, []);

  /**
   * 수정 모달 열기
   */
  const handleEdit = useCallback((item: T) => {
    setSelectedItem(item);
    setIsFormModalOpen(true);
  }, []);

  /**
   * 삭제 처리
   */
  const handleDelete = useCallback(async (item: T) => {
    if (!window.confirm(`'${config.getItemName(item)}'을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await config.api.delete(item.id);
      await refresh();
      alert('성공적으로 삭제되었습니다.');
    } catch (error) {
      const message = error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.';
      alert(message);
    }
  }, [config, refresh]);

  /**
   * 상세보기 - 별도 페이지로 이동하거나 모달로 표시
   */
  const handleView = useCallback((item: T) => {
    if (onNavigate && config.detailPath) {
      onNavigate(`${config.detailPath}/${item.id}`);
    } else {
      // 기본적으로 수정 모달로 표시 (readonly 모드)
      setSelectedItem(item);
      setIsFormModalOpen(true);
    }
  }, [config, onNavigate]);

  /**
   * 폼 저장 성공 처리
   */
  const handleFormSuccess = useCallback(() => {
    refresh();
    setIsFormModalOpen(false);
    setSelectedItem(undefined);
  }, [refresh]);

  /**
   * 페이지 크기 변경
   */
  const [pageSize, setPageSizeState] = useState(10);
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSizeState(newPageSize);
    setPageSize(newPageSize);
  }, [setPageSize]);

  // === 렌더링 ===
  return (
    <Container>
      <Card>
        {/* 헤더 영역 */}
        <Flex justify="space-between" align="center" style={{ marginBottom: '20px' }}>
          <h1 style={{ margin: 0, color: '#333' }}>{title}</h1>
          {config.actions.create && (
            <Button onClick={handleCreate}>
              {config.actions.create.label || '신규 등록'}
            </Button>
          )}
        </Flex>

        {/* 검색 필터 영역 */}
        <SearchFilter
          fields={config.searchFields}
          onSearch={setSearch}
          onFilter={setFilters}
        />

        {/* 오류 메시지 */}
        {error && (
          <div style={{
            color: '#dc3545',
            marginBottom: '16px',
            padding: '12px',
            background: '#f8d7da',
            borderRadius: '4px',
            border: '1px solid #f5c6cb'
          }}>
            <strong>오류:</strong> {error}
          </div>
        )}

        {/* 통계 및 페이지 크기 설정 */}
        <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
          <div style={{ color: '#666', fontSize: '14px' }}>
            총 {totalCount.toLocaleString()}건
          </div>
          
          <Flex gap={8} align="center">
            <span style={{ fontSize: '14px' }}>페이지당</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              style={{ 
                padding: '4px 8px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value={10}>10개</option>
              <option value={25}>25개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
            </select>
            <span style={{ fontSize: '14px' }}>표시</span>
          </Flex>
        </Flex>

        {/* 테이블 */}
        <TableComponent
          config={config}
          data={data}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
          onSort={setSorting}
        />

        {/* 페이지네이션 */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </Card>

      {/* 등록/수정 모달 */}
      <FormModal
        config={config}
        isOpen={isFormModalOpen}
        item={selectedItem}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedItem(undefined);
        }}
        onSuccess={handleFormSuccess}
      />
    </Container>
  );
}