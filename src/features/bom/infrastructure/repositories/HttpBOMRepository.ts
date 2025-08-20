import { BOM } from '../../domain/entities/BOM';
import { BOMId } from '../../domain/entities/BOMItem';
import { ProductId } from '@features/product/domain/entities/Product';
import { BOMRepository, BOMSearchCriteria, BOMFilter, BOMStatusFilter } from '../../domain/repositories/BOMRepository';
import { ApiClient } from '@shared/services/api/ApiClient';

/**
 * BOM DTO 인터페이스
 * API 응답 데이터 구조 정의
 */
interface BOMDto {
  id: string;
  productId: string;
  version: string;
  isActive: boolean;
  effectiveDate: string;
  expiryDate?: string;
  description?: string;
  totalCost: number;
  id_create: string;
  id_updated: string;
  dt_create: string;
  dt_update: string;
}

/**
 * 페이징된 응답 인터페이스
 */
interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

/**
 * BOM HTTP Repository 구현체
 * REST API를 통한 BOM 데이터 관리
 */
export class HttpBOMRepository implements BOMRepository {
  constructor(private apiClient: ApiClient) {}

  // === 기본 CRUD 연산 ===

  async findById(id: BOMId): Promise<BOM | null> {
    try {
      const response = await this.apiClient.get<BOMDto>(`/api/boms/${id.getValue()}`);
      return response.success ? this.mapDtoToEntity(response.data) : null;
    } catch (error) {
      console.error('Failed to find BOM by id:', error);
      return null;
    }
  }

