import { ProductHistory } from '../../domain/entities/ProductHistory';
import { ProductId } from '../../domain/entities/Product';
import { ProductHistoryRepository } from '../../domain/repositories/ProductHistoryRepository';
import * as MockData from '../services/MockData';

export class MockProductHistoryRepository implements ProductHistoryRepository {
  
  async findByProductId(productId: ProductId): Promise<ProductHistory[]> {
    // 실제 API 호출을 시뮬레이션하기 위한 지연
    await this.simulateDelay(150);
    
    const histories = MockData.getHistoriesByProductId(productId);
    
    // 최신순으로 정렬
    return histories.sort((a, b) => 
      b.getTimestamp().getTime() - a.getTimestamp().getTime()
    );
  }

  async save(history: ProductHistory): Promise<void> {
    await this.simulateDelay(100);
    
    MockData.addHistory(history);
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}