/**
 * MockOrderData 수주 Mock 데이터
 * 
 * 메모리 기반 수주 데이터 스토리지 및 초기화
 */

import { Order, OrderId, OrderType, OrderStatus, OrderPriority, Customer, Currency, OrderItem } from '../../domain/entities/Order';
import { OrderHistory, OrderHistoryAction } from '../../domain/entities/OrderHistory';

// 메모리 기반 데이터 스토리지
let orders: Order[] = [];
let orderHistories: OrderHistory[] = [];
let sequences: Map<string, number> = new Map();

// === 초기화 함수들 ===

export function initializeOrders(): void {
  const orderDataList = [
    {
      id: 'ord-001',
      orderNo: 'SOD24120001',
      orderType: OrderType.DOMESTIC,
      customer: {
        code: 'CUST001',
        name: '삼성전자',
        contactPerson: '김담당자',
        phoneNumber: '02-1234-5678',
        email: 'kim@samsung.com',
        address: '서울시 서초구 서초대로 74길 11'
      },
      items: [
        {
          id: 'item-001',
          productId: 'prod-001',
          productCode: 'FG2412001',
          productName: '갤럭시 S24 케이스',
          quantity: 1000,
          unit: 'EA',
          unitPrice: 15000,
          deliveryDate: new Date('2024-12-30'),
          notes: '고품질 실리콘 소재'
        }
      ],
      orderDate: new Date('2024-12-01'),
      requestedDeliveryDate: new Date('2024-12-30'),
      status: OrderStatus.PENDING,
      priority: OrderPriority.HIGH,
      notes: '연말 납품 요청',
      salesPerson: '이영업'
    },
    {
      id: 'ord-002',
      orderNo: 'SOE24120002',
      orderType: OrderType.EXPORT,
      customer: {
        code: 'CUST002',
        name: 'Apple Inc.',
        contactPerson: 'John Smith',
        phoneNumber: '+1-408-996-1010',
        email: 'john.smith@apple.com',
        address: 'One Apple Park Way, Cupertino, CA 95014'
      },
      items: [
        {
          id: 'item-002',
          productId: 'prod-004',
          productCode: 'FG2412003',
          productName: '무선 충전기 15W',
          quantity: 2000,
          unit: 'EA',
          unitPrice: 25000,
          deliveryDate: new Date('2025-01-15'),
          notes: 'Fast charging capability'
        }
      ],
      orderDate: new Date('2024-12-02'),
      requestedDeliveryDate: new Date('2025-01-15'),
      status: OrderStatus.CONFIRMED,
      priority: OrderPriority.URGENT,
      notes: 'Export order - Handle with care',
      salesPerson: '박수출'
    },
    {
      id: 'ord-003',
      orderNo: 'SOS24120003',
      orderType: OrderType.SAMPLE,
      customer: {
        code: 'CUST003',
        name: 'LG전자',
        contactPerson: '박대리',
        phoneNumber: '02-3777-1234',
        email: 'park@lge.com',
        address: '서울시 영등포구 여의도동 20'
      },
      items: [
        {
          id: 'item-003',
          productId: 'prod-002',
          productCode: 'FG2412002',
          productName: '센서 모듈 A타입',
          quantity: 50,
          unit: 'EA',
          unitPrice: 8500,
          deliveryDate: new Date('2024-12-20'),
          notes: '샘플용 - 테스트 목적'
        }
      ],
      orderDate: new Date('2024-12-03'),
      requestedDeliveryDate: new Date('2024-12-20'),
      status: OrderStatus.IN_PRODUCTION,
      priority: OrderPriority.NORMAL,
      notes: '샘플 제작 후 평가 예정',
      salesPerson: '최샘플'
    },
    {
      id: 'ord-004',
      orderNo: 'SOR24120004',
      orderType: OrderType.REPAIR,
      customer: {
        code: 'CUST004',
        name: '현대자동차',
        contactPerson: '정과장',
        phoneNumber: '02-3464-1234',
        email: 'jung@hyundai.com',
        address: '서울시 서초구 헌릉로 12'
      },
      items: [
        {
          id: 'item-004',
          productId: 'prod-005',
          productCode: 'SF2412001',
          productName: '알루미늄 프레임',
          quantity: 100,
          unit: 'EA',
          unitPrice: 12000,
          deliveryDate: new Date('2024-12-18'),
          notes: '기존 제품 수리용'
        }
      ],
      orderDate: new Date('2024-12-04'),
      requestedDeliveryDate: new Date('2024-12-18'),
      status: OrderStatus.READY_TO_SHIP,
      priority: OrderPriority.HIGH,
      notes: '긴급 수리 필요',
      salesPerson: '김수리'
    },
    {
      id: 'ord-005',
      orderNo: 'SOD24120005',
      orderType: OrderType.DOMESTIC,
      customer: {
        code: 'CUST005',
        name: '네이버',
        contactPerson: '이개발',
        phoneNumber: '031-784-1234',
        email: 'dev@naver.com',
        address: '경기도 성남시 분당구 불정로 6'
      },
      items: [
        {
          id: 'item-005',
          productId: 'prod-001',
          productCode: 'FG2412001',
          productName: '갤럭시 S24 케이스',
          quantity: 500,
          unit: 'EA',
          unitPrice: 14500,
          deliveryDate: new Date('2024-12-25'),
          notes: '회사 기념품용'
        }
      ],
      orderDate: new Date('2024-12-05'),
      requestedDeliveryDate: new Date('2024-12-25'),
      status: OrderStatus.SHIPPED,
      priority: OrderPriority.NORMAL,
      notes: '연말 기념품 납품',
      salesPerson: '한내수'
    },
    {
      id: 'ord-006',
      orderNo: 'SOD24120006',
      orderType: OrderType.DOMESTIC,
      customer: {
        code: 'CUST006',
        name: '카카오',
        contactPerson: '조팀장',
        phoneNumber: '064-796-1234',
        email: 'jo@kakao.com',
        address: '제주도 제주시 첨단로 242'
      },
      items: [
        {
          id: 'item-006',
          productId: 'prod-004',
          productCode: 'FG2412003',
          productName: '무선 충전기 15W',
          quantity: 300,
          unit: 'EA',
          unitPrice: 23000,
          deliveryDate: new Date('2024-12-15'),
          notes: '사무용품 구매'
        }
      ],
      orderDate: new Date('2024-12-06'),
      requestedDeliveryDate: new Date('2024-12-15'),
      status: OrderStatus.DELIVERED,
      priority: OrderPriority.LOW,
      notes: '정기 납품 계약',
      salesPerson: '송정기'
    },
    {
      id: 'ord-007',
      orderNo: 'SOD24120007',
      orderType: OrderType.DOMESTIC,
      customer: {
        code: 'CUST007',
        name: '신세계',
        contactPerson: '윤부장',
        phoneNumber: '02-1234-9999',
        email: 'yoon@shinsegae.com',
        address: '서울시 중구 소공로 63'
      },
      items: [
        {
          id: 'item-007',
          productId: 'prod-002',
          productCode: 'FG2412002',
          productName: '센서 모듈 A타입',
          quantity: 1500,
          unit: 'EA',
          unitPrice: 8200,
          deliveryDate: new Date('2024-11-30'), // 과거 날짜 (지연)
          notes: '매장용 센서'
        }
      ],
      orderDate: new Date('2024-11-15'),
      requestedDeliveryDate: new Date('2024-11-30'), // 지연된 수주
      status: OrderStatus.IN_PRODUCTION,
      priority: OrderPriority.URGENT,
      notes: '지연으로 인한 긴급 처리',
      salesPerson: '급지연'
    }
  ];

  // Order 엔티티 생성
  orders = orderDataList.map(data => {
    const customer = new Customer(
      data.customer.code,
      data.customer.name,
      data.customer.contactPerson,
      data.customer.phoneNumber,
      data.customer.email,
      data.customer.address
    );

    const orderItems = data.items.map(itemData => {
      const amount = itemData.quantity * itemData.unitPrice;
      return new OrderItem(
        itemData.id,
        itemData.productId,
        itemData.productCode,
        itemData.productName,
        itemData.quantity,
        itemData.unit,
        itemData.unitPrice,
        amount,
        itemData.deliveryDate,
        itemData.notes
      );
    });

    const totalAmount = orderItems.reduce((total, item) => total + item.getAmount(), 0);
    const currency = new Currency("KRW", "원화", "₩");

    return new Order(
      new OrderId(data.id),
      data.orderNo,
      data.orderType,
      customer,
      data.orderDate,
      data.requestedDeliveryDate,
      data.status,
      orderItems,
      totalAmount,
      currency,
      data.priority,
      data.notes,
      data.salesPerson,
      'system',
      'system',
      data.orderDate,
      new Date()
    );
  });

  // 수주번호 시퀀스 초기화
  sequences.set('SOD2412', 7); // 내수 7건
  sequences.set('SOE2412', 2); // 수출 2건  
  sequences.set('SOS2412', 3); // 샘플 3건
  sequences.set('SOR2412', 4); // 수리 4건
}

