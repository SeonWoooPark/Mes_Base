/**
 * Order 수주 도메인 엔티티
 * 
 * MES 시스템의 수주관리 핵심 비즈니스 객체
 * 수주 번호 자동 채번, 상태 관리, 비즈니스 규칙 검증을 담당
 */

export class OrderId {
  constructor(private readonly value: string) {
    if (!value || value.length === 0) {
      throw new Error('Order ID는 필수입니다.');
    }
  }

  public getValue(): string { return this.value; }
  public equals(other: OrderId): boolean {
    return this.value === other.value;
  }
}

export enum OrderType {
  DOMESTIC = 'DOMESTIC',     // 내수
  EXPORT = 'EXPORT',         // 수출
  SAMPLE = 'SAMPLE',         // 샘플
  REPAIR = 'REPAIR'          // 수리
}

export enum OrderStatus {
  PENDING = 'PENDING',           // 대기
  CONFIRMED = 'CONFIRMED',       // 확정 (기존 APPROVED 대신)
  IN_PRODUCTION = 'IN_PRODUCTION', // 생산중
  READY_TO_SHIP = 'READY_TO_SHIP', // 출하준비
  SHIPPED = 'SHIPPED',           // 출하완료
  DELIVERED = 'DELIVERED',       // 납품완료
  CANCELLED = 'CANCELLED'        // 취소
}

export enum OrderPriority {
  LOW = 'LOW',         // 낮음
  NORMAL = 'NORMAL',   // 보통
  HIGH = 'HIGH',       // 높음
  URGENT = 'URGENT'    // 긴급
}

export class Customer {
  constructor(
    public readonly code: string,
    public readonly name: string,
    public readonly contactPerson: string,
    public readonly phoneNumber: string,
    public readonly email: string,
    public readonly address: string
  ) {}
}

export class Currency {
  constructor(
    public readonly code: string,    // KRW, USD, EUR 등
    public readonly name: string,    // 원화, 달러, 유로 등
    public readonly symbol: string   // ₩, $, € 등
  ) {}
}

export class OrderItem {
  constructor(
    private readonly id: string,
    private readonly productId: string,
    private readonly productCode: string,
    private readonly productName: string,
    private readonly quantity: number,
    private readonly unit: string,
    private readonly unitPrice: number,
    private readonly amount: number,
    private readonly deliveryDate: Date,
    private readonly notes: string
  ) {
    this.validateOrderItem();
  }

  private validateOrderItem(): void {
    if (!this.productId || this.productId.trim().length === 0) {
      throw new Error('제품 ID는 필수입니다.');
    }
    if (this.quantity <= 0) {
      throw new Error('수량은 0보다 커야 합니다.');
    }
    if (this.unitPrice < 0) {
      throw new Error('단가는 0 이상이어야 합니다.');
    }
    if (Math.abs(this.amount - (this.quantity * this.unitPrice)) > 0.01) {
      throw new Error('금액이 수량 × 단가와 일치하지 않습니다.');
    }
  }

  public isValid(): boolean {
    return this.quantity > 0 && this.unitPrice >= 0;
  }

  public hasValidBOM(): boolean {
    // 실제로는 BOMService를 통해 해당 제품의 BOM 존재 여부 확인
    return true;
  }

  // Getters
  public getId(): string { return this.id; }
  public getProductId(): string { return this.productId; }
  public getProductCode(): string { return this.productCode; }
  public getProductName(): string { return this.productName; }
  public getQuantity(): number { return this.quantity; }
  public getUnit(): string { return this.unit; }
  public getUnitPrice(): number { return this.unitPrice; }
  public getAmount(): number { return this.amount; }
  public getDeliveryDate(): Date { return this.deliveryDate; }
  public getNotes(): string { return this.notes; }
}

export class Order {
  constructor(
    private readonly id: OrderId,
    private readonly orderNo: string,
    private readonly orderType: OrderType,
    private readonly customer: Customer,
    private readonly orderDate: Date,
    private readonly requestedDeliveryDate: Date,
    private readonly status: OrderStatus,
    private readonly items: OrderItem[],
    private readonly totalAmount: number,
    private readonly currency: Currency,
    private readonly priority: OrderPriority,
    private readonly notes: string,
    private readonly salesPerson: string,
    private readonly id_create: string,
    private readonly id_updated: string,
    private readonly dt_create: Date,
    private readonly dt_update: Date
  ) {
    this.validateOrder();
  }

