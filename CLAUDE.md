# MES 제품정보 관리 시스템 - 코드 동작 분석

## 🏗️ 전체 아키텍처 개요

이 프로젝트는 **클린 아키텍처(Clean Architecture)** 패턴을 완전히 구현한 React TypeScript 애플리케이션입니다. 

### 📁 프로젝트 구조
```
src/
├── domain/              # 🎯 도메인 계층 - 핵심 비즈니스 로직
│   ├── entities/        # 비즈니스 엔티티 (Product, ProductHistory)
│   ├── repositories/    # 리포지토리 인터페이스
│   └── services/        # 도메인 서비스
├── application/         # 🔄 애플리케이션 계층 - 유스케이스
│   └── usecases/        # 비즈니스 유스케이스 (CRUD 작업)
├── infrastructure/      # 🔌 인프라 계층 - 외부 연결
│   ├── api/            # HTTP 클라이언트
│   ├── data/           # Mock 데이터
│   └── repositories/   # 리포지토리 구현체
├── presentation/        # 🖼️ 프레젠테이션 계층 - UI
│   ├── components/     # React 컴포넌트
│   ├── hooks/          # 커스텀 훅
│   ├── pages/          # 페이지
│   └── utils/          # UI 유틸리티
└── config/             # ⚙️ 설정 - DI Container
```

## 🔄 의존성과 데이터 흐름

### 의존성 방향 (클린 아키텍처 원칙)
```
Presentation → Application → Domain ← Infrastructure
```

**핵심 원칙**: Domain 계층은 다른 어떤 계층에도 의존하지 않음 (의존성 역전)

### 데이터 흐름 시퀀스
```
1. UI 이벤트 발생 (버튼 클릭, 폼 제출 등)
   ↓
2. React Component에서 이벤트 처리
   ↓
3. Custom Hook을 통한 상태 관리
   ↓
4. DI Container에서 UseCase 인스턴스 획득
   ↓
5. UseCase에서 비즈니스 로직 실행
   ↓
6. Domain Entity에서 비즈니스 규칙 검증
   ↓
7. Repository를 통한 데이터 영속성 처리
   ↓
8. 결과를 UI로 반환 및 렌더링
```

## 🎯 핵심 컴포넌트 동작 분석

### 1. 도메인 계층 (Domain Layer)

#### Product 엔티티 (`src/domain/entities/Product.ts`)
```typescript
// 핵심 비즈니스 로직을 캡슐화
export class Product {
  constructor(...) {
    this.validateProduct(); // 생성 시 즉시 검증
  }

  // 비즈니스 규칙 메서드들
  public canBeProduced(): boolean // 생산 가능 여부
  public isRawMaterial(): boolean  // 원자재 여부
  public canHaveBOM(): boolean     // BOM 구성 가능 여부
  public isBelowSafetyStock(currentStock: number): boolean
}
```

**특징**: 
- 생성자에서 즉시 비즈니스 규칙 검증
- 불변성 보장 (private readonly 필드들)
- 도메인 로직 캡슐화

### 2. 애플리케이션 계층 (Application Layer)

#### GetProductListUseCase (`src/application/usecases/product/GetProductListUseCase.ts`)
```typescript
export class GetProductListUseCase {
  async execute(request: GetProductListRequest): Promise<GetProductListResponse> {
    // 1. 입력 검증
    this.validateRequest(request);

    // 2. 검색 조건 구성
    const searchCriteria = this.buildSearchCriteria(request);

    // 3. 데이터 조회 (페이징, 정렬, 필터링)
    const products = await this.productRepository.findByPageWithCriteria(...);

    // 4. UI용 데이터 변환
    const productListItems = products.map(product => ({
      id: product.getId().getValue(),
      // ... 프레젠테이션 데이터 매핑
    }));

    return { products: productListItems, totalCount, ... };
  }
}
```

**핵심 역할**:
- 비즈니스 로직 조합 (Repository + Domain Service + Presenter)
- 입력/출력 데이터 변환
- 트랜잭션 경계 관리

### 3. 인프라스트럭처 계층 (Infrastructure Layer)

#### Mock 데이터 시스템 (`src/infrastructure/data/MockData.ts`)
```typescript
// 메모리 기반 데이터 스토리지
let products: Product[] = [];
let histories: ProductHistory[] = [];

// 초기화 함수에서 샘플 데이터 생성
function initializeProducts(): void {
  const productsData = [
    // 10개의 실제적인 샘플 제품 데이터
    { id: 'prod-001', cd_material: 'FG2412001', ... }
  ];

  products = productsData.map(data => new Product(...));
}
```

#### MockProductRepository (`src/infrastructure/repositories/MockProductRepository.ts`)
```typescript
export class MockProductRepository implements ProductRepository {
  async findByPageWithCriteria(...): Promise<Product[]> {
    await this.simulateDelay(300); // 실제 API 지연시간 시뮬레이션

    let products = MockData.getProducts();

    // 검색, 필터링, 정렬 로직 구현
    if (criteria.searchKeyword) {
      products = products.filter(product => /* 검색 로직 */);
    }

    // 페이징 처리
    return products.slice(startIndex, endIndex);
  }
}
```

**특징**:
- 실제 API와 동일한 인터페이스
- 네트워크 지연 시뮬레이션
- 완전한 CRUD 작업 지원

### 4. 프레젠테이션 계층 (Presentation Layer)

#### useProductList 훅 (`src/presentation/hooks/useProductList.ts`)
```typescript
export const useProductList = () => {
  const [state, setState] = useState<UseProductListState>({
    products: [], loading: false, error: null, ...
  });

  const loadProducts = useCallback(async (request: GetProductListRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await getProductListUseCase.execute(request);
      setState(prev => ({ ...prev, products: response.products, ... }));
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [getProductListUseCase]);

  return { ...state, loadProducts, setPage, setPageSize, ... };
};
```

