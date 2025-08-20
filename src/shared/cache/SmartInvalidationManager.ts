/**
 * 지능형 쿼리 무효화 관리자
 * 
 * 데이터 의존성을 기반으로 한 스마트한 캐시 무효화:
 * - 의존성 그래프 기반 연쇄 무효화
 * - 부분 무효화로 성능 최적화
 * - 배치 무효화로 네트워크 요청 최소화
 * - 사용자 행동 패턴 기반 예측적 무효화
 * - 시간 기반 스케줄링 무효화
 */

import { QueryClient } from '@tanstack/react-query';
import { cacheStrategyManager } from './CacheStrategyManager';

/**
 * 무효화 규칙 타입
 */
export interface InvalidationRule {
  id: string;
  trigger: {
    feature: string;
    operation: string;
    condition?: (data: any) => boolean;
  };
  targets: Array<{
    feature: string;
    operation: string;
    params?: Record<string, any>;
    delay?: number; // 지연 무효화 (ms)
    mode: 'immediate' | 'deferred' | 'background';
  }>;
  priority: 'high' | 'medium' | 'low';
  throttle?: number; // 무효화 간격 제한 (ms)
}

/**
 * 무효화 이벤트 타입
 */
export interface InvalidationEvent {
  id: string;
  feature: string;
  operation: string;
  data?: any;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * 배치 무효화 타입
 */
export interface BatchInvalidation {
  id: string;
  events: InvalidationEvent[];
  scheduledAt: Date;
  executedAt?: Date;
  targets: Set<string>; // 무효화 대상 쿼리 키들
}

/**
 * 사용자 행동 패턴 타입
 */
export interface UserBehaviorPattern {
  userId: string;
  commonSequences: Array<{
    sequence: string[]; // 연속된 작업들
    frequency: number;
    lastOccurrence: Date;
  }>;
  peakTimes: Array<{
    hour: number;
    frequency: number;
  }>;
  preferredFeatures: string[];
}

/**
 * 지능형 무효화 관리자 클래스
 */
export class SmartInvalidationManager {
  private static instance: SmartInvalidationManager;
  private queryClient: QueryClient | null = null;
  private invalidationRules: Map<string, InvalidationRule> = new Map();
  private eventHistory: InvalidationEvent[] = [];
  private pendingBatches: Map<string, BatchInvalidation> = new Map();
  private userPatterns: Map<string, UserBehaviorPattern> = new Map();
  private throttleTracker: Map<string, number> = new Map();

  private readonly BATCH_DELAY = 100; // 100ms 배치 지연
  private readonly MAX_BATCH_SIZE = 50; // 최대 배치 크기
  private readonly HISTORY_RETENTION = 24 * 60 * 60 * 1000; // 24시간

  private constructor() {
    this.initializeDefaultRules();
    this.setupBatchProcessor();
    this.setupHistoryCleanup();
  }

  /**
   * 싱글톤 인스턴스 획득
   */
  public static getInstance(): SmartInvalidationManager {
    if (!SmartInvalidationManager.instance) {
      SmartInvalidationManager.instance = new SmartInvalidationManager();
    }
    return SmartInvalidationManager.instance;
  }

  /**
   * QueryClient 설정
   */
  public setQueryClient(queryClient: QueryClient): void {
    this.queryClient = queryClient;
  }

  /**
   * 기본 무효화 규칙 초기화
   */
  private initializeDefaultRules(): void {
    // Product 관련 규칙
    this.addRule({
      id: 'product-crud-invalidation',
      trigger: { feature: 'product', operation: 'create' },
      targets: [
        { feature: 'product', operation: 'list', mode: 'immediate' },
        { feature: 'product', operation: 'search', mode: 'immediate' },
      ],
      priority: 'high',
    });

    this.addRule({
      id: 'product-update-invalidation',
      trigger: { feature: 'product', operation: 'update' },
      targets: [
        { feature: 'product', operation: 'detail', mode: 'immediate' },
        { feature: 'product', operation: 'list', mode: 'deferred', delay: 1000 },
        { feature: 'bom', operation: 'tree', mode: 'background', delay: 2000 },
      ],
      priority: 'high',
      throttle: 5000, // 5초간 중복 무효화 방지
    });

    // BOM 관련 규칙
    this.addRule({
      id: 'bom-item-mutations',
      trigger: { feature: 'bom', operation: 'addItem' },
      targets: [
        { feature: 'bom', operation: 'tree', mode: 'immediate' },
        { feature: 'bom', operation: 'compare', mode: 'background', delay: 3000 },
        { feature: 'product', operation: 'detail', mode: 'deferred', delay: 1500 },
      ],
      priority: 'high',
    });

    this.addRule({
      id: 'bom-structure-change',
      trigger: { 
        feature: 'bom', 
        operation: 'updateItem',
        condition: (data) => data?.structuralChange === true
      },
      targets: [
        { feature: 'bom', operation: 'tree', mode: 'immediate' },
        { feature: 'bom', operation: 'compare', mode: 'immediate' },
        { feature: 'bom', operation: 'statistics', mode: 'background', delay: 2000 },
      ],
      priority: 'high',
    });

    // 연관 데이터 무효화 규칙
    this.addRule({
      id: 'cross-feature-invalidation',
      trigger: { feature: 'product', operation: 'delete' },
      targets: [
        { feature: 'product', operation: 'list', mode: 'immediate' },
        { feature: 'bom', operation: 'tree', mode: 'immediate' },
        { feature: 'bom', operation: 'compare', mode: 'immediate' },
      ],
      priority: 'high',
    });
  }