  // 비즈니스 규칙: 수주 정보 검증
  private validateOrder(): void {
    if (!this.orderNo || this.orderNo.trim().length === 0) {
      throw new Error('수주번호는 필수입니다.');
    }
    if (!this.customer) {
      throw new Error('고객 정보는 필수입니다.');
    }
    if (this.requestedDeliveryDate <= this.orderDate) {
      throw new Error('납기일은 수주일보다 나중이어야 합니다.');
    }
    if (this.items.length === 0) {
      throw new Error('수주 품목은 최소 1개 이상이어야 합니다.');
    }
    if (this.totalAmount < 0) {
      throw new Error('총 금액은 0 이상이어야 합니다.');
    }
    if (!this.id_create || this.id_create.trim().length === 0) {
      throw new Error('생성자는 필수입니다.');
    }
    if (!this.id_updated || this.id_updated.trim().length === 0) {
      throw new Error('수정자는 필수입니다.');
    }
  }

  // 비즈니스 로직: 수주 승인(확정) 가능 여부
  public canBeConfirmed(): boolean {
    return this.status === OrderStatus.PENDING &&
           this.items.every(item => item.isValid()) &&
           this.isWithinDeliveryCapacity();
  }

  // 비즈니스 로직: 생산 지시 가능 여부
  public canCreateProductionOrder(): boolean {
    return this.status === OrderStatus.CONFIRMED &&
           this.items.every(item => item.hasValidBOM());
  }

  // 비즈니스 로직: 납기 지연 여부
  public isDelayed(): boolean {
    return new Date() > this.requestedDeliveryDate &&
           this.status !== OrderStatus.DELIVERED &&
           this.status !== OrderStatus.CANCELLED;
  }

  // 비즈니스 로직: 취소 가능 여부
  public canBeCancelled(): boolean {
    return this.status === OrderStatus.PENDING ||
           this.status === OrderStatus.CONFIRMED;
  }

  // 비즈니스 로직: 출하 가능 여부
  public canBeShipped(): boolean {
    return this.status === OrderStatus.READY_TO_SHIP;
  }

  // 비즈니스 로직: 납기 용량 확인
  private isWithinDeliveryCapacity(): boolean {
    // 해당 납기일의 생산 용량 확인 로직
    return true; // 실제로는 ProductionCapacityService 호출
  }

  // 비즈니스 로직: 총 금액 계산
  public calculateTotalAmount(): number {
    return this.items.reduce((total, item) => total + item.getAmount(), 0);
  }

  // 비즈니스 로직: 수주 상태 변경
  public changeStatus(newStatus: OrderStatus, reason?: string): Order {
    this.validateStatusTransition(newStatus);

    return new Order(
      this.id,
      this.orderNo,
      this.orderType,
      this.customer,
      this.orderDate,
      this.requestedDeliveryDate,
      newStatus,
      this.items,
      this.totalAmount,
      this.currency,
      this.priority,
      this.notes,
      this.salesPerson,
      this.id_create,
      this.id_updated,
      this.dt_create,
      new Date()
    );
  }

  // 비즈니스 규칙: 상태 전환 검증
  private validateStatusTransition(newStatus: OrderStatus): void {
    const validTransitions: Map<OrderStatus, OrderStatus[]> = new Map([
      [OrderStatus.PENDING, [OrderStatus.CONFIRMED, OrderStatus.CANCELLED]],
      [OrderStatus.CONFIRMED, [OrderStatus.IN_PRODUCTION, OrderStatus.CANCELLED]],
      [OrderStatus.IN_PRODUCTION, [OrderStatus.READY_TO_SHIP, OrderStatus.CANCELLED]],
      [OrderStatus.READY_TO_SHIP, [OrderStatus.SHIPPED, OrderStatus.CANCELLED]],
      [OrderStatus.SHIPPED, [OrderStatus.DELIVERED]],
      [OrderStatus.DELIVERED, []],
      [OrderStatus.CANCELLED, []]
    ]);

    const allowedTransitions = validTransitions.get(this.status) || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`${this.status}에서 ${newStatus}로 상태 변경이 불가능합니다.`);
    }
  }

  // Getters
  public getId(): OrderId { return this.id; }
  public getOrderNo(): string { return this.orderNo; }
  public getOrderType(): OrderType { return this.orderType; }
  public getCustomer(): Customer { return this.customer; }
  public getOrderDate(): Date { return this.orderDate; }
  public getRequestedDeliveryDate(): Date { return this.requestedDeliveryDate; }
  public getStatus(): OrderStatus { return this.status; }
  public getItems(): OrderItem[] { return this.items; }
  public getTotalAmount(): number { return this.totalAmount; }
  public getCurrency(): Currency { return this.currency; }
  public getPriority(): OrderPriority { return this.priority; }
  public getNotes(): string { return this.notes; }
  public getSalesPerson(): string { return this.salesPerson; }
  public getIdCreate(): string { return this.id_create; }
  public getIdUpdated(): string { return this.id_updated; }
  public getDtCreate(): Date { return this.dt_create; }
  public getDtUpdate(): Date { return this.dt_update; }
}