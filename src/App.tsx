/**
 * 메인 애플리케이션 컴포넌트
 * 
 * 워크플로우:
 * 1. 전체 애플리케이션의 루트 컴포넌트 역할
 * 2. 라우팅 없이 단일 페이지(ProductManagementPage)로 구성
 * 3. 글로벌 CSS 스타일 적용
 * 
 * 데이터 흐름:
 * App → ProductManagementPage → useProductList Hook → DIContainer
 * 
 * 향후 확장 가능성:
 * - React Router를 통한 다중 페이지 구성
 * - 전역 상태 관리 (Context API, Redux)
 * - 공통 레이아웃 컴포넌트 추가
 */

import React from 'react';
import { ProductManagementPage } from './presentation/pages/ProductManagementPage';
import './App.css';

function App() {
  return (
    <div className="App">
      {/* 현재는 단일 페이지 구성, 향후 라우터 추가 시 확장 예정 */}
      <ProductManagementPage />
    </div>
  );
}

export default App;