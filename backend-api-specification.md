# MES 제품정보 관리 시스템 - 백엔드 API 명세서

## 🏗️ 개요

본 문서는 MES(Manufacturing Execution System) 제품정보 관리 시스템의 백엔드 API 명세서입니다. Feature-First Clean Architecture를 기반으로 설계된 Product 및 BOM 관리 기능을 위한 REST API를 정의합니다.

## 📋 기본 설정

- **Base URL**: `http://localhost:8080` (개발 환경)
- **Content-Type**: `application/json`
- **Authentication**: Bearer Token (JWT)
- **API Version**: v1

### 공통 응답 형식

모든 API는 다음과 같은 공통 응답 형식을 사용합니다:

```json
{
  "success": true,
  "data": {
    // 실제 데이터
  },
  "message": "요청이 성공적으로 처리되었습니다.",
  "errors": []
}
```

### 에러 응답 형식

```json
{
  "success": false,
  "data": null,
  "message": "에러 메시지",
  "errors": [
    "구체적인 에러 내용"
  ]
}
```

### HTTP 상태 코드

- `200 OK`: 성공
- `201 Created`: 생성 성공
- `400 Bad Request`: 잘못된 요청
- `401 Unauthorized`: 인증 실패
- `403 Forbidden`: 권한 없음
- `404 Not Found`: 리소스 없음
- `422 Unprocessable Entity`: 유효성 검증 실패
- `500 Internal Server Error`: 서버 에러

---

## 🏷️ Product API

### 1. 제품 목록 조회 (페이징)

**GET** `/api/products`

제품 목록을 페이징, 검색, 정렬, 필터 기능과 함께 조회합니다.

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| page | number | No | 1 | 페이지 번호 (1부터 시작) |
| pageSize | number | No | 20 | 페이지당 항목 수 (최대 1000) |
| sortBy | string | No | cd_material | 정렬 필드 |
| sortDirection | string | No | asc | 정렬 방향 (asc, desc) |
| search | string | No | - | 검색 키워드 (제품코드, 제품명에서 검색) |
| filters[n].field | string | No | - | 필터 필드명 |
| filters[n].value | string | No | - | 필터 값 |

#### 응답 데이터

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "cd_material": "FG2412001",
        "nm_material": "삼성 갤럭시 S24 케이스",
        "type": "FINISHED_PRODUCT",
        "category": {
          "code": "ELECTRONICS",
          "name": "전자제품"
        },
        "unit": {
          "code": "EA",
          "name": "개"
        },
        "safetyStock": 100,
        "isActive": true,
        "additionalInfo": {
          "description": "제품 설명",
          "specifications": "제품 사양",
          "notes": "비고"
        },
        "id_create": "user123",
        "id_updated": "user123",
        "dt_create": "2024-08-19T10:00:00Z",
        "dt_update": "2024-08-19T10:00:00Z"
      }
    ],
    "totalCount": 150,
    "currentPage": 1,
    "totalPages": 8
  }
}
```

---

### 2. 전체 제품 조회

**GET** `/api/products/all`

조건에 맞는 모든 제품을 조회합니다 (페이징 없음).

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| sortBy | string | No | cd_material | 정렬 필드 |
| sortDirection | string | No | asc | 정렬 방향 (asc, desc) |
| search | string | No | - | 검색 키워드 |
| filters[n].field | string | No | - | 필터 필드명 |
| filters[n].value | string | No | - | 필터 값 |

#### 응답 데이터

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "cd_material": "FG2412001",
      "nm_material": "삼성 갤럭시 S24 케이스",
      // ... 제품 정보 전체
    }
  ]
}
```

---

### 3. 제품 개수 조회

**GET** `/api/products/count`

조건에 맞는 제품의 총 개수를 조회합니다.

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| search | string | No | - | 검색 키워드 |
| filters[n].field | string | No | - | 필터 필드명 |
| filters[n].value | string | No | - | 필터 값 |

#### 응답 데이터

```json
{
  "success": true,
  "data": {
    "count": 150
  }
}
```

---

### 4. 제품 상세 조회

