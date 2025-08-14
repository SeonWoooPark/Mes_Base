import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 무한 스크롤 설정
 */
export interface InfiniteScrollConfig {
  // 기본 설정
  threshold?: number;                  // 스크롤 트리거 임계값 (픽셀)
  rootMargin?: string;                 // IntersectionObserver rootMargin
  enabled?: boolean;                   // 무한 스크롤 활성화 여부
  
  // 성능 설정
  debounceMs?: number;                 // 로딩 디바운스 시간
  initialPageSize?: number;            // 초기 페이지 크기
  pageSize?: number;                   // 페이지 크기
  maxPages?: number;                   // 최대 페이지 수
  
  // 에러 처리
  maxRetries?: number;                 // 최대 재시도 횟수
  retryDelay?: number;                 // 재시도 지연 시간 (ms)
  
  // 필터/정렬
  resetOnDependencyChange?: boolean;   // 의존성 변경 시 리셋
}

/**
 * 무한 스크롤 상태
 */
export interface InfiniteScrollState<T> {
  items: T[];                          // 현재 로드된 아이템들
  loading: boolean;                    // 로딩 상태
  error: string | null;                // 에러 메시지
  hasMore: boolean;                    // 더 많은 데이터 여부
  page: number;                        // 현재 페이지
  totalCount?: number;                 // 전체 아이템 수
  isInitialLoad: boolean;              // 초기 로드 여부
}

/**
 * 무한 스크롤 액션
 */
export interface InfiniteScrollActions {
  loadMore: () => Promise<void>;       // 더 많은 데이터 로드
  reset: () => void;                   // 상태 초기화
  retry: () => Promise<void>;          // 재시도
  refresh: () => Promise<void>;        // 새로고침
  observeTarget: (node: HTMLElement | null) => (() => void) | undefined; // 스크롤 감지 옵저버
}

/**
 * 데이터 로더 함수 타입
 */
export type DataLoader<T> = (page: number, pageSize: number) => Promise<{
  items: T[];
  totalCount?: number;
  hasMore?: boolean;
}>;

/**
 * 기본 설정
 */
const defaultConfig: Required<InfiniteScrollConfig> = {
  threshold: 100,
  rootMargin: '0px',
  enabled: true,
  debounceMs: 300,
  initialPageSize: 20,
  pageSize: 20,
  maxPages: 100,
  maxRetries: 3,
  retryDelay: 1000,
  resetOnDependencyChange: true,
};

/**
 * 무한 스크롤 커스텀 훅
 * 
 * 기능:
 * - 자동 스크롤 감지 및 데이터 로드
 * - 에러 처리 및 재시도
 * - 디바운싱으로 성능 최적화
 * - 상태 관리 (로딩, 에러, 페이징)
 * - 초기화 및 새로고침
 */
