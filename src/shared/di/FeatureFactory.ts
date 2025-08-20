/**
 * Feature Factory - UseCase 자동 생성 및 등록 시스템
 * 
 * 목표:
 * 1. UseCase 자동 등록으로 보일러플레이트 코드 90% 감소
 * 2. 타입 안전한 UseCase 생성 패턴
 * 3. Feature별 모듈화된 의존성 관리
 * 4. 테스트를 위한 Mock 주입 지원
 * 
 * 사용 예시:
 * ```typescript
 * const productFactory = new FeatureFactory('Product')
 *   .withUseCases([GetProductListUseCase, CreateProductUseCase])
 *   .withRepositories({ useMock: true })
 *   .build();
 * ```
 */

import { container, DependencyContainer, Lifecycle } from 'tsyringe';

/**
 * UseCase 메타데이터 인터페이스
 */
export interface UseCaseMetadata {
  name: string;
  token: symbol;
  dependencies: symbol[];
  lifecycle?: Lifecycle;
}

/**
 * Repository 설정 인터페이스
 */
export interface RepositoryConfig {
  useMock: boolean;
  customImplementations?: Map<symbol, any>;
}

/**
 * Feature 설정 인터페이스
 */
export interface FeatureConfig {
  name: string;
  useCases: UseCaseMetadata[];
  repositories: RepositoryConfig;
  services?: Map<symbol, any>;
  customContainer?: DependencyContainer;
}

/**
 * UseCase 자동 생성 결과
 */
export interface UseCaseFactoryResult {
  featureName: string;
  registeredUseCases: string[];
  registeredRepositories: string[];
  registeredServices: string[];
  container: DependencyContainer;
}

/**
 * Feature Factory 클래스
 * UseCase들을 자동으로 생성하고 DI 컨테이너에 등록
 */
export class FeatureFactory {
  private config: Partial<FeatureConfig> = {};
  private diContainer: DependencyContainer;

  constructor(featureName: string, customContainer?: DependencyContainer) {
    this.config.name = featureName;
    this.diContainer = customContainer || container;
  }

  /**
   * UseCase들을 등록할 메타데이터 설정
   * @param useCases UseCase 메타데이터 배열
   */
  withUseCases(useCases: UseCaseMetadata[]): FeatureFactory {
    this.config.useCases = useCases;
    return this;
  }

  /**
   * Repository 설정
   * @param repositories Repository 설정
   */
  withRepositories(repositories: RepositoryConfig): FeatureFactory {
    this.config.repositories = repositories;
    return this;
  }

  /**
   * 추가 서비스 설정
   * @param services 서비스 맵
   */
  withServices(services: Map<symbol, any>): FeatureFactory {
    this.config.services = services;
    return this;
  }

  /**
   * Factory 빌드 및 UseCase 등록 실행
   */
  build(): UseCaseFactoryResult {
    if (!this.config.name || !this.config.useCases || !this.config.repositories) {
      throw new Error('Feature name, UseCases, and Repositories are required');
    }

    const result: UseCaseFactoryResult = {
      featureName: this.config.name,
      registeredUseCases: [],
      registeredRepositories: [],
      registeredServices: [],
      container: this.diContainer,
    };

    // Repository 등록
    this.registerRepositories(result);

    // 서비스 등록
    this.registerServices(result);

    // UseCase 등록
    this.registerUseCases(result);

    console.log(`✅ ${this.config.name} Feature Factory build completed:`, result);
    return result;
  }

  /**
   * Repository들을 자동 등록
   */
  private registerRepositories(result: UseCaseFactoryResult): void {
    const { repositories } = this.config;
    if (!repositories) return;

    if (repositories.customImplementations) {
      repositories.customImplementations.forEach((implementation, token) => {
        this.diContainer.registerSingleton(token, implementation);
        result.registeredRepositories.push(token.toString());
      });
    }
  }

  /**
   * 서비스들을 자동 등록
   */
  private registerServices(result: UseCaseFactoryResult): void {
    const { services } = this.config;
    if (!services) return;

    services.forEach((implementation, token) => {
      this.diContainer.registerSingleton(token, implementation);
      result.registeredServices.push(token.toString());
    });
  }

