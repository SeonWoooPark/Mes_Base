import { ProductId } from './Product';

export enum HistoryAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE'
}

export interface ChangedField {
  readonly fieldName: string;
  readonly oldValue: any;
  readonly newValue: any;
}

export class ProductHistory {
  constructor(
    private readonly id: string,
    private readonly productId: ProductId,
    private readonly action: HistoryAction,
    private readonly changedFields: ChangedField,
    private readonly userId: string,
    private readonly userName: string,
    private readonly timestamp: Date,
    private readonly reason?: string
  ) {}

  public getId(): string { return this.id; }
  public getProductId(): ProductId { return this.productId; }
  public getAction(): HistoryAction { return this.action; }
  public getChangedFields(): ChangedField { return this.changedFields; }
  public getUserId(): string { return this.userId; }
  public getUserName(): string { return this.userName; }
  public getTimestamp(): Date { return this.timestamp; }
  public getReason(): string | undefined { return this.reason; }
}