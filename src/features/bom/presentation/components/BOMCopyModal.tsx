import React, { useState, useEffect, useCallback } from 'react';
import { CopyBOMRequest, BOMCopyOptions } from '../../application/usecases/bom/CopyBOMUseCase';
import { ComponentType } from '../../domain/entities/BOMItem';
import { ProductListItem } from '@features/product/application/usecases/product/GetProductListUseCase';
import { useBOMOperations } from '../hooks/useBOMOperations';
import { useProductList } from '@features/product/presentation/hooks/useProductList';
import { 
  Modal, 
  ModalContent, 
  Button, 
  Input, 
  Select, 
  FormGroup, 
  Flex, 
  LoadingSpinner 
} from '@shared/utils/styled';

/**
 * BOM 복사 모달 Props
 */
interface BOMCopyModalProps {
  isOpen: boolean;
  sourceBOMId: string;                   // 원본 BOM ID
  sourceProduct: ProductListItem;        // 원본 제품 정보
  onClose: () => void;
  onSuccess: (newBOMId: string) => void; // 성공 시 콜백 (새 BOM ID 전달)
}

/**
 * 복사 폼 데이터 인터페이스
 */
interface CopyFormData {
  targetProductId: string;               // 대상 제품 ID
  targetProductName: string;             // 대상 제품명 (표시용)
  newVersion: string;                    // 새 버전명
  description: string;                   // 설명
  effectiveDate: string;                 // 적용일 (YYYY-MM-DD)
  expiryDate: string;                    // 만료일 (YYYY-MM-DD)
  reason: string;                        // 복사 사유
  
  // 복사 옵션들
  includeInactiveItems: boolean;         // 비활성 아이템 포함
  includeOptionalItems: boolean;         // 선택사항 아이템 포함
  adjustCosts: boolean;                  // 단가 조정 여부
  costAdjustmentRate: number;            // 단가 조정률 (%)
  copyToLevel?: number;                  // 복사할 최대 레벨
  filterByComponentTypes: ComponentType[]; // 복사할 구성품 유형
}

/**
 * 폼 에러 인터페이스
 */
interface CopyFormErrors {
  targetProductId?: string;
  newVersion?: string;
  effectiveDate?: string;
  expiryDate?: string;
  costAdjustmentRate?: string;
  copyToLevel?: string;
}

/**
 * BOM 복사 모달 컴포넌트
 * 
 * 기능:
 * - 대상 제품 선택
 * - 복사 옵션 설정
 * - 버전 관리
 * - 선택적 복사 (레벨, 유형별)
 * - 단가 조정
 */
