import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';

/**
 * 성능 측정 인터페이스
 */
interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memory?: number;
  renderCount?: number;
}

/**
 * 메모이제이션 캐시 옵션
 */
interface MemoizationOptions {
  maxSize?: number;           // 최대 캐시 크기
  ttl?: number;              // Time To Live (밀리초)
  enableWeakRef?: boolean;    // WeakRef 사용 여부
}

/**
 * 디바운스 훅 옵션
 */
interface DebounceOptions {
  leading?: boolean;          // 시작 시점에 실행
  trailing?: boolean;         // 끝 시점에 실행
  maxWait?: number;          // 최대 대기 시간
}

/**
 * 글로벌 성능 모니터
 */
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private observers: Array<(metric: PerformanceMetrics) => void> = [];

  /**
   * 성능 측정 시작
   */
  startMeasure(name: string): void {
    const startTime = performance.now();
    this.metrics.set(name, {
      name,
      startTime,
      memory: this.getMemoryUsage(),
    });
  }

  /**
   * 성능 측정 종료
   */
  endMeasure(name: string): PerformanceMetrics | null {
    const metric = this.metrics.get(name);
    if (!metric) return null;

    const endTime = performance.now();
    const completedMetric: PerformanceMetrics = {
      ...metric,
      endTime,
      duration: endTime - metric.startTime,
      memory: this.getMemoryUsage(),
    };

    this.metrics.set(name, completedMetric);
    this.notifyObservers(completedMetric);

    return completedMetric;
  }

  /**
   * 메모리 사용량 조회
   */
  private getMemoryUsage(): number | undefined {
    // @ts-ignore
    return (performance as any).memory?.usedJSHeapSize;
  }

  /**
   * 옵저버 등록
   */
  addObserver(callback: (metric: PerformanceMetrics) => void): void {
    this.observers.push(callback);
  }

  /**
   * 옵저버 제거
   */
  removeObserver(callback: (metric: PerformanceMetrics) => void): void {
    const index = this.observers.indexOf(callback);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * 옵저버들에게 알림
   */
  private notifyObservers(metric: PerformanceMetrics): void {
    this.observers.forEach(callback => {
      try {
        callback(metric);
      } catch (error) {
        console.error('Performance observer error:', error);
      }
    });
  }

  /**
   * 모든 측정 결과 조회
   */
  getAllMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * 측정 결과 클리어
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * 통계 정보 조회
   */
  getStats(): {
    total: number;
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
  } {
    const metrics = this.getAllMetrics().filter(m => m.duration !== undefined);
    
    if (metrics.length === 0) {
      return { total: 0, avgDuration: 0, maxDuration: 0, minDuration: 0 };
    }

    const durations = metrics.map(m => m.duration!);
    
    return {
      total: metrics.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
    };
  }
}

// 글로벌 인스턴스
export const performanceMonitor = new PerformanceMonitor();

/**
 * 성능 측정 데코레이터
 */
export function measurePerformance(name: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = function (this: any, ...args: any[]) {
      const measureName = `${name || `${target.constructor.name}.${propertyKey}`}`;
      performanceMonitor.startMeasure(measureName);
      
      try {
        const result = originalMethod.apply(this, args);
        
        // Promise인 경우 비동기 처리
        if (result && typeof result.then === 'function') {
          return result.finally(() => {
            performanceMonitor.endMeasure(measureName);
          });
        }
        
        performanceMonitor.endMeasure(measureName);
        return result;
      } catch (error) {
        performanceMonitor.endMeasure(measureName);
        throw error;
      }
    } as T;

    return descriptor;
  };
}

/**
 * 성능 측정 훅
 */
export function usePerformance(name: string) {
  const startTime = useRef<number>(0);

  const start = useCallback(() => {
    startTime.current = performance.now();
    performanceMonitor.startMeasure(name);
  }, [name]);

  const end = useCallback(() => {
    return performanceMonitor.endMeasure(name);
  }, [name]);

  const measure = useCallback(async <T>(fn: () => T | Promise<T>): Promise<T> => {
    start();
    try {
      const result = await fn();
      end();
      return result;
    } catch (error) {
      end();
      throw error;
    }
  }, [start, end]);

  return { start, end, measure };
}

/**
 * 고급 메모이제이션 클래스
 */
class AdvancedMemoization<K, V> {
  private cache = new Map<string, { value: V; timestamp: number; weakRef?: any }>();
  private options: Required<MemoizationOptions>;

