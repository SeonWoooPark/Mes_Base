/**
 * 전역 애플리케이션 상태 관리 (Zustand)
 * 
 * UI 상태와 서버 상태를 명확히 분리:
 * - UI 상태: Zustand로 관리 (모달, 사이드바, 선택된 항목 등)
 * - 서버 상태: TanStack Query로 관리 (API 데이터, 캐싱 등)
 * 
 * 설계 원칙:
 * - 단순하고 직관적인 상태 구조
 * - Feature별 상태 네임스페이스
 * - 타입 안전성 보장
 * - 개발 도구 지원
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// Immer에서 Map/Set 지원 활성화 (Zustand + immer 미들웨어에서 Set 사용 시 필수)
enableMapSet();

/**
 * 전역 UI 상태 타입 정의
 */
export interface AppState {
  // === 공통 UI 상태 ===
  ui: {
    sidebarCollapsed: boolean;
    currentTheme: 'light' | 'dark';
    notifications: Notification[];
    loadingStates: Record<string, boolean>;
  };

  // === Product Feature UI 상태 ===
  product: {
    selectedProduct: ProductSelection | null;
    modals: {
      isFormModalOpen: boolean;
      isHistoryModalOpen: boolean;
    };
    filters: {
      searchKeyword: string;
      activeFilters: string[];
    };
    view: {
      currentPage: number;
      pageSize: number;
      sortBy: string;
      sortDirection: 'asc' | 'desc';
    };
  };

  // === BOM Feature UI 상태 ===
  bom: {
    selectedBOM: BOMSelection | null;
    modals: {
      isItemModalOpen: boolean;
      isCopyModalOpen: boolean;
      isCompareModalOpen: boolean;
    };
    tree: {
      expandedNodes: Set<string>;
      selectedNode: string | null;
    };
    comparison: {
      sourceBOM: { id: string; name: string } | null;
      targetBOM: { id: string; name: string } | null;
    };
  };

  // === 에러 상태 관리 ===
  errors: {
    global: AppError[];
    feature: Record<string, AppError[]>;
  };
}

/**
 * 관련 타입 정의
 */
export interface ProductSelection {
  id: string;
  cd_material: string;
  nm_material: string;
  type: string;
}

export interface BOMSelection {
  id: string;
  productId: string;
  productName: string;
  version: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
}

export interface AppError {
  id: string;
  code: string;
  message: string;
  stack?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * 액션 타입 정의
 */
export interface AppActions {
  // === UI 액션들 ===
  ui: {
    toggleSidebar: () => void;
    setTheme: (theme: 'light' | 'dark') => void;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
    removeNotification: (id: string) => void;
    setLoading: (key: string, loading: boolean) => void;
  };

  // === Product 액션들 ===
  product: {
    setSelectedProduct: (product: ProductSelection | null) => void;
    openFormModal: () => void;
    closeFormModal: () => void;
    openHistoryModal: () => void;
    closeHistoryModal: () => void;
    setSearchKeyword: (keyword: string) => void;
    setFilters: (filters: string[]) => void;
    setView: (view: Partial<AppState['product']['view']>) => void;
    resetFilters: () => void;
  };

  // === BOM 액션들 ===
  bom: {
    setSelectedBOM: (bom: BOMSelection | null) => void;
    openItemModal: () => void;
    closeItemModal: () => void;
    openCopyModal: () => void;
    closeCopyModal: () => void;
    openCompareModal: () => void;
    closeCompareModal: () => void;
    expandNode: (nodeId: string) => void;
    collapseNode: (nodeId: string) => void;
    toggleNodeExpansion: (nodeId: string) => void;
    setSelectedNode: (nodeId: string | null) => void;
    setExpandedNodes: (nodeIds: Set<string>) => void;
    setComparison: (source: { id: string; name: string } | null, target: { id: string; name: string } | null) => void;
    expandAllNodes: () => void;
    collapseAllNodes: () => void;
    resetBOMTree: () => void;
  };

  // === 에러 관리 액션들 ===
  errors: {
    addError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
    removeError: (id: string) => void;
    addFeatureError: (feature: string, error: Omit<AppError, 'id' | 'timestamp'>) => void;
    removeFeatureError: (feature: string, id: string) => void;
    clearAllErrors: () => void;
    clearFeatureErrors: (feature: string) => void;
  };

