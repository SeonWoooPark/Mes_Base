# MES 제품정보 관리 시스템 - 환경 설정 가이드

## 🚀 개요

본 문서는 MES 제품정보 관리 시스템을 다양한 환경에서 실행하기 위한 환경 설정 가이드입니다. Feature-First Clean Architecture를 기반으로 구현된 시스템은 Mock 데이터와 실제 API 연동을 환경변수를 통해 쉽게 전환할 수 있습니다.

## 📋 환경변수 목록

### 🔧 기본 설정

| 변수명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `REACT_APP_API_BASE_URL` | string | No | `http://localhost:8080` | 백엔드 API 서버 URL |
| `REACT_APP_USE_MOCK_DATA` | string | No | `true` | Mock 데이터 사용 여부 |
| `REACT_APP_ENVIRONMENT` | string | No | `development` | 실행 환경 (development, test, production) |

### 🔒 인증 관련

| 변수명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `REACT_APP_JWT_SECRET` | string | No | - | JWT 토큰 시크릿 키 (개발 환경) |
| `REACT_APP_AUTH_TIMEOUT` | number | No | `3600000` | 인증 토큰 만료 시간 (밀리초) |

### 📊 성능 및 모니터링

| 변수명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `REACT_APP_API_TIMEOUT` | number | No | `10000` | API 요청 타임아웃 (밀리초) |
| `REACT_APP_ENABLE_LOGGING` | string | No | `true` | 로깅 활성화 여부 |
| `REACT_APP_LOG_LEVEL` | string | No | `info` | 로깅 레벨 (debug, info, warn, error) |

---

## 📁 환경별 설정 파일

### 🔨 개발 환경 (.env.development)

```bash
# 개발 환경 설정
REACT_APP_ENVIRONMENT=development
REACT_APP_API_BASE_URL=http://localhost:8080
REACT_APP_USE_MOCK_DATA=true

# 개발용 인증 설정
REACT_APP_JWT_SECRET=dev_secret_key_do_not_use_in_production
REACT_APP_AUTH_TIMEOUT=3600000

# 개발용 성능 설정
REACT_APP_API_TIMEOUT=15000
REACT_APP_ENABLE_LOGGING=true
REACT_APP_LOG_LEVEL=debug

# 개발용 기능 플래그
REACT_APP_ENABLE_DEBUG_TOOLS=true
REACT_APP_ENABLE_MOCK_DELAY=true
REACT_APP_MOCK_DELAY_MS=500
```

### 🧪 테스트 환경 (.env.test)

```bash
# 테스트 환경 설정
REACT_APP_ENVIRONMENT=test
REACT_APP_API_BASE_URL=http://localhost:8080
REACT_APP_USE_MOCK_DATA=true

# 테스트용 인증 설정
REACT_APP_AUTH_TIMEOUT=1800000

# 테스트용 성능 설정
REACT_APP_API_TIMEOUT=5000
REACT_APP_ENABLE_LOGGING=false
REACT_APP_LOG_LEVEL=error

# 테스트용 기능 플래그
REACT_APP_ENABLE_DEBUG_TOOLS=false
REACT_APP_ENABLE_MOCK_DELAY=false
```

### 🏭 스테이징 환경 (.env.staging)

```bash
# 스테이징 환경 설정
REACT_APP_ENVIRONMENT=staging
REACT_APP_API_BASE_URL=https://staging-api.mes.company.com
REACT_APP_USE_MOCK_DATA=false

# 스테이징용 성능 설정
REACT_APP_API_TIMEOUT=10000
REACT_APP_ENABLE_LOGGING=true
REACT_APP_LOG_LEVEL=info

# 스테이징용 기능 플래그
REACT_APP_ENABLE_DEBUG_TOOLS=true
REACT_APP_ENABLE_MOCK_DELAY=false
```

### 🚀 프로덕션 환경 (.env.production)

```bash
# 프로덕션 환경 설정
REACT_APP_ENVIRONMENT=production
REACT_APP_API_BASE_URL=https://api.mes.company.com
REACT_APP_USE_MOCK_DATA=false

# 프로덕션용 성능 설정
REACT_APP_API_TIMEOUT=10000
REACT_APP_ENABLE_LOGGING=true
REACT_APP_LOG_LEVEL=warn

# 프로덕션용 기능 플래그
REACT_APP_ENABLE_DEBUG_TOOLS=false
REACT_APP_ENABLE_MOCK_DELAY=false
```

---

## 🔄 Mock/Real API 전환 가이드

### Mock 데이터 모드 (개발용)

Mock 데이터 모드는 백엔드 서버 없이 프론트엔드 개발을 위한 모드입니다.

```bash
# .env.development
REACT_APP_USE_MOCK_DATA=true
```

**특징:**
- ✅ 백엔드 서버 불필요
- ✅ 빠른 개발 및 테스트 가능
- ✅ 안정적인 개발 환경
- ❌ 실제 데이터와의 차이 발생 가능

### Real API 모드 (실제 연동)

실제 백엔드 API와 연동하는 모드입니다.

```bash
# .env 파일
REACT_APP_USE_MOCK_DATA=false
REACT_APP_API_BASE_URL=http://localhost:8080
```

**특징:**
- ✅ 실제 데이터 사용
- ✅ 완전한 통합 테스트
- ✅ 프로덕션과 동일한 환경
- ❌ 백엔드 서버 필요

---

## 🏗️ 설정별 Repository 동작

### DIContainer의 환경변수 기반 의존성 주입