**역할**:
- UseCase와 React Component 연결
- 비동기 상태 관리 (loading, error)
- 사용자 액션을 UseCase 호출로 변환

## 🔧 DI Container와 의존성 주입

### DIContainer (`src/config/DIContainer.ts`)
```typescript
export class DIContainer {
  private setupDependencies(): void {
    // 환경변수로 Mock/Real API 전환
    const useMockData = process.env.REACT_APP_USE_MOCK_DATA !== 'false';

    // Repository 선택
    const productRepository = useMockData 
      ? new MockProductRepository() 
      : new HttpProductRepository(apiClient);

    // UseCase에 의존성 주입
    const getProductListUseCase = new GetProductListUseCase(
      productRepository,
      productPresenter
    );

    this.dependencies.set('GetProductListUseCase', getProductListUseCase);
  }
}
```

**핵심 기능**:
- 싱글톤 패턴으로 전역 의존성 관리
- 환경변수 기반 Mock/Real 구현체 전환
- 타입 안전한 의존성 주입

## 🚀 사용자 액션별 전체 플로우

### 📋 제품 목록 조회 플로우
```
1. ProductManagementPage 컴포넌트 마운트
   ↓
2. useProductList() 훅 초기화
   ↓
3. useEffect에서 loadProducts(initialRequest) 호출
   ↓
4. DIContainer.getInstance().getProductListUseCase() 획득
   ↓
5. GetProductListUseCase.execute(request) 실행
   ↓
6. ProductRepository.findByPageWithCriteria() 호출
   ↓
7. MockProductRepository에서 데이터 조회 + 지연시간 시뮬레이션
   ↓
8. ProductPresenter를 통한 UI 데이터 변환
   ↓
9. 컴포넌트 상태 업데이트 (setState)
   ↓
10. ProductTable 컴포넌트 리렌더링
```

### ➕ 제품 등록 플로우
```
1. 사용자가 "신규 등록" 버튼 클릭
   ↓
2. ProductFormModal 표시 (isFormModalOpen = true)
   ↓
3. 사용자가 폼 입력 후 "저장" 클릭
   ↓
4. handleSubmit에서 CreateProductUseCase.execute() 호출
   ↓
5. 비즈니스 규칙 검증 (validateBusinessRules)
   ↓
6. ProductCodeGenerator로 제품코드 자동 생성 (FG2412001 형식)
   ↓
7. Product 엔티티 생성 및 내부 검증 (validateProduct)
   ↓
8. ProductRepository.save(product) 호출
   ↓
9. ProductHistory 엔티티 생성 및 저장 (이력 기록)
   ↓
10. 성공 시 onSuccess() 콜백 → refresh() → 목록 새로고침
```

### ✏️ 제품 수정 플로우
```
1. 사용자가 특정 제품의 "수정" 버튼 클릭
   ↓
2. ProductFormModal에 기존 데이터 로드
   ↓
3. 사용자가 필드 수정 후 "수정" 버튼 클릭
   ↓
4. UpdateProductUseCase.execute(request) 호출
   ↓
5. 기존 제품 조회 (findById)
   ↓
6. 변경사항 감지 (detectChanges) - 수정된 필드만 추적
   ↓
7. 비즈니스 규칙 검증 (완제품 → 원자재 변경 금지 등)
   ↓
8. 새로운 Product 엔티티 생성 (불변성 보장)
   ↓
9. Repository 저장 + 변경 이력 기록
   ↓
10. UI 새로고침
```

### 🗑️ 제품 삭제 플로우
```
1. 사용자가 "삭제" 버튼 클릭
   ↓
2. window.confirm() 확인 대화상자 표시
   ↓
3. 확인 시 DeleteProductUseCase.execute() 호출
   ↓
4. ProductUsageChecker로 삭제 가능성 검증
   - BOM 사용 여부 확인
   - 생산 계획 사용 여부 확인  
   - 재고 보유 여부 확인
   ↓
5. 검증 통과 시 논리적 삭제 (isActive = false)
   ↓
6. 물리적 삭제가 아닌 비활성화로 처리
   ↓
7. 삭제 이력 기록 (HistoryAction.DELETE)
   ↓
8. UI에서 "미사용" 상태로 표시
```

## 🔄 Mock/Real API 전환 메커니즘

### 환경변수 설정 (`.env`)
```bash
# Mock 데이터 사용 (개발용)
REACT_APP_USE_MOCK_DATA=true

# 실제 API 서버 URL
REACT_APP_API_BASE_URL=http://localhost:8080
```

### 자동 전환 로직
```typescript
// DIContainer.ts
const useMockData = process.env.REACT_APP_USE_MOCK_DATA !== 'false';

const productRepository = useMockData 
  ? new MockProductRepository()      // 인메모리 Mock 데이터
  : new HttpProductRepository(apiClient); // 실제 HTTP API
```

### 실제 API 구현체 (HttpProductRepository)
```typescript
export class HttpProductRepository implements ProductRepository {
  async findByPageWithCriteria(...) {
    const params = new URLSearchParams({ ... });
    const response = await this.apiClient.get<PagedResponse<ProductDto>>(`/api/products?${params}`);
    
    return response.data.items.map(dto => this.mapDtoToEntity(dto));
  }

  private mapDtoToEntity(dto: ProductDto): Product {
    // DTO → Domain Entity 변환
    return new Product(new ProductId(dto.id), ...);
  }
}
```

## 📊 상태 관리와 에러 처리

### 상태 관리 패턴
```typescript
// useProductList.ts
const [state, setState] = useState<UseProductListState>({
  products: [],
  totalCount: 0,
  currentPage: 1,
  loading: false,
  error: null
});
```

