/**
 * OrderHistory 수주 이력 도메인 엔티티
 * 
 * 수주의 모든 변경 사항을 추적하고 기록하는 도메인 객체
 */

import { OrderId } from './Order';

export enum OrderHistoryAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',             // 삭제 액션 추가
  CONFIRM = 'CONFIRM',           // 승인 → 확정으로 변경
  CANCEL = 'CANCEL',
  START_PRODUCTION = 'START_PRODUCTION',
  SHIP = 'SHIP',                 // 출하 액션 추가
  DELIVER = 'DELIVER',           // 납품 액션 추가
  COMPLETE = 'COMPLETE'
}

export class ChangedField {
  constructor(
    public readonly fieldName: string,
    public readonly oldValue: any,
    public readonly newValue: any
  ) {}

  public getFieldName(): string { return this.fieldName; }
  public getOldValue(): any { return this.oldValue; }
  public getNewValue(): any { return this.newValue; }
}

export class OrderHistory {
  constructor(
    private readonly id: string,
    private readonly orderId: OrderId,
    private readonly action: OrderHistoryAction,
    private readonly changedFields: ChangedField[],
    private readonly userId: string,
    private readonly userName: string,
    private readonly timestamp: Date,
    private readonly reason?: string
  ) {}

  public getId(): string { return this.id; }
  public getOrderId(): OrderId { return this.orderId; }
  public getAction(): OrderHistoryAction { return this.action; }
  public getChangedFields(): ChangedField[] { return this.changedFields; }
  public getUserId(): string { return this.userId; }
  public getUserName(): string { return this.userName; }
  public getTimestamp(): Date { return this.timestamp; }
  public getReason(): string | undefined { return this.reason; }
  
  // 추가 메서드들
  public getIdUpdated(): string { return this.userId; }
  public getDtCreated(): Date { return this.timestamp; }
}