**GET** `/api/products/{id}`

특정 제품의 상세 정보를 조회합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string | Yes | 제품 ID (UUID) |

#### 응답 데이터

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "cd_material": "FG2412001",
    "nm_material": "삼성 갤럭시 S24 케이스",
    "type": "FINISHED_PRODUCT",
    "category": {
      "code": "ELECTRONICS",
      "name": "전자제품"
    },
    "unit": {
      "code": "EA",
      "name": "개"
    },
    "safetyStock": 100,
    "isActive": true,
    "additionalInfo": {
      "description": "제품 설명",
      "specifications": "제품 사양",
      "notes": "비고"
    },
    "id_create": "user123",
    "id_updated": "user123",
    "dt_create": "2024-08-19T10:00:00Z",
    "dt_update": "2024-08-19T10:00:00Z"
  }
}
```

---

### 5. 제품 생성

**POST** `/api/products`

새로운 제품을 생성합니다.

#### 요청 데이터

```json
{
  "nm_material": "새로운 제품",
  "type": "FINISHED_PRODUCT",
  "category": {
    "code": "ELECTRONICS",
    "name": "전자제품"
  },
  "unit": {
    "code": "EA",
    "name": "개"
  },
  "safetyStock": 50,
  "isActive": true,
  "additionalInfo": {
    "description": "제품 설명",
    "specifications": "제품 사양",
    "notes": "비고"
  },
  "id_create": "user123"
}
```

#### 응답 데이터

```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "cd_material": "FG2412002",
    // ... 생성된 제품 전체 정보
  },
  "message": "제품이 성공적으로 생성되었습니다."
}
```

---

### 6. 제품 수정

**PUT** `/api/products/{id}`

기존 제품 정보를 수정합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string | Yes | 제품 ID (UUID) |

#### 요청 데이터

```json
{
  "nm_material": "수정된 제품명",
  "type": "FINISHED_PRODUCT",
  "category": {
    "code": "ELECTRONICS",
    "name": "전자제품"
  },
  "unit": {
    "code": "EA",
    "name": "개"
  },
  "safetyStock": 75,
  "isActive": true,
  "additionalInfo": {
    "description": "수정된 설명",
    "specifications": "수정된 사양",
    "notes": "수정된 비고"
  },
  "id_updated": "user123"
}
```

#### 응답 데이터

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    // ... 수정된 제품 전체 정보
  },
  "message": "제품이 성공적으로 수정되었습니다."
}
```

---

### 7. 제품 삭제

**DELETE** `/api/products/{id}`

제품을 삭제합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string | Yes | 제품 ID (UUID) |

#### 응답 데이터

```json
{
  "success": true,
  "data": null,
  "message": "제품이 성공적으로 삭제되었습니다."
}
```

---

### 8. 다음 시퀀스 조회

**GET** `/api/products/next-sequence/{prefix}`

제품 코드 생성을 위한 다음 시퀀스 번호를 조회합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| prefix | string | Yes | 제품 코드 접두사 (예: "FG24") |

#### 응답 데이터

```json
{
  "success": true,
  "data": {
    "sequence": 12001
  }
}
```

---

## 📜 Product History API

### 1. 제품 이력 조회

**GET** `/api/product-histories/{productId}`

특정 제품의 변경 이력을 조회합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| productId | string | Yes | 제품 ID (UUID) |

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| page | number | No | 1 | 페이지 번호 |
| pageSize | number | No | 20 | 페이지당 항목 수 |