### 에러 처리 전략
1. **Domain Level**: 엔티티 생성 시 비즈니스 규칙 위반 → throw Error
2. **UseCase Level**: try-catch로 예외 처리 → 사용자 친화적 메시지
3. **UI Level**: error 상태로 에러 메시지 표시

### 로딩 상태 관리
```typescript
const loadProducts = useCallback(async (request) => {
  setState(prev => ({ ...prev, loading: true, error: null }));
  
  try {
    const response = await getProductListUseCase.execute(request);
    setState(prev => ({ ...prev, products: response.products, loading: false }));
  } catch (error) {
    setState(prev => ({ ...prev, loading: false, error: error.message }));
  }
}, []);
```

## 🎨 UI 컴포넌트 구조

### 컴포넌트 계층
```
ProductManagementPage (페이지)
├── ProductSearchFilter (검색/필터)
├── ProductTable (테이블)
│   └── SortableHeader (정렬 가능한 헤더)
├── Pagination (페이징)
└── ProductFormModal (등록/수정 모달)
```

### 스타일링 시스템 (`src/presentation/utils/styled.ts`)
- Styled Components 기반
- 재사용 가능한 UI 컴포넌트들
- 반응형 디자인 지원
- 일관된 디자인 시스템

## 🔍 비즈니스 로직 예시

### 제품 코드 자동 생성
```typescript
// DefaultProductCodeGenerator.ts
async generateCode(type: ProductType): Promise<string> {
  const prefix = this.getPrefix(type); // FG, SF, RM
  const yearMonth = '2412'; // 2024년 12월
  const lastSequence = await this.productRepository.getLastSequenceByPrefix(prefix + yearMonth);
  const nextSequence = (lastSequence + 1).toString().padStart(3, '0');
  
  return `${prefix}${yearMonth}${nextSequence}`; // 예: FG2412001
}
```

### 비즈니스 규칙 검증
```typescript
// Product.ts
private validateProduct(): void {
  if (!this.cd_material || this.cd_material.trim().length === 0) {
    throw new Error('제품코드는 필수입니다.');
  }
  if (this.safetyStock < 0) {
    throw new Error('안전재고는 0 이상이어야 합니다.');
  }
}

// UpdateProductUseCase.ts
private async validateBusinessRules(existingProduct: Product, request: UpdateProductRequest) {
  if (existingProduct.getType() === ProductType.FINISHED_PRODUCT && 
      request.type === ProductType.RAW_MATERIAL) {
    throw new Error('완제품을 원자재로 변경할 수 없습니다.');
  }
}
```

## 🚀 성능 최적화 포인트

### 현재 구현된 최적화:
1. **useCallback**: 함수 재생성 방지
2. **컴포넌트 분리**: 재사용성과 렌더링 최적화
3. **지연 로딩**: 모달은 필요시에만 렌더링
4. **메모이제이션**: 상태 업데이트 최소화

### 추가 개선 가능한 포인트:
1. **React.memo**: 컴포넌트 리렌더링 최적화
2. **useMemo**: 계산 비용이 높은 값 메모이제이션
3. **가상화**: 대량 데이터 테이블 처리
4. **무한 스크롤**: 페이지네이션 대신 점진적 로딩

## 📋 전체 시스템의 장점

### 🎯 클린 아키텍처의 이점
1. **테스트 용이성**: Mock과 실제 구현체 완전 분리
2. **확장성**: 새로운 기능 추가 시 기존 코드 영향 최소화
3. **유지보수성**: 각 계층의 책임이 명확히 분리
4. **비즈니스 로직 보호**: Domain 계층이 UI나 DB에 의존하지 않음

### 🔧 실용성
1. **환경별 구성**: 개발/테스트/운영 환경 자동 전환
2. **타입 안전성**: TypeScript로 컴파일 타임 에러 방지  
3. **사용자 경험**: 로딩 상태, 에러 처리, 확인 대화상자
4. **데이터 무결성**: 엔티티 레벨 유효성 검증

이 구조는 **Enterprise급 애플리케이션**의 모범 사례를 보여주며, 확장 가능하고 유지보수가 용이한 시스템입니다.

---

# 🔧 BOM (Bill of Materials) 관리 시스템

## 📋 BOM 시스템 개요

BOM 관리 시스템은 제품의 부품 구성표를 관리하는 핵심 모듈로, **제조업 MES 시스템의 심장부**입니다. Week 4-6에 걸쳐 완전한 기능을 구현했습니다.

### 🎯 핵심 기능
- **계층형 BOM 트리 구조** - 무제한 깊이의 부품 구성 관리
- **실시간 BOM 편집** - 드래그&드롭, 인라인 편집
- **BOM 비교 분석** - 두 제품의 BOM 구조 시각적 비교
- **순환 참조 검증** - 무한 루프 방지 로직
- **비용 계산 엔진** - 자동 원가 계산 및 스크랩률 적용
- **변경 이력 추적** - 모든 BOM 변경사항 상세 기록

## 🏗️ BOM 아키텍처 구조

