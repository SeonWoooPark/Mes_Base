# MES 제품정보 관리 시스템 - Feature-First Clean Architecture

## 🏗️ 아키텍처 개요

이 프로젝트는 **Feature-First Clean Architecture** 패턴을 구현한 React TypeScript 애플리케이션입니다. 기존의 Layer-First 접근법에서 벗어나 비즈니스 기능(Feature) 중심으로 코드를 구조화하여 더 나은 응집도와 유지보수성을 제공합니다.

### 📁 Feature-First 프로젝트 구조

```
src/
├── app/                        # 🚀 애플리케이션 레이어 - 전역 설정 및 진입점
│   ├── config/
│   │   └── DIContainer.ts      # 의존성 주입 컨테이너
│   ├── providers/              # React Context 제공자들
│   ├── router/                 # 라우팅 설정
│   │   └── AppRouter.tsx
│   ├── App.tsx                 # 메인 App 컴포넌트
│   └── main.tsx               # 애플리케이션 진입점
│
├── features/                   # 🎯 Feature 모듈들 - 비즈니스 기능별 그룹화
│   ├── product/               # 제품 관리 Feature
│   │   ├── domain/            # 🧠 도메인 계층
│   │   │   ├── entities/      # Product, ProductHistory 엔티티
│   │   │   ├── repositories/  # ProductRepository 인터페이스
│   │   │   └── services/      # ProductCodeGenerator, ProductUsageChecker
│   │   ├── application/       # 🔄 애플리케이션 계층
│   │   │   ├── dtos/         # 데이터 전송 객체
│   │   │   └── usecases/     # 제품 CRUD UseCases
│   │   ├── infrastructure/    # 🔌 인프라 계층
│   │   │   ├── repositories/ # Mock/HTTP Repository 구현체
│   │   │   └── services/     # MockData 등 외부 서비스
│   │   ├── presentation/      # 🖼️ 프레젠테이션 계층
│   │   │   ├── components/   # 제품 관련 UI 컴포넌트
│   │   │   ├── hooks/        # 커스텀 React 훅
│   │   │   ├── pages/        # ProductManagementPage
│   │   │   └── styles/       # 컴포넌트 스타일
│   │   └── index.ts          # Feature 모듈 export
│   │
│   └── bom/                   # BOM 관리 Feature
│       ├── domain/            # BOM, BOMItem, BOMHistory 엔티티
│       ├── application/       # BOM 관련 UseCases
│       ├── infrastructure/    # BOM Mock/HTTP Repository 구현체
│       ├── presentation/      # BOM 관련 UI 컴포넌트
│       └── index.ts          # Feature 모듈 export
│
├── shared/                    # 🔗 공유 모듈 - Cross-Feature 코드
│   ├── components/           # 공통 UI 컴포넌트
│   │   ├── common/          # Pagination, ErrorBoundary 등
│   │   ├── layout/          # AppLayout
│   │   └── navigation/      # Navigation
│   ├── hooks/               # 공통 커스텀 훅
│   ├── services/           # API Client 등 공통 서비스
│   ├── types/              # 공통 TypeScript 타입
│   ├── constants/          # 전역 상수
│   └── utils/             # 유틸리티 함수들
│
└── assets/                   # 🎨 정적 자원
    ├── icons/
    ├── images/
    └── styles/
```

## 🎯 Feature-First Clean Architecture의 핵심 원칙

### 1. Feature 기반 모듈화
각 Feature는 독립적인 비즈니스 기능을 담당하며, Clean Architecture의 4개 계층을 모두 포함합니다:

```typescript
// Feature 구조 예시: Product Feature
features/product/
├── domain/         # 핵심 비즈니스 로직 (Product 엔티티, 비즈니스 규칙)
├── application/    # 애플리케이션 로직 (UseCases)
├── infrastructure/ # 외부 시스템 연동 (Repository 구현체)
├── presentation/   # UI 관련 코드 (Components, Hooks)
└── index.ts       # Feature의 Public API
```