export const BOMCopyModal: React.FC<BOMCopyModalProps> = ({
  isOpen,
  sourceBOMId,
  sourceProduct,
  onClose,
  onSuccess,
}) => {
  // === 상태 관리 ===
  const [formData, setFormData] = useState<CopyFormData>({
    targetProductId: '',
    targetProductName: '',
    newVersion: '',
    description: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    reason: '',
    includeInactiveItems: false,
    includeOptionalItems: true,
    adjustCosts: false,
    costAdjustmentRate: 0,
    copyToLevel: undefined,
    filterByComponentTypes: [],
  });

  const [errors, setErrors] = useState<CopyFormErrors>({});
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // === 훅 사용 ===
  const { copyBOM, copying } = useBOMOperations();
  const { products, loading: productsLoading, setSearchKeyword, setFilters } = useProductList();

  // === 폼 초기화 ===
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const defaultExpiry = nextMonth.toISOString().split('T')[0];

      setFormData({
        targetProductId: '',
        targetProductName: '',
        newVersion: 'v1.0',
        description: `${sourceProduct.nm_material} BOM 복사`,
        effectiveDate: today,
        expiryDate: defaultExpiry,
        reason: '신제품 BOM 구성을 위한 복사',
        includeInactiveItems: false,
        includeOptionalItems: true,
        adjustCosts: false,
        costAdjustmentRate: 0,
        copyToLevel: undefined,
        filterByComponentTypes: [],
      });
      setErrors({});
    }
  }, [isOpen, sourceProduct]);

  // === 유효성 검증 ===
  const validateForm = useCallback((): boolean => {
    const newErrors: CopyFormErrors = {};

    if (!formData.targetProductId) {
      newErrors.targetProductId = '대상 제품을 선택해주세요.';
    }

    if (!formData.newVersion.trim()) {
      newErrors.newVersion = '버전명을 입력해주세요.';
    }

    if (!formData.effectiveDate) {
      newErrors.effectiveDate = '적용일을 입력해주세요.';
    }

    if (formData.expiryDate && formData.expiryDate <= formData.effectiveDate) {
      newErrors.expiryDate = '만료일은 적용일보다 나중이어야 합니다.';
    }

    if (formData.adjustCosts && (formData.costAdjustmentRate < -100 || formData.costAdjustmentRate > 1000)) {
      newErrors.costAdjustmentRate = '단가 조정률은 -100% ~ 1000% 사이여야 합니다.';
    }

    if (formData.copyToLevel && (formData.copyToLevel < 1 || formData.copyToLevel > 20)) {
      newErrors.copyToLevel = '복사 레벨은 1~20 사이여야 합니다.' as any;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // === 대상 제품 선택 ===
  const handleTargetProductSelect = (product: ProductListItem) => {
    setFormData(prev => ({
      ...prev,
      targetProductId: product.id,
      targetProductName: `${product.cd_material} - ${product.nm_material}`,
    }));
    setShowProductSearch(false);
  };

  // === 구성품 유형 토글 ===
  const toggleComponentType = (type: ComponentType) => {
    setFormData(prev => ({
      ...prev,
      filterByComponentTypes: prev.filterByComponentTypes.includes(type)
        ? prev.filterByComponentTypes.filter(t => t !== type)
        : [...prev.filterByComponentTypes, type],
    }));
  };

  // === 폼 제출 ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const copyOptions: BOMCopyOptions = {
        includeInactiveItems: formData.includeInactiveItems,
        includeOptionalItems: formData.includeOptionalItems,
        adjustCosts: formData.adjustCosts,
        costAdjustmentRate: formData.adjustCosts ? formData.costAdjustmentRate : undefined,
        copyToLevel: formData.copyToLevel,
        filterByComponentTypes: formData.filterByComponentTypes.length > 0 
          ? formData.filterByComponentTypes 
          : undefined,
        preserveStructure: true, // 기본적으로 트리 구조 보존
        updateEffectiveDates: true, // 기본적으로 적용일 갱신
      };

      const request: CopyBOMRequest = {
        sourceBOMId,
        targetProductId: formData.targetProductId,
        newVersion: formData.newVersion,
        copyOptions,
        effectiveDate: new Date(formData.effectiveDate),
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
        description: formData.description || undefined,
        id_create: 'current-user', // TODO: 실제 사용자 ID
        reason: formData.reason || undefined,
      };

      await copyBOM(request, {
        onSuccess: (message: string, response: any) => {
          onSuccess(response.newBOMId);
          onClose();
        },
        onError: (error: string) => {
          alert(`복사 실패: ${error}`);
        },
      });
    } catch (error) {
      console.error('BOM 복사 실패:', error);
    }
  };

  // === 렌더링 ===
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen}>
      <ModalContent style={{ maxWidth: '900px' }}>
        <h2>BOM 복사</h2>
        
        {/* 원본 정보 */}
        <div style={{ 
          padding: '12px', 
          background: '#f8f9fa', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          <strong>원본 BOM:</strong> {sourceProduct.cd_material} - {sourceProduct.nm_material}
        </div>

        <form onSubmit={handleSubmit}>
          {/* 기본 정보 */}
          <Flex gap={16}>
            {/* 좌측 컬럼 */}
            <div style={{ flex: 1 }}>
              {/* 대상 제품 선택 */}
              <FormGroup>
                <label>대상 제품 *</label>
                <Flex gap={8}>
                  <Input
                    value={formData.targetProductName || '대상 제품을 선택하세요'}
                    readOnly
                    onClick={() => setShowProductSearch(true)}
                    style={{ cursor: 'pointer', flex: 1 }}
                    placeholder="클릭하여 대상 제품 선택"
                  />
                  <Button type="button" onClick={() => setShowProductSearch(true)}>
                    선택
                  </Button>
                </Flex>
                {errors.targetProductId && <div className="error">{errors.targetProductId}</div>}
              </FormGroup>

              {/* 버전명 */}
              <FormGroup>
                <label>새 버전명 *</label>
                <Input
                  type="text"
                  value={formData.newVersion}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    newVersion: e.target.value 
                  }))}
                  placeholder="예: v1.0, 2024-Q1"
                />
                {errors.newVersion && <div className="error">{errors.newVersion}</div>}
              </FormGroup>

              {/* 설명 */}
              <FormGroup>
                <label>설명</label>
                <Input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))}
                  placeholder="BOM 복사에 대한 설명"
                />
              </FormGroup>
            </div>

            {/* 우측 컬럼 */}
            <div style={{ flex: 1 }}>
              {/* 적용일 */}
              <FormGroup>
                <label>적용일 *</label>
                <Input
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    effectiveDate: e.target.value 
                  }))}
                />
                {errors.effectiveDate && <div className="error">{errors.effectiveDate}</div>}
              </FormGroup>

              {/* 만료일 */}
              <FormGroup>
                <label>만료일</label>
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    expiryDate: e.target.value 
                  }))}
                />
                {errors.expiryDate && <div className="error">{errors.expiryDate}</div>}
              </FormGroup>

              {/* 복사 사유 */}
              <FormGroup>
                <label>복사 사유</label>
                <Input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    reason: e.target.value 
                  }))}
                  placeholder="예: 신제품 개발을 위한 복사"
                />
              </FormGroup>
            </div>
          </Flex>

          {/* 대상 제품 검색 영역 */}
          {showProductSearch && (
            <FormGroup>
              <label>대상 제품 검색</label>
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
                  products
                    .filter((product: any) => product.id !== sourceProduct.id) // 원본 제품 제외
                    .map((product: any) => (
                      <div
                        key={product.id}
                        onClick={() => handleTargetProductSelect(product)}
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

          {/* 기본 복사 옵션 */}
          <FormGroup>
            <label>복사 옵션</label>
            <Flex gap={16} style={{ flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={formData.includeInactiveItems}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    includeInactiveItems: e.target.checked 
                  }))}
                  style={{ marginRight: '8px' }}
                />
                비활성 아이템 포함
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={formData.includeOptionalItems}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    includeOptionalItems: e.target.checked 
                  }))}
                  style={{ marginRight: '8px' }}
                />
                선택사항 아이템 포함
              </label>
            </Flex>
          </FormGroup>

          {/* 단가 조정 옵션 */}
          <FormGroup>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={formData.adjustCosts}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  adjustCosts: e.target.checked 
                }))}
                style={{ marginRight: '8px' }}
              />
              단가 조정
            </label>
            
            {formData.adjustCosts && (
              <Flex gap={8} style={{ marginTop: '8px' }}>
                <Input
                  type="number"
                  step="0.1"
                  min="-100"
                  max="1000"
                  value={formData.costAdjustmentRate}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    costAdjustmentRate: parseFloat(e.target.value) || 0 
                  }))}
                  style={{ width: '120px' }}
                />
                <span>% 조정</span>
              </Flex>
            )}
            {errors.costAdjustmentRate && <div className="error">{errors.costAdjustmentRate}</div>}
          </FormGroup>

          {/* 고급 옵션 토글 */}
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            style={{ marginBottom: '16px' }}
          >
            {showAdvancedOptions ? '고급 옵션 접기' : '고급 옵션 펼치기'}
          </Button>

          {/* 고급 옵션 */}
          {showAdvancedOptions && (
            <>
              {/* 복사 레벨 제한 */}
              <FormGroup>
                <label>복사 레벨 제한</label>
                <Flex gap={8} align="center">
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.copyToLevel || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      copyToLevel: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    placeholder="전체"
                    style={{ width: '100px' }}
                  />
                  <span>레벨까지 (비어두면 전체)</span>
                </Flex>
                {errors.copyToLevel && <div className="error">{errors.copyToLevel}</div>}
              </FormGroup>

              {/* 구성품 유형 필터 */}
              <FormGroup>
                <label>복사할 구성품 유형 (선택 없으면 전체)</label>
                <Flex gap={8} style={{ flexWrap: 'wrap' }}>
                  {Object.values(ComponentType).map((type: ComponentType) => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={formData.filterByComponentTypes.includes(type)}
                        onChange={() => toggleComponentType(type)}
                        style={{ marginRight: '8px' }}
                      />
                      {(() => {
                        switch (type) {
                          case ComponentType.RAW_MATERIAL: return '원자재';
                          case ComponentType.SEMI_FINISHED: return '반제품';
                          case ComponentType.PURCHASED_PART: return '구매품';
                          case ComponentType.SUB_ASSEMBLY: return '조립품';
                          case ComponentType.CONSUMABLE: return '소모품';
                          default: return type;
                        }
                      })()}
                    </label>
                  ))}
                </Flex>
              </FormGroup>
            </>
          )}

          {/* 버튼 영역 */}
          <Flex gap={8} justify="flex-end" style={{ marginTop: '24px' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={copying}>
              취소
            </Button>
            <Button type="submit" disabled={copying}>
              {copying ? (
                <>
                  <LoadingSpinner style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  복사 중...
                </>
              ) : (
                'BOM 복사'
              )}
            </Button>
          </Flex>
        </form>
      </ModalContent>
    </Modal>
  );
};