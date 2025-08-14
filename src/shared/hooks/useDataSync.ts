import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 동기화 상태 타입
 */
export interface SyncState {
  isOnline: boolean;              // 네트워크 연결 상태
  isSyncing: boolean;             // 동기화 진행 중
  lastSyncTime: Date | null;      // 마지막 동기화 시간
  pendingChanges: number;         // 대기 중인 변경사항 수
  syncError: string | null;       // 동기화 오류
  conflictCount: number;          // 충돌 수
}

/**
 * 동기화 이벤트 타입
 */
export interface SyncEvent {
  type: 'create' | 'update' | 'delete';
  entity: string;                 // 엔티티 타입 (product, bom, etc.)
  entityId: string;              // 엔티티 ID
  data: any;                     // 변경 데이터
  timestamp: Date;               // 변경 시간
  userId: string;                // 변경 사용자
  version: number;               // 버전 번호
}

/**
 * 충돌 정보 타입
 */
export interface ConflictInfo {
  id: string;
  entity: string;
  entityId: string;
  localVersion: number;
  serverVersion: number;
  localData: any;
  serverData: any;
  timestamp: Date;
  conflictType: 'version' | 'concurrent' | 'deletion';
}

/**
 * 동기화 액션 타입
 */
export interface DataSyncActions {
  // 수동 동기화
  syncNow: () => Promise<boolean>;
  
  // 변경사항 추가
  addPendingChange: (event: Omit<SyncEvent, 'timestamp' | 'version'>) => void;
  
  // 충돌 해결
  resolveConflict: (conflictId: string, resolution: 'local' | 'server' | 'merge', mergedData?: any) => Promise<void>;
  
  // 동기화 설정
  enableAutoSync: (enabled: boolean) => void;
  setSyncInterval: (intervalMs: number) => void;
  
  // 캐시 관리
  clearCache: () => void;
  exportPendingChanges: () => SyncEvent[];
  importPendingChanges: (events: SyncEvent[]) => void;
}

/**
 * 로컬 스토리지 키
 */
const STORAGE_KEYS = {
  PENDING_CHANGES: 'data_sync_pending_changes',
  LAST_SYNC_TIME: 'data_sync_last_sync_time',
  CONFLICTS: 'data_sync_conflicts',
  SYNC_SETTINGS: 'data_sync_settings',
} as const;

/**
 * 기본 설정
 */
const DEFAULT_SETTINGS = {
  autoSyncEnabled: true,
  syncIntervalMs: 30000,    // 30초
  maxRetries: 3,
  retryDelayMs: 5000,       // 5초
  batchSize: 10,            // 한 번에 동기화할 최대 변경사항 수
};

/**
 * Mock 서버 응답 시뮬레이션
 */
const mockServerSync = async (events: SyncEvent[]): Promise<{
  success: boolean;
  processedEvents: string[];
  conflicts: ConflictInfo[];
  serverTime: Date;
}> => {
  // 네트워크 지연 시뮬레이션
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // 30% 확률로 실패 (오프라인 시뮬레이션)
  if (Math.random() < 0.1) {
    throw new Error('Network error: Unable to connect to server');
  }
  
  // 10% 확률로 충돌 발생
  const conflicts: ConflictInfo[] = [];
  if (Math.random() < 0.1 && events.length > 0) {
    const conflictEvent = events[0];
    conflicts.push({
      id: `conflict-${Date.now()}`,
      entity: conflictEvent.entity,
      entityId: conflictEvent.entityId,
      localVersion: conflictEvent.version,
      serverVersion: conflictEvent.version + 1,
      localData: conflictEvent.data,
      serverData: { ...conflictEvent.data, modifiedBy: 'another-user' },
      timestamp: new Date(),
      conflictType: 'concurrent',
    });
  }
  
  return {
    success: true,
    processedEvents: events.map(e => `${e.entity}:${e.entityId}`),
    conflicts,
    serverTime: new Date(),
  };
};

/**
 * 데이터 동기화 커스텀 훅
 * 
 * 기능:
 * - 오프라인 지원
 * - 자동/수동 동기화
 * - 충돌 감지 및 해결
 * - 변경사항 큐 관리
 * - 네트워크 상태 모니터링
 * - 재시도 로직
 */
