import { BOMItem, BOMItemId, ComponentType } from '../../domain/entities/BOMItem';
import { BOMId } from '../../domain/entities/BOMItem';
import { ProductId, Unit } from '@features/product/domain/entities/Product';
import { BOMItemRepository, BOMItemSearchCriteria, TreeQueryOptions } from '../../domain/repositories/BOMItemRepository';
import { ApiClient } from '@shared/services/api/ApiClient';

/**
 * BOMItem DTO 인터페이스
 * API 응답 데이터 구조 정의
 */
interface BOMItemDto {
  id: string;
  bomId: string;
  componentId: string;
  parentItemId?: string;
  level: number;
  sequence: number;
  componentType: ComponentType;
  quantity: number;
  unit: {
    code: string;
    name: string;
  };
  unitCost: number;
  scrapRate: number;
  isOptional: boolean;
  position?: string;
  processStep?: string;
  remarks?: string;
  effectiveDate: string;
  expiryDate?: string;
  id_create: string;
  id_updated: string;
  dt_create: string;
  dt_update: string;
}

/**
 * BOMItem HTTP Repository 구현체
 * REST API를 통한 BOM Item 데이터 관리
 */
export class HttpBOMItemRepository implements BOMItemRepository {
  constructor(private apiClient: ApiClient) {}

  // === 기본 CRUD 연산 ===

  async findById(id: BOMItemId): Promise<BOMItem | null> {
    try {
      const response = await this.apiClient.get<BOMItemDto>(`/api/bom-items/${id.getValue()}`);
      return response.success ? this.mapDtoToEntity(response.data) : null;
    } catch (error) {
      console.error('Failed to find BOM item by id:', error);
      return null;
    }
  }

