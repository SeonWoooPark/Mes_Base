/**
 * 수주관리 페이지 (간단 버전)
 * 
 * 템플릿 오류를 피하고 빠른 시연을 위한 간단한 구현
 */

import React, { useState } from 'react';
import { mockOrders } from './mockData';
import { Order } from './types';

export const SimpleOrderPage: React.FC = () => {
  const [orders] = useState<Order[]>(mockOrders);
  
  const getStatusText = (status: string): string => {
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
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      'PENDING': '#fff3cd',
      'CONFIRMED': '#d1ecf1',
      'IN_PRODUCTION': '#cce7ff',
      'READY_TO_SHIP': '#e7f3ff',
      'SHIPPED': '#d4edda',
      'DELIVERED': '#d4edda',
      'CANCELLED': '#f8d7da'
    };
    return colorMap[status] || '#f8f9fa';
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    backgroundColor: 'white',
    border: '1px solid #e9ecef'
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
    fontWeight: 'bold',
    color: '#495057',
    padding: '12px 8px',
    textAlign: 'left',
    borderRight: '1px solid #dee2e6'
  };

  const cellStyle: React.CSSProperties = {
    padding: '8px',
    borderRight: '1px solid #dee2e6',
    borderBottom: '1px solid #dee2e6'
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
      }}>
        {/* 헤더 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h1 style={{ margin: 0, color: '#333' }}>📋 수주 관리</h1>
          <button style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            신규 등록
          </button>
        </div>

        {/* 통계 */}
        <div style={{ marginBottom: '20px', color: '#666' }}>
          총 <strong>{orders.length}건</strong>의 수주가 있습니다.
        </div>

        {/* 테이블 */}
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={headerStyle}>수주번호</th>
                <th style={headerStyle}>고객명</th>
                <th style={headerStyle}>제품명</th>
                <th style={headerStyle}>수량</th>
                <th style={headerStyle}>총액</th>
                <th style={headerStyle}>상태</th>
                <th style={headerStyle}>주문일</th>
                <th style={headerStyle}>납기일</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 'bold' }}>{order.orderNumber}</div>
                  </td>
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 'bold' }}>{order.customerName}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {order.customerContact}
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 'bold' }}>{order.productName}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {order.productCode}
                    </div>
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    {order.quantity.toLocaleString()}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    <strong>₩{order.totalAmount.toLocaleString()}</strong>
                  </td>
                  <td style={cellStyle}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: getStatusColor(order.status),
                      color: '#333',
                      display: 'inline-block',
                      minWidth: '60px',
                      textAlign: 'center'
                    }}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    {order.orderDate.toLocaleDateString()}
                  </td>
                  <td style={cellStyle}>
                    {order.requestedDeliveryDate.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 설명 */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#e7f3ff',
          borderRadius: '8px',
          border: '1px solid #b3d9ff'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#004085' }}>🎉 새로운 구조 데모</h3>
          <p style={{ margin: '0', color: '#004085', fontSize: '14px' }}>
            이것은 <strong>새로운 하이브리드 구조</strong>로 구현된 수주관리 페이지입니다. 
            기존 복잡한 클린 아키텍처 대신 <strong>단순하고 직관적인 구조</strong>를 사용했습니다.
          </p>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '14px', color: '#004085' }}>
            <li>Mock 데이터 7건 표시</li>
            <li>상태별 색상 구분</li>
            <li>반응형 테이블 디자인</li>
            <li>복붙 친화적 구조</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SimpleOrderPage;