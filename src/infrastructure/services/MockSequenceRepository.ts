/**
 * MockSequenceRepository 시퀀스 Mock 저장소 구현체
 */

import { SequenceRepository } from '../../domain/services/OrderNoGenerator';
import { MockOrderData } from '../data/MockOrderData';

export class MockSequenceRepository implements SequenceRepository {
  
  async getNextSequence(prefix: string): Promise<number> {
    await this.simulateDelay(50);
    return MockOrderData.getNextSequence(prefix);
  }

  async getCurrentSequence(prefix: string): Promise<number> {
    await this.simulateDelay(30);
    return MockOrderData.getSequences().get(prefix) || 0;
  }

  async resetSequence(prefix: string): Promise<void> {
    await this.simulateDelay(50);
    MockOrderData.getSequences().set(prefix, 0);
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}