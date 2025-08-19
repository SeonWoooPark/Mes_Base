/**
 * BOM 관리 페이지 컴포넌트
 * 
 * 모든 BOM 관련 기능을 하나의 페이지에 통합:
 * - 제품 검색 및 선택
 * - BOM 트리 구조 관리
 * - BOM 아이템 CRUD 작업
 * - BOM 비교 및 복사 기능
 * - 비용 분석 및 통계
 * 
 * Clean Architecture 원칙:
 * - Feature-First 구조로 BOM 도메인 독립성 확보
 * - ProductManagementPage와 완전 분리
 * - DIContainer를 통한 의존성 주입
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductListItem } from '@features/product/application/usecases/product/GetProductListUseCase';
import { useProductList } from '@features/product/presentation/hooks/useProductList';
import { useBOMTree } from '../hooks/useBOMTree';
import { useBOMOperations } from '../hooks/useBOMOperations';
import { BOMTreeTable } from '../components/bom/BOMTreeTable';
import { BOMCompareModal } from '../components/bom/BOMCompareModal';
import { BOMItemModal } from '../components/BOMItemModal';
import { BOMCopyModal } from '../components/BOMCopyModal';
import { BOMStatistics } from '../components/bom/BOMStatistics';
import { ProductSearchInput } from '@shared/components/common/ProductSearchInput';
import { Container, Card, Button, Flex, Input, Select, LoadingSpinner } from '@shared/utils/styled';
import styled from 'styled-components';

/**
 * BOM 관리 페이지 전용 스타일드 컴포넌트들
 */
const BOMPageContainer = styled(Container)`
  max-width: none;
  padding: 24px;
`;

const BOMHeader = styled(Flex)`
  margin-bottom: 24px;
  
  h1 {
    margin: 0;
    color: #333;
    font-size: 28px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
`;

const ActionButtons = styled(Flex)`
  gap: 8px;
`;

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  align-items: start;
`;

const LeftPanel = styled.div`
  min-height: 600px;
`;

const RightPanel = styled.div<{ show: boolean }>`
  width: ${props => props.show ? '350px' : '0'};
  overflow: hidden;
  transition: width 0.3s ease;
  
  ${props => props.show && `
    border-left: 1px solid #e0e0e0;
    padding-left: 24px;
  `}
`;

const ProductSelectorCard = styled(Card)`
  margin-bottom: 20px;
  
  .selector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    h3 {
      margin: 0;
      color: #333;
      font-size: 18px;
    }
  }
