/**
 * 의존성 주입 컨테이너 (Dependency Injection Container)
 * 
 * 워크플로우:
 * 1. 애플리케이션 시작 시 모든 의존성 설정
 * 2. 환경 변수에 따른 Mock/Real 구현체 선택
 * 3. UseCase들의 의존성 주입 처리
 * 4. 타입 안전한 의존성 조회 메서드 제공
 * 
 * Clean Architecture 레이어 구성:
 * - Domain: 비즈니스 로직과 규칙 정의
 * - Application: UseCase 구현
 * - Infrastructure: 외부 시스템 연동 (API, Database)
 * - Presentation: UI 컴포넌트 (React)
 * 
 * 환경 변수 제어:
 * - REACT_APP_USE_MOCK_DATA=true: Mock 데이터 사용
 * - REACT_APP_USE_MOCK_DATA=false: 실제 API 연동
 */

import { GetProductListUseCase, ProductPresenter } from '@features/product/application/usecases/product/GetProductListUseCase';
import { CreateProductUseCase } from '@features/product/application/usecases/product/CreateProductUseCase';
import { UpdateProductUseCase } from '@features/product/application/usecases/product/UpdateProductUseCase';
import { DeleteProductUseCase } from '@features/product/application/usecases/product/DeleteProductUseCase';
import { GetProductHistoryUseCase } from '@features/product/application/usecases/product/GetProductHistoryUseCase';

// BOM UseCase Imports
import { GetBOMTreeUseCase, BOMPresenter } from '@features/bom/application/usecases/bom/GetBOMTreeUseCase';
import { AddBOMItemUseCase } from '@features/bom/application/usecases/bom/AddBOMItemUseCase';
import { UpdateBOMItemUseCase } from '@features/bom/application/usecases/bom/UpdateBOMItemUseCase';
import { DeleteBOMItemUseCase } from '@features/bom/application/usecases/bom/DeleteBOMItemUseCase';
import { CopyBOMUseCase } from '@features/bom/application/usecases/bom/CopyBOMUseCase';
import { CompareBOMUseCase } from '@features/bom/application/usecases/bom/CompareBOMUseCase';

import { ProductRepository } from '@features/product/domain/repositories/ProductRepository';
import { ProductHistoryRepository } from '@features/product/domain/repositories/ProductHistoryRepository';
import { ProductCodeGenerator, DefaultProductCodeGenerator } from '@features/product/domain/services/ProductCodeGenerator';
import { ProductUsageChecker } from '@features/product/domain/services/ProductUsageChecker';
import { ProductType } from '@features/product/domain/entities/Product';

// BOM Domain Imports
import { BOMRepository } from '@features/bom/domain/repositories/BOMRepository';
import { BOMItemRepository } from '@features/bom/domain/repositories/BOMItemRepository';
import { BOMHistoryRepository } from '@features/bom/domain/repositories/BOMHistoryRepository';
import { BOMCircularChecker, DefaultBOMCircularChecker } from '@features/bom/domain/services/BOMCircularChecker';
import { BOMUsageChecker, DefaultBOMUsageChecker } from '@features/bom/domain/services/BOMUsageChecker';
import { ComponentType } from '@features/bom/domain/entities/BOMItem';

import { ApiClient } from '@shared/services/api/ApiClient';
import { HttpProductRepository } from '@features/product/infrastructure/repositories/HttpProductRepository';
import { HttpProductHistoryRepository } from '@features/product/infrastructure/repositories/HttpProductHistoryRepository';
import { MockProductRepository } from '@features/product/infrastructure/repositories/MockProductRepository';
import { MockProductHistoryRepository } from '@features/product/infrastructure/repositories/MockProductHistoryRepository';
import { MockProductUsageChecker } from '@features/product/infrastructure/repositories/MockProductUsageChecker';

// BOM Mock Repository Imports
import { MockBOMRepository } from '@features/bom/infrastructure/repositories/MockBOMRepository';
import { MockBOMItemRepository } from '@features/bom/infrastructure/repositories/MockBOMItemRepository';
import { MockBOMHistoryRepository } from '@features/bom/infrastructure/repositories/MockBOMHistoryRepository';

