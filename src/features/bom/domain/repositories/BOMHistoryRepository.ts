// 외부 엔티티 import
import { BOMHistory, BOMHistoryAction } from '../entities/BOMHistory';
import { BOMId } from '../entities/BOMItem';

/**
 * BOM 이력 검색 조건 인터페이스
 * 다양한 기준으로 변경 이력을 검색
 */
export interface BOMHistorySearchCriteria {
  bomIds?: BOMId[];                    // 특정 BOM들의 이력
  actions?: BOMHistoryAction[];        // 특정 액션들만 조회
  userIds?: string[];                  // 특정 사용자들의 변경 이력
  targetTypes?: ('BOM' | 'BOM_ITEM')[]; // 변경 대상 타입 필터
  dateRange?: {                        // 날짜 범위
    startDate: Date;
    endDate: Date;
  };
  criticalOnly?: boolean;              // 중요한 변경사항만 조회
  hasReason?: boolean;                 // 변경 사유가 있는 이력만 조회
  changedFields?: string[];            // 특정 필드가 변경된 이력만 조회
}

/**
 * 이력 집계 옵션
 */
export interface HistoryAggregationOptions {
  groupBy: 'date' | 'user' | 'action' | 'bom';  // 집계 기준
  period?: 'day' | 'week' | 'month';             // 날짜 집계 시 기간
  limit?: number;                                // 집계 결과 제한
  sortByCount?: boolean;                         // 개수로 정렬 여부
}

/**
 * 이력 집계 결과
 */
export interface HistoryAggregationResult {
  key: string;                         // 집계 키 (날짜, 사용자 ID 등)
  count: number;                       // 해당 키의 이력 개수
  label?: string;                      // 표시용 레이블
}

/**
 * BOMHistory Repository 인터페이스
 * 
 * 역할:
 * - BOM 변경 이력의 영속성 관리
 * - 감사 추적(Audit Trail) 기능 제공
 * - 변경사항 분석 및 통계
 * - 이력 검색 및 필터링
 * 
 * 감사 추적 특성:
 * - 모든 변경사항 기록
 * - 삭제된 데이터도 이력 보존
 * - 사용자 활동 추적
 * - 변경 패턴 분석
 */
export interface BOMHistoryRepository {
  // === 기본 CRUD 연산 ===
  
  /**
   * BOM 이력 저장
   * @param history 저장할 BOM 이력 엔티티
   */
  save(history: BOMHistory): Promise<void>;

  /**
   * 여러 BOM 이력 일괄 저장
   * @param histories 저장할 BOM 이력 배열
   */
  saveAll(histories: BOMHistory[]): Promise<void>;

  /**
   * 이력 ID로 단건 조회
   * @param id 이력 ID
   * @returns BOM 이력 엔티티 또는 null
   */
  findById(id: string): Promise<BOMHistory | null>;

  /**
   * 여러 이력 ID로 다건 조회
   * @param ids 이력 ID 배열
   * @returns BOM 이력 엔티티 배열
   */
  findByIds(ids: string[]): Promise<BOMHistory[]>;

  // === BOM 기반 조회 ===

  /**
   * 특정 BOM의 모든 이력 조회
   * @param bomId BOM ID
   * @returns 해당 BOM의 모든 변경 이력
   */
  findByBOMId(bomId: BOMId): Promise<BOMHistory[]>;

  /**
   * 여러 BOM의 이력 조회
   * @param bomIds BOM ID 배열
   * @returns 해당 BOM들의 변경 이력
   */
  findByBOMIds(bomIds: BOMId[]): Promise<BOMHistory[]>;

  /**
   * 특정 BOM의 최근 이력 조회
   * @param bomId BOM ID
   * @param limit 조회 제한 수 (기본: 10)
   * @returns 최근 변경 이력들
   */
  findRecentByBOMId(bomId: BOMId, limit?: number): Promise<BOMHistory[]>;

  // === 대상별 조회 ===

  /**
   * 특정 대상의 이력 조회 (BOM 또는 BOM Item)
   * @param targetId 대상 ID
   * @returns 해당 대상의 변경 이력
   */
  findByTargetId(targetId: string): Promise<BOMHistory[]>;

  /**
   * 여러 대상의 이력 조회
   * @param targetIds 대상 ID 배열
   * @returns 해당 대상들의 변경 이력
   */
  findByTargetIds(targetIds: string[]): Promise<BOMHistory[]>;

  /**
   * 대상 타입별 이력 조회
   * @param targetType 대상 타입 ('BOM' 또는 'BOM_ITEM')
   * @param bomId BOM ID (선택사항)
   * @returns 해당 타입의 변경 이력들
   */
  findByTargetType(targetType: 'BOM' | 'BOM_ITEM', bomId?: BOMId): Promise<BOMHistory[]>;

  // === 날짜 기반 조회 ===

  /**
   * 날짜 범위로 이력 조회
   * @param startDate 시작일
   * @param endDate 종료일
   * @returns 해당 기간의 변경 이력
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<BOMHistory[]>;

  /**
   * 특정 날짜의 이력 조회
   * @param date 조회 날짜
   * @returns 해당 날짜의 변경 이력
   */
  findByDate(date: Date): Promise<BOMHistory[]>;

  /**
   * 최근 N일간의 이력 조회
   * @param days 조회할 날짜 수
   * @param bomId BOM ID (선택사항)
   * @returns 최근 N일간의 변경 이력
   */
  findRecentDays(days: number, bomId?: BOMId): Promise<BOMHistory[]>;

  // === 사용자 기반 조회 ===

