import React, { useState, useEffect } from 'react';
import { ProductListItem } from '../../../application/usecases/product/GetProductListUseCase';
import { CreateProductRequest } from '../../../application/usecases/product/CreateProductUseCase';
import { UpdateProductRequest } from '../../../application/usecases/product/UpdateProductUseCase';
import { ProductType } from '../../../domain/entities/Product';
import { Modal, ModalContent, FormGroup, Input, Select, Button, Flex } from '../../utils/styled';
import { DIContainer } from '../../../config/DIContainer';

interface ProductFormModalProps {
  isOpen: boolean;
  product?: ProductListItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  product,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    nm_material: '',
    type: ProductType.FINISHED_PRODUCT,
    category: { code: 'ELEC', name: '전자제품' },
    unit: { code: 'EA', name: '개' },
    safetyStock: 0,
    isActive: true,
    additionalInfo: {
      description: '',
      specifications: '',
      notes: '',
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProductUseCase = DIContainer.getInstance().getCreateProductUseCase();
  const updateProductUseCase = DIContainer.getInstance().getUpdateProductUseCase();

  useEffect(() => {
    if (product) {
      setFormData({
        nm_material: product.nm_material,
        type: product.type as ProductType,
        category: { code: product.category, name: product.categoryName },
        unit: { code: product.unit, name: product.unitName },
        safetyStock: product.safetyStock,
        isActive: product.isActive,
        additionalInfo: {
          description: '',
          specifications: '',
          notes: '',
        },
      });
    } else {
      setFormData({
        nm_material: '',
        type: ProductType.FINISHED_PRODUCT,
        category: { code: 'ELEC', name: '전자제품' },
        unit: { code: 'EA', name: '개' },
        safetyStock: 0,
        isActive: true,
        additionalInfo: {
          description: '',
          specifications: '',
          notes: '',
        },
      });
    }
    setError(null);
  }, [product, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (product) {
        const request: UpdateProductRequest = {
          productId: product.id,
          nm_material: formData.nm_material,
          type: formData.type,
          category: formData.category,
          unit: formData.unit,
          safetyStock: formData.safetyStock,
          isActive: formData.isActive,
          additionalInfo: formData.additionalInfo,
          id_updated: 'current-user', // TODO: 실제 사용자 ID
        };
        await updateProductUseCase.execute(request);
      } else {
        const request: CreateProductRequest = {
          nm_material: formData.nm_material,
          type: formData.type,
          category: formData.category,
          unit: formData.unit,
          safetyStock: formData.safetyStock,
          isActive: formData.isActive,
          additionalInfo: formData.additionalInfo,
          id_create: 'current-user', // TODO: 실제 사용자 ID
        };
        await createProductUseCase.execute(request);
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAdditionalInfoChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      additionalInfo: {
        ...prev.additionalInfo,
        [field]: value,
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen}>
      <ModalContent>
        <h2>{product ? '제품 수정' : '제품 등록'}</h2>
        
        {error && (
          <div style={{ color: '#dc3545', marginBottom: '16px', padding: '8px', background: '#f8d7da', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <label>제품명 *</label>
            <Input
              type="text"
              value={formData.nm_material}
              onChange={(e) => handleInputChange('nm_material', e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup>
            <label>제품유형 *</label>
            <Select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as ProductType)}
            >
              <option value={ProductType.FINISHED_PRODUCT}>완제품</option>
              <option value={ProductType.SEMI_FINISHED}>반제품</option>
              <option value={ProductType.RAW_MATERIAL}>원자재</option>
            </Select>
          </FormGroup>

          <Flex gap={16}>
            <FormGroup style={{ flex: 1 }}>
              <label>카테고리 *</label>
              <Select
                value={formData.category.code}
                onChange={(e) => {
                  const selectedOption = e.target.selectedOptions[0];
                  handleInputChange('category', {
                    code: e.target.value,
                    name: selectedOption.text,
                  });
                }}
              >
                <option value="ELEC">전자제품</option>
                <option value="MECH">기계부품</option>
                <option value="CHEM">화학제품</option>
                <option value="TEXT">섬유제품</option>
              </Select>
            </FormGroup>

            <FormGroup style={{ flex: 1 }}>
              <label>단위 *</label>
              <Select
                value={formData.unit.code}
                onChange={(e) => {
                  const selectedOption = e.target.selectedOptions[0];
                  handleInputChange('unit', {
                    code: e.target.value,
                    name: selectedOption.text,
                  });
                }}
              >
                <option value="EA">개</option>
                <option value="KG">킬로그램</option>
                <option value="M">미터</option>
                <option value="L">리터</option>
                <option value="SET">세트</option>
              </Select>
            </FormGroup>
          </Flex>

          <FormGroup>
            <label>안전재고</label>
            <Input
              type="number"
              min="0"
              value={formData.safetyStock}
              onChange={(e) => handleInputChange('safetyStock', parseInt(e.target.value) || 0)}
            />
          </FormGroup>

          <FormGroup>
            <label>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              사용 여부
            </label>
          </FormGroup>

          <FormGroup>
            <label>설명</label>
            <Input
              type="text"
              value={formData.additionalInfo.description}
              onChange={(e) => handleAdditionalInfoChange('description', e.target.value)}
              placeholder="제품에 대한 간단한 설명"
            />
          </FormGroup>

          <FormGroup>
            <label>규격</label>
            <Input
              type="text"
              value={formData.additionalInfo.specifications}
              onChange={(e) => handleAdditionalInfoChange('specifications', e.target.value)}
              placeholder="제품 규격 정보"
            />
          </FormGroup>

          <FormGroup>
            <label>비고</label>
            <Input
              type="text"
              value={formData.additionalInfo.notes}
              onChange={(e) => handleAdditionalInfoChange('notes', e.target.value)}
              placeholder="추가 참고사항"
            />
          </FormGroup>

          <Flex gap={8} justify="flex-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '처리 중...' : (product ? '수정' : '등록')}
            </Button>
          </Flex>
        </form>
      </ModalContent>
    </Modal>
  );
};