/**
 * 제품 타입 표시 담당 클래스
 * ProductPresenter 인터페이스 구현
 */
class ProductPresenterImpl implements ProductPresenter {
  getTypeDisplayName(type: string): string {
    switch (type) {
      case ProductType.FINISHED_PRODUCT:
        return '완제품';
      case ProductType.SEMI_FINISHED:
        return '반제품';
      case ProductType.RAW_MATERIAL:
        return '원자재';
      default:
        return type;
    }
  }
}

/**
 * BOM 구성품 타입 표시 담당 클래스
 * BOMPresenter 인터페이스 구현
 */
class BOMPresenterImpl implements BOMPresenter {
  getComponentTypeDisplayName(type: ComponentType): string {
    switch (type) {
      case ComponentType.RAW_MATERIAL:
        return '원자재';
      case ComponentType.SEMI_FINISHED:
        return '반제품';
      case ComponentType.PURCHASED_PART:
        return '구매품';
      case ComponentType.SUB_ASSEMBLY:
        return '조립품';
      case ComponentType.CONSUMABLE:
        return '소모품';
      default:
        return type;
    }
  }
}

/**
 * 의존성 주입 컨테이너 클래스
 * 싱글톤 패턴으로 구현하여 전역에서 동일한 인스턴스 사용
 */
export class DIContainer {
  private static instance: DIContainer;                 // 싱글톤 인스턴스
  private dependencies: Map<string, any> = new Map();   // 의존성 저장소

  /**
   * private 생성자 - 싱글톤 패턴 구현
   */
  private constructor() {
    this.setupDependencies(); // 모든 의존성 설정
  }