#### 응답 데이터

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "history-uuid",
        "productId": "product-uuid",
        "action": "UPDATE",
        "changes": [
          {
            "field": "nm_material",
            "oldValue": "기존 제품명",
            "newValue": "수정된 제품명"
          },
          {
            "field": "safetyStock",
            "oldValue": 50,
            "newValue": 75
          }
        ],
        "id_create": "user123",
        "id_updated": "user123",
        "dt_create": "2024-08-19T10:30:00Z",
        "description": "제품 정보 수정"
      }
    ],
    "totalCount": 5,
    "currentPage": 1,
    "totalPages": 1
  }
}
```

---

### 2. 제품 이력 생성

**POST** `/api/product-histories`

제품 변경 이력을 생성합니다. (일반적으로 시스템 내부에서 자동 호출)

#### 요청 데이터

```json
{
  "productId": "product-uuid",
  "action": "UPDATE",
  "changes": [
    {
      "field": "nm_material",
      "oldValue": "기존 제품명",
      "newValue": "수정된 제품명"
    }
  ],
  "id_create": "user123",
  "description": "제품 정보 수정"
}
```

#### 응답 데이터

```json
{
  "success": true,
  "data": {
    "id": "new-history-uuid",
    // ... 생성된 이력 정보
  },
  "message": "제품 이력이 성공적으로 생성되었습니다."
}
```

---

## 🏗️ BOM (Bill of Materials) API

### 1. 제품별 BOM 조회 (최신 활성)

**GET** `/api/boms/product/{productId}`

특정 제품의 최신 활성 BOM을 조회합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| productId | string | Yes | 제품 ID (UUID) |

#### 응답 데이터

```json
{
  "success": true,
  "data": {
    "id": "bom-uuid",
    "productId": "product-uuid",
    "version": "v1.0",
    "isActive": true,
    "effectiveDate": "2024-08-19T00:00:00Z",
    "expiryDate": null,
    "description": "초기 BOM 버전",
    "totalCost": 25000.00,
    "id_create": "user123",
    "id_updated": "user123",
    "dt_create": "2024-08-19T10:00:00Z",
    "dt_update": "2024-08-19T10:00:00Z"
  }
}
```

---

### 2. 제품별 특정 버전 BOM 조회

**GET** `/api/boms/product/{productId}/version/{version}`

특정 제품의 특정 버전 BOM을 조회합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| productId | string | Yes | 제품 ID (UUID) |
| version | string | Yes | BOM 버전 (예: "v1.0") |

#### 응답 데이터

동일한 BOM 정보 형식

---

### 3. BOM 상세 조회

**GET** `/api/boms/{id}`

BOM ID로 상세 정보를 조회합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string | Yes | BOM ID (UUID) |

#### 응답 데이터

동일한 BOM 정보 형식

---

### 4. BOM 생성

**POST** `/api/boms`

새로운 BOM을 생성합니다.

#### 요청 데이터

```json
{
  "productId": "product-uuid",
  "version": "v1.1",
  "effectiveDate": "2024-08-20T00:00:00Z",
  "expiryDate": null,
  "description": "개선된 BOM 버전",
  "id_create": "user123"
}
```

#### 응답 데이터

```json
{
  "success": true,
  "data": {
    "id": "new-bom-uuid",
    // ... 생성된 BOM 정보
  },
  "message": "BOM이 성공적으로 생성되었습니다."
}
```

---

## 🔧 BOM Item API

### 1. BOM별 아이템 목록 조회

**GET** `/api/bom-items/bom/{bomId}`

특정 BOM의 모든 아이템을 조회합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| bomId | string | Yes | BOM ID (UUID) |

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| includeInactive | boolean | No | false | 비활성 아이템 포함 여부 |
| maxLevel | number | No | - | 최대 전개 레벨 |

#### 응답 데이터

```json
{
  "success": true,
  "data": [
    {
      "id": "bomitem-uuid",
      "bomId": "bom-uuid",
      "componentId": "component-product-uuid",
      "parentItemId": null,
      "level": 1,
      "sequence": 1,
      "componentType": "RAW_MATERIAL",
      "quantity": 2.5,
      "unit": {
        "code": "KG",
        "name": "킬로그램"
      },
      "unitCost": 1000.00,
      "totalCost": 2500.00,
      "scrapRate": 0.05,
      "actualQuantity": 2.625,
      "isOptional": false,
      "position": "A1",
      "processStep": "조립",
      "remarks": "고품질 원자재 사용",
      "effectiveDate": "2024-08-19T00:00:00Z",
      "expiryDate": null,
      "isActive": true,
      "id_create": "user123",
      "id_updated": "user123",
      "dt_create": "2024-08-19T10:00:00Z",
      "dt_update": "2024-08-19T10:00:00Z"
    }
  ]
}
```

---

### 2. BOM 아이템 추가

**POST** `/api/bom-items`

BOM에 새로운 아이템을 추가합니다.

#### 요청 데이터

```json
{
  "bomId": "bom-uuid",
  "componentId": "component-product-uuid",
  "parentItemId": null,
  "level": 1,
  "sequence": 1,
  "componentType": "RAW_MATERIAL",
  "quantity": 2.5,
  "unit": {
    "code": "KG",
    "name": "킬로그램"
  },
  "unitCost": 1000.00,
  "scrapRate": 0.05,
  "isOptional": false,
  "position": "A1",
  "processStep": "조립",
  "remarks": "고품질 원자재 사용",
  "effectiveDate": "2024-08-19T00:00:00Z",
  "id_create": "user123"
}
```

#### 응답 데이터

```json
{
  "success": true,
  "data": {
    "id": "new-bomitem-uuid",
    // ... 생성된 BOM Item 정보
  },
  "message": "BOM 아이템이 성공적으로 추가되었습니다."
}
```

---

### 3. BOM 아이템 수정

**PUT** `/api/bom-items/{id}`

기존 BOM 아이템을 수정합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string | Yes | BOM Item ID (UUID) |

#### 요청 데이터

```json
{
  "quantity": 3.0,
  "unitCost": 1100.00,
  "scrapRate": 0.03,
  "position": "A2",
  "remarks": "수정된 사양",
  "id_updated": "user123"
}
```

#### 응답 데이터

```json
{
  "success": true,
  "data": {
    // ... 수정된 BOM Item 정보
  },
  "message": "BOM 아이템이 성공적으로 수정되었습니다."
}
```

---

### 4. BOM 아이템 삭제

**DELETE** `/api/bom-items/{id}`

BOM 아이템을 삭제합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string | Yes | BOM Item ID (UUID) |

#### 응답 데이터

```json
{
  "success": true,
  "data": null,
  "message": "BOM 아이템이 성공적으로 삭제되었습니다."
}
```

---

## 📊 BOM History API

### 1. BOM별 이력 조회

**GET** `/api/bom-histories/bom/{bomId}`

특정 BOM의 변경 이력을 조회합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| bomId | string | Yes | BOM ID (UUID) |

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| page | number | No | 1 | 페이지 번호 |
| pageSize | number | No | 20 | 페이지당 항목 수 |

#### 응답 데이터

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "bomhistory-uuid",
        "bomId": "bom-uuid",
        "bomItemId": "bomitem-uuid",
        "action": "ADD_ITEM",
        "changes": [
          {
            "field": "quantity",
            "oldValue": null,
            "newValue": 2.5
          },
          {
            "field": "unitCost",
            "oldValue": null,
            "newValue": 1000.00
          }
        ],
        "id_create": "user123",
        "id_updated": "user123",
        "dt_create": "2024-08-19T10:30:00Z",
        "description": "새로운 원자재 추가"
      }
    ],
    "totalCount": 12,
    "currentPage": 1,
    "totalPages": 1
  }
}
```

