/**
 * OrderFormModal 수주 등록/수정 모달
 * 
 * 새로운 수주를 등록하거나 기존 수주를 수정합니다.
 */

import React, { useState, useEffect } from 'react';
import { OrderListItem } from '../../../application/usecases/order/GetOrderListUseCase';
import { CreateOrderRequest } from '../../../application/usecases/order/CreateOrderUseCase';
import { UpdateOrderRequest } from '../../../application/usecases/order/UpdateOrderUseCase';
import { OrderType, OrderStatus, OrderPriority } from '../../../domain/entities/Order';
import { Modal, ModalContent, FormGroup, Input, Select, Button, Flex } from '../../utils/styled';
import { DIContainer } from '../../../config/DIContainer';

interface OrderFormModalProps {
  isOpen: boolean;
  order?: OrderListItem; // 수정할 수주 (신규 등록 시 undefined)
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  orderType: OrderType;
  customerName: string;
  customerContact: string;
  customerEmail: string;
  customerAddress: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  currency: string;
  requestedDeliveryDate: string;
  priority: OrderPriority;
  salesPerson: string;
  notes: string;
}

const initialFormData: FormData = {
  orderType: OrderType.DOMESTIC,
  customerName: '',
  customerContact: '',
  customerEmail: '',
  customerAddress: '',
  productName: '',
  productCode: '',
  quantity: 1,
  unitPrice: 0,
  unit: 'EA',
  currency: 'KRW',
  requestedDeliveryDate: '',
  priority: OrderPriority.NORMAL,
  salesPerson: '',
  notes: ''
};

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  order,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UseCase 가져오기
  const createOrderUseCase = DIContainer.getInstance().getCreateOrderUseCase();
  const updateOrderUseCase = DIContainer.getInstance().getUpdateOrderUseCase();

  // 수정 모드일 때 폼 데이터 초기화
  useEffect(() => {
    if (isOpen) {
      if (order) {
        // 수정 모드
        setFormData({
          orderType: order.orderType as OrderType,
          customerName: order.customerName,
          customerContact: order.customerContact,
          customerEmail: '', // OrderListItem에 없으므로 빈 값
          customerAddress: '', // OrderListItem에 없으므로 빈 값
          productName: order.productName,
          productCode: order.productCode,
          quantity: order.quantity,
          unitPrice: order.unitPrice,
          unit: 'EA', // 기본값
          currency: order.currency,
          requestedDeliveryDate: order.requestedDeliveryDate.toISOString().split('T')[0],
          priority: order.priority as OrderPriority,
          salesPerson: order.salesPerson,
          notes: order.notes
        });
      } else {
        // 신규 등록 모드 - 일주일 후를 기본 납기일로
        const defaultDeliveryDate = new Date();
        defaultDeliveryDate.setDate(defaultDeliveryDate.getDate() + 7);
        
        setFormData({
          ...initialFormData,
          requestedDeliveryDate: defaultDeliveryDate.toISOString().split('T')[0]
        });
      }
      setError(null);
    }
  }, [isOpen, order]);

  // 폼 필드 변경 핸들러
  const handleFieldChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (order) {
        // 수정 모드
        const request: UpdateOrderRequest = {
          orderId: order.id,
          orderType: formData.orderType,
          customer: {
            name: formData.customerName,
            phoneNumber: formData.customerContact,
            email: formData.customerEmail,
            address: formData.customerAddress
          },
          items: [{
            productCode: formData.productCode,
            productName: formData.productName,
            quantity: formData.quantity,
            unitPrice: formData.unitPrice,
            unit: formData.unit
          }],
          currency: formData.currency,
          requestedDeliveryDate: new Date(formData.requestedDeliveryDate),
          priority: formData.priority,
          salesPerson: formData.salesPerson,
          notes: formData.notes,
          updateReason: '사용자 요청에 의한 수정',
          id_updated: 'current-user' // TODO: 실제 사용자 ID
        };

        await updateOrderUseCase.execute(request);
      } else {
        // 신규 등록 모드
        const request: CreateOrderRequest = {
          orderType: formData.orderType,
          customer: {
            name: formData.customerName,
            phoneNumber: formData.customerContact,
            email: formData.customerEmail,
            address: formData.customerAddress
          },
          items: [{
            productCode: formData.productCode,
            productName: formData.productName,
            quantity: formData.quantity,
            unitPrice: formData.unitPrice,
            unit: formData.unit
          }],
          currency: formData.currency,
          requestedDeliveryDate: new Date(formData.requestedDeliveryDate),
          priority: formData.priority,
          salesPerson: formData.salesPerson,
          notes: formData.notes,
          id_created: 'current-user', // TODO: 실제 사용자 ID
          id_updated: 'current-user'
        };

        await createOrderUseCase.execute(request);
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent style={{ maxWidth: '800px' }}>
        <h2 style={{ marginBottom: '24px' }}>
          {order ? '수주 수정' : '신규 수주 등록'}
        </h2>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24', 
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 기본 정보 섹션 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
              기본 정보
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FormGroup>
                <label>주문 유형 <span style={{ color: '#dc3545' }}>*</span></label>
                <Select
                  value={formData.orderType}
                  onChange={(e) => handleFieldChange('orderType', e.target.value as OrderType)}
                  required
                  disabled={loading}
                >
                  <option value={OrderType.DOMESTIC}>내수</option>
                  <option value={OrderType.EXPORT}>수출</option>
                  <option value={OrderType.SAMPLE}>샘플</option>
                  <option value={OrderType.REPAIR}>수리</option>
                </Select>
              </FormGroup>

              <FormGroup>
                <label>우선순위 <span style={{ color: '#dc3545' }}>*</span></label>
                <Select
                  value={formData.priority}
                  onChange={(e) => handleFieldChange('priority', e.target.value as OrderPriority)}
                  required
                  disabled={loading}
                >
                  <option value={OrderPriority.LOW}>낮음</option>
                  <option value={OrderPriority.NORMAL}>보통</option>
                  <option value={OrderPriority.HIGH}>높음</option>
                  <option value={OrderPriority.URGENT}>긴급</option>
                </Select>
              </FormGroup>

              <FormGroup>
                <label>납기일 <span style={{ color: '#dc3545' }}>*</span></label>
                <Input
                  type="date"
                  value={formData.requestedDeliveryDate}
                  onChange={(e) => handleFieldChange('requestedDeliveryDate', e.target.value)}
                  required
                  disabled={loading}
                  min={new Date().toISOString().split('T')[0]}
                />
              </FormGroup>

              <FormGroup>
                <label>영업 담당자</label>
                <Input
                  type="text"
                  value={formData.salesPerson}
                  onChange={(e) => handleFieldChange('salesPerson', e.target.value)}
                  disabled={loading}
                  placeholder="담당자명 입력"
                />
              </FormGroup>
            </div>
          </div>

          {/* 고객 정보 섹션 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
              고객 정보
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FormGroup>
                <label>고객명 <span style={{ color: '#dc3545' }}>*</span></label>
                <Input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => handleFieldChange('customerName', e.target.value)}
                  required
                  disabled={loading}
                  placeholder="고객명 입력"
                />
              </FormGroup>

              <FormGroup>
                <label>연락처 <span style={{ color: '#dc3545' }}>*</span></label>
                <Input
                  type="tel"
                  value={formData.customerContact}
                  onChange={(e) => handleFieldChange('customerContact', e.target.value)}
                  required
                  disabled={loading}
                  placeholder="010-0000-0000"
                />
              </FormGroup>

              <FormGroup>
                <label>이메일</label>
                <Input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => handleFieldChange('customerEmail', e.target.value)}
                  disabled={loading}
                  placeholder="example@email.com"
                />
              </FormGroup>

              <FormGroup>
                <label>주소</label>
                <Input
                  type="text"
                  value={formData.customerAddress}
                  onChange={(e) => handleFieldChange('customerAddress', e.target.value)}
                  disabled={loading}
                  placeholder="배송 주소 입력"
                />
              </FormGroup>
            </div>
          </div>

          {/* 제품 정보 섹션 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
              제품 정보
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FormGroup>
                <label>제품코드 <span style={{ color: '#dc3545' }}>*</span></label>
                <Input
                  type="text"
                  value={formData.productCode}
                  onChange={(e) => handleFieldChange('productCode', e.target.value)}
                  required
                  disabled={loading}
                  placeholder="제품코드 입력"
                />
              </FormGroup>

              <FormGroup>
                <label>제품명 <span style={{ color: '#dc3545' }}>*</span></label>
                <Input
                  type="text"
                  value={formData.productName}
                  onChange={(e) => handleFieldChange('productName', e.target.value)}
                  required
                  disabled={loading}
                  placeholder="제품명 입력"
                />
              </FormGroup>

              <FormGroup>
                <label>수량 <span style={{ color: '#dc3545' }}>*</span></label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 0)}
                  required
                  min="1"
                  disabled={loading}
                />
              </FormGroup>

              <FormGroup>
                <label>단가 <span style={{ color: '#dc3545' }}>*</span></label>
                <Input
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => handleFieldChange('unitPrice', parseFloat(e.target.value) || 0)}
                  required
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
              </FormGroup>

              <FormGroup>
                <label>단위</label>
                <Select
                  value={formData.unit}
                  onChange={(e) => handleFieldChange('unit', e.target.value)}
                  disabled={loading}
                >
                  <option value="EA">EA (개)</option>
                  <option value="SET">SET (세트)</option>
                  <option value="BOX">BOX (박스)</option>
                  <option value="KG">KG (킬로그램)</option>
                </Select>
              </FormGroup>

              <FormGroup>
                <label>통화</label>
                <Select
                  value={formData.currency}
                  onChange={(e) => handleFieldChange('currency', e.target.value)}
                  disabled={loading}
                >
                  <option value="KRW">KRW (원)</option>
                  <option value="USD">USD (달러)</option>
                  <option value="EUR">EUR (유로)</option>
                  <option value="JPY">JPY (엔)</option>
                </Select>
              </FormGroup>
            </div>

            {/* 총 금액 표시 */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              textAlign: 'right'
            }}>
              <strong>총 금액: </strong>
              <span style={{ fontSize: '18px', color: '#007bff' }}>
                {formData.currency === 'KRW' ? '₩' : formData.currency === 'USD' ? '$' : formData.currency}
                {(formData.quantity * formData.unitPrice).toLocaleString()}
              </span>
            </div>
          </div>

          {/* 비고 섹션 */}
          <FormGroup>
            <label>비고</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              disabled={loading}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical'
              }}
              placeholder="추가 메모사항을 입력하세요"
            />
          </FormGroup>

          {/* 버튼 영역 */}
          <Flex justify="flex-end" gap={12} style={{ marginTop: '24px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? '처리 중...' : (order ? '수정' : '등록')}
            </Button>
          </Flex>
        </form>
      </ModalContent>
    </Modal>
  );
};