  async findByIds(ids: BOMId[]): Promise<BOM[]> {
    try {
      const idValues = ids.map(id => id.getValue());
      const params = new URLSearchParams();
      idValues.forEach(id => params.append('ids', id));
      
      const response = await this.apiClient.get<BOMDto[]>(`/api/boms/batch?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOMs by IDs');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOMs by ids:', error);
      return [];
    }
  }

  async save(bom: BOM): Promise<void> {
    const dto = this.mapEntityToDto(bom);
    
    // BOM이 이미 존재하는지 확인하여 POST/PUT 결정
    const existingBOM = await this.findById(bom.getId());
    
    const response = existingBOM 
      ? await this.apiClient.put(`/api/boms/${bom.getId().getValue()}`, dto)
      : await this.apiClient.post('/api/boms', dto);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to save BOM');
    }
  }

  async delete(id: BOMId): Promise<void> {
    const response = await this.apiClient.delete(`/api/boms/${id.getValue()}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete BOM');
    }
  }

  // === 제품 기반 조회 ===

  async findByProductId(productId: ProductId): Promise<BOM[]> {
    try {
      const response = await this.apiClient.get<BOMDto[]>(`/api/boms/product/${productId.getValue()}/all`);
      if (!response.success) {
        throw new Error('Failed to fetch BOMs by product ID');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOMs by product id:', error);
      return [];
    }
  }

  async findByProductIdAndVersion(productId: ProductId, version: string): Promise<BOM | null> {
    try {
      const response = await this.apiClient.get<BOMDto>(`/api/boms/product/${productId.getValue()}/version/${encodeURIComponent(version)}`);
      return response.success ? this.mapDtoToEntity(response.data) : null;
    } catch (error) {
      console.error('Failed to find BOM by product id and version:', error);
      return null;
    }
  }

  async findActiveByProductId(productId: ProductId): Promise<BOM | null> {
    try {
      const response = await this.apiClient.get<BOMDto>(`/api/boms/product/${productId.getValue()}/active`);
      return response.success ? this.mapDtoToEntity(response.data) : null;
    } catch (error) {
      console.error('Failed to find active BOM by product id:', error);
      return null;
    }
  }

  async findActiveByProductIds(productIds: ProductId[]): Promise<Map<string, BOM>> {
    try {
      const params = new URLSearchParams();
      productIds.forEach(id => params.append('productIds', id.getValue()));
      
      const response = await this.apiClient.get<Record<string, BOMDto>>(`/api/boms/active/batch?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch active BOMs by product IDs');
      }
      
      const resultMap = new Map<string, BOM>();
      Object.entries(response.data).forEach(([productId, bomDto]) => {
        resultMap.set(productId, this.mapDtoToEntity(bomDto));
      });
      
      return resultMap;
    } catch (error) {
      console.error('Failed to find active BOMs by product ids:', error);
      return new Map();
    }
  }

  // === 검색 및 필터링 ===

  async findByPageWithCriteria(
    criteria: BOMSearchCriteria,
    page: number,
    pageSize: number
  ): Promise<BOM[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      sortBy: criteria.sortBy || 'version',
      sortDirection: criteria.sortDirection || 'asc',
    });

    if (criteria.searchKeyword) {
      params.append('search', criteria.searchKeyword);
    }

    if (criteria.filters) {
      criteria.filters.forEach((filter, index) => {
        params.append(`filters[${index}].field`, filter.field);
        params.append(`filters[${index}].operator`, filter.operator);
        params.append(`filters[${index}].value`, filter.value.toString());
      });
    }

    const response = await this.apiClient.get<PagedResponse<BOMDto>>(`/api/boms?${params}`);
    
    if (!response.success) {
      throw new Error('Failed to fetch BOMs with criteria');
    }

    return response.data.items.map(dto => this.mapDtoToEntity(dto));
  }

  async countByCriteria(criteria: BOMSearchCriteria): Promise<number> {
    const params = new URLSearchParams();

    if (criteria.searchKeyword) {
      params.append('search', criteria.searchKeyword);
    }

    if (criteria.filters) {
      criteria.filters.forEach((filter, index) => {
        params.append(`filters[${index}].field`, filter.field);
        params.append(`filters[${index}].operator`, filter.operator);
        params.append(`filters[${index}].value`, filter.value.toString());
      });
    }

    const response = await this.apiClient.get<{ count: number }>(`/api/boms/count?${params}`);
    
    if (!response.success) {
      throw new Error('Failed to count BOMs');
    }

    return response.data.count;
  }

  async findByStatus(statusFilter: BOMStatusFilter): Promise<BOM[]> {
    const params = new URLSearchParams();

    if (statusFilter.isActive !== undefined) {
      params.append('isActive', statusFilter.isActive.toString());
    }
    if (statusFilter.isCurrentlyActive !== undefined) {
      params.append('isCurrentlyActive', statusFilter.isCurrentlyActive.toString());
    }
    if (statusFilter.hasItems !== undefined) {
      params.append('hasItems', statusFilter.hasItems.toString());
    }
    if (statusFilter.minCost !== undefined) {
      params.append('minCost', statusFilter.minCost.toString());
    }
    if (statusFilter.maxCost !== undefined) {
      params.append('maxCost', statusFilter.maxCost.toString());
    }

    const response = await this.apiClient.get<BOMDto[]>(`/api/boms/by-status?${params}`);
    
    if (!response.success) {
      throw new Error('Failed to fetch BOMs by status');
    }

    return response.data.map(dto => this.mapDtoToEntity(dto));
  }

  // === 버전 관리 ===

  async findByVersionPattern(pattern: string): Promise<BOM[]> {
    try {
      const params = new URLSearchParams({ pattern });
      const response = await this.apiClient.get<BOMDto[]>(`/api/boms/version-pattern?${params}`);
      
      if (!response.success) {
        throw new Error('Failed to fetch BOMs by version pattern');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOMs by version pattern:', error);
      return [];
    }
  }

  async getLatestVersionByProductId(productId: ProductId): Promise<string | null> {
    try {
      const response = await this.apiClient.get<{ version: string }>(`/api/boms/product/${productId.getValue()}/latest-version`);
      return response.success ? response.data.version : null;
    } catch (error) {
      console.error('Failed to get latest version:', error);
      return null;
    }
  }

  async generateNextVersion(productId: ProductId, baseVersion?: string): Promise<string> {
    const params = new URLSearchParams();
    if (baseVersion) {
      params.append('baseVersion', baseVersion);
    }

    const response = await this.apiClient.get<{ version: string }>(`/api/boms/product/${productId.getValue()}/next-version?${params}`);
    
    if (!response.success) {
      throw new Error('Failed to generate next version');
    }

    return response.data.version;
  }

  // === 날짜 기반 조회 ===

  async findActiveBOMsWithinDateRange(startDate: Date, endDate: Date): Promise<BOM[]> {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      const response = await this.apiClient.get<BOMDto[]>(`/api/boms/active/date-range?${params}`);
      
      if (!response.success) {
        throw new Error('Failed to fetch BOMs within date range');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOMs within date range:', error);
      return [];
    }
  }

  async findBOMValidAtDate(productId: ProductId, targetDate: Date): Promise<BOM | null> {
    try {
      const params = new URLSearchParams({
        targetDate: targetDate.toISOString()
      });
      
      const response = await this.apiClient.get<BOMDto>(`/api/boms/product/${productId.getValue()}/valid-at-date?${params}`);
      return response.success ? this.mapDtoToEntity(response.data) : null;
    } catch (error) {
      console.error('Failed to find BOM valid at date:', error);
      return null;
    }
  }

  // === 통계 및 분석 ===

  async getBOMCountByProduct(): Promise<Map<string, number>> {
    try {
      const response = await this.apiClient.get<Record<string, number>>('/api/boms/statistics/count-by-product');
      
      if (!response.success) {
        throw new Error('Failed to get BOM count by product');
      }
      
      return new Map(Object.entries(response.data));
    } catch (error) {
      console.error('Failed to get BOM count by product:', error);
      return new Map();
    }
  }

  async findBOMsOrderedByCost(limit?: number, ascending: boolean = false): Promise<BOM[]> {
    try {
      const params = new URLSearchParams({
        order: ascending ? 'asc' : 'desc'
      });
      
      if (limit) {
        params.append('limit', limit.toString());
      }
      
      const response = await this.apiClient.get<BOMDto[]>(`/api/boms/ordered-by-cost?${params}`);
      
      if (!response.success) {
        throw new Error('Failed to fetch BOMs ordered by cost');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOMs ordered by cost:', error);
      return [];
    }
  }

  async findComplexBOMs(minItemCount: number): Promise<BOM[]> {
    try {
      const params = new URLSearchParams({
        minItemCount: minItemCount.toString()
      });
      
      const response = await this.apiClient.get<BOMDto[]>(`/api/boms/complex?${params}`);
      
      if (!response.success) {
        throw new Error('Failed to fetch complex BOMs');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find complex BOMs:', error);
      return [];
    }
  }

  // === 유틸리티 ===

  async exists(id: BOMId): Promise<boolean> {
    try {
      const response = await this.apiClient.get(`/api/boms/${id.getValue()}/exists`);
      return response.success;
    } catch (error) {
      return false;
    }
  }

  async existsByProductId(productId: ProductId): Promise<boolean> {
    try {
      const response = await this.apiClient.get(`/api/boms/product/${productId.getValue()}/exists`);
      return response.success;
    } catch (error) {
      return false;
    }
  }

  // === Private 변환 메서드들 ===

  private mapDtoToEntity(dto: BOMDto): BOM {
    const bomId = new BOMId(dto.id);
    const productId = new ProductId(dto.productId);

    // BOM Items는 별도 Repository에서 조회되므로 빈 배열로 초기화
    // 실제 사용 시에는 BOMItemRepository를 통해 조회해야 함
    const bomItems: any[] = [];

    return new BOM(
      bomId,
      productId,
      dto.version,
      dto.isActive,
      bomItems,
      new Date(dto.effectiveDate),
      dto.id_create,
      dto.id_updated,
      new Date(dto.dt_create),
      new Date(dto.dt_update),
      dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      dto.description
    );
  }

  private mapEntityToDto(bom: BOM): BOMDto {
    return {
      id: bom.getId().getValue(),
      productId: bom.getProductId().getValue(),
      version: bom.getVersion(),
      isActive: bom.getIsActive(),
      effectiveDate: bom.getEffectiveDate().toISOString(),
      expiryDate: bom.getExpiryDate()?.toISOString(),
      description: bom.getDescription(),
      totalCost: bom.calculateTotalCost(),
      id_create: bom.getIdCreate(),
      id_updated: bom.getIdUpdated(),
      dt_create: bom.getDtCreate().toISOString(),
      dt_update: bom.getDtUpdate().toISOString(),
    };
  }
}