/**
 * 애플리케이션 초기화 관리자
 * 
 * 새로운 Feature-First DI 시스템으로의 전환을 관리
 * - Feature별 DI 모듈 초기화
 * - 의존성 순서 관리 (Product → BOM)
 * - 환경별 설정 분기
 * - 초기화 상태 추적
 * 
 * 기존 DIContainer.ts를 대체하는 현대적인 시스템
 */

import { ProductDIModule } from '@features/product/config/ProductDIModule';
import { BOMDIModule } from '@features/bom/config/BOMDIModule';

/**
 * 초기화 결과 인터페이스
 */
export interface InitializationResult {
  success: boolean;
  initializedFeatures: string[];
  errors: string[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

/**
 * 애플리케이션 초기화 옵션
 */
export interface AppInitializationOptions {
  useMockData?: boolean;
  enableDebugMode?: boolean;
  features?: string[];
  skipFailedFeatures?: boolean;
}

/**
 * 애플리케이션 초기화 관리자 클래스
 */
export class AppInitializer {
  private static initialized = false;
  private static initializationResult: InitializationResult | null = null;

  /**
   * 애플리케이션 DI 시스템 초기화
   * @param options 초기화 옵션
   */
  static async initialize(options: AppInitializationOptions = {}): Promise<InitializationResult> {
    if (this.initialized && !options.enableDebugMode) {
      console.warn('⚠️ Application already initialized. Skipping re-initialization.');
      return this.initializationResult!;
    }

    const result: InitializationResult = {
      success: false,
      initializedFeatures: [],
      errors: [],
      startTime: new Date(),
    };

    try {
      console.log('🚀 Starting Application DI System initialization...');
      
      // 환경 설정 결정
      const useMockData = options.useMockData ?? (process.env.REACT_APP_USE_MOCK_DATA !== 'false');
      const enabledFeatures = options.features ?? ['product', 'bom'];
      
      console.log(`📋 Configuration:
        - Mock Data: ${useMockData ? 'Enabled' : 'Disabled'}
        - Debug Mode: ${options.enableDebugMode ? 'Enabled' : 'Disabled'}
        - Features: ${enabledFeatures.join(', ')}
      `);

      // Feature별 초기화 (의존성 순서 중요!)
      await this.initializeFeatures(enabledFeatures, useMockData, result, options.skipFailedFeatures ?? false);

      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();
      result.success = result.errors.length === 0 || ((options.skipFailedFeatures ?? false) && result.initializedFeatures.length > 0);

      this.initialized = result.success;
      this.initializationResult = result;

      if (result.success) {
        console.log(`✅ Application DI System initialized successfully in ${result.duration}ms`);
        console.log(`📦 Initialized Features: ${result.initializedFeatures.join(', ')}`);
        
        if (options.enableDebugMode) {
          this.printDebugInfo();
        }
      } else {
        console.error('❌ Application DI System initialization failed');
        console.error('Errors:', result.errors);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      result.errors.push(errorMessage);
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();
      
      console.error('💥 Critical initialization error:', error);
    }

    return result;
  }

  /**
   * Feature별 의존성 주입 모듈 초기화
   */
  private static async initializeFeatures(
    features: string[],
    useMockData: boolean,
    result: InitializationResult,
    skipFailedFeatures = false
  ): Promise<void> {
    
    // Product Feature 초기화 (다른 Feature의 기반)
    if (features.includes('product')) {
      try {
        ProductDIModule.initialize(undefined, useMockData);
        result.initializedFeatures.push('Product');
        console.log('  ✅ Product Feature initialized');
      } catch (error) {
        const errorMsg = `Product Feature initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error('  ❌', errorMsg);
        
        if (!skipFailedFeatures) {
          throw error;
        }
      }
    }

    // BOM Feature 초기화 (Product Feature 의존성 필요)
    if (features.includes('bom')) {
      try {
        // Product Feature가 성공적으로 초기화된 경우에만 진행
        if (result.initializedFeatures.includes('Product')) {
          BOMDIModule.initialize(undefined, useMockData);
          result.initializedFeatures.push('BOM');
          console.log('  ✅ BOM Feature initialized');
        } else {
          throw new Error('BOM Feature requires Product Feature to be initialized first');
        }
      } catch (error) {
        const errorMsg = `BOM Feature initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error('  ❌', errorMsg);
        
        if (!skipFailedFeatures) {
          throw error;
        }
      }
    }

    // TODO: 향후 추가 Feature들
    // if (features.includes('inventory')) { ... }
    // if (features.includes('production')) { ... }
  }

  /**
   * 디버그 정보 출력
   */
  private static printDebugInfo(): void {
    console.log('🔍 Debug Information:');
    
    try {
      // Product Feature 의존성 상태
      if (ProductDIModule.isInitialized()) {
        console.log('📦 Product Feature:');
        import('@features/product/config/ProductDIModule').then(module => {
          module.ProductDIDebug.listRegistered();
        });
      }

      // BOM Feature 의존성 상태  
      if (BOMDIModule.isInitialized()) {
        console.log('📦 BOM Feature:');
        import('@features/bom/config/BOMDIModule').then(module => {
          module.BOMDIDebug.listRegistered();
          module.BOMDIDebug.checkCrossFeatureDependencies();
        });
      }
    } catch (error) {
      console.error('Debug info generation failed:', error);
    }
  }

  /**
   * 애플리케이션 종료 시 정리 작업
   */
  static cleanup(): void {
    try {
      console.log('🧹 Cleaning up DI System...');
      
      // Feature별 정리 (역순)
      if (BOMDIModule.isInitialized()) {
        BOMDIModule.cleanup();
      }
      
      if (ProductDIModule.isInitialized()) {
        ProductDIModule.cleanup();
      }

      this.initialized = false;
      this.initializationResult = null;
      
      console.log('✅ DI System cleanup completed');
    } catch (error) {
      console.error('❌ DI System cleanup failed:', error);
    }
  }

  /**
   * 초기화 상태 확인
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 초기화 결과 조회
   */
  static getInitializationResult(): InitializationResult | null {
    return this.initializationResult;
  }

  /**
   * 특정 Feature가 초기화되었는지 확인
   */
  static isFeatureInitialized(featureName: string): boolean {
    return this.initializationResult?.initializedFeatures.includes(featureName) ?? false;
  }

  /**
   * 런타임 상태 점검 (Health Check)
   */
  static healthCheck(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!this.initialized) {
      issues.push('DI System not initialized');
    }

    if (!ProductDIModule.isInitialized()) {
      issues.push('Product Feature not initialized');
    }

    if (!BOMDIModule.isInitialized()) {
      issues.push('BOM Feature not initialized');
    }

    // TODO: 추가 상태 점검 로직

    return {
      healthy: issues.length === 0,
      issues,
    };
  }
}

/**
 * 개발 환경용 빠른 초기화 헬퍼
 */
export const initializeDevEnvironment = async (): Promise<InitializationResult> => {
  return AppInitializer.initialize({
    useMockData: true,
    enableDebugMode: true,
    features: ['product', 'bom'],
    skipFailedFeatures: true,
  });
};

/**
 * 프로덕션 환경용 초기화 헬퍼
 */
export const initializeProductionEnvironment = async (): Promise<InitializationResult> => {
  return AppInitializer.initialize({
    useMockData: false,
    enableDebugMode: false,
    features: ['product', 'bom'],
    skipFailedFeatures: false,
  });
};

/**
 * 테스트 환경용 초기화 헬퍼
 */
export const initializeTestEnvironment = async (): Promise<InitializationResult> => {
  return AppInitializer.initialize({
    useMockData: true,
    enableDebugMode: false,
    features: ['product', 'bom'],
    skipFailedFeatures: false,
  });
};

/**
 * React 개발 도구를 위한 전역 객체 노출 (개발 환경에서만)
 */
if (process.env.NODE_ENV === 'development') {
  (window as any).__MES_DI_SYSTEM__ = {
    AppInitializer,
    ProductDIModule,
    BOMDIModule,
    healthCheck: AppInitializer.healthCheck,
    cleanup: AppInitializer.cleanup,
  };
  
  console.log('🔧 MES DI System exposed to window.__MES_DI_SYSTEM__ for debugging');
}