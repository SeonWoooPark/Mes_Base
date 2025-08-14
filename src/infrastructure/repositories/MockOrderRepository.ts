/**
 * MockOrderRepository 수주 Mock 저장소 구현체
 */

import { OrderRepository, OrderSearchCriteria } from '../../domain/repositories/OrderRepository';
import { Order, OrderId, OrderStatus } from '../../domain/entities/Order';
import { MockOrderData } from '../data/MockOrderData';

export class MockOrderRepository implements OrderRepository {
  
  async save(order: Order): Promise<void> {
    await this.simulateDelay(200);
    
    const existing = MockOrderData.getOrders().find(o => 
      o.getId().equals(order.getId())
    );
    
    if (existing) {
      MockOrderData.updateOrder(order);
    } else {
      MockOrderData.addOrder(order);
    }
  }

  async findById(id: OrderId): Promise<Order | null> {
    await this.simulateDelay(100);
    
    const order = MockOrderData.getOrders().find(o => o.getId().equals(id));
    return order || null;
  }

  async findByOrderNo(orderNo: string): Promise<Order | null> {
    await this.simulateDelay(100);
    
    const order = MockOrderData.getOrders().find(o => o.getOrderNo() === orderNo);
    return order || null;
  }

  async findByPageWithCriteria(
    criteria: OrderSearchCriteria,
    page: number,
    pageSize: number
  ): Promise<Order[]> {
    await this.simulateDelay(300);

    let orders = MockOrderData.getOrders();

    // 검색 키워드 적용
    if (criteria.searchKeyword) {
      const keyword = criteria.searchKeyword.toLowerCase();
      orders = orders.filter(order =>
        order.getOrderNo().toLowerCase().includes(keyword) ||
        order.getCustomer().name.toLowerCase().includes(keyword) ||
        order.getSalesPerson().toLowerCase().includes(keyword) ||
        order.getItems().some(item => 
          item.getProductName().toLowerCase().includes(keyword) ||
          item.getProductCode().toLowerCase().includes(keyword)
        )
      );
    }

    // 필터 적용
    if (criteria.filters) {
      orders = this.applyFilters(orders, criteria.filters);
    }

    // 날짜 범위 적용
    if (criteria.startDate || criteria.endDate) {
      orders = orders.filter(order => {
        const orderDate = order.getOrderDate();
        if (criteria.startDate && orderDate < criteria.startDate) return false;
        if (criteria.endDate && orderDate > criteria.endDate) return false;
        return true;
      });
    }

    // 정렬 적용
    orders = this.applySorting(orders, criteria.sortBy, criteria.sortDirection);

    // 페이징 적용
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return orders.slice(startIndex, endIndex);
  }

  async findAllByCriteria(criteria: OrderSearchCriteria): Promise<Order[]> {
    // 페이징 없이 모든 조건 매칭 데이터 반환
    return this.findByPageWithCriteria(criteria, 1, Number.MAX_SAFE_INTEGER);
  }

  async countByCriteria(criteria: OrderSearchCriteria): Promise<number> {
    const orders = await this.findAllByCriteria(criteria);
    return orders.length;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    await this.simulateDelay(200);
    
    return MockOrderData.getOrders().filter(order => {
      const orderDate = order.getOrderDate();
      return orderDate >= startDate && orderDate <= endDate;
    });
  }

  async getLastSequenceByPrefix(prefix: string): Promise<number> {
    await this.simulateDelay(50);
    
    return MockOrderData.getSequences().get(prefix) || 0;
  }

  async findByCustomerCode(customerCode: string): Promise<Order[]> {
    await this.simulateDelay(150);
    
    return MockOrderData.getOrders().filter(order => 
      order.getCustomer().code === customerCode
    );
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    await this.simulateDelay(100);
    
    return MockOrderData.getOrders().filter(order => 
      order.getStatus() === status
    );
  }

  async findDelayedOrders(): Promise<Order[]> {
    await this.simulateDelay(200);
    
    return MockOrderData.getOrders().filter(order => order.isDelayed());
  }

  async findUrgentOrders(): Promise<Order[]> {
    await this.simulateDelay(200);
    
    return MockOrderData.getOrders().filter(order => 
      order.getPriority() === 'URGENT' &&
      order.getStatus() !== OrderStatus.DELIVERED &&
      order.getStatus() !== OrderStatus.CANCELLED
    );
  }

  private applyFilters(orders: Order[], filters: any[]): Order[] {
    return orders.filter(order => {
      return filters.every(filter => {
        switch (filter.field) {
          case 'status':
            return order.getStatus() === filter.value;
          case 'customer':
            return order.getCustomer().name.toLowerCase().includes(filter.value.toLowerCase());
          case 'priority':
            return order.getPriority() === filter.value;
          case 'salesPerson':
            return order.getSalesPerson().toLowerCase().includes(filter.value.toLowerCase());
          case 'orderType':
            return order.getOrderType() === filter.value;
          case 'deliveryDate':
            // 날짜 필터링 로직
            return true; // 간단히 true로 처리
          default:
            return true;
        }
      });
    });
  }

  private applySorting(orders: Order[], sortBy?: string, sortDirection?: "asc" | "desc"): Order[] {
    if (!sortBy) return orders;

    const direction = sortDirection === 'asc' ? 1 : -1;

    return [...orders].sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (sortBy) {
        case 'orderNo':
          valueA = a.getOrderNo();
          valueB = b.getOrderNo();
          break;
        case 'customerName':
          valueA = a.getCustomer().name;
          valueB = b.getCustomer().name;
          break;
        case 'orderDate':
          valueA = a.getOrderDate().getTime();
          valueB = b.getOrderDate().getTime();
          break;
        case 'requestedDeliveryDate':
          valueA = a.getRequestedDeliveryDate().getTime();
          valueB = b.getRequestedDeliveryDate().getTime();
          break;
        case 'totalAmount':
          valueA = a.getTotalAmount();
          valueB = b.getTotalAmount();
          break;
        case 'status':
          valueA = a.getStatus();
          valueB = b.getStatus();
          break;
        case 'priority':
          valueA = a.getPriority();
          valueB = b.getPriority();
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}