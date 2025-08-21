# 🚀 MES 제품정보 관리 시스템 - 개발자 온보딩 가이드

> **React + TypeScript + Feature-First Clean Architecture**로 구축된 Enterprise급 MES(제조실행시스템) 프론트엔드 애플리케이션

## 📁 프로젝트 폴더 구조

### Root 구조
```
FrontEnd_Base/
├── src/
│   ├── app/                    # 애플리케이션 엔트리 및 전역 설정
│   ├── features/               # Feature-First 아키텍처 기반 기능 모듈
│   ├── shared/                 # 공통 컴포넌트 및 유틸리티
│   └── index.tsx              # 앱 엔트리 포인트
├── docs/                       # 아키텍처 문서
├── coverage/                   # 테스트 커버리지 리포트
└── package.json
```

### Feature별 Clean Architecture 구조
```
features/
├── product/                    # 제품 정보 관리 기능
│   ├── application/            # UseCase 레이어
│   │   └── usecases/
│   ├── domain/                 # 도메인 엔티티 및 비즈니스 로직
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── services/
│   ├── infrastructure/         # 외부 시스템 연동 (API, Mock)
│   │   └── repositories/
│   ├── presentation/           # React 컴포넌트 및 UI 로직
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   └── config/                 # DI 설정
└── bom/                        # BOM 관리 기능 (동일한 구조)
```

## 🔄 시스템 워크플로우

### 1. 애플리케이션 초기화 흐름
```
App.tsx 시작
  ↓
AppInitializer.initialize()
  ↓
DIContainer 싱글톤 생성
  ↓
Feature별 DI 모듈 로드 (Product, BOM)
  ↓
환경변수 기반 Mock/Real 구현체 선택
  ↓
UseCase별 의존성 주입 완료
  ↓
QueryProvider + AppRouter 렌더링
```

### 2. 페이지별 데이터 흐름
```
UI Component (ProductManagementPage)
  ↓
Custom Hook (useProductList)
  ↓
TanStack Query + Zustand State
  ↓
UseCase (GetProductListUseCase) 
  ↓
Repository Interface (ProductRepository)
  ↓
구현체 선택 (MockProductRepository | HttpProductRepository)
  ↓
Domain Entity (Product) ← DTO 변환
  ↓
UI에 ProductListItem 반환
```

## 🏗️ 데이터 흐름 및 상태 관리

### 상태 관리 구조
- **서버 상태**: TanStack Query v5 (캐싱, 동기화, 자동 재시도)
- **UI 상태**: Zustand (모달, 필터, 선택상태)
- **의존성 주입**: DIContainer 싱글톤 패턴

### TanStack Query + Zustand 협력
```typescript
// UI 상태 - Zustand
const productView = useAppStoreSelectors.useProductView();
const productFilters = useAppStoreSelectors.useProductFilters();

// 서버 상태 - TanStack Query  
const productListQuery = useFeatureQuery({
  feature: 'product',
  operation: 'list', 
  queryFn: () => getProductListUseCase.execute(request),
  params: { page, pageSize, filters }
});
```

### 핵심 Hook 패턴
```typescript
useProductList() {
  // Zustand에서 UI 상태 조회
  // TanStack Query로 서버 데이터 페칭
  // 파생상태 계산 및 액션 함수 제공
  return { products, loading, setPage, setFilters, ... }
}
```

## 🎯 주요 기능별 컴포넌트 연관관계

### Product 기능 모듈
```
ProductManagementPage (루트 컴포넌트)
├── ProductSearchFilter         # 검색/필터 UI
├── ProductTable               # 데이터 테이블 (TanStack Table)
├── ProductFormModal           # CRUD 모달
├── ProductHistoryModal        # 이력 조회 모달
└── Pagination                 # 페이지네이션

Hook 의존성:
├── useProductList()           # 목록 조회 및 상태 관리
├── useProductHistory()        # 이력 조회
├── useCreateProduct()         # 생성 Mutation
├── useUpdateProduct()         # 수정 Mutation  
└── useDeleteProduct()         # 삭제 Mutation
```

### BOM 기능 모듈
```
BOMManagementPage
├── BOMTreeTable              # 트리형 BOM 구조
├── BOMItemModal              # BOM 아이템 편집
├── BOMCopyModal              # BOM 복사
└── BOMCompareModal           # BOM 비교

Hook 의존성:
├── useBOMTree()              # BOM 트리 상태
├── useBOMOperations()        # CRUD 작업
└── useBOMComparison()        # BOM 비교
```

## ⚙️ 의존성 주입 시스템

### DIContainer 구조
```typescript
DIContainer (싱글톤)
├── Repository 레이어
│   ├── ProductRepository (Mock/Http 구현체)
│   ├── BOMRepository
│   └── HistoryRepository
├── Domain Service 레이어  
│   ├── ProductCodeGenerator
│   ├── BOMCircularChecker
│   └── ProductPresenter
└── UseCase 레이어
    ├── GetProductListUseCase
    ├── CreateProductUseCase
    └── 기타 CRUD UseCases
```

### 환경별 구현체 선택
```typescript
// REACT_APP_USE_MOCK_DATA에 따른 분기
const productRepository = useMockData 
  ? new MockProductRepository()      // 개발/테스트용
  : new HttpProductRepository(api);  // 운영용
```

## 📊 성능 최적화 전략

### 캐싱 및 동기화
- **Smart Invalidation**: 관련 쿼리만 선별적 무효화
- **Cache Strategy Manager**: Feature별 캐시 정책 관리
- **Optimistic Updates**: 사용자 경험 개선용 낙관적 업데이트

### 컴포넌트 최적화
- **Lazy Loading**: 페이지별 코드 스플리팅
- **Virtual Scrolling**: 대용량 데이터 테이블 처리
- **useMemo/useCallback**: 불필요한 재렌더링 방지

## 🔧 개발 환경 설정

### 환경 변수
- `REACT_APP_USE_MOCK_DATA`: Mock 데이터 사용 여부 (default: true)
- `NODE_ENV`: 개발/운영 환경 구분

### 주요 명령어
```bash
npm start                      # 개발 서버 시작
npm run build                  # 프로덕션 빌드
npm test                       # 테스트 실행
npm run test:coverage         # 커버리지 포함 테스트
```

