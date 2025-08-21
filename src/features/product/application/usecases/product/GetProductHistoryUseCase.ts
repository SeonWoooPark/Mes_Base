import { ProductId } from '../../../domain/entities/Product';
import { ProductHistoryRepository } from '../../../domain/repositories/ProductHistoryRepository';

export interface GetProductHistoryRequest {
  productId: string;
}

export interface ProductHistoryItem {
  id: string;
  action: string;
  actionName: string;
  changedFields: {
    fieldName: string;
    oldValue: any;
    newValue: any;
  };
  userId: string;
  userName: string;
  timestamp: Date;
  reason?: string;
}

export interface GetProductHistoryResponse {
  histories: ProductHistoryItem[];
}

export class GetProductHistoryUseCase {
  constructor(
    private productHistoryRepository: ProductHistoryRepository
  ) {}

  async execute(request: GetProductHistoryRequest): Promise<GetProductHistoryResponse> {
    const productId = new ProductId(request.productId);
    const histories = await this.productHistoryRepository.findByProductId(productId);

    const historyItems = histories.map(history => ({
      id: history.getId(),
      action: history.getAction(),
      actionName: this.getActionDisplayName(history.getAction()),
      changedFields: {
        fieldName: history.getChangedFields().fieldName,
        oldValue: history.getChangedFields().oldValue,
        newValue: history.getChangedFields().newValue
      },
      userId: history.getUserId(),
      userName: history.getUserName(),
      timestamp: history.getTimestamp(),
      reason: history.getReason()
    }));

    return {
      histories: historyItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    };
  }

  private getActionDisplayName(action: string): string {
    switch (action) {
      case 'CREATE':
        return '등록';
      case 'UPDATE':
        return '수정';
      case 'DELETE':
        return '삭제';
      case 'ACTIVATE':
        return '활성화';
      case 'DEACTIVATE':
        return '비활성화';
      default:
        return action;
    }
  }
}