import React, { Suspense, lazy, ComponentType } from 'react';
import { ErrorBoundary } from '@shared/components/common/ErrorBoundary';
import styled from 'styled-components';

/**
 * 로딩 스피너 스타일
 */
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 40px;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  color: #6c757d;
  font-size: 14px;
  text-align: center;
`;

/**
 * 지연 로딩 옵션
 */
interface LazyLoadOptions {
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<any>;
  delay?: number;
  retryCount?: number;
  preload?: boolean;
  chunkName?: string;
}

/**
 * 기본 로딩 컴포넌트
 */
const DefaultLoadingFallback: React.FC<{ message?: string }> = ({ 
  message = '컴포넌트를 불러오는 중...' 
}) => (
  <LoadingContainer>
    <Spinner />
    <LoadingText>{message}</LoadingText>
  </LoadingContainer>
);

/**
 * 기본 에러 컴포넌트
 */
const DefaultErrorFallback: React.FC<{ error?: Error; retry?: () => void }> = ({ 
  error, 
  retry 
}) => (
  <LoadingContainer>
    <div style={{ color: '#dc3545', marginBottom: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
        컴포넌트 로드 실패
      </div>
      <div style={{ fontSize: '14px', color: '#6c757d' }}>
        {error?.message || '컴포넌트를 불러오는 중 오류가 발생했습니다.'}
      </div>
    </div>
    {retry && (
      <button
        onClick={retry}
        style={{
          padding: '8px 16px',
          border: '1px solid #007bff',
          background: '#007bff',
          color: 'white',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        다시 시도
      </button>
    )}
  </LoadingContainer>
);

/**
 * 지연 로딩 상태 관리
 */
class LazyLoadManager {
  private loadedChunks = new Set<string>();
  private preloadedChunks = new Set<string>();
  private retryCount = new Map<string, number>();

  /**
   * 청크 로드 상태 확인
   */
  isChunkLoaded(chunkName: string): boolean {
    return this.loadedChunks.has(chunkName);
  }

  /**
   * 청크 로드 완료 표시
   */
  markChunkLoaded(chunkName: string): void {
    this.loadedChunks.add(chunkName);
  }

  /**
   * 청크 프리로드 상태 확인
   */
  isChunkPreloaded(chunkName: string): boolean {
    return this.preloadedChunks.has(chunkName);
  }

  /**
   * 청크 프리로드 완료 표시
   */
  markChunkPreloaded(chunkName: string): void {
    this.preloadedChunks.add(chunkName);
  }

  /**
   * 재시도 횟수 증가
   */
  incrementRetryCount(chunkName: string): number {
    const current = this.retryCount.get(chunkName) || 0;
    const newCount = current + 1;
    this.retryCount.set(chunkName, newCount);
    return newCount;
  }

  /**
   * 재시도 횟수 초기화
   */
  resetRetryCount(chunkName: string): void {
    this.retryCount.delete(chunkName);
  }

  /**
   * 현재 재시도 횟수 조회
   */
  getRetryCount(chunkName: string): number {
    return this.retryCount.get(chunkName) || 0;
  }
}

// 글로벌 매니저 인스턴스
const lazyLoadManager = new LazyLoadManager();

/**
 * 지연 로딩 래퍼 컴포넌트
 */
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<any>;
  chunkName?: string;
  retryCount?: number;
}

const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback: FallbackComponent = DefaultLoadingFallback,
  errorFallback: ErrorFallbackComponent = DefaultErrorFallback,
  chunkName = 'unknown',
  retryCount = 3,
}) => {
  const [retryKey, setRetryKey] = React.useState(0);

  const handleRetry = React.useCallback(() => {
    const currentRetryCount = lazyLoadManager.getRetryCount(chunkName);
    
    if (currentRetryCount < retryCount) {
      lazyLoadManager.incrementRetryCount(chunkName);
      setRetryKey(prev => prev + 1);
    } else {
      console.error(`Max retry count (${retryCount}) reached for chunk: ${chunkName}`);
    }
  }, [chunkName, retryCount]);

  const handleError = React.useCallback((error: Error) => {
    console.error(`Lazy loading error for chunk ${chunkName}:`, error);
    
    // 성능 모니터링 (실제 환경에서는 analytics 서비스로 전송)
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Lazy Load Error', {
        chunkName,
        error: error.message,
        retryCount: lazyLoadManager.getRetryCount(chunkName),
      });
    }
  }, [chunkName]);

  return (
    <ErrorBoundary
      key={retryKey}
      onError={handleError}
      fallback={<ErrorFallbackComponent error={new Error(`Failed to load ${chunkName}`)} retry={handleRetry} />}
    >
      <Suspense fallback={<FallbackComponent />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * 고급 지연 로딩 함수
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): ComponentType<React.ComponentProps<T>> {
  const {
    fallback: FallbackComponent = DefaultLoadingFallback,
    errorFallback: ErrorFallbackComponent = DefaultErrorFallback,
    delay = 0,
    retryCount = 3,
    preload = false,
    chunkName = 'lazy-component',
  } = options;

  // 지연시간이 있는 경우 Promise에 delay 추가
  const delayedImportFunc = delay > 0
    ? () => Promise.all([
        importFunc(),
        new Promise(resolve => setTimeout(resolve, delay))
      ]).then(([module]) => module)
    : importFunc;

  // 재시도 로직이 포함된 import 함수
  const retryableImportFunc = async (): Promise<{ default: T }> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const module = await delayedImportFunc();
        lazyLoadManager.markChunkLoaded(chunkName);
        lazyLoadManager.resetRetryCount(chunkName);
        return module;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Lazy load attempt ${attempt + 1} failed for ${chunkName}:`, error);
        
        // 마지막 시도가 아니면 잠시 대기
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError || new Error(`Failed to load ${chunkName} after ${retryCount + 1} attempts`);
  };

  const LazyComponent = lazy(retryableImportFunc);

  const WrappedComponent: ComponentType<React.ComponentProps<T>> = (props) => (
    <LazyWrapper
      fallback={FallbackComponent}
      errorFallback={ErrorFallbackComponent}
      chunkName={chunkName}
      retryCount={retryCount}
    >
      <LazyComponent {...props} />
    </LazyWrapper>
  );

  // 프리로드 기능
  if (preload && typeof window !== 'undefined') {
    // 페이지 로드 후 아이들 시간에 프리로드 (폴리필을 즉시 정의하여 TDZ 회피)
    const scheduleIdle = (window.requestIdleCallback || function(cb: IdleRequestCallback) {
      const start = Date.now();
      return setTimeout(() => {
        cb({
          didTimeout: false,
          timeRemaining() {
            return Math.max(0, 50 - (Date.now() - start));
          },
        } as any);
      }, 1);
    }) as any;

    scheduleIdle(() => {
      if (!lazyLoadManager.isChunkPreloaded(chunkName)) {
        importFunc()
          .then(() => {
            lazyLoadManager.markChunkPreloaded(chunkName);
            console.log(`Preloaded chunk: ${chunkName}`);
          })
          .catch(error => {
            console.warn(`Preload failed for chunk ${chunkName}:`, error);
          });
      }
    });
  }

  // 컴포넌트에 preload 메서드 추가
  (WrappedComponent as any).preload = () => {
    if (!lazyLoadManager.isChunkPreloaded(chunkName)) {
      return importFunc().then(() => {
        lazyLoadManager.markChunkPreloaded(chunkName);
      });
    }
    return Promise.resolve();
  };

  return WrappedComponent;
}

