/**
 * Product Feature 의존성 주입 모듈
 *
 * Product Feature의 모든 의존성을 관리하는 중앙화된 모듈
 * - Repository 구현체 선택 (Mock/HTTP)
 * - UseCase 생성 및 의존성 주입
 * - Domain Service 설정
 * - Presenter 구현체 설정
 *
 * 장점:
 * - Feature별 의존성 격리
 * - 환경별 구현체 전환 용이
 * - 테스트시 Mock 주입 간편
 * - 코드 가독성 향상
 */

import { container, DependencyContainer } from "tsyringe";

// Domain Layer
import { ProductRepository } from "../domain/repositories/ProductRepository";
import { ProductHistoryRepository } from "../domain/repositories/ProductHistoryRepository";
import {
  ProductCodeGenerator,
  DefaultProductCodeGenerator,
} from "../domain/services/ProductCodeGenerator";
import { ProductUsageChecker } from "../domain/services/ProductUsageChecker";

// Application Layer
import {
  GetProductListUseCase,
  ProductPresenter,
} from "../application/usecases/product/GetProductListUseCase";
import { CreateProductUseCase } from "../application/usecases/product/CreateProductUseCase";
import { UpdateProductUseCase } from "../application/usecases/product/UpdateProductUseCase";
import { DeleteProductUseCase } from "../application/usecases/product/DeleteProductUseCase";
import { GetProductHistoryUseCase } from "../application/usecases/product/GetProductHistoryUseCase";

// Infrastructure Layer
import { MockProductRepository } from "../infrastructure/repositories/MockProductRepository";
import { MockProductHistoryRepository } from "../infrastructure/repositories/MockProductHistoryRepository";
import { HttpProductRepository } from "../infrastructure/repositories/HttpProductRepository";
import { HttpProductHistoryRepository } from "../infrastructure/repositories/HttpProductHistoryRepository";
import { MockProductUsageChecker } from "../infrastructure/repositories/MockProductUsageChecker";

// Shared Services
import { ApiClient } from "@shared/services/api/ApiClient";
import { ProductType } from "../domain/entities/Product";

/**
 * Product Type 표시 담당 클래스
 * ProductPresenter 인터페이스 구현
 */
export class ProductPresenterImpl implements ProductPresenter {
  getTypeDisplayName(type: string): string {
    switch (type) {
      case ProductType.FINISHED_PRODUCT:
        return "완제품";
      case ProductType.SEMI_FINISHED:
        return "반제품";
      case ProductType.RAW_MATERIAL:
        return "원자재";
      default:
        return type;
    }
  }
}

/**
 * Product Feature DI 컨테이너 토큰
 */
export const PRODUCT_TOKENS = {
  // Repository Tokens
  ProductRepository: Symbol("ProductRepository"),
  ProductHistoryRepository: Symbol("ProductHistoryRepository"),

  // Service Tokens
  ProductCodeGenerator: Symbol("ProductCodeGenerator"),
  ProductUsageChecker: Symbol("ProductUsageChecker"),
  ProductPresenter: Symbol("ProductPresenter"),

  // UseCase Tokens
  GetProductListUseCase: Symbol("GetProductListUseCase"),
  CreateProductUseCase: Symbol("CreateProductUseCase"),
  UpdateProductUseCase: Symbol("UpdateProductUseCase"),
  DeleteProductUseCase: Symbol("DeleteProductUseCase"),
  GetProductHistoryUseCase: Symbol("GetProductHistoryUseCase"),

  // Infrastructure Tokens
  ApiClient: Symbol("ApiClient"),
} as const;

/**
 * Product Feature DI 모듈 설정
 */
export class ProductDIModule {
  private static initialized = false;