  /**
   * 특정 사용자의 변경 이력 조회
   * @param userId 사용자 ID
   * @returns 해당 사용자의 변경 이력
   */
  findByUserId(userId: string): Promise<BOMHistory[]>;

  /**
   * 여러 사용자의 변경 이력 조회
   * @param userIds 사용자 ID 배열
   * @returns 해당 사용자들의 변경 이력
   */
  findByUserIds(userIds: string[]): Promise<BOMHistory[]>;

  /**
   * 특정 사용자의 최근 활동 조회
   * @param userId 사용자 ID
   * @param limit 조회 제한 수
   * @returns 최근 활동 이력
   */
  findRecentActivityByUser(userId: string, limit?: number): Promise<BOMHistory[]>;

  // === 액션 기반 조회 ===

  /**
   * 특정 액션의 이력 조회
   * @param action BOM 이력 액션
   * @param bomId BOM ID (선택사항)
   * @returns 해당 액션의 변경 이력
   */
  findByAction(action: BOMHistoryAction, bomId?: BOMId): Promise<BOMHistory[]>;

  /**
   * 여러 액션의 이력 조회
   * @param actions BOM 이력 액션 배열
   * @returns 해당 액션들의 변경 이력
   */
  findByActions(actions: BOMHistoryAction[]): Promise<BOMHistory[]>;

  /**
   * 중요한 변경사항만 조회
   * @param bomId BOM ID (선택사항)
   * @returns 중요한 변경 이력들
   */
  findCriticalChanges(bomId?: BOMId): Promise<BOMHistory[]>;

  // === 검색 및 필터링 ===

  /**
   * 검색 조건에 따른 이력 조회 (페이지네이션)
   * @param criteria 검색 조건
   * @param page 페이지 번호
   * @param pageSize 페이지 크기
   * @returns 조건에 맞는 이력들
   */
  findByPageWithCriteria(
    criteria: BOMHistorySearchCriteria,
    page: number,
    pageSize: number
  ): Promise<BOMHistory[]>;

  /**
   * 검색 조건에 해당하는 전체 개수 조회
   * @param criteria 검색 조건
   * @returns 총 개수
   */
  countByCriteria(criteria: BOMHistorySearchCriteria): Promise<number>;

  /**
   * 특정 필드가 변경된 이력 조회
   * @param fieldName 필드명
   * @param bomId BOM ID (선택사항)
   * @returns 해당 필드가 변경된 이력들
   */
  findByChangedField(fieldName: string, bomId?: BOMId): Promise<BOMHistory[]>;

  // === 통계 및 분석 ===

  /**
   * 이력 집계 조회
   * @param options 집계 옵션
   * @returns 집계 결과
   */
  getHistoryAggregation(options: HistoryAggregationOptions): Promise<HistoryAggregationResult[]>;

  /**
   * 사용자별 활동 통계
   * @param startDate 시작일 (선택사항)
   * @param endDate 종료일 (선택사항)
   * @returns 사용자별 활동 개수 맵
   */
  getUserActivityStatistics(startDate?: Date, endDate?: Date): Promise<Map<string, number>>;

  /**
   * 액션별 변경 통계
   * @param bomId BOM ID (선택사항)
   * @returns 액션별 발생 횟수 맵
   */
  getActionStatistics(bomId?: BOMId): Promise<Map<BOMHistoryAction, number>>;

  /**
   * 가장 자주 변경되는 필드들 조회
   * @param limit 조회 제한 수
   * @returns 필드별 변경 횟수 맵
   */
  getMostChangedFields(limit?: number): Promise<Map<string, number>>;

  /**
   * BOM별 변경 빈도 통계
   * @returns BOM ID별 변경 횟수 맵
   */
  getBOMChangeFrequency(): Promise<Map<string, number>>;

  // === 분석 및 인사이트 ===

  /**
   * 변경 패턴 분석 (시간대별)
   * @param bomId BOM ID (선택사항)
   * @returns 시간대별 변경 패턴
   */
  getChangePatternByHour(bomId?: BOMId): Promise<Map<number, number>>;

  /**
   * 변경 이유 분석
   * @returns 변경 이유별 통계
   */
  getChangeReasonStatistics(): Promise<Map<string, number>>;

  /**
   * 연속 변경 감지 (같은 대상을 반복 수정)
   * @param withinHours 시간 범위 (기본: 24시간)
   * @returns 연속 변경된 대상들
   */
  findConsecutiveChanges(withinHours?: number): Promise<BOMHistory[]>;

  // === 데이터 관리 ===

  /**
   * 오래된 이력 정리 (보관 기간 초과)
   * @param retentionDays 보관 일수
   * @returns 삭제된 이력 개수
   */
  cleanupOldHistories(retentionDays: number): Promise<number>;

  /**
   * 특정 BOM의 이력 아카이브
   * @param bomId BOM ID
   * @returns 아카이브된 이력 개수
   */
  archiveHistoriesByBOM(bomId: BOMId): Promise<number>;

  /**
   * 이력 데이터 무결성 검사
   * @returns 무결성 검사 결과
   */
  validateHistoryIntegrity(): Promise<{
    totalCount: number;
    orphanedCount: number;
    duplicatedCount: number;
  }>;

  // === 유틸리티 ===

  /**
   * 이력 존재 여부 확인
   * @param id 이력 ID
   * @returns 존재하면 true
   */
  exists(id: string): Promise<boolean>;

  /**
   * 특정 BOM의 이력 존재 여부 확인
   * @param bomId BOM ID
   * @returns 해당 BOM의 이력이 있으면 true
   */
  existsByBOMId(bomId: BOMId): Promise<boolean>;
}