/**
 * 메인 애플리케이션 컴포넌트
 * 
 * Feature-based 클린 아키텍처로 리팩토링:
 * 1. AppRouter를 통한 페이지 라우팅
 * 2. 기능별 모듈 분리 구조
 * 3. 전역 스타일 적용
 * 
 * 데이터 흐름:
 * App → AppRouter → Feature Pages → Feature Hooks → DI Container
 */

import React from 'react';
import { AppRouter } from './router/AppRouter';
import '../assets/styles/App.css';

function App() {
  return (
    <div className="App">
      <AppRouter />
    </div>
  );
}

export default App;