// 외부 엔티티 import  
import { ProductId, Unit } from './Product';

/**
 * BOM ID 값 객체 (Value Object) - BOMItem에서 사용
 */
export class BOMId {
  constructor(private readonly value: string) {
    if (!value || value.length === 0) {
      throw new Error('BOM ID는 필수입니다.');
    }
  }
  
  public getValue(): string { return this.value; }
  
  public equals(other: BOMId): boolean {
    return this.value === other.value;
  }
}

/**
 * BOM Item ID 값 객체 (Value Object)
 * 
 * 역할:
 * - BOM Item의 고유 식별자를 캡슐화
 * - 불변성 보장 및 유효성 검증
 * - 타입 안전성 제공
 */
export class BOMItemId {
  constructor(private readonly value: string) {
    if (!value || value.length === 0) {
      throw new Error('BOM Item ID는 필수입니다.');
    }
  }
  
  public getValue(): string { return this.value; }
  
  public equals(other: BOMItemId): boolean {
    return this.value === other.value;
  }
}

/**
 * 구성품 유형 열거형
 * BOM에서 사용되는 구성품 분류 기준
 */
export enum ComponentType {
  RAW_MATERIAL = 'RAW_MATERIAL',      // 원자재
  SEMI_FINISHED = 'SEMI_FINISHED',    // 반제품
  PURCHASED_PART = 'PURCHASED_PART',  // 구매품
  SUB_ASSEMBLY = 'SUB_ASSEMBLY',      // 조립품
  CONSUMABLE = 'CONSUMABLE'           // 소모품
}

/**
 * BOMItem 도메인 엔티티
 * 
 * 워크플로우:
 * 1. 생성 시 모든 비즈니스 규칙 검증 (validateBOMItem)
 * 2. 트리 구조 관리 (parentItemId, level)
 * 3. 수량 및 비용 계산 로직 제공
 * 4. 불변성 보장으로 데이터 무결성 유지
 * 
 * 비즈니스 규칙:
 * - 구성품은 필수
 * - 레벨은 0 이상
 * - 소요량은 0보다 커야 함
 * - 스크랩률은 0-100% 범위
 * - 단가는 0 이상
 */
export class BOMItem {
  constructor(
    private readonly id: BOMItemId,        // BOM Item 고유 ID
    private readonly bomId: BOMId,         // 소속 BOM ID
    private readonly componentId: ProductId, // 구성품 제품 ID
    private readonly parentItemId: BOMItemId | undefined, // 상위 구성품 ID (트리 구조)
    private readonly level: number,        // 트리 레벨 (0: 최상위)
    private readonly sequence: number,     // 동일 레벨 내 순서
    private readonly quantity: number,     // 소요량
    private readonly unit: Unit,          // 단위 (EA, KG 등)
    private readonly unitCost: number,    // 단가
    private readonly scrapRate: number,   // 스크랩률 (%)
    private readonly isOptional: boolean, // 선택사항 여부
    private readonly componentType: ComponentType, // 구성품 유형
    private readonly effectiveDate: Date,  // 적용일
    private readonly id_create: string,    // 생성자 ID
    private readonly id_updated: string,   // 최종 수정자 ID
    private readonly dt_create: Date,      // 생성일시
    private readonly dt_update: Date,      // 최종 수정일시
    private readonly position?: string,    // 조립 위치 (예: "상단좌측", "PCB-U1")
    private readonly processStep?: string, // 투입 공정 (예: "SMT", "조립", "검사")
    private readonly remarks?: string,     // 비고 (특별 지시사항, 주의사항)
    private readonly expiryDate?: Date     // 만료일
  ) {
    this.validateBOMItem(); // 생성 시 비즈니스 규칙 검증
  }

  /**
   * BOM 아이템 생성 시 비즈니스 규칙 검증
   * - 필수 필드 체크
   * - 데이터 범위 검증
   * - 수치 유효성 검증
   */
  private validateBOMItem(): void {
    if (!this.componentId) {
      throw new Error('구성품은 필수입니다.');
    }
    if (this.level < 0) {
      throw new Error('레벨은 0 이상이어야 합니다.');
    }
    if (this.quantity <= 0) {
      throw new Error('소요량은 0보다 커야 합니다.');
    }
    if (this.scrapRate < 0 || this.scrapRate > 100) {
      throw new Error('스크랩률은 0-100% 범위여야 합니다.');
    }
    if (this.unitCost < 0) {
      throw new Error('단가는 0 이상이어야 합니다.');
    }
  }

  // === 비즈니스 로직 메서드들 ===

  /**
   * 스크랩을 고려한 실제 소요량 계산
   * @returns 스크랩률을 적용한 실제 필요 수량
   */
  public getActualQuantity(): number {
    return this.quantity * (1 + this.scrapRate / 100);
  }

  /**
   * 총 비용 계산 (스크랩 포함)
   * @returns 실제 소요량 * 단가
   */
  public getTotalCost(): number {
    return this.getActualQuantity() * this.unitCost;
  }

  /**
   * 현재 활성 여부 확인 (유효기간 내)
   * @returns 유효기간 내이면 true
   */
  public isCurrentlyActive(): boolean {
    const now = new Date();
    return this.effectiveDate <= now && 
           (!this.expiryDate || this.expiryDate > now);
  }

  /**
   * 최상위 구성품 여부 확인
   * @returns 레벨이 0이고 부모가 없으면 true
   */
  public isTopLevel(): boolean {
    return this.level === 0 && !this.parentItemId;
  }

  /**
   * 하위 구성품 여부 확인
   * @returns 레벨이 0보다 크고 부모가 있으면 true
   */
  public isSubComponent(): boolean {
    return this.level > 0 && !!this.parentItemId;
  }

  /**
   * 중요 구성품 여부 판단 (비즈니스 로직)
   * @returns 비용이 높거나 필수 구성품이면 true
   */
  public isCriticalComponent(): boolean {
    return this.getTotalCost() > 10000 || !this.isOptional;
  }

  /**
   * 공정별 구성품 여부 확인
   * @param targetProcess 확인할 공정명
   * @returns 지정된 공정에 투입되는 구성품이면 true
   */
  public isUsedInProcess(targetProcess: string): boolean {
    return this.processStep === targetProcess;
  }

  // === Getter 메서드들 (불변성 보장) ===
  public getId(): BOMItemId { return this.id; }
  public getBOMId(): BOMId { return this.bomId; }
  public getComponentId(): ProductId { return this.componentId; }
  public getParentItemId(): BOMItemId | undefined { return this.parentItemId; }
  public getLevel(): number { return this.level; }
  public getSequence(): number { return this.sequence; }
  public getQuantity(): number { return this.quantity; }
  public getUnit(): Unit { return this.unit; }
  public getUnitCost(): number { return this.unitCost; }
  public getScrapRate(): number { return this.scrapRate; }
  public getIsOptional(): boolean { return this.isOptional; }
  public getComponentType(): ComponentType { return this.componentType; }
  public getPosition(): string | undefined { return this.position; }
  public getProcessStep(): string | undefined { return this.processStep; }
  public getRemarks(): string | undefined { return this.remarks; }
  public getEffectiveDate(): Date { return this.effectiveDate; }
  public getExpiryDate(): Date | undefined { return this.expiryDate; }
  public getIdCreate(): string { return this.id_create; }
  public getIdUpdated(): string { return this.id_updated; }
  public getDtCreate(): Date { return this.dt_create; }
  public getDtUpdate(): Date { return this.dt_update; }
}