import { useState, useEffect } from 'react';

/**
 * 디바운스 커스텀 훅
 * 
 * 빠른 연속 입력 시 마지막 값만 지연 후 반환하여
 * 불필요한 API 호출이나 연산을 방지합니다.
 * 
 * @param value 디바운스할 값
 * @param delay 지연 시간 (밀리초)
 * @returns 디바운스된 값
 * 
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * 
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     // API 호출 또는 검색 실행
 *     searchProducts(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 * ```
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  // 디바운스된 값을 저장할 상태
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 지연 시간 후 값을 업데이트하는 타이머 설정
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 새로운 값이 들어오면 이전 타이머를 클리어
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * 디바운스된 콜백 함수를 위한 커스텀 훅
 * 
 * 함수 실행을 지연시켜 성능을 최적화합니다.
 * 
 * @param callback 실행할 콜백 함수
 * @param delay 지연 시간 (밀리초)
 * @param deps 의존성 배열
 * @returns 디바운스된 콜백 함수
 * 
 * @example
 * ```tsx
 * const debouncedSearch = useDebouncedCallback(
 *   (searchTerm: string) => {
 *     performSearch(searchTerm);
 *   },
 *   300,
 *   []
 * );
 * ```
 */
export const useDebouncedCallback = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T => {
  const [debouncedCallback, setDebouncedCallback] = useState<T>(() => callback);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCallback(() => callback);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [...deps, delay]);

  return debouncedCallback;
};

/**
 * 즉시 실행과 디바운스 실행을 함께 제공하는 훅
 * 
 * @param value 디바운스할 값
 * @param delay 지연 시간 (밀리초)
 * @returns [즉시 값, 디바운스된 값, 로딩 상태]
 * 
 * @example
 * ```tsx
 * const [immediateValue, debouncedValue, isDebouncing] = useDebounceWithImmediate(searchTerm, 300);
 * 
 * // 즉시 UI 업데이트
 * if (immediateValue !== debouncedValue) {
 *   showLoadingSpinner();
 * }
 * ```
 */
export const useDebounceWithImmediate = <T>(
  value: T,
  delay: number
): [T, T, boolean] => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState<boolean>(false);

  useEffect(() => {
    setIsDebouncing(true);
    
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return [value, debouncedValue, isDebouncing];
};