  /**
   * 싱글톤 인스턴스 조회
   * @returns DIContainer 인스턴스
   */
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * 모든 의존성 설정 및 주입 처리
   * Clean Architecture 레이어별로 구성
   */
  private setupDependencies(): void {
    // === Infrastructure Layer 설정 ===
    const apiClient = new ApiClient();
    this.dependencies.set('ApiClient', apiClient);

    // 환경 변수에 따른 Mock/Real 구현체 선택
    const useMockData = process.env.REACT_APP_USE_MOCK_DATA !== 'false';

    // === Repository 구현체 선택 ===
    const productRepository = useMockData 
      ? new MockProductRepository()           // Mock: 메모리 내 데이터 사용
      : new HttpProductRepository(apiClient); // Real: REST API 호출
    
    const productHistoryRepository = useMockData
      ? new MockProductHistoryRepository()
      : new HttpProductHistoryRepository(apiClient);
    
    const productUsageChecker = new MockProductUsageChecker(); // 현재는 Mock만 구현

    // BOM Repository 구현체 선택
    const bomRepository = useMockData
      ? new MockBOMRepository()             // Mock: 메모리 내 BOM 데이터 사용
      : new MockBOMRepository();            // TODO: 실제 HttpBOMRepository 구현 시 교체
    
    const bomItemRepository = useMockData
      ? new MockBOMItemRepository()         // Mock: 메모리 내 BOM Item 데이터 사용
      : new MockBOMItemRepository();        // TODO: 실제 HttpBOMItemRepository 구현 시 교체
    
    const bomHistoryRepository = useMockData
      ? new MockBOMHistoryRepository()      // Mock: 메모리 내 BOM History 데이터 사용  
      : new MockBOMHistoryRepository();     // TODO: 실제 HttpBOMHistoryRepository 구현 시 교체

    // Repository 등록
    this.dependencies.set('ProductRepository', productRepository);
    this.dependencies.set('ProductHistoryRepository', productHistoryRepository);
    this.dependencies.set('ProductUsageChecker', productUsageChecker);
    this.dependencies.set('BOMRepository', bomRepository);
    this.dependencies.set('BOMItemRepository', bomItemRepository);
    this.dependencies.set('BOMHistoryRepository', bomHistoryRepository);

    // === Domain Service 설정 ===
    const productCodeGenerator = new DefaultProductCodeGenerator(productRepository);
    const productPresenter = new ProductPresenterImpl();
    const bomPresenter = new BOMPresenterImpl();
    
    // BOM Domain Services
    const bomCircularChecker = new DefaultBOMCircularChecker(bomRepository, bomItemRepository);
    const bomUsageChecker = new DefaultBOMUsageChecker(bomRepository, bomItemRepository);

    this.dependencies.set('ProductCodeGenerator', productCodeGenerator);
    this.dependencies.set('ProductPresenter', productPresenter);
    this.dependencies.set('BOMPresenter', bomPresenter);
    this.dependencies.set('BOMCircularChecker', bomCircularChecker);
    this.dependencies.set('BOMUsageChecker', bomUsageChecker);

    // === Application Layer - UseCase 설정 ===
    // 각 UseCase에 필요한 의존성 주입
    const getProductListUseCase = new GetProductListUseCase(productRepository, productPresenter);
    const createProductUseCase = new CreateProductUseCase(
      productRepository,
      productHistoryRepository,
      productCodeGenerator
    );
    const updateProductUseCase = new UpdateProductUseCase(productRepository, productHistoryRepository);
    const deleteProductUseCase = new DeleteProductUseCase(
      productRepository,
      productHistoryRepository,
      productUsageChecker
    );
    const getProductHistoryUseCase = new GetProductHistoryUseCase(productHistoryRepository);

    // BOM UseCases
    const getBOMTreeUseCase = new GetBOMTreeUseCase(
      bomRepository,
      bomItemRepository,
      productRepository,
      bomPresenter
    );
    const addBOMItemUseCase = new AddBOMItemUseCase(
      bomRepository,
      bomItemRepository,
      productRepository,
      bomHistoryRepository,
      bomCircularChecker,
      bomPresenter
    );
    const updateBOMItemUseCase = new UpdateBOMItemUseCase(
      bomItemRepository,
      bomRepository,
      productRepository,
      bomHistoryRepository,
      bomUsageChecker,
      bomPresenter
    );
    const deleteBOMItemUseCase = new DeleteBOMItemUseCase(
      bomItemRepository,
      bomRepository,
      bomHistoryRepository,
      bomUsageChecker,
      productRepository
    );
    const copyBOMUseCase = new CopyBOMUseCase(
      bomRepository,
      bomItemRepository,
      productRepository,
      bomHistoryRepository
    );
    const compareBOMUseCase = new CompareBOMUseCase(
      bomRepository,
      bomItemRepository,
      productRepository,
      bomHistoryRepository
    );

    // UseCase 등록
    this.dependencies.set('GetProductListUseCase', getProductListUseCase);
    this.dependencies.set('CreateProductUseCase', createProductUseCase);
    this.dependencies.set('UpdateProductUseCase', updateProductUseCase);
    this.dependencies.set('DeleteProductUseCase', deleteProductUseCase);
    this.dependencies.set('GetProductHistoryUseCase', getProductHistoryUseCase);
    this.dependencies.set('GetBOMTreeUseCase', getBOMTreeUseCase);
    this.dependencies.set('AddBOMItemUseCase', addBOMItemUseCase);
    this.dependencies.set('UpdateBOMItemUseCase', updateBOMItemUseCase);
    this.dependencies.set('DeleteBOMItemUseCase', deleteBOMItemUseCase);
    this.dependencies.set('CopyBOMUseCase', copyBOMUseCase);
    this.dependencies.set('CompareBOMUseCase', compareBOMUseCase);
  }

  /**
   * 일반적인 의존성 조회 메서드
   * @param key 의존성 키
   * @returns 조회된 의존성 인스턴스
   */
  get<T>(key: string): T {
    const dependency = this.dependencies.get(key);
    if (!dependency) {
      throw new Error(`Dependency ${key} not found`);
    }
    return dependency as T;
  }

  // === 타입 안전한 UseCase 조회 메서드들 ===

  /**
   * 제품 목록 조회 UseCase
   */
  getProductListUseCase(): GetProductListUseCase {
    return this.get<GetProductListUseCase>('GetProductListUseCase');
  }