export function initializeOrderHistories(): void {
  // 각 수주에 대한 기본 생성 이력 추가
  orders.forEach(order => {
    const history = new OrderHistory(
      `hist-${order.getId().getValue()}`,
      order.getId(),
      OrderHistoryAction.CREATE,
      [],
      'system',
      'System',
      order.getDtCreate(),
      '시스템 초기 데이터 생성'
    );
    orderHistories.push(history);
  });
}

// === 데이터 접근자 함수들 ===

export const MockOrderData = {
  getOrders(): Order[] {
    return [...orders];
  },

  getOrderHistories(): OrderHistory[] {
    return [...orderHistories];
  },

  getSequences(): Map<string, number> {
    return new Map(sequences);
  },

  addOrder(order: Order): void {
    orders.push(order);
  },

  updateOrder(updatedOrder: Order): void {
    const index = orders.findIndex(order => 
      order.getId().equals(updatedOrder.getId())
    );
    if (index !== -1) {
      orders[index] = updatedOrder;
    }
  },

  deleteOrder(orderId: OrderId): void {
    orders = orders.filter(order => !order.getId().equals(orderId));
  },

  addOrderHistory(history: OrderHistory): void {
    orderHistories.push(history);
  },

  getNextSequence(prefix: string): number {
    const currentSeq = sequences.get(prefix) || 0;
    const nextSeq = currentSeq + 1;
    sequences.set(prefix, nextSeq);
    return nextSeq;
  }
};

// 초기화 실행
if (orders.length === 0) {
  initializeOrders();
  initializeOrderHistories();
}