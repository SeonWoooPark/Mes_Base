/**
 * 애플리케이션 라우터 설정
 * 
 * 기능별 페이지 라우팅을 관리하며 향후 확장 가능한 구조로 설계
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LazyProductManagementPage } from '../../shared/utils/lazyLoading';

export const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* 제품 관리 페이지 */}
        <Route path="/products" element={<LazyProductManagementPage />} />
        
        {/* 기본 경로는 제품 관리로 리다이렉트 */}
        <Route path="/" element={<Navigate to="/products" replace />} />
        
        {/* 향후 추가될 라우트들 */}
        {/* <Route path="/bom" element={<BOMManagementPage />} /> */}
        {/* <Route path="/inventory" element={<InventoryManagementPage />} /> */}
        
        {/* 404 페이지 */}
        <Route path="*" element={<Navigate to="/products" replace />} />
      </Routes>
    </Router>
  );
};