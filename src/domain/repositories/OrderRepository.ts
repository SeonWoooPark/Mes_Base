/**
 * OrderRepository 수주 저장소 인터페이스
 * 
 * 수주 데이터의 영속성을 관리하는 리포지토리 인터페이스
 */

import { Order, OrderId, OrderStatus } from '../entities/Order';

export interface OrderFilter {
  field: "status" | "customer" | "priority" | "deliveryDate" | "salesPerson" | "orderType";
  value: any;
}

export interface OrderSearchCriteria {
  searchKeyword?: string;
  filters?: OrderFilter[];
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
  findByOrderNo(orderNo: string): Promise<Order | null>;
  findByPageWithCriteria(
    criteria: OrderSearchCriteria,
    page: number,
    pageSize: number
  ): Promise<Order[]>;
  findAllByCriteria(criteria: OrderSearchCriteria): Promise<Order[]>;
  countByCriteria(criteria: OrderSearchCriteria): Promise<number>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;
  getLastSequenceByPrefix(prefix: string): Promise<number>;
  findByCustomerCode(customerCode: string): Promise<Order[]>;
  findByStatus(status: OrderStatus): Promise<Order[]>;
  findDelayedOrders(): Promise<Order[]>;
  findUrgentOrders(): Promise<Order[]>;
}