/**
 * 수주관리 Mock 데이터
 * 
 * 개발 및 테스트용 샘플 데이터를 제공합니다.
 */

import { Order, OrderStatus, OrderPriority, Customer, Product } from './types';

// === Mock 고객 데이터 ===
export const mockCustomers: Customer[] = [
  {
    id: 'cust-001',
    name: '삼성전자',
    contact: '02-2255-0114',
    email: 'contact@samsung.com',
    address: '서울시 강남구 테헤란로',
    isActive: true
  },
  {
    id: 'cust-002', 
    name: 'LG전자',
    contact: '02-3777-1114',
    email: 'contact@lge.com',
    address: '서울시 영등포구 여의대로',
    isActive: true
  },
  {
    id: 'cust-003',
    name: '현대자동차',
    contact: '02-3464-1114',
    email: 'contact@hyundai.com',
    address: '서울시 서초구 헌릉로',
    isActive: true
  },
  {
    id: 'cust-004',
    name: '포스코',
    contact: '02-3457-0114',
    email: 'contact@posco.com',
    address: '경북 포항시 남구',
    isActive: true
  },
  {
    id: 'cust-005',
    name: '네이버',
    contact: '031-784-4000',
    email: 'contact@naver.com',
    address: '경기도 성남시 분당구',
    isActive: true
  }
];

// === Mock 제품 데이터 ===
export const mockProducts: Product[] = [
  {
    id: 'prod-001',
    code: 'FG2412001',
    name: '갤럭시 S24 케이스',
    unitPrice: 15000,
    unit: '개',
    isActive: true
  },
  {
    id: 'prod-002',
    code: 'FG2412002',
    name: '센서 모듈 A타입',
    unitPrice: 45000,
    unit: '개',
    isActive: true
  },
  {
    id: 'prod-003',
    code: 'RM2412001',
    name: '실리콘 원료',
    unitPrice: 8500,
    unit: 'KG',
    isActive: true
  },
  {
    id: 'prod-004',
    code: 'FG2412003',
    name: '무선 충전기 15W',
    unitPrice: 28000,
    unit: '개',
    isActive: true
  },
  {
    id: 'prod-005',
    code: 'SF2412001',
    name: '알루미늄 프레임',
    unitPrice: 12000,
    unit: '개',
    isActive: true
  }
];

