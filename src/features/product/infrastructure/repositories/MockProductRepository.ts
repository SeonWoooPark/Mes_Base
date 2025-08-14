import { Product, ProductId } from '../../domain/entities/Product';
import { ProductRepository, ProductSearchCriteria } from '../../domain/repositories/ProductRepository';
import * as MockData from '../services/MockData';

export class MockProductRepository implements ProductRepository {
  
  async findById(id: ProductId): Promise<Product | null> {
    // 실제 API 호출을 시뮬레이션하기 위한 지연
    await this.simulateDelay(100);
    
    const product = MockData.getProductById(id.getValue());
    return product || null;
  }

  async findByPageWithCriteria(
    criteria: ProductSearchCriteria,
    page: number,
    pageSize: number
  ): Promise<Product[]> {
    await this.simulateDelay(300);

    let products = MockData.getProducts();

    // 검색 키워드 필터링
    if (criteria.searchKeyword) {
      const keyword = criteria.searchKeyword.toLowerCase();
      products = products.filter(product =>
        product.getCdMaterial().toLowerCase().includes(keyword) ||
        product.getNmMaterial().toLowerCase().includes(keyword) ||
        product.getCategory().name.toLowerCase().includes(keyword) ||
        product.getUnit().name.toLowerCase().includes(keyword)
      );
    }

    // 필터 적용
    criteria.filters.forEach(filter => {
      switch (filter.field) {
        case 'type':
          products = products.filter(p => p.getType() === filter.value);
          break;
        case 'category':
          products = products.filter(p => p.getCategory().code === filter.value);
          break;
        case 'unit':
          products = products.filter(p => p.getUnit().code === filter.value);
          break;
        case 'isActive':
          products = products.filter(p => p.getIsActive() === filter.value);
          break;
      }
    });

    // 정렬
    products.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (criteria.sortBy) {
        case 'cd_material':
          aValue = a.getCdMaterial();
          bValue = b.getCdMaterial();
          break;
        case 'nm_material':
          aValue = a.getNmMaterial();
          bValue = b.getNmMaterial();
          break;
        case 'type':
          aValue = a.getType();
          bValue = b.getType();
          break;
        case 'category':
          aValue = a.getCategory().name;
          bValue = b.getCategory().name;
          break;
        case 'unit':
          aValue = a.getUnit().name;
          bValue = b.getUnit().name;
          break;
        case 'safetyStock':
          aValue = a.getSafetyStock();
          bValue = b.getSafetyStock();
          break;
        case 'lastUpdated':
          aValue = a.getDtUpdate().getTime();
          bValue = b.getDtUpdate().getTime();
          break;
        default:
          aValue = a.getCdMaterial();
          bValue = b.getCdMaterial();
      }

      if (criteria.sortDirection === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    // 페이징
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return products.slice(startIndex, endIndex);
  }

  async findAllByCriteria(criteria: ProductSearchCriteria): Promise<Product[]> {
    await this.simulateDelay(200);

    let products = MockData.getProducts();

    // 검색 키워드 필터링
    if (criteria.searchKeyword) {
      const keyword = criteria.searchKeyword.toLowerCase();
      products = products.filter(product =>
        product.getCdMaterial().toLowerCase().includes(keyword) ||
        product.getNmMaterial().toLowerCase().includes(keyword) ||
        product.getCategory().name.toLowerCase().includes(keyword) ||
        product.getUnit().name.toLowerCase().includes(keyword)
      );
    }

    // 필터 적용
    criteria.filters.forEach(filter => {
      switch (filter.field) {
        case 'type':
          products = products.filter(p => p.getType() === filter.value);
          break;
        case 'category':
          products = products.filter(p => p.getCategory().code === filter.value);
          break;
        case 'unit':
          products = products.filter(p => p.getUnit().code === filter.value);
          break;
        case 'isActive':
          products = products.filter(p => p.getIsActive() === filter.value);
          break;
      }
    });

    return products;
  }

  async countByCriteria(criteria: ProductSearchCriteria): Promise<number> {
    await this.simulateDelay(100);

    const products = await this.findAllByCriteria(criteria);
    return products.length;
  }

  async getLastSequenceByPrefix(prefix: string): Promise<number> {
    await this.simulateDelay(50);
    return MockData.getNextSequence(prefix);
  }

  async save(product: Product): Promise<void> {
    await this.simulateDelay(200);

    const existingProduct = MockData.getProductById(product.getId().getValue());
    
    if (existingProduct) {
      MockData.updateProduct(product);
    } else {
      MockData.addProduct(product);
    }
  }

  async delete(id: ProductId): Promise<void> {
    await this.simulateDelay(150);
    MockData.deleteProduct(id);
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}