### 📁 BOM 모듈 구조
```
src/
├── domain/
│   ├── entities/
│   │   ├── BOM.ts              # BOM 메인 엔티티
│   │   ├── BOMItem.ts          # BOM 구성품 엔티티
│   │   └── BOMHistory.ts       # BOM 변경 이력 엔티티
│   ├── repositories/
│   │   ├── BOMRepository.ts     # BOM 저장소 인터페이스
│   │   ├── BOMItemRepository.ts # BOM 아이템 저장소
│   │   └── BOMHistoryRepository.ts # 이력 저장소
│   └── services/
│       ├── BOMCircularChecker.ts # 순환 참조 검증
│       └── BOMUsageChecker.ts    # BOM 사용 여부 검증
├── application/usecases/bom/
│   ├── GetBOMTreeUseCase.ts     # BOM 트리 조회
│   ├── AddBOMItemUseCase.ts     # 구성품 추가
│   ├── UpdateBOMItemUseCase.ts  # 구성품 수정
│   ├── DeleteBOMItemUseCase.ts  # 구성품 삭제
│   ├── CopyBOMUseCase.ts        # BOM 복사
│   └── CompareBOMUseCase.ts     # BOM 비교
├── infrastructure/
│   ├── data/MockBOMData.ts      # BOM Mock 데이터
│   └── repositories/
│       ├── MockBOMRepository.ts
│       ├── MockBOMItemRepository.ts
│       └── MockBOMHistoryRepository.ts
└── presentation/
    ├── components/bom/
    │   ├── BOMTreeTable.tsx     # BOM 트리 테이블
    │   ├── BOMItemModal.tsx     # 구성품 편집 모달
    │   ├── BOMCompareModal.tsx  # BOM 비교 모달
    │   ├── BOMCopyModal.tsx     # BOM 복사 모달
    │   ├── BOMTreeControls.tsx  # 트리 제어 도구
    │   └── BOMStatistics.tsx    # BOM 통계 정보
    └── hooks/
        ├── useBOMTree.ts        # BOM 트리 상태 관리
        ├── useBOMOperations.ts  # BOM 작업 관리
        └── useBOMComparison.ts  # BOM 비교 관리
```

## 🎯 BOM 도메인 모델 분석

### 1. BOM 엔티티 (`src/domain/entities/BOM.ts`)

```typescript
export class BOM {
  constructor(
    private readonly id: BOMId,
    private readonly productId: ProductId,
    private readonly version: string,
    private readonly isActive: boolean,
    private readonly bomItems: BOMItem[] = [],
    private readonly effectiveDate: Date,
    // ... 기타 메타데이터
  ) {
    this.validateBOM(); // 생성 시 비즈니스 규칙 검증
  }

  // 핵심 비즈니스 로직
  public getTotalCost(): number {
    return this.bomItems.reduce((total, item) => total + item.getTotalCost(), 0);
  }

  public isCurrentlyActive(): boolean {
    return this.isActive && this.effectiveDate <= new Date();
  }

  public addBOMItem(item: BOMItem): void {
    this.validateNewItem(item);
    this.bomItems.push(item);
  }
}
```

**핵심 특징**:
- **계층형 구조**: 무제한 깊이의 트리 구조 지원
- **버전 관리**: 효과일/만료일 기반 버전 제어
- **비용 자동 계산**: 하위 구성품 비용 자동 집계
- **비즈니스 규칙 검증**: 순환 참조, 중복 구성품 방지

### 2. BOMItem 엔티티 (`src/domain/entities/BOMItem.ts`)

```typescript
export class BOMItem {
  constructor(
    private readonly id: BOMItemId,
    private readonly bomId: BOMId,
    private readonly componentId: ProductId,
    private readonly parentItemId: BOMItemId | undefined, // 계층 구조
    private readonly level: number,      // 트리 레벨
    private readonly quantity: number,   // 소요량
    private readonly scrapRate: number,  // 스크랩률
    private readonly componentType: ComponentType,
    // ... 기타 필드
  ) {
    this.validateBOMItem();
  }

  // 실제 소요량 계산 (스크랩률 포함)
  public getActualQuantity(): number {
    return this.quantity * (1 + this.scrapRate / 100);
  }

  // 총 비용 계산
  public getTotalCost(): number {
    return this.getActualQuantity() * this.unitCost;
  }

  // 트리 구조 관련 로직
  public isTopLevel(): boolean {
    return this.level === 0 && !this.parentItemId;
  }

  public isSubComponent(): boolean {
    return this.level > 0 && !!this.parentItemId;
  }
}
```

### 3. 구성품 유형 (ComponentType)

```typescript
export enum ComponentType {
  RAW_MATERIAL = 'RAW_MATERIAL',      // 원자재
  SEMI_FINISHED = 'SEMI_FINISHED',    // 반제품  
  PURCHASED_PART = 'PURCHASED_PART',  // 구매품
  SUB_ASSEMBLY = 'SUB_ASSEMBLY',      // 조립품
  CONSUMABLE = 'CONSUMABLE'           // 소모품
}
```

## 🔄 BOM 유스케이스 워크플로우

### 1. BOM 트리 조회 (`GetBOMTreeUseCase`)

```typescript
export class GetBOMTreeUseCase {
  async execute(request: GetBOMTreeRequest): Promise<GetBOMTreeResponse> {
    // 1. BOM 조회
    const bom = await this.bomRepository.findById(request.bomId);
    
    // 2. 계층형 구성품 조회
    const bomItems = await this.bomItemRepository.findByBOMId(request.bomId);
    
    // 3. 트리 구조 생성
    const rootNodes = this.buildTreeStructure(bomItems);
    
    // 4. 비용 계산
    const totalCost = this.calculateTotalCost(rootNodes);
    
    return {
      bom,
      treeNodes: rootNodes,
      totalCost,
      statistics: this.generateStatistics(bomItems)
    };
  }

  // 계층형 트리 구조 생성
  private buildTreeStructure(items: BOMItem[]): BOMTreeNode[] {
    const itemMap = new Map<string, BOMTreeNode>();
    const rootNodes: BOMTreeNode[] = [];

    // 1. 모든 아이템을 노드로 변환
    items.forEach(item => {
      itemMap.set(item.getId().getValue(), this.createTreeNode(item));
    });

    // 2. 부모-자식 관계 설정
    items.forEach(item => {
      const node = itemMap.get(item.getId().getValue())!;
      const parentId = item.getParentItemId()?.getValue();
      
      if (parentId && itemMap.has(parentId)) {
        const parent = itemMap.get(parentId)!;
        parent.children.push(node);
        node.parent = parent;
      } else {
        rootNodes.push(node); // 최상위 노드
      }
    });

    return rootNodes;
  }
}
```

