/**
 * BOM Feature 의존성 주입 모듈
 *
 * BOM Feature의 모든 의존성을 관리하는 중앙화된 모듈
 * - Repository 구현체 선택 (Mock/HTTP)
 * - UseCase 생성 및 의존성 주입
 * - Domain Service 설정 (순환참조 검증기, 사용여부 검증기)
 * - Presenter 구현체 설정
 *
 * 특징:
 * - Product Feature와의 의존성 관리
 * - BOM 특화 비즈니스 로직 포함
 * - 순환참조 방지 메커니즘
 */

import { container, DependencyContainer } from "tsyringe";

// Domain Layer
import { BOMRepository } from "../domain/repositories/BOMRepository";
import { BOMItemRepository } from "../domain/repositories/BOMItemRepository";
import { BOMHistoryRepository } from "../domain/repositories/BOMHistoryRepository";
import {
  BOMCircularChecker,
  DefaultBOMCircularChecker,
} from "../domain/services/BOMCircularChecker";
import {
  BOMUsageChecker,
  DefaultBOMUsageChecker,
} from "../domain/services/BOMUsageChecker";
import { ComponentType } from "../domain/entities/BOMItem";

// Application Layer
import {
  GetBOMTreeUseCase,
  BOMPresenter,
} from "../application/usecases/bom/GetBOMTreeUseCase";
import { AddBOMItemUseCase } from "../application/usecases/bom/AddBOMItemUseCase";
import { UpdateBOMItemUseCase } from "../application/usecases/bom/UpdateBOMItemUseCase";
import { DeleteBOMItemUseCase } from "../application/usecases/bom/DeleteBOMItemUseCase";
import { CopyBOMUseCase } from "../application/usecases/bom/CopyBOMUseCase";
import { CompareBOMUseCase } from "../application/usecases/bom/CompareBOMUseCase";

// Infrastructure Layer
import { MockBOMRepository } from "../infrastructure/repositories/MockBOMRepository";
import { MockBOMItemRepository } from "../infrastructure/repositories/MockBOMItemRepository";
import { MockBOMHistoryRepository } from "../infrastructure/repositories/MockBOMHistoryRepository";
import { HttpBOMRepository } from "../infrastructure/repositories/HttpBOMRepository";
import { HttpBOMItemRepository } from "../infrastructure/repositories/HttpBOMItemRepository";
import { HttpBOMHistoryRepository } from "../infrastructure/repositories/HttpBOMHistoryRepository";

// Cross-Feature Dependencies (Product Feature)
import { PRODUCT_TOKENS } from "@features/product/config/ProductDIModule";

/**
 * BOM 구성품 타입 표시 담당 클래스
 * BOMPresenter 인터페이스 구현
 */
export class BOMPresenterImpl implements BOMPresenter {
  getComponentTypeDisplayName(type: ComponentType): string {
    switch (type) {
      case ComponentType.RAW_MATERIAL:
        return "원자재";
      case ComponentType.SEMI_FINISHED:
        return "반제품";
      case ComponentType.PURCHASED_PART:
        return "구매품";
      case ComponentType.SUB_ASSEMBLY:
        return "조립품";
      case ComponentType.CONSUMABLE:
        return "소모품";
      default:
        return type;
    }
  }
}

/**
 * BOM Feature DI 컨테이너 토큰
 */
export const BOM_TOKENS = {
  // Repository Tokens
  BOMRepository: Symbol("BOMRepository"),
  BOMItemRepository: Symbol("BOMItemRepository"),
  BOMHistoryRepository: Symbol("BOMHistoryRepository"),

  // Service Tokens
  BOMCircularChecker: Symbol("BOMCircularChecker"),
  BOMUsageChecker: Symbol("BOMUsageChecker"),
  BOMPresenter: Symbol("BOMPresenter"),

  // UseCase Tokens
  GetBOMTreeUseCase: Symbol("GetBOMTreeUseCase"),
  AddBOMItemUseCase: Symbol("AddBOMItemUseCase"),
  UpdateBOMItemUseCase: Symbol("UpdateBOMItemUseCase"),
  DeleteBOMItemUseCase: Symbol("DeleteBOMItemUseCase"),
  CopyBOMUseCase: Symbol("CopyBOMUseCase"),
  CompareBOMUseCase: Symbol("CompareBOMUseCase"),

  // Infrastructure Tokens
  ApiClient: Symbol("ApiClient"),
} as const;

/**
 * BOM Feature DI 모듈 설정
 */
export class BOMDIModule {
  private static initialized = false;

