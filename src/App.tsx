/**
 * 메인 애플리케이션 컴포넌트
 * 
 * 새로운 하이브리드 구조:
 * 1. 기존 클린 아키텍처와 새로운 단순화 구조 공존
 * 2. 네비게이션 기반 다중 페이지 구성
 * 3. 간단한 라우팅 시스템 적용
 * 
 * 데이터 흐름:
 * App → Navigation + 선택된 페이지 → Hook → API
 */

import React, { useState } from 'react';
import { ProductManagementPage } from './presentation/pages/ProductManagementPage';
import { Navigation, MainLayout, MainContent } from './presentation/components/navigation/Navigation';
import OrderManagementPage from './pages/orders/OrderManagementPage';
import SimpleOrderPage from './pages/orders/SimpleOrderPage';
import './App.css';

function App() {
  // 간단한 라우팅 상태 관리
  const [currentPath, setCurrentPath] = useState('/products');

  // 권한 설정 (임시 - 실제로는 로그인 시스템에서 가져옴)
  const userPermissions = [
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'orders.view', 'orders.create', 'orders.edit', 'orders.delete',
    'bom.view', 'bom.edit'
  ];

  // 페이지 렌더링 함수
  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/products':
        return <ProductManagementPage />;
      case '/orders':
        return <OrderManagementPage />;
      case '/orders/simple':
        return <SimpleOrderPage />;
      case '/dashboard':
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h1>📊 대시보드</h1>
            <p>대시보드 페이지는 구현 예정입니다.</p>
          </div>
        );
      default:
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h1>🚧 페이지 준비 중</h1>
            <p>선택하신 페이지는 아직 구현되지 않았습니다.</p>
            <p>현재 경로: {currentPath}</p>
          </div>
        );
    }
  };

  return (
    <div className="App">
      <MainLayout>
        {/* 사이드 네비게이션 */}
        <Navigation
          currentPath={currentPath}
          onNavigate={setCurrentPath}
          userPermissions={userPermissions}
        />
        
        {/* 메인 콘텐츠 영역 */}
        <MainContent>
          {renderCurrentPage()}
        </MainContent>
      </MainLayout>
    </div>
  );
}

export default App;