  /**
   * 무효화 규칙 추가
   */
  public addRule(rule: InvalidationRule): void {
    this.invalidationRules.set(rule.id, rule);
  }

  /**
   * 무효화 규칙 제거
   */
  public removeRule(ruleId: string): void {
    this.invalidationRules.delete(ruleId);
  }

  /**
   * 무효화 이벤트 트리거
   */
  public triggerInvalidation(event: Omit<InvalidationEvent, 'id' | 'timestamp'>): void {
    const invalidationEvent: InvalidationEvent = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event,
    };

    // 이벤트 기록
    this.recordEvent(invalidationEvent);

    // 적용 가능한 규칙들 찾기
    const applicableRules = this.findApplicableRules(invalidationEvent);

    // 배치로 처리
    this.processBatch(invalidationEvent, applicableRules);

    // 사용자 패턴 업데이트
    if (event.userId) {
      this.updateUserPattern(event.userId, event.feature, event.operation);
    }
  }

  /**
   * 적용 가능한 규칙 찾기
   */
  private findApplicableRules(event: InvalidationEvent): InvalidationRule[] {
    const applicableRules: InvalidationRule[] = [];

    Array.from(this.invalidationRules.values()).forEach(rule => {
      // Feature와 operation 매칭
      if (rule.trigger.feature === event.feature && 
          rule.trigger.operation === event.operation) {
        
        // 조건 확인 (있는 경우)
        if (rule.trigger.condition && !rule.trigger.condition(event.data)) {
          return; // continue 대신 return 사용
        }

        // 스로틀 확인
        if (rule.throttle && this.isThrottled(rule.id, rule.throttle)) {
          return; // continue 대신 return 사용
        }

        applicableRules.push(rule);
        
        // 스로틀 타이머 설정
        if (rule.throttle) {
          this.throttleTracker.set(rule.id, Date.now());
        }
      }
    });

    return applicableRules;
  }

  /**
   * 스로틀 체크
   */
  private isThrottled(ruleId: string, throttleMs: number): boolean {
    const lastExecution = this.throttleTracker.get(ruleId);
    if (!lastExecution) return false;
    
    return Date.now() - lastExecution < throttleMs;
  }

  /**
   * 배치 처리
   */
  private processBatch(event: InvalidationEvent, rules: InvalidationRule[]): void {
    const batchId = `batch-${Date.now()}`;
    const batch: BatchInvalidation = {
      id: batchId,
      events: [event],
      scheduledAt: new Date(),
      targets: new Set(),
    };

    // 즉시 실행할 대상들
    const immediateTargets: string[] = [];
    
    // 규칙별 대상 수집
    for (const rule of rules) {
      for (const target of rule.targets) {
        const queryKey = this.buildQueryKey(target.feature, target.operation, target.params);
        const queryKeyStr = JSON.stringify(queryKey);
        
        batch.targets.add(queryKeyStr);

        if (target.mode === 'immediate') {
          immediateTargets.push(queryKeyStr);
        } else if (target.mode === 'deferred') {
          // 지연 실행 스케줄링
          setTimeout(() => {
            this.executeInvalidation([queryKey]);
          }, target.delay || this.BATCH_DELAY);
        } else if (target.mode === 'background') {
          // 백그라운드 실행 스케줄링 (더 긴 지연)
          setTimeout(() => {
            this.executeInvalidation([queryKey], { type: 'background' });
          }, target.delay || 5000);
        }
      }
    }

    // 즉시 실행 대상들 처리
    if (immediateTargets.length > 0) {
      const queryKeys = immediateTargets.map(str => JSON.parse(str));
      this.executeInvalidation(queryKeys);
    }

    this.pendingBatches.set(batchId, batch);
  }