  /**
   * 제품 생성 UseCase
   */
  getCreateProductUseCase(): CreateProductUseCase {
    return this.get<CreateProductUseCase>('CreateProductUseCase');
  }

  /**
   * 제품 수정 UseCase
   */
  getUpdateProductUseCase(): UpdateProductUseCase {
    return this.get<UpdateProductUseCase>('UpdateProductUseCase');
  }

  /**
   * 제품 삭제 UseCase
   */
  getDeleteProductUseCase(): DeleteProductUseCase {
    return this.get<DeleteProductUseCase>('DeleteProductUseCase');
  }

  /**
   * 제품 이력 조회 UseCase
   */
  getProductHistoryUseCase(): GetProductHistoryUseCase {
    return this.get<GetProductHistoryUseCase>('GetProductHistoryUseCase');
  }

  // === 타입 안전한 Repository 조회 메서드들 ===

  /**
   * 제품 저장소
   */
  getProductRepository(): ProductRepository {
    return this.get<ProductRepository>('ProductRepository');
  }

  /**
   * 제품 이력 저장소
   */
  getProductHistoryRepository(): ProductHistoryRepository {
    return this.get<ProductHistoryRepository>('ProductHistoryRepository');
  }

  /**
   * 제품 코드 생성기
   */
  getProductCodeGenerator(): ProductCodeGenerator {
    return this.get<ProductCodeGenerator>('ProductCodeGenerator');
  }

  /**
   * 제품 사용여부 검증기
   */
  getProductUsageChecker(): ProductUsageChecker {
    return this.get<ProductUsageChecker>('ProductUsageChecker');
  }

  // === 타입 안전한 BOM UseCase 조회 메서드들 ===

  /**
   * BOM 트리 조회 UseCase
   */
  getBOMTreeUseCase(): GetBOMTreeUseCase {
    return this.get<GetBOMTreeUseCase>('GetBOMTreeUseCase');
  }

  /**
   * BOM 아이템 추가 UseCase
   */
  getAddBOMItemUseCase(): AddBOMItemUseCase {
    return this.get<AddBOMItemUseCase>('AddBOMItemUseCase');
  }

  /**
   * BOM 아이템 수정 UseCase
   */
  getUpdateBOMItemUseCase(): UpdateBOMItemUseCase {
    return this.get<UpdateBOMItemUseCase>('UpdateBOMItemUseCase');
  }

  /**
   * BOM 아이템 삭제 UseCase
   */
  getDeleteBOMItemUseCase(): DeleteBOMItemUseCase {
    return this.get<DeleteBOMItemUseCase>('DeleteBOMItemUseCase');
  }

  /**
   * BOM 복사 UseCase
   */
  getCopyBOMUseCase(): CopyBOMUseCase {
    return this.get<CopyBOMUseCase>('CopyBOMUseCase');
  }

  /**
   * BOM 비교 UseCase
   */
  getCompareBOMUseCase(): CompareBOMUseCase {
    return this.get<CompareBOMUseCase>('CompareBOMUseCase');
  }

  // === 타입 안전한 BOM Repository 조회 메서드들 ===

  /**
   * BOM 저장소
   */
  getBOMRepository(): BOMRepository {
    return this.get<BOMRepository>('BOMRepository');
  }

  /**
   * BOM 아이템 저장소
   */
  getBOMItemRepository(): BOMItemRepository {
    return this.get<BOMItemRepository>('BOMItemRepository');
  }

  /**
   * BOM 이력 저장소
   */
  getBOMHistoryRepository(): BOMHistoryRepository {
    return this.get<BOMHistoryRepository>('BOMHistoryRepository');
  }

  /**
   * BOM 순환참조 검증기
   */
  getBOMCircularChecker(): BOMCircularChecker {
    return this.get<BOMCircularChecker>('BOMCircularChecker');
  }

  /**
   * BOM 사용여부 검증기
   */
  getBOMUsageChecker(): BOMUsageChecker {
    return this.get<BOMUsageChecker>('BOMUsageChecker');
  }

  /**
   * BOM 프레젠터
   */
  getBOMPresenter(): BOMPresenter {
    return this.get<BOMPresenter>('BOMPresenter');
  }
}