  // === 유틸리티 액션들 ===
  reset: () => void;
  resetFeature: (feature: keyof AppState) => void;
}

/**
 * 초기 상태 정의
 */
const initialState: AppState = {
  ui: {
    sidebarCollapsed: false,
    currentTheme: 'light',
    notifications: [],
    loadingStates: {},
  },

  product: {
    selectedProduct: null,
    modals: {
      isFormModalOpen: false,
      isHistoryModalOpen: false,
    },
    filters: {
      searchKeyword: '',
      activeFilters: [],
    },
    view: {
      currentPage: 1,
      pageSize: 10,
      sortBy: 'cd_material',
      sortDirection: 'asc',
    },
  },

  bom: {
    selectedBOM: null,
    modals: {
      isItemModalOpen: false,
      isCopyModalOpen: false,
      isCompareModalOpen: false,
    },
    tree: {
      expandedNodes: new Set(),
      selectedNode: null,
    },
    comparison: {
      sourceBOM: null,
      targetBOM: null,
    },
  },

  errors: {
    global: [],
    feature: {},
  },
};

/**
 * 전역 앱 스토어 생성
 */
export const useAppStore = create<AppState & AppActions>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // === UI 액션 구현 ===
        ui: {
          ...initialState.ui,
          toggleSidebar: () => set(state => {
            state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
          }),

          setTheme: (theme) => set(state => {
            state.ui.currentTheme = theme;
            // 로컬 스토리지에 저장
            localStorage.setItem('mes-theme', theme);
          }),

          addNotification: (notification) => set(state => {
            const newNotification: Notification = {
              ...notification,
              id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              timestamp: new Date(),
            };
            state.ui.notifications.push(newNotification);

            // 자동 제거 설정
            if (notification.autoClose !== false) {
              const duration = notification.duration || 5000;
              setTimeout(() => {
                get().ui.removeNotification(newNotification.id);
              }, duration);
            }
          }),

          removeNotification: (id) => set(state => {
            state.ui.notifications = state.ui.notifications.filter(n => n.id !== id);
          }),

          setLoading: (key, loading) => set(state => {
            if (loading) {
              state.ui.loadingStates[key] = true;
            } else {
              delete state.ui.loadingStates[key];
            }
          }),
        },

        // === Product 액션 구현 ===
        product: {
          ...initialState.product,
          setSelectedProduct: (product) => set(state => {
            state.product.selectedProduct = product;
          }),

          openFormModal: () => set(state => {
            state.product.modals.isFormModalOpen = true;
          }),

          closeFormModal: () => set(state => {
            state.product.modals.isFormModalOpen = false;
            state.product.selectedProduct = null; // 모달 닫을 때 선택 해제
          }),

          openHistoryModal: () => set(state => {
            state.product.modals.isHistoryModalOpen = true;
          }),

          closeHistoryModal: () => set(state => {
            state.product.modals.isHistoryModalOpen = false;
          }),

          setSearchKeyword: (keyword) => set(state => {
            state.product.filters.searchKeyword = keyword;
            state.product.view.currentPage = 1; // 검색 시 첫 페이지로 이동
          }),

          setFilters: (filters) => set(state => {
            state.product.filters.activeFilters = filters;
            state.product.view.currentPage = 1;
          }),

          setView: (view) => set(state => {
            Object.assign(state.product.view, view);
          }),

          resetFilters: () => set(state => {
            state.product.filters.searchKeyword = '';
            state.product.filters.activeFilters = [];
            state.product.view.currentPage = 1;
          }),
        },

        // === BOM 액션 구현 ===
        bom: {
          ...initialState.bom,
          setSelectedBOM: (bom) => set(state => {
            state.bom.selectedBOM = bom;
          }),

          openItemModal: () => set(state => {
            state.bom.modals.isItemModalOpen = true;
          }),

          closeItemModal: () => set(state => {
            state.bom.modals.isItemModalOpen = false;
          }),

          openCopyModal: () => set(state => {
            state.bom.modals.isCopyModalOpen = true;
          }),

          closeCopyModal: () => set(state => {
            state.bom.modals.isCopyModalOpen = false;
          }),

          openCompareModal: () => set(state => {
            state.bom.modals.isCompareModalOpen = true;
          }),

          closeCompareModal: () => set(state => {
            state.bom.modals.isCompareModalOpen = false;
          }),

          toggleNodeExpansion: (nodeId) => set(state => {
            if (state.bom.tree.expandedNodes.has(nodeId)) {
              state.bom.tree.expandedNodes.delete(nodeId);
            } else {
              state.bom.tree.expandedNodes.add(nodeId);
            }
          }),

          setSelectedNode: (nodeId) => set(state => {
            state.bom.tree.selectedNode = nodeId;
          }),

          setComparison: (source, target) => set(state => {
            state.bom.comparison.sourceBOM = source;
            state.bom.comparison.targetBOM = target;
          }),

          expandNode: (nodeId: string) => set(state => {
            state.bom.tree.expandedNodes.add(nodeId);
          }),

          collapseNode: (nodeId: string) => set(state => {
            state.bom.tree.expandedNodes.delete(nodeId);
          }),

          setExpandedNodes: (nodeIds: Set<string>) => set(state => {
            state.bom.tree.expandedNodes = new Set(nodeIds);
          }),

          expandAllNodes: () => set(state => {
            // TODO: 모든 노드 ID를 전달받아서 확장
            // 현재는 빈 구현
          }),

          collapseAllNodes: () => set(state => {
            state.bom.tree.expandedNodes.clear();
          }),

          resetBOMTree: () => set(state => {
            // BOM 트리 관련 모든 상태를 초기화
            state.bom.tree.expandedNodes.clear();
            state.bom.tree.selectedNode = null;
            // BOM 선택도 초기화
            state.bom.selectedBOM = null;
            // 비교 상태도 초기화
            state.bom.comparison.sourceBOM = null;
            state.bom.comparison.targetBOM = null;
          }),
        },