/**
 * 미리 정의된 지연 로딩 컴포넌트들
 */

// BOM 관련 컴포넌트들
export const LazyBOMTreeTable = lazyLoad(
  () => import('@features/bom/presentation/components/bom/BOMTreeTable').then(module => ({ default: module.BOMTreeTable })),
  {
    chunkName: 'bom-tree-table',
    fallback: () => <DefaultLoadingFallback message="BOM 트리 테이블을 불러오는 중..." />,
    preload: true,
  }
);

export const LazyBOMCompareModal = lazyLoad(
  () => import('@features/bom/presentation/components/bom/BOMCompareModal').then(module => ({ default: module.BOMCompareModal })),
  {
    chunkName: 'bom-compare-modal',
    fallback: () => <DefaultLoadingFallback message="BOM 비교 모달을 불러오는 중..." />,
  }
);

export const LazyBOMItemModal = lazyLoad(
  () => import('@features/bom/presentation/components/BOMItemModal').then(module => ({ default: module.BOMItemModal })),
  {
    chunkName: 'bom-item-modal',
    fallback: () => <DefaultLoadingFallback message="BOM 아이템 모달을 불러오는 중..." />,
  }
);

export const LazyBOMCopyModal = lazyLoad(
  () => import('@features/bom/presentation/components/BOMCopyModal').then(module => ({ default: module.BOMCopyModal })),
  {
    chunkName: 'bom-copy-modal',
    fallback: () => <DefaultLoadingFallback message="BOM 복사 모달을 불러오는 중..." />,
  }
);

export const LazyBOMStatistics = lazyLoad(
  () => import('@features/bom/presentation/components/bom/BOMStatistics').then(module => ({ default: module.BOMStatistics })),
  {
    chunkName: 'bom-statistics',
    fallback: () => <DefaultLoadingFallback message="BOM 통계를 불러오는 중..." />,
  }
);

export const LazyVirtualizedBOMTree = lazyLoad(
  () => import('@features/bom/presentation/components/bom/VirtualizedBOMTree').then(module => ({ default: module.VirtualizedBOMTree })),
  {
    chunkName: 'virtualized-bom-tree',
    fallback: () => <DefaultLoadingFallback message="가상화된 BOM 트리를 불러오는 중..." />,
  }
);

// 제품 관리 컴포넌트들
export const LazyProductFormModal = lazyLoad(
  () => import('@features/product/presentation/components/ProductFormModal').then(module => ({ default: module.ProductFormModal })),
  {
    chunkName: 'product-form-modal',
    fallback: () => <DefaultLoadingFallback message="제품 폼 모달을 불러오는 중..." />,
  }
);

