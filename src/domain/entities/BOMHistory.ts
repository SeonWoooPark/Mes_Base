// 외부 엔티티 import
import { BOMId } from './BOMItem';

/**
 * BOM 이력 액션 열거형
 * BOM 관련 변경 작업의 종류를 정의
 */
export enum BOMHistoryAction {
  CREATE_BOM = 'CREATE_BOM',       // BOM 생성
  UPDATE_BOM = 'UPDATE_BOM',       // BOM 정보 수정
  DELETE_BOM = 'DELETE_BOM',       // BOM 삭제
  DEACTIVATE_BOM = 'DEACTIVATE_BOM', // BOM 비활성화
  ADD_ITEM = 'ADD_ITEM',           // BOM 아이템 추가
  UPDATE_ITEM = 'UPDATE_ITEM',     // BOM 아이템 수정
  DELETE_ITEM = 'DELETE_ITEM',     // BOM 아이템 삭제
  COPY_BOM = 'COPY_BOM',           // BOM 복사
  COMPARE_BOM = 'COMPARE_BOM',     // BOM 비교
  VERSION_UP = 'VERSION_UP'        // BOM 버전 업그레이드
}

/**
 * 변경 필드 값 객체
 * 개별 필드의 변경 전후 값을 캡슐화
 */
export class ChangedField {
  constructor(
    public readonly fieldName: string,    // 변경된 필드명
    public readonly oldValue: any,        // 변경 전 값
    public readonly newValue: any         // 변경 후 값
  ) {
    this.validateChangedField();
  }

  /**
   * 변경 필드 유효성 검증
   */
  private validateChangedField(): void {
    if (!this.fieldName || this.fieldName.trim().length === 0) {
      throw new Error('필드명은 필수입니다.');
    }
  }

  /**
   * 변경사항 요약 텍스트 생성
   * @returns 사람이 읽기 쉬운 변경사항 설명
   */
  public getChangeDescription(): string {
    if (this.oldValue === undefined || this.oldValue === null) {
      return `${this.fieldName} 추가: ${this.newValue}`;
    }
    if (this.newValue === undefined || this.newValue === null) {
      return `${this.fieldName} 삭제: ${this.oldValue}`;
    }
    return `${this.fieldName} 변경: ${this.oldValue} → ${this.newValue}`;
  }

  /**
   * 중요한 변경사항인지 판단
   * @returns 비즈니스적으로 중요한 변경이면 true
   */
  public isCriticalChange(): boolean {
    const criticalFields = [
      'quantity', 'unitCost', 'componentId', 'isActive', 'version'
    ];
    return criticalFields.includes(this.fieldName);
  }
}

/**
 * BOMHistory 도메인 엔티티
 * 
 * 워크플로우:
 * 1. BOM 또는 BOMItem 변경 시 자동 생성
 * 2. 변경 내용을 상세히 기록 (필드별 before/after)
 * 3. 사용자 정보 및 변경 사유 포함
 * 4. 감사 추적(Audit Trail) 기능 제공
 * 
 * 비즈니스 규칙:
 * - 모든 변경사항은 반드시 이력에 기록
 * - 삭제된 데이터도 이력으로 보존
 * - 사용자 정보 및 타임스탬프 필수
 * - 변경 사유는 중요한 변경 시 필수
 */
export class BOMHistory {
  constructor(
    private readonly id: string,           // 이력 고유 ID
    private readonly bomId: BOMId,         // 관련 BOM ID
    private readonly action: BOMHistoryAction, // 수행된 액션
    private readonly targetType: 'BOM' | 'BOM_ITEM' | 'BOM_COMPARISON', // 변경 대상 타입
    private readonly targetId: string,      // 변경 대상 ID
    private readonly changedFields: ChangedField[], // 변경된 필드들
    private readonly userId: string,       // 변경 수행자 ID
    private readonly userName: string,     // 변경 수행자 명
    private readonly timestamp: Date,      // 변경 시간
    private readonly reason?: string       // 변경 사유 (선택사항)
  ) {
    this.validateBOMHistory();
  }

