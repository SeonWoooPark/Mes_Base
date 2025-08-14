import { Product, ProductId, ProductType } from '../entities/Product';

export interface ProductFilter {
  field: 'type' | 'category' | 'unit' | 'isActive';
  value: any;
}

export interface ProductSearchCriteria {
  searchKeyword?: string;
  filters: ProductFilter[];
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

export interface ProductRepository {
  findById(id: ProductId): Promise<Product | null>;
  findByPageWithCriteria(
    criteria: ProductSearchCriteria,
    page: number,
    pageSize: number
  ): Promise<Product[]>;
  findAllByCriteria(criteria: ProductSearchCriteria): Promise<Product[]>;
  countByCriteria(criteria: ProductSearchCriteria): Promise<number>;
  getLastSequenceByPrefix(prefix: string): Promise<number>;
  save(product: Product): Promise<void>;
  delete(id: ProductId): Promise<void>;
}