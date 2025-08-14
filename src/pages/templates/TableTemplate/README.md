# 📋 TableTemplate 사용 가이드

## 🎯 개요

TableTemplate은 MES 시스템에서 표준 테이블 화면을 빠르게 구현할 수 있는 재사용 가능한 템플릿입니다. 복잡한 클린 아키텍처 구조를 단순화하여 초심자도 쉽게 사용할 수 있도록 설계되었습니다.

## 🚀 빠른 시작

### 1. 폴더 복사
```bash
# templates 폴더를 새 이름으로 복사
cp -r src/pages/templates/TableTemplate src/pages/orders
```

### 2. 데이터 타입 정의 (`types.ts`)
```typescript
// src/pages/orders/types.ts
export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  quantity: number;
  orderDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. API 연결 (`api.ts`)
```typescript
// src/pages/orders/api.ts
import { TableApi } from './types';
import { Order } from './types';

export const orderApi: TableApi<Order> = {
  list: async (params) => {
    // 실제 API 호출 또는 Mock 데이터 반환
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return response.json();
  },
  
  create: async (data) => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  update: async (id, data) => {
    const response = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  delete: async (id) => {
    await fetch(`/api/orders/${id}`, { method: 'DELETE' });
  }
};
```

### 4. 설정 정의 (`config.ts`)
```typescript
// src/pages/orders/config.ts
import { TableConfig } from './types';
import { orderApi } from './api';

export const orderTableConfig: TableConfig<Order> = {
  // API 설정
  api: orderApi,
  
  // 테이블 컬럼 정의
  columns: [
    {
      key: 'orderNumber',
      label: '수주번호',
      sortable: true,
      width: '150px'
    },
    {
      key: 'customerName',
      label: '고객명',
      sortable: true,
      width: '150px'
    },
    {
      key: 'productName',
      label: '제품명',
      sortable: true
    },
    {
      key: 'quantity',
      label: '수량',
      align: 'right',
      render: (value) => value.toLocaleString()
    },
    {
      key: 'status',
      label: '상태',
      render: (value) => {
        const statusMap = {
          pending: '대기',
          processing: '진행중',
          completed: '완료',
          cancelled: '취소'
        };
        return statusMap[value] || value;
      }
    },
    {
      key: 'orderDate',
      label: '주문일',
      render: (value) => new Date(value).toLocaleDateString()
    }
  ],
  
  // 검색 필드 정의
  searchFields: [
    {
      key: 'customerName',
      label: '고객명',
      type: 'text',
      placeholder: '고객명 검색'
    },
    {
      key: 'status',
      label: '상태',
      type: 'select',
      options: [
        { label: '대기', value: 'pending' },
        { label: '진행중', value: 'processing' },
        { label: '완료', value: 'completed' },
        { label: '취소', value: 'cancelled' }
      ]
    },
    {
      key: 'orderDate',
      label: '주문일',
      type: 'dateRange'
    }
  ],
  
  // 폼 필드 정의
  formFields: [
    {
      name: 'orderNumber',
      label: '수주번호',
      type: 'text',
      required: true,
      placeholder: 'ORD-YYYYMMDD-001'
    },
    {
      name: 'customerName',
      label: '고객명',
      type: 'text',
      required: true
    },
    {
      name: 'productName',
      label: '제품명',
      type: 'select',
      required: true,
      options: [
        { label: '제품A', value: 'product-a' },
        { label: '제품B', value: 'product-b' }
      ]
    },
    {
      name: 'quantity',
      label: '수량',
      type: 'number',
      required: true,
      validation: {
        min: 1,
        max: 10000
      }
    },
    {
      name: 'orderDate',
      label: '주문일',
      type: 'date',
      required: true
    }
  ],
  
  // 액션 설정
  actions: {
    create: { label: '수주 등록' },
    edit: { label: '수정' },
    delete: { label: '삭제' },
    view: { label: '상세보기' }
  },
  
  // 기본 정렬
  defaultSort: {
    field: 'orderDate',
    direction: 'desc'
  },
  
  // 아이템 이름 추출 (삭제 확인용)
  getItemName: (item) => item.orderNumber
};
```

### 5. 페이지 컴포넌트 생성 (`index.tsx`)
```typescript
// src/pages/orders/index.tsx
import React from 'react';
import { TableTemplate } from '../templates/TableTemplate';
import { orderTableConfig } from './config';

export const OrderManagementPage: React.FC = () => {
  return (
    <TableTemplate
      config={orderTableConfig}
      title="수주 관리"
      createPermission="orders.create"
    />
  );
};
```

## 🛠️ 고급 사용법

### 커스텀 액션 추가
```typescript
actions: {
  // 기본 액션들...
  custom: [
    {
      key: 'approve',
      label: '승인',
      icon: '✅',
      variant: 'success',
      handler: async (item) => {
        await approveOrder(item.id);
        // 페이지 새로고침은 자동으로 처리됨
      },
      visible: (item) => item.status === 'pending'
    }
  ]
}
```

### 커스텀 렌더링
```typescript
columns: [
  {
    key: 'status',
    label: '상태',
    render: (value, record) => (
      <span style={{
        padding: '4px 8px',
        borderRadius: '4px',
        background: value === 'completed' ? '#d4edda' : '#fff3cd',
        color: value === 'completed' ? '#155724' : '#856404'
      }}>
        {getStatusText(value)}
      </span>
    )
  }
]
```

### 폼 유효성 검증
```typescript
formFields: [
  {
    name: 'email',
    label: '이메일',
    type: 'email',
    required: true,
    validation: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      custom: (value) => {
        if (value && !value.includes('@company.com')) {
          return '회사 이메일만 사용 가능합니다.';
        }
        return null;
      }
    }
  }
]
```

## 📁 파일 구조
```
src/pages/orders/
├── index.tsx          # 메인 페이지 컴포넌트
├── types.ts           # 타입 정의
├── api.ts             # API 연결
├── config.ts          # 테이블 설정
└── mockData.ts        # Mock 데이터 (개발용)
```

## 🎯 장점

### ✅ 초심자 친화적
- 복잡한 클린 아키텍처 이해 불필요
- 복붙 후 설정만 변경하면 완성
- 직관적인 파일 구조

### ✅ 일관성 보장
- 모든 테이블 화면이 동일한 패턴
- 표준 UI/UX 제공
- 통일된 개발 방식

### ✅ 빠른 개발
- 기존 2-3일 → 2-3시간으로 단축
- 필요한 파일 15개 → 4-5개로 감소
- 반복 작업 최소화

### ✅ 유지보수 용이
- 템플릿 수정 시 일괄 개선 가능
- 디버깅 포인트 명확
- 코드 표준화

## 🔧 커스터마이징 가이드

### 테마 변경
```typescript
// 전역 스타일 오버라이드
const customTheme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d'
  }
};
```

### 권한 시스템 연동
```typescript
// 권한 기반 액션 제어
actions: {
  edit: { 
    label: '수정',
    permission: 'orders.edit' 
  }
}
```

## 📋 체크리스트

새 화면 구현 시 확인사항:

- [ ] 타입 정의 완료 (`types.ts`)
- [ ] API 연결 완료 (`api.ts`)
- [ ] 테이블 설정 완료 (`config.ts`)
- [ ] 페이지 컴포넌트 생성 (`index.tsx`)
- [ ] 라우터 등록
- [ ] 네비게이션 메뉴 추가
- [ ] 권한 설정
- [ ] 테스트 데이터 준비

이 템플릿을 사용하면 누구나 쉽게 표준적인 테이블 화면을 구현할 수 있습니다! 🎉