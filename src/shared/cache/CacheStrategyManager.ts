/**
 * 고급 캐싱 전략 관리자
 * 
 * Feature별 맞춤형 캐싱 전략을 제공:
 * - 데이터 특성에 따른 차별화된 캐시 정책
 * - 사용자 행동 패턴 기반 예측적 캐싱
 * - 네트워크 상태 기반 적응형 캐싱
 * - 메모리 사용량 최적화
 * - 캐시 히트율 모니터링
 */

/**
 * 캐시 전략 타입
 */
export enum CacheStrategyType {
  /** 실시간 데이터 - 짧은 캐시, 빈번한 갱신 */
  REAL_TIME = 'REAL_TIME',
  /** 정적 데이터 - 긴 캐시, 드물게 변경 */
  STATIC = 'STATIC',  
  /** 사용자별 데이터 - 중간 캐시, 세션 기반 */
  USER_SPECIFIC = 'USER_SPECIFIC',
  /** 리스트 데이터 - 페이지네이션 최적화 */
  LIST_DATA = 'LIST_DATA',
  /** 상세 데이터 - 상세 조회 최적화 */
  DETAIL_DATA = 'DETAIL_DATA',
  /** 계산 집약적 데이터 - 긴 캐시, 백그라운드 갱신 */
  COMPUTED_DATA = 'COMPUTED_DATA'
}

/**
 * 캐시 정책 설정
 */
export interface CachePolicy {
  staleTime: number;          // fresh 상태 유지 시간 (ms)
  gcTime: number;             // 가비지 컬렉션 시간 (ms) 
  retryCount: number;         // 재시도 횟수
  retryDelay: number;         // 재시도 지연 시간 (ms)
  refetchOnMount: boolean;    // 마운트 시 재조회
  refetchOnWindowFocus: boolean; // 포커스 시 재조회
  refetchOnReconnect: boolean;   // 재연결 시 재조회
  backgroundRefetch: boolean; // 백그라운드 갱신
  networkMode?: 'online' | 'always' | 'offlineFirst'; // 네트워크 모드
}

/**
 * Feature별 캐시 설정 매핑
 */
export interface FeatureCacheConfig {
  [operation: string]: {
    strategy: CacheStrategyType;
    customPolicy?: Partial<CachePolicy>;
    tags?: string[];           // 캐시 태그 (무효화 그룹핑용)
    priority?: 'high' | 'medium' | 'low'; // 캐시 우선순위
  };
}

/**
 * 네트워크 상태 타입
 */
export interface NetworkStatus {
  online: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

/**
 * 캐시 히트 통계
 */
export interface CacheHitStats {
  feature: string;
  operation: string;
  hitCount: number;
  missCount: number;
  hitRate: number;
  lastAccessed: Date;
  averageResponseTime: number;
}

/**
 * 캐싱 전략 매니저 클래스
 */
export class CacheStrategyManager {
  private static instance: CacheStrategyManager;
  private featureConfigs: Map<string, FeatureCacheConfig> = new Map();
  private networkStatus: NetworkStatus | null = null;
  private hitStats: Map<string, CacheHitStats> = new Map();
  private memoryUsageThreshold = 0.8; // 80% 메모리 사용량 임계값

  private constructor() {
    this.initializeDefaultConfigs();
    this.setupNetworkMonitoring();
    this.setupMemoryMonitoring();
  }

  /**
   * 싱글톤 인스턴스 획득
   */
  public static getInstance(): CacheStrategyManager {
    if (!CacheStrategyManager.instance) {
      CacheStrategyManager.instance = new CacheStrategyManager();
    }
    return CacheStrategyManager.instance;
  }

  /**
   * 기본 Feature별 캐시 설정 초기화
   */
  private initializeDefaultConfigs(): void {
    // Product Feature 설정
    this.featureConfigs.set('product', {
      list: { 
        strategy: CacheStrategyType.LIST_DATA,
        tags: ['product-list'],
        priority: 'high'
      },
      detail: { 
        strategy: CacheStrategyType.DETAIL_DATA,
        tags: ['product-detail'],
        priority: 'high'
      },
      history: { 
        strategy: CacheStrategyType.STATIC,
        tags: ['product-history'],
        priority: 'medium'
      },
    });

    // BOM Feature 설정
    this.featureConfigs.set('bom', {
      tree: { 
        strategy: CacheStrategyType.COMPUTED_DATA,
        tags: ['bom-tree'],
        priority: 'high',
        customPolicy: {
          staleTime: 1000 * 60 * 10, // 10분 fresh
          backgroundRefetch: true
        }
      },
      compare: { 
        strategy: CacheStrategyType.COMPUTED_DATA,
        tags: ['bom-compare'],
        priority: 'medium',
        customPolicy: {
          staleTime: 1000 * 60 * 15, // 15분 fresh
        }
      },
      addItem: { 
        strategy: CacheStrategyType.REAL_TIME,
        tags: ['bom-tree', 'bom-mutations'],
        priority: 'high'
      },
      updateItem: { 
        strategy: CacheStrategyType.REAL_TIME,
        tags: ['bom-tree', 'bom-mutations'],
        priority: 'high'
      },
      deleteItem: { 
        strategy: CacheStrategyType.REAL_TIME,
        tags: ['bom-tree', 'bom-mutations'],
        priority: 'high'
      },
    });

    // 사용자별 데이터는 USER_SPECIFIC 전략
    this.featureConfigs.set('user', {
      profile: { 
        strategy: CacheStrategyType.USER_SPECIFIC,
        tags: ['user-profile'],
        priority: 'high'
      },
      preferences: { 
        strategy: CacheStrategyType.USER_SPECIFIC,
        tags: ['user-preferences'],
        priority: 'medium'
      },
    });
  }

