/**
 * 수주관리 관련 타입 정의
 */

import { BaseEntity } from '../../shared/types/common';

// === 수주 엔티티 ===
export interface Order extends BaseEntity {
  orderNumber: string;         // 수주번호 (예: ORD-20241201-001)
  customerName: string;        // 고객명
  customerContact: string;     // 고객 연락처
  productId: string;           // 제품 ID
  productName: string;         // 제품명
  productCode: string;         // 제품 코드
  quantity: number;            // 수주 수량
  unitPrice: number;           // 단가
  totalAmount: number;         // 총 금액
  orderDate: Date;             // 수주일
  requestedDeliveryDate: Date; // 납기 요청일
  expectedDeliveryDate?: Date; // 납기 예정일
  actualDeliveryDate?: Date;   // 실제 납기일
  status: OrderStatus;         // 수주 상태
  priority: OrderPriority;     // 우선순위
  memo?: string;              // 비고
  attachments?: string[];     // 첨부파일 경로들
}

// === 수주 상태 ===
export enum OrderStatus {
  PENDING = 'PENDING',           // 대기
  CONFIRMED = 'CONFIRMED',       // 확정
  IN_PRODUCTION = 'IN_PRODUCTION', // 생산 중
  READY_TO_SHIP = 'READY_TO_SHIP', // 출하 준비
  SHIPPED = 'SHIPPED',           // 출하 완료
  DELIVERED = 'DELIVERED',       // 납품 완료
  CANCELLED = 'CANCELLED'        // 취소
}

// === 우선순위 ===
export enum OrderPriority {
  LOW = 'LOW',        // 낮음
  NORMAL = 'NORMAL',  // 보통
  HIGH = 'HIGH',      // 높음
  URGENT = 'URGENT'   // 긴급
}

// === 수주 현황 통계 ===
export interface OrderStatusSummary {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  inProductionOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalAmount: number;
  averageOrderValue: number;
}

// === 고객 정보 (간소화) ===
export interface Customer {
  id: string;
  name: string;
  contact: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

// === 제품 정보 (간소화) ===
export interface Product {
  id: string;
  code: string;
  name: string;
  unitPrice: number;
  unit: string;
  isActive: boolean;
}

// === 수주 생성/수정 요청 DTO ===
export interface CreateOrderRequest {
  customerName: string;
  customerContact: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  orderDate: string; // ISO 날짜 문자열
  requestedDeliveryDate: string;
  priority: OrderPriority;
  memo?: string;
}

export interface UpdateOrderRequest extends Partial<CreateOrderRequest> {
  id: string;
  status?: OrderStatus;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
}