`;


const SelectedProductInfo = styled.div`
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
  
  .product-title {
    font-weight: bold;
    font-size: 16px;
    color: #333;
    margin-bottom: 4px;
  }
  
  .product-code {
    font-size: 14px;
    color: #666;
    margin-bottom: 8px;
  }
  
  .product-meta {
    display: flex;
    gap: 16px;
    font-size: 14px;
    color: #666;
    
    span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
`;

const BOMInfoCard = styled(Card)`
  margin-bottom: 20px;
  
  .bom-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    
    h4 {
      margin: 0;
      color: #333;
    }
  }
  
  .bom-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 16px;
    
    .stat-item {
      text-align: center;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      
      .label {
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
      }
      
      .value {
        font-size: 18px;
        font-weight: bold;
        color: #333;
      }
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #666;
  
  .icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
  
  .title {
    font-size: 20px;
    margin-bottom: 8px;
    color: #333;
  }
  
  .description {
    font-size: 16px;
    margin-bottom: 24px;
  }
`;

/**
 * BOM 관리 메인 페이지 컴포넌트
 */
export const BOMManagementPage: React.FC = () => {
  // === URL 파라미터 처리 ===
  const [searchParams] = useSearchParams();
  const initialProductId = searchParams.get('productId');

  // === 상태 관리 ===
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | undefined>();
  const [showProductSearch, setShowProductSearch] = useState(!initialProductId);
  const [showStatistics, setShowStatistics] = useState(false);
  
  // 모달 상태들
  const [isBOMCompareModalOpen, setIsBOMCompareModalOpen] = useState(false);
  const [isBOMItemModalOpen, setIsBOMItemModalOpen] = useState(false);
  const [isBOMCopyModalOpen, setIsBOMCopyModalOpen] = useState(false);
  const [editingBOMNode, setEditingBOMNode] = useState<any | undefined>();
  const [parentBOMNode, setParentBOMNode] = useState<any | undefined>();

  // === Product 관련 훅 ===
  const {
    products,
    setPageSize,
  } = useProductList();

  // === BOM 관련 훅 ===
  const {
    bomInfo,
    treeNodes: bomNodes,
    expandedNodes,
    loading: bomLoading,
    error: bomError,
    totalItems,
    totalCost,
    maxLevel,
    loadBOMTree,
    toggleNode,
    expandAll,
    collapseAll,
    refresh: refreshBOMTree,
  } = useBOMTree(selectedProduct?.id);

  const {
    deleteBOMItem,
  } = useBOMOperations();

  // === 초기화 Effect ===
  useEffect(() => {
    // URL 파라미터로 제품 ID가 전달된 경우 해당 제품 로딩
    if (initialProductId && !selectedProduct) {
      // 제품 목록에서 해당 제품 찾기
      setPageSize(100); // 충분한 개수로 설정
    }
  }, [initialProductId, selectedProduct, setPageSize]);

  useEffect(() => {
    // 제품 목록이 로드된 후 URL 파라미터의 제품 찾기
    if (initialProductId && products.length > 0 && !selectedProduct) {
      const targetProduct = products.find(p => p.id === initialProductId);
      if (targetProduct) {
        setSelectedProduct(targetProduct);
        setShowProductSearch(false);
      }
    }
  }, [initialProductId, products, selectedProduct]);


  // === 이벤트 핸들러들 ===

  /**
   * 제품 선택 핸들러
   */
  const handleProductSelect = useCallback((product: ProductListItem) => {
    setSelectedProduct(product);
    setShowProductSearch(false);
  }, []);

  /**
   * 제품 선택 해제 핸들러
   */
  const handleProductClear = useCallback(() => {
    setSelectedProduct(undefined);
    setShowProductSearch(true);
  }, []);

  /**
   * BOM 트리 새로고침
   */
  const handleRefreshBOM = useCallback(() => {
    if (selectedProduct) {
      loadBOMTree({ productId: selectedProduct.id });
    }
  }, [selectedProduct, loadBOMTree]);

  /**
   * BOM 아이템 수정 핸들러
   */
  const handleEditBOMItem = useCallback((node: any) => {
    setEditingBOMNode(node);
    setParentBOMNode(undefined);
    setIsBOMItemModalOpen(true);
  }, []);

  /**
   * BOM 아이템 삭제 핸들러
   */
  const handleDeleteBOMItem = useCallback(async (node: any) => {
    if (!window.confirm(`'${node.componentName}'을(를) 삭제하시겠습니까?`)) {
      return;
    }

    const result = await deleteBOMItem(
      { 
        bomItemId: node.id, 
        deleteReason: '사용자 요청에 의한 삭제', 
        id_updated: 'current-user' 
      },
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
   */
  const handleAddChildBOMItem = useCallback((node: any) => {
    setEditingBOMNode(undefined);
    setParentBOMNode(node);
    setIsBOMItemModalOpen(true);
  }, []);

  /**
   * BOM 루트 아이템 추가 핸들러 (빈 BOM일 때)
   */
  const handleAddRootBOMItem = useCallback(() => {
    setEditingBOMNode(undefined);
    setParentBOMNode(undefined); // 루트 아이템이므로 parentNode는 undefined
    setIsBOMItemModalOpen(true);
  }, []);

  /**
   * BOM 아이템 모달 성공 처리
   */
  const handleBOMItemSuccess = useCallback(() => {
    refreshBOMTree();
    setIsBOMItemModalOpen(false);
    setEditingBOMNode(undefined);
    setParentBOMNode(undefined);
  }, [refreshBOMTree]);


  // === 렌더링 ===
  return (
    <BOMPageContainer>
      {/* 헤더 영역 */}
      <BOMHeader justify="space-between" align="center">
        <h1>🏗️ BOM 관리</h1>
        <ActionButtons>
          {selectedProduct && (
            <>
              <Button 
                variant="secondary" 
                onClick={() => setIsBOMCopyModalOpen(true)}
                disabled={bomLoading}
              >
                📋 BOM 복사
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setIsBOMCompareModalOpen(true)}
                disabled={bomLoading}
              >
                📊 BOM 비교
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setShowStatistics(!showStatistics)}
              >
                📈 {showStatistics ? '통계 숨김' : '통계 표시'}
              </Button>
              <Button onClick={handleRefreshBOM} disabled={bomLoading}>
                🔄 새로고침
              </Button>
            </>
          )}
        </ActionButtons>
      </BOMHeader>

      <MainLayout>
        <LeftPanel>
          {/* 제품 선택 카드 */}
          <ProductSelectorCard>
            <div className="selector-header">
              <h3>🔍 BOM 관리 대상 제품 선택</h3>
              {selectedProduct && (
                <Button 
                  variant="secondary" 
                  size="small"
                  onClick={() => setShowProductSearch(!showProductSearch)}
                >
                  {showProductSearch ? '검색 숨김' : '제품 변경'}
                </Button>
              )}
            </div>

            {/* 제품 검색 영역 */}
            {showProductSearch && (
              <div style={{ marginBottom: '16px' }}>
                <ProductSearchInput
                  onSelect={(product) => {
                    handleProductSelect(product);
                    setShowProductSearch(false);
                  }}
                  onCancel={() => setShowProductSearch(false)}
                  placeholder="제품명 또는 제품코드로 검색..."
                  autoFocus
                  searchOptions={{
                    maxResults: 20,
                    searchFields: ['name', 'code'],
                    minLength: 1,
                    debounceDelay: 300,
                  }}
                />
              </div>
            )}

            {/* 선택된 제품 정보 */}
            {selectedProduct ? (
              <SelectedProductInfo>
                <div className="product-title">{selectedProduct.nm_material}</div>
                <div className="product-code">{selectedProduct.cd_material}</div>
                <div className="product-meta">
                  <span>📦 {selectedProduct.type}</span>
                  <span>📏 {selectedProduct.unitName}</span>
                  <span>📊 재고: {selectedProduct.safetyStock}</span>
                </div>
                <Flex justify="flex-end" style={{ marginTop: '12px' }}>
                  <Button 
                    variant="outline" 
                    size="small"
                    onClick={handleProductClear}
                  >
                    선택 해제
                  </Button>
                </Flex>
              </SelectedProductInfo>
            ) : (
              <EmptyState>
                <div className="icon">🔍</div>
                <div className="title">제품을 선택하세요</div>
                <div className="description">
                  BOM을 관리할 제품을 위의 검색창에서 찾아 선택해주세요.
                </div>
              </EmptyState>
            )}
          </ProductSelectorCard>

          {/* BOM 정보 카드 */}
          {selectedProduct && bomInfo && (
            <BOMInfoCard>
              <div className="bom-header">
                <h4>📋 BOM 정보</h4>
                <span style={{ fontSize: '14px', color: '#666' }}>
                  버전: {bomInfo.version}
                </span>
              </div>
              <div className="bom-stats">
                <div className="stat-item">
                  <div className="label">총 아이템 수</div>
                  <div className="value">{totalItems}</div>
                </div>
                <div className="stat-item">
                  <div className="label">총 비용</div>
                  <div className="value">₩{totalCost.toLocaleString()}</div>
                </div>
                <div className="stat-item">
                  <div className="label">상태</div>
                  <div className="value" style={{ 
                    color: bomInfo.isActive ? '#28a745' : '#dc3545' 
                  }}>
                    {bomInfo.isActive ? '활성' : '비활성'}
                  </div>
                </div>
              </div>
            </BOMInfoCard>
          )}

          {/* BOM 트리 영역 */}
          {selectedProduct ? (
            <>
              {/* BOM 컨트롤 버튼들 */}
              <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
                <div style={{ color: '#666', fontSize: '14px' }}>
                  {selectedProduct.nm_material} BOM 구조
                </div>
                
                <Flex gap={8}>
                  <Button 
                    variant="secondary" 
                    size="small"
                    onClick={expandAll}
                    disabled={bomLoading}
                  >
                    전체 펼침
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="small"
                    onClick={collapseAll}
                    disabled={bomLoading}
                  >
                    전체 접기
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
                onAddRootItem={handleAddRootBOMItem}
              />
            </>
          ) : (
            <EmptyState>
              <div className="icon">🏗️</div>
              <div className="title">BOM 관리</div>
              <div className="description">
                제품을 선택하면 해당 제품의 BOM 구조를 확인하고 관리할 수 있습니다.
              </div>
            </EmptyState>
          )}
        </LeftPanel>

        {/* 통계 사이드 패널 */}
        <RightPanel show={showStatistics && !!selectedProduct}>
          {selectedProduct && (
            <BOMStatistics
              bomInfo={bomInfo || undefined}
              totalItems={totalItems}
              activeItems={bomNodes.filter(n => n.isActive).length}
              totalCost={totalCost}
              maxLevel={maxLevel}
              loading={bomLoading}
            />
          )}
        </RightPanel>
      </MainLayout>

      {/* 모달들 */}
      
      {/* BOM 비교 모달 */}
      <BOMCompareModal
        isOpen={isBOMCompareModalOpen}
        onClose={() => setIsBOMCompareModalOpen(false)}
        products={products.map(p => ({
          getId: () => ({ getValue: () => p.id }),
          getName: () => p.nm_material,
          getCode: () => p.cd_material,
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
        initialSourceProductId={selectedProduct?.id}
      />

      {/* BOM 아이템 추가/수정 모달 */}
      {selectedProduct && (
        <BOMItemModal
          isOpen={isBOMItemModalOpen}
          node={editingBOMNode}
          parentNode={parentBOMNode}
          productId={selectedProduct.id}
          onClose={() => setIsBOMItemModalOpen(false)}
          onSuccess={handleBOMItemSuccess}
        />
      )}

      {/* BOM 복사 모달 */}
      {selectedProduct && (
        <BOMCopyModal
          isOpen={isBOMCopyModalOpen}
          sourceBOMId={bomInfo?.id || ''}
          sourceProduct={selectedProduct}
          onClose={() => setIsBOMCopyModalOpen(false)}
          onSuccess={(_newBOMId: string) => {
            setIsBOMCopyModalOpen(false);
            refreshBOMTree();
          }}
        />
      )}
    </BOMPageContainer>
  );
};