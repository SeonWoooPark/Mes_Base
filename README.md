# MES 제품정보 관리 시스템

클린 아키텍처 패턴을 적용한 React TypeScript 기반의 제조실행시스템(MES) 제품정보 관리 모듈입니다.

## 🏗️ 아키텍처

이 프로젝트는 **클린 아키텍처(Clean Architecture)** 패턴을 따릅니다:

```
src/
├── domain/              # 도메인 계층 - 핵심 비즈니스 로직
│   ├── entities/        # 엔티티 (Product, ProductHistory)
│   ├── repositories/    # 리포지토리 인터페이스
│   └── services/        # 도메인 서비스
├── application/         # 애플리케이션 계층 - 유스케이스
│   ├── usecases/        # 비즈니스 유스케이스
│   └── interfaces/      # 어댑터 인터페이스
├── infrastructure/      # 인프라 계층 - 외부 시스템 연동
│   ├── repositories/    # HTTP 리포지토리 구현체
│   └── api/             # API 클라이언트
├── presentation/        # 프레젠테이션 계층 - UI
│   ├── components/      # React 컴포넌트
│   ├── pages/           # 페이지 컴포넌트
│   ├── hooks/           # 커스텀 훅
│   └── utils/           # UI 유틸리티
├── config/              # 설정 및 DI 컨테이너
└── shared/              # 공통 유틸리티
```

## 🚀 시작하기

### 필수 요구사항

- Node.js 16.x 이상
- npm 8.x 이상

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm start

# 타입 체크
npm run typecheck

# 빌드
npm run build

# 테스트
npm test
```

### 환경 변수 설정

`.env.example` 파일을 참고하여 `.env` 파일을 생성하세요:

```bash
cp .env.example .env
```

## 🎯 주요 기능

### ✅ 구현된 기능

- **제품 목록 조회**: 페이징, 정렬, 필터링, 검색 지원
- **제품 등록**: 제품코드 자동 채번, 유효성 검증
- **제품 수정**: 변경 이력 추적, 비즈니스 규칙 검증
- **제품 삭제**: 논리 삭제, 의존성 검사
- **제품 이력 조회**: 모든 변경 사항 추적

### 🎨 UI 기능

- **반응형 테이블**: 정렬, 페이징, 필터링
- **모달 기반 폼**: 등록/수정 폼
- **검색 및 필터**: 통합 검색, 제품유형/상태별 필터
- **상태 표시**: 시각적 상태 배지
- **로딩 상태**: 사용자 피드백

## 🏛️ 핵심 설계 원칙

### 의존성 역전 원칙 (DIP)
- 도메인 계층은 외부 계층에 의존하지 않음
- 인터페이스를 통한 의존성 주입

### 단일 책임 원칙 (SRP)
- 각 계층과 클래스는 하나의 책임만 가짐
- UseCase별로 분리된 비즈니스 로직

### 개방-폐쇄 원칙 (OCP)
- 확장에는 열려있고 수정에는 닫혀있음
- 새로운 기능 추가 시 기존 코드 수정 최소화

## 📊 도메인 모델

### Product (제품) 엔티티
```typescript
- ProductId: 제품 식별자
- cd_material: 제품 코드 (자동 채번)
- nm_material: 제품명
- type: 제품 유형 (완제품/반제품/원자재)
- category: 카테고리
- unit: 단위
- safetyStock: 안전재고
- isActive: 사용 여부
```

### 비즈니스 규칙
- 제품코드는 유형별 자동 채번 (FG/SF/RM + 년월 + 순번)
- 완제품을 원자재로 변경 불가
- BOM/생산계획에서 사용 중인 제품 삭제 불가
- 모든 변경사항은 이력으로 기록

## 🔧 기술 스택

- **Frontend**: React 18, TypeScript
- **State Management**: Custom hooks + UseCase pattern
- **Styling**: Styled Components
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **Build Tool**: Create React App

## 📝 개발 가이드

### 새로운 UseCase 추가

1. `application/usecases/` 에 UseCase 클래스 생성
2. 필요한 Repository 인터페이스 정의
3. Infrastructure 계층에 구현체 작성
4. DI Container에 의존성 등록
5. Presentation 계층에서 사용

### 새로운 UI 컴포넌트 추가

1. `presentation/components/` 에 컴포넌트 생성
2. Styled Components로 스타일링
3. Props 인터페이스 정의
4. 스토리북 스토리 작성 (선택사항)

## 🧪 테스트 전략

### Domain Layer
- 엔티티 비즈니스 로직 단위 테스트
- 도메인 서비스 테스트

### Application Layer
- UseCase 시나리오 테스트
- Mock 리포지토리 사용

### Presentation Layer
- React Testing Library 사용
- 컴포넌트 단위 테스트
- 사용자 시나리오 테스트

## 🚢 배포

```bash
# 프로덕션 빌드
npm run build

# build 폴더가 생성됨
# 정적 파일 서버에 배포 가능
```

## 📈 향후 계획

### Phase 2: 고급 기능
- [ ] Excel 업로드/다운로드
- [ ] 제품 이미지 관리
- [ ] 바코드/QR코드 생성
- [ ] 고급 검색 (범위, 날짜 등)

### Phase 3: 시스템 통합
- [ ] BOM(Bill of Materials) 연동
- [ ] 재고 관리 시스템 연동
- [ ] 생산 계획 시스템 연동
- [ ] 실시간 알림

### Phase 4: 성능 최적화
- [ ] 가상화 테이블 (대용량 데이터)
- [ ] 클라이언트 사이드 캐싱
- [ ] 무한 스크롤
- [ ] PWA 지원

## 🤝 기여 가이드

1. 코드 스타일: ESLint + Prettier 설정 준수
2. 커밋 메시지: Conventional Commits 형식
3. PR 템플릿 사용
4. 테스트 코드 작성 필수

## 📄 라이선스

MIT License

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해 주세요.