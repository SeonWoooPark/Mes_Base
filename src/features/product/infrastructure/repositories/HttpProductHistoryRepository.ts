import { ProductHistory, HistoryAction, ChangedField } from '../../domain/entities/ProductHistory';
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
  }[];
  userId: string;
  userName: string;
  timestamp: string;
  reason?: string;
}

export class HttpProductHistoryRepository implements ProductHistoryRepository {
  constructor(private apiClient: ApiClient) {}

  async findByProductId(productId: ProductId): Promise<ProductHistory[]> {
    try {
      const response = await this.apiClient.get<ProductHistoryDto[]>(`/api/products/${productId.getValue()}/history`);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch product history');
      }

      return response.data.map((dto) => this.mapDtoToEntity(dto));
    } catch (error) {
      console.error('Error fetching product history:', error);
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

  private mapDtoToEntity(dto: ProductHistoryDto): ProductHistory {
    const productId = new ProductId(dto.productId);
    const changedFields = dto.changedFields.map(field => 
      new ChangedField(field.fieldName, field.oldValue, field.newValue)
    );

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
    return {
      id: history.getId(),
      productId: history.getProductId().getValue(),
      action: history.getAction(),
      changedFields: history.getChangedFields().map(field => ({
        fieldName: field.fieldName,
        oldValue: field.oldValue,
        newValue: field.newValue,
      })),
      userId: history.getUserId(),
      userName: history.getUserName(),
      timestamp: history.getTimestamp().toISOString(),
      reason: history.getReason(),
    };
  }
}