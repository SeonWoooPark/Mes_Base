/**
 * GetOrderListUseCase 수주 목록 조회 유스케이스
 * 
 * 페이징, 정렬, 필터링, 검색이 적용된 수주 목록을 조회합니다.
 */

import { OrderRepository, OrderSearchCriteria, OrderFilter } from '../../../domain/repositories/OrderRepository';

export interface GetOrderListRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  searchKeyword?: string; // 모든 컬럼 통합 검색
  filters?: OrderFilter[];
}

export interface GetOrderListResponse {
  orders: OrderListItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface OrderListItem {
  id: string;
  orderNo: string;
  orderType: string;
  orderTypeDisplay: string;
  customerName: string;
  customerContact: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  orderDate: Date;
  requestedDeliveryDate: Date;
  status: string;
  statusDisplay: string;
  priority: string;
  priorityDisplay: string;
  salesPerson: string;
  itemCount: number;
  isDelayed: boolean;
  daysUntilDelivery: number;
  lastUpdated: Date;
  notes: string;
}

export class GetOrderListUseCase {
  constructor(
    private orderRepository: OrderRepository
  ) {}

  async execute(request: GetOrderListRequest): Promise<GetOrderListResponse> {
    // 1. 입력 검증
    this.validateRequest(request);

    // 2. 검색 조건 구성
    const searchCriteria = this.buildSearchCriteria(request);

    // 3. 수주 목록 조회 (페이징 포함)
    const orders = await this.orderRepository.findByPageWithCriteria(
      searchCriteria,
      request.page,
      request.pageSize
    );

    // 4. 전체 개수 조회
    const totalCount = await this.orderRepository.countByCriteria(
      searchCriteria
    );

    // 5. 프레젠테이션 데이터 변환
    const orderListItems = orders.map((order) => {
      const daysUntilDelivery = this.calculateDaysUntilDelivery(
        order.getRequestedDeliveryDate()
      );

      // 첫 번째 품목 정보 (SimpleOrderPage 호환)
      const firstItem = order.getItems()[0];

      return {
        id: order.getId().getValue(),
        orderNo: order.getOrderNo(),
        orderType: order.getOrderType(),
        orderTypeDisplay: this.getOrderTypeDisplayName(order.getOrderType()),
        customerName: order.getCustomer().name,
        customerContact: order.getCustomer().phoneNumber,
        productName: firstItem ? firstItem.getProductName() : '',
        productCode: firstItem ? firstItem.getProductCode() : '',
        quantity: firstItem ? firstItem.getQuantity() : 0,
        unitPrice: firstItem ? firstItem.getUnitPrice() : 0,
        totalAmount: order.getTotalAmount(),
        currency: order.getCurrency().symbol,
        orderDate: order.getOrderDate(),
        requestedDeliveryDate: order.getRequestedDeliveryDate(),
        status: order.getStatus(),
        statusDisplay: this.getStatusDisplayName(order.getStatus()),
        priority: order.getPriority(),
        priorityDisplay: this.getPriorityDisplayName(order.getPriority()),
        salesPerson: order.getSalesPerson(),
        itemCount: order.getItems().length,
        isDelayed: order.isDelayed(),
        daysUntilDelivery,
        lastUpdated: order.getDtUpdate(),
        notes: order.getNotes()
      };
    });

    // 6. 페이징 정보 계산
    const totalPages = Math.ceil(totalCount / request.pageSize);
    const hasNextPage = request.page < totalPages;

    return {
      orders: orderListItems,
      totalCount,
      currentPage: request.page,
      totalPages,
      hasNextPage,
    };
  }

  private validateRequest(request: GetOrderListRequest): void {
    if (request.page < 1) {
      throw new Error("페이지 번호는 1 이상이어야 합니다.");
    }
    if (request.pageSize < 1 || request.pageSize > 1000) {
      throw new Error("페이지 크기는 1-1000 범위여야 합니다.");
    }
  }

  private buildSearchCriteria(
    request: GetOrderListRequest
  ): OrderSearchCriteria {
    return {
      searchKeyword: request.searchKeyword,
      filters: request.filters || [],
      sortBy: request.sortBy || "orderDate",
      sortDirection: request.sortDirection || "desc",
    };
  }

  private calculateDaysUntilDelivery(deliveryDate: Date): number {
    const today = new Date();
    const diffTime = deliveryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getStatusDisplayName(status: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': '대기',
      'CONFIRMED': '확정',
      'IN_PRODUCTION': '생산중',
      'READY_TO_SHIP': '출하준비',
      'SHIPPED': '출하완료',
      'DELIVERED': '납품완료',
      'CANCELLED': '취소'
    };
    return statusMap[status] || status;
  }

  private getPriorityDisplayName(priority: string): string {
    const priorityMap: Record<string, string> = {
      'LOW': '낮음',
      'NORMAL': '보통',
      'HIGH': '높음',
      'URGENT': '긴급'
    };
    return priorityMap[priority] || priority;
  }

  private getOrderTypeDisplayName(orderType: string): string {
    const typeMap: Record<string, string> = {
      'DOMESTIC': '내수',
      'EXPORT': '수출',
      'SAMPLE': '샘플',
      'REPAIR': '수리'
    };
    return typeMap[orderType] || orderType;
  }
}