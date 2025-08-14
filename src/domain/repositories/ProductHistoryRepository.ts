import { ProductHistory } from '../entities/ProductHistory';
import { ProductId } from '../entities/Product';

export interface ProductHistoryRepository {
  findByProductId(productId: ProductId): Promise<ProductHistory[]>;
  save(history: ProductHistory): Promise<void>;
}