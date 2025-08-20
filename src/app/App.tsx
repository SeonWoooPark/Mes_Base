/**
 * 메인 애플리케이션 컴포넌트
 * 
 * Feature-First Clean Architecture with Modern DI System:
 * 1. 애플리케이션 시작 시 DI 시스템 초기화
 * 2. Feature별 의존성 주입 모듈 로드
 * 3. AppRouter를 통한 페이지 라우팅
 * 4. 전역 스타일 적용
 * 
 * 데이터 흐름:
 * App → DI Initialization → AppRouter → Feature Pages → Feature Hooks → Modern DI System
 */

import React, { useEffect, useState } from 'react';
import { AppRouter } from './router/AppRouter';
import { AppInitializer, initializeDevEnvironment } from './config/AppInitializer';
import { QueryProvider } from './providers/QueryProvider';
import '../assets/styles/App.css';

/**
 * 초기화 상태 타입
 */
interface AppState {
  isInitializing: boolean;
  isInitialized: boolean;
  initializationError: string | null;
}

function App() {
  const [appState, setAppState] = useState<AppState>({
    isInitializing: true,
    isInitialized: false,
    initializationError: null,
  });

  // DI 시스템 초기화
  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing MES Application...');
        
        // 개발/프로덕션 환경에 따른 초기화
        const initResult = process.env.NODE_ENV === 'development'
          ? await initializeDevEnvironment()
          : await AppInitializer.initialize({
              useMockData: process.env.REACT_APP_USE_MOCK_DATA !== 'false',
              enableDebugMode: false,
              features: ['product', 'bom'],
            });

        if (isMounted) {
          if (initResult.success) {
            setAppState({
              isInitializing: false,
              isInitialized: true,
              initializationError: null,
            });
            console.log('✅ MES Application initialized successfully');
          } else {
            setAppState({
              isInitializing: false,
              isInitialized: false,
              initializationError: initResult.errors.join('; '),
            });
            console.error('❌ MES Application initialization failed:', initResult.errors);
          }
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
          setAppState({
            isInitializing: false,
            isInitialized: false,
            initializationError: errorMessage,
          });
          console.error('💥 Critical MES Application error:', error);
        }
      }
    };

    initializeApp();

    // 정리 함수
    return () => {
      isMounted = false;
      // 컴포넌트 언마운트시 DI 시스템 정리
      AppInitializer.cleanup();
    };
  }, []);

  // 초기화 중 로딩 화면
  if (appState.isInitializing) {
    return (
      <div className="App">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#f5f5f5',
        }}>
          <div style={{
            fontSize: '24px',
            marginBottom: '16px',
            color: '#333',
          }}>
            🏭 MES 시스템 초기화 중...
          </div>
          <div style={{
            width: '200px',
            height: '4px',
            backgroundColor: '#e0e0e0',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#2196f3',
              animation: 'loading 1.5s infinite linear',
            }} />
          </div>
          <style>
            {`
              @keyframes loading {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  // 초기화 실패 에러 화면
  if (!appState.isInitialized && appState.initializationError) {
    return (
      <div className="App">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#f5f5f5',
          padding: '20px',
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
          }}>
            ⚠️
          </div>
          <div style={{
            fontSize: '24px',
            marginBottom: '16px',
            color: '#d32f2f',
            textAlign: 'center',
          }}>
            MES 시스템 초기화 실패
          </div>
          <div style={{
            fontSize: '14px',
            color: '#666',
            textAlign: 'center',
            maxWidth: '500px',
            marginBottom: '20px',
          }}>
            {appState.initializationError}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 정상 초기화 완료 - 메인 애플리케이션 렌더링
  return (
    <div className="App">
      <QueryProvider>
        <AppRouter />
      </QueryProvider>
    </div>
  );
}

export default App;