### 2. BOM 구성품 추가 (`AddBOMItemUseCase`)

```typescript
export class AddBOMItemUseCase {
  async execute(request: AddBOMItemRequest): Promise<void> {
    // 1. 부모 BOM 조회
    const bom = await this.bomRepository.findById(request.bomId);
    
    // 2. 비즈니스 규칙 검증
    await this.validateAddition(request);
    
    // 3. BOMItem 엔티티 생성
    const bomItem = new BOMItem(
      new BOMItemId(this.generateId()),
      request.bomId,
      request.componentId,
      request.parentItemId,
      request.level,
      request.sequence,
      request.quantity,
      request.unit,
      request.unitCost,
      request.scrapRate,
      request.isOptional,
      request.componentType,
      new Date(), // effectiveDate
      request.userId,
      request.userId,
      new Date(),
      new Date()
    );
    
    // 4. 저장
    await this.bomItemRepository.save(bomItem);
    
    // 5. 이력 기록
    await this.recordHistory(bomItem, BOMHistoryAction.ADD_ITEM);
  }

  // 비즈니스 규칙 검증
  private async validateAddition(request: AddBOMItemRequest): Promise<void> {
    // 순환 참조 검증
    const hasCircularReference = await this.bomCircularChecker.wouldCreateCircular(
      request.bomId, 
      request.componentId
    );
    if (hasCircularReference) {
      throw new Error('순환 참조가 발생합니다.');
    }

    // 중복 구성품 검증
    const existingItems = await this.bomItemRepository.findByBOMId(request.bomId);
    const isDuplicate = existingItems.some(item => 
      item.getComponentId().equals(request.componentId) &&
      item.getParentItemId()?.equals(request.parentItemId)
    );
    if (isDuplicate) {
      throw new Error('동일한 구성품이 이미 존재합니다.');
    }
  }
}
```

### 3. BOM 비교 (`CompareBOMUseCase`)

```typescript
export class CompareBOMUseCase {
  async execute(request: CompareBOMRequest): Promise<CompareBOMResponse> {
    // 1. 두 BOM 트리 조회
    const sourceTree = await this.getBOMTreeUseCase.execute({ bomId: request.sourceBOMId });
    const targetTree = await this.getBOMTreeUseCase.execute({ bomId: request.targetBOMId });
    
    // 2. 차이점 분석
    const differences = this.analyzeDifferences(sourceTree.treeNodes, targetTree.treeNodes);
    
    // 3. 통계 계산
    const statistics = this.calculateComparisonStatistics(differences);
    
    return {
      sourceTree: sourceTree.treeNodes,
      targetTree: targetTree.treeNodes,
      differences,
      statistics
    };
  }

  // 차이점 분석 알고리즘
  private analyzeDifferences(source: BOMTreeNode[], target: BOMTreeNode[]): BOMDifference[] {
    const differences: BOMDifference[] = [];
    
    // 구성품별 맵 생성
    const sourceMap = this.createComponentMap(source);
    const targetMap = this.createComponentMap(target);
    
    // 추가된 구성품 찾기
    targetMap.forEach((targetNode, componentId) => {
      if (!sourceMap.has(componentId)) {
        differences.push({
          type: DifferenceType.ADDED,
          targetNode,
          description: `${targetNode.componentName} 구성품이 추가됨`
        });
      }
    });
    
    // 제거된 구성품 찾기
    sourceMap.forEach((sourceNode, componentId) => {
      if (!targetMap.has(componentId)) {
        differences.push({
          type: DifferenceType.REMOVED,
          sourceNode,
          description: `${sourceNode.componentName} 구성품이 제거됨`
        });
      }
    });
    
    // 변경된 구성품 찾기
    sourceMap.forEach((sourceNode, componentId) => {
      const targetNode = targetMap.get(componentId);
      if (targetNode) {
        const itemDifferences = this.compareNodes(sourceNode, targetNode);
        differences.push(...itemDifferences);
      }
    });
    
    return differences;
  }
}
```

## 🎨 BOM UI 컴포넌트 시스템

### 1. BOM 트리 테이블 (`BOMTreeTable.tsx`)

