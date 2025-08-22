import React, { useState, useEffect } from 'react';
import { ProductListItem } from '../../application/usecases/product/GetProductListUseCase';
import { CreateProductRequest } from '../../application/usecases/product/CreateProductUseCase';
import { UpdateProductRequest } from '../../application/usecases/product/UpdateProductUseCase';
import { ProductType } from '../../domain/entities/Product';
import { Modal, ModalContent, FormGroup, Input, Select, Button, Flex } from '@shared/utils/styled';
import { useCreateProduct, useUpdateProduct } from '../hooks/useProductList';
import { useProductDetail } from '../hooks/useProductDetail';
import { NotificationModal } from '@shared/components/common/NotificationModal';

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
  // 모드 구분을 명확하게 하기 위한 상태
  const isEditMode = Boolean(product?.id);
  
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

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // 중복 제출 방지 플래그
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  // Mutation Hooks 사용
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  
  // 제품 상세 정보 조회 (product.id가 있을 때만)
  const { productDetail, loading: detailLoading } = useProductDetail(product?.id);

  // 제품 상세 정보가 로드되면 폼 데이터 업데이트
  useEffect(() => {
    if (productDetail && isEditMode) {
      console.log('🎯 Setting form data from product detail:', productDetail);
      setFormData({
        nm_material: productDetail.nm_material,
        type: productDetail.type as ProductType,
        category: productDetail.category,
        unit: productDetail.unit,
        safetyStock: productDetail.safetyStock,
        isActive: productDetail.isActive,
        additionalInfo: {
          description: productDetail.additionalInfo?.description || '',
          specifications: productDetail.additionalInfo?.specifications || '',
          notes: productDetail.additionalInfo?.notes || '',
        },
      });
    }
  }, [productDetail, isEditMode]);

  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      if (!product) {
        // 신규 등록 시 초기화
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
      // 수정 모드인 경우 productDetail이 로드될 때까지 기다림
      setError(null);
      setIsSubmitting(false);
    }
  }, [product, isOpen]);

  // Mutation 성공 처리 - 신규 등록
  React.useEffect(() => {
    if (createProductMutation.isSuccess) {
      // 성공 알림 표시
      setNotification({
        isOpen: true,
        type: 'success',
        title: '등록 완료',
        message: '제품이 성공적으로 등록되었습니다.'
      });
      
      // 폼 데이터 초기화
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
      
      setIsSubmitting(false);
    }
  }, [createProductMutation.isSuccess]);

  // Mutation 성공 처리 - 수정
  React.useEffect(() => {
    if (updateProductMutation.isSuccess) {
      // 성공 알림 표시
      setNotification({
        isOpen: true,
        type: 'success',
        title: '수정 완료',
        message: '제품이 성공적으로 수정되었습니다.'
      });
      
      setIsSubmitting(false);
    }
  }, [updateProductMutation.isSuccess]);

  React.useEffect(() => {
    if (createProductMutation.isError) {
      const error = createProductMutation.error;
      setError(error instanceof Error ? error.message : '제품 등록 중 오류가 발생했습니다.');
      setIsSubmitting(false); // 에러 발생 시 isSubmitting 해제
    }
  }, [createProductMutation.isError, createProductMutation.error]);

  React.useEffect(() => {
    if (updateProductMutation.isError) {
      const error = updateProductMutation.error;
      setError(error instanceof Error ? error.message : '제품 수정 중 오류가 발생했습니다.');
      setIsSubmitting(false); // 에러 발생 시 isSubmitting 해제
    }
  }, [updateProductMutation.isError, updateProductMutation.error]);

  const handleSubmit = () => {
    setError(null);

    // 이미 처리 중인 경우 중복 제출 방지
    if (isSubmitting || createProductMutation.isLoading || updateProductMutation.isLoading) {
      console.log('이미 처리 중입니다.');
      return;
    }

    // 필수 필드 검증
    if (!formData.nm_material) {
      setError('제품명은 필수 입력 항목입니다.');
      return;
    }

    // 제출 상태 설정
    setIsSubmitting(true);

    // isEditMode로 명확하게 구분
    if (isEditMode && product?.id) {
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
      
      updateProductMutation.mutate(request);
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
      
      createProductMutation.mutate(request);
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
    <>
      <Modal isOpen={isOpen}>
      <ModalContent>
        <h2>{isEditMode ? '제품 수정' : '제품 등록'}</h2>
        
        {/* 로딩 상태 표시 */}
        {isEditMode && detailLoading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px',
            color: '#666'
          }}>
            제품 정보를 불러오는 중...
          </div>
        )}
        
        {error && (
          <div style={{ color: '#dc3545', marginBottom: '16px', padding: '8px', background: '#f8d7da', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        {/* 로딩 중이 아닐 때만 폼 표시 */}
        {!(isEditMode && detailLoading) && (
        <div>
          <FormGroup>
            <label>제품명 *</label>
            <Input
              type="text"
              value={formData.nm_material}
              onChange={(e) => handleInputChange('nm_material', e.target.value)}
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
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting || createProductMutation.isLoading || updateProductMutation.isLoading}>
              취소
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting || createProductMutation.isLoading || updateProductMutation.isLoading}>
              {(isSubmitting || createProductMutation.isLoading || updateProductMutation.isLoading) ? '처리 중...' : (isEditMode ? '수정' : '등록')}
            </Button>
          </Flex>
        </div>
        )}
      </ModalContent>
      </Modal>

      {/* 알림 모달 */}
      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          onSuccess();
          onClose();
          window.location.reload();
        }}
      />
    </>
  );
};