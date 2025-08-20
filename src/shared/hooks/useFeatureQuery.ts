/**
 * Feature별 표준화된 Query Hook 패턴
 * 
 * TanStack Query v5를 활용한 일관된 데이터 페칭 패턴 제공:
 * - 표준화된 에러 처리
 * - 자동 재시도 로직  
 * - 캐싱 전략 최적화
 * - 로딩 상태 관리
 * - Feature별 쿼리 키 관리
 * 
 * 사용 예시:
 * ```typescript
 * const productQuery = useFeatureQuery({
 *   feature: 'product',
 *   operation: 'list', 
 *   queryFn: () => getProductListUseCase.execute(request),
 *   params: { filters, page }
 * });
 * ```
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useAppStore } from '../stores/appStore';
import { createQueryKey } from '@app/providers/QueryProvider';
import { cacheStrategyManager } from '../cache/CacheStrategyManager';
import { smartInvalidationManager } from '../cache/SmartInvalidationManager';

/**
 * Feature Query 옵션 타입
 */
export interface UseFeatureQueryOptions<TData = unknown, TError = Error, TVariables = unknown> {
  feature: string;
  operation: string;
  params?: Record<string, any>;
  queryFn: () => Promise<TData>;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  retryOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  onSuccess?: (data: TData) => void;
  onError?: (error: TError) => void;
  // TanStack Query v5 옵션들을 확장할 수 있도록
  queryOptions?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>;
}

/**
 * Feature Mutation 옵션 타입
 */
export interface UseFeatureMutationOptions<TData = unknown, TError = Error, TVariables = unknown> {
  feature: string;
  operation: string;
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
  invalidateQueries?: readonly (readonly (string | number | object)[])[] | 'all';
  optimisticUpdate?: (variables: TVariables) => void;
  mutationOptions?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>;
}

/**
 * Feature Query Result 타입
 */
export interface FeatureQueryResult<TData = unknown, TError = Error> {
  data: TData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: TError | null;
  isSuccess: boolean;
  isFetching: boolean;
  isStale: boolean;
  refetch: () => void;
}

/**
 * Feature Mutation Result 타입
 */
export interface FeatureMutationResult<TData = unknown, TError = Error, TVariables = unknown> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: TError | null;
  isSuccess: boolean;
  reset: () => void;
}

/**
 * 표준화된 Feature Query Hook
 */
export function useFeatureQuery<TData = unknown, TError = Error>({
  feature,
  operation,
  params,
  queryFn,
  enabled = true,
  staleTime,
  gcTime,
  retryOnMount,
  refetchOnWindowFocus,
  onSuccess,
  onError,
  queryOptions,
}: UseFeatureQueryOptions<TData, TError>): FeatureQueryResult<TData, TError> {
  
  const { ui } = useAppStore();
  const { errors } = useAppStore();

  // 지능형 캐시 정책 가져오기
  const cachePolicy = cacheStrategyManager.getCachePolicy(feature, operation);
  
  // 쿼리 키 생성
  const queryKey = createQueryKey.feature(feature, operation, params);

  // 캐시 히트 추적용 시작 시간
  const startTime = Date.now();

  // TanStack Query 실행
  const queryResult = useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      try {
        // 로딩 상태 설정
        ui.setLoading(`${feature}-${operation}`, true);
        
        const result = await queryFn();
        
        // 캐시 히트 통계 기록 (성공)
        const responseTime = Date.now() - startTime;
        cacheStrategyManager.recordCacheHit(feature, operation, false, responseTime);
        
        // 성공 콜백
        onSuccess?.(result);
        
        // Feature별 에러 정리
        errors.clearFeatureErrors(feature);
        
        return result;
      } catch (error) {
        // 에러 추가
        errors.addFeatureError(feature, {
          code: `${feature.toUpperCase()}_${operation.toUpperCase()}_ERROR`,
          message: error instanceof Error ? error.message : 'Unknown query error',
          context: { feature, operation, params }
        });
        
        // 에러 콜백
        onError?.(error as TError);
        
        throw error;
      } finally {
        // 로딩 상태 해제
        ui.setLoading(`${feature}-${operation}`, false);
      }
    },
    enabled,
    // 지능형 캐시 정책 적용
    staleTime: staleTime ?? cachePolicy.staleTime,
    gcTime: gcTime ?? cachePolicy.gcTime,
    retryOnMount: retryOnMount ?? cachePolicy.refetchOnMount,
    refetchOnWindowFocus: refetchOnWindowFocus ?? cachePolicy.refetchOnWindowFocus,
    refetchOnReconnect: cachePolicy.refetchOnReconnect,
    networkMode: cachePolicy.networkMode,
    retry: (failureCount, error: any) => {
      // 지능형 재시도 로직
      if (error?.status >= 400 && error?.status < 500) {
        return false; // 클라이언트 에러는 재시도 안함
      }
      return failureCount < cachePolicy.retryCount;
    },
    retryDelay: cachePolicy.retryDelay,
    ...queryOptions,
  });

  // 캐시 히트 통계 기록 (캐시에서 가져온 경우)
  if (!queryResult.isFetching && queryResult.data !== undefined) {
    const responseTime = Date.now() - startTime;
    cacheStrategyManager.recordCacheHit(feature, operation, true, responseTime);
  }

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    isSuccess: queryResult.isSuccess,
    isFetching: queryResult.isFetching,
    isStale: queryResult.isStale,
    refetch: queryResult.refetch,
  };
}

/**
 * 표준화된 Feature Mutation Hook
 */
