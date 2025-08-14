/**
 * UpdateOrderUseCase 수주 수정 유스케이스
 * 
 * 수주 정보를 전체적으로 수정하고 이력을 기록합니다.
 */

import { OrderRepository } from '../../../domain/repositories/OrderRepository';
import { OrderHistoryRepository } from '../../../domain/repositories/OrderHistoryRepository';
import { 
  Order, 
  OrderId, 
  OrderType, 
  OrderStatus, 
  OrderPriority, 
  OrderItem, 
  Customer, 
  Currency 
} from '../../../domain/entities/Order';
import { OrderHistory, OrderHistoryAction, ChangedField } from '../../../domain/entities/OrderHistory';

export interface UpdateOrderRequest {
  orderId: string;
  orderType: OrderType;
  customer: {
    name: string;
    phoneNumber: string;
    email?: string;
    address?: string;
  };
  items: {
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    unit: string;
  }[];
  currency: string;
  requestedDeliveryDate: Date;
  priority: OrderPriority;
  salesPerson: string;
  notes: string;
  updateReason: string;
  id_updated: string;
}

export interface UpdateOrderResponse {
  success: boolean;
  message: string;
  orderNo: string;
}

export class UpdateOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private orderHistoryRepository: OrderHistoryRepository
  ) {}

  async execute(request: UpdateOrderRequest): Promise<UpdateOrderResponse> {
    // 1. 기존 수주 조회
    const existingOrder = await this.orderRepository.findById(
      new OrderId(request.orderId)
    );
    if (!existingOrder) {
      throw new Error("존재하지 않는 수주입니다.");
    }

    // 2. 수정 가능 상태 확인
    await this.validateModifiability(existingOrder);

    // 3. 변경사항 감지
    const changedFields = this.detectChanges(existingOrder, request);
    if (changedFields.length === 0) {
      return {
        success: true,
        message: "변경사항이 없습니다.",
        orderNo: existingOrder.getOrderNo()
      };
    }

    // 4. 새로운 Order 엔티티 생성
    const updatedOrder = new Order(
      existingOrder.getId(),
      existingOrder.getOrderNo(), // 수주번호는 변경 불가
      request.orderType,
      new Customer(
        request.customer.name,
        request.customer.phoneNumber,
        request.customer.email || '',
        request.customer.address || ''
      ),
      request.items.map(item => new OrderItem(
        item.productCode,
        item.productName,
        item.quantity,
        item.unitPrice,
        item.unit
      )),
      Currency.fromCode(request.currency),
      existingOrder.getOrderDate(), // 주문일은 변경 불가
      request.requestedDeliveryDate,
      existingOrder.getStatus(), // 상태는 별도 UseCase로 변경
      request.priority,
      request.salesPerson,
      request.notes || '',
      existingOrder.getIdCreated(),
      request.id_updated,
      existingOrder.getDtCreate(),
      new Date()
    );

    // 5. 저장
    await this.orderRepository.save(updatedOrder);

    // 6. 이력 기록
    const history = new OrderHistory(
      this.generateHistoryId(),
      existingOrder.getId(),
      OrderHistoryAction.UPDATE,
      changedFields,
      request.id_updated,
      request.id_updated,
      new Date(),
      request.updateReason || `수주 정보 수정 (${changedFields.length}개 항목)`
    );
    await this.orderHistoryRepository.save(history);

    return {
      success: true,
      message: `수주 정보가 수정되었습니다 (${changedFields.length}개 항목 변경)`,
      orderNo: existingOrder.getOrderNo()
    };
  }

  private async validateModifiability(order: Order): Promise<void> {
    const status = order.getStatus();
    
    // 완료되거나 취소된 수주는 수정 불가
    if (status === OrderStatus.DELIVERED || status === OrderStatus.CANCELLED) {
      throw new Error("완료되거나 취소된 수주는 수정할 수 없습니다.");
    }

    // 생산 중인 수주는 일부만 수정 가능 (이 경우 별도 처리 필요)
    if (status === OrderStatus.IN_PRODUCTION || 
        status === OrderStatus.READY_TO_SHIP || 
        status === OrderStatus.SHIPPED) {
      // 실제로는 더 세밀한 검증이 필요하지만, 여기서는 경고만
      console.warn("생산 진행 중인 수주는 일부 정보만 수정 가능합니다.");
    }
  }

  private detectChanges(existingOrder: Order, request: UpdateOrderRequest): ChangedField[] {
    const changedFields: ChangedField[] = [];

    // 수주 타입 변경
    if (existingOrder.getOrderType() !== request.orderType) {
      changedFields.push(new ChangedField(
        "orderType",
        existingOrder.getOrderType(),
        request.orderType
      ));
    }

    // 고객 정보 변경
    const existingCustomer = existingOrder.getCustomer();
    if (existingCustomer.name !== request.customer.name) {
      changedFields.push(new ChangedField(
        "customerName",
        existingCustomer.name,
        request.customer.name
      ));
    }
    if (existingCustomer.phoneNumber !== request.customer.phoneNumber) {
      changedFields.push(new ChangedField(
        "customerPhone",
        existingCustomer.phoneNumber,
        request.customer.phoneNumber
      ));
    }

    // 납기일 변경
    const existingDeliveryDate = existingOrder.getRequestedDeliveryDate();
    if (existingDeliveryDate.getTime() !== request.requestedDeliveryDate.getTime()) {
      changedFields.push(new ChangedField(
        "requestedDeliveryDate",
        existingDeliveryDate.toISOString().split('T')[0],
        request.requestedDeliveryDate.toISOString().split('T')[0]
      ));
    }

    // 우선순위 변경
    if (existingOrder.getPriority() !== request.priority) {
      changedFields.push(new ChangedField(
        "priority",
        existingOrder.getPriority(),
        request.priority
      ));
    }

    // 영업담당자 변경
    if (existingOrder.getSalesPerson() !== request.salesPerson) {
      changedFields.push(new ChangedField(
        "salesPerson",
        existingOrder.getSalesPerson(),
        request.salesPerson
      ));
    }

    // 품목 변경 감지 (간단한 비교, 실제로는 더 복잡한 로직 필요)
    const existingItems = existingOrder.getItems();
    if (existingItems.length !== request.items.length) {
      changedFields.push(new ChangedField(
        "itemCount",
        existingItems.length.toString(),
        request.items.length.toString()
      ));
    } else {
      // 각 품목별 상세 비교
      for (let i = 0; i < existingItems.length; i++) {
        const existing = existingItems[i];
        const requested = request.items[i];
        
        if (existing.getQuantity() !== requested.quantity) {
          changedFields.push(new ChangedField(
            `item[${i}].quantity`,
            existing.getQuantity().toString(),
            requested.quantity.toString()
          ));
        }
        
        if (existing.getUnitPrice() !== requested.unitPrice) {
          changedFields.push(new ChangedField(
            `item[${i}].unitPrice`,
            existing.getUnitPrice().toString(),
            requested.unitPrice.toString()
          ));
        }
      }
    }

    // 비고 변경
    if (existingOrder.getNotes() !== request.notes) {
      changedFields.push(new ChangedField(
        "notes",
        existingOrder.getNotes() || "(없음)",
        request.notes || "(없음)"
      ));
    }

    return changedFields;
  }

  private generateHistoryId(): string {
    return "HIST-" + Date.now().toString() + "-" + Math.random().toString(36).substr(2, 5);
  }
}