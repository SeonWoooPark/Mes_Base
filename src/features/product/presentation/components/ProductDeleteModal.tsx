import React, { useState } from 'react';
import { ProductListItem } from '../../application/usecases/product/GetProductListUseCase';
import { Modal, ModalContent, FormGroup, Input, Button, Flex } from '@shared/utils/styled';
import { useDeleteProduct } from '../hooks/useProductList';
import { NotificationModal } from '@shared/components/common/NotificationModal';

interface ProductDeleteModalProps {
  isOpen: boolean;
  product: ProductListItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductDeleteModal: React.FC<ProductDeleteModalProps> = ({
  isOpen,
  product,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });
  
  const deleteProductMutation = useDeleteProduct();
  
  // 중복 실행 방지를 위한 ref
  const isProcessedRef = React.useRef(false);
  
  // 모달이 열릴 때 ref 초기화
  React.useEffect(() => {
    if (isOpen) {
      isProcessedRef.current = false;
    }
  }, [isOpen]);

  // Mutation 성공/실패 처리 - 중복 실행 방지
  React.useEffect(() => {
    if (deleteProductMutation.isSuccess && !isProcessedRef.current) {
      isProcessedRef.current = true;
      setNotification({
        isOpen: true,
        type: 'success',
        title: '삭제 완료',
        message: '제품이 성공적으로 삭제되었습니다.'
      });
      setReason('');
    }
  }, [deleteProductMutation.isSuccess]);

  React.useEffect(() => {
    if (deleteProductMutation.isError) {
      const error = deleteProductMutation.error;
      setError(error instanceof Error ? error.message : '제품 삭제 중 오류가 발생했습니다.');
    }
  }, [deleteProductMutation.isError, deleteProductMutation.error]);

  const handleDelete = () => {
    if (!product) return;
    
    // 이미 처리 중인 경우 중복 제출 방지
    if (deleteProductMutation.isLoading) {
      return;
    }
    
    setError(null);
    
    deleteProductMutation.mutate({
      productId: product.id,
      id_updated: 'current-user', // TODO: 실제 로그인된 사용자 ID 사용
      reason: reason || '사용자 요청에 의한 삭제',
    });
  };

  const handleClose = () => {
    setReason('');
    setError(null);
    onClose();
  };

  if (!isOpen || !product) return null;

  return (
    <>
      <Modal isOpen={isOpen}>
      <ModalContent>
        <h2>제품 삭제 확인</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <p style={{ marginBottom: '16px' }}>
            다음 제품을 삭제하시겠습니까?
          </p>
          <div style={{ 
            padding: '12px', 
            background: '#f8f9fa', 
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            <p style={{ margin: '4px 0' }}><strong>제품코드:</strong> {product.cd_material}</p>
            <p style={{ margin: '4px 0' }}><strong>제품명:</strong> {product.nm_material}</p>
            <p style={{ margin: '4px 0' }}><strong>제품유형:</strong> {product.typeName}</p>
          </div>
          
          <div style={{ 
            padding: '12px', 
            background: '#fff3cd', 
            border: '1px solid #ffc107',
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            <p style={{ margin: 0, color: '#856404' }}>
              ⚠️ 주의: 삭제된 제품은 비활성화 상태로 변경되며, 이력은 보존됩니다.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ 
            color: '#dc3545', 
            marginBottom: '16px', 
            padding: '8px', 
            background: '#f8d7da', 
            borderRadius: '4px' 
          }}>
            {error}
          </div>
        )}

        <FormGroup>
          <label>삭제 사유</label>
          <Input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="삭제 사유를 입력해주세요 (선택사항)"
          />
        </FormGroup>

        <Flex gap={8} justify="flex-end">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleClose}
            disabled={deleteProductMutation.isLoading}
          >
            취소
          </Button>
          <Button 
            type="button"
            onClick={handleDelete}
            disabled={deleteProductMutation.isLoading}
            style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
          >
            {deleteProductMutation.isLoading ? '삭제 중...' : '삭제'}
          </Button>
        </Flex>
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