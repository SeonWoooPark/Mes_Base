/**
 * DeleteOrderUseCase 수주 삭제 유스케이스
 * 
 * 수주를 삭제하고 이력을 기록합니다.
 */

import { OrderRepository } from '../../../domain/repositories/OrderRepository';
import { OrderHistoryRepository } from '../../../domain/repositories/OrderHistoryRepository';
import { OrderId } from '../../../domain/entities/Order';
import { OrderHistory, OrderHistoryAction, ChangedField } from '../../../domain/entities/OrderHistory';

export interface DeleteOrderRequest {
  orderId: string;
  id_updated: string;
  reason?: string;
}

export interface DeleteOrderResponse {
  success: boolean;
  message: string;
}

export class DeleteOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private orderHistoryRepository: OrderHistoryRepository
  ) {}

  async execute(request: DeleteOrderRequest): Promise<DeleteOrderResponse> {
    // 1. 수주 존재 확인
    const order = await this.orderRepository.findById(
      new OrderId(request.orderId)
    );
    if (!order) {
      throw new Error("존재하지 않는 수주입니다.");
    }

    // 2. 삭제 가능성 검증
    await this.validateDeletion(order);

    // 3. 이력 기록 (삭제 전에 기록)
    const history = new OrderHistory(
      this.generateHistoryId(),
      order.getId(),
      OrderHistoryAction.DELETE,
      [new ChangedField("isActive", "true", "false")],
      request.id_updated,
      request.id_updated,
      new Date(),
      request.reason || `수주 '${order.getOrderNo()}' 삭제`
    );
    await this.orderHistoryRepository.save(history);

    // 4. 수주 삭제 (논리적 삭제)
    await this.orderRepository.delete(new OrderId(request.orderId));

    return {
      success: true,
      message: `수주 '${order.getOrderNo()}'이(가) 삭제되었습니다.`
    };
  }

  private async validateDeletion(order: any): Promise<void> {
    // 비즈니스 규칙: 생산 중이거나 출하된 수주는 삭제 불가
    if (order.isInProduction()) {
      throw new Error("생산 중인 수주는 삭제할 수 없습니다.");
    }

    if (order.isShipped()) {
      throw new Error("출하된 수주는 삭제할 수 없습니다.");
    }

    if (order.isDelivered()) {
      throw new Error("납품 완료된 수주는 삭제할 수 없습니다.");
    }
  }

  private generateHistoryId(): string {
    return "HIST-" + Date.now().toString() + "-" + Math.random().toString(36).substr(2, 5);
  }
}