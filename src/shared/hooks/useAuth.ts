import { useState, useEffect, useCallback, createContext, useContext } from 'react';

/**
 * 사용자 정보 타입
 */
export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  department: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

/**
 * 인증 상태 타입
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * 로그인 요청 타입
 */
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * 로그인 응답 타입
 */
export interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

/**
 * 인증 액션 타입
 */
export interface AuthActions {
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  checkPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  updateUser: (updates: Partial<User>) => void;
}

/**
 * 권한 레벨 정의
 */
export const PERMISSION_LEVELS = {
  // 제품 관리
  'products.view': 'VIEW',
  'products.create': 'CREATE',
  'products.edit': 'EDIT',
  'products.delete': 'DELETE',
  'products.categories.view': 'VIEW',
  'products.categories.manage': 'EDIT',
  
  // BOM 관리
  'bom.view': 'VIEW',
  'bom.create': 'CREATE',
  'bom.edit': 'EDIT',
  'bom.delete': 'DELETE',
  'bom.compare': 'VIEW',
  'bom.cost.view': 'VIEW',
  'bom.cost.edit': 'EDIT',
  
  // 재고 관리
  'inventory.view': 'VIEW',
  'inventory.edit': 'EDIT',
  'inventory.adjust': 'EDIT',
  
  // 생산 관리
  'production.view': 'VIEW',
  'production.plan.view': 'VIEW',
  'production.plan.edit': 'EDIT',
  'production.order.view': 'VIEW',
  'production.order.create': 'CREATE',
  'production.order.edit': 'EDIT',
  
  // 품질 관리
  'quality.view': 'VIEW',
  'quality.inspect': 'EDIT',
  'quality.report': 'CREATE',
  
  // 보고서
  'reports.view': 'VIEW',
  'reports.production.view': 'VIEW',
  'reports.cost.view': 'VIEW',
  'reports.quality.view': 'VIEW',
  'reports.export': 'EXPORT',
  
  // 시스템 관리
  'admin.users': 'ADMIN',
  'admin.system': 'ADMIN',
  'admin.settings': 'ADMIN',
  'admin.all': 'ADMIN',
  
  // 대시보드
  'dashboard.view': 'VIEW',
} as const;

/**
 * 역할별 기본 권한 정의
 */
export const ROLE_PERMISSIONS = {
  'operator': [
    'dashboard.view',
    'products.view',
    'bom.view',
    'inventory.view',
    'production.view',
    'production.plan.view',
    'quality.view',
  ],
  'supervisor': [
    'dashboard.view',
    'products.view',
    'products.create',
    'products.edit',
    'bom.view',
    'bom.create',
    'bom.edit',
    'bom.compare',
    'inventory.view',
    'inventory.edit',
    'production.view',
    'production.plan.view',
    'production.plan.edit',
    'production.order.view',
    'production.order.create',
    'quality.view',
    'quality.inspect',
    'reports.view',
    'reports.production.view',
    'reports.cost.view',
  ],
  'manager': [
    'dashboard.view',
    'products.view',
    'products.create',
    'products.edit',
    'products.delete',
    'products.categories.view',
    'products.categories.manage',
    'bom.view',
    'bom.create',
    'bom.edit',
    'bom.delete',
    'bom.compare',
    'bom.cost.view',
    'bom.cost.edit',
    'inventory.view',
    'inventory.edit',
    'inventory.adjust',
    'production.view',
    'production.plan.view',
    'production.plan.edit',
    'production.order.view',
    'production.order.create',
    'production.order.edit',
    'quality.view',
    'quality.inspect',
    'quality.report',
    'reports.view',
    'reports.production.view',
    'reports.cost.view',
    'reports.quality.view',
    'reports.export',
  ],
  'admin': [
    'admin.all',
  ],
} as const;

/**
 * 기본 상태 (개발/테스트용 - 자동 로그인)
 */
