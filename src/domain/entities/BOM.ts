// Import actual BOMItem type and related types
import { BOMItem, BOMId } from './BOMItem';
import { ProductId } from './Product';

/**
 * BOM 도메인 엔티티
 * 
 * 워크플로우:
 * 1. 생성 시 모든 비즈니스 규칙 검증 (validateBOM)
 * 2. 불변성 보장으로 데이터 무결성 유지
 * 3. 비즈니스 메서드로 도메인 로직 캡슐화
 * 
 * 비즈니스 규칙:
 * - 제품 정보는 필수
 * - BOM 버전은 필수
 * - 적용일은 현재일보다 미래일 수 없음
 * - 만료일은 적용일보다 이후여야 함
 * - 생성자 정보 필수
 */
export class BOM {
  constructor(
    private readonly id: BOMId,           // BOM 고유 ID
    private readonly productId: ProductId, // 제품 ID (외부 참조)
    private readonly version: string,      // BOM 버전 (예: v1.0, v1.1)
    private readonly isActive: boolean,    // 활성화 상태
    private readonly bomItems: BOMItem[], // BOM 구성품 목록
    private readonly effectiveDate: Date,  // BOM 적용 시작일
    private readonly id_create: string,    // 생성자 ID
    private readonly id_updated: string,   // 최종 수정자 ID
    private readonly dt_create: Date,      // 생성일시
    private readonly dt_update: Date,      // 최종 수정일시
    private readonly expiryDate?: Date,    // BOM 만료일 (선택사항)
    private readonly description?: string  // BOM 설명
  ) {
    this.validateBOM(); // 생성 시 비즈니스 규칙 검증
  }

  /**
   * BOM 생성 시 비즈니스 규칙 검증
   * - 필수 필드 체크
   * - 날짜 유효성 검증
   * - 생성자 정보 검증
   */
  private validateBOM(): void {
    if (!this.productId) {
      throw new Error('제품 정보는 필수입니다.');
    }
    if (!this.version || this.version.trim().length === 0) {
      throw new Error('BOM 버전은 필수입니다.');
    }
    if (this.effectiveDate > new Date()) {
      throw new Error('적용일은 현재일보다 미래일 수 없습니다.');
    }
    if (this.expiryDate && this.effectiveDate >= this.expiryDate) {
      throw new Error('만료일은 적용일보다 이후여야 합니다.');
    }
    if (!this.id_create || this.id_create.trim().length === 0) {
      throw new Error('생성자는 필수입니다.');
    }
  }

  // === 비즈니스 로직 메서드들 ===

  /**
   * BOM 현재 활성 여부 확인
   * @returns 활성화 상태이고 유효기간 내인 경우 true
   */
  public isCurrentlyActive(): boolean {
    const now = new Date();
    return this.isActive && 
           this.effectiveDate <= now && 
           (!this.expiryDate || this.expiryDate > now);
  }

  /**
   * BOM 아이템 추가 (비즈니스 규칙 검증)
   * @param item 추가할 BOM 아이템
   */
  public addBOMItem(item: BOMItem): void {
    if (this.hasDuplicateItem(item)) {
      throw new Error('동일한 구성품이 이미 존재합니다.');
    }
    this.bomItems.push(item);
  }

  /**
   * 순환 참조 검사
   * @returns 순환 참조가 있으면 true
   */
  public hasCircularReference(): boolean {
    return this.checkCircularReference(this.productId, new Set());
  }

  /**
   * 재귀적 순환 참조 검사
   * @param currentProductId 현재 검사 중인 제품 ID
   * @param visited 방문한 제품 ID 집합
   * @returns 순환 참조 발견 시 true
   */
  private checkCircularReference(currentProductId: ProductId, visited: Set<string>): boolean {
    if (visited.has(currentProductId.getValue())) {
      return true;
    }
    
    visited.add(currentProductId.getValue());
    
    for (const item of this.bomItems) {
      if (item.getComponentId().equals(currentProductId)) {
        return true;
      }
    }
    
    visited.delete(currentProductId.getValue());
    return false;
  }

  /**
   * 총 원가 계산 (모든 구성품의 총 비용)
   * @returns 계산된 총 원가
   */
  public calculateTotalCost(): number {
    return this.bomItems.reduce((total, item) => {
      return total + (item.getQuantity() * item.getUnitCost());
    }, 0);
  }

  /**
   * 특정 레벨까지의 BOM 전개
   * @param maxLevel 최대 레벨 (0부터 시작)
   * @returns 지정된 레벨까지의 BOM 아이템들
   */
  public expandToLevel(maxLevel: number): BOMItem[] {
    return this.bomItems.filter(item => item.getLevel() <= maxLevel);
  }

  /**
   * 중복 아이템 검사
   * @param newItem 새로 추가할 아이템
   * @returns 중복이면 true
   */
  private hasDuplicateItem(newItem: BOMItem): boolean {
    return this.bomItems.some(existingItem => 
      existingItem.getComponentId().equals(newItem.getComponentId()) &&
      existingItem.getLevel() === newItem.getLevel()
    );
  }

  // === Getter 메서드들 (불변성 보장) ===
  public getId(): BOMId { return this.id; }
  public getProductId(): ProductId { return this.productId; }
  public getVersion(): string { return this.version; }
  public getIsActive(): boolean { return this.isActive; }
  public getBOMItems(): BOMItem[] { return [...this.bomItems]; }
  public getEffectiveDate(): Date { return this.effectiveDate; }
  public getExpiryDate(): Date | undefined { return this.expiryDate; }
  public getDescription(): string | undefined { return this.description; }
  public getIdCreate(): string { return this.id_create; }
  public getIdUpdated(): string { return this.id_updated; }
  public getDtCreate(): Date { return this.dt_create; }
  public getDtUpdate(): Date { return this.dt_update; }
}