import React, { useState, useEffect } from 'react';
import { Navigation, MainLayout, MainContent } from '../navigation/Navigation';
import { useAuth } from '../../hooks/useAuth';
import { useDataSync } from '../../hooks/useDataSync';
import styled from 'styled-components';

/**
 * 앱 레이아웃 Props
 */
interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

/**
 * 상태 표시줄 스타일
 */
const StatusBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 250px;
  right: 0;
  height: 32px;
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: 12px;
  color: #6c757d;
  z-index: 100;
`;

const StatusItem = styled.div<{ status?: 'online' | 'offline' | 'syncing' | 'error' }>`
  display: flex;
  align-items: center;
  margin-right: 16px;
  
  .status-icon {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 4px;
    background: ${props => {
      switch (props.status) {
        case 'online': return '#28a745';
        case 'offline': return '#dc3545';
        case 'syncing': return '#ffc107';
        case 'error': return '#dc3545';
        default: return '#6c757d';
      }
    }};
    
    ${props => props.status === 'syncing' && `
      animation: pulse 1.5s infinite;
      
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    `}
  }
  
  .status-text {
    font-weight: 500;
  }
`;

const SyncIndicator = styled.div<{ visible: boolean }>`
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  display: ${props => props.visible ? 'flex' : 'none'};
  align-items: center;
  gap: 8px;
  font-size: 14px;
  
  .sync-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #e9ecef;
    border-top: 2px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  }
`;

const ConflictNotification = styled.div<{ visible: boolean }>`
  position: fixed;
  top: 20px;
  right: 20px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1002;
  display: ${props => props.visible ? 'block' : 'none'};
  max-width: 300px;
  
  .conflict-title {
    font-weight: bold;
    color: #856404;
    margin-bottom: 4px;
  }
  
  .conflict-message {
    font-size: 12px;
    color: #856404;
    margin-bottom: 8px;
  }
  
  .conflict-actions {
    display: flex;
    gap: 8px;
  }
  
  .conflict-button {
    padding: 4px 8px;
    font-size: 11px;
    border: 1px solid #856404;
    background: white;
    color: #856404;
    border-radius: 4px;
    cursor: pointer;
    
    &:hover {
      background: #856404;
      color: white;
    }
  }
`;

/**
 * 애플리케이션 레이아웃 컴포넌트
 * 
 * 기능:
 * - 네비게이션 통합
 * - 인증 상태 관리
 * - 데이터 동기화 상태 표시
 * - 충돌 알림
 * - 상태 표시줄
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentPath,
  onNavigate
}) => {
  // === 인증 상태 ===
  const { user, checkPermission } = useAuth();
  
  // === 동기화 상태 ===
  const {
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingChanges,
    syncError,
    conflictCount,
    syncNow,
    resolveConflict,
  } = useDataSync();
  
  // === 로컬 상태 ===
  const [showConflictNotification, setShowConflictNotification] = useState(false);
  
  // === 충돌 알림 관리 ===
  useEffect(() => {
    if (conflictCount > 0) {
      setShowConflictNotification(true);
      
      // 10초 후 자동 숨김
      const timer = setTimeout(() => {
        setShowConflictNotification(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    } else {
      setShowConflictNotification(false);
    }
  }, [conflictCount]);
  
  // === 사용자 권한 목록 (기본값 포함) ===
  const userPermissions = user?.permissions || ['products.view', 'bom.view'];
  
  // === 디버깅 로그 (개발용) ===
  if (process.env.NODE_ENV === 'development') {
    console.log('AppLayout - Current user:', user);
    console.log('AppLayout - User permissions:', userPermissions);
    console.log('AppLayout - Current path:', currentPath);
  }
  
  // === 상태 텍스트 생성 ===
  const getStatusText = () => {
    if (!isOnline) return '오프라인';
    if (isSyncing) return '동기화 중...';
    if (syncError) return '동기화 오류';
    return '온라인';
  };
  
  const getStatusType = (): 'online' | 'offline' | 'syncing' | 'error' => {
    if (!isOnline) return 'offline';
    if (isSyncing) return 'syncing';
    if (syncError) return 'error';
    return 'online';
  };
  
  // === 마지막 동기화 시간 포맷 ===
  const formatLastSyncTime = (time: Date | null): string => {
    if (!time) return '동기화 안됨';
    
    const now = new Date();
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    
    return time.toLocaleDateString();
  };
  
  // === 충돌 해결 핸들러 ===
  const handleResolveAllConflicts = async (resolution: 'local' | 'server') => {
    // 실제 구현에서는 모든 충돌을 순회하며 해결
    console.log(`Resolving all conflicts with ${resolution} data`);
    setShowConflictNotification(false);
  };
  
  return (
    <MainLayout>
      {/* 네비게이션 */}
      <Navigation
        currentPath={currentPath}
        onNavigate={onNavigate}
        userPermissions={userPermissions}
      />
      
      {/* 메인 콘텐츠 */}
      <MainContent>
        {children}
        
        {/* 상태 표시줄 */}
        <StatusBar>
          <StatusItem status={getStatusType()}>
            <div className="status-icon" />
            <div className="status-text">{getStatusText()}</div>
          </StatusItem>
          
          <StatusItem>
            <div className="status-text">
              마지막 동기화: {formatLastSyncTime(lastSyncTime)}
            </div>
          </StatusItem>
          
          {pendingChanges > 0 && (
            <StatusItem>
              <div className="status-text">
                대기 중인 변경사항: {pendingChanges}개
              </div>
            </StatusItem>
          )}
          
          {conflictCount > 0 && (
            <StatusItem status="error">
              <div className="status-icon" />
              <div className="status-text">
                충돌: {conflictCount}개
              </div>
            </StatusItem>
          )}
          
          {syncError && (
            <StatusItem status="error">
              <div className="status-icon" />
              <div className="status-text">
                {syncError}
              </div>
            </StatusItem>
          )}
          
          {user && (
            <StatusItem style={{ marginLeft: 'auto' }}>
              <div className="status-text">
                {user.name} ({user.role})
              </div>
            </StatusItem>
          )}
        </StatusBar>
      </MainContent>
      
      {/* 동기화 진행 표시 */}
      <SyncIndicator visible={isSyncing}>
        <div className="sync-spinner" />
        <span>데이터 동기화 중...</span>
      </SyncIndicator>
      
      {/* 충돌 알림 */}
      <ConflictNotification visible={showConflictNotification}>
        <div className="conflict-title">데이터 충돌 감지</div>
        <div className="conflict-message">
          {conflictCount}개의 데이터 충돌이 발생했습니다. 
          충돌을 해결해주세요.
        </div>
        <div className="conflict-actions">
          <button 
            className="conflict-button"
            onClick={() => handleResolveAllConflicts('local')}
          >
            로컬 데이터 사용
          </button>
          <button 
            className="conflict-button"
            onClick={() => handleResolveAllConflicts('server')}
          >
            서버 데이터 사용
          </button>
          <button 
            className="conflict-button"
            onClick={() => setShowConflictNotification(false)}
          >
            나중에 해결
          </button>
        </div>
      </ConflictNotification>
    </MainLayout>
  );
};