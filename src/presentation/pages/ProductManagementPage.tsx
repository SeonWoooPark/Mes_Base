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
 * - 제품 이력 조회 (향후 구현)
 */

import React, { useState, useCallback } from 'react';
import { ProductListItem } from '../../application/usecases/product/GetProductListUseCase';
import { useProductList } from '../hooks/useProductList';
import { useBOMTree } from '../hooks/useBOMTree';
import { useBOMOperations } from '../hooks/useBOMOperations';
import { useProductHistory } from '../hooks/useProductHistory';
import { ProductTable } from '../components/product/ProductTable';
import { ProductSearchFilter } from '../components/product/ProductSearchFilter';
import { ProductFormModal } from '../components/modals/ProductFormModal';
import { BOMTreeTable } from '../components/bom/BOMTreeTable';
import { BOMCompareModal } from '../components/bom/BOMCompareModal';
import { BOMItemModal } from '../components/modals/BOMItemModal';
import { ProductHistoryModal } from '../components/modals/ProductHistoryModal';
import { Pagination } from '../components/common/Pagination';
import { Container, Card, Button, Flex, Select, TabContainer, TabList, Tab, TabPanel } from '../utils/styled';
import { DIContainer } from '../../config/DIContainer';

export const ProductManagementPage: React.FC = () => {
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

  // === 탭 관리 ===
  const [activeTab, setActiveTab] = useState<'products' | 'bom'>('products');

  // === 로컬 상태 관리 ===
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | undefined>(); // 선택된 제품 (수정용)
  const [selectedProductForBOM, setSelectedProductForBOM] = useState<ProductListItem | undefined>(); // BOM 관리용 선택된 제품
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<ProductListItem | undefined>(); // 이력 조회용 선택된 제품
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);                          // 폼 모달 열림 상태
  const [isBOMCompareModalOpen, setIsBOMCompareModalOpen] = useState(false);             // BOM 비교 모달 열림 상태
  const [isBOMItemModalOpen, setIsBOMItemModalOpen] = useState(false);                   // BOM 아이템 모달 열림 상태
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);                   // 이력 모달 열림 상태
  const [editingBOMNode, setEditingBOMNode] = useState<any | undefined>();               // 수정 중인 BOM 노드
  const [parentBOMNode, setParentBOMNode] = useState<any | undefined>();                 // 부모 BOM 노드 (하위 추가용)
  const [pageSize, setPageSizeState] = useState(10);                                     // 페이지당 표시 개수

  // === BOM 관련 훅 ===
  const {
    treeNodes: bomNodes,
    expandedNodes,
    loading: bomLoading,
    error: bomError,
    loadBOMTree,
    toggleNode,
    expandAll,
    collapseAll,
    refresh: refreshBOMTree,
  } = useBOMTree(selectedProductForBOM?.id);

  const {
    deleteBOMItem,
  } = useBOMOperations();

  // === 제품 이력 관리 훅 ===
  const {
    histories,
    loading: historyLoading,
    error: historyError,
    loadHistory,
    clearHistory,
    refresh: refreshHistory,
  } = useProductHistory();

  // === 의존성 주입 - UseCase 가져오기 ===
  const deleteProductUseCase = DIContainer.getInstance().getDeleteProductUseCase();

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

    try {
      // DeleteProductUseCase 실행
      await deleteProductUseCase.execute({
        productId: product.id,
        id_updated: 'current-user', // TODO: 실제 로그인된 사용자 ID 사용
        reason: '사용자 요청에 의한 삭제',
      });
      
      refresh(); // 목록 새로고침
    } catch (error) {
      alert(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.');
    }
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
    setPageSizeState(newPageSize);
    setPageSize(newPageSize);
  };

  // === BOM 관련 이벤트 핸들러들 ===

  /**
   * 탭 변경 핸들러
   * @param tab 변경할 탭
   */
  const handleTabChange = (tab: 'products' | 'bom') => {
    setActiveTab(tab);
  };

  /**
   * BOM 관리용 제품 선택
   * @param product 선택할 제품
   */
  const handleSelectProductForBOM = (product: ProductListItem) => {
    setSelectedProductForBOM(product);
  };

  /**
   * BOM 아이템 수정 핸들러
   * @param node BOM 노드
   */
  const handleEditBOMItem = useCallback((node: any) => {
    setEditingBOMNode(node);
    setParentBOMNode(undefined); // 수정 모드에서는 부모 노드 없음
    setIsBOMItemModalOpen(true);
  }, []);

  /**
   * BOM 아이템 삭제 핸들러
   * @param node BOM 노드
   */
  const handleDeleteBOMItem = useCallback(async (node: any) => {
    const result = await deleteBOMItem(
      { bomItemId: node.id, deleteReason: '사용자 요청에 의한 삭제', id_updated: 'current-user' },
      {
        onSuccess: () => refreshBOMTree(),
        onError: (error) => alert(error),
      }
    );
    
    if (result.success) {
      alert('BOM 아이템이 삭제되었습니다.');
    }
  }, [deleteBOMItem, refreshBOMTree]);

  /**
   * BOM 하위 아이템 추가 핸들러
   * @param node 부모 BOM 노드
   */
  const handleAddChildBOMItem = useCallback((node: any) => {
    setEditingBOMNode(undefined); // 신규 추가 모드에서는 수정 노드 없음
    setParentBOMNode(node); // 부모 노드 설정
    setIsBOMItemModalOpen(true);
  }, []);

  /**
   * BOM 아이템 모달 성공 처리
   */
  const handleBOMItemSuccess = useCallback(() => {
    refreshBOMTree(); // BOM 트리 새로고침
    setIsBOMItemModalOpen(false);
    setEditingBOMNode(undefined);
    setParentBOMNode(undefined);
  }, [refreshBOMTree]);

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
          {activeTab === 'products' && (
            <Button onClick={handleCreateProduct}>신규 등록</Button>
          )}
        </Flex>

        {/* 탭 네비게이션 */}
        <TabContainer>
          <TabList>
            <Tab 
              active={activeTab === 'products'} 
              onClick={() => handleTabChange('products')}
            >
              📦 제품 관리
            </Tab>
            <Tab 
              active={activeTab === 'bom'} 
              onClick={() => handleTabChange('bom')}
            >
              🏗️ BOM 관리
            </Tab>
          </TabList>

          {/* 제품 관리 탭 */}
          <TabPanel active={activeTab === 'products'}>
            {/* 검색 및 필터 영역 */}
            <ProductSearchFilter
              onSearch={setSearchKeyword}
              onFilter={setFilters}
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
                  value={pageSize}
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
              onBOMManage={(product) => {
                handleSelectProductForBOM(product);
                handleTabChange('bom');
              }}
            />

            {/* 페이지네이션 */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </TabPanel>

          {/* BOM 관리 탭 */}
          <TabPanel active={activeTab === 'bom'}>
            {/* BOM 제품 선택 영역 */}
            <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>BOM 관리 대상 제품 선택</h3>
              
              {selectedProductForBOM ? (
                <Flex justify="space-between" align="center">
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{selectedProductForBOM.nm_material}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>{selectedProductForBOM.cd_material}</div>
                  </div>
                  <Button 
                    variant="secondary" 
                    onClick={() => setSelectedProductForBOM(undefined)}
                  >
                    선택 해제
                  </Button>
                </Flex>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  <div style={{ marginBottom: '12px' }}>BOM을 관리할 제품을 선택하세요.</div>
                  <Button onClick={() => handleTabChange('products')}>
                    제품 관리 탭에서 선택하기
                  </Button>
                </div>
              )}
            </div>

            {/* BOM 트리 영역 */}
            {selectedProductForBOM ? (
              <>
                {/* BOM 컨트롤 버튼들 */}
                <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    {selectedProductForBOM.nm_material} BOM 구조
                  </div>
                  
                  <Flex gap={8}>
                    <Button 
                      variant="secondary" 
                      onClick={expandAll}
                      disabled={bomLoading}
                    >
                      전체 펼침
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={collapseAll}
                      disabled={bomLoading}
                    >
                      전체 접기
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => setIsBOMCompareModalOpen(true)}
                      disabled={bomLoading}
                    >
                      BOM 비교
                    </Button>
                    <Button 
                      onClick={() => loadBOMTree({ productId: selectedProductForBOM.id })}
                      disabled={bomLoading}
                    >
                      새로고침
                    </Button>
                  </Flex>
                </Flex>

                {/* BOM 에러 메시지 */}
                {bomError && (
                  <div style={{ 
                    color: '#dc3545', 
                    marginBottom: '16px', 
                    padding: '12px', 
                    background: '#f8d7da', 
                    borderRadius: '4px',
                    border: '1px solid #f5c6cb'
                  }}>
                    <strong>BOM 오류:</strong> {bomError}
                  </div>
                )}

                {/* BOM 트리 테이블 */}
                <BOMTreeTable
                  nodes={bomNodes}
                  expandedNodes={expandedNodes}
                  loading={bomLoading}
                  onToggleNode={toggleNode}
                  onEditItem={handleEditBOMItem}
                  onDeleteItem={handleDeleteBOMItem}
                  onAddChild={handleAddChildBOMItem}
                />
              </>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px', 
                color: '#666',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px dashed #ddd'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏗️</div>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>BOM 관리</div>
                <div style={{ fontSize: '14px' }}>
                  BOM을 관리할 제품을 먼저 선택해주세요.
                </div>
              </div>
            )}
          </TabPanel>
        </TabContainer>
      </Card>

      {/* 제품 등록/수정 모달 */}
      <ProductFormModal
        isOpen={isFormModalOpen}              // 모달 열림 상태
        product={selectedProduct}             // 수정할 제품 (신규 등록 시 undefined)
        onClose={() => setIsFormModalOpen(false)}    // 모달 닫기
        onSuccess={handleFormSuccess}        // 등록/수정 성공 처리
      />

      {/* BOM 비교 모달 */}
      <BOMCompareModal
        isOpen={isBOMCompareModalOpen}
        onClose={() => setIsBOMCompareModalOpen(false)}
        products={products.map(p => ({
          getId: () => ({ getValue: () => p.id }),
          getName: () => p.nm_material,
          getCode: () => p.cd_material,
          // 나머지 Product 속성들은 BOM 비교에서 사용하지 않으므로 기본값으로 처리
          id: p.id,
          cd_material: p.cd_material,
          nm_material: p.nm_material,
          type: p.type,
          unitName: p.unitName,
          safetyStock: p.safetyStock,
          leadTime: 0,
          supplier: '',
          location: '',
          memo: '',
          isActive: p.isActive,
          id_updated: '',
          dt_updated: new Date(),
          getType: () => p.type,
          getUnitName: () => p.unitName,
          getSafetyStock: () => p.safetyStock,
          getLeadTime: () => 0,
          getSupplier: () => '',
          getLocation: () => '',
          getMemo: () => '',
          getIsActive: () => p.isActive,
          getIdUpdated: () => '',
          getDtUpdated: () => new Date(),
          canBeProduced: () => true,
          isRawMaterial: () => false,
          canHaveBOM: () => true,
          isBelowSafetyStock: () => false,
        } as any))}
        initialSourceProductId={selectedProductForBOM?.id}
      />

      {/* BOM 아이템 추가/수정 모달 */}
      {selectedProductForBOM && (
        <BOMItemModal
          isOpen={isBOMItemModalOpen}
          node={editingBOMNode}
          parentNode={parentBOMNode}
          productId={selectedProductForBOM.id}
          onClose={() => setIsBOMItemModalOpen(false)}
          onSuccess={handleBOMItemSuccess}
        />
      )}

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