### 2. 의존성 방향과 경계
```
Presentation → Application → Domain ← Infrastructure
     ↑              ↑            ↑
  Cross-Feature Dependencies는 @features/* 경로를 통해서만 허용
```

### 3. Cross-Feature 의존성 관리
- **허용**: `@features/bom`에서 `@features/product` 사용 (BOM은 Product에 의존)
- **금지**: Feature 내부 계층 직접 접근 (`@features/product/domain/entities/Product` ❌)
- **권장**: Feature의 index.ts를 통한 Public API 사용 (`@features/product` ✅)

## 🔧 CRACO를 통한 Path Mapping

### 설정 파일들

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@app/*": ["app/*"],
      "@features/*": ["features/*"],
      "@shared/*": ["shared/*"],
      "@assets/*": ["assets/*"]
    }
  }
}
```

#### `craco.config.js`
```javascript
const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@assets': path.resolve(__dirname, 'src/assets')
    }
  }
};
```

### Path Mapping 사용 예시
```typescript
// ✅ 올바른 Feature 간 의존성
import { ProductListItem } from '@features/product';
import { BOMTreeTable } from '@features/bom';
import { Pagination } from '@shared/components/common/Pagination';
import { DIContainer } from '@app/config/DIContainer';

// ❌ 잘못된 내부 계층 직접 접근
import { Product } from '@features/product/domain/entities/Product';
```

## 🔄 의존성 주입과 DIContainer

### 중앙화된 의존성 관리
```typescript
// src/app/config/DIContainer.ts
export class DIContainer {
  private dependencies = new Map<string, any>();
  
  private setupDependencies(): void {
    // 환경변수 기반 Mock/Real 구현체 선택
    const useMockData = process.env.REACT_APP_USE_MOCK_DATA !== 'false';
    
    // Product Feature 의존성 설정
    const productRepository = useMockData 
      ? new MockProductRepository()
      : new HttpProductRepository(apiClient);
    
    // BOM Feature 의존성 설정  
    const bomRepository = useMockData
      ? new MockBOMRepository()
      : new MockBOMRepository(); // TODO: HttpBOMRepository 구현 시 교체
    
    // UseCases 생성 및 의존성 주입
    const getProductListUseCase = new GetProductListUseCase(
      productRepository, 
      productPresenter
    );
    
    this.dependencies.set('GetProductListUseCase', getProductListUseCase);
  }
  
  // 타입 안전한 의존성 조회
  getProductListUseCase(): GetProductListUseCase {
    return this.get<GetProductListUseCase>('GetProductListUseCase');
  }
}
```

## 🎯 도메인 모델 예시

### Product 엔티티 (Feature-First)
```typescript
// src/features/product/domain/entities/Product.ts
export class Product {
  constructor(
    private readonly id: ProductId,
    private readonly cd_material: string,
    private readonly nm_material: string,
    private readonly type: ProductType,
    // ... 기타 필드
  ) {
    this.validateProduct(); // 도메인 규칙 검증
  }
  
  // 비즈니스 로직 메서드들
  public canBeProduced(): boolean {
    return this.isActive && 
           (this.type === ProductType.FINISHED_PRODUCT || 
            this.type === ProductType.SEMI_FINISHED);
  }
  
  public canHaveBOM(): boolean {
    return this.type !== ProductType.RAW_MATERIAL;
  }
  
  private validateProduct(): void {
    if (!this.cd_material?.trim()) {
      throw new Error('제품코드는 필수입니다.');
    }
    if (this.safetyStock < 0) {
      throw new Error('안전재고는 0 이상이어야 합니다.');
    }
  }
}
```

## 🔄 UseCase 예시 (Application Layer)

### GetProductListUseCase
```typescript
// src/features/product/application/usecases/product/GetProductListUseCase.ts
export class GetProductListUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productPresenter: ProductPresenter
  ) {}
  
  async execute(request: GetProductListRequest): Promise<GetProductListResponse> {
    // 1. 입력 검증
    this.validateRequest(request);
    
    // 2. 도메인 로직 실행
    const products = await this.productRepository.findByPageWithCriteria(
      request.page,
      request.pageSize,
      request.searchCriteria,
      request.sortCriteria
    );
    
    // 3. Presentation용 데이터 변환
    const productListItems = products.map(product => ({
      id: product.getId().getValue(),
      cd_material: product.getCdMaterial(),
      nm_material: product.getNmMaterial(),
      type: this.productPresenter.getTypeDisplayName(product.getType()),
      // ... 기타 필드 매핑
    }));
    
    return {
      products: productListItems,
      totalCount: await this.productRepository.count(request.searchCriteria)
    };
  }
}
```

## 🖼️ Presentation Layer (React Components)

### 커스텀 훅을 통한 상태 관리
```typescript
// src/features/product/presentation/hooks/useProductList.ts
export const useProductList = () => {
  const [state, setState] = useState<UseProductListState>({
    products: [],
    totalCount: 0,
    loading: false,
    error: null,
    // ... 기타 상태
  });
  
  const getProductListUseCase = DIContainer.getInstance().getProductListUseCase();
  
  const loadProducts = useCallback(async (request: GetProductListRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await getProductListUseCase.execute(request);
      setState(prev => ({
        ...prev,
        products: response.products,
        totalCount: response.totalCount,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '오류가 발생했습니다.'
      }));
    }
  }, [getProductListUseCase]);
  
  return {
    ...state,
    loadProducts,
    // ... 기타 액션들
  };
};
```

### Feature 통합 페이지 컴포넌트
```typescript
// src/features/product/presentation/pages/ProductManagementPage.tsx
export const ProductManagementPage: React.FC = () => {
  // Product Feature 훅
  const { products, loading, loadProducts, refresh } = useProductList();
  
  // BOM Feature 훅 (Cross-Feature 의존성)
  const { 
    treeNodes: bomNodes,
    loadBOMTree,
    expandAll,
    collapseAll 
  } = useBOMTree(selectedProductForBOM?.id);
  
  // 탭 상태 관리
  const [activeTab, setActiveTab] = useState<'products' | 'bom'>('products');
  
  return (
    <Container>
      <TabContainer>
        <TabList>
          <Tab active={activeTab === 'products'} onClick={() => setActiveTab('products')}>
            📦 제품 관리
          </Tab>
          <Tab active={activeTab === 'bom'} onClick={() => setActiveTab('bom')}>
            🏗️ BOM 관리  
          </Tab>
        </TabList>
        
        <TabPanel active={activeTab === 'products'}>
          <ProductSearchFilter onSearch={setSearchKeyword} />
          <ProductTable products={products} loading={loading} />
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        </TabPanel>
        
        <TabPanel active={activeTab === 'bom'}>
          <BOMTreeTable 
            nodes={bomNodes} 
            onEditItem={handleEditBOMItem}
            onDeleteItem={handleDeleteBOMItem}
          />
        </TabPanel>
      </TabContainer>
    </Container>
  );
};
```

## 🚀 코드 스플리팅과 지연 로딩

### 고급 Lazy Loading 시스템
```typescript
// src/shared/utils/lazyLoading.tsx
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): ComponentType<React.ComponentProps<T>> {
  
  const retryableImportFunc = async (): Promise<{ default: T }> => {
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const module = await delayedImportFunc();
        lazyLoadManager.markChunkLoaded(chunkName);
        return module;
      } catch (error) {
        // 지수 백오프를 통한 재시도
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
  };
  
  return LazyComponent;
}

// Feature별 지연 로딩 컴포넌트들
export const LazyProductManagementPage = lazyLoad(
  () => import('@features/product/presentation/pages/ProductManagementPage'),
  { chunkName: 'product-management-page', preload: true }
);

export const LazyBOMTreeTable = lazyLoad(
  () => import('@features/bom/presentation/components/bom/BOMTreeTable'),
  { chunkName: 'bom-tree-table', preload: true }
);
```

## 📊 Mock 데이터 시스템

### Feature별 Mock 데이터 관리
```typescript
// src/features/product/infrastructure/services/MockData.ts
let products: Product[] = [];
let histories: ProductHistory[] = [];

function initializeProducts(): void {
  const productsData = [
    {
      id: 'prod-001',
      cd_material: 'FG2412001',
      nm_material: '삼성 갤럭시 S24 케이스',
      type: ProductType.FINISHED_PRODUCT,
      // ... 현실적인 제품 데이터
    },
    // 10개의 다양한 샘플 제품들
  ];
  
  products = productsData.map(data => new Product(
    new ProductId(data.id),
    data.cd_material,
    data.nm_material,
    data.type,
    // ... 엔티티 생성
  ));
}

export const MockData = {
  getProducts: () => products,
  getProductById: (id: string) => products.find(p => p.getId().getValue() === id),
  // ... 기타 Mock 데이터 접근 메서드들
};
```

## 🔄 데이터 흐름 시퀀스

### 제품 목록 조회 플로우
```
1. ProductManagementPage 렌더링
   ↓
2. useProductList() 훅 초기화 및 useEffect 실행
   ↓  
3. DIContainer.getInstance().getProductListUseCase() 획득
   ↓
4. GetProductListUseCase.execute(request) 호출
   ↓
5. ProductRepository.findByPageWithCriteria() 호출
   ↓
6. MockProductRepository에서 Mock 데이터 조회 (실제 환경에서는 HTTP 호출)
   ↓
7. 도메인 엔티티 → DTO 변환 (ProductPresenter 사용)
   ↓
8. React 상태 업데이트 (setState)
   ↓
9. ProductTable 컴포넌트 리렌더링
```

### Cross-Feature 통신 예시 (Product → BOM)
```
1. ProductManagementPage에서 "BOM 관리" 버튼 클릭
   ↓
2. handleSelectProductForBOM(product) 실행
   ↓
3. selectedProductForBOM 상태 업데이트
   ↓
4. useBOMTree(selectedProduct.id) 훅 실행
   ↓
5. DIContainer에서 GetBOMTreeUseCase 획득
   ↓
6. @features/bom Feature의 비즈니스 로직 실행
   ↓
7. BOM 데이터를 BOMTreeTable 컴포넌트에 전달
```

## 🧪 테스트 전략

### Feature별 테스트 구조
```
src/features/product/__tests__/
├── domain/
│   ├── entities/
│   │   └── Product.test.ts        # 도메인 로직 테스트
│   └── services/
│       └── ProductCodeGenerator.test.ts
├── application/
│   └── usecases/
│       └── GetProductListUseCase.test.ts  # 비즈니스 로직 테스트
├── infrastructure/
│   └── repositories/
│       └── MockProductRepository.test.ts  # Mock 구현체 테스트
└── presentation/
    ├── hooks/
    │   └── useProductList.test.ts    # 커스텀 훅 테스트
    └── components/
        └── ProductTable.test.tsx     # 컴포넌트 테스트
```

### 테스트 격리와 Mock
```typescript
// Product Feature 단위 테스트 예시
describe('GetProductListUseCase', () => {
  let useCase: GetProductListUseCase;
  let mockRepository: jest.Mocked<ProductRepository>;
  let mockPresenter: jest.Mocked<ProductPresenter>;
  
  beforeEach(() => {
    mockRepository = createMockProductRepository();
    mockPresenter = createMockProductPresenter();
    useCase = new GetProductListUseCase(mockRepository, mockPresenter);
  });
  
  it('should return paginated products', async () => {
    // Given
    const request = { page: 1, pageSize: 10 };
    const mockProducts = [createMockProduct()];
    mockRepository.findByPageWithCriteria.mockResolvedValue(mockProducts);
    
    // When
    const result = await useCase.execute(request);
    
    // Then
    expect(result.products).toHaveLength(1);
    expect(mockRepository.findByPageWithCriteria).toHaveBeenCalledWith(
      1, 10, undefined, undefined
    );
  });
});
```

## 🌟 Feature-First 아키텍처의 장점

### 1. 비즈니스 중심의 코드 구조
- **높은 응집도**: 관련된 모든 코드가 하나의 Feature 디렉토리에 위치
- **낮은 결합도**: Feature 간 의존성은 명시적인 Public API를 통해서만 허용
- **직관적인 탐색**: 특정 기능을 찾기 위해 여러 계층을 넘나들 필요 없음

### 2. 확장성과 유지보수성  
- **독립적인 개발**: 각 Feature는 독립적으로 개발, 테스트, 배포 가능
- **팀 단위 개발**: Feature별로 팀을 나누어 병렬 개발 가능
- **점진적 마이그레이션**: 기존 코드를 Feature 단위로 점진적으로 리팩토링 가능

### 3. 명확한 경계와 의존성
- **Feature 경계**: 각 Feature의 책임과 범위가 명확히 정의됨
- **의존성 방향**: Cross-Feature 의존성이 명시적으로 관리됨
- **캡슐화**: Feature 내부 구현은 외부로부터 보호됨

### 4. 성능 최적화
- **Code Splitting**: Feature별 번들 분할로 초기 로딩 시간 단축
- **Lazy Loading**: 필요한 Feature만 동적으로 로드
- **Tree Shaking**: 사용하지 않는 Feature 코드는 번들에서 제외

## 📈 성능 모니터링 및 최적화

### Bundle Analysis
```typescript
// 번들 분석 유틸리티 사용
BundleAnalysis.logBundleInfo();
// 출력:
// 📦 Bundle Analysis
// Loaded chunks: ['product-management-page', 'bom-tree-table']  
// Preloaded chunks: ['product-table', 'navigation']
// Available chunks: [...모든 등록된 청크들]

// 모든 핵심 컴포넌트 프리로드 
await BundleAnalysis.preloadAllComponents();
```

### 지연 로딩 성능 최적화
- **Progressive Loading**: 중요한 컴포넌트부터 우선 로드
- **Preload Strategies**: 사용자 행동 패턴에 따른 예측 로딩
- **Retry Logic**: 네트워크 실패 시 지수 백오프를 통한 재시도
- **Error Boundaries**: Feature별 독립적인 에러 처리

## 🎯 개발 가이드라인

### Feature 추가 시 체크리스트
1. **Feature 디렉토리 구조** 생성
2. **Domain Layer** 구현 (엔티티, 비즈니스 규칙)
3. **Application Layer** 구현 (UseCases)
4. **Infrastructure Layer** 구현 (Repository, Mock 데이터)
5. **Presentation Layer** 구현 (Components, Hooks)
6. **DIContainer**에 의존성 등록
7. **Feature index.ts**에서 Public API 정의
8. **지연 로딩** 및 **테스트** 코드 작성

### Cross-Feature 의존성 가이드라인
```typescript
// ✅ 권장: Feature의 Public API 사용
import { ProductListItem, useProductList } from '@features/product';
import { BOMTreeNode, useBOMTree } from '@features/bom';

// ❌ 금지: 내부 계층 직접 접근
import { Product } from '@features/product/domain/entities/Product';
import { GetProductListUseCase } from '@features/product/application/usecases/product/GetProductListUseCase';

// ⚠️ 주의: 순환 의존성 방지
// BOM Feature가 Product Feature를 참조하는 것은 OK
// Product Feature가 BOM Feature를 참조하는 것은 NG
```

이 Feature-First Clean Architecture는 **확장 가능하고 유지보수하기 쉬운 Enterprise급 React 애플리케이션**의 모범 사례를 제시하며, 복잡한 비즈니스 도메인을 효과적으로 관리할 수 있는 구조를 제공합니다.