  /**
   * Product Feature 의존성 등록
   * @param container DI 컨테이너 (기본값: 전역 컨테이너)
   * @param useMockData Mock 데이터 사용 여부 (기본값: 환경변수 기반)
   */
  static initialize(
    diContainer: DependencyContainer = container,
    useMockData: boolean = process.env.REACT_APP_USE_MOCK_DATA !== "false"
  ): void {
    if (this.initialized) {
      console.warn("ProductDIModule already initialized");
      return;
    }

    // === Infrastructure Layer 설정 ===

    // API Client (Singleton으로 관리)
    diContainer.registerInstance(PRODUCT_TOKENS.ApiClient, new ApiClient());

    // Repository 구현체 선택 및 등록
    // if (useMockData) {
    //   diContainer.registerSingleton(PRODUCT_TOKENS.ProductRepository, MockProductRepository);
    //   diContainer.registerSingleton(PRODUCT_TOKENS.ProductHistoryRepository, MockProductHistoryRepository);
    // } else {
      diContainer.register(PRODUCT_TOKENS.ProductRepository, {
        useFactory: (c) =>
          new HttpProductRepository(c.resolve(PRODUCT_TOKENS.ApiClient)),
      });
      diContainer.register(PRODUCT_TOKENS.ProductHistoryRepository, {
        useFactory: (c) =>
          new HttpProductHistoryRepository(c.resolve(PRODUCT_TOKENS.ApiClient)),
      });
    // }

    // === Domain Service 설정 ===

    // ProductCodeGenerator
    diContainer.register(PRODUCT_TOKENS.ProductCodeGenerator, {
      useFactory: (c) =>
        new DefaultProductCodeGenerator(
          c.resolve(PRODUCT_TOKENS.ProductRepository)
        ),
    });

    // ProductUsageChecker (현재는 Mock만 구현)
    diContainer.registerSingleton(
      PRODUCT_TOKENS.ProductUsageChecker,
      MockProductUsageChecker
    );

    // ProductPresenter
    diContainer.registerSingleton(
      PRODUCT_TOKENS.ProductPresenter,
      ProductPresenterImpl
    );

    // === Application Layer (UseCase) 설정 ===

    // GetProductListUseCase
    diContainer.register(PRODUCT_TOKENS.GetProductListUseCase, {
      useFactory: (c) =>
        new GetProductListUseCase(
          c.resolve(PRODUCT_TOKENS.ProductRepository),
          c.resolve(PRODUCT_TOKENS.ProductPresenter)
        ),
    });

    // CreateProductUseCase
    diContainer.register(PRODUCT_TOKENS.CreateProductUseCase, {
      useFactory: (c) =>
        new CreateProductUseCase(
          c.resolve(PRODUCT_TOKENS.ProductRepository),
          c.resolve(PRODUCT_TOKENS.ProductHistoryRepository),
          c.resolve(PRODUCT_TOKENS.ProductCodeGenerator)
        ),
    });

    // UpdateProductUseCase
    diContainer.register(PRODUCT_TOKENS.UpdateProductUseCase, {
      useFactory: (c) =>
        new UpdateProductUseCase(
          c.resolve(PRODUCT_TOKENS.ProductRepository),
          c.resolve(PRODUCT_TOKENS.ProductHistoryRepository)
        ),
    });

    // DeleteProductUseCase
    diContainer.register(PRODUCT_TOKENS.DeleteProductUseCase, {
      useFactory: (c) =>
        new DeleteProductUseCase(
          c.resolve(PRODUCT_TOKENS.ProductRepository),
          c.resolve(PRODUCT_TOKENS.ProductHistoryRepository),
          c.resolve(PRODUCT_TOKENS.ProductUsageChecker)
        ),
    });

    // GetProductHistoryUseCase
    diContainer.register(PRODUCT_TOKENS.GetProductHistoryUseCase, {
      useFactory: (c) =>
        new GetProductHistoryUseCase(
          c.resolve(PRODUCT_TOKENS.ProductHistoryRepository)
        ),
    });

    this.initialized = true;
    console.log("✅ ProductDIModule initialized successfully");
  }

  /**
   * Product Feature 의존성 해제
   * 주로 테스트에서 사용
   */
  static cleanup(): void {
    // 전체 컨테이너 초기화 (테스트 환경에서만 권장)
    try {
      container.reset();
    } catch (error) {
      // 초기화 실패시 무시
      console.warn("ProductDIModule cleanup warning:", error);
    }

    this.initialized = false;
    console.log("🧹 ProductDIModule cleaned up");
  }

  /**
   * 초기화 여부 확인
   */
  static isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Product Feature UseCase 조회 헬퍼 함수들
 */
export const ProductDI = {
  getProductListUseCase: (): GetProductListUseCase =>
    container.resolve(PRODUCT_TOKENS.GetProductListUseCase),

  createProductUseCase: (): CreateProductUseCase =>
    container.resolve(PRODUCT_TOKENS.CreateProductUseCase),

  updateProductUseCase: (): UpdateProductUseCase =>
    container.resolve(PRODUCT_TOKENS.UpdateProductUseCase),

  deleteProductUseCase: (): DeleteProductUseCase =>
    container.resolve(PRODUCT_TOKENS.DeleteProductUseCase),

  getProductHistoryUseCase: (): GetProductHistoryUseCase =>
    container.resolve(PRODUCT_TOKENS.GetProductHistoryUseCase),

  // Repository 직접 접근 (테스트 등에서 사용)
  getProductRepository: (): ProductRepository =>
    container.resolve(PRODUCT_TOKENS.ProductRepository),

  getProductHistoryRepository: (): ProductHistoryRepository =>
    container.resolve(PRODUCT_TOKENS.ProductHistoryRepository),

  // Service 직접 접근 (테스트 등에서 사용)
  getProductCodeGenerator: (): ProductCodeGenerator =>
    container.resolve(PRODUCT_TOKENS.ProductCodeGenerator),

  getProductUsageChecker: (): ProductUsageChecker =>
    container.resolve(PRODUCT_TOKENS.ProductUsageChecker),
};

/**
 * 개발/테스트 편의를 위한 디버깅 함수
 */
export const ProductDIDebug = {
  /**
   * 등록된 모든 의존성 확인
   */
  listRegistered(): void {
    console.log("📋 Product Feature Registered Dependencies:");
    Object.entries(PRODUCT_TOKENS).forEach(([name, token]) => {
      try {
        const instance = container.resolve(token) as any;
        console.log(`  ✅ ${name}:`, instance.constructor.name);
      } catch (error) {
        console.log(`  ❌ ${name}: Not registered`);
      }
    });
  },

  /**
   * 특정 UseCase의 의존성 체인 확인
   */
  inspectUseCase(useCaseName: keyof typeof PRODUCT_TOKENS): void {
    try {
      const useCase = container.resolve(PRODUCT_TOKENS[useCaseName]);
      console.log(`🔍 ${useCaseName} dependency chain:`, useCase);
    } catch (error) {
      console.error(`❌ Failed to resolve ${useCaseName}:`, error);
    }
  },
};
