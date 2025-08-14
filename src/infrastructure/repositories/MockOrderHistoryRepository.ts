/**
 * MockOrderHistoryRepository 수주 이력 Mock 저장소 구현체
 */

import { OrderHistoryRepository } from '../../domain/repositories/OrderHistoryRepository';
import { OrderId } from '../../domain/entities/Order';
import { OrderHistory } from '../../domain/entities/OrderHistory';
import { MockOrderData } from '../data/MockOrderData';

export class MockOrderHistoryRepository implements OrderHistoryRepository {
  
  async save(history: OrderHistory): Promise<void> {
    await this.simulateDelay(100);
    MockOrderData.addOrderHistory(history);
  }

  async findByOrderId(orderId: OrderId): Promise<OrderHistory[]> {
    await this.simulateDelay(150);
    
    return MockOrderData.getOrderHistories().filter(history =>
      history.getOrderId().equals(orderId)
    ).sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  async findByUserId(userId: string): Promise<OrderHistory[]> {
    await this.simulateDelay(150);
    
    return MockOrderData.getOrderHistories().filter(history =>
      history.getUserId() === userId
    ).sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<OrderHistory[]> {
    await this.simulateDelay(200);
    
    return MockOrderData.getOrderHistories().filter(history => {
      const historyDate = history.getTimestamp();
      return historyDate >= startDate && historyDate <= endDate;
    }).sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}