```typescript
export const BOMTreeTable: React.FC<BOMTreeTableProps> = ({
  treeNodes,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onMoveItem,
  expandedNodes,
  onToggleExpand,
}) => {
  // 드래그 앤 드롭 핸들러
  const handleDragStart = useCallback((e: React.DragEvent, node: BOMTreeNode) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: node.id,
      componentId: node.componentId,
      level: node.level
    }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetNode: BOMTreeNode) => {
    e.preventDefault();
    const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
    
    // 드롭 검증
    if (dragData.id === targetNode.id) return; // 자기 자신
    if (targetNode.level >= dragData.level) return; // 잘못된 계층
    
    onMoveItem(dragData.id, targetNode.id);
  }, [onMoveItem]);

  // 트리 노드 렌더링
  const renderTreeNode = useCallback((node: BOMTreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <Fragment key={node.id}>
        <TreeRow
          depth={depth}
          draggable
          onDragStart={(e) => handleDragStart(e, node)}
          onDrop={(e) => handleDrop(e, node)}
          onDragOver={(e) => e.preventDefault()}
        >
          {/* 확장/축소 버튼 */}
          <TreeCell style={{ paddingLeft: `${depth * 20 + 8}px` }}>
            {hasChildren && (
              <ExpandButton onClick={() => onToggleExpand(node.id)}>
                {isExpanded ? '▼' : '▶'}
              </ExpandButton>
            )}
            <ComponentInfo>
              <ComponentName>{node.componentName}</ComponentName>
              <ComponentCode>{node.componentCode}</ComponentCode>
            </ComponentInfo>
          </TreeCell>
          
          {/* 구성품 정보 */}
          <TreeCell>{node.quantity.toLocaleString()}</TreeCell>
          <TreeCell>{node.unitName}</TreeCell>
          <TreeCell>₩{node.unitCost.toLocaleString()}</TreeCell>
          <TreeCell>{node.scrapRate}%</TreeCell>
          <TreeCell>₩{node.totalCost.toLocaleString()}</TreeCell>
          
          {/* 액션 버튼들 */}
          <TreeCell>
            <ActionButtons>
              <Button size="small" onClick={() => onAddItem(node.id)}>
                추가
              </Button>
              <Button size="small" onClick={() => onEditItem(node)}>
                수정
              </Button>
              <Button 
                size="small" 
                variant="danger" 
                onClick={() => onDeleteItem(node.id)}
              >
                삭제
              </Button>
            </ActionButtons>
          </TreeCell>
        </TreeRow>
        
        {/* 하위 노드들 재귀 렌더링 */}
        {isExpanded && hasChildren && (
          <>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </>
        )}
      </Fragment>
    );
  }, [expandedNodes, handleDragStart, handleDrop, onToggleExpand, onAddItem, onEditItem, onDeleteItem]);

  return (
    <TreeContainer>
      <TreeHeader>
        <HeaderCell>구성품</HeaderCell>
        <HeaderCell>수량</HeaderCell>
        <HeaderCell>단위</HeaderCell>
        <HeaderCell>단가</HeaderCell>
        <HeaderCell>스크랩률</HeaderCell>
        <HeaderCell>총비용</HeaderCell>
        <HeaderCell>작업</HeaderCell>
      </TreeHeader>
      <TreeBody>
        {treeNodes.map(node => renderTreeNode(node, 0))}
      </TreeBody>
    </TreeContainer>
  );
};
```

### 2. BOM 비교 모달 (`BOMCompareModal.tsx`)

```typescript
export const BOMCompareModal: React.FC<BOMCompareModalProps> = ({
  isOpen,
  onClose,
  products,
  initialSourceProductId,
  initialTargetProductId,
}) => {
  // BOM 비교 훅 사용
  const {
    loading,
    error,
    comparison,
    differences,
    statistics,
    showOnlyDifferences,
    selectedDifferenceTypes,
    expandedNodes,
    compareProducts,
    reset,
    setShowOnlyDifferences,
    toggleDifferenceType,
    expandDifferences,
    exportComparison,
  } = useBOMComparison();

  // 차이점 필터링
  const filteredNodes = useMemo(() => {
    if (!comparison) return { source: [], target: [] };
    
    const filterNodes = (nodes: BOMTreeNode[]) => {
      if (!showOnlyDifferences) return nodes;
      
      return nodes.filter(node => {
        const diffType = differenceMap.get(node.id);
        return diffType && selectedDifferenceTypes.has(diffType);
      });
    };
    
    return {
      source: filterNodes(comparison.sourceTree),
      target: filterNodes(comparison.targetTree)
    };
  }, [comparison, showOnlyDifferences, differenceMap, selectedDifferenceTypes]);

  return (
    <Modal isOpen={isOpen}>
      <ModalContent>
        {/* 제품 선택 */}
        <Card>
          <h3>비교할 제품 선택</h3>
          <Flex gap={16}>
            <FormGroup style={{ flex: 1 }}>
              <label>원본 제품 (A)</label>
              <Select
                value={sourceProductId}
                onChange={(e) => setSourceProductId(e.target.value)}
              >
                <option value="">제품을 선택하세요</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.nm_material} ({product.cd_material})
                  </option>
                ))}
              </Select>
            </FormGroup>
            
            <FormGroup style={{ flex: 1 }}>
              <label>대상 제품 (B)</label>
              <Select
                value={targetProductId}
                onChange={(e) => setTargetProductId(e.target.value)}
              >
                <option value="">제품을 선택하세요</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.nm_material} ({product.cd_material})
                  </option>
                ))}
              </Select>
            </FormGroup>
          </Flex>
        </Card>

        {/* 비교 결과 통계 */}
        {comparison && (
          <Card>
            <h3>비교 결과 요약</h3>
            <StatsSummary>
              <div className="stat-item">
                <div className="value">{statistics.totalItems}</div>
                <div className="label">총 구성품</div>
              </div>
              <div className="stat-item" style={{ background: '#d4edda' }}>
                <div className="value" style={{ color: '#155724' }}>
                  {statistics.addedItems}
                </div>
                <div className="label">추가됨</div>
              </div>
              <div className="stat-item" style={{ background: '#f8d7da' }}>
                <div className="value" style={{ color: '#721c24' }}>
                  {statistics.removedItems}
                </div>
                <div className="label">제거됨</div>
              </div>
              <div className="stat-item" style={{ background: '#fff3cd' }}>
                <div className="value" style={{ color: '#856404' }}>
                  {statistics.modifiedItems}
                </div>
                <div className="label">수정됨</div>
              </div>
            </StatsSummary>
          </Card>
        )}

        {/* 비교 트리 */}
        <ComparisonContainer>
          <TreePanel side="source">
            <div className="header">
              {sourceProduct ? `${sourceProduct.nm_material} (${sourceProduct.cd_material})` : '원본 제품'}
            </div>
            <div className="content">
              {filteredNodes.source.map(node => renderTreeNode(node, 'source'))}
            </div>
          </TreePanel>
          
          <TreePanel side="target">
            <div className="header">
              {targetProduct ? `${targetProduct.nm_material} (${targetProduct.cd_material})` : '대상 제품'}
            </div>
            <div className="content">
              {filteredNodes.target.map(node => renderTreeNode(node, 'target'))}
            </div>
          </TreePanel>
        </ComparisonContainer>
      </ModalContent>
    </Modal>
  );
};
```

