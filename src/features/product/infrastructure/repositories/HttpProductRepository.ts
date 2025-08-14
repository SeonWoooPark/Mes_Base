import { Product, ProductId, ProductType, Category, Unit, AdditionalInfo } from '../../domain/entities/Product';
import { ProductRepository, ProductSearchCriteria } from '../../domain/repositories/ProductRepository';
import { ApiClient } from '@shared/services/api/ApiClient';

interface ProductDto {
  id: string;
  cd_material: string;
  nm_material: string;
  type: ProductType;
  category: {
    code: string;
    name: string;
  };
  unit: {
    code: string;
    name: string;
  };
  safetyStock: number;
  isActive: boolean;
  additionalInfo: {
    description?: string;
    specifications?: string;
    notes?: string;
  };
  id_create: string;
  id_updated: string;
  dt_create: string;
  dt_update: string;
}

interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export class HttpProductRepository implements ProductRepository {
  constructor(private apiClient: ApiClient) {}

  async findById(id: ProductId): Promise<Product | null> {
    try {
      const response = await this.apiClient.get<ProductDto>(`/api/products/${id.getValue()}`);
      return response.success ? this.mapDtoToEntity(response.data) : null;
    } catch (error) {
      console.error('Failed to find product by id:', error);
      return null;
    }
  }

  async findByPageWithCriteria(
    criteria: ProductSearchCriteria,
    page: number,
    pageSize: number
  ): Promise<Product[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      sortBy: criteria.sortBy,
      sortDirection: criteria.sortDirection,
    });

    if (criteria.searchKeyword) {
      params.append('search', criteria.searchKeyword);
    }

    criteria.filters.forEach((filter, index) => {
      params.append(`filters[${index}].field`, filter.field);
      params.append(`filters[${index}].value`, filter.value.toString());
    });

    const response = await this.apiClient.get<PagedResponse<ProductDto>>(`/api/products?${params}`);
    
    if (!response.success) {
      throw new Error('Failed to fetch products');
    }

    return response.data.items.map((dto: any) => this.mapDtoToEntity(dto));
  }

  async findAllByCriteria(criteria: ProductSearchCriteria): Promise<Product[]> {
    const params = new URLSearchParams({
      sortBy: criteria.sortBy,
      sortDirection: criteria.sortDirection,
    });

    if (criteria.searchKeyword) {
      params.append('search', criteria.searchKeyword);
    }

    criteria.filters.forEach((filter, index) => {
      params.append(`filters[${index}].field`, filter.field);
      params.append(`filters[${index}].value`, filter.value.toString());
    });

    const response = await this.apiClient.get<ProductDto[]>(`/api/products/all?${params}`);
    
    if (!response.success) {
      throw new Error('Failed to fetch all products');
    }

    return response.data.map((dto: any) => this.mapDtoToEntity(dto));
  }

  async countByCriteria(criteria: ProductSearchCriteria): Promise<number> {
    const params = new URLSearchParams();

    if (criteria.searchKeyword) {
      params.append('search', criteria.searchKeyword);
    }

    criteria.filters.forEach((filter, index) => {
      params.append(`filters[${index}].field`, filter.field);
      params.append(`filters[${index}].value`, filter.value.toString());
    });

    const response = await this.apiClient.get<{ count: number }>(`/api/products/count?${params}`);
    
    if (!response.success) {
      throw new Error('Failed to count products');
    }

    return response.data.count;
  }

  async getLastSequenceByPrefix(prefix: string): Promise<number> {
    const response = await this.apiClient.get<{ sequence: number }>(`/api/products/next-sequence/${prefix}`);
    
    if (!response.success) {
      throw new Error('Failed to get last sequence');
    }

    return response.data.sequence;
  }

  async save(product: Product): Promise<void> {
    const dto = this.mapEntityToDto(product);
    
    const response = await this.apiClient.post('/api/products', dto);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to save product');
    }
  }

  async delete(id: ProductId): Promise<void> {
    const response = await this.apiClient.delete(`/api/products/${id.getValue()}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete product');
    }
  }

  private mapDtoToEntity(dto: ProductDto): Product {
    const productId = new ProductId(dto.id);
    const category = new Category(dto.category.code, dto.category.name);
    const unit = new Unit(dto.unit.code, dto.unit.name);
    const additionalInfo = new AdditionalInfo(
      dto.additionalInfo.description,
      dto.additionalInfo.specifications,
      dto.additionalInfo.notes
    );

    return new Product(
      productId,
      dto.cd_material,
      dto.nm_material,
      dto.type,
      category,
      unit,
      dto.safetyStock,
      dto.isActive,
      additionalInfo,
      dto.id_create,
      dto.id_updated,
      new Date(dto.dt_create),
      new Date(dto.dt_update)
    );
  }

  private mapEntityToDto(product: Product): ProductDto {
    return {
      id: product.getId().getValue(),
      cd_material: product.getCdMaterial(),
      nm_material: product.getNmMaterial(),
      type: product.getType(),
      category: {
        code: product.getCategory().code,
        name: product.getCategory().name,
      },
      unit: {
        code: product.getUnit().code,
        name: product.getUnit().name,
      },
      safetyStock: product.getSafetyStock(),
      isActive: product.getIsActive(),
      additionalInfo: {
        description: product.getAdditionalInfo().description,
        specifications: product.getAdditionalInfo().specifications,
        notes: product.getAdditionalInfo().notes,
      },
      id_create: product.getIdCreate(),
      id_updated: product.getIdUpdated(),
      dt_create: product.getDtCreate().toISOString(),
      dt_update: product.getDtUpdate().toISOString(),
    };
  }
}