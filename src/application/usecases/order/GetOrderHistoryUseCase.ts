/**
 * GetOrderHistoryUseCase 수주 이력 조회 유스케이스
 * 
 * 특정 수주의 변경 이력을 조회합니다.
 */

import { OrderHistoryRepository } from '../../../domain/repositories/OrderHistoryRepository';
import { OrderId } from '../../../domain/entities/Order';

export interface GetOrderHistoryRequest {
  orderId: string;
}

export interface OrderHistoryItem {
  id: string;
  action: string;
  actionDisplay: string;
  changedFields: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  reason: string | undefined;
  userId: string;
  userName: string;
  dateTime: Date;
}

export interface GetOrderHistoryResponse {
  histories: OrderHistoryItem[];
  totalCount: number;
}

export class GetOrderHistoryUseCase {
  constructor(
    private orderHistoryRepository: OrderHistoryRepository
  ) {}

  async execute(request: GetOrderHistoryRequest): Promise<GetOrderHistoryResponse> {
    // 1. 입력 검증
    if (!request.orderId) {
      throw new Error("수주 ID는 필수입니다.");
    }

    // 2. 이력 조회
    const histories = await this.orderHistoryRepository.findByOrderId(
      new OrderId(request.orderId)
    );

    // 3. 프레젠테이션 데이터 변환
    const historyItems = histories.map(history => ({
      id: history.getId(),
      action: history.getAction(),
      actionDisplay: this.getActionDisplayName(history.getAction()),
      changedFields: history.getChangedFields().map(field => ({
        field: field.getFieldName(),
        oldValue: field.getOldValue(),
        newValue: field.getNewValue()
      })),
      reason: history.getReason(),
      userId: history.getUserId(),
      userName: history.getUserName(),
      dateTime: history.getTimestamp()
    }));

    // 4. 최신순으로 정렬
    historyItems.sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime());

    return {
      histories: historyItems,
      totalCount: historyItems.length
    };
  }

  private getActionDisplayName(action: string): string {
    const actionMap: Record<string, string> = {
      'CREATE': '생성',
      'UPDATE': '수정',
      'DELETE': '삭제',
      'CONFIRM': '확정',
      'CANCEL': '취소',
      'START_PRODUCTION': '생산시작',
      'SHIP': '출하',
      'DELIVER': '납품'
    };
    return actionMap[action] || action;
  }
}