  /**
   * BOM 이력 생성 시 유효성 검증
   */
  private validateBOMHistory(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('이력 ID는 필수입니다.');
    }
    if (!this.bomId) {
      throw new Error('BOM ID는 필수입니다.');
    }
    if (!this.targetId || this.targetId.trim().length === 0) {
      throw new Error('변경 대상 ID는 필수입니다.');
    }
    if (!this.userId || this.userId.trim().length === 0) {
      throw new Error('사용자 ID는 필수입니다.');
    }
    if (!this.userName || this.userName.trim().length === 0) {
      throw new Error('사용자명은 필수입니다.');
    }
    if (this.timestamp > new Date()) {
      throw new Error('변경 시간이 미래일 수 없습니다.');
    }
  }

  // === 비즈니스 로직 메서드들 ===

  /**
   * 중요한 변경사항인지 판단
   * @returns 비즈니스적으로 중요한 변경이면 true
   */
  public isCriticalChange(): boolean {
    // 삭제나 생성은 항상 중요
    if (this.action === BOMHistoryAction.DELETE_BOM || 
        this.action === BOMHistoryAction.DELETE_ITEM ||
        this.action === BOMHistoryAction.CREATE_BOM) {
      return true;
    }

    // 중요한 필드가 변경된 경우
    return this.changedFields.some(field => field.isCriticalChange());
  }

  /**
   * 변경사항 요약 생성
   * @returns 사람이 읽기 쉬운 변경사항 요약
   */
  public getChangeSummary(): string {
    const actionNames: Record<BOMHistoryAction, string> = {
      [BOMHistoryAction.CREATE_BOM]: 'BOM 생성',
      [BOMHistoryAction.UPDATE_BOM]: 'BOM 정보 수정',
      [BOMHistoryAction.DELETE_BOM]: 'BOM 삭제',
      [BOMHistoryAction.DEACTIVATE_BOM]: 'BOM 비활성화',
      [BOMHistoryAction.ADD_ITEM]: '구성품 추가',
      [BOMHistoryAction.UPDATE_ITEM]: '구성품 수정',
      [BOMHistoryAction.DELETE_ITEM]: '구성품 삭제',
      [BOMHistoryAction.COPY_BOM]: 'BOM 복사',
      [BOMHistoryAction.COMPARE_BOM]: 'BOM 비교',
      [BOMHistoryAction.VERSION_UP]: 'BOM 버전 업그레이드'
    };

    let summary = actionNames[this.action] || this.action;

    if (this.changedFields.length > 0) {
      const fieldChanges = this.changedFields
        .map(field => field.getChangeDescription())
        .join(', ');
      summary += ` (${fieldChanges})`;
    }

    return summary;
  }

  /**
   * 특정 필드의 변경사항 조회
   * @param fieldName 조회할 필드명
   * @returns 해당 필드의 변경사항 또는 undefined
   */
  public getFieldChange(fieldName: string): ChangedField | undefined {
    return this.changedFields.find(field => field.fieldName === fieldName);
  }

  /**
   * 변경된 필드 개수
   * @returns 변경된 필드의 총 개수
   */
  public getChangedFieldCount(): number {
    return this.changedFields.length;
  }

  /**
   * 최근 변경인지 확인 (1시간 내)
   * @returns 1시간 이내 변경이면 true
   */
  public isRecentChange(): boolean {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.timestamp >= oneHourAgo;
  }

  // === Getter 메서드들 (불변성 보장) ===
  public getId(): string { return this.id; }
  public getBOMId(): BOMId { return this.bomId; }
  public getAction(): BOMHistoryAction { return this.action; }
  public getTargetType(): 'BOM' | 'BOM_ITEM' | 'BOM_COMPARISON' { return this.targetType; }
  public getTargetId(): string { return this.targetId; }
  public getChangedFields(): ChangedField[] { return [...this.changedFields]; }
  public getUserId(): string { return this.userId; }
  public getUserName(): string { return this.userName; }
  public getTimestamp(): Date { return this.timestamp; }
  public getReason(): string | undefined { return this.reason; }
}