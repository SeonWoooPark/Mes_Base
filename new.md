# 기존 클린 아키텍처 구조 리펙토링

- 기능(Feature) 기반 폴더 구조와 클린 아키텍처의 장점을 모두 결합하려면, "도메인(기능)별로 폴더를 나누되 각 폴더 내부를 클린 아키텍처의 레이어(도메인, 애플리케이션, 인프라, 프레젠테이션)로 분리

## 레이어 별 역할
1) domain
핵심 비즈니스 객체와 규칙 — 순수 로직, 외부 의존성 없음
2) application
유스케이스 — 도메인 조작 + 외부 연동 포트(인터페이스) 호출
3) infrastructure
도메인 레이어의 인터페이스를 구현 — API·DB 등 실제 연동
4) presentation
React UI와 이벤트 핸들링 — 상태관리 훅에서 useCase 실행

## 📒 특징 & 즉시 사용 팁
폴더명·파일명 → 전부 camelCase or PascalCase 통일

index.ts → 각 폴더에서 외부 노출 항목을 집약 관리하면 import 경로가 깔끔해짐

tsconfig.json에 paths 설정 추가 → @features/product/... 식으로 경로 단축

새 기능 추가 시 → features/[기능명] 폴더 복제 후 내용만 수정

공용 훅/컴포넌트/타입은 반드시 shared/에 위치

### 목표 리펙토링 프로젝트 구조
```
src/
├── app/                                # 앱 전역 설정
│   ├── providers/                      # Context, 전역 Provider 컴포넌트
│   ├── router/                         # 라우터 설정
│   │   └── AppRouter.tsx
│   ├── store/                          # 전역 상태 (Redux/Zustand/Recoil)
│   ├── config/                         # 환경변수, 설정
│   ├── App.tsx
│   └── main.tsx                        # 진입점 (Vite: main.tsx, CRA: index.tsx)
│
├── features/
│   ├── product/                        # '제품관리' 기능(도메인)
│   │   ├── domain/                     # (1) 비즈니스 엔티티/규칙
│   │   │   ├── entities/
│   │   │   │   └── Product.ts          # 엔티티 클래스
│   │   │   ├── valueObjects/
│   │   │   │   └── ProductId.ts
│   │   │   ├── repositories/           # 저장소 인터페이스
│   │   │   │   └── ProductRepository.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── application/                # (2) 유스케이스/서비스
│   │   │   ├── usecases/
│   │   │   │   ├── GetProductListUseCase.ts
│   │   │   │   ├── CreateProductUseCase.ts
│   │   │   │   ├── UpdateProductUseCase.ts
│   │   │   │   └── DeleteProductUseCase.ts
│   │   │   ├── dtos/
│   │   │   │   ├── ProductDTO.ts
│   │   │   │   └── ProductFilter.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── infrastructure/             # (3) 외부 연동
│   │   │   ├── repositories/
│   │   │   │   └── HttpProductRepository.ts
│   │   │   ├── services/
│   │   │   │   └── ProductApi.ts       # axios/fetch API 호출
│   │   │   └── index.ts
│   │   │
│   │   ├── presentation/               # (4) UI/화면
│   │   │   ├── pages/
│   │   │   │   └── ProductManagementPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── ProductTable.tsx
│   │   │   │   ├── ProductForm.tsx
│   │   │   │   └── ProductHistoryModal.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useProductTable.ts
│   │   │   ├── styles/
│   │   │   │   └── product.module.css
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts                    # product 기능 export 엔트리
│   │
│   ├── user/                           # '사용자' 기능(동일 구조)
│   │   └── ...
│
├── shared/                             # 공용 코드
│   ├── components/                     # 전역 공용 컴포넌트(버튼, 모달 등)
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   └── constants/
│
├── assets/                             # 이미지, 폰트, 스타일 자산
│   ├── images/
│   ├── icons/
│   └── styles/                         # 전역 스타일
│       └── global.css
│
└── index.ts                            # 전역 export 엔트리 (선택)
```