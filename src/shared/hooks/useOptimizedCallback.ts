/**
 * 성능 최적화를 위한 커스텀 Hook 유틸리티
 * 
 * React의 성능 최적화 패턴을 편리하게 사용할 수 있도록 도와주는 헬퍼 훅들입니다.
 * - 메모화된 콜백 생성
 * - 객체/배열 메모화 최적화
 * - 비싼 계산 메모화
 * - 디바운스/스로틀링
 */

import { useCallback, useMemo, useRef, DependencyList } from 'react';

/**
 * 성능 최적화를 위한 메모화된 콜백 생성
 * 
 * React.useCallback과 동일하지만 더 나은 타입 추론을 제공합니다.
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList
): T {
  return useCallback(callback, deps);
}

/**
 * 메모화된 이벤트 핸들러 생성
 * 
 * 이벤트 핸들러를 최적화하여 불필요한 리렌더링을 방지합니다.
 */
export function useEventHandler<T extends (...args: any[]) => any>(
  handler: T,
  deps: DependencyList
): T {
  return useCallback(handler, deps);
}

/**
 * 객체 메모화 최적화
 * 
 * 객체의 내용이 변경되지 않았을 때 같은 참조를 반환합니다.
 */
export function useObjectMemo<T extends Record<string, any>>(
  factory: () => T,
  deps: DependencyList
): T {
  return useMemo(factory, deps);
}

/**
 * 배열 메모화 최적화
 * 
 * 배열의 내용이 변경되지 않았을 때 같은 참조를 반환합니다.
 */
export function useArrayMemo<T>(
  factory: () => T[],
  deps: DependencyList
): T[] {
  return useMemo(factory, deps);
}

/**
 * 값 메모화 최적화
 * 
 * 값비싼 계산 결과를 메모화합니다.
 */
export function useValueMemo<T>(
  factory: () => T,
  deps: DependencyList
): T {
  return useMemo(factory, deps);
}

/**
 * 안정적인 참조 제공
 * 
 * 값이 변경되지 않는 한 같은 참조를 유지합니다.
 */
export function useStableValue<T>(value: T): T {
  const ref = useRef<T>(value);
  
  // 깊은 비교 대신 JSON.stringify 사용 (단순한 경우에 적합)
  const currentSerialized = JSON.stringify(value);
  const prevSerialized = JSON.stringify(ref.current);
  
  if (currentSerialized !== prevSerialized) {
    ref.current = value;
  }
  
  return ref.current;
}

/**
 * 디바운스된 콜백
 * 
 * 지정된 시간 동안 연속 호출을 지연시킵니다.
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [...deps, delay]
  );
}

/**
 * 스로틀된 콜백
 * 
 * 지정된 시간 간격으로 호출을 제한합니다.
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  interval: number,
  deps: DependencyList
): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;
      
      if (timeSinceLastCall >= interval) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, interval - timeSinceLastCall);
      }
    }) as T,
    [...deps, interval]
  );
}

/**
 * 메모화된 필터 함수
 * 
 * 배열 필터링을 최적화합니다.
 */
export function useFilteredArray<T>(
  array: T[],
  predicate: (item: T) => boolean,
  deps: DependencyList
): T[] {
  return useMemo(
    () => array.filter(predicate),
    [array, ...deps]
  );
}

/**
 * 메모화된 정렬 함수
 * 
 * 배열 정렬을 최적화합니다.
 */
export function useSortedArray<T>(
  array: T[],
  compareFn: (a: T, b: T) => number,
  deps: DependencyList
): T[] {
  return useMemo(
    () => [...array].sort(compareFn),
    [array, ...deps]
  );
}

/**
 * 메모화된 맵 함수
 * 
 * 배열 변환을 최적화합니다.
 */
export function useMappedArray<T, U>(
  array: T[],
  mapFn: (item: T, index: number) => U,
  deps: DependencyList
): U[] {
  return useMemo(
    () => array.map(mapFn),
    [array, ...deps]
  );
}

/**
 * 복합 메모화 최적화
 * 
 * 여러 변환을 체이닝하여 최적화합니다.
 */
export function useChainedMemo<T, U>(
  initialValue: T,
  transforms: Array<(value: any) => any>,
  deps: DependencyList
): U {
  return useMemo(
    () => transforms.reduce((value, transform) => transform(value), initialValue) as unknown as U,
    [initialValue, transforms, ...deps]
  );
}