  /**
   * BOM Feature 의존성 등록
   * @param container DI 컨테이너 (기본값: 전역 컨테이너)
   * @param useMockData Mock 데이터 사용 여부 (기본값: 환경변수 기반)
   */
  static initialize(
    diContainer: DependencyContainer = container,
    useMockData: boolean = process.env.REACT_APP_USE_MOCK_DATA !== "false"
  ): void {
    if (this.initialized) {
      console.warn("BOMDIModule already initialized");
      return;
    }

    // Product Feature 의존성 확인
    try {
      // Product Feature가 초기화되어 있는지 확인
      diContainer.resolve(PRODUCT_TOKENS.ProductRepository);
    } catch (error) {
      throw new Error(
        "BOM Feature requires Product Feature to be initialized first. " +
          "Please initialize ProductDIModule before BOMDIModule."
      );
    }

    // === Infrastructure Layer 설정 ===

    // API Client는 Product Feature에서 이미 등록됨 (재사용)

    // Repository 구현체 선택 및 등록
    // if (useMockData) {
    //   diContainer.registerSingleton(BOM_TOKENS.BOMRepository, MockBOMRepository);
    //   diContainer.registerSingleton(BOM_TOKENS.BOMItemRepository, MockBOMItemRepository);
    //   diContainer.registerSingleton(BOM_TOKENS.BOMHistoryRepository, MockBOMHistoryRepository);
    // } else {
    diContainer.register(BOM_TOKENS.BOMRepository, {
      useFactory: (c) =>
        new HttpBOMRepository(c.resolve(PRODUCT_TOKENS.ApiClient)),
    });
    diContainer.register(BOM_TOKENS.BOMItemRepository, {
      useFactory: (c) =>
        new HttpBOMItemRepository(c.resolve(PRODUCT_TOKENS.ApiClient)),
    });
    diContainer.register(BOM_TOKENS.BOMHistoryRepository, {
      useFactory: (c) =>
        new HttpBOMHistoryRepository(c.resolve(PRODUCT_TOKENS.ApiClient)),
    });
    // }

    // === Domain Service 설정 ===

    // BOMCircularChecker
    diContainer.register(BOM_TOKENS.BOMCircularChecker, {
      useFactory: (c) =>
        new DefaultBOMCircularChecker(
          c.resolve(BOM_TOKENS.BOMRepository),
          c.resolve(BOM_TOKENS.BOMItemRepository)
        ),
    });

    // BOMUsageChecker
    diContainer.register(BOM_TOKENS.BOMUsageChecker, {
      useFactory: (c) =>
        new DefaultBOMUsageChecker(
          c.resolve(BOM_TOKENS.BOMRepository),
          c.resolve(BOM_TOKENS.BOMItemRepository)
        ),
    });

    // BOMPresenter
    diContainer.registerSingleton(BOM_TOKENS.BOMPresenter, BOMPresenterImpl);

    // === Application Layer (UseCase) 설정 ===

    // GetBOMTreeUseCase
    diContainer.register(BOM_TOKENS.GetBOMTreeUseCase, {
      useFactory: (c) =>
        new GetBOMTreeUseCase(
          c.resolve(BOM_TOKENS.BOMRepository),
          c.resolve(BOM_TOKENS.BOMItemRepository),
          c.resolve(PRODUCT_TOKENS.ProductRepository), // Cross-Feature 의존성
          c.resolve(BOM_TOKENS.BOMPresenter)
        ),
    });

    // AddBOMItemUseCase
    diContainer.register(BOM_TOKENS.AddBOMItemUseCase, {
      useFactory: (c) =>
        new AddBOMItemUseCase(
          c.resolve(BOM_TOKENS.BOMRepository),
          c.resolve(BOM_TOKENS.BOMItemRepository),
          c.resolve(PRODUCT_TOKENS.ProductRepository),
          c.resolve(BOM_TOKENS.BOMHistoryRepository),
          c.resolve(BOM_TOKENS.BOMCircularChecker),
          c.resolve(BOM_TOKENS.BOMPresenter)
        ),
    });

    // UpdateBOMItemUseCase
    diContainer.register(BOM_TOKENS.UpdateBOMItemUseCase, {
      useFactory: (c) =>
        new UpdateBOMItemUseCase(
          c.resolve(BOM_TOKENS.BOMItemRepository),
          c.resolve(BOM_TOKENS.BOMRepository),
          c.resolve(PRODUCT_TOKENS.ProductRepository),
          c.resolve(BOM_TOKENS.BOMHistoryRepository),
          c.resolve(BOM_TOKENS.BOMUsageChecker),
          c.resolve(BOM_TOKENS.BOMPresenter)
        ),
    });

    // DeleteBOMItemUseCase
    diContainer.register(BOM_TOKENS.DeleteBOMItemUseCase, {
      useFactory: (c) =>
        new DeleteBOMItemUseCase(
          c.resolve(BOM_TOKENS.BOMItemRepository),
          c.resolve(BOM_TOKENS.BOMRepository),
          c.resolve(BOM_TOKENS.BOMHistoryRepository),
          c.resolve(BOM_TOKENS.BOMUsageChecker),
          c.resolve(PRODUCT_TOKENS.ProductRepository)
        ),
    });

    // CopyBOMUseCase
    diContainer.register(BOM_TOKENS.CopyBOMUseCase, {
      useFactory: (c) =>
        new CopyBOMUseCase(
          c.resolve(BOM_TOKENS.BOMRepository),
          c.resolve(BOM_TOKENS.BOMItemRepository),
          c.resolve(PRODUCT_TOKENS.ProductRepository),
          c.resolve(BOM_TOKENS.BOMHistoryRepository)
        ),
    });

    // CompareBOMUseCase
    diContainer.register(BOM_TOKENS.CompareBOMUseCase, {
      useFactory: (c) =>
        new CompareBOMUseCase(
          c.resolve(BOM_TOKENS.BOMRepository),
          c.resolve(BOM_TOKENS.BOMItemRepository),
          c.resolve(PRODUCT_TOKENS.ProductRepository),
          c.resolve(BOM_TOKENS.BOMHistoryRepository)
        ),
    });

    this.initialized = true;
    console.log("✅ BOMDIModule initialized successfully");
  }

