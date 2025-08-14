/**
 * 테이블 템플릿 타입 정의
 */

import { TableColumn, FormField, FilterCondition, PaginationResponse, SearchRequest } from '../../../shared/types/common';

// === API 인터페이스 ===
export interface TableApi<T> {
  list: (params: SearchRequest) => Promise<PaginationResponse<T>>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<void>;
  getById?: (id: string) => Promise<T>;
}

// === 검색 필드 정의 ===
export interface SearchField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange';
  placeholder?: string;
  options?: { label: string; value: string | number }[];
  operator?: FilterCondition['operator'];
}

// === 액션 설정 ===
export interface TableAction<T> {
  key: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  permission?: string;
  handler: (item: T) => void | Promise<void>;
  visible?: (item: T) => boolean;
  disabled?: (item: T) => boolean;
}

export interface TableActions {
  create?: {
    label?: string;
    permission?: string;
  };
  edit?: {
    label?: string;
    permission?: string;
  };
  delete?: {
    label?: string;
    permission?: string;
  };
  view?: {
    label?: string;
    permission?: string;
  };
  custom?: TableAction<any>[];
}

// === 테이블 설정 ===
export interface TableConfig<T> {
  // API 설정
  api: TableApi<T>;
  
  // 테이블 컬럼 정의
  columns: TableColumn<T>[];
  
  // 검색 필드 정의
  searchFields: SearchField[];
  
  // 폼 필드 정의 (등록/수정용)
  formFields: FormField[];
  
  // 액션 설정
  actions: TableActions;
  
  // 기본 정렬
  defaultSort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  
  // 상세 페이지 경로 (선택사항)
  detailPath?: string;
  
  // 아이템 이름 추출 함수 (삭제 확인 메시지용)
  getItemName: (item: T) => string;
  
  // 권한 검사
  permissions?: {
    view?: string;
    create?: string;
    edit?: string;
    delete?: string;
  };
}

// === 예제용 타입 (실제 사용시 제거하고 실제 엔티티 타입 사용) ===
export interface SampleEntity {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}