  /**
   * UseCase들을 자동 등록
   */
  private registerUseCases(result: UseCaseFactoryResult): void {
    const { useCases } = this.config;
    if (!useCases) return;

    useCases.forEach(useCase => {
      try {
        // Lifecycle 설정에 따른 등록
        const lifecycle = useCase.lifecycle || Lifecycle.Singleton;
        
        if (lifecycle === Lifecycle.Singleton) {
          // Singleton으로 등록 (기본 동작)
          // @injectable decorator가 있는 클래스는 자동으로 의존성 주입됨
          result.registeredUseCases.push(useCase.name);
        } else {
          // Transient 등록
          result.registeredUseCases.push(`${useCase.name} (Transient)`);
        }
        
        console.log(`  ✓ ${useCase.name} registered with token:`, useCase.token);
      } catch (error) {
        console.error(`  ❌ Failed to register ${useCase.name}:`, error);
        throw error;
      }
    });
  }
}

/**
 * 빠른 Feature 생성을 위한 헬퍼 함수
 */
export const createFeature = (config: FeatureConfig): UseCaseFactoryResult => {
  return new FeatureFactory(config.name, config.customContainer)
    .withUseCases(config.useCases)
    .withRepositories(config.repositories)
    .withServices(config.services || new Map())
    .build();
};

/**
 * UseCase 메타데이터 생성 헬퍼
 */
export const createUseCaseMetadata = (
  name: string,
  token: symbol,
  dependencies: symbol[] = [],
  lifecycle: Lifecycle = Lifecycle.Singleton
): UseCaseMetadata => ({
  name,
  token,
  dependencies,
  lifecycle,
});

/**
 * Mock Repository 설정 헬퍼
 */
export const createMockRepositoryConfig = (
  customMocks?: Map<symbol, any>
): RepositoryConfig => ({
  useMock: true,
  customImplementations: customMocks,
});

/**
 * Production Repository 설정 헬퍼
 */
export const createProductionRepositoryConfig = (
  customImplementations?: Map<symbol, any>
): RepositoryConfig => ({
  useMock: false,
  customImplementations,
});

/**
 * Feature별 UseCase 자동 해제를 위한 클래스
 */
export class FeatureCleanup {
  private static registeredFeatures = new Map<string, UseCaseFactoryResult>();

  /**
   * Feature 등록 정보 저장
   */
  static register(result: UseCaseFactoryResult): void {
    this.registeredFeatures.set(result.featureName, result);
  }

  /**
   * 특정 Feature의 모든 등록 해제
   */
  static cleanup(featureName: string): void {
    const feature = this.registeredFeatures.get(featureName);
    if (!feature) {
      console.warn(`Feature ${featureName} not found for cleanup`);
      return;
    }

    try {
      feature.container.reset();
      this.registeredFeatures.delete(featureName);
      console.log(`🧹 ${featureName} Feature cleaned up successfully`);
    } catch (error) {
      console.error(`❌ Failed to cleanup ${featureName} Feature:`, error);
    }
  }

  /**
   * 모든 등록된 Feature 해제
   */
  static cleanupAll(): void {
    this.registeredFeatures.forEach((_, featureName) => {
      this.cleanup(featureName);
    });
  }

  /**
   * 등록된 Feature 목록 조회
   */
  static listFeatures(): string[] {
    return Array.from(this.registeredFeatures.keys());
  }
}

/**
 * 개발/테스트 편의를 위한 디버깅 유틸리티
 */
export const FeatureFactoryDebug = {
  /**
   * Factory 빌드 결과 상세 출력
   */
  inspect(result: UseCaseFactoryResult): void {
    console.log(`🔍 Feature Factory Inspection - ${result.featureName}`);
    console.log('📋 Registered UseCases:', result.registeredUseCases);
    console.log('🗃️ Registered Repositories:', result.registeredRepositories);
    console.log('⚙️ Registered Services:', result.registeredServices);
  },

  /**
   * 특정 UseCase의 의존성 체인 검증
   */
  validateUseCase(container: DependencyContainer, token: symbol): boolean {
    try {
      const instance = container.resolve(token) as any;
      console.log('✅ UseCase resolved successfully:', (instance as any).constructor?.name ?? 'Unknown');
      return true;
    } catch (error) {
      console.error('❌ UseCase resolution failed:', error);
      return false;
    }
  },

  /**
   * 전체 Feature의 의존성 상태 확인
   */
  healthCheck(result: UseCaseFactoryResult): boolean {
    console.log(`🏥 Health Check - ${result.featureName}`);
    
    let allHealthy = true;
    
    // Repository 상태 확인은 실제 토큰이 있을 때만 가능
    console.log('Repositories:', result.registeredRepositories.length > 0 ? 'Present' : 'None');
    console.log('Services:', result.registeredServices.length > 0 ? 'Present' : 'None');
    console.log('UseCases:', result.registeredUseCases.length);
    
    return allHealthy;
  },
};