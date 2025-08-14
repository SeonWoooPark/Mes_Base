import React, { useState, useEffect, useCallback } from 'react';
import { BOMTreeNode } from '../../../application/usecases/bom/GetBOMTreeUseCase';
import { AddBOMItemRequest } from '../../../application/usecases/bom/AddBOMItemUseCase';
import { UpdateBOMItemRequest } from '../../../application/usecases/bom/UpdateBOMItemUseCase';
import { ComponentType } from '../../../domain/entities/BOMItem';
import { ProductListItem } from '../../../application/usecases/product/GetProductListUseCase';
import { useBOMOperations } from '../../hooks/useBOMOperations';
import { useProductList } from '../../hooks/useProductList';
import { 
  Modal, 
  ModalContent, 
  Button, 
  Input, 
  Select, 
  FormGroup, 
  Flex, 
  LoadingSpinner 
} from '../../utils/styled';

/**
 * BOM 아이템 모달 Props
 */
interface BOMItemModalProps {
  isOpen: boolean;
  node?: BOMTreeNode;                    // 수정할 노드 (신규 추가 시 undefined)
  parentNode?: BOMTreeNode;              // 부모 노드 (하위 아이템 추가 시)
  productId: string;                     // BOM이 속한 제품 ID
  onClose: () => void;
  onSuccess: () => void;                 // 성공 시 콜백
}

/**
 * 폼 데이터 인터페이스
 */
interface BOMItemFormData {
  componentId: string;                   // 구성품 ID
  componentCode: string;                 // 구성품 코드 (표시용)
  componentName: string;                 // 구성품명 (표시용)
  componentType: ComponentType;          // 구성품 유형
  quantity: number;                      // 수량
  unitName: string;                      // 단위
  unitCost: number;                      // 단가
  scrapRate: number;                     // 스크랩률
  position: string;                      // 위치
  processStep: string;                   // 공정
  isOptional: boolean;                   // 선택사항 여부
  remarks: string;                       // 비고
}

/**
 * 폼 에러 인터페이스
 */
interface BOMItemFormErrors {
  componentId?: string;
  quantity?: string;
  unitCost?: string;
  scrapRate?: string;
  position?: string;
  processStep?: string;
  remarks?: string;
}

/**
 * BOM 아이템 추가/수정 모달 컴포넌트
 * 
 * 기능:
 * - BOM 아이템 신규 추가
 * - 기존 BOM 아이템 수정
 * - 구성품 검색 및 선택
 * - 유효성 검증
 * - 실시간 비용 계산
 */