export const useDataSync = (): SyncState & DataSyncActions => {
  // === 상태 관리 ===
  const [state, setState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    syncError: null,
    conflictCount: 0,
  });
  
  // === 참조 ===
  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const pendingChangesRef = useRef<SyncEvent[]>([]);
  const conflictsRef = useRef<ConflictInfo[]>([]);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const retryCountRef = useRef(0);
  
  // === 로컬 스토리지 유틸리티 ===
  const saveToStorage = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, []);
  
  const loadFromStorage = useCallback((key: string, defaultValue: any = null) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return defaultValue;
    }
  }, []);
  
  // === 초기화 ===
  useEffect(() => {
    // 저장된 데이터 로드
    pendingChangesRef.current = loadFromStorage(STORAGE_KEYS.PENDING_CHANGES, []);
    conflictsRef.current = loadFromStorage(STORAGE_KEYS.CONFLICTS, []);
    settingsRef.current = { ...DEFAULT_SETTINGS, ...loadFromStorage(STORAGE_KEYS.SYNC_SETTINGS, {}) };
    
    const lastSyncTime = loadFromStorage(STORAGE_KEYS.LAST_SYNC_TIME);
    
    setState(prev => ({
      ...prev,
      lastSyncTime: lastSyncTime ? new Date(lastSyncTime) : null,
      pendingChanges: pendingChangesRef.current.length,
      conflictCount: conflictsRef.current.length,
    }));
  }, [loadFromStorage]);
  
  // === 네트워크 상태 모니터링 ===
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true, syncError: null }));
      // 온라인 상태가 되면 자동 동기화 시도
      if (settingsRef.current.autoSyncEnabled) {
        setTimeout(() => syncNow(), 1000);
      }
    };
    
    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // === 동기화 실행 ===
  const syncNow = useCallback(async (): Promise<boolean> => {
    if (state.isSyncing || !state.isOnline) {
      return false;
    }
    
    const pendingChanges = pendingChangesRef.current;
    if (pendingChanges.length === 0) {
      return true;
    }
    
    setState(prev => ({ ...prev, isSyncing: true, syncError: null }));
    
    try {
      // 배치 단위로 동기화
      const batchSize = settingsRef.current.batchSize;
      const batch = pendingChanges.slice(0, batchSize);
      
      // 서버와 동기화
      const response = await mockServerSync(batch);
      
      if (response.success) {
        // 성공한 변경사항 제거
        pendingChangesRef.current = pendingChanges.slice(batchSize);
        
        // 충돌 추가
        if (response.conflicts.length > 0) {
          conflictsRef.current.push(...response.conflicts);
          saveToStorage(STORAGE_KEYS.CONFLICTS, conflictsRef.current);
        }
        
        // 동기화 시간 업데이트
        const syncTime = response.serverTime;
        saveToStorage(STORAGE_KEYS.LAST_SYNC_TIME, syncTime.toISOString());
        saveToStorage(STORAGE_KEYS.PENDING_CHANGES, pendingChangesRef.current);
        
        setState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: syncTime,
          pendingChanges: pendingChangesRef.current.length,
          conflictCount: conflictsRef.current.length,
          syncError: null,
        }));
        
        retryCountRef.current = 0;
        
        // 더 많은 변경사항이 있으면 계속 동기화
        if (pendingChangesRef.current.length > 0) {
          setTimeout(() => syncNow(), 100);
        }
        
        return true;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '동기화 중 오류가 발생했습니다.';
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: errorMessage,
      }));
      
      // 재시도 로직
      retryCountRef.current++;
      if (retryCountRef.current < settingsRef.current.maxRetries) {
        setTimeout(() => syncNow(), settingsRef.current.retryDelayMs * retryCountRef.current);
      }
      
      console.error('Sync error:', error);
      return false;
    }
    
    return false;
  }, [state.isSyncing, state.isOnline]);
  
  // === 변경사항 추가 ===
  const addPendingChange = useCallback((event: Omit<SyncEvent, 'timestamp' | 'version'>) => {
    const newEvent: SyncEvent = {
      ...event,
      timestamp: new Date(),
      version: Date.now(), // 간단한 버전 번호 생성
    };
    
    pendingChangesRef.current.push(newEvent);
    saveToStorage(STORAGE_KEYS.PENDING_CHANGES, pendingChangesRef.current);
    
    setState(prev => ({
      ...prev,
      pendingChanges: pendingChangesRef.current.length,
    }));
    
    // 자동 동기화가 활성화되어 있으면 동기화 시도
    if (settingsRef.current.autoSyncEnabled && state.isOnline) {
      setTimeout(() => syncNow(), 1000);
    }
  }, [state.isOnline, syncNow]);
  
  // === 충돌 해결 ===
  const resolveConflict = useCallback(async (
    conflictId: string, 
    resolution: 'local' | 'server' | 'merge', 
    mergedData?: any
  ): Promise<void> => {
    const conflictIndex = conflictsRef.current.findIndex(c => c.id === conflictId);
    if (conflictIndex === -1) return;
    
    const conflict = conflictsRef.current[conflictIndex];
    
    try {
      // 해결 데이터 결정
      let resolvedData = conflict.localData;
      
      switch (resolution) {
        case 'server':
          resolvedData = conflict.serverData;
          break;
        case 'merge':
          resolvedData = mergedData || { ...conflict.serverData, ...conflict.localData };
          break;
        case 'local':
        default:
          resolvedData = conflict.localData;
          break;
      }
      
      // 해결된 데이터로 새 변경사항 추가
      addPendingChange({
        type: 'update',
        entity: conflict.entity,
        entityId: conflict.entityId,
        data: resolvedData,
        userId: 'current-user', // TODO: 실제 사용자 ID
      });
      
      // 충돌 제거
      conflictsRef.current.splice(conflictIndex, 1);
      saveToStorage(STORAGE_KEYS.CONFLICTS, conflictsRef.current);
      
      setState(prev => ({
        ...prev,
        conflictCount: conflictsRef.current.length,
      }));
      
    } catch (error) {
      console.error('Conflict resolution error:', error);
    }
  }, [addPendingChange]);
  
  // === 자동 동기화 설정 ===
  const enableAutoSync = useCallback((enabled: boolean) => {
    settingsRef.current.autoSyncEnabled = enabled;
    saveToStorage(STORAGE_KEYS.SYNC_SETTINGS, settingsRef.current);
    
    if (enabled && state.isOnline && pendingChangesRef.current.length > 0) {
      syncNow();
    }
  }, [state.isOnline, syncNow]);
  
  const setSyncInterval = useCallback((intervalMs: number) => {
    settingsRef.current.syncIntervalMs = intervalMs;
    saveToStorage(STORAGE_KEYS.SYNC_SETTINGS, settingsRef.current);
    
    // 기존 인터벌 클리어 후 새로 설정
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
    
    if (settingsRef.current.autoSyncEnabled) {
      syncIntervalRef.current = setInterval(() => {
        if (state.isOnline && !state.isSyncing) {
          syncNow();
        }
      }, intervalMs);
    }
  }, [state.isOnline, state.isSyncing, syncNow]);
  
  // === 캐시 관리 ===
  const clearCache = useCallback(() => {
    pendingChangesRef.current = [];
    conflictsRef.current = [];
    
    localStorage.removeItem(STORAGE_KEYS.PENDING_CHANGES);
    localStorage.removeItem(STORAGE_KEYS.CONFLICTS);
    
    setState(prev => ({
      ...prev,
      pendingChanges: 0,
      conflictCount: 0,
      syncError: null,
    }));
  }, []);
  
  const exportPendingChanges = useCallback((): SyncEvent[] => {
    return [...pendingChangesRef.current];
  }, []);
  
  const importPendingChanges = useCallback((events: SyncEvent[]) => {
    pendingChangesRef.current.push(...events);
    saveToStorage(STORAGE_KEYS.PENDING_CHANGES, pendingChangesRef.current);
    
    setState(prev => ({
      ...prev,
      pendingChanges: pendingChangesRef.current.length,
    }));
  }, []);
  
  // === 자동 동기화 인터벌 설정 ===
  useEffect(() => {
    if (settingsRef.current.autoSyncEnabled) {
      syncIntervalRef.current = setInterval(() => {
        if (state.isOnline && !state.isSyncing && pendingChangesRef.current.length > 0) {
          syncNow();
        }
      }, settingsRef.current.syncIntervalMs);
    }
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [state.isOnline, state.isSyncing, syncNow]);
  
  // === 페이지 언로드 시 동기화 ===
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingChangesRef.current.length > 0) {
        e.preventDefault();
        e.returnValue = '저장되지 않은 변경사항이 있습니다. 정말 나가시겠습니까?';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
  return {
    // 상태
    ...state,
    
    // 액션
    syncNow,
    addPendingChange,
    resolveConflict,
    enableAutoSync,
    setSyncInterval,
    clearCache,
    exportPendingChanges,
    importPendingChanges,
  };
};