---

### 2. BOM 이력 생성

**POST** `/api/bom-histories`

BOM 변경 이력을 생성합니다. (일반적으로 시스템 내부에서 자동 호출)

#### 요청 데이터

```json
{
  "bomId": "bom-uuid",
  "bomItemId": "bomitem-uuid",
  "action": "UPDATE_ITEM",
  "changes": [
    {
      "field": "quantity",
      "oldValue": 2.5,
      "newValue": 3.0
    }
  ],
  "id_create": "user123",
  "description": "구성품 수량 조정"
}
```

#### 응답 데이터

```json
{
  "success": true,
  "data": {
    "id": "new-bomhistory-uuid",
    // ... 생성된 BOM History 정보
  },
  "message": "BOM 이력이 성공적으로 생성되었습니다."
}
```

---

## 📝 데이터 타입 정의

### ProductType (제품 유형)
- `FINISHED_PRODUCT`: 완제품
- `SEMI_FINISHED`: 반제품  
- `RAW_MATERIAL`: 원자재

### ComponentType (구성품 유형)
- `RAW_MATERIAL`: 원자재
- `SEMI_FINISHED`: 반제품
- `PURCHASED_PART`: 구매품
- `SUB_ASSEMBLY`: 조립품
- `CONSUMABLE`: 소모품