  async findByIds(ids: BOMItemId[]): Promise<BOMItem[]> {
    try {
      const idValues = ids.map(id => id.getValue());
      const params = new URLSearchParams();
      idValues.forEach(id => params.append('ids', id));
      
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/batch?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM items by IDs');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM items by ids:', error);
      return [];
    }
  }

  async save(bomItem: BOMItem): Promise<void> {
    const dto = this.mapEntityToDto(bomItem);
    
    // BOM Item이 이미 존재하는지 확인하여 POST/PUT 결정
    const existingItem = await this.findById(bomItem.getId());
    
    const response = existingItem 
      ? await this.apiClient.put(`/api/bom-items/${bomItem.getId().getValue()}`, dto)
      : await this.apiClient.post('/api/bom-items', dto);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to save BOM item');
    }
  }

  async delete(id: BOMItemId): Promise<void> {
    const response = await this.apiClient.delete(`/api/bom-items/${id.getValue()}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete BOM item');
    }
  }

  async saveAll(bomItems: BOMItem[]): Promise<void> {
    const dtos = bomItems.map(item => this.mapEntityToDto(item));
    
    const response = await this.apiClient.post('/api/bom-items/batch', { items: dtos });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to save BOM items batch');
    }
  }

  async deleteAll(ids: BOMItemId[]): Promise<void> {
    const idValues = ids.map(id => id.getValue());
    
    const response = await this.apiClient.delete('/api/bom-items/batch', { 
      data: { ids: idValues }
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete BOM items batch');
    }
  }

  // === BOM 기반 조회 ===

  async findByBOMId(bomId: BOMId): Promise<BOMItem[]> {
    try {
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/bom/${bomId.getValue()}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM items by BOM ID');
      }
      
      // 데이터 검증 및 필터링
      const validItems = response.data.filter(dto => {
        if (!dto.id) {
          console.warn('Skipping BOM item without ID:', dto);
          return false;
        }
        return true;
      });
      
      return validItems.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM items by BOM id:', error);
      return [];
    }
  }

  async findRootItemsByBOMId(bomId: BOMId): Promise<BOMItem[]> {
    try {
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/bom/${bomId.getValue()}/root`);
      if (!response.success) {
        throw new Error('Failed to fetch root BOM items');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find root BOM items:', error);
      return [];
    }
  }

  async countByBOMId(bomId: BOMId): Promise<number> {
    try {
      const response = await this.apiClient.get<{ count: number }>(`/api/bom-items/bom/${bomId.getValue()}/count`);
      return response.success ? response.data.count : 0;
    } catch (error) {
      console.error('Failed to count BOM items:', error);
      return 0;
    }
  }

  // === 트리 구조 조회 ===

  async findByParentId(parentId: BOMItemId): Promise<BOMItem[]> {
    try {
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/parent/${parentId.getValue()}/children`);
      if (!response.success) {
        throw new Error('Failed to fetch children BOM items');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM items by parent id:', error);
      return [];
    }
  }

  async findByParentAndLevel(bomId: BOMId, parentId: BOMItemId | undefined, level: number): Promise<BOMItem[]> {
    try {
      const params = new URLSearchParams({
        bomId: bomId.getValue(),
        level: level.toString()
      });
      
      if (parentId) {
        params.append('parentId', parentId.getValue());
      }
      
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/by-parent-and-level?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM items by parent and level');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM items by parent and level:', error);
      return [];
    }
  }

  async findAllDescendants(parentId: BOMItemId, maxLevel?: number): Promise<BOMItem[]> {
    try {
      const params = new URLSearchParams();
      if (maxLevel !== undefined) {
        params.append('maxLevel', maxLevel.toString());
      }
      
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/parent/${parentId.getValue()}/descendants?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch descendants');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find descendants:', error);
      return [];
    }
  }

  async findAncestorPath(itemId: BOMItemId): Promise<BOMItem[]> {
    try {
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/${itemId.getValue()}/ancestors`);
      if (!response.success) {
        throw new Error('Failed to fetch ancestor path');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find ancestor path:', error);
      return [];
    }
  }

  async hasChildren(id: BOMItemId): Promise<boolean> {
    try {
      const response = await this.apiClient.get<{ hasChildren: boolean }>(`/api/bom-items/${id.getValue()}/has-children`);
      return response.success ? response.data.hasChildren : false;
    } catch (error) {
      console.error('Failed to check if item has children:', error);
      return false;
    }
  }

  async findTreeStructure(bomId: BOMId, options?: TreeQueryOptions): Promise<BOMItem[]> {
    try {
      const params = new URLSearchParams();
      if (options) {
        if (options.maxLevel !== undefined) {
          params.append('maxLevel', options.maxLevel.toString());
        }
        if (options.includeInactive !== undefined) {
          params.append('includeInactive', options.includeInactive.toString());
        }
        if (options.sortBySequence !== undefined) {
          params.append('sortBySequence', options.sortBySequence.toString());
        }
        if (options.expandAll !== undefined) {
          params.append('expandAll', options.expandAll.toString());
        }
      }
      
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/bom/${bomId.getValue()}/tree?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM tree structure');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find tree structure:', error);
      return [];
    }
  }

  // === 레벨 기반 조회 ===

  async findByLevel(bomId: BOMId, level: number): Promise<BOMItem[]> {
    try {
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/bom/${bomId.getValue()}/level/${level}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM items by level');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM items by level:', error);
      return [];
    }
  }

  async findByLevelRange(bomId: BOMId, minLevel: number, maxLevel: number): Promise<BOMItem[]> {
    try {
      const params = new URLSearchParams({
        minLevel: minLevel.toString(),
        maxLevel: maxLevel.toString()
      });
      
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/bom/${bomId.getValue()}/level-range?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM items by level range');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM items by level range:', error);
      return [];
    }
  }

  async getMaxLevel(bomId: BOMId): Promise<number> {
    try {
      const response = await this.apiClient.get<{ maxLevel: number }>(`/api/bom-items/bom/${bomId.getValue()}/max-level`);
      return response.success ? response.data.maxLevel : 0;
    } catch (error) {
      console.error('Failed to get max level:', error);
      return 0;
    }
  }

  async getItemCountByLevel(bomId: BOMId): Promise<Map<number, number>> {
    try {
      const response = await this.apiClient.get<Record<string, number>>(`/api/bom-items/bom/${bomId.getValue()}/level-counts`);
      if (!response.success) {
        throw new Error('Failed to get item count by level');
      }
      
      const map = new Map<number, number>();
      Object.entries(response.data).forEach(([level, count]) => {
        map.set(parseInt(level), count);
      });
      
      return map;
    } catch (error) {
      console.error('Failed to get item count by level:', error);
      return new Map();
    }
  }

  // === 구성품 기반 조회 ===

  async findByComponentId(componentId: ProductId): Promise<BOMItem[]> {
    try {
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/component/${componentId.getValue()}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM items by component ID');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM items by component id:', error);
      return [];
    }
  }

  async findByComponentIds(componentIds: ProductId[]): Promise<BOMItem[]> {
    try {
      const params = new URLSearchParams();
      componentIds.forEach(id => params.append('componentIds', id.getValue()));
      
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/components?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM items by component IDs');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM items by component ids:', error);
      return [];
    }
  }

  async findBOMIdsByComponent(componentId: ProductId): Promise<BOMId[]> {
    try {
      const response = await this.apiClient.get<string[]>(`/api/bom-items/component/${componentId.getValue()}/boms`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM IDs by component');
      }
      
      return response.data.map(bomId => new BOMId(bomId));
    } catch (error) {
      console.error('Failed to find BOM IDs by component:', error);
      return [];
    }
  }

  // === 검색 및 필터링 ===

  async findByCriteria(criteria: BOMItemSearchCriteria): Promise<BOMItem[]> {
    try {
      const params = new URLSearchParams();
      
      if (criteria.bomId) {
        params.append('bomId', criteria.bomId.getValue());
      }
      if (criteria.componentIds && criteria.componentIds.length > 0) {
        criteria.componentIds.forEach(id => params.append('componentIds', id.getValue()));
      }
      if (criteria.levels && criteria.levels.length > 0) {
        criteria.levels.forEach(level => params.append('levels', level.toString()));
      }
      if (criteria.parentItemId) {
        params.append('parentItemId', criteria.parentItemId.getValue());
      }
      if (criteria.componentTypes && criteria.componentTypes.length > 0) {
        criteria.componentTypes.forEach(type => params.append('componentTypes', type));
      }
      if (criteria.isOptional !== undefined) {
        params.append('isOptional', criteria.isOptional.toString());
      }
      if (criteria.isActive !== undefined) {
        params.append('isActive', criteria.isActive.toString());
      }
      if (criteria.minCost !== undefined) {
        params.append('minCost', criteria.minCost.toString());
      }
      if (criteria.maxCost !== undefined) {
        params.append('maxCost', criteria.maxCost.toString());
      }
      if (criteria.processSteps && criteria.processSteps.length > 0) {
        criteria.processSteps.forEach(step => params.append('processSteps', step));
      }
      
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/search?${params}`);
      if (!response.success) {
        throw new Error('Failed to search BOM items');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM items by criteria:', error);
      return [];
    }
  }

  async findByComponentTypes(bomId: BOMId, componentTypes: ComponentType[]): Promise<BOMItem[]> {
    try {
      const params = new URLSearchParams();
      componentTypes.forEach(type => params.append('types', type));
      
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/bom/${bomId.getValue()}/component-types?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM items by component types');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM items by component types:', error);
      return [];
    }
  }

  async findByProcessStep(bomId: BOMId, processStep: string): Promise<BOMItem[]> {
    try {
      const params = new URLSearchParams({ processStep });
      
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/bom/${bomId.getValue()}/process-step?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM items by process step');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM items by process step:', error);
      return [];
    }
  }

  async findByCostRange(bomId: BOMId, minCost: number, maxCost: number): Promise<BOMItem[]> {
    try {
      const params = new URLSearchParams({
        minCost: minCost.toString(),
        maxCost: maxCost.toString()
      });
      
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/bom/${bomId.getValue()}/cost-range?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM items by cost range');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM items by cost range:', error);
      return [];
    }
  }

  // === 순서 관리 ===

  async getNextSequence(bomId: BOMId, parentId: BOMItemId | undefined, level: number): Promise<number> {
    try {
      const params = new URLSearchParams({
        bomId: bomId.getValue(),
        level: level.toString()
      });
      
      if (parentId) {
        params.append('parentId', parentId.getValue());
      }
      
      const response = await this.apiClient.get<{ nextSequence: number }>(`/api/bom-items/next-sequence?${params}`);
      return response.success ? response.data.nextSequence : 1;
    } catch (error) {
      console.error('Failed to get next sequence:', error);
      return 1;
    }
  }

  async updateSequence(itemId: BOMItemId, newSequence: number): Promise<void> {
    const response = await this.apiClient.put(`/api/bom-items/${itemId.getValue()}/sequence`, {
      sequence: newSequence
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to update sequence');
    }
  }

  async reorderSiblings(bomId: BOMId, parentId: BOMItemId | undefined, itemSequences: Map<string, number>): Promise<void> {
    const sequences = Object.fromEntries(itemSequences);
    const requestData: any = {
      bomId: bomId.getValue(),
      sequences
    };
    
    if (parentId) {
      requestData.parentId = parentId.getValue();
    }
    
    const response = await this.apiClient.put('/api/bom-items/reorder-siblings', requestData);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to reorder siblings');
    }
  }

  // === 통계 및 분석 ===

  async getComponentUsageStatistics(): Promise<Map<string, number>> {
    try {
      const response = await this.apiClient.get<Record<string, number>>('/api/bom-items/statistics/component-usage');
      if (!response.success) {
        throw new Error('Failed to get component usage statistics');
      }
      
      return new Map(Object.entries(response.data));
    } catch (error) {
      console.error('Failed to get component usage statistics:', error);
      return new Map();
    }
  }

  async findMostExpensiveItems(limit: number): Promise<BOMItem[]> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/most-expensive?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch most expensive items');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find most expensive items:', error);
      return [];
    }
  }

  async findOptionalItems(bomId: BOMId): Promise<BOMItem[]> {
    try {
      const response = await this.apiClient.get<BOMItemDto[]>(`/api/bom-items/bom/${bomId.getValue()}/optional`);
      if (!response.success) {
        throw new Error('Failed to fetch optional items');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find optional items:', error);
      return [];
    }
  }

  // === 유틸리티 ===

  async exists(id: BOMItemId): Promise<boolean> {
    try {
      const response = await this.apiClient.get(`/api/bom-items/${id.getValue()}/exists`);
      return response.success;
    } catch (error) {
      return false;
    }
  }

  async isDuplicate(bomId: BOMId, componentId: ProductId, parentId: BOMItemId | undefined): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        bomId: bomId.getValue(),
        componentId: componentId.getValue()
      });
      
      if (parentId) {
        params.append('parentId', parentId.getValue());
      }
      
      const response = await this.apiClient.get<{ isDuplicate: boolean }>(`/api/bom-items/check-duplicate?${params}`);
      return response.success ? response.data.isDuplicate : false;
    } catch (error) {
      console.error('Failed to check duplicate:', error);
      return false;
    }
  }

  // === Private 변환 메서드들 ===

  private mapDtoToEntity(dto: BOMItemDto): BOMItem {
    // id가 없는 경우 에러 처리
    if (!dto.id) {
      console.error('BOM Item DTO missing id:', dto);
      throw new Error('BOM Item ID is required');
    }
    
    const bomItemId = new BOMItemId(dto.id);
    const bomId = new BOMId(dto.bomId);
    const componentId = new ProductId(dto.componentId);
    const parentItemId = dto.parentItemId ? new BOMItemId(dto.parentItemId) : undefined;
    const unit = new Unit(dto.unit.code, dto.unit.name);

    return new BOMItem(
      bomItemId,
      bomId,
      componentId,
      parentItemId,
      dto.level,
      dto.sequence,
      dto.quantity,
      unit,
      dto.unitCost,
      dto.scrapRate,
      dto.isOptional,
      dto.componentType,
      new Date(dto.effectiveDate),
      dto.id_create,
      dto.id_updated,
      new Date(dto.dt_create),
      new Date(dto.dt_update),
      dto.position,
      dto.processStep,
      dto.remarks,
      dto.expiryDate ? new Date(dto.expiryDate) : undefined
    );
  }

  private mapEntityToDto(bomItem: BOMItem): BOMItemDto {
    return {
      id: bomItem.getId().getValue(),
      bomId: bomItem.getBOMId().getValue(),
      componentId: bomItem.getComponentId().getValue(),
      parentItemId: bomItem.getParentItemId()?.getValue(),
      level: bomItem.getLevel(),
      sequence: bomItem.getSequence(),
      componentType: bomItem.getComponentType(),
      quantity: bomItem.getQuantity(),
      unit: {
        code: bomItem.getUnit().code,
        name: bomItem.getUnit().name,
      },
      unitCost: bomItem.getUnitCost(),
      scrapRate: bomItem.getScrapRate(),
      isOptional: bomItem.getIsOptional(),
      position: bomItem.getPosition(),
      processStep: bomItem.getProcessStep(),
      remarks: bomItem.getRemarks(),
      effectiveDate: bomItem.getEffectiveDate().toISOString(),
      expiryDate: bomItem.getExpiryDate()?.toISOString(),
      id_create: bomItem.getIdCreate(),
      id_updated: bomItem.getIdUpdated(),
      dt_create: bomItem.getDtCreate().toISOString(),
      dt_update: bomItem.getDtUpdate().toISOString(),
    };
  }
}