```typescript
// src/app/config/DIContainer.ts
const useMockData = process.env.REACT_APP_USE_MOCK_DATA !== 'false';

// Product Repository
const productRepository = useMockData 
  ? new MockProductRepository()           // Mock: 메모리 내 데이터
  : new HttpProductRepository(apiClient); // Real: REST API

// BOM Repository  
const bomRepository = useMockData
  ? new MockBOMRepository()               // Mock: 메모리 내 데이터
  : new HttpBOMRepository(apiClient);     // Real: REST API

// BOM Item Repository
const bomItemRepository = useMockData
  ? new MockBOMItemRepository()           // Mock: 메모리 내 데이터
  : new HttpBOMItemRepository(apiClient); // Real: REST API

// BOM History Repository
const bomHistoryRepository = useMockData
  ? new MockBOMHistoryRepository()        // Mock: 메모리 내 데이터
  : new HttpBOMHistoryRepository(apiClient); // Real: REST API
```

### 각 모드별 데이터 플로우

#### Mock 모드 플로우
```
UI Component → Custom Hook → UseCase → MockRepository → In-Memory Data
```

#### Real API 모드 플로우
```
UI Component → Custom Hook → UseCase → HttpRepository → ApiClient → Backend API
```

---

## 🛠️ 개발 환경 설정 단계

### 1단계: 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 클론
git clone <repository-url>
cd FrontEnd_Base

# 의존성 설치
npm install
```

### 2단계: 환경변수 파일 생성

```bash
# 개발 환경 설정 파일 생성
cp .env.example .env.development

# 또는 직접 생성
touch .env.development
```

### 3단계: 환경변수 설정

```bash
# .env.development 파일 편집
REACT_APP_USE_MOCK_DATA=true
REACT_APP_API_BASE_URL=http://localhost:8080
REACT_APP_ENVIRONMENT=development
```

### 4단계: 개발 서버 실행

```bash
# Mock 데이터 모드로 개발 서버 시작
npm start

# 또는 특정 환경으로 실행
npm run start:development
npm run start:staging
npm run start:production
```

---

## 🔍 환경별 확인 방법

### Mock 모드 확인

1. **브라우저 개발자 도구** → Network 탭 확인
   - API 요청이 없어야 함
   - 로컬 데이터만 사용

2. **콘솔 로그** 확인
   ```
   [DIContainer] Using Mock repositories
   [MockProductRepository] Loading mock data...
   ```

### Real API 모드 확인

1. **브라우저 개발자 도구** → Network 탭 확인
   - API 요청들이 실제 서버로 전송됨
   - `/api/products`, `/api/boms` 등의 요청 확인

2. **콘솔 로그** 확인
   ```
   [DIContainer] Using HTTP repositories
   [ApiClient] Connected to: http://localhost:8080
   ```

---

## ⚙️ 고급 설정

### API 클라이언트 커스터마이징

```typescript
// src/shared/services/api/ApiClient.ts 설정 예시
constructor(baseURL: string = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080') {
  this.client = axios.create({
    baseURL,
    timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '10000'),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
```

### 로깅 설정

```typescript
// 환경변수 기반 로깅 레벨 설정
const logLevel = process.env.REACT_APP_LOG_LEVEL || 'info';
const enableLogging = process.env.REACT_APP_ENABLE_LOGGING === 'true';
```

### 성능 모니터링 설정

```bash
# 성능 관련 환경변수
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true
REACT_APP_BUNDLE_ANALYZER=false
REACT_APP_SOURCE_MAP=false
```

---

## 🚨 문제 해결 (Troubleshooting)

### 1. API 연결 실패

**문제**: `Network Error` 또는 `CORS` 에러

**해결방법**:
```bash
# 백엔드 서버 실행 확인
curl http://localhost:8080/health

# CORS 설정 확인
# 백엔드에서 프론트엔드 도메인 허용 확인
```

### 2. Mock 데이터가 로드되지 않음

**문제**: Mock 데이터가 표시되지 않음

**해결방법**:
```bash
# 환경변수 확인
echo $REACT_APP_USE_MOCK_DATA

# .env 파일 확인
cat .env.development
```

### 3. 환경변수가 적용되지 않음

**문제**: 환경변수 변경이 반영되지 않음

**해결방법**:
```bash
# 개발 서버 재시작
npm start

# 브라우저 캐시 삭제
# Ctrl+Shift+R (하드 리프레시)
```

### 4. 빌드 시 환경변수 에러

**문제**: 프로덕션 빌드 시 환경변수 누락

**해결방법**:
```bash
# .env.production 파일 생성 확인
ls -la .env*

# 빌드 시 환경 지정
NODE_ENV=production npm run build
```

---

## 📚 참고 자료

### React 환경변수 관련
- [Create React App - Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [React Environment Variables Best Practices](https://www.freecodecamp.org/news/how-to-use-environment-variables-in-react/)

### TypeScript 설정
- [TypeScript Configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- [Path Mapping in TypeScript](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping)

### Clean Architecture
- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Feature-First Architecture Pattern](https://khalilstemmler.com/articles/enterprise-typescript-nodejs/clean-node-architecture/)

---

## 🔗 관련 문서

- [Backend API 명세서](./backend-api-specification.md)
- [Feature-First Clean Architecture 가이드](./CLAUDE.md)
- [개발 환경 설정](./README.md)

---

이 가이드를 통해 다양한 환경에서 MES 제품정보 관리 시스템을 성공적으로 설정하고 실행할 수 있습니다. 추가 질문이나 문제가 있으시면 개발팀에 문의해 주세요.