## 🔍 BOM 커스텀 훅 시스템

### 1. useBOMTree 훅

```typescript
export const useBOMTree = (productId?: string) => {
  const [state, setState] = useState<BOMTreeState>({
    treeNodes: [],
    bom: null,
    loading: false,
    error: null,
    expandedNodes: new Set(),
    selectedNode: null,
    totalCost: 0,
    statistics: defaultStatistics
  });

  // BOM 트리 로드
  const loadBOMTree = useCallback(async (bomId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await getBOMTreeUseCase.execute({ bomId });
      
      setState(prev => ({
        ...prev,
        treeNodes: response.treeNodes,
        bom: response.bom,
        totalCost: response.totalCost,
        statistics: response.statistics,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'BOM 조회 중 오류가 발생했습니다.'
      }));
    }
  }, [getBOMTreeUseCase]);

  // 노드 확장/축소
  const toggleNode = useCallback((nodeId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedNodes);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return { ...prev, expandedNodes: newExpanded };
    });
  }, []);

  // 전체 확장
  const expandAll = useCallback(() => {
    const allNodeIds = new Set<string>();
    const collectNodeIds = (nodes: BOMTreeNode[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          allNodeIds.add(node.id);
          collectNodeIds(node.children);
        }
      });
    };
    collectNodeIds(state.treeNodes);
    
    setState(prev => ({ ...prev, expandedNodes: allNodeIds }));
  }, [state.treeNodes]);

  // 전체 축소
  const collapseAll = useCallback(() => {
    setState(prev => ({ ...prev, expandedNodes: new Set() }));
  }, []);

  return {
    ...state,
    loadBOMTree,
    toggleNode,
    expandAll,
    collapseAll,
    refresh: () => state.bom && loadBOMTree(state.bom.getId().getValue())
  };
};
```

### 2. useBOMOperations 훅

```typescript
export const useBOMOperations = () => {
  const [operationState, setOperationState] = useState({
    isAdding: false,
    isUpdating: false,
    isDeleting: false,
    isCopying: false,
    error: null
  });

  // 구성품 추가
  const addBOMItem = useCallback(async (request: AddBOMItemRequest) => {
    setOperationState(prev => ({ ...prev, isAdding: true, error: null }));

    try {
      await addBOMItemUseCase.execute(request);
      setOperationState(prev => ({ ...prev, isAdding: false }));
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '구성품 추가 중 오류가 발생했습니다.';
      setOperationState(prev => ({ 
        ...prev, 
        isAdding: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  }, [addBOMItemUseCase]);

  // 구성품 수정
  const updateBOMItem = useCallback(async (request: UpdateBOMItemRequest) => {
    setOperationState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      await updateBOMItemUseCase.execute(request);
      setOperationState(prev => ({ ...prev, isUpdating: false }));
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '구성품 수정 중 오류가 발생했습니다.';
      setOperationState(prev => ({ 
        ...prev, 
        isUpdating: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  }, [updateBOMItemUseCase]);

  // 구성품 삭제
  const deleteBOMItem = useCallback(async (bomItemId: string) => {
    setOperationState(prev => ({ ...prev, isDeleting: true, error: null }));

    try {
      await deleteBOMItemUseCase.execute({ bomItemId });
      setOperationState(prev => ({ ...prev, isDeleting: false }));
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '구성품 삭제 중 오류가 발생했습니다.';
      setOperationState(prev => ({ 
        ...prev, 
        isDeleting: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  }, [deleteBOMItemUseCase]);

  // BOM 복사
  const copyBOM = useCallback(async (request: CopyBOMRequest) => {
    setOperationState(prev => ({ ...prev, isCopying: true, error: null }));

    try {
      const response = await copyBOMUseCase.execute(request);
      setOperationState(prev => ({ ...prev, isCopying: false }));
      return { success: true, newBOMId: response.newBOMId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'BOM 복사 중 오류가 발생했습니다.';
      setOperationState(prev => ({ 
        ...prev, 
        isCopying: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  }, [copyBOMUseCase]);

  return {
    ...operationState,
    addBOMItem,
    updateBOMItem,
    deleteBOMItem,
    copyBOM,
    clearError: () => setOperationState(prev => ({ ...prev, error: null }))
  };
};
```

## 📊 BOM Mock 데이터 시스템

### Mock 데이터 구조 (`src/infrastructure/data/MockBOMData.ts`)

