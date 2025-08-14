/**
 * 제품 ID 값 객체 (Value Object)
 * 
 * 역할:
 * - 제품의 고유 식별자를 캡슐화
 * - 불변성 보장 및 유효성 검증
 * - 타입 안전성 제공
 */
export class ProductId {
  constructor(private readonly value: string) {
    if (!value || value.length === 0) {
      throw new Error('Product ID는 필수입니다.');
    }
  }
  
  // 값 반환
  public getValue(): string { return this.value; }
  
  // 동등성 비교
  public equals(other: ProductId): boolean {
    return this.value === other.value;
  }
}

/**
 * 제품 유형 열거형
 * MES 시스템에서 사용되는 제품 분류 기준
 */
export enum ProductType {
  FINISHED_PRODUCT = 'FINISHED_PRODUCT',    // 완제품 - 최종 출고 가능한 제품
  SEMI_FINISHED = 'SEMI_FINISHED',          // 반제품 - 중간 가공 단계의 제품
  RAW_MATERIAL = 'RAW_MATERIAL'             // 원자재 - 생산에 투입되는 기초 재료
}

/**
 * 제품 카테고리 값 객체
 * 제품 분류를 위한 코드-이름 쌍
 */
export class Category {
  constructor(
    public readonly code: string,    // 카테고리 코드 (예: ELEC, MECH)
    public readonly name: string     // 카테고리 명 (예: 전자부품, 기계부품)
  ) {}
}

/**
 * 제품 단위 값 객체
 * 재고 및 수량 관리를 위한 측정 단위
 */
export class Unit {
  constructor(
    public readonly code: string,    // 단위 코드: EA, KG, M, L 등
    public readonly name: string     // 단위 명: 개, 킬로그램, 미터, 리터 등
  ) {}
}

/**
 * 제품 추가 정보 값 객체
 * 제품에 대한 상세 설명 및 커스텀 필드 관리
 */
export class AdditionalInfo {
  constructor(
    public readonly description?: string,           // 제품 설명
    public readonly specifications?: string,        // 제품 사양
    public readonly notes?: string,                 // 비고
    public readonly customFields?: Map<string, any> // 확장 가능한 커스텀 필드
  ) {}
}

/**
 * 제품 도메인 엔티티
 * 
 * 워크플로우:
 * 1. 생성 시 모든 비즈니스 규칙 검증 (validateProduct)
 * 2. 불변성 보장으로 데이터 무결성 유지
 * 3. 비즈니스 메서드로 도메인 로직 캡슐화
 * 
 * 비즈니스 규칙:
 * - 제품코드, 제품명은 필수
 * - 안전재고는 0 이상
 * - 생성자, 수정자 정보 필수
 * - 제품 유형에 따른 생산 가능성 판단
 */
export class Product {
  constructor(
    private readonly id: ProductId,           // 제품 고유 ID
    private readonly cd_material: string,     // 제품코드 (예: MAT001)
    private readonly nm_material: string,     // 제품명
    private readonly type: ProductType,       // 제품 유형 (완제품/반제품/원자재)
    private readonly category: Category,      // 제품 카테고리
    private readonly unit: Unit,             // 단위 (EA, KG 등)
    private readonly safetyStock: number,    // 안전재고 수량
    private readonly isActive: boolean,      // 활성화 상태
    private readonly additionalInfo: AdditionalInfo, // 추가 정보
    private readonly id_create: string,      // 생성자 ID
    private readonly id_updated: string,     // 최종 수정자 ID
    private readonly dt_create: Date,        // 생성일시
    private readonly dt_update: Date         // 최종 수정일시
  ) {
    this.validateProduct(); // 생성 시 비즈니스 규칙 검증
  }

  /**
   * 제품 생성 시 비즈니스 규칙 검증
   * - 필수 필드 체크
   * - 데이터 유효성 검증
   */
  private validateProduct(): void {
    if (!this.cd_material || this.cd_material.trim().length === 0) {
      throw new Error('제품코드는 필수입니다.');
    }
    if (!this.nm_material || this.nm_material.trim().length === 0) {
      throw new Error('제품명은 필수입니다.');
    }
    if (this.safetyStock < 0) {
      throw new Error('안전재고는 0 이상이어야 합니다.');
    }
    if (!this.id_create || this.id_create.trim().length === 0) {
      throw new Error('생성자는 필수입니다.');
    }
    if (!this.id_updated || this.id_updated.trim().length === 0) {
      throw new Error('수정자는 필수입니다.');
    }
  }

  // === 비즈니스 로직 메서드들 ===

  /**
   * 생산 가능 여부 판단
   * @returns 활성화 상태이고 완제품 또는 반제품인 경우 true
   */
  public canBeProduced(): boolean {
    return this.isActive && 
           (this.type === ProductType.FINISHED_PRODUCT || this.type === ProductType.SEMI_FINISHED);
  }

  /**
   * 원자재 여부 확인
   * @returns 제품 유형이 원자재인 경우 true
   */
  public isRawMaterial(): boolean {
    return this.type === ProductType.RAW_MATERIAL;
  }

  /**
   * BOM(Bill of Materials) 보유 가능 여부
   * @returns 완제품 또는 반제품인 경우 true (원자재는 BOM 불가)
   */
  public canHaveBOM(): boolean {
    return this.type === ProductType.FINISHED_PRODUCT || this.type === ProductType.SEMI_FINISHED;
  }

  /**
   * 안전재고 미달 여부 확인
   * @param currentStock 현재 재고 수량
   * @returns 현재 재고가 안전재고보다 적은 경우 true
   */
  public isBelowSafetyStock(currentStock: number): boolean {
    return currentStock < this.safetyStock;
  }

  // === Getter 메서드들 (불변성 보장) ===
  public getId(): ProductId { return this.id; }
  public getCdMaterial(): string { return this.cd_material; }
  public getNmMaterial(): string { return this.nm_material; }
  public getType(): ProductType { return this.type; }
  public getCategory(): Category { return this.category; }
  public getUnit(): Unit { return this.unit; }
  public getSafetyStock(): number { return this.safetyStock; }
  public getIsActive(): boolean { return this.isActive; }
  public getAdditionalInfo(): AdditionalInfo { return this.additionalInfo; }
  public getIdCreate(): string { return this.id_create; }
  public getIdUpdated(): string { return this.id_updated; }
  public getDtCreate(): Date { return this.dt_create; }
  public getDtUpdate(): Date { return this.dt_update; }
}