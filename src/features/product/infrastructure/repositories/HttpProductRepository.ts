import {
  Product,
  ProductId,
  ProductType,
  Category,
  Unit,
  AdditionalInfo,
} from "../../domain/entities/Product";
import {
  ProductRepository,
  ProductSearchCriteria,
} from "../../domain/repositories/ProductRepository";
import { ApiClient } from "@shared/services/api/ApiClient";

interface ProductDto {
  id: string;
  cd_material: string;
  nm_material: string;
  type: ProductType;
  typeName: string;
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
  lastUpdated: string;
  additionalInfo?: {
    description?: string;
    specifications?: string;
    notes?: string;
  };
  id_create?: string;
  id_updated?: string;
  dt_create?: string;
  dt_update?: string;
}

interface PagedResponse<T> {
  data: T[];
  totalCount: number;
  currentPage: string;
  totalPages: number;
  hasNextPage: boolean;
}

export class HttpProductRepository implements ProductRepository {
  constructor(private apiClient: ApiClient) {}

  async findById(id: ProductId): Promise<Product | null> {
    try {
      const response = await this.apiClient.get<ProductDto>(
        `/api/products/${id.getValue()}`
      );
      return response.success ? this.mapDtoToEntity(response.data) : null;
    } catch (error) {
      console.error("Failed to find product by id:", error);
      return null;
    }
  }

  async findByPageWithCriteria(
    criteria: ProductSearchCriteria,
    page: number,
    pageSize: number
  ): Promise<Product[]> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy: criteria.sortBy,
        sortDirection: criteria.sortDirection,
      });

      if (criteria.searchKeyword) {
        params.append("searchKeyword", criteria.searchKeyword);
      }

      criteria.filters.forEach((filter, index) => {
        if (filter.field === "type") {
          params.append("type", filter.value);
        } else if (filter.field === "isActive") {
          params.append("isActive", filter.value);
        }
      });

      const response = await this.apiClient.get<PagedResponse<ProductDto>>(
        `/api/products?${params}`
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch products");
      }

      return response.data.data.map((dto) => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error("Error fetching products:", error);
      throw new Error("Failed to fetch products from server");
    }
  }

  async findAllByCriteria(criteria: ProductSearchCriteria): Promise<Product[]> {
    try {
      const params = new URLSearchParams({
        sortBy: criteria.sortBy,
        sortDirection: criteria.sortDirection,
      });

      if (criteria.searchKeyword) {
        params.append("searchKeyword", criteria.searchKeyword);
      }

      criteria.filters.forEach((filter, index) => {
        if (filter.field === "type") {
          params.append("type", filter.value);
        } else if (filter.field === "isActive") {
          params.append("isActive", filter.value);
        }
      });

      const response = await this.apiClient.get<ProductDto[]>(
        `/api/products/all?${params}`
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch all products");
      }

      return response.data.map((dto) => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error("Error fetching all products:", error);
      throw new Error("Failed to fetch all products from server");
    }
  }

  async countByCriteria(criteria: ProductSearchCriteria): Promise<number> {
    try {
      const params = new URLSearchParams();

      if (criteria.searchKeyword) {
        params.append("searchKeyword", criteria.searchKeyword);
      }

      criteria.filters.forEach((filter, index) => {
        if (filter.field === "type") {
          params.append("type", filter.value);
        } else if (filter.field === "isActive") {
          params.append("isActive", filter.value);
        }
      });

      const response = await this.apiClient.get<{ totalCount: number }>(
        `/api/products/count?${params}`
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to count products");
      }

      return response.data.totalCount;
    } catch (error) {
      console.error("Error counting products:", error);
      throw new Error("Failed to count products from server");
    }
  }

  async getLastSequenceByPrefix(prefix: string): Promise<number> {
    try {
      const response = await this.apiClient.get<{ sequence: number }>(
        `/api/products/next-sequence/${prefix}`
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to get last sequence");
      }

      return response.data.sequence;
    } catch (error) {
      console.error("Error getting sequence:", error);
      throw new Error("Failed to get sequence from server");
    }
  }

  async save(product: Product): Promise<void> {
    try {
      const dto = this.mapEntityToDto(product);

      const response = await this.apiClient.post("/api/products", dto);

      if (!response.success) {
        throw new Error(response.message || "Failed to save product");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      throw new Error("Failed to save product to server");
    }
  }

  async delete(id: ProductId): Promise<void> {
    try {
      const response = await this.apiClient.delete(
        `/api/products/${id.getValue()}`
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      throw new Error("Failed to delete product from server");
    }
  }

  private mapDtoToEntity(dto: ProductDto): Product {
    const productId = new ProductId(dto.id);
    const category = new Category(dto.category.code, dto.category.name);
    const unit = new Unit(dto.unit.code, dto.unit.name);
    const additionalInfo = new AdditionalInfo(
      dto.additionalInfo?.description,
      dto.additionalInfo?.specifications,
      dto.additionalInfo?.notes
    );

    const product = new Product(
      productId,
      dto.cd_material,
      dto.nm_material,
      dto.type,
      category,
      unit,
      dto.safetyStock,
      dto.isActive,
      additionalInfo,
      dto.id_create || "system",
      dto.id_updated || "system",
      dto.dt_create ? new Date(dto.dt_create) : new Date(dto.lastUpdated),
      dto.dt_update ? new Date(dto.dt_update) : new Date(dto.lastUpdated)
    );
    
    // 디버깅: Product 인스턴스 확인
    console.log('🔍 Created Product instance:', product);
    console.log('🔍 Product constructor:', product.constructor.name);
    console.log('🔍 canHaveBOM method exists?:', typeof product.canHaveBOM === 'function');
    
    return product;
  }

  private mapEntityToDto(product: Product): ProductDto {
    const getTypeDisplayName = (type: ProductType): string => {
      switch (type) {
        case ProductType.FINISHED_PRODUCT:
          return "완제품";
        case ProductType.SEMI_FINISHED:
          return "반제품";
        case ProductType.RAW_MATERIAL:
          return "원자재";
        default:
          return "기타";
      }
    };

    return {
      id: product.getId().getValue(),
      cd_material: product.getCdMaterial(),
      nm_material: product.getNmMaterial(),
      type: product.getType(),
      typeName: getTypeDisplayName(product.getType()),
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
      lastUpdated: product.getDtUpdate().toISOString(),
      additionalInfo:
        product.getAdditionalInfo().description ||
        product.getAdditionalInfo().specifications ||
        product.getAdditionalInfo().notes
          ? {
              description: product.getAdditionalInfo().description,
              specifications: product.getAdditionalInfo().specifications,
              notes: product.getAdditionalInfo().notes,
            }
          : undefined,
      id_create: product.getIdCreate(),
      id_updated: product.getIdUpdated(),
      dt_create: product.getDtCreate().toISOString(),
      dt_update: product.getDtUpdate().toISOString(),
    };
  }
}