export const LazyProductTable = lazyLoad(
  () => import('@features/product/presentation/components/product/ProductTable').then(module => ({ default: module.ProductTable })),
  {
    chunkName: 'product-table',
    fallback: () => <DefaultLoadingFallback message="제품 테이블을 불러오는 중..." />,
    preload: true,
  }
);

// 네비게이션 컴포넌트
export const LazyNavigation = lazyLoad(
  () => import('@shared/components/navigation/Navigation').then(module => ({ default: module.Navigation })),
  {
    chunkName: 'navigation',
    fallback: () => <DefaultLoadingFallback message="네비게이션을 불러오는 중..." />,
    preload: true,
  }
);

/**
 * 라우트 기반 코드 스플리팅
 */

// 페이지 컴포넌트들
export const LazyProductManagementPage = lazyLoad(
  () => import('@features/product/presentation/pages/ProductManagementPage').then(module => ({ default: module.ProductManagementPage })),
  {
    chunkName: 'product-management-page',
    fallback: () => <DefaultLoadingFallback message="제품 관리 페이지를 불러오는 중..." />,
    preload: true,
  }
);

export const LazyBOMManagementPage = lazyLoad(
  () => import('@features/bom/presentation/pages/BOMManagementPage').then(module => ({ default: module.BOMManagementPage })),
  {
    chunkName: 'bom-management-page',
    fallback: () => <DefaultLoadingFallback message="BOM 관리 페이지를 불러오는 중..." />,
    preload: true,
  }
);

export const LazyDashboardPage = lazyLoad(
  () => Promise.resolve({ default: () => <div>대시보드 페이지 (개발 중)</div> }),
  {
    chunkName: 'dashboard-page',
    fallback: () => <DefaultLoadingFallback message="대시보드를 불러오는 중..." />,
  }
);

export const LazyInventoryPage = lazyLoad(
  () => Promise.resolve({ default: () => <div>재고 관리 페이지 (개발 중)</div> }),
  {
    chunkName: 'inventory-page',
    fallback: () => <DefaultLoadingFallback message="재고 관리 페이지를 불러오는 중..." />,
  }
);

export const LazyProductionPage = lazyLoad(
  () => Promise.resolve({ default: () => <div>생산 관리 페이지 (개발 중)</div> }),
  {
    chunkName: 'production-page',
    fallback: () => <DefaultLoadingFallback message="생산 관리 페이지를 불러오는 중..." />,
  }
);

export const LazyQualityPage = lazyLoad(
  () => Promise.resolve({ default: () => <div>품질 관리 페이지 (개발 중)</div> }),
  {
    chunkName: 'quality-page',
    fallback: () => <DefaultLoadingFallback message="품질 관리 페이지를 불러오는 중..." />,
  }
);

export const LazyReportsPage = lazyLoad(
  () => Promise.resolve({ default: () => <div>보고서 페이지 (개발 중)</div> }),
  {
    chunkName: 'reports-page',
    fallback: () => <DefaultLoadingFallback message="보고서 페이지를 불러오는 중..." />,
  }
);

export const LazySettingsPage = lazyLoad(
  () => Promise.resolve({ default: () => <div>설정 페이지 (개발 중)</div> }),
  {
    chunkName: 'settings-page',
    fallback: () => <DefaultLoadingFallback message="설정 페이지를 불러오는 중..." />,
  }
);

/**
 * 번들 분석 유틸리티
 */
export const BundleAnalysis = {
  /**
   * 로드된 청크 정보 조회
   */
  getLoadedChunks(): string[] {
    return Array.from(lazyLoadManager['loadedChunks']);
  },

  /**
   * 프리로드된 청크 정보 조회
   */
  getPreloadedChunks(): string[] {
    return Array.from(lazyLoadManager['preloadedChunks']);
  },

  /**
   * 번들 크기 정보 출력 (개발 환경)
   */
  logBundleInfo(): void {
    if (process.env.NODE_ENV === 'development') {
      console.group('📦 Bundle Analysis');
      console.log('Loaded chunks:', this.getLoadedChunks());
      console.log('Preloaded chunks:', this.getPreloadedChunks());
      console.log('Available chunks:', [
        'bom-tree-table',
        'bom-compare-modal',
        'bom-item-modal',
        'bom-copy-modal',
        'bom-statistics',
        'virtualized-bom-tree',
        'product-form-modal',
        'product-table',
        'navigation',
        'product-management-page',
        'bom-management-page',
        'dashboard-page',
        'inventory-page',
        'production-page',
        'quality-page',
        'reports-page',
        'settings-page',
      ]);
      console.groupEnd();
    }
  },

  /**
   * 모든 컴포넌트 프리로드
   */
  preloadAllComponents(): Promise<void[]> {
    const preloadPromises = [
      LazyBOMTreeTable,
      LazyProductTable,
      LazyNavigation,
      LazyProductManagementPage,
    ].map(component => (component as any).preload?.());

    return Promise.all(preloadPromises.filter(Boolean));
  },
};

// 하단 폴리필은 상단에서 inline 정의로 대체