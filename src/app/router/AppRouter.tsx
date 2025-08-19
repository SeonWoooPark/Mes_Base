/**
 * 애플리케이션 라우터 설정
 * 
 * 기능별 페이지 라우팅을 관리하며 향후 확장 가능한 구조로 설계
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LazyProductManagementPage, LazyBOMManagementPage } from '../../shared/utils/lazyLoading';
import { AppLayout } from '../../shared/components/layout/AppLayout';

/**
 * 레이아웃이 적용된 라우트 컴포넌트
 */
const LayoutedRoutes: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <AppLayout currentPath={location.pathname} onNavigate={navigate}>
      <Routes>
        {/* 제품 관리 페이지 */}
        <Route path="/products" element={<LazyProductManagementPage />} />
        
        {/* BOM 관리 페이지 */}
        <Route path="/bom" element={<LazyBOMManagementPage />} />
        
        {/* 기본 경로는 제품 관리로 리다이렉트 */}
        <Route path="/" element={<Navigate to="/products" replace />} />
        
        {/* 향후 추가될 라우트들 */}
        {/* <Route path="/inventory" element={<InventoryManagementPage />} /> */}
        
        {/* 404 페이지 */}
        <Route path="*" element={<Navigate to="/products" replace />} />
      </Routes>
    </AppLayout>
  );
};

export const AppRouter: React.FC = () => {
  return (
    <Router>
      <LayoutedRoutes />
    </Router>
  );
};