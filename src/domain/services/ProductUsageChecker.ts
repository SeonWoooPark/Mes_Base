import { ProductId } from '../entities/Product';

export interface ProductUsageChecker {
  isUsedInBOM(productId: ProductId): Promise<boolean>;
  isUsedInProduction(productId: ProductId): Promise<boolean>;
  hasStock(productId: ProductId): Promise<boolean>;
}