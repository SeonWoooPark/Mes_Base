/**
 * 애플리케이션 진입점 (Entry Point)
 * 
 * 워크플로우:
 * 1. React 18의 createRoot API를 사용하여 루트 DOM 노드 생성
 * 2. StrictMode로 래핑하여 개발 중 잠재적 문제 검출
 * 3. App 컴포넌트를 렌더링하여 애플리케이션 시작
 * 
 * 데이터 흐름: index.html → index.tsx → App.tsx → ProductManagementPage
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// React 18 createRoot API로 루트 DOM 생성
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// StrictMode로 래핑하여 개발 시 잠재적 문제점 검출
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);