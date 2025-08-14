/**
 * OrderHistoryRepository 수주 이력 저장소 인터페이스
 */

import { OrderId } from '../entities/Order';
import { OrderHistory } from '../entities/OrderHistory';

export interface OrderHistoryRepository {
  save(history: OrderHistory): Promise<void>;
  findByOrderId(orderId: OrderId): Promise<OrderHistory[]>;
  findByUserId(userId: string): Promise<OrderHistory[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<OrderHistory[]>;
}