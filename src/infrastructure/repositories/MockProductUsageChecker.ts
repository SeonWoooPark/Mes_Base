import { ProductId } from '../../domain/entities/Product';
import { ProductUsageChecker } from '../../domain/services/ProductUsageChecker';

export class MockProductUsageChecker implements ProductUsageChecker {
  async isUsedInBOM(productId: ProductId): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return Math.random() > 0.8;
  }

  async isUsedInProduction(productId: ProductId): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return Math.random() > 0.9;
  }

  async hasStock(productId: ProductId): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return Math.random() > 0.7;
  }
}