// === Mock 수주 데이터 ===
export const mockOrders: Order[] = [
  {
    id: 'ord-001',
    orderNumber: 'ORD-20241201-001',
    customerName: '삼성전자',
    customerContact: '02-2255-0114',
    productId: 'prod-001',
    productName: '갤럭시 S24 케이스',
    productCode: 'FG2412001',
    quantity: 5000,
    unitPrice: 15000,
    totalAmount: 75000000,
    orderDate: new Date('2024-12-01'),
    requestedDeliveryDate: new Date('2024-12-15'),
    expectedDeliveryDate: new Date('2024-12-14'),
    status: OrderStatus.IN_PRODUCTION,
    priority: OrderPriority.HIGH,
    memo: '품질 검사 강화 요청',
    createdAt: new Date('2024-12-01T09:00:00'),
    updatedAt: new Date('2024-12-01T09:00:00'),
    createdBy: 'user-001',
    updatedBy: 'user-001',
    isActive: true
  },
  {
    id: 'ord-002',
    orderNumber: 'ORD-20241201-002',
    customerName: 'LG전자',
    customerContact: '02-3777-1114',
    productId: 'prod-002',
    productName: '센서 모듈 A타입',
    productCode: 'FG2412002',
    quantity: 2000,
    unitPrice: 45000,
    totalAmount: 90000000,
    orderDate: new Date('2024-12-01'),
    requestedDeliveryDate: new Date('2024-12-20'),
    status: OrderStatus.CONFIRMED,
    priority: OrderPriority.NORMAL,
    memo: '',
    createdAt: new Date('2024-12-01T10:30:00'),
    updatedAt: new Date('2024-12-01T14:20:00'),
    createdBy: 'user-002',
    updatedBy: 'user-001',
    isActive: true
  },
  {
    id: 'ord-003',
    orderNumber: 'ORD-20241202-001',
    customerName: '현대자동차',
    customerContact: '02-3464-1114',
    productId: 'prod-004',
    productName: '무선 충전기 15W',
    productCode: 'FG2412003',
    quantity: 10000,
    unitPrice: 28000,
    totalAmount: 280000000,
    orderDate: new Date('2024-12-02'),
    requestedDeliveryDate: new Date('2024-12-25'),
    expectedDeliveryDate: new Date('2024-12-23'),
    status: OrderStatus.PENDING,
    priority: OrderPriority.URGENT,
    memo: '긴급 납기 - 크리스마스 이전 필수 납품',
    createdAt: new Date('2024-12-02T08:15:00'),
    updatedAt: new Date('2024-12-02T08:15:00'),
    createdBy: 'user-003',
    updatedBy: 'user-003',
    isActive: true
  },
  {
    id: 'ord-004',
    orderNumber: 'ORD-20241202-002',
    customerName: '포스코',
    customerContact: '02-3457-0114',
    productId: 'prod-005',
    productName: '알루미늄 프레임',
    productCode: 'SF2412001',
    quantity: 8000,
    unitPrice: 12000,
    totalAmount: 96000000,
    orderDate: new Date('2024-12-02'),
    requestedDeliveryDate: new Date('2024-12-18'),
    status: OrderStatus.READY_TO_SHIP,
    priority: OrderPriority.NORMAL,
    memo: '포장 시 특수 보호재 사용',
    createdAt: new Date('2024-12-02T11:45:00'),
    updatedAt: new Date('2024-12-08T16:30:00'),
    createdBy: 'user-002',
    updatedBy: 'user-001',
    isActive: true
  },
  {
    id: 'ord-005',
    orderNumber: 'ORD-20241203-001',
    customerName: '네이버',
    customerContact: '031-784-4000',
    productId: 'prod-003',
    productName: '실리콘 원료',
    productCode: 'RM2412001',
    quantity: 500,
    unitPrice: 8500,
    totalAmount: 4250000,
    orderDate: new Date('2024-12-03'),
    requestedDeliveryDate: new Date('2024-12-10'),
    actualDeliveryDate: new Date('2024-12-09'),
    status: OrderStatus.DELIVERED,
    priority: OrderPriority.LOW,
    memo: '테스트용 소량 주문',
    createdAt: new Date('2024-12-03T13:20:00'),
    updatedAt: new Date('2024-12-09T17:00:00'),
    createdBy: 'user-004',
    updatedBy: 'user-001',
    isActive: true
  },
  {
    id: 'ord-006',
    orderNumber: 'ORD-20241204-001',
    customerName: '삼성전자',
    customerContact: '02-2255-0114',
    productId: 'prod-002',
    productName: '센서 모듈 A타입',
    productCode: 'FG2412002',
    quantity: 1500,
    unitPrice: 45000,
    totalAmount: 67500000,
    orderDate: new Date('2024-12-04'),
    requestedDeliveryDate: new Date('2024-12-30'),
    status: OrderStatus.SHIPPED,
    priority: OrderPriority.NORMAL,
    memo: '연말 재고 확보용',
    createdAt: new Date('2024-12-04T09:30:00'),
    updatedAt: new Date('2024-12-12T10:15:00'),
    createdBy: 'user-001',
    updatedBy: 'user-002',
    isActive: true
  },
  {
    id: 'ord-007',
    orderNumber: 'ORD-20241205-001',
    customerName: 'LG전자',
    customerContact: '02-3777-1114',
    productId: 'prod-001',
    productName: '갤럭시 S24 케이스',
    productCode: 'FG2412001',
    quantity: 3000,
    unitPrice: 15000,
    totalAmount: 45000000,
    orderDate: new Date('2024-12-05'),
    requestedDeliveryDate: new Date('2024-12-22'),
    status: OrderStatus.CANCELLED,
    priority: OrderPriority.LOW,
    memo: '고객사 사정으로 주문 취소',
    createdAt: new Date('2024-12-05T14:00:00'),
    updatedAt: new Date('2024-12-06T09:30:00'),
    createdBy: 'user-002',
    updatedBy: 'user-003',
    isActive: false
  }
];

// === 상태별 통계 계산 ===
export const getOrderStatusSummary = () => {
  const activeOrders = mockOrders.filter(order => order.isActive);
  
  return {
    totalOrders: activeOrders.length,
    pendingOrders: activeOrders.filter(o => o.status === OrderStatus.PENDING).length,
    confirmedOrders: activeOrders.filter(o => o.status === OrderStatus.CONFIRMED).length,
    inProductionOrders: activeOrders.filter(o => o.status === OrderStatus.IN_PRODUCTION).length,
    shippedOrders: activeOrders.filter(o => o.status === OrderStatus.SHIPPED).length,
    deliveredOrders: activeOrders.filter(o => o.status === OrderStatus.DELIVERED).length,
    cancelledOrders: mockOrders.filter(o => o.status === OrderStatus.CANCELLED).length,
    totalAmount: activeOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    averageOrderValue: activeOrders.length > 0 
      ? activeOrders.reduce((sum, order) => sum + order.totalAmount, 0) / activeOrders.length 
      : 0
  };
};