const initialState: AuthState = {
  isAuthenticated: true,
  user: {
    id: 'admin',
    username: 'admin',
    name: '시스템 관리자',
    email: 'admin@company.com',
    role: 'admin',
    permissions: ['admin.all'],
    department: 'IT',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  token: 'mock-jwt-token-admin-dev',
  loading: false,
  error: null,
};

/**
 * Mock 사용자 데이터
 */
const mockUsers: User[] = [
  {
    id: 'admin',
    username: 'admin',
    name: '시스템 관리자',
    email: 'admin@company.com',
    role: 'admin',
    permissions: ['admin.all'],
    department: 'IT',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'manager',
    username: 'manager',
    name: '생산 관리자',
    email: 'manager@company.com',
    role: 'manager',
    permissions: [...ROLE_PERMISSIONS.manager],
    department: '생산팀',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'supervisor',
    username: 'supervisor',
    name: '생산 감독자',
    email: 'supervisor@company.com',
    role: 'supervisor',
    permissions: [...ROLE_PERMISSIONS.supervisor],
    department: '생산팀',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'operator',
    username: 'operator',
    name: '작업자',
    email: 'operator@company.com',
    role: 'operator',
    permissions: [...ROLE_PERMISSIONS.operator],
    department: '생산팀',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
];

/**
 * 인증 커스텀 훅
 * 
 * 기능:
 * - 로그인/로그아웃 처리
 * - 토큰 기반 인증
 * - 권한 체크
 * - 자동 토큰 갱신
 * - 세션 관리
 */
export const useAuth = (): AuthState & AuthActions => {
  // === 상태 관리 ===
  const [state, setState] = useState<AuthState>(initialState);
  
  // === 토큰 저장소 ===
  const getStoredToken = (): string | null => {
    return localStorage.getItem('auth_token');
  };
  
  const setStoredToken = (token: string | null): void => {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  };
  
  const getStoredUser = (): User | null => {
    const userData = localStorage.getItem('auth_user');
    return userData ? JSON.parse(userData) : null;
  };
  
  const setStoredUser = (user: User | null): void => {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth_user');
    }
  };
  
  // === 로그인 처리 ===
  const login = useCallback(async (credentials: LoginRequest): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Mock 인증 처리 (실제 환경에서는 API 호출)
      await new Promise(resolve => setTimeout(resolve, 1000)); // 네트워크 지연 시뮬레이션
      
      const user = mockUsers.find(u => 
        u.username === credentials.username && 
        u.isActive
      );
      
      if (!user || credentials.password !== 'password') {
        throw new Error('잘못된 사용자명 또는 비밀번호입니다.');
      }
      
      // Mock JWT 토큰 생성
      const token = `mock-jwt-token-${user.id}-${Date.now()}`;
      
      // 상태 업데이트
      const updatedUser = {
        ...user,
        lastLoginAt: new Date(),
      };
      
      setState({
        isAuthenticated: true,
        user: updatedUser,
        token,
        loading: false,
        error: null,
      });
      
      // 로컬 스토리지에 저장
      setStoredToken(token);
      setStoredUser(updatedUser);
      
      console.log('Login successful:', updatedUser);
      return true;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      console.error('Login error:', error);
      return false;
    }
  }, []);
  
  // === 로그아웃 처리 ===
  const logout = useCallback(() => {
    setState(initialState);
    setStoredToken(null);
    setStoredUser(null);
    console.log('Logout successful');
  }, []);
  
  // === 토큰 갱신 ===
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const currentToken = getStoredToken();
    if (!currentToken) return false;
    
    try {
      // Mock 토큰 갱신 (실제 환경에서는 API 호출)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const user = getStoredUser();
      if (!user) return false;
      
      const newToken = `mock-jwt-token-${user.id}-${Date.now()}`;
      
      setState(prev => ({
        ...prev,
        token: newToken,
        error: null,
      }));
      
      setStoredToken(newToken);
      return true;
      
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return false;
    }
  }, [logout]);
  
  // === 권한 체크 ===
  const checkPermission = useCallback((permission: string): boolean => {
    if (!state.user) return false;
    
    // 관리자는 모든 권한 보유
    if (state.user.permissions.includes('admin.all')) return true;
    
    // 특정 권한 체크
    return state.user.permissions.includes(permission);
  }, [state.user]);
  
  // === 역할 체크 ===
  const hasRole = useCallback((role: string): boolean => {
    return state.user?.role === role;
  }, [state.user]);
  
  // === 사용자 정보 업데이트 ===
  const updateUser = useCallback((updates: Partial<User>) => {
    if (!state.user) return;
    
    const updatedUser = { ...state.user, ...updates };
    setState(prev => ({ ...prev, user: updatedUser }));
    setStoredUser(updatedUser);
  }, [state.user]);
  
  // === 초기화 및 자동 로그인 ===
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      const user = getStoredUser();
      
      if (token && user) {
        // 토큰 유효성 검증 (Mock)
        const isValid = true; // 실제 환경에서는 서버에서 검증
        
        if (isValid) {
          setState({
            isAuthenticated: true,
            user,
            token,
            loading: false,
            error: null,
          });
        } else {
          logout();
        }
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    };
    
    initAuth();
  }, [logout]);
  
  // === 자동 토큰 갱신 (30분마다) ===
  useEffect(() => {
    if (!state.isAuthenticated) return;
    
    const interval = setInterval(() => {
      refreshToken();
    }, 30 * 60 * 1000); // 30분
    
    return () => clearInterval(interval);
  }, [state.isAuthenticated, refreshToken]);
  
  return {
    // 상태
    ...state,
    
    // 액션
    login,
    logout,
    refreshToken,
    checkPermission,
    hasRole,
    updateUser,
  };
};

/**
 * 인증 컨텍스트
 */
export const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

/**
 * 인증 컨텍스트 사용 훅
 */
export const useAuthContext = (): AuthState & AuthActions => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

/**
 * 권한 체크 유틸리티 함수들
 */
export const AuthUtils = {
  /**
   * 권한 레벨 체크
   */
  hasPermissionLevel: (userPermissions: string[], requiredPermission: string): boolean => {
    // 관리자는 모든 권한 보유
    if (userPermissions.includes('admin.all')) return true;
    
    // 특정 권한 체크
    return userPermissions.includes(requiredPermission);
  },
  
  /**
   * 다중 권한 체크 (AND 조건)
   */
  hasAllPermissions: (userPermissions: string[], requiredPermissions: string[]): boolean => {
    if (userPermissions.includes('admin.all')) return true;
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  },
  
  /**
   * 다중 권한 체크 (OR 조건)
   */
  hasAnyPermission: (userPermissions: string[], requiredPermissions: string[]): boolean => {
    if (userPermissions.includes('admin.all')) return true;
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  },
  
  /**
   * 역할 기반 권한 체크
   */
  hasRolePermission: (userRole: string, requiredRoles: string[]): boolean => {
    return requiredRoles.includes(userRole);
  },
};