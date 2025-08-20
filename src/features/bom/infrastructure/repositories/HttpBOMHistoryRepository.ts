import { BOMHistory, BOMHistoryAction, ChangedField } from '../../domain/entities/BOMHistory';
import { BOMId } from '../../domain/entities/BOMItem';
import { 
  BOMHistoryRepository, 
  BOMHistorySearchCriteria, 
  HistoryAggregationOptions,
  HistoryAggregationResult
} from '../../domain/repositories/BOMHistoryRepository';
import { ApiClient } from '@shared/services/api/ApiClient';

/**
 * ChangedField DTO 인터페이스
 */
interface ChangedFieldDto {
  fieldName: string;
  oldValue: any;
  newValue: any;
}

/**
 * BOMHistory DTO 인터페이스
 * API 응답 데이터 구조 정의
 */
interface BOMHistoryDto {
  id: string;
  bomId: string;
  action: BOMHistoryAction;
  targetType: 'BOM' | 'BOM_ITEM' | 'BOM_COMPARISON';
  targetId: string;
  changedFields: ChangedFieldDto[];
  userId: string;
  userName: string;
  timestamp: string;
  reason?: string;
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
 * BOMHistory HTTP Repository 구현체
 * REST API를 통한 BOM History 데이터 관리
 */
export class HttpBOMHistoryRepository implements BOMHistoryRepository {
  constructor(private apiClient: ApiClient) {}

  // === 기본 CRUD 연산 ===

  async save(history: BOMHistory): Promise<void> {
    const dto = this.mapEntityToDto(history);
    
    const response = await this.apiClient.post('/api/bom-histories', dto);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to save BOM history');
    }
  }