  constructor(options: MemoizationOptions = {}) {
    this.options = {
      maxSize: 100,
      ttl: 5 * 60 * 1000, // 5분
      enableWeakRef: false,
      ...options,
    };
  }

  /**
   * 키를 문자열로 변환
   */
  private keyToString(key: K): string {
    if (typeof key === 'string') return key;
    if (typeof key === 'number') return key.toString();
    if (typeof key === 'object' && key !== null) {
      return JSON.stringify(key);
    }
    return String(key);
  }

  /**
   * 캐시에서 값 조회
   */
  get(key: K): V | undefined {
    const keyStr = this.keyToString(key);
    const cached = this.cache.get(keyStr);
    
    if (!cached) return undefined;

    // TTL 체크
    if (Date.now() - cached.timestamp > this.options.ttl) {
      this.cache.delete(keyStr);
      return undefined;
    }

    // WeakRef 체크
    if (this.options.enableWeakRef && cached.weakRef) {
      const value = cached.weakRef.deref?.();
      if (value === undefined) {
        this.cache.delete(keyStr);
        return undefined;
      }
      return value;
    }

    return cached.value;
  }

  /**
   * 캐시에 값 저장
   */
  set(key: K, value: V): void {
    const keyStr = this.keyToString(key);

    // 캐시 크기 제한
    if (this.cache.size >= this.options.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const cacheEntry: { value: V; timestamp: number; weakRef?: any } = {
      value,
      timestamp: Date.now(),
    };

    // WeakRef 사용
    if (this.options.enableWeakRef && typeof value === 'object' && value !== null && typeof (globalThis as any).WeakRef !== 'undefined') {
      cacheEntry.weakRef = new (globalThis as any).WeakRef(value);
    }

    this.cache.set(keyStr, cacheEntry);
  }

  /**
   * 캐시 클리어
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 캐시 크기 조회
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 만료된 캐시 정리
   */
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.cache.forEach((cached, key) => {
      if (now - cached.timestamp > this.options.ttl) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => this.cache.delete(key));
  }
}

/**
 * 고급 메모이제이션 훅
 */
export function useAdvancedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  options?: MemoizationOptions
): T {
  const memoRef = useRef<AdvancedMemoization<string, T>>();
  
  if (!memoRef.current) {
    memoRef.current = new AdvancedMemoization<string, T>(options);
  }

  const depsKey = JSON.stringify(deps);
  
  return useMemo(() => {
    const cached = memoRef.current!.get(depsKey);
    if (cached !== undefined) {
      return cached;
    }

    const value = factory();
    memoRef.current!.set(depsKey, value);
    return value;
  }, deps);
}

/**
 * 고급 디바운스 훅
 */
export function useAdvancedDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: DebounceOptions = {}
): T {
  const { leading = false, trailing = true, maxWait } = options;
  
  const lastCallTime = useRef<number>(0);
  const lastInvokeTime = useRef<number>(0);
  const timerId = useRef<NodeJS.Timeout>();
  const lastArgs = useRef<Parameters<T>>();
  const result = useRef<ReturnType<T>>(undefined as any);

  const invokeFunc = useCallback((time: number): ReturnType<T> => {
    const args = lastArgs.current!;

    lastArgs.current = undefined;
    lastInvokeTime.current = time;
    result.current = callback(...args);
    return result.current;
  }, [callback]);

  const leadingEdge = useCallback((time: number): ReturnType<T> => {
    lastInvokeTime.current = time;
    timerId.current = setTimeout(timerExpired, delay);
    return leading ? invokeFunc(time) : result.current!;
  }, [delay, leading, invokeFunc]);

  const remainingWait = useCallback((time: number) => {
    const timeSinceLastCall = time - lastCallTime.current;
    const timeSinceLastInvoke = time - lastInvokeTime.current;
    const timeWaiting = delay - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }, [delay, maxWait]);

  const shouldInvoke = useCallback((time: number) => {
    const timeSinceLastCall = time - lastCallTime.current;
    const timeSinceLastInvoke = time - lastInvokeTime.current;

    return (
      lastCallTime.current === 0 ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }, [delay, maxWait]);

  const timerExpired = useCallback(() => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timerId.current = setTimeout(timerExpired, remainingWait(time));
  }, [shouldInvoke, remainingWait]);

  const trailingEdge = useCallback((time: number): ReturnType<T> => {
    timerId.current = undefined;

    if (trailing && lastArgs.current) {
      return invokeFunc(time);
    }
    lastArgs.current = undefined;
    return result.current!;
  }, [trailing, invokeFunc]);

  const cancel = useCallback(() => {
    if (timerId.current !== undefined) {
      clearTimeout(timerId.current);
    }
    lastInvokeTime.current = 0;
    lastArgs.current = undefined;
    lastCallTime.current = 0;
    timerId.current = undefined;
  }, []);

  const flush = useCallback((): ReturnType<T> => {
    return timerId.current === undefined ? result.current! : trailingEdge(Date.now());
  }, [trailingEdge]);

  const pending = useCallback(() => {
    return timerId.current !== undefined;
  }, []);

  const debounced = useCallback((...args: Parameters<T>): ReturnType<T> => {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs.current = args;
    lastCallTime.current = time;

    if (isInvoking) {
      if (timerId.current === undefined) {
        return leadingEdge(lastCallTime.current);
      }
      if (maxWait !== undefined) {
        timerId.current = setTimeout(timerExpired, delay);
        return invokeFunc(lastCallTime.current);
      }
    }
    if (timerId.current === undefined) {
      timerId.current = setTimeout(timerExpired, delay);
    }
    return result.current!;
  }, [shouldInvoke, leadingEdge, maxWait, delay, timerExpired, invokeFunc]) as T;

  // 메서드 추가
  (debounced as any).cancel = cancel;
  (debounced as any).flush = flush;
  (debounced as any).pending = pending;

  useEffect(() => {
    return () => {
      if (timerId.current) {
        clearTimeout(timerId.current);
      }
    };
  }, []);

  return debounced;
}