```typescript
// 메모리 기반 BOM 데이터 저장소
let boms: BOM[] = [];
let bomItems: BOMItem[] = [];
let bomHistories: BOMHistory[] = [];

// 현실적인 BOM 샘플 데이터
function initializeBOMs(): void {
  const bomDataList = [
    {
      id: 'bom-001',
      productId: 'prod-001', // 삼성 갤럭시 S24 케이스
      version: '1.0',
      isActive: true,
      description: '갤럭시 S24 케이스 BOM - 실리콘 재질'
    },
    {
      id: 'bom-002', 
      productId: 'prod-004', // 무선 충전기
      version: '1.0',
      isActive: true,
      description: '15W 무선 충전기 BOM'
    },
    {
      id: 'bom-004',
      productId: 'prod-010', // 스마트 워치 - 복잡한 계층구조
      version: '1.0', 
      isActive: true,
      description: '헬스케어 스마트워치 BOM'
    }
  ];

  boms = bomDataList.map(data => new BOM(/* ... */));
}

// 계층형 BOM Item 데이터
function initializeBOMItems(): void {
  bomItems = [
    // BOM-001 (갤럭시 케이스) - Level 1 구성품들
    new BOMItem(
      new BOMItemId('bom-item-001'),
      new BOMId('bom-001'),
      new ProductId('prod-003'), // 실리콘 원료
      undefined, // parentItemId - 최상위
      1, // level
      1, // sequence
      45.0, // quantity
      new Unit('G', '그램'),
      0.12, // unitCost
      2.0, // scrapRate
      false, // isOptional
      ComponentType.RAW_MATERIAL
    ),

    // BOM-004 (스마트워치) - 복잡한 계층구조
    // Level 1: 메인 어셈블리
    new BOMItem(
      new BOMItemId('bom-item-009'),
      new BOMId('bom-004'),
      new ProductId('prod-001'), // 디스플레이 모듈
      undefined, // 최상위
      1,
      1,
      1.0,
      new Unit('EA', '개'),
      45.80,
      0.1,
      false,
      ComponentType.SUB_ASSEMBLY
    ),

    // Level 2: 디스플레이 모듈 하위 구성품
    new BOMItem(
      new BOMItemId('bom-item-012'),
      new BOMId('bom-004'),
      new ProductId('prod-003'), // 실리콘 (터치패널 실링용)
      new BOMItemId('bom-item-009'), // 디스플레이 모듈의 하위
      2, // level 2
      1,
      1.2,
      new Unit('G', '그램'),
      0.18,
      0.8,
      false,
      ComponentType.RAW_MATERIAL
    ),

    // Level 3: 더 깊은 계층 (메인보드 하위)
    new BOMItem(
      new BOMItemId('bom-item-015'),
      new BOMId('bom-004'),
      new ProductId('prod-002'), // 센서 IC
      new BOMItemId('bom-item-011'), // 메인보드의 하위
      3, // level 3
      1,
      3.0,
      new Unit('EA', '개'),
      12.50,
      0.05,
      false,
      ComponentType.PURCHASED_PART
    )
  ];
}

// BOM과 BOMItem 연결
function linkItemsToBOMs(): void {
  boms.forEach(bom => {
    const relatedItems = bomItems.filter(item => 
      item.getBOMId().equals(bom.getId())
    );
    relatedItems.forEach(item => bom.addBOMItem(item));
  });
}
```

**특징**:
- **4개 BOM, 17개 구성품**: 다양한 제품군 커버
- **3단계 계층 구조**: 스마트워치 BOM에서 복잡한 트리 구조 구현
- **현실적인 데이터**: 실제 제조업 환경과 유사한 부품 구성
- **UI 테스트 가능**: 드래그&드롭, 확장/축소, 비교 등 모든 기능 테스트 가능

## 🚀 BOM 시스템 통합 및 성능

### ProductManagementPage 통합

```typescript
export const ProductManagementPage = () => {
  // 기존 제품 관리 상태
  const { products, loadProducts, ... } = useProductList();
  
  // BOM 관리 상태 추가
  const { 
    treeNodes, 
    bom, 
    loading: bomLoading,
    loadBOMTree,
    toggleNode,
    expandAll,
    collapseAll 
  } = useBOMTree();
  
  // BOM 작업 관리
  const {
    addBOMItem,
    updateBOMItem, 
    deleteBOMItem,
    copyBOM,
    isAdding,
    isUpdating
  } = useBOMOperations();

  // 탭 상태 관리
  const [activeTab, setActiveTab] = useState<'products' | 'bom'>('products');
  
  return (
    <PageContainer>
      <PageHeader>
        <h1>제품정보 관리</h1>
        <TabContainer>
          <Tab 
            active={activeTab === 'products'} 
            onClick={() => setActiveTab('products')}
          >
            제품 관리
          </Tab>
          <Tab 
            active={activeTab === 'bom'} 
            onClick={() => setActiveTab('bom')}
          >
            BOM 관리
          </Tab>
        </TabContainer>
      </PageHeader>

      {activeTab === 'products' && (
        <ProductManagementSection>
          <ProductSearchFilter />
          <ProductTable />
          <Pagination />
          <ProductFormModal />
        </ProductManagementSection>
      )}

      {activeTab === 'bom' && (
        <BOMManagementSection>
          <BOMTreeControls 
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onExport={handleExport}
          />
          <BOMTreeTable 
            treeNodes={treeNodes}
            onAddItem={handleAddBOMItem}
            onEditItem={handleEditBOMItem}
            onDeleteItem={handleDeleteBOMItem}
            expandedNodes={state.expandedNodes}
            onToggleExpand={toggleNode}
          />
          <BOMStatistics statistics={state.statistics} />
          
          {/* BOM 모달들 */}
          <BOMItemModal />
          <BOMCopyModal />
          <BOMCompareModal />
        </BOMManagementSection>
      )}
    </PageContainer>
  );
};
```

### 성능 최적화

1. **메모이제이션**: React.memo, useMemo, useCallback 전면 적용
2. **가상화**: 대량 BOM 트리 렌더링 최적화
3. **지연 로딩**: BOM 트리 노드 온디맨드 로딩
4. **번들 분할**: BOM 모듈 코드 스플리팅
5. **에러 바운더리**: BOM 컴포넌트별 독립적 에러 처리

## 📋 BOM 시스템 특장점

### 🎯 비즈니스 가치
1. **정확한 원가 계산**: 스크랩률, 계층별 비용 자동 집계
2. **변경 추적성**: 모든 BOM 변경사항 상세 이력 관리
3. **순환 참조 방지**: 실시간 검증으로 데이터 무결성 보장
4. **시각적 비교**: 제품 간 BOM 차이점 한눈에 파악

### 🔧 기술적 우수성
1. **확장 가능한 아키텍처**: 클린 아키텍처 기반 모듈형 설계
2. **타입 안전성**: TypeScript로 컴파일 타임 검증
3. **실시간 UI**: 드래그&드롭, 인라인 편집 등 직관적 UX
4. **테스트 용이성**: Mock 데이터와 실제 API 완전 분리

BOM 관리 시스템은 **제조업 MES의 핵심 모듈**로서 완전한 기능과 확장성을 제공합니다.