### HistoryAction (이력 액션)
- `CREATE`: 생성
- `UPDATE`: 수정
- `DELETE`: 삭제
- `ACTIVATE`: 활성화
- `DEACTIVATE`: 비활성화

### BOMHistoryAction (BOM 이력 액션)
- `CREATE_BOM`: BOM 생성
- `UPDATE_BOM`: BOM 수정
- `DELETE_BOM`: BOM 삭제
- `ADD_ITEM`: 아이템 추가
- `UPDATE_ITEM`: 아이템 수정
- `DELETE_ITEM`: 아이템 삭제
- `COPY_BOM`: BOM 복사

---

## 🔒 인증 및 권한

### Bearer Token 인증

모든 API 요청에는 Authorization 헤더에 Bearer Token이 필요합니다:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 권한 레벨

- **READ**: 조회 권한
- **WRITE**: 생성/수정 권한  
- **DELETE**: 삭제 권한
- **ADMIN**: 전체 권한

---

## 🚫 에러 코드

### 4xx 클라이언트 에러

| 코드 | 메시지 | 설명 |
|------|--------|------|
| 400001 | Invalid request format | 요청 형식이 올바르지 않음 |
| 400002 | Missing required field | 필수 필드 누락 |
| 400003 | Invalid field value | 필드 값이 유효하지 않음 |
| 401001 | Authentication required | 인증이 필요함 |
| 401002 | Invalid token | 토큰이 유효하지 않음 |
| 401003 | Token expired | 토큰이 만료됨 |
| 403001 | Insufficient permissions | 권한이 부족함 |
| 404001 | Resource not found | 리소스를 찾을 수 없음 |
| 422001 | Validation failed | 유효성 검증 실패 |

### 5xx 서버 에러

| 코드 | 메시지 | 설명 |
|------|--------|------|
| 500001 | Internal server error | 내부 서버 에러 |
| 500002 | Database connection error | 데이터베이스 연결 에러 |
| 500003 | External service error | 외부 서비스 에러 |

---

## 🔧 환경 설정

### 개발 환경

```bash
# .env.development
REACT_APP_API_BASE_URL=http://localhost:8080
REACT_APP_USE_MOCK_DATA=false
```

### 테스트 환경

```bash  
# .env.test
REACT_APP_API_BASE_URL=http://localhost:8080
REACT_APP_USE_MOCK_DATA=true
```

### 프로덕션 환경

```bash
# .env.production  
REACT_APP_API_BASE_URL=https://api.mes.company.com
REACT_APP_USE_MOCK_DATA=false
```

---

## 📖 사용 예시

### 제품 목록 조회 예시

```javascript
// Frontend 사용 예시
const response = await apiClient.get('/api/products', {
  params: {
    page: 1,
    pageSize: 20,
    search: '갤럭시',
    sortBy: 'nm_material',
    sortDirection: 'asc'
  }
});

if (response.success) {
  const products = response.data.items;
  const totalCount = response.data.totalCount;
  // UI 업데이트
}
```

### BOM 트리 데이터 조회 예시

```javascript
// 1. BOM 정보 조회
const bomResponse = await apiClient.get(`/api/boms/product/${productId}`);
const bom = bomResponse.data;

// 2. BOM 아이템 목록 조회  
const itemsResponse = await apiClient.get(`/api/bom-items/bom/${bom.id}`);
const bomItems = itemsResponse.data;

// 3. 트리 구조 구성
const treeData = buildBOMTree(bomItems);
```

---

이 API 명세서는 MES 제품정보 관리 시스템의 백엔드 개발과 프론트엔드 연동을 위한 완전한 가이드를 제공합니다. 각 엔드포인트는 Feature-First Clean Architecture의 UseCase와 일대일 대응되어 설계되었습니다.