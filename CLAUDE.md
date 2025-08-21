# 🚀 MES 제품정보 관리 시스템 - 개발자 온보딩 가이드

> **React + TypeScript + Feature-First Clean Architecture**로 구축된 Enterprise급 MES(제조실행시스템) 프론트엔드 애플리케이션

## 📋 목차

1. [프로젝트 개요](#-프로젝트-개요)
2. [기술 스택](#-기술-스택)
3. [아키텍처 소개](#-아키텍처-소개)
4. [개발 환경 설정](#-개발-환경-설정)
5. [Feature 기반 개발 워크플로우](#-feature-기반-개발-워크플로우)
6. [신규 기능 개발 가이드](#-신규-기능-개발-가이드)
7. [코딩 컨벤션](#-코딩-컨벤션)
8. [성능 최적화 전략](#-성능-최적화-전략)
9. [테스트 전략](#-테스트-전략)
10. [트러블슈팅](#-트러블슈팅)

---

## 🎯 프로젝트 개요

### 비즈니스 도메인
**MES(Manufacturing Execution System)** 제품정보 관리 시스템으로, 제조업체의 핵심 업무를 지원합니다:

- **제품 관리**: 완제품, 반제품, 원자재의 전체 생명주기 관리
- **BOM 관리**: 제품 구성정보(Bill of Materials) 및 계층구조 관리
- **이력 추적**: 모든 변경사항에 대한 감사(Audit) 추적

### 아키텍처 특징
- **Feature-First Clean Architecture**: 비즈니스 기능 중심의 모듈 구조
- **상태 관리 현대화**: TanStack Query v5 + Zustand 조합
- **성능 최적화**: Code Splitting, Lazy Loading, 가상화(Virtualization)

---

## 🛠 기술 스택

### 🎨 Frontend Framework
```typescript
React 18.2.0        // 최신 Concurrent Features 활용
TypeScript 4.9.5    // 타입 안전성과 개발 생산성 향상
```

### 📦 상태 관리
```typescript
@tanstack/react-query 5.85.5   // 서버 상태 관리 (캐싱, 동기화)
zustand 5.0.7                  // UI 상태 관리 (모달, 필터 등)
```

### 🎭 UI & 스타일링
```typescript
styled-components 6.1.6        // CSS-in-JS 스타일링
@tanstack/react-table 8.10.7   // 고성능 테이블 컴포넌트
react-window 1.8.11            // 대용량 리스트 가상화
```

### 🔄 라우팅 & 폼
```typescript
react-router-dom 6.20.1        // SPA 라우팅
react-hook-form 7.48.2         // 고성능 폼 관리
```

### 🔌 의존성 주입 & HTTP
```typescript
tsyringe 4.10.0                // 의존성 주입 컨테이너
axios 1.6.2                    // HTTP 클라이언트
reflect-metadata 0.2.2         // 메타데이터 지원
```

### 🧪 테스팅
```typescript
@testing-library/react 13.4.0  // React 컴포넌트 테스트
@testing-library/jest-dom 5.17.0
@testing-library/user-event 14.5.2
```

### 🔧 개발 도구
```typescript
@craco/craco 7.1.0             // Create React App 커스터마이징
eslint 8.55.0                  // 코드 품질 검사
```

---

## 🏗 아키텍처 소개

### Feature-First Clean Architecture의 핵심

> **"레이어가 아닌 비즈니스 기능(Feature) 중심으로 코드를 구조화"**

```
전통적인 Layer-First ❌          Feature-First ✅
├── components/                 ├── features/
├── services/                   │   ├── product/    # 제품 Feature
├── repositories/               │   │   ├── domain/
├── hooks/                      │   │   ├── application/
└── pages/                      │   │   ├── infrastructure/
                                │   │   └── presentation/
                                │   └── bom/        # BOM Feature
                                │       ├── domain/
                                │       ├── application/
                                │       ├── infrastructure/
                                │       └── presentation/
                                └── shared/         # 공통 모듈
```

### 🔄 Clean Architecture 레이어 구조

```
┌─────────────────┐
│  Presentation   │ ← React Components, Hooks, Pages
├─────────────────┤
│   Application   │ ← UseCases (비즈니스 로직)
├─────────────────┤
│     Domain      │ ← Entities, Services (핵심 비즈니스 규칙)
├─────────────────┤
│ Infrastructure  │ ← Repositories, API 클라이언트
└─────────────────┘
```

### 📁 프로젝트 구조 상세

```
src/
├── app/                        # 🚀 애플리케이션 전역 설정
│   ├── config/
│   │   ├── DIContainer.ts      # 의존성 주입 컨테이너
│   │   └── AppInitializer.ts   # 앱 초기화 로직
│   ├── providers/
│   │   └── QueryProvider.tsx   # TanStack Query 설정
│   ├── router/
│   │   └── AppRouter.tsx       # 라우팅 설정
│   ├── App.tsx
│   └── main.tsx
│
├── features/                   # 🎯 비즈니스 기능별 모듈
│   ├── product/               # 제품 관리 Feature
│   │   ├── domain/            # 🧠 도메인 계층
│   │   │   ├── entities/      # Product, ProductHistory
│   │   │   ├── repositories/  # ProductRepository 인터페이스
│   │   │   └── services/      # ProductCodeGenerator, ProductUsageChecker
│   │   ├── application/       # 🔄 애플리케이션 계층
│   │   │   └── usecases/      # GetProductListUseCase, CreateProductUseCase...
│   │   ├── infrastructure/    # 🔌 인프라 계층
│   │   │   ├── repositories/  # MockProductRepository, HttpProductRepository
│   │   │   └── services/      # MockData 등
│   │   ├── presentation/      # 🖼️ 프레젠테이션 계층
│   │   │   ├── components/    # ProductTable, ProductSearchFilter
│   │   │   ├── hooks/         # useProductList, useCreateProduct
│   │   │   ├── pages/         # ProductManagementPage
│   │   │   └── styles/
│   │   ├── config/
│   │   │   └── ProductDIModule.ts  # Feature별 DI 설정
│   │   └── index.ts           # Public API 정의
│   │
│   └── bom/                   # BOM 관리 Feature
│       ├── domain/
│       │   ├── entities/      # BOM, BOMItem, BOMHistory
│       │   ├── repositories/  # BOMRepository 인터페이스
│       │   └── services/      # BOMCircularChecker, BOMUsageChecker
│       ├── application/
│       │   └── usecases/      # GetBOMTreeUseCase, AddBOMItemUseCase...
│       ├── infrastructure/
│       │   ├── repositories/  # MockBOMRepository, HttpBOMRepository
│       │   └── services/      # MockBOMData
│       ├── presentation/
│       │   ├── components/    # BOMTreeTable, BOMTreeNode
│       │   ├── hooks/         # useBOMTree, useBOMOperations
│       │   ├── pages/         # BOMManagementPage
│       │   └── styles/
│       ├── config/
│       │   └── BOMDIModule.ts
│       └── index.ts
│
├── shared/                    # 🔗 공통 모듈
│   ├── components/
│   │   ├── common/           # Pagination, ErrorBoundary
│   │   ├── layout/           # AppLayout
│   │   └── navigation/       # Navigation
│   ├── hooks/                # useDebounce, useInfiniteScroll
│   ├── services/             # ApiClient
│   ├── stores/               # appStore (Zustand)
│   ├── types/                # 공통 TypeScript 타입
│   ├── constants/
│   └── utils/
│
└── assets/                   # 🎨 정적 자원
    ├── icons/
    ├── images/
    └── styles/
```

---

## ⚙️ 개발 환경 설정

### 1. 프로젝트 클론 및 의존성 설치

```bash
# 1. 프로젝트 클론
git clone <repository-url>
cd FrontEnd_Base

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정 (선택사항)
# .env.local 파일 생성
echo "REACT_APP_USE_MOCK_DATA=true" > .env.local
```

### 2. 개발 서버 실행

```bash
# 개발 서버 시작 (Mock 데이터 사용)
npm start

# TypeScript 타입 체크
npm run typecheck

# ESLint 검사
npm run lint

# ESLint 자동 수정
npm run lint:fix
```

### 3. 환경 변수 설명

```bash
# Mock 데이터 사용 여부 (기본값: true)
REACT_APP_USE_MOCK_DATA=true   # Mock 데이터 사용
REACT_APP_USE_MOCK_DATA=false  # 실제 API 연동
```

### 4. Path Mapping 설정

프로젝트는 절대 경로 import를 위해 Path Mapping을 사용합니다:

```typescript
// ✅ 권장 사용법
import { ProductListItem } from '@features/product';
import { BOMTreeTable } from '@features/bom';
import { Pagination } from '@shared/components/common/Pagination';
import { DIContainer } from '@app/config/DIContainer';

// ❌ 상대 경로 사용 금지
import { Product } from '../../../domain/entities/Product';
```

---

## 🔄 Feature 기반 개발 워크플로우

### 1. 제품 관리 Feature 워크플로우

#### 📊 데이터 플로우 시퀀스
```
1. ProductManagementPage 렌더링
   ↓
2. useProductList() 훅 초기화
   ↓
3. ProductDI.getProductListUseCase() 획득
   ↓
4. TanStack Query로 GetProductListUseCase.execute() 호출
   ↓
5. ProductRepository.findByPageWithCriteria() 실행
   ↓
6. MockProductRepository에서 Mock 데이터 조회 
   (실제 환경: HttpProductRepository에서 API 호출)
   ↓
7. 도메인 엔티티 → DTO 변환 (ProductPresenter 사용)
   ↓
8. TanStack Query 캐싱 및 Zustand UI 상태 업데이트
   ↓
9. ProductTable 컴포넌트 리렌더링
```

#### 🎛 상태 관리 구조
```typescript
// 서버 상태 (TanStack Query)
useFeatureQuery({
  feature: 'product',
  operation: 'list',
  queryFn: () => getProductListUseCase.execute(request),
  staleTime: 2 * 60 * 1000,  // 2분간 fresh
  gcTime: 10 * 60 * 1000     // 10분간 캐시 유지
});

// UI 상태 (Zustand)
const productView = useAppStoreSelectors.useProductView();
// { currentPage: 1, pageSize: 10, sortBy: 'cd_material', ... }

const productFilters = useAppStoreSelectors.useProductFilters(); 
// { searchKeyword: '', activeFilters: [] }
```

### 2. BOM 관리 Feature 워크플로우

#### 🌳 BOM 트리 구조 처리
```
1. BOMManagementPage에서 제품 선택
   ↓
2. useBOMTree(productId) 훅 실행
   ↓
3. BOMDI.getBOMTreeUseCase() 획득
   ↓
4. GetBOMTreeUseCase.execute({ productId, maxLevel: 10 })
   ↓
5. BOMRepository + BOMItemRepository에서 계층구조 조회
   ↓
6. BOMCircularChecker로 순환참조 검증
   ↓
7. 계층적 트리 노드 구조 생성
   ↓
8. Zustand로 트리 확장/축소 상태 관리
   ↓
9. VirtualizedBOMTree 컴포넌트로 대용량 트리 렌더링
```

#### 🔧 트리 상태 관리
```typescript
// BOM 트리 확장/축소 상태 (Zustand)
const bomTree = useAppStoreSelectors.useBomTree();
// { expandedNodes: Set<string>, selectedNode: string | null }

// 트리 조작 액션들
const { expandNode, collapseNode, expandAll, expandToLevel } = useBOMTree(productId);

// 가상화를 통한 성능 최적화
<VirtualizedBOMTree
  nodes={filteredNodes}
  expandedNodes={expandedNodes}
  itemHeight={40}
  maxHeight={600}
/>
```

### 3. Cross-Feature 통신 패턴

```typescript
// 제품 → BOM Feature 의존성 (허용)
import { ProductListItem } from '@features/product';  // ✅

// BOM Feature에서 Product Feature 참조
const ProductManagementPage = () => {
  const { products } = useProductList();           // Product Feature
  const { bomNodes } = useBOMTree(selectedProduct?.id);  // BOM Feature
  
  return (
    <TabContainer>
      <TabPanel name="products">
        <ProductTable products={products} />
      </TabPanel>
      <TabPanel name="bom">
        <BOMTreeTable nodes={bomNodes} />
      </TabPanel>
    </TabContainer>
  );
};
```

---

## 🆕 신규 기능 개발 가이드

### 🚀 효율적이고 생산성 높은 신규 Feature 추가 방법

#### Phase 1: 기획 및 분석 (30분)

```typescript
/**
 * 1. 비즈니스 요구사항 분석
 * - 어떤 도메인 문제를 해결하는가?
 * - 기존 Feature와의 관계는?
 * - 새로운 엔티티나 비즈니스 규칙이 필요한가?
 */

// 예시: 품질검사(QualityInspection) Feature 추가
```

#### Phase 2: Feature 구조 생성 (15분)

```bash
# 1. Feature 디렉토리 구조 생성
mkdir -p src/features/quality-inspection/{domain,application,infrastructure,presentation}/{entities,repositories,services,usecases,components,hooks,pages,styles}

# 2. 기본 파일들 생성
touch src/features/quality-inspection/index.ts
touch src/features/quality-inspection/config/QualityInspectionDIModule.ts
```

#### Phase 3: Domain Layer 구현 (45분)

```typescript
// src/features/quality-inspection/domain/entities/QualityInspection.ts
export class QualityInspection {
  constructor(
    private readonly id: QualityInspectionId,
    private readonly productId: ProductId,
    private readonly inspectionType: InspectionType,
    private readonly status: InspectionStatus,
    private readonly inspectorId: string,
    private readonly inspectionDate: Date,
    private readonly criteria: InspectionCriteria[],
    private readonly results: InspectionResult[]
  ) {
    this.validateInspection();
  }

  // 비즈니스 로직 메서드들
  public canApprove(): boolean {
    return this.status === InspectionStatus.COMPLETED && 
           this.allCriteriaPassed();
  }

  public reject(reason: string): void {
    if (this.status !== InspectionStatus.COMPLETED) {
      throw new Error('완료된 검사만 반려할 수 있습니다.');
    }
    this.status = InspectionStatus.REJECTED;
  }

  private validateInspection(): void {
    if (!this.productId) {
      throw new Error('제품 ID는 필수입니다.');
    }
    // 추가 검증 로직...
  }
}

// src/features/quality-inspection/domain/repositories/QualityInspectionRepository.ts
export interface QualityInspectionRepository {
  findById(id: QualityInspectionId): Promise<QualityInspection | null>;
  findByProductId(productId: ProductId): Promise<QualityInspection[]>;
  save(inspection: QualityInspection): Promise<void>;
  delete(id: QualityInspectionId): Promise<void>;
}

// src/features/quality-inspection/domain/services/InspectionValidator.ts
export interface InspectionValidator {
  validateCriteria(criteria: InspectionCriteria[]): ValidationResult;
  checkComplianceStandards(inspection: QualityInspection): ComplianceResult;
}
```

#### Phase 4: Application Layer 구현 (60분)

```typescript
// src/features/quality-inspection/application/usecases/CreateInspectionUseCase.ts
export class CreateInspectionUseCase {
  constructor(
    private readonly inspectionRepository: QualityInspectionRepository,
    private readonly productRepository: ProductRepository,
    private readonly inspectionValidator: InspectionValidator,
    private readonly historyRepository: InspectionHistoryRepository
  ) {}

  async execute(request: CreateInspectionRequest): Promise<CreateInspectionResponse> {
    // 1. 입력 검증
    this.validateRequest(request);

    // 2. 제품 존재 여부 확인
    const product = await this.productRepository.findById(new ProductId(request.productId));
    if (!product) {
      throw new Error('제품을 찾을 수 없습니다.');
    }

    // 3. 검사 기준 검증
    const validationResult = this.inspectionValidator.validateCriteria(request.criteria);
    if (!validationResult.isValid) {
      throw new Error(`검사 기준이 유효하지 않습니다: ${validationResult.errors.join(', ')}`);
    }

    // 4. 도메인 엔티티 생성
    const inspection = new QualityInspection(
      QualityInspectionId.generate(),
      new ProductId(request.productId),
      request.inspectionType,
      InspectionStatus.PENDING,
      request.inspectorId,
      new Date(),
      request.criteria,
      []
    );

    // 5. 저장
    await this.inspectionRepository.save(inspection);

    // 6. 이력 생성
    await this.historyRepository.create({
      inspectionId: inspection.getId().getValue(),
      action: 'CREATED',
      performedBy: request.inspectorId,
      timestamp: new Date()
    });

    return {
      inspectionId: inspection.getId().getValue(),
      status: inspection.getStatus(),
      createdAt: inspection.getInspectionDate()
    };
  }
}
```

#### Phase 5: Infrastructure Layer 구현 (45분)

```typescript
// src/features/quality-inspection/infrastructure/repositories/MockQualityInspectionRepository.ts
export class MockQualityInspectionRepository implements QualityInspectionRepository {
  private inspections: QualityInspection[] = [];

  async findById(id: QualityInspectionId): Promise<QualityInspection | null> {
    return this.inspections.find(inspection => 
      inspection.getId().equals(id)
    ) || null;
  }

  async findByProductId(productId: ProductId): Promise<QualityInspection[]> {
    return this.inspections.filter(inspection => 
      inspection.getProductId().equals(productId)
    );
  }

  async save(inspection: QualityInspection): Promise<void> {
    const index = this.inspections.findIndex(existing => 
      existing.getId().equals(inspection.getId())
    );
    
    if (index >= 0) {
      this.inspections[index] = inspection;
    } else {
      this.inspections.push(inspection);
    }
  }

  async delete(id: QualityInspectionId): Promise<void> {
    this.inspections = this.inspections.filter(inspection => 
      !inspection.getId().equals(id)
    );
  }
}

// src/features/quality-inspection/infrastructure/repositories/HttpQualityInspectionRepository.ts
export class HttpQualityInspectionRepository implements QualityInspectionRepository {
  constructor(private readonly apiClient: ApiClient) {}

  async findById(id: QualityInspectionId): Promise<QualityInspection | null> {
    try {
      const response = await this.apiClient.get(`/quality-inspections/${id.getValue()}`);
      return this.mapToEntity(response.data);
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  // 추가 메서드 구현...
}
```

#### Phase 6: Presentation Layer 구현 (90분)

```typescript
// src/features/quality-inspection/presentation/hooks/useQualityInspectionList.ts
export const useQualityInspectionList = (productId?: string) => {
  const qualityInspectionView = useAppStoreSelectors.useQualityInspectionView();
  const getInspectionListUseCase = QualityInspectionDI.getInspectionListUseCase();

  const currentRequest = useMemo(() => ({
    productId,
    page: qualityInspectionView.currentPage,
    pageSize: qualityInspectionView.pageSize,
    status: qualityInspectionView.statusFilter,
  }), [productId, qualityInspectionView]);

  const inspectionListQuery = useFeatureQuery<GetInspectionListResponse>({
    feature: 'quality-inspection',
    operation: 'list',
    params: currentRequest,
    queryFn: () => getInspectionListUseCase.execute(currentRequest),
    enabled: !!productId,
    staleTime: 1000 * 60 * 3, // 3분간 fresh
    gcTime: 1000 * 60 * 15,   // 15분간 캐시 유지
  });

  return {
    inspections: inspectionListQuery.data?.inspections || [],
    totalCount: inspectionListQuery.data?.totalCount || 0,
    loading: inspectionListQuery.isLoading,
    error: inspectionListQuery.error?.message || null,
    refresh: inspectionListQuery.refetch,
  };
};

// src/features/quality-inspection/presentation/components/QualityInspectionTable.tsx
export const QualityInspectionTable: React.FC<QualityInspectionTableProps> = ({
  inspections,
  loading,
  onInspectionSelect,
}) => {
  const columns = useMemo(() => [
    {
      accessorKey: 'inspectionNo',
      header: '검사번호',
      cell: ({ row }) => (
        <InspectionNoCell inspection={row.original} />
      ),
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} />
      ),
    },
    {
      accessorKey: 'inspectorName',
      header: '검사자',
    },
    {
      accessorKey: 'inspectionDate',
      header: '검사일자',
      cell: ({ row }) => (
        <DateCell date={row.original.inspectionDate} />
      ),
    },
    {
      id: 'actions',
      header: '작업',
      cell: ({ row }) => (
        <InspectionActions 
          inspection={row.original}
          onView={() => onInspectionSelect(row.original)}
        />
      ),
    },
  ], [onInspectionSelect]);

  const table = useReactTable({
    data: inspections,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <TableContainer>
      <StyledTable>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </StyledTable>
    </TableContainer>
  );
};
```

#### Phase 7: DI 설정 및 통합 (30분)

```typescript
// src/features/quality-inspection/config/QualityInspectionDIModule.ts
export class QualityInspectionDI {
  private static container: Container;

  static initialize(): void {
    this.container = new Container();
    this.setupDependencies();
  }

  private static setupDependencies(): void {
    const useMockData = process.env.REACT_APP_USE_MOCK_DATA !== 'false';

    // Repository 등록
    if (useMockData) {
      this.container.registerSingleton<QualityInspectionRepository>(
        'QualityInspectionRepository',
        MockQualityInspectionRepository
      );
    } else {
      this.container.register<QualityInspectionRepository>(
        'QualityInspectionRepository',
        { useClass: HttpQualityInspectionRepository }
      );
    }

    // UseCase 등록
    this.container.register<CreateInspectionUseCase>(
      'CreateInspectionUseCase',
      { useClass: CreateInspectionUseCase }
    );
  }

  static getCreateInspectionUseCase(): CreateInspectionUseCase {
    return this.container.resolve<CreateInspectionUseCase>('CreateInspectionUseCase');
  }
}

// src/features/quality-inspection/index.ts - Public API 정의
export { QualityInspectionTable } from './presentation/components/QualityInspectionTable';
export { useQualityInspectionList } from './presentation/hooks/useQualityInspectionList';
export { QualityInspectionManagementPage } from './presentation/pages/QualityInspectionManagementPage';

// Types
export type { QualityInspectionListItem } from './application/usecases/GetInspectionListUseCase';
export type { CreateInspectionRequest } from './application/usecases/CreateInspectionUseCase';
```

#### Phase 8: 기존 Feature와 통합 (45분)

```typescript
// src/features/product/presentation/pages/ProductManagementPage.tsx에 품질검사 탭 추가
import { QualityInspectionTable } from '@features/quality-inspection';

export const ProductManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'bom' | 'quality'>('products');
  
  // 기존 코드...

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
          <Tab active={activeTab === 'quality'} onClick={() => setActiveTab('quality')}>
            🔍 품질검사
          </Tab>
        </TabList>
        
        {/* 기존 탭들... */}
        
        <TabPanel active={activeTab === 'quality'}>
          <QualityInspectionTable 
            productId={selectedProduct?.id}
            onInspectionSelect={handleInspectionSelect}
          />
        </TabPanel>
      </TabContainer>
    </Container>
  );
};
```

### 🎯 개발 생산성을 높이는 팁

#### 1. Code Generation 활용
```bash
# 새 Feature 스캐폴딩을 위한 스크립트 작성
./scripts/generate-feature.sh quality-inspection

# 또는 Plop.js 등의 코드 생성 도구 활용
npm install -g plop
plop feature quality-inspection
```

#### 2. 개발 중 실시간 피드백 루프
```bash
# 여러 터미널에서 동시 실행
npm start          # 개발 서버
npm run typecheck  # TypeScript 체크
npm run lint       # ESLint 체크
npm test -- --watch # 테스트 watch 모드
```

#### 3. Feature 테스트 우선 개발 (TDD)
```typescript
// Feature 구현 전에 테스트부터 작성
describe('CreateInspectionUseCase', () => {
  it('should create inspection with valid data', async () => {
    // Given
    const request = createMockInspectionRequest();
    const useCase = new CreateInspectionUseCase(/* mocked dependencies */);
    
    // When
    const result = await useCase.execute(request);
    
    // Then
    expect(result.inspectionId).toBeDefined();
    expect(result.status).toBe(InspectionStatus.PENDING);
  });
});
```

#### 4. Feature 단위 Hot Reload
```typescript
// Feature별 지연 로딩으로 개발 중 빠른 재로드
const LazyQualityInspectionPage = lazy(() => 
  import('@features/quality-inspection/presentation/pages/QualityInspectionManagementPage')
);
```

---

## 📝 코딩 컨벤션

### 🎯 TypeScript 컨벤션

#### 타입 정의
```typescript
// ✅ 구체적이고 명시적인 타입 정의
interface ProductFilter {
  readonly field: keyof Product;
  readonly operator: 'equals' | 'contains' | 'startsWith' | 'between';
  readonly value: string | number | Date | [Date, Date];
}

// ✅ Union Type 활용
type ProductStatus = 'active' | 'inactive' | 'discontinued';

// ✅ Branded Type으로 타입 안전성 강화
export class ProductId {
  private readonly _brand = 'ProductId';
  constructor(private readonly value: string) {}
  getValue(): string { return this.value; }
  equals(other: ProductId): boolean { return this.value === other.value; }
}
```

#### 함수 및 메서드
```typescript
// ✅ 순수 함수 지향
const calculateTotalCost = (items: BOMItem[]): number => {
  return items.reduce((total, item) => total + (item.quantity * item.unitCost), 0);
};

// ✅ 불변성 유지
const updateProductStatus = (product: Product, newStatus: ProductStatus): Product => {
  return new Product(
    product.getId(),
    product.getCdMaterial(),
    product.getNmMaterial(),
    product.getType(),
    newStatus, // 변경된 상태만 적용
    product.getSafetyStock(),
    product.getCreatedAt(),
    new Date() // updatedAt은 현재 시간으로
  );
};

// ✅ 에러 처리 명시적
const validateProduct = (product: Product): ValidationResult => {
  try {
    product.validate();
    return { isValid: true, errors: [] };
  } catch (error) {
    return { 
      isValid: false, 
      errors: [error instanceof Error ? error.message : '알 수 없는 오류'] 
    };
  }
};
```

### 🎨 React 컴포넌트 컨벤션

#### 컴포넌트 구조
```typescript
// ✅ Props 인터페이스 명시적 정의
interface ProductTableProps {
  readonly products: ProductListItem[];
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly onProductSelect?: (product: ProductListItem) => void;
  readonly onProductEdit?: (product: ProductListItem) => void;
  readonly onProductDelete?: (productId: string) => void;
}

// ✅ 컴포넌트 함수명과 파일명 일치
export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  loading = false,
  error = null,
  onProductSelect,
  onProductEdit,
  onProductDelete,
}) => {
  // ✅ 훅은 컴포넌트 최상단에 배치
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  
  // ✅ useCallback으로 불필요한 재렌더링 방지
  const handleProductSelect = useCallback((product: ProductListItem) => {
    onProductSelect?.(product);
  }, [onProductSelect]);

  // ✅ useMemo로 expensive calculation 최적화
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.cd_material.localeCompare(b.cd_material));
  }, [products]);

  // ✅ 조건부 렌더링 명확하게
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (products.length === 0) {
    return <EmptyState message="등록된 제품이 없습니다." />;
  }

  return (
    <TableContainer>
      {/* JSX 구조 */}
    </TableContainer>
  );
};
```

#### 커스텀 훅 컨벤션
```typescript
// ✅ 훅 네이밍: use + 기능명
export const useProductList = () => {
  // ✅ 상태는 객체로 그룹화
  const [state, setState] = useState<UseProductListState>({
    products: [],
    totalCount: 0,
    loading: false,
    error: null,
  });

  // ✅ useCallback으로 함수 최적화
  const loadProducts = useCallback(async (request: GetProductListRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await getProductListUseCase.execute(request);
      setState(prev => ({
        ...prev,
        products: response.products,
        totalCount: response.totalCount,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
      }));
    }
  }, []);

  // ✅ 필요한 것만 return
  return useMemo(() => ({
    ...state,
    loadProducts,
    refresh: () => loadProducts(lastRequest.current),
  }), [state, loadProducts]);
};
```

### 🏗 아키텍처 컨벤션

#### Feature 간 의존성
```typescript
// ✅ Public API를 통한 Feature 접근
import { ProductListItem, useProductList } from '@features/product';
import { BOMTreeNode, useBOMTree } from '@features/bom';

// ❌ 내부 구현 직접 접근 금지
import { Product } from '@features/product/domain/entities/Product';
import { MockProductRepository } from '@features/product/infrastructure/repositories/MockProductRepository';
```

#### UseCase 패턴
```typescript
// ✅ UseCase 구조 표준화
export class GetProductListUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productPresenter: ProductPresenter
  ) {}

  async execute(request: GetProductListRequest): Promise<GetProductListResponse> {
    // 1. 입력 검증
    this.validateRequest(request);

    // 2. 비즈니스 로직 실행
    const products = await this.productRepository.findByPageWithCriteria(
      request.page,
      request.pageSize,
      request.searchCriteria,
      request.sortCriteria
    );

    // 3. 결과 변환 및 반환
    return {
      products: products.map(product => this.productPresenter.toListItem(product)),
      totalCount: await this.productRepository.count(request.searchCriteria),
      currentPage: request.page,
      totalPages: Math.ceil(totalCount / request.pageSize),
    };
  }

  private validateRequest(request: GetProductListRequest): void {
    if (request.page < 1) {
      throw new Error('페이지 번호는 1 이상이어야 합니다.');
    }
    if (request.pageSize < 1 || request.pageSize > 100) {
      throw new Error('페이지 크기는 1-100 사이여야 합니다.');
    }
  }
}
```

---

## ⚡ 성능 최적화 전략

### 1. 🔄 상태 관리 최적화

#### TanStack Query 캐싱 전략
```typescript
// ✅ Feature별 캐시 설정 최적화
const productQueryHooks = createFeatureQueryHooks('product', {
  staleTime: 1000 * 60 * 2,    // 2분간 fresh (제품 데이터는 자주 변경)
  gcTime: 1000 * 60 * 10,      // 10분간 캐시 유지
  retry: 3,                    // 3회 재시도
});

const bomQueryHooks = createFeatureQueryHooks('bom', {
  staleTime: 1000 * 60 * 5,    // 5분간 fresh (BOM은 덜 자주 변경)
  gcTime: 1000 * 60 * 15,      // 15분간 캐시 유지
  retry: 2,
});

// ✅ 관련 쿼리 무효화 최적화
const useUpdateProduct = () => {
  return useFeatureMutation({
    mutationFn: (variables) => updateProductUseCase.execute(variables),
    onSuccess: (data, variables) => {
      // 세밀한 무효화: 전체가 아닌 관련 쿼리만
      queryClient.invalidateQueries([
        createQueryKey.product.list(),
        createQueryKey.product.detail(variables.id),
        // BOM이 이 제품을 참조한다면 BOM 쿼리도 무효화
        createQueryKey.bom.byProduct(variables.id),
      ]);
    },
  });
};
```

#### Zustand 상태 최적화
```typescript
// ✅ selector 패턴으로 불필요한 재렌더링 방지
export const useAppStoreSelectors = {
  useProductView: () => useAppStore(state => state.product.view),
  useProductFilters: () => useAppStore(state => state.product.filters),
  useBomTree: () => useAppStore(state => state.bom.tree),
  // 개별 필드 selector로 세밀한 구독
  useCurrentPage: () => useAppStore(state => state.product.view.currentPage),
  useSearchKeyword: () => useAppStore(state => state.product.filters.searchKeyword),
};

// ✅ 액션은 별도 selector로 분리하여 안정성 확보
const setProductView = useAppStore(state => state.product.setView);
const setProductFilters = useAppStore(state => state.product.setFilters);
```

### 2. 🚀 렌더링 최적화

#### React.memo와 useMemo 활용
```typescript
// ✅ 컴포넌트 메모이제이션
export const ProductTableRow = React.memo<ProductTableRowProps>(({
  product,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}) => {
  // ✅ 이벤트 핸들러 최적화
  const handleSelect = useCallback(() => {
    onSelect(product);
  }, [product, onSelect]);

  const handleEdit = useCallback(() => {
    onEdit(product);
  }, [product, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(product.id);
  }, [product.id, onDelete]);

  return (
    <TableRow selected={isSelected}>
      <TableCell>{product.cd_material}</TableCell>
      <TableCell>{product.nm_material}</TableCell>
      <TableCell>
        <ActionButtons
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </TableCell>
    </TableRow>
  );
});

// ✅ 복잡한 계산 메모이제이션
const ProductStatistics = ({ products }: { products: ProductListItem[] }) => {
  const statistics = useMemo(() => {
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const inactiveProducts = totalProducts - activeProducts;
    
    const typeDistribution = products.reduce((acc, product) => {
      acc[product.type] = (acc[product.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalProducts,
      activeProducts,
      inactiveProducts,
      typeDistribution,
    };
  }, [products]);

  return <StatisticsDisplay {...statistics} />;
};
```

#### 가상화를 통한 대용량 데이터 처리
```typescript
// ✅ react-window를 활용한 가상화 테이블
import { FixedSizeList as List } from 'react-window';

export const VirtualizedProductTable: React.FC<VirtualizedProductTableProps> = ({
  products,
  itemHeight = 50,
  maxHeight = 400,
}) => {
  const renderRow = useCallback(({ index, style }: ListChildComponentProps) => {
    const product = products[index];
    return (
      <div style={style}>
        <ProductTableRow product={product} />
      </div>
    );
  }, [products]);

  return (
    <List
      height={Math.min(maxHeight, products.length * itemHeight)}
      itemCount={products.length}
      itemSize={itemHeight}
      itemData={products}
    >
      {renderRow}
    </List>
  );
};

// ✅ 무한 스크롤 구현
export const useInfiniteProductList = () => {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite'],
    queryFn: ({ pageParam = 1 }) => 
      getProductListUseCase.execute({ page: pageParam, pageSize: 20 }),
    getNextPageParam: (lastPage) => 
      lastPage.hasNextPage ? lastPage.currentPage + 1 : undefined,
    staleTime: 1000 * 60 * 2,
  });
};
```

### 3. 📦 코드 분할 및 지연 로딩

#### Feature별 번들 분할
```typescript
// ✅ Feature별 지연 로딩
const LazyProductManagementPage = lazy(() => 
  import('@features/product').then(module => ({
    default: module.ProductManagementPage
  }))
);

const LazyBOMManagementPage = lazy(() => 
  import('@features/bom').then(module => ({
    default: module.BOMManagementPage  
  }))
);

// ✅ 지능적 프리로딩
const usePreloadFeatures = () => {
  useEffect(() => {
    // 사용자가 제품 페이지에 있으면 BOM 페이지 프리로드
    const preloadTimer = setTimeout(() => {
      import('@features/bom');
    }, 2000);

    return () => clearTimeout(preloadTimer);
  }, []);
};

// ✅ 컴포넌트 레벨 지연 로딩
const LazyBOMTreeTable = lazy(() => 
  import('@features/bom/presentation/components/bom/BOMTreeTable')
);

const BOMSection = ({ productId }: { productId: string }) => {
  const [shouldLoadBOM, setShouldLoadBOM] = useState(false);

  useEffect(() => {
    // 제품이 선택되면 BOM 컴포넌트 로드
    if (productId) {
      setShouldLoadBOM(true);
    }
  }, [productId]);

  if (!shouldLoadBOM) {
    return <BOMPlaceholder />;
  }

  return (
    <Suspense fallback={<BOMTableSkeleton />}>
      <LazyBOMTreeTable productId={productId} />
    </Suspense>
  );
};
```

### 4. 🌐 네트워크 최적화

#### API 호출 최적화
```typescript
// ✅ 요청 디바운싱
export const useProductSearch = () => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const debouncedKeyword = useDebounce(searchKeyword, 300);

  const searchQuery = useFeatureQuery({
    feature: 'product',
    operation: 'search',
    params: { keyword: debouncedKeyword },
    queryFn: () => searchProductUseCase.execute({ keyword: debouncedKeyword }),
    enabled: debouncedKeyword.length >= 2, // 2글자 이상일 때만 검색
    staleTime: 1000 * 60 * 1, // 검색 결과는 1분간만 유지
  });

  return {
    searchKeyword,
    setSearchKeyword,
    results: searchQuery.data?.products || [],
    isSearching: searchQuery.isFetching,
  };
};

// ✅ 배치 요청 최적화
export class BatchProductLoader {
  private pendingRequests: Set<string> = new Set();
  private batchTimer: NodeJS.Timeout | null = null;

  async loadProduct(productId: string): Promise<Product> {
    this.pendingRequests.add(productId);

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    return new Promise((resolve, reject) => {
      this.batchTimer = setTimeout(async () => {
        try {
          const productIds = Array.from(this.pendingRequests);
          this.pendingRequests.clear();
          
          const products = await this.loadMultipleProducts(productIds);
          const product = products.find(p => p.getId().getValue() === productId);
          
          if (product) {
            resolve(product);
          } else {
            reject(new Error('Product not found'));
          }
        } catch (error) {
          reject(error);
        }
      }, 50); // 50ms 후 배치 실행
    });
  }
}
```

---

## 🧪 테스트 전략

### 1. 📊 테스트 피라미드

```
        /\
       /  \
      /E2E \ ← 소수의 중요한 플로우만
     /______\
    /        \
   /Integration\ ← Feature 간 상호작용
  /______________\
 /                \
/   Unit Tests     \ ← 가장 많은 비중
\__________________/
```

### 2. 🔧 Unit Testing (단위 테스트)

#### Domain Entity 테스트
```typescript
// src/features/product/__tests__/domain/entities/Product.test.ts
describe('Product Entity', () => {
  describe('비즈니스 규칙 검증', () => {
    it('제품코드가 비어있으면 오류를 발생시킨다', () => {
      // Given
      const invalidData = {
        id: 'prod-001',
        cd_material: '',  // 빈 제품코드
        nm_material: '테스트 제품',
        type: ProductType.FINISHED_PRODUCT,
      };

      // When & Then
      expect(() => new Product(
        new ProductId(invalidData.id),
        invalidData.cd_material,
        invalidData.nm_material,
        invalidData.type,
        ProductStatus.ACTIVE,
        0,
        new Date(),
        new Date()
      )).toThrow('제품코드는 필수입니다.');
    });

    it('완제품은 BOM을 가질 수 있다', () => {
      // Given
      const product = createMockProduct({
        type: ProductType.FINISHED_PRODUCT
      });

      // When
      const canHaveBOM = product.canHaveBOM();

      // Then
      expect(canHaveBOM).toBe(true);
    });

    it('원자재는 BOM을 가질 수 없다', () => {
      // Given
      const product = createMockProduct({
        type: ProductType.RAW_MATERIAL
      });

      // When
      const canHaveBOM = product.canHaveBOM();

      // Then
      expect(canHaveBOM).toBe(false);
    });
  });
});
```

#### UseCase 테스트
```typescript
// src/features/product/__tests__/application/usecases/GetProductListUseCase.test.ts
describe('GetProductListUseCase', () => {
  let useCase: GetProductListUseCase;
  let mockRepository: jest.Mocked<ProductRepository>;
  let mockPresenter: jest.Mocked<ProductPresenter>;

  beforeEach(() => {
    mockRepository = createMockProductRepository();
    mockPresenter = createMockProductPresenter();
    useCase = new GetProductListUseCase(mockRepository, mockPresenter);
  });

  describe('정상적인 제품 목록 조회', () => {
    it('페이지네이션된 제품 목록을 반환한다', async () => {
      // Given
      const request: GetProductListRequest = {
        page: 1,
        pageSize: 10,
        sortBy: 'cd_material',
        sortDirection: 'asc'
      };

      const mockProducts = [
        createMockProduct({ cd_material: 'PROD001' }),
        createMockProduct({ cd_material: 'PROD002' })
      ];

      mockRepository.findByPageWithCriteria.mockResolvedValue(mockProducts);
      mockRepository.count.mockResolvedValue(25);
      mockPresenter.toListItem.mockImplementation(product => ({
        id: product.getId().getValue(),
        cd_material: product.getCdMaterial(),
        nm_material: product.getNmMaterial(),
        type: product.getType(),
        status: product.getStatus(),
      }));

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.products).toHaveLength(2);
      expect(result.totalCount).toBe(25);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(3);
      expect(mockRepository.findByPageWithCriteria).toHaveBeenCalledWith(
        1, 10, undefined, { field: 'cd_material', direction: 'asc' }
      );
    });
  });

  describe('예외 상황 처리', () => {
    it('잘못된 페이지 번호에 대해 오류를 발생시킨다', async () => {
      // Given
      const request: GetProductListRequest = {
        page: 0,  // 잘못된 페이지 번호
        pageSize: 10
      };

      // When & Then
      await expect(useCase.execute(request))
        .rejects
        .toThrow('페이지 번호는 1 이상이어야 합니다.');
    });
  });
});
```

#### React Hook 테스트
```typescript
// src/features/product/__tests__/presentation/hooks/useProductList.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProductList } from '../../../presentation/hooks/useProductList';

describe('useProductList Hook', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  });

  it('초기 상태가 올바르게 설정된다', () => {
    // When
    const { result } = renderHook(() => useProductList(), { wrapper });

    // Then
    expect(result.current.products).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.loading).toBe(true); // 초기 로딩 상태
    expect(result.current.error).toBeNull();
  });

  it('제품 목록 로딩이 성공적으로 완료된다', async () => {
    // Given
    const mockProducts = [
      createMockProductListItem({ cd_material: 'PROD001' }),
      createMockProductListItem({ cd_material: 'PROD002' })
    ];

    // Mock UseCase 응답 설정
    mockGetProductListUseCase.execute.mockResolvedValue({
      products: mockProducts,
      totalCount: 2,
      currentPage: 1,
      totalPages: 1,
      hasNextPage: false
    });

    // When
    const { result } = renderHook(() => useProductList(), { wrapper });

    // Then
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toEqual(mockProducts);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.error).toBeNull();
  });
});
```

### 3. 🔗 Integration Testing (통합 테스트)

#### Feature 간 통신 테스트
```typescript
// src/__tests__/integration/ProductBOMIntegration.test.tsx
describe('Product-BOM Feature Integration', () => {
  it('제품 선택 시 해당 제품의 BOM 트리가 로드된다', async () => {
    // Given
    const mockProduct = createMockProductListItem({ id: 'prod-001' });
    const mockBOMNodes = [
      createMockBOMTreeNode({ productId: 'prod-001', level: 0 })
    ];

    mockGetProductListUseCase.execute.mockResolvedValue({
      products: [mockProduct],
      totalCount: 1
    });

    mockGetBOMTreeUseCase.execute.mockResolvedValue({
      bomInfo: createMockBOMInfo(),
      treeNodes: mockBOMNodes,
      totalItems: 1
    });

    // When
    render(<ProductManagementPage />);

    // 제품 목록 로딩 대기
    await waitFor(() => {
      expect(screen.getByText(mockProduct.cd_material)).toBeInTheDocument();
    });

    // 제품 선택
    fireEvent.click(screen.getByText(mockProduct.cd_material));

    // BOM 탭으로 전환
    fireEvent.click(screen.getByText('🏗️ BOM 관리'));

    // Then
    await waitFor(() => {
      expect(mockGetBOMTreeUseCase.execute).toHaveBeenCalledWith({
        productId: 'prod-001',
        includeInactive: true,
        maxLevel: 10
      });
    });

    expect(screen.getByTestId('bom-tree-table')).toBeInTheDocument();
  });
});
```

### 4. 🎭 E2E Testing (종단간 테스트)

#### 핵심 비즈니스 플로우 테스트
```typescript
// e2e/product-management.spec.ts (Playwright)
import { test, expect } from '@playwright/test';

test.describe('제품 관리 종단간 테스트', () => {
  test('제품 생성부터 BOM 구성까지 전체 플로우', async ({ page }) => {
    // Given
    await page.goto('/products');

    // 1. 새 제품 생성
    await page.click('[data-testid="create-product-button"]');
    await page.fill('[data-testid="product-code-input"]', 'TEST001');
    await page.fill('[data-testid="product-name-input"]', '테스트 제품');
    await page.selectOption('[data-testid="product-type-select"]', 'FINISHED_PRODUCT');
    await page.click('[data-testid="save-product-button"]');

    // 2. 제품 목록에서 생성된 제품 확인
    await expect(page.locator('[data-testid="product-table"]')).toContainText('TEST001');

    // 3. 생성된 제품의 BOM 구성
    await page.click('[data-testid="product-row-TEST001"] [data-testid="bom-button"]');
    await page.click('[data-testid="bom-tab"]');
    
    // 4. BOM 아이템 추가
    await page.click('[data-testid="add-bom-item-button"]');
    await page.fill('[data-testid="component-code-input"]', 'COMP001');
    await page.fill('[data-testid="quantity-input"]', '2');
    await page.click('[data-testid="save-bom-item-button"]');

    // 5. BOM 트리에서 추가된 아이템 확인
    await expect(page.locator('[data-testid="bom-tree"]')).toContainText('COMP001');
    await expect(page.locator('[data-testid="bom-tree"]')).toContainText('수량: 2');

    // 6. BOM 트리 확장/축소 기능 테스트
    await page.click('[data-testid="expand-all-button"]');
    await expect(page.locator('[data-testid="bom-node-COMP001"]')).toBeVisible();
    
    await page.click('[data-testid="collapse-all-button"]');
    await expect(page.locator('[data-testid="bom-node-COMP001"]')).not.toBeVisible();
  });

  test('대용량 제품 목록 성능 테스트', async ({ page }) => {
    // Given: 1000개의 제품이 있는 상황
    await page.goto('/products?mock=large-dataset');

    // When: 페이지 로드 및 스크롤 성능 측정
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="product-table"]');
    const loadTime = Date.now() - startTime;

    // Then: 성능 기준 검증 (2초 이내 로드)
    expect(loadTime).toBeLessThan(2000);

    // 가상화된 테이블 스크롤 성능 테스트
    await page.keyboard.press('End'); // 목록 끝으로 스크롤
    await expect(page.locator('[data-testid="product-table"]')).toBeVisible();
  });
});
```

### 5. 🛠 테스트 유틸리티

#### Mock Factory Functions
```typescript
// src/__tests__/utils/mockFactories.ts
export const createMockProduct = (overrides: Partial<ProductData> = {}): Product => {
  const defaultData = {
    id: 'prod-001',
    cd_material: 'PROD001',
    nm_material: '테스트 제품',
    type: ProductType.FINISHED_PRODUCT,
    status: ProductStatus.ACTIVE,
    safetyStock: 100,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const data = { ...defaultData, ...overrides };

  return new Product(
    new ProductId(data.id),
    data.cd_material,
    data.nm_material,
    data.type,
    data.status,
    data.safetyStock,
    data.createdAt,
    data.updatedAt
  );
};

export const createMockBOMTreeNode = (overrides: Partial<BOMTreeNodeData> = {}): BOMTreeNode => {
  const defaultData = {
    id: 'bom-item-001',
    productId: 'prod-001',
    componentId: 'comp-001',
    componentCode: 'COMP001',
    componentName: '테스트 구성품',
    quantity: 1,
    level: 0,
    parentId: null,
    children: [],
  };

  return { ...defaultData, ...overrides };
};

// Custom Render with Providers
export const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
) => {
  const {
    preloadedState = {},
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),
    ...renderOptions
  } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
};
```

---

## 🔧 트러블슈팅

### 자주 발생하는 문제들과 해결 방법

#### 1. 🔄 TanStack Query 관련 이슈

**문제**: 쿼리가 계속 refetch되는 현상
```typescript
// ❌ 문제가 되는 코드
const productQuery = useFeatureQuery({
  queryKey: ['products', { filters }], // 객체 참조 문제
  queryFn: () => getProducts(filters),
});
```

**해결책**: queryKey 안정화
```typescript
// ✅ 해결된 코드  
const stableFilters = useMemo(() => filters, [JSON.stringify(filters)]);

const productQuery = useFeatureQuery({
  queryKey: ['products', stableFilters],
  queryFn: () => getProducts(stableFilters),
});
```

#### 2. 🎭 Zustand 상태 동기화 이슈

**문제**: 상태 업데이트가 컴포넌트에 반영되지 않음
```typescript
// ❌ 문제가 되는 코드
const useProductFilters = () => useAppStore(state => state.product); // 전체 객체 구독
```

**해결책**: 세밀한 selector 사용
```typescript
// ✅ 해결된 코드
const useProductFilters = () => useAppStore(state => state.product.filters); // 필요한 부분만 구독
```

#### 3. 🏗 의존성 주입 관련 이슈

**문제**: "Dependency not found" 오류
```typescript
// ❌ 문제가 되는 코드
const useCase = DIContainer.getInstance().get('NonExistentUseCase');
```

**해결책**: 타입 안전한 getter 사용
```typescript
// ✅ 해결된 코드  
const useCase = DIContainer.getInstance().getProductListUseCase();
```

#### 4. 📦 번들 크기 최적화

**문제**: 초기 로딩 시간이 길어짐

**해결책**: 
```typescript
// ✅ 컴포넌트 레벨 지연 로딩
const LazyBOMTreeTable = lazy(() => 
  import('@features/bom/presentation/components/bom/BOMTreeTable')
);

// ✅ 조건부 임포트
const loadAdvancedFeatures = async () => {
  if (user.hasAdvancedPermissions) {
    const { AdvancedBOMAnalytics } = await import('@features/bom-analytics');
    return AdvancedBOMAnalytics;
  }
  return null;
};
```

#### 5. 🎨 스타일링 이슈

**문제**: styled-components 테마가 적용되지 않음

**해결책**:
```typescript
// ✅ ThemeProvider 설정 확인
import { ThemeProvider } from 'styled-components';
import { theme } from '@shared/styles/theme';

export const App = () => (
  <ThemeProvider theme={theme}>
    <AppRouter />
  </ThemeProvider>
);
```

### 디버깅 도구 활용

#### 1. React Developer Tools
```typescript
// 컴포넌트에 디버깅 정보 추가
export const ProductTable = ({ products }) => {
  // React DevTools에서 확인 가능한 디버그 정보
  const debugInfo = {
    productCount: products.length,
    lastUpdate: new Date().toISOString(),
    renderCount: useRef(0).current++,
  };

  return <div data-debug={JSON.stringify(debugInfo)}>...</div>;
};
```

#### 2. TanStack Query DevTools
```typescript
// 개발 환경에서만 DevTools 활성화
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export const QueryProvider = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
    {process.env.NODE_ENV === 'development' && (
      <ReactQueryDevtools initialIsOpen={false} />
    )}
  </QueryClientProvider>
);
```

#### 3. 성능 모니터링
```typescript
// useEffect로 렌더링 성능 측정
export const useRenderPerformance = (componentName: string) => {
  const renderStart = useRef<number>();

  useEffect(() => {
    renderStart.current = performance.now();
  });

  useEffect(() => {
    if (renderStart.current) {
      const renderTime = performance.now() - renderStart.current;
      console.log(`${componentName} 렌더링 시간: ${renderTime.toFixed(2)}ms`);
    }
  });
};
```

---