/**
 * BOM History Mock Repository 구현체
 * 
 * 워크플로우:
 * 1. 메모리 내 BOM 이력 데이터 관리
 * 2. 변경 추적 및 감사 로그 제공
 * 3. 복잡한 이력 검색 및 필터링
 * 4. 시계열 데이터 처리 및 집계
 * 5. 이력 보고서 생성 지원
 * 
 * 특징:
 * - 완전한 감사 추적 기능
 * - 시간 범위별 이력 조회
 * - 사용자별, 액션별 필터링
 * - 변경 통계 및 분석 데이터 제공
 * - 대용량 이력 데이터 효율적 처리
 */

import { BOMHistoryRepository } from '../../domain/repositories/BOMHistoryRepository';
import { BOMHistory, BOMHistoryAction } from '../../domain/entities/BOMHistory';
import { BOMId } from '../../domain/entities/BOMItem';

export class MockBOMHistoryRepository implements BOMHistoryRepository {

  /**
   * 네트워크 지연 시뮬레이션
   */
  private async simulateDelay(ms: number = 200): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * BOM 이력 저장
   */
  async save(history: BOMHistory): Promise<void> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    try {
      MockBOMData.addBOMHistory(history);
    } catch (error) {
      throw new Error(`BOM 이력 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * ID로 BOM 이력 조회
   */
  async findById(id: string): Promise<BOMHistory | null> {
    await this.simulateDelay(150);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    const history = MockBOMData.getBOMHistories().find(h => h.getId() === id);
    return history || null;
  }

  /**
   * BOM ID로 모든 이력 조회
   */
  async findByBOMId(bomId: BOMId): Promise<BOMHistory[]> {
    await this.simulateDelay(250);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    return MockBOMData.getBOMHistories()
      .filter(history => history.getBOMId().equals(bomId))
      .sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 페이징된 이력 조회
   */
  async findByPage(
    page: number,
    size: number,
    sortBy: string = 'timestamp',
    sortOrder: 'ASC' | 'DESC' = 'DESC'
  ): Promise<BOMHistory[]> {
    await this.simulateDelay(400);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    let histories = MockBOMData.getBOMHistories();

    // 정렬 적용
    histories = this.applySorting(histories, sortBy, sortOrder);

    // 페이징 적용
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;

    return histories.slice(startIndex, endIndex);
  }

  /**
   * 검색 조건으로 이력 조회
   */
  async findWithCriteria(
    bomId?: BOMId,
    action?: BOMHistoryAction,
    userId?: string,
    fromDate?: Date,
    toDate?: Date,
    targetType?: 'BOM' | 'BOM_ITEM' | 'BOM_COMPARISON'
  ): Promise<BOMHistory[]> {
    await this.simulateDelay(350);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    let histories = MockBOMData.getBOMHistories();

    // BOM ID 필터
    if (bomId) {
      histories = histories.filter(h => h.getBOMId().equals(bomId));
    }

    // 액션 필터
    if (action) {
      histories = histories.filter(h => h.getAction() === action);
    }

    // 사용자 필터
    if (userId) {
      histories = histories.filter(h => h.getUserId() === userId);
    }

    // 대상 타입 필터
    if (targetType) {
      histories = histories.filter(h => h.getTargetType() === targetType);
    }

    // 날짜 범위 필터
    if (fromDate) {
      histories = histories.filter(h => h.getTimestamp() >= fromDate);
    }
    if (toDate) {
      histories = histories.filter(h => h.getTimestamp() <= toDate);
    }

    return histories.sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 사용자별 이력 조회
   */
  async findByUserId(userId: string, limit?: number): Promise<BOMHistory[]> {
    await this.simulateDelay(200);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    let histories = MockBOMData.getBOMHistories()
      .filter(history => history.getUserId() === userId)
      .sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());

    if (limit) {
      histories = histories.slice(0, limit);
    }

    return histories;
  }

  /**
   * 액션별 이력 조회
   */
  async findByAction(action: BOMHistoryAction, bomId?: BOMId): Promise<BOMHistory[]> {
    await this.simulateDelay(200);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    let histories = MockBOMData.getBOMHistories()
      .filter(history => history.getAction() === action);

    // BOM ID 필터 적용
    if (bomId) {
      histories = histories.filter(history => history.getBOMId().equals(bomId));
    }

    return histories.sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 최근 이력 조회
   */
  async findRecent(limit: number = 50): Promise<BOMHistory[]> {
    await this.simulateDelay(200);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    return MockBOMData.getBOMHistories()
      .sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime())
      .slice(0, limit);
  }

  /**
   * 특정 기간 내 이력 조회
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<BOMHistory[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    return MockBOMData.getBOMHistories()
      .filter(history => {
        const timestamp = history.getTimestamp();
        return timestamp >= startDate && timestamp <= endDate;
      })
      .sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 이력 개수 조회
   */
  async count(): Promise<number> {
    await this.simulateDelay(100);

    const { MockBOMData } = await import('../data/MockBOMData');
    return MockBOMData.getBOMHistories().length;
  }

  /**
   * 조건별 이력 개수 조회
   */
  async countWithCriteria(
    bomId?: BOMId,
    action?: BOMHistoryAction,
    userId?: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<number> {
    const histories = await this.findWithCriteria(bomId, action, userId, fromDate, toDate);
    return histories.length;
  }

  /**
   * BOM ID별 이력 개수 조회
   */
  async countByBOMId(bomId: BOMId): Promise<number> {
    await this.simulateDelay(100);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    return MockBOMData.getBOMHistories()
      .filter(history => history.getBOMId().equals(bomId)).length;
  }

  /**
   * 사용자별 이력 개수 조회
   */
  async countByUserId(userId: string): Promise<number> {
    await this.simulateDelay(100);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    return MockBOMData.getBOMHistories()
      .filter(history => history.getUserId() === userId).length;
  }

  /**
   * 액션별 이력 개수 조회
   */
  async countByAction(action: BOMHistoryAction): Promise<number> {
    await this.simulateDelay(100);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    return MockBOMData.getBOMHistories()
      .filter(history => history.getAction() === action).length;
  }

  /**
   * 오늘의 이력 조회
   */
  async findToday(): Promise<BOMHistory[]> {
    await this.simulateDelay(200);

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return this.findByDateRange(startOfDay, endOfDay);
  }

  /**
   * 이번 주 이력 조회
   */
  async findThisWeek(): Promise<BOMHistory[]> {
    await this.simulateDelay(250);

    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return this.findByDateRange(startOfWeek, endOfWeek);
  }

  /**
   * 이번 달 이력 조회
   */
  async findThisMonth(): Promise<BOMHistory[]> {
    await this.simulateDelay(300);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return this.findByDateRange(startOfMonth, endOfMonth);
  }

  /**
   * 변경 통계 조회
   */
  async getChangeStatistics(
    bomId?: BOMId,
    fromDate?: Date,
    toDate?: Date
  ): Promise<Map<BOMHistoryAction, number>> {
    await this.simulateDelay(300);

    const histories = await this.findWithCriteria(bomId, undefined, undefined, fromDate, toDate);
    const statistics = new Map<BOMHistoryAction, number>();

    // 액션별 카운트
    histories.forEach(history => {
      const action = history.getAction();
      statistics.set(action, (statistics.get(action) || 0) + 1);
    });

    return statistics;
  }


  /**
   * 일별 변경 통계
   */
  async getDailyChangeStatistics(days: number = 30): Promise<Map<string, number>> {
    await this.simulateDelay(400);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    const histories = await this.findByDateRange(startDate, endDate);
    const statistics = new Map<string, number>();

    histories.forEach(history => {
      const dateKey = history.getTimestamp().toISOString().split('T')[0]; // YYYY-MM-DD
      statistics.set(dateKey, (statistics.get(dateKey) || 0) + 1);
    });

    return statistics;
  }

  /**
   * 이력 삭제 (관리자 전용)
   */
  async delete(id: string): Promise<void> {
    await this.simulateDelay(200);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    const historyIndex = MockBOMData.getBOMHistories().findIndex(h => h.getId() === id);
    
    if (historyIndex === -1) {
      throw new Error('삭제할 이력을 찾을 수 없습니다.');
    }

    MockBOMData.removeBOMHistory(historyIndex);
  }

  /**
   * 기간별 이력 삭제 (정리 목적)
   */
  async deleteOlderThan(cutoffDate: Date): Promise<number> {
    await this.simulateDelay(500);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    const historiesToDelete = MockBOMData.getBOMHistories()
      .filter(history => history.getTimestamp() < cutoffDate);

    let deletedCount = 0;
    
    for (const history of historiesToDelete) {
      try {
        await this.delete(history.getId());
        deletedCount++;
      } catch (error) {
        console.warn(`이력 ${history.getId()} 삭제 실패:`, error);
      }
    }

    return deletedCount;
  }

  // === 누락된 메서드들 구현 ===

  /**
   * 이력 일괄 저장
   */
  async saveAll(histories: BOMHistory[]): Promise<void> {
    await this.simulateDelay(500);
    
    for (const history of histories) {
      await this.save(history);
    }
  }

  /**
   * 여러 ID로 이력 조회
   */
  async findByIds(ids: string[]): Promise<BOMHistory[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    return MockBOMData.getBOMHistories()
      .filter(history => ids.includes(history.getId()))
      .sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 여러 BOM ID의 이력 조회
   */
  async findByBOMIds(bomIds: BOMId[]): Promise<BOMHistory[]> {
    await this.simulateDelay(400);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    return MockBOMData.getBOMHistories()
      .filter(history => 
        bomIds.some(bomId => history.getBOMId().equals(bomId))
      )
      .sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * BOM의 최근 이력 조회
   */
  async findRecentByBOMId(bomId: BOMId, limit: number = 10): Promise<BOMHistory[]> {
    const histories = await this.findByBOMId(bomId);
    return histories.slice(0, limit);
  }

  /**
   * 타겟 ID로 이력 조회
   */
  async findByTargetId(targetId: string): Promise<BOMHistory[]> {
    await this.simulateDelay(250);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    return MockBOMData.getBOMHistories()
      .filter(history => history.getTargetId() === targetId)
      .sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 여러 타겟 ID의 이력 조회
   */
  async findByTargetIds(targetIds: string[]): Promise<BOMHistory[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    return MockBOMData.getBOMHistories()
      .filter(history => targetIds.includes(history.getTargetId()))
      .sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 타겟 타입으로 이력 조회
   */
  async findByTargetType(targetType: 'BOM' | 'BOM_ITEM' | 'BOM_COMPARISON', bomId?: BOMId): Promise<BOMHistory[]> {
    await this.simulateDelay(250);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    let histories = MockBOMData.getBOMHistories()
      .filter(history => history.getTargetType() === targetType);

    if (bomId) {
      histories = histories.filter(history => history.getBOMId().equals(bomId));
    }

    return histories.sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 특정 날짜의 이력 조회
   */
  async findByDate(date: Date): Promise<BOMHistory[]> {
    await this.simulateDelay(250);

    const { MockBOMData } = await import('../data/MockBOMData');
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    return MockBOMData.getBOMHistories()
      .filter(history => 
        history.getTimestamp() >= startOfDay && 
        history.getTimestamp() < endOfDay
      )
      .sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 최근 N일간의 이력 조회
   */
  async findRecentDays(days: number, bomId?: BOMId): Promise<BOMHistory[]> {
    await this.simulateDelay(300);

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { MockBOMData } = await import('../data/MockBOMData');
    
    let histories = MockBOMData.getBOMHistories()
      .filter(history => history.getTimestamp() >= cutoffDate);

    if (bomId) {
      histories = histories.filter(history => history.getBOMId().equals(bomId));
    }

    return histories.sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 여러 사용자의 이력 조회
   */
  async findByUserIds(userIds: string[]): Promise<BOMHistory[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    return MockBOMData.getBOMHistories()
      .filter(history => userIds.includes(history.getUserId()))
      .sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 사용자의 최근 활동 조회
   */
  async findRecentActivityByUser(userId: string, limit: number = 10): Promise<BOMHistory[]> {
    const userHistories = await this.findByUserId(userId);
    return userHistories.slice(0, limit);
  }

  /**
   * 여러 액션의 이력 조회
   */
  async findByActions(actions: BOMHistoryAction[]): Promise<BOMHistory[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    return MockBOMData.getBOMHistories()
      .filter(history => actions.includes(history.getAction()))
      .sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 중요한 변경사항 조회
   */
  async findCriticalChanges(bomId?: BOMId): Promise<BOMHistory[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    let histories = MockBOMData.getBOMHistories()
      .filter(history => history.isCriticalChange());

    if (bomId) {
      histories = histories.filter(history => history.getBOMId().equals(bomId));
    }

    return histories.sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 검색 조건으로 이력 조회
   */
  async findByCriteria(criteria: any): Promise<BOMHistory[]> {
    await this.simulateDelay(400);

    const { MockBOMData } = await import('../data/MockBOMData');
    let histories = MockBOMData.getBOMHistories();

    if (criteria.bomId) {
      histories = histories.filter(history => history.getBOMId().equals(criteria.bomId));
    }

    if (criteria.userId) {
      histories = histories.filter(history => history.getUserId() === criteria.userId);
    }

    if (criteria.action) {
      histories = histories.filter(history => history.getAction() === criteria.action);
    }

    if (criteria.targetType) {
      histories = histories.filter(history => history.getTargetType() === criteria.targetType);
    }

    if (criteria.startDate) {
      histories = histories.filter(history => history.getTimestamp() >= criteria.startDate);
    }

    if (criteria.endDate) {
      histories = histories.filter(history => history.getTimestamp() <= criteria.endDate);
    }

    return histories.sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 검색 조건별 개수 조회
   */
  async countByCriteria(criteria: any): Promise<number> {
    const histories = await this.findByCriteria(criteria);
    return histories.length;
  }

  /**
   * 페이징 및 검색 조건으로 이력 조회
   */
  async findByPageWithCriteria(
    criteria: any,
    page: number,
    pageSize: number
  ): Promise<BOMHistory[]> {
    await this.simulateDelay(400);

    const histories = await this.findByCriteria(criteria);

    // 페이징 적용
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return histories.slice(startIndex, endIndex);
  }

  /**
   * 변경된 필드로 이력 조회
   */
  async findByChangedField(fieldName: string, bomId?: BOMId): Promise<BOMHistory[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    let histories = MockBOMData.getBOMHistories()
      .filter(history => 
        history.getChangedFields().some(field => field.fieldName === fieldName)
      );

    if (bomId) {
      histories = histories.filter(history => history.getBOMId().equals(bomId));
    }

    return histories.sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  /**
   * 이력 집계 조회
   */
  async getHistoryAggregation(options: any): Promise<any[]> {
    await this.simulateDelay(400);

    const { MockBOMData } = await import('../data/MockBOMData');
    const histories = MockBOMData.getBOMHistories();

    // 간단한 집계 구현
    const aggregation = new Map();
    
    histories.forEach(history => {
      const key = options.groupBy || 'action';
      const value = key === 'action' ? history.getAction() : 
                   key === 'userId' ? history.getUserId() :
                   key === 'targetType' ? history.getTargetType() : 'unknown';
      
      aggregation.set(value, (aggregation.get(value) || 0) + 1);
    });

    return Array.from(aggregation.entries()).map(([key, count]) => ({ key, count }));
  }

  /**
   * 사용자 활동 통계
   */
  async getUserActivityStatistics(startDate?: Date, endDate?: Date): Promise<Map<string, number>> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../data/MockBOMData');
    let histories = MockBOMData.getBOMHistories();

    if (startDate) {
      histories = histories.filter(h => h.getTimestamp() >= startDate);
    }

    if (endDate) {
      histories = histories.filter(h => h.getTimestamp() <= endDate);
    }

    const stats = new Map<string, number>();
    histories.forEach(history => {
      const userId = history.getUserId();
      stats.set(userId, (stats.get(userId) || 0) + 1);
    });

    return stats;
  }

  /**
   * 액션 통계
   */
  async getActionStatistics(bomId?: BOMId): Promise<Map<BOMHistoryAction, number>> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../data/MockBOMData');
    let histories = MockBOMData.getBOMHistories();

    if (bomId) {
      histories = histories.filter(history => history.getBOMId().equals(bomId));
    }

    const stats = new Map<BOMHistoryAction, number>();
    histories.forEach(history => {
      const action = history.getAction();
      stats.set(action, (stats.get(action) || 0) + 1);
    });

    return stats;
  }

  /**
   * 가장 많이 변경된 필드들 조회
   */
  async getMostChangedFields(limit: number = 10): Promise<Map<string, number>> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../data/MockBOMData');
    const fieldCounts = new Map<string, number>();

    MockBOMData.getBOMHistories().forEach(history => {
      history.getChangedFields().forEach(field => {
        fieldCounts.set(field.fieldName, (fieldCounts.get(field.fieldName) || 0) + 1);
      });
    });

    const sortedEntries = Array.from(fieldCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit);

    return new Map(sortedEntries);
  }

  /**
   * BOM 변경 빈도
   */
  async getBOMChangeFrequency(): Promise<Map<string, number>> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../data/MockBOMData');
    const frequency = new Map<string, number>();

    MockBOMData.getBOMHistories().forEach(history => {
      const bomId = history.getBOMId().getValue();
      frequency.set(bomId, (frequency.get(bomId) || 0) + 1);
    });

    return frequency;
  }

  /**
   * 시간대별 변경 패턴
   */
  async getChangePatternByHour(bomId?: BOMId): Promise<Map<number, number>> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../data/MockBOMData');
    let histories = MockBOMData.getBOMHistories();

    if (bomId) {
      histories = histories.filter(history => history.getBOMId().equals(bomId));
    }

    const pattern = new Map<number, number>();
    
    histories.forEach(history => {
      const hour = history.getTimestamp().getHours();
      pattern.set(hour, (pattern.get(hour) || 0) + 1);
    });

    return pattern;
  }

  /**
   * 변경 사유 통계
   */
  async getChangeReasonStatistics(): Promise<Map<string, number>> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../data/MockBOMData');
    const stats = new Map<string, number>();

    MockBOMData.getBOMHistories().forEach(history => {
      const reason = history.getReason() || '사유 없음';
      stats.set(reason, (stats.get(reason) || 0) + 1);
    });

    return stats;
  }

  /**
   * 연속 변경 조회
   */
  async findConsecutiveChanges(withinHours: number = 1): Promise<BOMHistory[]> {
    await this.simulateDelay(400);

    const { MockBOMData } = await import('../data/MockBOMData');
    const histories = MockBOMData.getBOMHistories()
      .sort((a, b) => a.getTimestamp().getTime() - b.getTimestamp().getTime());

    const consecutive: BOMHistory[] = [];
    const withinMs = withinHours * 60 * 60 * 1000;

    for (let i = 1; i < histories.length; i++) {
      const current = histories[i];
      const previous = histories[i - 1];
      
      if (current.getTimestamp().getTime() - previous.getTimestamp().getTime() <= withinMs) {
        if (!consecutive.includes(previous)) {
          consecutive.push(previous);
        }
        consecutive.push(current);
      }
    }

    return consecutive;
  }

  /**
   * 오래된 이력 정리
   */
  async cleanupOldHistories(retentionDays: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    return this.deleteOlderThan(cutoffDate);
  }

  /**
   * BOM별 이력 아카이브
   */
  async archiveHistoriesByBOM(bomId: BOMId): Promise<number> {
    await this.simulateDelay(400);

    const histories = await this.findByBOMId(bomId);
    // 실제 구현에서는 아카이브 스토리지로 이동하겠지만, Mock에서는 카운트만 반환
    return histories.length;
  }

  /**
   * 이력 무결성 검증
   */
  async validateHistoryIntegrity(): Promise<{
    totalCount: number;
    orphanedCount: number;
    duplicatedCount: number;
  }> {
    await this.simulateDelay(500);

    const { MockBOMData } = await import('../data/MockBOMData');
    const histories = MockBOMData.getBOMHistories();
    
    let orphanedCount = 0;
    let duplicatedCount = 0;

    // 간단한 무결성 검증 시뮬레이션
    const seenIds = new Set<string>();
    
    histories.forEach(history => {
      // 중복 ID 검사
      if (seenIds.has(history.getId())) {
        duplicatedCount++;
      } else {
        seenIds.add(history.getId());
      }

      // 고아 레코드 검사 (BOM이 존재하지 않는 이력)
      const bomExists = MockBOMData.getBOMs().some(bom => 
        bom.getId().equals(history.getBOMId())
      );
      if (!bomExists) {
        orphanedCount++;
      }
    });

    return {
      totalCount: histories.length,
      orphanedCount,
      duplicatedCount
    };
  }

  /**
   * 이력 존재 여부 확인
   */
  async exists(id: string): Promise<boolean> {
    await this.simulateDelay(100);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    return MockBOMData.getBOMHistories().some(history => history.getId() === id);
  }

  /**
   * BOM의 이력 존재 여부 확인
   */
  async existsByBOMId(bomId: BOMId): Promise<boolean> {
    await this.simulateDelay(150);

    const { MockBOMData } = await import('../data/MockBOMData');
    
    return MockBOMData.getBOMHistories().some(history => history.getBOMId().equals(bomId));
  }

  // === Private 유틸리티 메서드들 ===

  /**
   * 정렬 적용
   */
  private applySorting(histories: BOMHistory[], sortBy: string, sortOrder: 'ASC' | 'DESC'): BOMHistory[] {
    return [...histories].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'action':
          aValue = a.getAction();
          bValue = b.getAction();
          break;
        case 'userId':
          aValue = a.getUserId();
          bValue = b.getUserId();
          break;
        case 'userName':
          aValue = a.getUserName();
          bValue = b.getUserName();
          break;
        case 'targetType':
          aValue = a.getTargetType();
          bValue = b.getTargetType();
          break;
        case 'timestamp':
        default:
          aValue = a.getTimestamp().getTime();
          bValue = b.getTimestamp().getTime();
          break;
      }

      if (sortOrder === 'ASC') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }
}