export function useFeatureMutation<TData = unknown, TError = Error, TVariables = unknown>({
  feature,
  operation,
  mutationFn,
  onSuccess,
  onError,
  invalidateQueries,
  optimisticUpdate,
  mutationOptions,
}: UseFeatureMutationOptions<TData, TError, TVariables>): FeatureMutationResult<TData, TError, TVariables> {
  
  const queryClient = useQueryClient();
  const { ui, errors } = useAppStore();

  // SmartInvalidationManager에 QueryClient 설정
  if (!smartInvalidationManager['queryClient']) {
    smartInvalidationManager.setQueryClient(queryClient);
  }

  const mutationResult = useMutation<TData, TError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      try {
        // 로딩 상태 설정
        ui.setLoading(`${feature}-${operation}`, true);
        
        // 낙관적 업데이트 실행
        optimisticUpdate?.(variables);
        
        const result = await mutationFn(variables);
        
        return result;
      } catch (error) {
        // 에러 추가
        errors.addFeatureError(feature, {
          code: `${feature.toUpperCase()}_${operation.toUpperCase()}_ERROR`,
          message: error instanceof Error ? error.message : 'Unknown mutation error',
          context: { feature, operation, variables }
        });
        
        throw error;
      } finally {
        // 로딩 상태 해제
        ui.setLoading(`${feature}-${operation}`, false);
      }
    },
    onSuccess: (data, variables, context) => {
      // 지능형 무효화 시스템 트리거
      smartInvalidationManager.triggerInvalidation({
        feature,
        operation,
        data,
        metadata: { variables },
        // TODO: 실제 사용자 ID 가져오기
        userId: 'current-user-id',
      });

      // 레거시 무효화 지원 (하위 호환성)
      if (invalidateQueries) {
        if (invalidateQueries === 'all') {
          queryClient.invalidateQueries({
            queryKey: [feature],
          });
        } else {
          invalidateQueries.forEach(queryKey => {
            queryClient.invalidateQueries({
              queryKey,
            });
          });
        }
      }

      // Feature별 에러 정리
      errors.clearFeatureErrors(feature);
      
      // 성공 알림
      ui.addNotification({
        type: 'success',
        title: '작업 완료',
        message: `${operation} 작업이 성공적으로 완료되었습니다.`,
        autoClose: true,
      });

      // 사용자 성공 콜백
      onSuccess?.(data, variables);
    },
    onError: (error, variables, context) => {
      // 에러 알림
      ui.addNotification({
        type: 'error',
        title: '작업 실패',
        message: error instanceof Error ? error.message : '작업 중 오류가 발생했습니다.',
        autoClose: false,
      });

      // 사용자 에러 콜백
      onError?.(error, variables);
    },
    ...mutationOptions,
  });

  return {
    mutate: mutationResult.mutate,
    mutateAsync: mutationResult.mutateAsync,
    data: mutationResult.data,
    isLoading: mutationResult.isPending, // TanStack Query v5에서는 isPending
    isError: mutationResult.isError,
    error: mutationResult.error,
    isSuccess: mutationResult.isSuccess,
    reset: mutationResult.reset,
  };
}

/**
 * Feature별 특화된 Query Hook 생성기
 */
export function createFeatureQueryHooks(featureName: string) {
  return {
    /**
     * Feature별 Query Hook
     */
    useQuery: <TData = unknown, TError = Error>(
      operation: string,
      queryFn: () => Promise<TData>,
      options?: Omit<UseFeatureQueryOptions<TData, TError>, 'feature' | 'operation' | 'queryFn'>
    ) => useFeatureQuery<TData, TError>({
      ...options,
      feature: featureName,
      operation,
      queryFn,
    }),

    /**
     * Feature별 Mutation Hook
     */
    useMutation: <TData = unknown, TError = Error, TVariables = unknown>(
      operation: string,
      mutationFn: (variables: TVariables) => Promise<TData>,
      options?: Omit<UseFeatureMutationOptions<TData, TError, TVariables>, 'feature' | 'operation' | 'mutationFn'>
    ) => useFeatureMutation<TData, TError, TVariables>({
      ...options,
      feature: featureName,
      operation,
      mutationFn,
    }),
  };
}

/**
 * 페이지네이션을 위한 Feature Query Hook
 */
export function useFeaturePaginatedQuery<TData = unknown, TError = Error>({
  feature,
  operation,
  page,
  pageSize,
  queryFn,
  ...options
}: UseFeatureQueryOptions<TData, TError> & {
  page: number;
  pageSize: number;
}): FeatureQueryResult<TData, TError> & {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  fetchNextPage: () => void;
  fetchPreviousPage: () => void;
} {
  const query = useFeatureQuery({
    ...options,
    feature,
    operation,
    params: { page, pageSize, ...options.params },
    queryFn,
  });

  return {
    ...query,
    hasNextPage: true, // TODO: 실제 페이지네이션 로직 구현
    hasPreviousPage: page > 1,
    fetchNextPage: () => {
      // TODO: 다음 페이지 fetch 로직 구현
    },
    fetchPreviousPage: () => {
      // TODO: 이전 페이지 fetch 로직 구현
    },
  };
}

/**
 * 무한 스크롤을 위한 Feature Query Hook
 */
export function useFeatureInfiniteQuery<TData = unknown, TError = Error>({
  feature,
  operation,
  queryFn,
  ...options
}: Omit<UseFeatureQueryOptions<TData, TError>, 'queryFn'> & {
  queryFn: (pageParam: any) => Promise<TData>;
}) {
  // TODO: useInfiniteQuery 구현
  // TanStack Query v5의 useInfiniteQuery 활용
  
  return {
    data: undefined,
    fetchNextPage: () => {},
    hasNextPage: false,
    isFetchingNextPage: false,
    // ... 기타 infinite query 관련 속성들
  };
}