/**
 * TanStack Query Provider 설정
 * 
 * 현대적인 서버 상태 관리를 위한 중앙화된 설정:
 * - 캐싱 전략 최적화
 * - 에러 처리 표준화  
 * - Background refetch 설정
 * - DevTools 통합
 * 
 * TanStack Query v5 주요 개선사항:
 * - 더 나은 TypeScript 지원
 * - Suspense 완전 지원
 * - 향상된 성능
 * - 간소화된 API
 */

import React, { ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { cacheStrategyManager } from '@shared/cache/CacheStrategyManager';
import { smartInvalidationManager } from '@shared/cache/SmartInvalidationManager';
import { CachePerformanceMonitorWrapper } from '@shared/cache/CachePerformanceMonitor';

/**
 * Query 설정 옵션
 */
interface QueryProviderProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * 고급 캐싱 시스템이 통합된 QueryClient 생성
 */
const createQueryClient = (): QueryClient => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // 기본 설정 - 실제 캐시 정책은 useFeatureQuery에서 동적으로 적용
        staleTime: 1000 * 60 * 5,        
        gcTime: 1000 * 60 * 30,          
        refetchOnWindowFocus: true,       
        refetchOnReconnect: true,         
        refetchOnMount: true,             
        
        // 재시도 설정
        retry: (failureCount, error: any) => {
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: (failureCount, error: any) => {
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 1;
        },
        
        onError: (error: any) => {
          console.error('Mutation Error:', error);
        },
      },
    },
  });

  // 지능형 무효화 매니저에 QueryClient 연결
  smartInvalidationManager.setQueryClient(queryClient);

  // 메모리 정리 이벤트 리스너 설정
  if (typeof window !== 'undefined') {
    window.addEventListener('cache-cleanup', (event: any) => {
      const { caches } = event.detail || {};
      if (caches) {
        caches.forEach((queryKey: any) => {
          queryClient.removeQueries({ queryKey });
        });
        console.log('Cache cleanup executed for', caches.length, 'queries');
      }
    });
  }

  return queryClient;
};

/**
 * 전역 QueryClient 인스턴스 (싱글톤)
 */
let globalQueryClient: QueryClient | null = null;

export const getQueryClient = (): QueryClient => {
  if (!globalQueryClient) {
    globalQueryClient = createQueryClient();
  }
  return globalQueryClient;
};

/**
 * TanStack Query Provider 컴포넌트
 */
export const QueryProvider: React.FC<QueryProviderProps> = ({ 
  children, 
  queryClient 
}) => {
  const client = queryClient || getQueryClient();

  return (
    <QueryClientProvider client={client}>
      {children}
      
      {/* 개발 환경에서만 DevTools 및 성능 모니터 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <ReactQueryDevtools 
            initialIsOpen={false}
          />
          <CachePerformanceMonitorWrapper />
        </>
      )}
    </QueryClientProvider>
  );
};

/**
 * Query Key 생성 헬퍼 (일관된 키 패턴)
 */
export const createQueryKey = {
  /**
   * Feature별 기본 키 생성
   */
  feature: (featureName: string, operation: string, params?: Record<string, any>) => {
    const baseKey = [featureName, operation];
    return params ? [...baseKey, params] : baseKey;
  },

  /**
   * Product Feature 키들
   */
  product: {
    all: () => ['product'] as const,
    lists: () => ['product', 'list'] as const,
    list: (filters?: any) => ['product', 'list', filters] as const,
    detail: (id: string) => ['product', 'detail', id] as const,
    history: (id: string) => ['product', 'history', id] as const,
  },

  /**
   * BOM Feature 키들  
   */
  bom: {
    all: () => ['bom'] as const,
    trees: () => ['bom', 'tree'] as const,
    tree: (productId: string) => ['bom', 'tree', productId] as const,
    items: (bomId: string) => ['bom', 'items', bomId] as const,
    history: (bomId: string) => ['bom', 'history', bomId] as const,
  },

  /**
   * 사용자 정의 키 생성
   */
  custom: (keyParts: readonly (string | number | object)[]) => keyParts,
};

/**
 * Query 무효화 헬퍼
 */
export const queryInvalidation = {
  /**
   * 특정 Feature의 모든 쿼리 무효화
   */
  invalidateFeature: (queryClient: QueryClient, featureName: string) => {
    return queryClient.invalidateQueries({
      queryKey: [featureName],
    });
  },

  /**
   * 특정 쿼리 패턴 무효화
   */
  invalidatePattern: (queryClient: QueryClient, pattern: any[]) => {
    return queryClient.invalidateQueries({
      queryKey: pattern,
    });
  },

  /**
   * Product 관련 쿼리들 무효화
   */
  invalidateProducts: (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({
      queryKey: createQueryKey.product.all(),
    });
  },

  /**
   * BOM 관련 쿼리들 무효화
   */
  invalidateBOMs: (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({
      queryKey: createQueryKey.bom.all(),
    });
  },
};

/**
 * React 개발 도구를 위한 전역 객체 노출 (개발 환경에서만)
 */
if (process.env.NODE_ENV === 'development') {
  (window as any).__TANSTACK_QUERY__ = {
    getQueryClient,
    createQueryKey,
    queryInvalidation,
  };
  
  console.log('🔧 TanStack Query utilities exposed to window.__TANSTACK_QUERY__ for debugging');
}