  /**
   * 쿼리 키 빌드
   */
  private buildQueryKey(feature: string, operation: string, params?: Record<string, any>): any[] {
    if (params) {
      return [feature, operation, params];
    }
    return [feature, operation];
  }

  /**
   * 무효화 실행
   */
  private executeInvalidation(
    queryKeys: any[], 
    options: { type?: 'normal' | 'background' } = {}
  ): void {
    if (!this.queryClient) {
      console.warn('QueryClient not set in SmartInvalidationManager');
      return;
    }

    try {
      for (const queryKey of queryKeys) {
        this.queryClient.invalidateQueries({
          queryKey,
          type: options.type === 'background' ? 'inactive' : 'all',
        });
      }

      console.log(`Invalidated ${queryKeys.length} queries:`, queryKeys);
    } catch (error) {
      console.error('Failed to invalidate queries:', error);
    }
  }

  /**
   * 이벤트 기록
   */
  private recordEvent(event: InvalidationEvent): void {
    this.eventHistory.push(event);
    
    // 히스토리 크기 제한
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-500);
    }
  }

  /**
   * 사용자 패턴 업데이트
   */
  private updateUserPattern(userId: string, feature: string, operation: string): void {
    let pattern = this.userPatterns.get(userId);
    
    if (!pattern) {
      pattern = {
        userId,
        commonSequences: [],
        peakTimes: [],
        preferredFeatures: [],
      };
      this.userPatterns.set(userId, pattern);
    }

    // 선호 Feature 업데이트
    if (!pattern.preferredFeatures.includes(feature)) {
      pattern.preferredFeatures.push(feature);
    }

    // 피크 시간 업데이트
    const currentHour = new Date().getHours();
    const existingPeakTime = pattern.peakTimes.find(pt => pt.hour === currentHour);
    
    if (existingPeakTime) {
      existingPeakTime.frequency++;
    } else {
      pattern.peakTimes.push({ hour: currentHour, frequency: 1 });
    }

    // TODO: 시퀀스 패턴 분석 구현
  }

  /**
   * 예측적 무효화 실행
   */
  public executePredictiveInvalidation(userId: string): void {
    const pattern = this.userPatterns.get(userId);
    if (!pattern) return;

    const currentHour = new Date().getHours();
    const peakTime = pattern.peakTimes.find(pt => pt.hour === currentHour);
    
    // 피크 시간대에 자주 사용하는 데이터 프리페치
    if (peakTime && peakTime.frequency > 5) {
      for (const feature of pattern.preferredFeatures) {
        // 백그라운드에서 데이터 새로고침
        this.executeInvalidation([[feature, 'list']], { type: 'background' });
      }
    }
  }

  /**
   * 배치 프로세서 설정
   */
  private setupBatchProcessor(): void {
    // 주기적으로 완료된 배치들 정리
    setInterval(() => {
      const now = Date.now();
      Array.from(this.pendingBatches.entries()).forEach(([batchId, batch]) => {
        if (batch.executedAt && now - batch.executedAt.getTime() > 60000) {
          this.pendingBatches.delete(batchId);
        }
      });
    }, 30000); // 30초마다
  }

  /**
   * 히스토리 정리 설정
   */
  private setupHistoryCleanup(): void {
    setInterval(() => {
      const cutoff = Date.now() - this.HISTORY_RETENTION;
      this.eventHistory = this.eventHistory.filter(
        event => event.timestamp.getTime() > cutoff
      );
    }, 60000); // 1분마다
  }

  /**
   * 통계 정보 반환
   */
  public getStats(): {
    totalEvents: number;
    activeRules: number;
    pendingBatches: number;
    userPatterns: number;
    recentEvents: InvalidationEvent[];
  } {
    return {
      totalEvents: this.eventHistory.length,
      activeRules: this.invalidationRules.size,
      pendingBatches: this.pendingBatches.size,
      userPatterns: this.userPatterns.size,
      recentEvents: this.eventHistory.slice(-10),
    };
  }

  /**
   * 규칙 목록 반환
   */
  public getRules(): InvalidationRule[] {
    return Array.from(this.invalidationRules.values());
  }

  /**
   * 사용자 패턴 반환
   */
  public getUserPattern(userId: string): UserBehaviorPattern | undefined {
    return this.userPatterns.get(userId);
  }

  /**
   * 전체 초기화
   */
  public reset(): void {
    this.eventHistory = [];
    this.pendingBatches.clear();
    this.throttleTracker.clear();
    this.userPatterns.clear();
  }
}

/**
 * 싱글톤 인스턴스 export
 */
export const smartInvalidationManager = SmartInvalidationManager.getInstance();