        // === 에러 관리 액션 구현 ===
        errors: {
          ...initialState.errors,
          addError: (error) => set(state => {
            const newError: AppError = {
              ...error,
              id: `error-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              timestamp: new Date(),
            };
            state.errors.global.push(newError);
          }),

          removeError: (id) => set(state => {
            state.errors.global = state.errors.global.filter(e => e.id !== id);
          }),

          addFeatureError: (feature, error) => set(state => {
            const newError: AppError = {
              ...error,
              id: `error-${feature}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              timestamp: new Date(),
            };
            
            if (!state.errors.feature[feature]) {
              state.errors.feature[feature] = [];
            }
            state.errors.feature[feature].push(newError);
          }),

          removeFeatureError: (feature, id) => set(state => {
            if (state.errors.feature[feature]) {
              state.errors.feature[feature] = state.errors.feature[feature].filter(e => e.id !== id);
            }
          }),

          clearAllErrors: () => set(state => {
            state.errors.global = [];
            state.errors.feature = {};
          }),

          clearFeatureErrors: (feature) => set(state => {
            if (state.errors.feature[feature]) {
              state.errors.feature[feature] = [];
            }
          }),
        },

        // === 유틸리티 액션 구현 ===
        reset: () => set(() => ({ ...initialState })),

        resetFeature: (feature) => set(state => {
          if (feature in initialState) {
            (state as any)[feature] = (initialState as any)[feature];
          }
        }),
      }))
    ),
    {
      name: 'mes-app-store',
    }
  )
);

/**
 * 스토어 구독 헬퍼들
 */
/**
 * 개별 Hook Selectors
 * 각각 독립적인 Hook으로 정의하여 React Hook Rules를 준수
 */
export const useAppStoreSelectors = {
  // UI 상태 선택자들
  useSidebarCollapsed: () => useAppStore(state => state.ui.sidebarCollapsed),
  useCurrentTheme: () => useAppStore(state => state.ui.currentTheme),
  useNotifications: () => useAppStore(state => state.ui.notifications),
  useIsLoading: (key: string) => useAppStore(state => !!state.ui.loadingStates[key]),

  // Product 상태 선택자들  
  useSelectedProduct: () => useAppStore(state => state.product.selectedProduct),
  useProductModals: () => useAppStore(state => state.product.modals),
  useProductFilters: () => useAppStore(state => state.product.filters),
  useProductView: () => useAppStore(state => state.product.view),

  // BOM 상태 선택자들
  useSelectedBOM: () => useAppStore(state => state.bom.selectedBOM),
  useBomModals: () => useAppStore(state => state.bom.modals),
  useBomTree: () => useAppStore(state => state.bom.tree),
  useBomComparison: () => useAppStore(state => state.bom.comparison),

  // 에러 상태 선택자들
  useGlobalErrors: () => useAppStore(state => state.errors.global),
  useFeatureErrors: (feature: string) => useAppStore(state => state.errors.feature[feature] || []),
};

/**
 * 편의 메서드: 직접 접근 가능한 Selector 함수들 (Hook이 아닌 환경에서 사용)
 */
export const appStoreSelectors = {
  // UI 상태 선택자들  
  sidebarCollapsed: () => useAppStore.getState().ui.sidebarCollapsed,
  currentTheme: () => useAppStore.getState().ui.currentTheme,
  notifications: () => useAppStore.getState().ui.notifications,
  isLoading: (key: string) => !!useAppStore.getState().ui.loadingStates[key],

  // Product 상태 선택자들
  selectedProduct: () => useAppStore.getState().product.selectedProduct,
  productModals: () => useAppStore.getState().product.modals,
  productFilters: () => useAppStore.getState().product.filters,
  productView: () => useAppStore.getState().product.view,

  // BOM 상태 선택자들
  selectedBOM: () => useAppStore.getState().bom.selectedBOM,
  bomModals: () => useAppStore.getState().bom.modals,
  bomTree: () => useAppStore.getState().bom.tree,
  bomComparison: () => useAppStore.getState().bom.comparison,

  // 에러 상태 선택자들
  globalErrors: () => useAppStore.getState().errors.global,
  featureErrors: (feature: string) => useAppStore.getState().errors.feature[feature] || [],
};

/**
 * 로컬 스토리지에서 테마 설정 복원
 */
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('mes-theme') as 'light' | 'dark' | null;
  if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
    useAppStore.getState().ui.setTheme(savedTheme);
  }
}

/**
 * React 개발 도구를 위한 전역 객체 노출 (개발 환경에서만)
 */
if (process.env.NODE_ENV === 'development') {
  (window as any).__MES_APP_STORE__ = {
    store: useAppStore,
    selectors: useAppStoreSelectors,
    getState: useAppStore.getState,
    setState: useAppStore.setState,
  };
  
  console.log('🔧 MES App Store exposed to window.__MES_APP_STORE__ for debugging');
}