/**
 * 렌더링 횟수 추적 훅
 */
export function useRenderCount(componentName?: string): number {
  const renderCount = useRef(0);
  
  renderCount.current += 1;
  
  useEffect(() => {
    if (componentName && process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered ${renderCount.current} times`);
    }
  });
  
  return renderCount.current;
}

/**
 * 이전 값 추적 훅
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
}

/**
 * 컴포넌트 업데이트 이유 추적 훅
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, any>): void {
  const previousProps = useRef<Record<string, any>>();
  
  useEffect(() => {
    if (previousProps.current && process.env.NODE_ENV === 'development') {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};
      
      allKeys.forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });
      
      if (Object.keys(changedProps).length) {
        console.log('[why-did-you-update]', name, changedProps);
      }
    }
    
    previousProps.current = props;
  });
}

/**
 * 배치 업데이트 훅
 */
export function useBatchedUpdates<T>(
  initialState: T,
  batchDelay: number = 16
): [T, (updater: (prevState: T) => T) => void] {
  const [state, setState] = useState(initialState);
  const pendingUpdates = useRef<Array<(prevState: T) => T>>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchedSetState = useCallback((updater: (prevState: T) => T) => {
    pendingUpdates.current.push(updater);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState(prevState => {
        return pendingUpdates.current.reduce((acc, update) => update(acc), prevState);
      });
      pendingUpdates.current = [];
    }, batchDelay);
  }, [batchDelay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchedSetState];
}

/**
 * 성능 최적화 유틸리티
 */
export const PerformanceUtils = {
  /**
   * 번들 크기 분석 정보 출력
   */
  logBundleInfo: () => {
    if (process.env.NODE_ENV === 'development') {
      console.group('📦 Bundle Analysis');
      console.log('React version:', React.version);
      console.log('Environment:', process.env.NODE_ENV);
      console.log('Performance API available:', !!window.performance);
      console.log('Intersection Observer available:', !!window.IntersectionObserver);
      console.log('ResizeObserver available:', !!window.ResizeObserver);
      console.groupEnd();
    }
  },

  /**
   * 메모리 사용량 로깅
   */
  logMemoryUsage: () => {
    // @ts-ignore
    const memory = (performance as any).memory;
    if (memory && process.env.NODE_ENV === 'development') {
      console.group('🧠 Memory Usage');
      console.log('Used:', Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB');
      console.log('Total:', Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB');
      console.log('Limit:', Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB');
      console.groupEnd();
    }
  },

  /**
   * 성능 통계 출력
   */
  logPerformanceStats: () => {
    const stats = performanceMonitor.getStats();
    if (process.env.NODE_ENV === 'development') {
      console.group('⚡ Performance Stats');
      console.log('Total measurements:', stats.total);
      console.log('Average duration:', Math.round(stats.avgDuration * 100) / 100 + ' ms');
      console.log('Max duration:', Math.round(stats.maxDuration * 100) / 100 + ' ms');
      console.log('Min duration:', Math.round(stats.minDuration * 100) / 100 + ' ms');
      console.groupEnd();
    }
  },
};