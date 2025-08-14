/**
 * 공통 타입 정의
 * 
 * 새로운 단순화 구조에서 사용할 공통 타입들을 정의합니다.
 * 기존 클린 아키텍처의 복잡한 Value Object들을 단순화하여 사용합니다.
 */

// === 기본 엔티티 인터페이스 ===
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isActive: boolean;
}

// === 페이지네이션 관련 ===
export interface PaginationRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PaginationResponse<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// === API 응답 형식 ===
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// === 검색 및 필터링 ===
export interface SearchRequest extends PaginationRequest {
  keyword?: string;
  filters?: FilterCondition[];
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'between';
  value: any;
  label?: string; // UI 표시용
}

// === 폼 관련 ===
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'textarea' | 'date' | 'datetime' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  validation?: FieldValidation;
  disabled?: boolean;
  hidden?: boolean;
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FieldValidation {
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  custom?: (value: any) => string | null;
}

// === 테이블 컬럼 정의 ===
export interface TableColumn<T = any> {
  key: string;
  label: string;
  width?: string | number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  fixed?: boolean;
}

// === 액션 버튼 ===
export interface ActionButton<T = any> {
  key: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  onClick: (record: T) => void;
  disabled?: (record: T) => boolean;
  hidden?: (record: T) => boolean;
  permission?: string;
}

// === 모달 Props ===
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closable?: boolean;
  maskClosable?: boolean;
}

// === 로딩 상태 ===
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

// === Hook 반환 타입 ===
export interface UseTableState<T> extends LoadingState {
  data: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  selectedItems: T[];
}

export interface UseTableActions<T> {
  loadData: (params?: SearchRequest) => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (keyword: string) => void;
  setFilters: (filters: FilterCondition[]) => void;
  setSorting: (sortBy: string, direction: 'asc' | 'desc') => void;
  selectItem: (item: T) => void;
  selectAll: () => void;
  clearSelection: () => void;
  refresh: () => Promise<void>;
}

// === 권한 관련 ===
export type Permission = 
  | 'products.view' | 'products.create' | 'products.edit' | 'products.delete'
  | 'orders.view' | 'orders.create' | 'orders.edit' | 'orders.delete'
  | 'bom.view' | 'bom.edit'
  | 'reports.view'
  | 'admin.all';

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: Permission[];
}