/**
 * OrderManagementPage 수주 관리 페이지
 * 
 * Clean Architecture 패턴을 따라 구현된 수주 관리 페이지
 * UseCase와 Domain Entity를 활용한 완전한 CRUD 작업 지원
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useOrderList } from '../../presentation/hooks/useOrderList';
import { useOrderHistory } from '../../presentation/hooks/useOrderHistory';
import { OrderListItem } from '../../application/usecases/order/GetOrderListUseCase';
import { OrderType, OrderStatus, OrderPriority } from '../../domain/entities/Order';
import { OrderFormModal } from '../../presentation/components/modals/OrderFormModal';
import { OrderHistoryModal } from '../../presentation/components/modals/OrderHistoryModal';
import { DIContainer } from '../../config/DIContainer';

// 한글 텍스트 매핑
const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  [OrderType.DOMESTIC]: '내수',
  [OrderType.EXPORT]: '수출',
  [OrderType.SAMPLE]: '샘플',
  [OrderType.REPAIR]: '수리'
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '대기',
  [OrderStatus.CONFIRMED]: '확정',
  [OrderStatus.IN_PRODUCTION]: '생산중',
  [OrderStatus.READY_TO_SHIP]: '출하준비',
  [OrderStatus.SHIPPED]: '출하완료',
  [OrderStatus.DELIVERED]: '납품완료',
  [OrderStatus.CANCELLED]: '취소'
};

const ORDER_PRIORITY_LABELS: Record<OrderPriority, string> = {
  [OrderPriority.LOW]: '낮음',
  [OrderPriority.NORMAL]: '보통',
  [OrderPriority.HIGH]: '높음',
  [OrderPriority.URGENT]: '긴급'
};

// 상태별 색상 매핑
const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  [OrderStatus.PENDING]: { bg: '#fff3cd', text: '#856404' },
  [OrderStatus.CONFIRMED]: { bg: '#d1ecf1', text: '#0c5460' },
  [OrderStatus.IN_PRODUCTION]: { bg: '#cce7ff', text: '#003d82' },
  [OrderStatus.READY_TO_SHIP]: { bg: '#e7f3ff', text: '#004085' },
  [OrderStatus.SHIPPED]: { bg: '#d4edda', text: '#155724' },
  [OrderStatus.DELIVERED]: { bg: '#d4edda', text: '#155724' },
  [OrderStatus.CANCELLED]: { bg: '#f8d7da', text: '#721c24' }
};

// 우선순위별 색상 매핑
const PRIORITY_COLORS: Record<OrderPriority, { bg: string; text: string }> = {
  [OrderPriority.LOW]: { bg: '#e2e3e5', text: '#6c757d' },
  [OrderPriority.NORMAL]: { bg: '#d1ecf1', text: '#0c5460' },
  [OrderPriority.HIGH]: { bg: '#fff3cd', text: '#856404' },
  [OrderPriority.URGENT]: { bg: '#f8d7da', text: '#721c24' }
};

export const OrderManagementPage: React.FC = () => {
  // Order 목록 관리 훅 사용
  const {
    orders,
    totalCount,
    currentPage,
    pageSize,
    loading,
    error,
    searchKeyword,
    selectedOrderType,
    selectedStatus,
    selectedPriority,
    sortBy,
    sortDirection,
    setPage,
    setPageSize,
    setSearchKeyword,
    setOrderTypeFilter,
    setStatusFilter,
    setPriorityFilter,
    setSorting,
    clearFilters,
    clearError,
    refresh,
    updateOrderStatus,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex
  } = useOrderList();

  // 모달 상태
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null);
  const [selectedOrderForHistory, setSelectedOrderForHistory] = useState<OrderListItem | null>(null);

  // 이력 관리 훅
  const {
    histories,
    loading: historyLoading,
    error: historyError,
    loadHistory,
    clearHistory,
    refresh: refreshHistory
  } = useOrderHistory();

  // UseCase 가져오기
  const deleteOrderUseCase = DIContainer.getInstance().getDeleteOrderUseCase();

  // 통계 계산
  const statistics = useMemo(() => {
    const stats = {
      total: totalCount,
      pending: 0,
      confirmed: 0,
      inProduction: 0,
      readyToShip: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      urgent: 0,
      delayed: 0
    };

    orders.forEach(order => {
      switch (order.status) {
        case OrderStatus.PENDING: stats.pending++; break;
        case OrderStatus.CONFIRMED: stats.confirmed++; break;
        case OrderStatus.IN_PRODUCTION: stats.inProduction++; break;
        case OrderStatus.READY_TO_SHIP: stats.readyToShip++; break;
        case OrderStatus.SHIPPED: stats.shipped++; break;
        case OrderStatus.DELIVERED: stats.delivered++; break;
        case OrderStatus.CANCELLED: stats.cancelled++; break;
      }

      if (order.priority === OrderPriority.URGENT) {
        stats.urgent++;
      }

      // 지연 수주 계산 (납기일이 지났고 완료되지 않은 수주)
      const today = new Date();
      if (order.requestedDeliveryDate < today && 
          ![OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(order.status)) {
        stats.delayed++;
      }
    });

    return stats;
  }, [orders, totalCount]);

  // 정렬 핸들러
  const handleSort = (field: string) => {
    const newDirection = sortBy === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSorting(field, newDirection);
  };

  // 상태 변경 핸들러
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (window.confirm(`수주 상태를 '${ORDER_STATUS_LABELS[newStatus]}'로 변경하시겠습니까?`)) {
      const result = await updateOrderStatus(orderId, newStatus);

      if (result.success) {
        // 성공 시 자동으로 목록이 새로고침됨
      } else if (result.error) {
        alert(`상태 변경 실패: ${result.error}`);
      }
    }
  };

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refresh();
  };

  // 수주 수정 핸들러
  const handleEditOrder = useCallback((order: OrderListItem) => {
    setSelectedOrder(order);
    setIsFormModalOpen(true);
  }, []);

  // 수주 삭제 핸들러
  const handleDeleteOrder = useCallback(async (order: OrderListItem) => {
    if (!window.confirm(`수주 '${order.orderNo} - ${order.customerName}'를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteOrderUseCase.execute({
        orderId: order.id,
        id_updated: 'current-user', // TODO: 실제 로그인된 사용자 ID
        reason: '사용자 요청에 의한 삭제'
      });
      
      refresh(); // 목록 새로고침
    } catch (error) {
      alert(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.');
    }
  }, [deleteOrderUseCase, refresh]);

  // 수주 이력 조회 핸들러
  const handleViewHistory = useCallback(async (order: OrderListItem) => {
    setSelectedOrderForHistory(order);
    setIsHistoryModalOpen(true);
    
    // 이력 데이터 로드
    await loadHistory(order.id);
  }, [loadHistory]);

  // 폼 모달 성공 핸들러
  const handleFormSuccess = useCallback(() => {
    refresh(); // 목록 새로고침
    setIsFormModalOpen(false);
    setSelectedOrder(null);
  }, [refresh]);

  // 이력 모달 닫기 핸들러
  const handleHistoryModalClose = useCallback(() => {
    setIsHistoryModalOpen(false);
    setSelectedOrderForHistory(null);
    clearHistory(); // 이력 데이터 초기화
  }, [clearHistory]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '28px' }}>
            수주 관리
          </h1>
          <p style={{ margin: 0, color: '#666' }}>
            Clean Architecture 패턴으로 구현된 수주 관리 시스템
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedOrder(null);
            setIsFormModalOpen(true);
          }}
          style={{
            padding: '12px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          신규 수주 등록
        </button>
      </div>

      {/* 통계 카드들 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
            {statistics.total}
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>전체</div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
            {statistics.delivered}
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>완료</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#17a2b8' }}>
            {statistics.inProduction}
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>생산중</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
            {statistics.urgent}
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>긴급</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fd7e14' }}>
            {statistics.delayed}
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>지연</div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <form onSubmit={handleSearch} style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
            gap: '12px',
            alignItems: 'center'
          }}>
            <input
              type="text"
              placeholder="수주번호, 고객명, 제품명으로 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />

            <select
              value={selectedOrderType}
              onChange={(e) => setOrderTypeFilter(e.target.value as OrderType | '')}
              style={{
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">전체 유형</option>
              {Object.entries(ORDER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
              style={{
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">전체 상태</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setPriorityFilter(e.target.value as OrderPriority | '')}
              style={{
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">전체 우선순위</option>
              {Object.entries(ORDER_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                검색
              </button>
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                초기화
              </button>
            </div>
          </div>
        </form>

        {/* 검색 결과 정보 */}
        <div style={{ fontSize: '14px', color: '#666' }}>
          {totalCount > 0 ? (
            <>
              전체 <strong>{totalCount}건</strong> 중 
              <strong>{startIndex}-{endIndex}번째</strong> 표시
              {searchKeyword && (
                <span> | 검색어: <strong>"{searchKeyword}"</strong></span>
              )}
            </>
          ) : (
            '검색 결과가 없습니다.'
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '16px',
          border: '1px solid #f5c6cb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button
            onClick={clearError}
            style={{
              background: 'none',
              border: 'none',
              color: '#721c24',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 수주 테이블 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th
                  onClick={() => handleSort('orderNo')}
                  style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    borderBottom: '2px solid #dee2e6',
                    cursor: 'pointer',
                    userSelect: 'none',
                    position: 'relative'
                  }}
                >
                  수주번호
                  {sortBy === 'orderNo' && (
                    <span style={{ marginLeft: '4px' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #dee2e6' }}>
                  주문유형
                </th>
                <th
                  onClick={() => handleSort('customerName')}
                  style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    borderBottom: '2px solid #dee2e6',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  고객정보
                  {sortBy === 'customerName' && (
                    <span style={{ marginLeft: '4px' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #dee2e6' }}>
                  제품정보
                </th>
                <th
                  onClick={() => handleSort('totalAmount')}
                  style={{
                    padding: '12px 8px',
                    textAlign: 'right',
                    fontWeight: 'bold',
                    borderBottom: '2px solid #dee2e6',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  총 금액
                  {sortBy === 'totalAmount' && (
                    <span style={{ marginLeft: '4px' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid #dee2e6' }}>
                  상태
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid #dee2e6' }}>
                  우선순위
                </th>
                <th
                  onClick={() => handleSort('orderDate')}
                  style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    borderBottom: '2px solid #dee2e6',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  주문일
                  {sortBy === 'orderDate' && (
                    <span style={{ marginLeft: '4px' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  onClick={() => handleSort('requestedDeliveryDate')}
                  style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    borderBottom: '2px solid #dee2e6',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  납기일
                  {sortBy === 'requestedDeliveryDate' && (
                    <span style={{ marginLeft: '4px' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid #dee2e6' }}>
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    로딩 중...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    수주 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const statusColor = STATUS_COLORS[order.status as OrderStatus];
                  const priorityColor = PRIORITY_COLORS[order.priority as OrderPriority];
                  const isDelayed = order.isDelayed;

                  return (
                    <tr
                      key={order.id}
                      style={{
                        borderBottom: '1px solid #dee2e6',
                        backgroundColor: isDelayed ? '#fff5f5' : undefined
                      }}
                    >
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                          {order.orderNo}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                          {order.salesPerson}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: '#e9ecef',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {order.orderTypeDisplay}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                          {order.customerName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                          {order.customerContact}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                          {order.productName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {order.productCode} | {order.quantity.toLocaleString()}개
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          ₩{order.totalAmount.toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: statusColor ? statusColor.bg : '#e9ecef',
                          color: statusColor ? statusColor.text : '#333',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          display: 'inline-block',
                          minWidth: '60px'
                        }}>
                          {order.statusDisplay}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: priorityColor ? priorityColor.bg : '#e9ecef',
                          color: priorityColor ? priorityColor.text : '#333',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          display: 'inline-block',
                          minWidth: '50px'
                        }}>
                          {order.priorityDisplay}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px' }}>
                        {order.orderDate.toLocaleDateString('ko-KR')}
                      </td>
                      <td style={{ 
                        padding: '12px 8px', 
                        textAlign: 'center', 
                        fontSize: '12px',
                        color: isDelayed ? '#dc3545' : 'inherit',
                        fontWeight: isDelayed ? 'bold' : 'normal'
                      }}>
                        {order.requestedDeliveryDate.toLocaleDateString('ko-KR')}
                        {isDelayed && <div style={{ fontSize: '10px', color: '#dc3545' }}>지연</div>}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEditOrder(order)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            삭제
                          </button>
                          <button
                            onClick={() => handleViewHistory(order)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            이력
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalCount > 0 && (
          <div style={{
            padding: '16px',
            borderTop: '1px solid #dee2e6',
            backgroundColor: '#f8f9fa',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '14px', color: '#666' }}>
              페이지 {currentPage} / {totalPages}
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value={10}>10개</option>
                <option value={20}>20개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
              </select>
              
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={!hasPreviousPage || loading}
                style={{
                  padding: '8px 12px',
                  backgroundColor: hasPreviousPage && !loading ? '#007bff' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: hasPreviousPage && !loading ? 'pointer' : 'not-allowed'
                }}
              >
                이전
              </button>
              
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={!hasNextPage || loading}
                style={{
                  padding: '8px 12px',
                  backgroundColor: hasNextPage && !loading ? '#007bff' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: hasNextPage && !loading ? 'pointer' : 'not-allowed'
                }}
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 설명 */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        backgroundColor: '#e7f3ff',
        borderRadius: '8px',
        border: '1px solid #b3d9ff'
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#004085' }}>
          Clean Architecture 수주 관리 시스템
        </h3>
        <div style={{ fontSize: '14px', color: '#004085', lineHeight: '1.6' }}>
          <p style={{ margin: '0 0 12px 0' }}>
            이 페이지는 <strong>Clean Architecture 패턴</strong>을 완전히 구현한 수주 관리 시스템입니다:
          </p>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            <li><strong>Domain Layer:</strong> Order, OrderHistory 엔티티와 OrderNoGenerator 도메인 서비스</li>
            <li><strong>Application Layer:</strong> GetOrderListUseCase, CreateOrderUseCase, UpdateOrderStatusUseCase</li>
            <li><strong>Infrastructure Layer:</strong> MockOrderRepository, MockOrderHistoryRepository</li>
            <li><strong>Presentation Layer:</strong> useOrderList 훅과 OrderManagementPage 컴포넌트</li>
          </ul>
          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '4px' }}>
            <strong>주요 기능:</strong> 실시간 검색/필터링, 상태 변경 워크플로우, 페이징, 정렬, 
            지연 수주 알림, 통계 대시보드, 완전한 CRUD 작업
          </div>
        </div>
      </div>

      {/* 수주 등록/수정 모달 */}
      <OrderFormModal
        isOpen={isFormModalOpen}
        order={selectedOrder || undefined}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedOrder(null);
        }}
        onSuccess={handleFormSuccess}
      />

      {/* 수주 이력 조회 모달 */}
      <OrderHistoryModal
        isOpen={isHistoryModalOpen}
        orderNo={selectedOrderForHistory?.orderNo || ''}
        orderName={`${selectedOrderForHistory?.customerName || ''} - ${selectedOrderForHistory?.productName || ''}`}
        histories={histories}
        loading={historyLoading}
        error={historyError}
        onClose={handleHistoryModalClose}
        onRefresh={() => selectedOrderForHistory && refreshHistory(selectedOrderForHistory.id)}
      />
    </div>
  );
};

export default OrderManagementPage;