  async saveAll(histories: BOMHistory[]): Promise<void> {
    const dtos = histories.map(history => this.mapEntityToDto(history));
    
    const response = await this.apiClient.post('/api/bom-histories/batch', { histories: dtos });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to save BOM histories batch');
    }
  }

  async findById(id: string): Promise<BOMHistory | null> {
    try {
      const response = await this.apiClient.get<BOMHistoryDto>(`/api/bom-histories/${id}`);
      return response.success ? this.mapDtoToEntity(response.data) : null;
    } catch (error) {
      console.error('Failed to find BOM history by id:', error);
      return null;
    }
  }

  async findByIds(ids: string[]): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams();
      ids.forEach(id => params.append('ids', id));
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/batch?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM histories by IDs');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM histories by ids:', error);
      return [];
    }
  }

  // === BOM 기반 조회 ===

  async findByBOMId(bomId: BOMId): Promise<BOMHistory[]> {
    try {
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/bom/${bomId.getValue()}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM histories by BOM ID');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM histories by BOM id:', error);
      return [];
    }
  }

  async findByBOMIds(bomIds: BOMId[]): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams();
      bomIds.forEach(id => params.append('bomIds', id.getValue()));
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/boms?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM histories by BOM IDs');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM histories by BOM ids:', error);
      return [];
    }
  }

  async findRecentByBOMId(bomId: BOMId, limit: number = 10): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/bom/${bomId.getValue()}/recent?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch recent BOM histories');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find recent BOM histories:', error);
      return [];
    }
  }

  // === 대상별 조회 ===

  async findByTargetId(targetId: string): Promise<BOMHistory[]> {
    try {
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/target/${targetId}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM histories by target ID');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM histories by target id:', error);
      return [];
    }
  }

  async findByTargetIds(targetIds: string[]): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams();
      targetIds.forEach(id => params.append('targetIds', id));
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/targets?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM histories by target IDs');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM histories by target ids:', error);
      return [];
    }
  }

  async findByTargetType(targetType: 'BOM' | 'BOM_ITEM', bomId?: BOMId): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams({ targetType });
      if (bomId) {
        params.append('bomId', bomId.getValue());
      }
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/target-type?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM histories by target type');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM histories by target type:', error);
      return [];
    }
  }

  // === 날짜 기반 조회 ===

  async findByDateRange(startDate: Date, endDate: Date): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/date-range?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM histories by date range');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM histories by date range:', error);
      return [];
    }
  }

  async findByDate(date: Date): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams({ date: date.toISOString() });
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/date?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM histories by date');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM histories by date:', error);
      return [];
    }
  }

  async findRecentDays(days: number, bomId?: BOMId): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams({ days: days.toString() });
      if (bomId) {
        params.append('bomId', bomId.getValue());
      }
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/recent-days?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch recent BOM histories');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find recent BOM histories:', error);
      return [];
    }
  }

  // === 사용자 기반 조회 ===

  async findByUserId(userId: string): Promise<BOMHistory[]> {
    try {
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/user/${userId}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM histories by user ID');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM histories by user id:', error);
      return [];
    }
  }

  async findByUserIds(userIds: string[]): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams();
      userIds.forEach(id => params.append('userIds', id));
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/users?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM histories by user IDs');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM histories by user ids:', error);
      return [];
    }
  }

  async findRecentActivityByUser(userId: string, limit: number = 10): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/user/${userId}/recent?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch recent user activity');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find recent user activity:', error);
      return [];
    }
  }

  // === 액션 기반 조회 ===

  async findByAction(action: BOMHistoryAction, bomId?: BOMId): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams({ action });
      if (bomId) {
        params.append('bomId', bomId.getValue());
      }
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/action?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM histories by action');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM histories by action:', error);
      return [];
    }
  }

  async findByActions(actions: BOMHistoryAction[]): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams();
      actions.forEach(action => params.append('actions', action));
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/actions?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM histories by actions');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM histories by actions:', error);
      return [];
    }
  }

  async findCriticalChanges(bomId?: BOMId): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams();
      if (bomId) {
        params.append('bomId', bomId.getValue());
      }
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/critical?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch critical BOM changes');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find critical changes:', error);
      return [];
    }
  }

  // === 검색 및 필터링 ===

  async findByPageWithCriteria(
    criteria: BOMHistorySearchCriteria,
    page: number,
    pageSize: number
  ): Promise<BOMHistory[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (criteria.bomIds && criteria.bomIds.length > 0) {
      criteria.bomIds.forEach(id => params.append('bomIds', id.getValue()));
    }
    if (criteria.actions && criteria.actions.length > 0) {
      criteria.actions.forEach(action => params.append('actions', action));
    }
    if (criteria.userIds && criteria.userIds.length > 0) {
      criteria.userIds.forEach(userId => params.append('userIds', userId));
    }
    if (criteria.targetTypes && criteria.targetTypes.length > 0) {
      criteria.targetTypes.forEach(type => params.append('targetTypes', type));
    }
    if (criteria.dateRange) {
      params.append('startDate', criteria.dateRange.startDate.toISOString());
      params.append('endDate', criteria.dateRange.endDate.toISOString());
    }
    if (criteria.criticalOnly) {
      params.append('criticalOnly', criteria.criticalOnly.toString());
    }
    if (criteria.hasReason !== undefined) {
      params.append('hasReason', criteria.hasReason.toString());
    }
    if (criteria.changedFields && criteria.changedFields.length > 0) {
      criteria.changedFields.forEach(field => params.append('changedFields', field));
    }

    const response = await this.apiClient.get<PagedResponse<BOMHistoryDto>>(`/api/bom-histories?${params}`);
    
    if (!response.success) {
      throw new Error('Failed to fetch BOM histories with criteria');
    }

    return response.data.items.map(dto => this.mapDtoToEntity(dto));
  }

  async countByCriteria(criteria: BOMHistorySearchCriteria): Promise<number> {
    const params = new URLSearchParams();

    if (criteria.bomIds && criteria.bomIds.length > 0) {
      criteria.bomIds.forEach(id => params.append('bomIds', id.getValue()));
    }
    if (criteria.actions && criteria.actions.length > 0) {
      criteria.actions.forEach(action => params.append('actions', action));
    }
    if (criteria.userIds && criteria.userIds.length > 0) {
      criteria.userIds.forEach(userId => params.append('userIds', userId));
    }
    if (criteria.targetTypes && criteria.targetTypes.length > 0) {
      criteria.targetTypes.forEach(type => params.append('targetTypes', type));
    }
    if (criteria.dateRange) {
      params.append('startDate', criteria.dateRange.startDate.toISOString());
      params.append('endDate', criteria.dateRange.endDate.toISOString());
    }
    if (criteria.criticalOnly) {
      params.append('criticalOnly', criteria.criticalOnly.toString());
    }
    if (criteria.hasReason !== undefined) {
      params.append('hasReason', criteria.hasReason.toString());
    }
    if (criteria.changedFields && criteria.changedFields.length > 0) {
      criteria.changedFields.forEach(field => params.append('changedFields', field));
    }

    const response = await this.apiClient.get<{ count: number }>(`/api/bom-histories/count?${params}`);
    
    if (!response.success) {
      throw new Error('Failed to count BOM histories');
    }

    return response.data.count;
  }

  async findByChangedField(fieldName: string, bomId?: BOMId): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams({ fieldName });
      if (bomId) {
        params.append('bomId', bomId.getValue());
      }
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/changed-field?${params}`);
      if (!response.success) {
        throw new Error('Failed to fetch BOM histories by changed field');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find BOM histories by changed field:', error);
      return [];
    }
  }

  // === 통계 및 분석 ===

  async getHistoryAggregation(options: HistoryAggregationOptions): Promise<HistoryAggregationResult[]> {
    try {
      const params = new URLSearchParams({ groupBy: options.groupBy });
      if (options.period) {
        params.append('period', options.period);
      }
      if (options.limit) {
        params.append('limit', options.limit.toString());
      }
      if (options.sortByCount !== undefined) {
        params.append('sortByCount', options.sortByCount.toString());
      }
      
      const response = await this.apiClient.get<HistoryAggregationResult[]>(`/api/bom-histories/aggregation?${params}`);
      if (!response.success) {
        throw new Error('Failed to get history aggregation');
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to get history aggregation:', error);
      return [];
    }
  }

  async getUserActivityStatistics(startDate?: Date, endDate?: Date): Promise<Map<string, number>> {
    try {
      const params = new URLSearchParams();
      if (startDate) {
        params.append('startDate', startDate.toISOString());
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString());
      }
      
      const response = await this.apiClient.get<Record<string, number>>(`/api/bom-histories/statistics/user-activity?${params}`);
      if (!response.success) {
        throw new Error('Failed to get user activity statistics');
      }
      
      return new Map(Object.entries(response.data));
    } catch (error) {
      console.error('Failed to get user activity statistics:', error);
      return new Map();
    }
  }

  async getActionStatistics(bomId?: BOMId): Promise<Map<BOMHistoryAction, number>> {
    try {
      const params = new URLSearchParams();
      if (bomId) {
        params.append('bomId', bomId.getValue());
      }
      
      const response = await this.apiClient.get<Record<string, number>>(`/api/bom-histories/statistics/actions?${params}`);
      if (!response.success) {
        throw new Error('Failed to get action statistics');
      }
      
      const map = new Map<BOMHistoryAction, number>();
      Object.entries(response.data).forEach(([action, count]) => {
        map.set(action as BOMHistoryAction, count);
      });
      
      return map;
    } catch (error) {
      console.error('Failed to get action statistics:', error);
      return new Map();
    }
  }

  async getMostChangedFields(limit: number = 10): Promise<Map<string, number>> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      
      const response = await this.apiClient.get<Record<string, number>>(`/api/bom-histories/statistics/changed-fields?${params}`);
      if (!response.success) {
        throw new Error('Failed to get most changed fields');
      }
      
      return new Map(Object.entries(response.data));
    } catch (error) {
      console.error('Failed to get most changed fields:', error);
      return new Map();
    }
  }

  async getBOMChangeFrequency(): Promise<Map<string, number>> {
    try {
      const response = await this.apiClient.get<Record<string, number>>('/api/bom-histories/statistics/bom-frequency');
      if (!response.success) {
        throw new Error('Failed to get BOM change frequency');
      }
      
      return new Map(Object.entries(response.data));
    } catch (error) {
      console.error('Failed to get BOM change frequency:', error);
      return new Map();
    }
  }

  // === 분석 및 인사이트 ===

  async getChangePatternByHour(bomId?: BOMId): Promise<Map<number, number>> {
    try {
      const params = new URLSearchParams();
      if (bomId) {
        params.append('bomId', bomId.getValue());
      }
      
      const response = await this.apiClient.get<Record<string, number>>(`/api/bom-histories/analysis/hourly-pattern?${params}`);
      if (!response.success) {
        throw new Error('Failed to get change pattern by hour');
      }
      
      const map = new Map<number, number>();
      Object.entries(response.data).forEach(([hour, count]) => {
        map.set(parseInt(hour), count);
      });
      
      return map;
    } catch (error) {
      console.error('Failed to get change pattern by hour:', error);
      return new Map();
    }
  }

  async getChangeReasonStatistics(): Promise<Map<string, number>> {
    try {
      const response = await this.apiClient.get<Record<string, number>>('/api/bom-histories/analysis/change-reasons');
      if (!response.success) {
        throw new Error('Failed to get change reason statistics');
      }
      
      return new Map(Object.entries(response.data));
    } catch (error) {
      console.error('Failed to get change reason statistics:', error);
      return new Map();
    }
  }

  async findConsecutiveChanges(withinHours: number = 24): Promise<BOMHistory[]> {
    try {
      const params = new URLSearchParams({ withinHours: withinHours.toString() });
      
      const response = await this.apiClient.get<BOMHistoryDto[]>(`/api/bom-histories/analysis/consecutive-changes?${params}`);
      if (!response.success) {
        throw new Error('Failed to find consecutive changes');
      }
      
      return response.data.map(dto => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Failed to find consecutive changes:', error);
      return [];
    }
  }

  // === 데이터 관리 ===

  async cleanupOldHistories(retentionDays: number): Promise<number> {
    try {
      const params = new URLSearchParams({ retentionDays: retentionDays.toString() });
      
      const response = await this.apiClient.delete<{ deletedCount: number }>(`/api/bom-histories/cleanup?${params}`);
      if (!response.success) {
        throw new Error('Failed to cleanup old histories');
      }
      
      return response.data.deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old histories:', error);
      return 0;
    }
  }

  async archiveHistoriesByBOM(bomId: BOMId): Promise<number> {
    try {
      const response = await this.apiClient.post<{ archivedCount: number }>(`/api/bom-histories/bom/${bomId.getValue()}/archive`);
      if (!response.success) {
        throw new Error('Failed to archive histories');
      }
      
      return response.data.archivedCount;
    } catch (error) {
      console.error('Failed to archive histories:', error);
      return 0;
    }
  }

  async validateHistoryIntegrity(): Promise<{
    totalCount: number;
    orphanedCount: number;
    duplicatedCount: number;
  }> {
    try {
      const response = await this.apiClient.get<{
        totalCount: number;
        orphanedCount: number;
        duplicatedCount: number;
      }>('/api/bom-histories/validate-integrity');
      
      if (!response.success) {
        throw new Error('Failed to validate history integrity');
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to validate history integrity:', error);
      return { totalCount: 0, orphanedCount: 0, duplicatedCount: 0 };
    }
  }

  // === 유틸리티 ===

  async exists(id: string): Promise<boolean> {
    try {
      const response = await this.apiClient.get(`/api/bom-histories/${id}/exists`);
      return response.success;
    } catch (error) {
      return false;
    }
  }

  async existsByBOMId(bomId: BOMId): Promise<boolean> {
    try {
      const response = await this.apiClient.get(`/api/bom-histories/bom/${bomId.getValue()}/exists`);
      return response.success;
    } catch (error) {
      return false;
    }
  }

  // === Private 변환 메서드들 ===

  private mapDtoToEntity(dto: BOMHistoryDto): BOMHistory {
    const bomId = new BOMId(dto.bomId);
    const changedFields = dto.changedFields.map(fieldDto => 
      new ChangedField(fieldDto.fieldName, fieldDto.oldValue, fieldDto.newValue)
    );

    return new BOMHistory(
      dto.id,
      bomId,
      dto.action,
      dto.targetType,
      dto.targetId,
      changedFields,
      dto.userId,
      dto.userName,
      new Date(dto.timestamp),
      dto.reason
    );
  }

  private mapEntityToDto(history: BOMHistory): BOMHistoryDto {
    const changedFieldDtos: ChangedFieldDto[] = history.getChangedFields().map(field => ({
      fieldName: field.fieldName,
      oldValue: field.oldValue,
      newValue: field.newValue
    }));

    return {
      id: history.getId(),
      bomId: history.getBOMId().getValue(),
      action: history.getAction(),
      targetType: history.getTargetType(),
      targetId: history.getTargetId(),
      changedFields: changedFieldDtos,
      userId: history.getUserId(),
      userName: history.getUserName(),
      timestamp: history.getTimestamp().toISOString(),
      reason: history.getReason()
    };
  }
}