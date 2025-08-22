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
      
      // ID가 있고 'temp-' 접두사가 아니면 수정, 그 외는 신규 생성
      // 'temp-'로 시작하는 ID는 프론트엔드에서 임시로 생성한 것이므로 신규로 처리
      const isUpdate = dto.id && !dto.id.startsWith('temp-');
      
      if (isUpdate) {
        // 수정 요청 (PUT) - 백엔드 API 스펙에 맞게 필드 조정
        const updateRequest = {
          nm_material: dto.nm_material,
          type: dto.type,
          category: dto.category,
          unit: dto.unit,
          safetyStock: dto.safetyStock,
          isActive: dto.isActive,
          additionalInfo: dto.additionalInfo,
          id_update: dto.id_updated || 'system',  // id_updated를 id_update로 변경
          updateReason: '사용자 요청에 의한 수정'
        };
        
        const response = await this.apiClient.put(
          `/api/products/${dto.id}`,
          updateRequest
        );
        
        if (!response.success) {
          throw new Error(response.message || "Failed to update product");
        }
      } else {
        // 생성 요청 (POST) - 신규 생성 시에는 id를 제외하고 전송
        const createRequest = {
          ...dto,
          id: undefined, // 백엔드에서 생성하도록 id 제거
          cd_material: undefined, // 백엔드에서 자동 생성
        };
        
        const response = await this.apiClient.post("/api/products", createRequest);
        
        if (!response.success) {
          throw new Error(response.message || "Failed to create product");
        }
      }
    } catch (error) {
      console.error("Error saving product:", error);
      throw new Error("Failed to save product to server");
    }
  }

  async delete(id: ProductId, deleteData?: { id_updated: string; reason?: string; softDelete?: boolean }): Promise<void> {
    try {
      // 백엔드 API 필드명에 맞게 변환
      const requestData = {
        deleteReason: deleteData?.reason || '사용자 요청에 의한 삭제',
        id_delete: deleteData?.id_updated || 'system',
        softDelete: deleteData?.softDelete !== undefined ? deleteData.softDelete : true
      };
      
      const response = await this.apiClient.delete(
        `/api/products/${id.getValue()}`,
        {
          data: requestData
        }
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
