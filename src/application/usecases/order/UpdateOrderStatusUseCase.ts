/**
 * UpdateOrderStatusUseCase 수주 상태 변경 유스케이스
 * 
 * 수주 상태를 변경하고 이력을 기록합니다. (확정, 취소, 출하 등)
 */

import { OrderRepository } from '../../../domain/repositories/OrderRepository';
import { OrderHistoryRepository } from '../../../domain/repositories/OrderHistoryRepository';
import { OrderId, OrderStatus } from '../../../domain/entities/Order';
import { OrderHistory, OrderHistoryAction, ChangedField } from '../../../domain/entities/OrderHistory';

export interface UpdateOrderStatusRequest {
  orderId: string;
  newStatus: OrderStatus;
  id_updated: string; // 상태 변경자 ID
  reason?: string;
}

export interface UpdateOrderStatusResponse {
  success: boolean;
  message: string;
}

export class UpdateOrderStatusUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private orderHistoryRepository: OrderHistoryRepository
  ) {}

  async execute(request: UpdateOrderStatusRequest): Promise<UpdateOrderStatusResponse> {
    // 1. 수주 존재 확인
    const order = await this.orderRepository.findById(
      new OrderId(request.orderId)
    );
    if (!order) {
      throw new Error("존재하지 않는 수주입니다.");
    }

    // 2. 상태 변경 가능성 검증
    this.validateStatusChange(order.getStatus(), request.newStatus);

    // 3. 비즈니스 규칙별 추가 검증
    await this.validateBusinessRules(order, request.newStatus);

    // 4. 수주 상태 변경
    const updatedOrder = order.changeStatus(request.newStatus, request.reason);

    // 5. 저장
    await this.orderRepository.save(updatedOrder);

    // 6. 이력 기록
    const historyAction = this.getHistoryAction(request.newStatus);
    const history = new OrderHistory(
      this.generateHistoryId(),
      order.getId(),
      historyAction,
      [new ChangedField("status", order.getStatus(), request.newStatus)],
      request.id_updated,
      request.id_updated, // 실제로는 사용자 정보 조회 필요
      new Date(),
      request.reason || this.getDefaultReasonByStatus(request.newStatus)
    );
    await this.orderHistoryRepository.save(history);

    return {
      success: true,
      message: this.getSuccessMessage(request.newStatus, order.getOrderNo())
    };
  }

  private validateStatusChange(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    // Order 엔티티의 validateStatusTransition을 사용할 수도 있지만,
    // UseCase 레벨에서 추가적인 검증을 수행
    if (currentStatus === newStatus) {
      throw new Error("동일한 상태로 변경할 수 없습니다.");
    }
  }

  private async validateBusinessRules(order: any, newStatus: OrderStatus): Promise<void> {
    switch (newStatus) {
      case OrderStatus.CONFIRMED:
        if (!order.canBeConfirmed()) {
          throw new Error("승인할 수 없는 수주입니다.");
        }
        break;

      case OrderStatus.CANCELLED:
        if (!order.canBeCancelled()) {
          throw new Error("취소할 수 없는 수주입니다.");
        }
        break;

      case OrderStatus.SHIPPED:
        if (!order.canBeShipped()) {
          throw new Error("출하할 수 없는 수주입니다.");
        }
        break;

      default:
        // 기타 상태는 기본 검증만
        break;
    }
  }

  private getHistoryAction(status: OrderStatus): OrderHistoryAction {
    switch (status) {
      case OrderStatus.CONFIRMED:
        return OrderHistoryAction.CONFIRM;
      case OrderStatus.CANCELLED:
        return OrderHistoryAction.CANCEL;
      case OrderStatus.IN_PRODUCTION:
        return OrderHistoryAction.START_PRODUCTION;
      case OrderStatus.SHIPPED:
        return OrderHistoryAction.SHIP;
      case OrderStatus.DELIVERED:
        return OrderHistoryAction.DELIVER;
      default:
        return OrderHistoryAction.UPDATE;
    }
  }

  private getDefaultReasonByStatus(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.CONFIRMED:
        return "수주 확정";
      case OrderStatus.CANCELLED:
        return "수주 취소";
      case OrderStatus.IN_PRODUCTION:
        return "생산 시작";
      case OrderStatus.SHIPPED:
        return "출하 완료";
      case OrderStatus.DELIVERED:
        return "납품 완료";
      default:
        return "상태 변경";
    }
  }

  private getSuccessMessage(status: OrderStatus, orderNo: string): string {
    switch (status) {
      case OrderStatus.CONFIRMED:
        return `수주 '${orderNo}'이(가) 확정되었습니다.`;
      case OrderStatus.CANCELLED:
        return `수주 '${orderNo}'이(가) 취소되었습니다.`;
      case OrderStatus.SHIPPED:
        return `수주 '${orderNo}'이(가) 출하되었습니다.`;
      case OrderStatus.DELIVERED:
        return `수주 '${orderNo}'이(가) 납품 완료되었습니다.`;
      default:
        return `수주 '${orderNo}'의 상태가 변경되었습니다.`;
    }
  }

  private generateHistoryId(): string {
    return "HIST-" + Date.now().toString() + "-" + Math.random().toString(36).substr(2, 5);
  }
}