export const useInfiniteScroll = <T>(
  dataLoader: DataLoader<T>,
  config: InfiniteScrollConfig = {},
  dependencies: React.DependencyList = []
): InfiniteScrollState<T> & InfiniteScrollActions => {
  
  const finalConfig = { ...defaultConfig, ...config };
  
  // === 상태 관리 ===
  const [state, setState] = useState<InfiniteScrollState<T>>({
    items: [],
    loading: false,
    error: null,
    hasMore: true,
    page: 0,
    totalCount: undefined,
    isInitialLoad: true,
  });
  
  // === 참조 ===
  const loadingRef = useRef(false);
  const retryCountRef = useRef(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();
  
  // === 데이터 로드 함수 ===
  const loadData = useCallback(async (page: number, isReset = false): Promise<void> => {
    // 중복 로딩 방지
    if (loadingRef.current) return;
    
    // 무한 스크롤 비활성화 상태에서는 로드하지 않음
    if (!finalConfig.enabled) return;
    
    // 최대 페이지 수 체크
    if (page >= finalConfig.maxPages) {
      setState(prev => ({ ...prev, hasMore: false }));
      return;
    }
    
    loadingRef.current = true;
    
    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      ...(isReset && { items: [], page: 0, isInitialLoad: true })
    }));
    
    try {
      const pageSize = page === 0 ? finalConfig.initialPageSize : finalConfig.pageSize;
      const result = await dataLoader(page, pageSize);
      
      setState(prev => {
        const newItems = isReset ? result.items : [...prev.items, ...result.items];
        
        return {
          ...prev,
          items: newItems,
          loading: false,
          hasMore: result.hasMore ?? (result.items.length === pageSize),
          page: page,
          totalCount: result.totalCount,
          isInitialLoad: false,
        };
      });
      
      retryCountRef.current = 0; // 성공 시 재시도 카운트 초기화
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // 요청이 취소된 경우 상태 업데이트 안함
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : '데이터를 불러오는 중 오류가 발생했습니다.';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      
      console.error('Infinite scroll data loading error:', error);
    } finally {
      loadingRef.current = false;
    }
  }, [dataLoader, finalConfig.enabled, finalConfig.maxPages, finalConfig.initialPageSize, finalConfig.pageSize]);
  
  // === 디바운스된 로드 더 함수 ===
  const debouncedLoadMore = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (state.hasMore && !state.loading && !state.error) {
        loadData(state.page + 1);
      }
    }, finalConfig.debounceMs);
  }, [state.hasMore, state.loading, state.error, state.page, loadData, finalConfig.debounceMs]);
  
  // === 공개 액션들 ===
  const loadMore = useCallback(async (): Promise<void> => {
    if (state.hasMore && !state.loading && !state.error) {
      await loadData(state.page + 1);
    }
  }, [state.hasMore, state.loading, state.error, state.page, loadData]);
  
  const reset = useCallback(() => {
    setState({
      items: [],
      loading: false,
      error: null,
      hasMore: true,
      page: 0,
      totalCount: undefined,
      isInitialLoad: true,
    });
    retryCountRef.current = 0;
    
    // 진행 중인 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);
  
  const retry = useCallback(async (): Promise<void> => {
    if (retryCountRef.current >= finalConfig.maxRetries) {
      setState(prev => ({
        ...prev,
        error: `최대 재시도 횟수(${finalConfig.maxRetries})를 초과했습니다.`,
      }));
      return;
    }
    
    retryCountRef.current++;
    
    // 재시도 지연
    await new Promise(resolve => setTimeout(resolve, finalConfig.retryDelay));
    
    await loadData(state.page);
  }, [state.page, loadData, finalConfig.maxRetries, finalConfig.retryDelay]);
  
  const refresh = useCallback(async (): Promise<void> => {
    reset();
    await loadData(0, true);
  }, [reset, loadData]);
  
  // === 스크롤 감지 옵저버 ===
  const observeTarget = useCallback((node: HTMLElement | null) => {
    if (!node || !finalConfig.enabled || state.loading || !state.hasMore || state.error) {
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          debouncedLoadMore();
        }
      },
      {
        rootMargin: finalConfig.rootMargin,
        threshold: 0.1,
      }
    );
    
    observer.observe(node);
    
    return () => observer.disconnect();
  }, [finalConfig.enabled, finalConfig.rootMargin, state.loading, state.hasMore, state.error, debouncedLoadMore]);
  
  // === 의존성 변경 시 리셋 ===
  useEffect(() => {
    if (finalConfig.resetOnDependencyChange) {
      refresh();
    }
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
  
  // === 초기 로드 ===
  useEffect(() => {
    if (state.isInitialLoad && finalConfig.enabled) {
      loadData(0, true);
    }
  }, [state.isInitialLoad, finalConfig.enabled, loadData]);
  
  // === 정리 ===
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return {
    // 상태
    ...state,
    
    // 액션
    loadMore,
    reset,
    retry,
    refresh,
    
    // 옵저버 (컴포넌트에서 ref로 사용)
    observeTarget,
  };
};