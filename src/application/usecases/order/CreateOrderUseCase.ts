/**
 * CreateOrderUseCase 수주 등록 유스케이스
 */

import { OrderRepository } from '../../../domain/repositories/OrderRepository';
import { OrderHistoryRepository } from '../../../domain/repositories/OrderHistoryRepository';
import { OrderNoGenerator } from '../../../domain/services/OrderNoGenerator';
import { Order, OrderId, OrderType, OrderStatus, OrderPriority, Customer, Currency, OrderItem } from '../../../domain/entities/Order';
import { OrderHistory, OrderHistoryAction } from '../../../domain/entities/OrderHistory';

export interface CreateOrderRequest {
  orderType: OrderType;
  customer: {
    code: string;
    name: string;
    contactPerson: string;
    phoneNumber: string;
    email: string;
    address: string;
  };
  requestedDeliveryDate: Date;
  priority: OrderPriority;
  notes: string;
  salesPerson: string;
  items: CreateOrderItemRequest[];
  id_create: string; // 생성자 ID
}

export interface CreateOrderItemRequest {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  deliveryDate: Date;
  notes: string;
}

export interface CreateOrderResponse {
  orderId: string;
  orderNo: string;
  orderType: string;
  success: boolean;
  message: string;
}

export class CreateOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private orderHistoryRepository: OrderHistoryRepository,
    private orderNoGenerator: OrderNoGenerator
  ) {}

  async execute(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    // 1. 비즈니스 규칙 검증
    await this.validateBusinessRules(request);

    // 2. 수주번호 자동 채번 (수주 타입 반영)
    const orderNo = await this.orderNoGenerator.generateOrderNo(
      request.orderType
    );

    // 수주번호 유효성 재검증
    if (!this.orderNoGenerator.validateOrderNo(orderNo)) {
      throw new Error("수주번호 생성에 실패했습니다.");
    }

    // 3. 수주 품목 생성
    const orderItems = this.createOrderItems(request.items);

    // 4. 총 금액 계산
    const totalAmount = orderItems.reduce(
      (total, item) => total + item.getAmount(),
      0
    );

    // 5. 수주 엔티티 생성
    const orderId = new OrderId(this.generateOrderId());
    const customer = new Customer(
      request.customer.code,
      request.customer.name,
      request.customer.contactPerson,
      request.customer.phoneNumber,
      request.customer.email,
      request.customer.address
    );
    const currency = new Currency("KRW", "원화", "₩"); // 기본 통화

    const now = new Date();
    const order = new Order(
      orderId,
      orderNo,
      request.orderType,
      customer,
      now, // 수주일은 현재 날짜
      request.requestedDeliveryDate,
      OrderStatus.PENDING, // 초기 상태는 대기
      orderItems,
      totalAmount,
      currency,
      request.priority,
      request.notes,
      request.salesPerson,
      request.id_create, // 생성자
      request.id_create, // 수정자 (신규 등록 시 생성자와 동일)
      now, // dt_create
      now // dt_update
    );

    // 6. 저장
    await this.orderRepository.save(order);

    // 7. 이력 기록
    const history = new OrderHistory(
      this.generateHistoryId(),
      orderId,
      OrderHistoryAction.CREATE,
      [],
      request.id_create,
      request.id_create, // 생성자명 (실제로는 사용자 정보 조회 필요)
      new Date(),
      `신규 수주 등록 (${this.getOrderTypeDisplayName(request.orderType)})`
    );
    await this.orderHistoryRepository.save(history);

    return {
      orderId: orderId.getValue(),
      orderNo: orderNo,
      orderType: this.getOrderTypeDisplayName(request.orderType),
      success: true,
      message: `수주가 성공적으로 등록되었습니다. (수주번호: ${orderNo})`,
    };
  }

  private async validateBusinessRules(
    request: CreateOrderRequest
  ): Promise<void> {
    // 납기일 검증
    const today = new Date();
    if (request.requestedDeliveryDate <= today) {
      throw new Error("납기일은 오늘 날짜보다 나중이어야 합니다.");
    }

    // 수주 타입별 특별 검증
    await this.validateByOrderType(request);

    // 수주 품목 검증
    if (!request.items || request.items.length === 0) {
      throw new Error("수주 품목은 최소 1개 이상이어야 합니다.");
    }
  }

  private async validateByOrderType(
    request: CreateOrderRequest
  ): Promise<void> {
    switch (request.orderType) {
      case OrderType.EXPORT:
        // 수출 수주의 경우 추가 검증
        if (!request.customer.email || !request.customer.email.includes("@")) {
          throw new Error("수출 수주는 고객 이메일이 필수입니다.");
        }
        break;

      case OrderType.SAMPLE:
        // 샘플 수주의 경우 수량 제한
        const totalQuantity = request.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        if (totalQuantity > 100) {
          throw new Error("샘플 수주는 총 수량이 100개를 초과할 수 없습니다.");
        }
        break;

      case OrderType.REPAIR:
        // 수리 수주의 경우 특별 승인 필요
        if (
          request.priority !== OrderPriority.HIGH &&
          request.priority !== OrderPriority.URGENT
        ) {
          throw new Error("수리 수주는 높음 이상의 우선순위가 필요합니다.");
        }
        break;

      case OrderType.DOMESTIC:
      default:
        // 내수 수주는 기본 검증만
        break;
    }
  }

  private createOrderItems(
    itemRequests: CreateOrderItemRequest[]
  ): OrderItem[] {
    return itemRequests.map((itemRequest) => {
      const amount = itemRequest.quantity * itemRequest.unitPrice;

      return new OrderItem(
        this.generateOrderItemId(),
        itemRequest.productId,
        itemRequest.productCode,
        itemRequest.productName,
        itemRequest.quantity,
        itemRequest.unit,
        itemRequest.unitPrice,
        amount,
        itemRequest.deliveryDate,
        itemRequest.notes
      );
    });
  }

  private getOrderTypeDisplayName(orderType: OrderType): string {
    switch (orderType) {
      case OrderType.DOMESTIC:
        return "내수";
      case OrderType.EXPORT:
        return "수출";
      case OrderType.SAMPLE:
        return "샘플";
      case OrderType.REPAIR:
        return "수리";
      default:
        return "내수";
    }
  }

  private generateOrderId(): string {
    return "ORD-" + Date.now().toString();
  }

  private generateOrderItemId(): string {
    return (
      "ITEM-" +
      Date.now().toString() +
      "-" +
      Math.random().toString(36).substr(2, 9)
    );
  }

  private generateHistoryId(): string {
    return "HIST-" + Date.now().toString();
  }
}