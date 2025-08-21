import { ProductHistory, HistoryAction } from '../../domain/entities/ProductHistory';
import { ProductId } from '../../domain/entities/Product';
import { ProductHistoryRepository } from '../../domain/repositories/ProductHistoryRepository';
import { ApiClient } from '@shared/services/api/ApiClient';

interface ProductHistoryDto {
  id: string;
  productId: string;
  action: HistoryAction;
  changedFields: {
    fieldName: string;
    oldValue: any;
    newValue: any;
  };
  userId: string;
  userName: string;
  timestamp: string;
  reason?: string;
}

export class HttpProductHistoryRepository implements ProductHistoryRepository {
  constructor(private apiClient: ApiClient) {}

  async findByProductId(productId: ProductId): Promise<ProductHistory[]> {
    try {
      // 백엔드 API 구조에 맞춰 GetProductHistoryResponse 형태로 응답 받기
      const response = await this.apiClient.get<{
        data: ProductHistoryDto[];
        totalCount: number;
        currentPage: number;
        totalPages: number;
        hasNextPage: boolean;
      }>(`/api/products/${productId.getValue()}/history?page=1&pageSize=100`);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch product history');
      }

      // API 응답 데이터 검증
      if (!response.data || !response.data.data) {
        console.warn('No data received from API, returning empty array');
        return [];
      }

      // 데이터 배열 확인
      if (!Array.isArray(response.data.data)) {
        console.warn('API response data.data is not an array:', response.data.data);
        return [];
      }

      return response.data.data.map((dto) => this.mapDtoToEntity(dto, productId));
    } catch (error) {
      console.error('Error fetching product history:', error);
      
      // 네트워크 오류나 서버 오류인 경우 빈 배열 반환
      if (error instanceof Error && (
        error.message.includes('Network Error') || 
        error.message.includes('404') ||
        error.message.includes('ECONNREFUSED')
      )) {
        console.warn('API server not available, returning empty history');
        return [];
      }
      
      throw new Error('Failed to fetch product history from server');
    }
  }

  async save(history: ProductHistory): Promise<void> {
    try {
      const dto = this.mapEntityToDto(history);
      
      const response = await this.apiClient.post('/api/product-history', dto);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to save product history');
      }
    } catch (error) {
      console.error('Error saving product history:', error);
      throw new Error('Failed to save product history to server');
    }
  }

  private mapDtoToEntity(dto: ProductHistoryDto, productId: ProductId): ProductHistory {
    const changedFields = {
      fieldName: dto.changedFields.fieldName,
      oldValue: dto.changedFields.oldValue,
      newValue: dto.changedFields.newValue
    };

    return new ProductHistory(
      dto.id,
      productId,
      dto.action,
      changedFields,
      dto.userId,
      dto.userName,
      new Date(dto.timestamp),
      dto.reason
    );
  }

  private mapEntityToDto(history: ProductHistory): ProductHistoryDto {
    const changedFields = history.getChangedFields();
    
    return {
      id: history.getId(),
      productId: history.getProductId().getValue(),
      action: history.getAction(),
      changedFields: {
        fieldName: changedFields.fieldName,
        oldValue: changedFields.oldValue,
        newValue: changedFields.newValue,
      },
      userId: history.getUserId(),
      userName: history.getUserName(),
      timestamp: history.getTimestamp().toISOString(),
      reason: history.getReason(),
    };
  }
}