  /**
   * 네트워크 상태 모니터링 설정
   */
  private setupNetworkMonitoring(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkStatus = () => {
        this.networkStatus = {
          online: navigator.onLine,
          connectionType: connection?.type || 'unknown',
          effectiveType: connection?.effectiveType || 'unknown',
          downlink: connection?.downlink || 0,
          rtt: connection?.rtt || 0,
        };
      };

      // 초기 상태 설정
      updateNetworkStatus();

      // 이벤트 리스너 등록
      window.addEventListener('online', updateNetworkStatus);
      window.addEventListener('offline', updateNetworkStatus);
      
      if (connection) {
        connection.addEventListener('change', updateNetworkStatus);
      }
    }
  }

  /**
   * 메모리 사용량 모니터링 설정
   */
  private setupMemoryMonitoring(): void {
    if (typeof (performance as any)?.memory !== 'undefined') {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usage = memory.usedJSHeapSize / memory.totalJSHeapSize;
        
        if (usage > this.memoryUsageThreshold) {
          this.triggerMemoryCleanup();
        }
      }, 30000); // 30초마다 체크
    }
  }

  /**
   * Feature별 캐시 정책 획득
   */
  public getCachePolicy(feature: string, operation: string): CachePolicy {
    const featureConfig = this.featureConfigs.get(feature);
    const operationConfig = featureConfig?.[operation];
    
    if (!operationConfig) {
      return this.getDefaultPolicy(CacheStrategyType.USER_SPECIFIC);
    }

    const basePolicy = this.getDefaultPolicy(operationConfig.strategy);
    const customPolicy = operationConfig.customPolicy || {};
    const networkAdaptation = this.getNetworkAdaptation();

    return {
      ...basePolicy,
      ...customPolicy,
      ...networkAdaptation,
    };
  }

  /**
   * 전략 타입별 기본 정책 반환
   */
  private getDefaultPolicy(strategy: CacheStrategyType): CachePolicy {
    switch (strategy) {
      case CacheStrategyType.REAL_TIME:
        return {
          staleTime: 1000 * 30,        // 30초
          gcTime: 1000 * 60 * 5,       // 5분
          retryCount: 3,
          retryDelay: 1000,
          refetchOnMount: true,
          refetchOnWindowFocus: true,
          refetchOnReconnect: true,
          backgroundRefetch: false,
          networkMode: 'online',
        };

      case CacheStrategyType.STATIC:
        return {
          staleTime: 1000 * 60 * 60,   // 1시간
          gcTime: 1000 * 60 * 60 * 24, // 24시간
          retryCount: 1,
          retryDelay: 2000,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          backgroundRefetch: false,
          networkMode: 'always',
        };

      case CacheStrategyType.USER_SPECIFIC:
        return {
          staleTime: 1000 * 60 * 5,    // 5분
          gcTime: 1000 * 60 * 30,      // 30분
          retryCount: 2,
          retryDelay: 1500,
          refetchOnMount: false,
          refetchOnWindowFocus: true,
          refetchOnReconnect: true,
          backgroundRefetch: false,
          networkMode: 'online',
        };

      case CacheStrategyType.LIST_DATA:
        return {
          staleTime: 1000 * 60 * 2,    // 2분
          gcTime: 1000 * 60 * 15,      // 15분
          retryCount: 2,
          retryDelay: 1000,
          refetchOnMount: true,
          refetchOnWindowFocus: false,
          refetchOnReconnect: true,
          backgroundRefetch: true,
          networkMode: 'online',
        };

      case CacheStrategyType.DETAIL_DATA:
        return {
          staleTime: 1000 * 60 * 10,   // 10분
          gcTime: 1000 * 60 * 60,      // 1시간
          retryCount: 2,
          retryDelay: 1500,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: true,
          backgroundRefetch: true,
          networkMode: 'online',
        };

      case CacheStrategyType.COMPUTED_DATA:
        return {
          staleTime: 1000 * 60 * 15,   // 15분
          gcTime: 1000 * 60 * 60 * 2,  // 2시간
          retryCount: 1,
          retryDelay: 3000,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          backgroundRefetch: true,
          networkMode: 'online',
        };

      default:
        return this.getDefaultPolicy(CacheStrategyType.USER_SPECIFIC);
    }
  }

  /**
   * 네트워크 상태에 따른 정책 적응
   */
  private getNetworkAdaptation(): Partial<CachePolicy> {
    if (!this.networkStatus) return {};

    const { online, effectiveType, downlink } = this.networkStatus;

    if (!online) {
      return {
        networkMode: 'offlineFirst',
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        backgroundRefetch: false,
      };
    }

    // 느린 네트워크 연결
    if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1) {
      return {
        staleTime: this.extendStaleTime(2), // 2배 연장
        retryDelay: 3000,
        backgroundRefetch: false,
      };
    }

    // 빠른 네트워크 연결
    if (effectiveType === '4g' || downlink > 10) {
      return {
        staleTime: this.extendStaleTime(0.5), // 절반으로 단축
        retryDelay: 500,
        backgroundRefetch: true,
      };
    }

    return {};
  }

  /**
   * staleTime 조정 헬퍼
   */
  private extendStaleTime(multiplier: number): number {
    return 1000 * 60 * 5 * multiplier; // 기본 5분에 배수 적용
  }

  /**
   * 캐시 태그로 무효화할 쿼리 키 목록 반환
   */
  public getQueryKeysForTags(tags: string[]): string[][] {
    const queryKeys: string[][] = [];

    Array.from(this.featureConfigs.entries()).forEach(([feature, config]) => {
      Object.entries(config).forEach(([operation, operationConfig]) => {
        if (operationConfig.tags?.some((tag: string) => tags.includes(tag))) {
          queryKeys.push([feature, operation]);
        }
      });
    });

    return queryKeys;
  }

  /**
   * 캐시 히트 통계 기록
   */
  public recordCacheHit(feature: string, operation: string, hit: boolean, responseTime: number): void {
    const key = `${feature}-${operation}`;
    const existing = this.hitStats.get(key) || {
      feature,
      operation,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      lastAccessed: new Date(),
      averageResponseTime: 0,
    };

    if (hit) {
      existing.hitCount++;
    } else {
      existing.missCount++;
    }

    const total = existing.hitCount + existing.missCount;
    existing.hitRate = existing.hitCount / total;
    existing.lastAccessed = new Date();
    
    // 이동평균으로 응답시간 계산
    existing.averageResponseTime = 
      (existing.averageResponseTime * (total - 1) + responseTime) / total;

    this.hitStats.set(key, existing);
  }

  /**
   * 캐시 히트율 통계 반환
   */
  public getCacheHitStats(): CacheHitStats[] {
    return Array.from(this.hitStats.values());
  }

  /**
   * 메모리 정리 트리거
   */
  private triggerMemoryCleanup(): void {
    console.warn('Memory usage threshold exceeded, triggering cache cleanup');
    
    // 낮은 우선순위 캐시부터 정리
    const lowPriorityCaches = this.getLowPriorityCaches();
    
    // QueryClient에 정리 신호 전송 (실제 구현에서는 queryClient 참조 필요)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cache-cleanup', { 
        detail: { caches: lowPriorityCaches } 
      }));
    }
  }

  /**
   * 낮은 우선순위 캐시 목록 반환
   */
  private getLowPriorityCaches(): string[][] {
    const lowPriorityCaches: string[][] = [];

    Array.from(this.featureConfigs.entries()).forEach(([feature, config]) => {
      Object.entries(config).forEach(([operation, operationConfig]) => {
        if (operationConfig.priority === 'low') {
          lowPriorityCaches.push([feature, operation]);
        }
      });
    });

    return lowPriorityCaches;
  }

  /**
   * Feature별 캐시 설정 업데이트
   */
  public updateFeatureConfig(feature: string, config: FeatureCacheConfig): void {
    this.featureConfigs.set(feature, config);
  }

  /**
   * 전체 캐시 설정 반환
   */
  public getAllConfigs(): Map<string, FeatureCacheConfig> {
    return new Map(this.featureConfigs);
  }

  /**
   * 네트워크 상태 반환
   */
  public getNetworkStatus(): NetworkStatus | null {
    return this.networkStatus;
  }
}

/**
 * 싱글톤 인스턴스 export
 */
export const cacheStrategyManager = CacheStrategyManager.getInstance();