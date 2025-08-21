/**
 * 제품 관리 페이지 컴포넌트
 * 
 * 워크플로우:
 * 1. useProductList 훅을 통한 제품 데이터 관리
 * 2. 검색/필터링 기능 제공
 * 3. 제품 CRUD 작업 (생성, 수정, 삭제, 조회)
 * 4. 페이지네이션 처리
 * 5. 모달을 통한 제품 등록/수정
 * 
 * 데이터 흐름:
 * ProductManagementPage → useProductList → DIContainer → UseCase → Repository
 * 
 * 주요 기능:
 * - 제품 목록 표시 (TanStack Table)
 * - 검색 및 필터링
 * - 제품 등록/수정/삭제
 * - 페이지네이션
 * - 제품 이력 조회
 * - BOM 관리 페이지로 연결
 * 
 * Clean Architecture 원칙:
 * - BOM 기능과 완전 분리
 * - Single Responsibility Principle 준수
 * - Feature-First 구조 유지
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductListItem } from '../../application/usecases/product/GetProductListUseCase';
import { useProductList } from '../hooks/useProductList';
import { useProductHistory } from '../hooks/useProductHistory';
import { useAppStoreSelectors } from '@shared/stores/appStore';
import { ProductTable } from '../components/product/ProductTable';
import { ProductSearchFilter } from '../components/product/ProductSearchFilter';
import { ProductFormModal } from '../components/ProductFormModal';
import { ProductHistoryModal } from '../components/ProductHistoryModal';
import { Pagination } from '@shared/components/common/Pagination';
import { Container, Card, Button, Flex, Select } from '@shared/utils/styled';
import { useDeleteProduct } from '../hooks/useProductList';

export const ProductManagementPage: React.FC = () => {
  // === React Router 네비게이션 ===
  const navigate = useNavigate();
  
  // === 제품 목록 관리 훅 ===
  const {
    products,              // 현재 페이지의 제품 목록
    totalCount,            // 전체 제품 수
    currentPage,           // 현재 페이지 번호
    totalPages,            // 전체 페이지 수
    loading,               // 로딩 상태
    error,                 // 에러 상태
    setPage,               // 페이지 변경
    setPageSize,           // 페이지 크기 변경
    setSearchKeyword,      // 검색어 설정
    setFilters,            // 필터 설정
    setSortBy,             // 정렬 기준 설정
    refresh,               // 데이터 새로고침
  } = useProductList();

  // 현재 pageSize를 Zustand 스토어에서 가져오기
  const productView = useAppStoreSelectors.useProductView();

  // === 로컬 상태 관리 ===
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | undefined>(); // 선택된 제품 (수정용)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<ProductListItem | undefined>(); // 이력 조회용 선택된 제품
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);                          // 폼 모달 열림 상태
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);                   // 이력 모달 열림 상태

  // BOM 관련 훅들은 BOMManagementPage로 이동됨

  // === 제품 이력 관리 훅 ===
  const {
    histories,
    loading: historyLoading,
    error: historyError,
    loadHistory,
    clearHistory,
    refresh: refreshHistory,
  } = useProductHistory();

  // === 새로운 Hook 시스템 사용 ===
  const deleteProductMutation = useDeleteProduct();

  // === 이벤트 핸들러들 ===

  /**
   * 신규 제품 등록 모달 열기
   */
  const handleCreateProduct = () => {
    setSelectedProduct(undefined);    // 새 제품이므로 선택된 제품 초기화
    setIsFormModalOpen(true);
  };

  /**
   * 제품 수정 모달 열기
   * @param product 수정할 제품 정보
   */
  const handleEditProduct = (product: ProductListItem) => {
    setSelectedProduct(product);      // 수정할 제품 설정
    setIsFormModalOpen(true);
  };

  /**
   * 제품 삭제 처리
   * @param product 삭제할 제품 정보
   */
  const handleDeleteProduct = async (product: ProductListItem) => {
    // 사용자 확인
    if (!window.confirm(`제품 '${product.nm_material}'을(를) 삭제하시겠습니까?`)) {
      return;
    }

    // 새로운 Mutation Hook 사용
    deleteProductMutation.mutate({
      productId: product.id,
      id_updated: 'current-user', // TODO: 실제 로그인된 사용자 ID 사용
      reason: '사용자 요청에 의한 삭제',
    });
    
    // Note: 성공/에러 처리는 useFeatureMutation에서 자동으로 처리됨
  };

  /**
   * 제품 이력 조회
   * @param product 이력을 조회할 제품
   */
  const handleViewHistory = async (product: ProductListItem) => {
    setSelectedProductForHistory(product);
    setIsHistoryModalOpen(true);
    
    // 이력 데이터 로드
    await loadHistory(product.id);
  };

  /**
   * 제품 등록/수정 성공 시 처리
   */
  const handleFormSuccess = () => {
    refresh(); // 목록 새로고침
  };

  /**
   * 페이지당 표시 개수 변경
   * @param newPageSize 새로운 페이지 크기
   */
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
  };

  /**
   * BOM 관리 페이지로 이동
   * @param product BOM을 관리할 제품
   */
  const handleBOMManage = useCallback((product: ProductListItem) => {
    // BOM 관리 페이지로 이동하면서 제품 정보 전달
    navigate(`/bom?productId=${product.id}&name=${encodeURIComponent(product.nm_material)}`);
  }, [navigate]);

  /**
   * 이력 모달 닫기 처리
   */
  const handleHistoryModalClose = useCallback(() => {
    setIsHistoryModalOpen(false);
    setSelectedProductForHistory(undefined);
    clearHistory(); // 이력 데이터 초기화
  }, [clearHistory]);

  // === 렌더링 ===
  return (
    <Container>
      <Card>
        {/* 헤더 영역 - 타이틀 및 신규 등록 버튼 */}
        <Flex justify="space-between" align="center" style={{ marginBottom: '20px' }}>
          <h1 style={{ margin: 0, color: '#333' }}>제품정보 관리</h1>
          <Button onClick={handleCreateProduct}>신규 등록</Button>
        </Flex>

        {/* 검색 및 필터 영역 */}
        <ProductSearchFilter
          onSearch={setSearchKeyword}
          onFilter={setFilters}
          onProductSelect={(product) => {
            // 자동완성에서 제품 선택 시 해당 제품으로 필터링
            console.log('Selected product from autocomplete:', product);
            // 필요시 추가 로직 구현 (예: 해당 제품으로 스크롤, 하이라이팅 등)
          }}
        />

        {/* 오류 메시지 표시 */}
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

        {/* 통계 및 페이지 크기 설정 영역 */}
        <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
          <div style={{ color: '#666', fontSize: '14px' }}>
            총 {totalCount.toLocaleString()}건
          </div>
          
          <Flex gap={8} align="center">
            <span style={{ fontSize: '14px' }}>페이지당</span>
            <Select
              value={productView.pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              style={{ width: '80px' }}
            >
              <option value={10}>10개</option>
              <option value={25}>25개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
            </Select>
            <span style={{ fontSize: '14px' }}>표시</span>
          </Flex>
        </Flex>

        {/* 제품 목록 테이블 */}
        <ProductTable
          products={products}
          loading={loading}
          onSort={setSortBy}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onViewHistory={handleViewHistory}
          onBOMManage={handleBOMManage}
        />

        {/* 페이지네이션 */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={productView.pageSize}
          onPageChange={setPage}
        />
      </Card>

      {/* 제품 등록/수정 모달 */}
      <ProductFormModal
        isOpen={isFormModalOpen}              // 모달 열림 상태
        product={selectedProduct}             // 수정할 제품 (신규 등록 시 undefined)
        onClose={() => setIsFormModalOpen(false)}    // 모달 닫기
        onSuccess={handleFormSuccess}        // 등록/수정 성공 처리
      />

      {/* BOM 관련 모달들은 BOMManagementPage로 이동됨 */}

      {/* 제품 이력 조회 모달 */}
      <ProductHistoryModal
        isOpen={isHistoryModalOpen}
        productName={selectedProductForHistory?.nm_material || ''}
        productCode={selectedProductForHistory?.cd_material || ''}
        histories={histories}
        loading={historyLoading}
        error={historyError}
        onClose={handleHistoryModalClose}
        onRefresh={() => refreshHistory()}
      />
    </Container>
  );
};