  /**
   * BOM Feature 의존성 해제
   * 주로 테스트에서 사용
   */
  static cleanup(): void {
    // 전체 컨테이너 초기화 (테스트 환경에서만 권장)
    try {
      container.reset();
    } catch (error) {
      // 초기화 실패시 무시
      console.warn("BOMDIModule cleanup warning:", error);
    }

    this.initialized = false;
    console.log("🧹 BOMDIModule cleaned up");
  }

  /**
   * 초기화 여부 확인
   */
  static isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * BOM Feature UseCase 조회 헬퍼 함수들
 */
export const BOMDI = {
  getBOMTreeUseCase: (): GetBOMTreeUseCase =>
    container.resolve(BOM_TOKENS.GetBOMTreeUseCase),

  addBOMItemUseCase: (): AddBOMItemUseCase =>
    container.resolve(BOM_TOKENS.AddBOMItemUseCase),

  updateBOMItemUseCase: (): UpdateBOMItemUseCase =>
    container.resolve(BOM_TOKENS.UpdateBOMItemUseCase),

  deleteBOMItemUseCase: (): DeleteBOMItemUseCase =>
    container.resolve(BOM_TOKENS.DeleteBOMItemUseCase),

  copyBOMUseCase: (): CopyBOMUseCase =>
    container.resolve(BOM_TOKENS.CopyBOMUseCase),

  compareBOMUseCase: (): CompareBOMUseCase =>
    container.resolve(BOM_TOKENS.CompareBOMUseCase),

  // Repository 직접 접근 (테스트 등에서 사용)
  getBOMRepository: (): BOMRepository =>
    container.resolve(BOM_TOKENS.BOMRepository),

  getBOMItemRepository: (): BOMItemRepository =>
    container.resolve(BOM_TOKENS.BOMItemRepository),

  getBOMHistoryRepository: (): BOMHistoryRepository =>
    container.resolve(BOM_TOKENS.BOMHistoryRepository),

  // Service 직접 접근 (테스트 등에서 사용)
  getBOMCircularChecker: (): BOMCircularChecker =>
    container.resolve(BOM_TOKENS.BOMCircularChecker),

  getBOMUsageChecker: (): BOMUsageChecker =>
    container.resolve(BOM_TOKENS.BOMUsageChecker),
};

/**
 * 개발/테스트 편의를 위한 디버깅 함수
 */
export const BOMDIDebug = {
  /**
   * 등록된 모든 의존성 확인
   */
  listRegistered(): void {
    console.log("📋 BOM Feature Registered Dependencies:");
    Object.entries(BOM_TOKENS).forEach(([name, token]) => {
      try {
        const instance = container.resolve(token) as any;
        console.log(`  ✅ ${name}:`, instance.constructor.name);
      } catch (error) {
        console.log(`  ❌ ${name}: Not registered`);
      }
    });
  },

  /**
   * Cross-Feature 의존성 확인
   */
  checkCrossFeatureDependencies(): void {
    console.log("🔗 BOM → Product Cross-Feature Dependencies:");
    try {
      const productRepo = container.resolve(
        PRODUCT_TOKENS.ProductRepository
      ) as any;
      console.log("  ✅ ProductRepository:", productRepo.constructor.name);
    } catch (error) {
      console.log("  ❌ ProductRepository: Not available");
    }
  },

  /**
   * 특정 UseCase의 의존성 체인 확인
   */
  inspectUseCase(useCaseName: keyof typeof BOM_TOKENS): void {
    try {
      const useCase = container.resolve(BOM_TOKENS[useCaseName]);
      console.log(`🔍 ${useCaseName} dependency chain:`, useCase);
    } catch (error) {
      console.error(`❌ Failed to resolve ${useCaseName}:`, error);
    }
  },
};
