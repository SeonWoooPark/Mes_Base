/**
 * 수주관리 API 인터페이스
 * 
 * TableTemplate에서 사용할 API 구현체입니다.
 * 현재는 Mock 데이터를 사용하지만, 실제 API로 쉽게 교체 가능합니다.
 */

import { TableApi } from '../templates/TableTemplate/types';
import { Order, OrderStatus, OrderPriority, CreateOrderRequest } from './types';
import { SearchRequest, PaginationResponse } from '../../shared/types/common';
import { mockOrders, mockCustomers, mockProducts } from './mockData';

// === Mock 데이터 저장소 ===
let orders: Order[] = [...mockOrders];
let nextOrderNumber = 8; // 다음 수주번호 시퀀스

// === 수주번호 생성 함수 ===
const generateOrderNumber = (): string => {
  const today = new Date();
  const dateStr = today.getFullYear().toString() + 
                 (today.getMonth() + 1).toString().padStart(2, '0') +
                 today.getDate().toString().padStart(2, '0');
  const sequence = nextOrderNumber.toString().padStart(3, '0');
  nextOrderNumber++;
  return `ORD-${dateStr}-${sequence}`;
};

// === API 지연 시뮬레이션 ===
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// === 수주관리 API 구현 ===
export const orderApi: TableApi<Order> = {
  /**
   * 수주 목록 조회 (페이징, 검색, 필터링 지원)
   */
  list: async (params: SearchRequest): Promise<PaginationResponse<Order>> => {
    await delay(300); // API 지연 시뮬레이션

    let filteredOrders = [...orders];

    // === 검색어 필터링 ===
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      filteredOrders = filteredOrders.filter(order => 
        order.orderNumber.toLowerCase().includes(keyword) ||
        order.customerName.toLowerCase().includes(keyword) ||
        order.productName.toLowerCase().includes(keyword) ||
        order.productCode.toLowerCase().includes(keyword)
      );
    }

    // === 필터 조건 적용 ===
    if (params.filters) {
      params.filters.forEach(filter => {
        switch (filter.field) {
          case 'status':
            if (filter.value) {
              filteredOrders = filteredOrders.filter(order => order.status === filter.value);
            }
            break;
            
          case 'priority':
            if (filter.value) {
              filteredOrders = filteredOrders.filter(order => order.priority === filter.value);
            }
            break;
            
          case 'customerName':
            if (filter.value) {
              filteredOrders = filteredOrders.filter(order => 
                order.customerName.toLowerCase().includes(filter.value.toLowerCase())
              );
            }
            break;
            
          case 'orderDate':
            if (filter.value && filter.value.start && filter.value.end) {
              const startDate = new Date(filter.value.start);
              const endDate = new Date(filter.value.end);
              endDate.setHours(23, 59, 59, 999); // 종료일 끝까지 포함
              
              filteredOrders = filteredOrders.filter(order => 
                order.orderDate >= startDate && order.orderDate <= endDate
              );
            }
            break;
            
          case 'totalAmount':
            if (filter.value) {
              const amount = Number(filter.value);
              switch (filter.operator) {
                case 'gte':
                  filteredOrders = filteredOrders.filter(order => order.totalAmount >= amount);
                  break;
                case 'lte':
                  filteredOrders = filteredOrders.filter(order => order.totalAmount <= amount);
                  break;
              }
            }
            break;
        }
      });
    }

    // === 정렬 적용 ===
    if (params.sortBy) {
      filteredOrders.sort((a, b) => {
        let aValue: any = (a as any)[params.sortBy!];
        let bValue: any = (b as any)[params.sortBy!];
        
        // 날짜 정렬
        if (aValue instanceof Date && bValue instanceof Date) {
          aValue = aValue.getTime();
          bValue = bValue.getTime();
        }
        
        // 문자열 정렬
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (params.sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    // === 페이징 적용 ===
    const totalCount = filteredOrders.length;
    const totalPages = Math.ceil(totalCount / params.pageSize);
    const startIndex = (params.page - 1) * params.pageSize;
    const endIndex = startIndex + params.pageSize;
    const pagedOrders = filteredOrders.slice(startIndex, endIndex);

    return {
      items: pagedOrders,
      totalCount,
      totalPages,
      currentPage: params.page,
      hasNextPage: params.page < totalPages,
      hasPreviousPage: params.page > 1
    };
  },

  /**
   * 수주 생성
   */
  create: async (data: Partial<Order>): Promise<Order> => {
    await delay(500);

    // 제품 정보 조회
    const product = mockProducts.find(p => p.id === data.productId);
    if (!product) {
      throw new Error('존재하지 않는 제품입니다.');
    }

    // 새 수주 생성
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: generateOrderNumber(),
      customerName: data.customerName!,
      customerContact: data.customerContact!,
      productId: data.productId!,
      productName: product.name,
      productCode: product.code,
      quantity: data.quantity!,
      unitPrice: data.unitPrice || product.unitPrice,
      totalAmount: (data.quantity || 0) * (data.unitPrice || product.unitPrice),
      orderDate: data.orderDate || new Date(),
      requestedDeliveryDate: data.requestedDeliveryDate || new Date(),
      status: OrderStatus.PENDING,
      priority: data.priority || OrderPriority.NORMAL,
      memo: data.memo || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'current-user', // TODO: 실제 로그인 사용자
      updatedBy: 'current-user',
      isActive: true
    };

    orders.unshift(newOrder); // 맨 앞에 추가
    return newOrder;
  },

  /**
   * 수주 수정
   */
  update: async (id: string, data: Partial<Order>): Promise<Order> => {
    await delay(500);

    const orderIndex = orders.findIndex(order => order.id === id);
    if (orderIndex === -1) {
      throw new Error('존재하지 않는 수주입니다.');
    }

    // 제품이 변경된 경우 제품 정보 업데이트
    let updatedData = { ...data };
    if (data.productId && data.productId !== orders[orderIndex].productId) {
      const product = mockProducts.find(p => p.id === data.productId);
      if (!product) {
        throw new Error('존재하지 않는 제품입니다.');
      }
      updatedData = {
        ...updatedData,
        productName: product.name,
        productCode: product.code,
        unitPrice: data.unitPrice || product.unitPrice
      };
    }

    // 수량이나 단가가 변경된 경우 총액 재계산
    if (data.quantity !== undefined || data.unitPrice !== undefined) {
      const quantity = data.quantity || orders[orderIndex].quantity;
      const unitPrice = data.unitPrice || orders[orderIndex].unitPrice;
      updatedData.totalAmount = quantity * unitPrice;
    }

    // 수주 업데이트
    const updatedOrder = {
      ...orders[orderIndex],
      ...updatedData,
      updatedAt: new Date(),
      updatedBy: 'current-user' // TODO: 실제 로그인 사용자
    };

    orders[orderIndex] = updatedOrder;
    return updatedOrder;
  },

  /**
   * 수주 삭제 (논리 삭제)
   */
  delete: async (id: string): Promise<void> => {
    await delay(300);

    const orderIndex = orders.findIndex(order => order.id === id);
    if (orderIndex === -1) {
      throw new Error('존재하지 않는 수주입니다.');
    }

    // 논리 삭제 (실제로는 isActive를 false로 설정)
    orders[orderIndex] = {
      ...orders[orderIndex],
      isActive: false,
      updatedAt: new Date(),
      updatedBy: 'current-user'
    };
  },

  /**
   * 수주 상세 조회
   */
  getById: async (id: string): Promise<Order> => {
    await delay(200);

    const order = orders.find(order => order.id === id);
    if (!order) {
      throw new Error('존재하지 않는 수주입니다.');
    }

    return order;
  }
};

// === 추가 API 함수들 (커스텀 액션용) ===

/**
 * 수주 상태 변경
 */
export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<Order> => {
  await delay(300);

  const orderIndex = orders.findIndex(order => order.id === id);
  if (orderIndex === -1) {
    throw new Error('존재하지 않는 수주입니다.');
  }

  orders[orderIndex] = {
    ...orders[orderIndex],
    status,
    updatedAt: new Date(),
    updatedBy: 'current-user'
  };

  return orders[orderIndex];
};

/**
 * 고객 목록 조회 (폼에서 사용)
 */
export const getCustomers = async () => {
  await delay(200);
  return mockCustomers.filter(customer => customer.isActive);
};

/**
 * 제품 목록 조회 (폼에서 사용)
 */
export const getProducts = async () => {
  await delay(200);
  return mockProducts.filter(product => product.isActive);
};