export const BOMItemModal: React.FC<BOMItemModalProps> = ({
  isOpen,
  node,
  parentNode,
  productId,
  onClose,
  onSuccess,
}) => {
  // === 상태 관리 ===
  const [formData, setFormData] = useState<BOMItemFormData>({
    componentId: '',
    componentCode: '',
    componentName: '',
    componentType: ComponentType.RAW_MATERIAL,
    quantity: 1,
    unitName: 'EA',
    unitCost: 0,
    scrapRate: 0,
    position: '',
    processStep: '',
    isOptional: false,
    remarks: '',
  });

  const [errors, setErrors] = useState<BOMItemFormErrors>({});
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null);

  // === 훅 사용 ===
  const { addBOMItem, updateBOMItem, adding, updating } = useBOMOperations();
  const { products, loading: productsLoading, setSearchKeyword } = useProductList();

  const isEdit = !!node;
  const isLoading = adding || updating;

  // === 폼 초기화 ===
  useEffect(() => {
    if (isOpen) {
      if (node) {
        // 수정 모드: 기존 데이터로 초기화
        setFormData({
          componentId: node.componentId,
          componentCode: node.componentCode,
          componentName: node.componentName,
          componentType: node.componentType as ComponentType,
          quantity: node.quantity,
          unitName: node.unitName,
          unitCost: node.unitCost,
          scrapRate: node.scrapRate,
          position: node.position || '',
          processStep: node.processStep || '',
          isOptional: node.isOptional,
          remarks: node.remarks || '',
        });
      } else {
        // 신규 모드: 기본값으로 초기화
        setFormData({
          componentId: '',
          componentCode: '',
          componentName: '',
          componentType: ComponentType.RAW_MATERIAL,
          quantity: 1,
          unitName: 'EA',
          unitCost: 0,
          scrapRate: 0,
          position: '',
          processStep: '',
          isOptional: false,
          remarks: '',
        });
      }
      setErrors({});
      setSelectedProduct(null);
    }
  }, [isOpen, node]);

  // === 유효성 검증 ===
  const validateForm = useCallback((): boolean => {
    const newErrors: BOMItemFormErrors = {};

    if (!formData.componentId) {
      newErrors.componentId = '구성품을 선택해주세요.';
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = '수량은 0보다 커야 합니다.';
    }

    if (formData.unitCost < 0) {
      newErrors.unitCost = '단가는 0 이상이어야 합니다.';
    }

    if (formData.scrapRate < 0 || formData.scrapRate > 100) {
      newErrors.scrapRate = '스크랩률은 0~100% 사이여야 합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // === 구성품 선택 ===
  const handleProductSelect = (product: ProductListItem) => {
    setFormData(prev => ({
      ...prev,
      componentId: product.id,
      componentCode: product.cd_material,
      componentName: product.nm_material,
      componentType: ComponentType.RAW_MATERIAL, // 기본값, 사용자가 변경 가능
      unitName: 'EA', // 기본값
    }));
    setSelectedProduct(product);
    setShowProductSearch(false);
  };

  // === 폼 제출 ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (isEdit && node) {
        // 수정 모드
        const request: UpdateBOMItemRequest = {
          bomItemId: node.id,
          quantity: formData.quantity,
          unitCost: formData.unitCost,
          scrapRate: formData.scrapRate,
          position: formData.position || undefined,
          processStep: formData.processStep || undefined,
          isOptional: formData.isOptional,
          remarks: formData.remarks || undefined,
          id_updated: 'current-user', // TODO: 실제 사용자 ID
        };

        await updateBOMItem(request, {
          onSuccess: () => {
            onSuccess();
            onClose();
          },
          onError: (error) => {
            alert(`수정 실패: ${error}`);
          },
        });
      } else {
        // 추가 모드
        const request: AddBOMItemRequest = {
          bomId: '', // TODO: 실제 BOM ID
          parentItemId: parentNode?.id,
          componentId: formData.componentId,
          componentType: formData.componentType,
          quantity: formData.quantity,
          unit: {
            code: formData.unitName, // TODO: 단위 코드와 이름을 분리 필요
            name: formData.unitName
          },
          unitCost: formData.unitCost,
          scrapRate: formData.scrapRate,
          position: formData.position || undefined,
          processStep: formData.processStep || undefined,
          isOptional: formData.isOptional,
          remarks: formData.remarks || undefined,
          effectiveDate: new Date(), // 현재 날짜를 기본값으로 설정
          id_create: 'current-user', // TODO: 실제 사용자 ID
        };

        await addBOMItem(request, {
          onSuccess: () => {
            onSuccess();
            onClose();
          },
          onError: (error) => {
            alert(`추가 실패: ${error}`);
          },
        });
      }
    } catch (error) {
      console.error('BOM 아이템 저장 실패:', error);
    }
  };

  // === 총 비용 계산 ===
  const totalCost = formData.quantity * formData.unitCost * (1 + formData.scrapRate / 100);

  // === 렌더링 ===
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen}>
      <ModalContent style={{ maxWidth: '800px' }}>
        <h2>{isEdit ? 'BOM 아이템 수정' : 'BOM 아이템 추가'}</h2>

        <form onSubmit={handleSubmit}>
          {/* 구성품 선택 영역 */}
          <FormGroup>
            <label>구성품 *</label>
            <Flex gap={8}>
              <Input
                value={selectedProduct ? `${selectedProduct.cd_material} - ${selectedProduct.nm_material}` : '구성품을 선택하세요'}
                readOnly
                onClick={() => setShowProductSearch(true)}
                style={{ cursor: 'pointer', flex: 1 }}
                placeholder="클릭하여 구성품 선택"
              />
              <Button type="button" onClick={() => setShowProductSearch(true)}>
                선택
              </Button>
            </Flex>
            {errors.componentId && <div className="error">{errors.componentId}</div>}
          </FormGroup>

          {/* 구성품 검색 영역 */}
          {showProductSearch && (
            <FormGroup>
              <label>구성품 검색</label>
              <Input
                type="text"
                placeholder="제품명 또는 제품코드로 검색"
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                marginTop: '8px'
              }}>
                {productsLoading ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <LoadingSpinner />
                  </div>
                ) : (
                  products.map(product => (
                    <div
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee'
                      }}
                    >
                      <div style={{ fontWeight: 'bold' }}>{product.cd_material}</div>
                      <div style={{ fontSize: '14px', color: '#666' }}>{product.nm_material}</div>
                    </div>
                  ))
                )}
              </div>
              
              <Flex gap={8} style={{ marginTop: '8px' }}>
                <Button type="button" onClick={() => setShowProductSearch(false)}>
                  취소
                </Button>
              </Flex>
            </FormGroup>
          )}

          <Flex gap={16}>
            {/* 좌측 컬럼 */}
            <div style={{ flex: 1 }}>
              {/* 구성품 유형 */}
              <FormGroup>
                <label>구성품 유형 *</label>
                <Select
                  value={formData.componentType}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    componentType: e.target.value as ComponentType 
                  }))}
                >
                  <option value={ComponentType.RAW_MATERIAL}>원자재</option>
                  <option value={ComponentType.SEMI_FINISHED}>반제품</option>
                  <option value={ComponentType.PURCHASED_PART}>구매품</option>
                  <option value={ComponentType.SUB_ASSEMBLY}>조립품</option>
                  <option value={ComponentType.CONSUMABLE}>소모품</option>
                </Select>
              </FormGroup>

              {/* 수량 */}
              <FormGroup>
                <label>수량 *</label>
                <Flex gap={8}>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      quantity: parseFloat(e.target.value) || 0 
                    }))}
                    style={{ flex: 1 }}
                  />
                  <Input
                    type="text"
                    value={formData.unitName}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      unitName: e.target.value 
                    }))}
                    placeholder="단위"
                    style={{ width: '80px' }}
                  />
                </Flex>
                {errors.quantity && <div className="error">{errors.quantity}</div>}
              </FormGroup>

              {/* 단가 */}
              <FormGroup>
                <label>단가</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitCost}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    unitCost: parseFloat(e.target.value) || 0 
                  }))}
                />
                {errors.unitCost && <div className="error">{errors.unitCost}</div>}
              </FormGroup>

              {/* 스크랩률 */}
              <FormGroup>
                <label>스크랩률 (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.scrapRate}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    scrapRate: parseFloat(e.target.value) || 0 
                  }))}
                />
                {errors.scrapRate && <div className="error">{errors.scrapRate}</div>}
              </FormGroup>
            </div>

            {/* 우측 컬럼 */}
            <div style={{ flex: 1 }}>
              {/* 위치 */}
              <FormGroup>
                <label>위치</label>
                <Input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    position: e.target.value 
                  }))}
                  placeholder="예: A-01-02"
                />
              </FormGroup>

              {/* 공정 */}
              <FormGroup>
                <label>공정</label>
                <Input
                  type="text"
                  value={formData.processStep}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    processStep: e.target.value 
                  }))}
                  placeholder="예: 조립"
                />
              </FormGroup>

              {/* 선택사항 */}
              <FormGroup>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isOptional}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      isOptional: e.target.checked 
                    }))}
                    style={{ marginRight: '8px' }}
                  />
                  선택사항
                </label>
              </FormGroup>

              {/* 총 비용 표시 */}
              <FormGroup>
                <label>총 비용 (예상)</label>
                <div style={{ 
                  padding: '8px 12px', 
                  background: '#f8f9fa', 
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>
                  ₩{totalCost.toLocaleString()}
                </div>
              </FormGroup>
            </div>
          </Flex>

          {/* 비고 */}
          <FormGroup>
            <label>비고</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                remarks: e.target.value 
              }))}
              placeholder="추가 설명이나 주의사항을 입력하세요"
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical'
              }}
            />
          </FormGroup>

          {/* 버튼 영역 */}
          <Flex gap={8} justify="flex-end" style={{ marginTop: '24px' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  {isEdit ? '수정 중...' : '추가 중...'}
                </>
              ) : (
                isEdit ? '수정' : '추가'
              )}
            </Button>
          </Flex>
        </form>
      </ModalContent>
    </Modal>
  );
};