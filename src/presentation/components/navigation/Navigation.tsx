import React, { useState } from 'react';
import styled from 'styled-components';
import { Flex } from '../../utils/styled';

/**
 * 네비게이션 메뉴 아이템 타입
 */
interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  children?: NavigationItem[];
  permission?: string;
}

/**
 * 네비게이션 Props
 */
interface NavigationProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  userPermissions: string[];
}

/**
 * 스타일 컴포넌트들
 */
const NavigationContainer = styled.nav`
  width: 250px;
  height: 100vh;
  background: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  overflow-y: auto;
`;

const Logo = styled.div`
  padding: 20px;
  border-bottom: 1px solid #34495e;
  
  .title {
    font-size: 18px;
    font-weight: bold;
    color: #ecf0f1;
  }
  
  .subtitle {
    font-size: 12px;
    color: #bdc3c7;
    margin-top: 4px;
  }
`;

const MenuList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
`;

const MenuItem = styled.li<{ active: boolean; level: number }>`
  .menu-link {
    display: flex;
    align-items: center;
    padding: 12px 20px;
    padding-left: ${props => 20 + props.level * 20}px;
    color: ${props => props.active ? '#3498db' : '#ecf0f1'};
    background: ${props => props.active ? '#34495e' : 'transparent'};
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: #34495e;
      color: #3498db;
    }
    
    .icon {
      margin-right: 12px;
      font-size: 16px;
    }
    
    .label {
      flex: 1;
      font-size: 14px;
    }
    
    .arrow {
      font-size: 12px;
      transition: transform 0.2s;
      transform: ${props => props.active ? 'rotate(90deg)' : 'rotate(0deg)'};
    }
  }
`;

const SubMenuList = styled.ul<{ expanded: boolean }>`
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: ${props => props.expanded ? '500px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
  background: #1a252f;
`;

const UserInfo = styled.div`
  padding: 16px 20px;
  border-top: 1px solid #34495e;
  background: #1a252f;
  
  .user-name {
    font-size: 14px;
    font-weight: bold;
    color: #ecf0f1;
    margin-bottom: 4px;
  }
  
  .user-role {
    font-size: 12px;
    color: #bdc3c7;
  }
`;

/**
 * 기본 메뉴 구조
 */
const defaultMenuItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    icon: '📊',
    path: '/dashboard',
    permission: 'dashboard.view'
  },
  {
    id: 'products',
    label: '제품 관리',
    icon: '📦',
    path: '/products',
    permission: 'products.view',
    children: [
      {
        id: 'product-list',
        label: '제품 목록',
        icon: '📋',
        path: '/products',
        permission: 'products.view'
      },
      {
        id: 'product-categories',
        label: '제품 분류',
        icon: '🏷️',
        path: '/products/categories',
        permission: 'products.categories.view'
      }
    ]
  },
  {
    id: 'orders',
    label: '수주 관리',
    icon: '📋',
    path: '/orders',
    permission: 'orders.view',
    children: [
      {
        id: 'order-list',
        label: '수주 목록',
        icon: '📝',
        path: '/orders',
        permission: 'orders.view'
      },
      {
        id: 'order-status',
        label: '수주 현황',
        icon: '📊',
        path: '/orders/status',
        permission: 'orders.status.view'
      }
    ]
  },
  {
    id: 'bom',
    label: 'BOM 관리',
    icon: '🏗️',
    path: '/bom',
    permission: 'bom.view',
    children: [
      {
        id: 'bom-tree',
        label: 'BOM 구조',
        icon: '🌲',
        path: '/bom/tree',
        permission: 'bom.view'
      },
      {
        id: 'bom-compare',
        label: 'BOM 비교',
        icon: '📊',
        path: '/bom/compare',
        permission: 'bom.compare'
      },
      {
        id: 'bom-cost',
        label: '비용 분석',
        icon: '💰',
        path: '/bom/cost',
        permission: 'bom.cost.view'
      }
    ]
  },
  {
    id: 'inventory',
    label: '재고 관리',
    icon: '📊',
    path: '/inventory',
    permission: 'inventory.view'
  },
  {
    id: 'production',
    label: '생산 관리',
    icon: '⚙️',
    path: '/production',
    permission: 'production.view',
    children: [
      {
        id: 'production-plan',
        label: '생산 계획',
        icon: '📅',
        path: '/production/plan',
        permission: 'production.plan.view'
      },
      {
        id: 'production-order',
        label: '생산 지시',
        icon: '📋',
        path: '/production/order',
        permission: 'production.order.view'
      }
    ]
  },
  {
    id: 'quality',
    label: '품질 관리',
    icon: '✅',
    path: '/quality',
    permission: 'quality.view'
  },
  {
    id: 'reports',
    label: '보고서',
    icon: '📈',
    path: '/reports',
    permission: 'reports.view',
    children: [
      {
        id: 'production-reports',
        label: '생산 보고서',
        icon: '📊',
        path: '/reports/production',
        permission: 'reports.production.view'
      },
      {
        id: 'cost-reports',
        label: '비용 보고서',
        icon: '💰',
        path: '/reports/cost',
        permission: 'reports.cost.view'
      },
      {
        id: 'quality-reports',
        label: '품질 보고서',
        icon: '✅',
        path: '/reports/quality',
        permission: 'reports.quality.view'
      }
    ]
  },
  {
    id: 'settings',
    label: '시스템 설정',
    icon: '⚙️',
    path: '/settings',
    permission: 'admin.settings',
    children: [
      {
        id: 'user-management',
        label: '사용자 관리',
        icon: '👥',
        path: '/settings/users',
        permission: 'admin.users'
      },
      {
        id: 'system-config',
        label: '시스템 설정',
        icon: '🔧',
        path: '/settings/system',
        permission: 'admin.system'
      }
    ]
  }
];

/**
 * 네비게이션 컴포넌트
 * 
 * 기능:
 * - 계층형 메뉴 구조
 * - 권한 기반 메뉴 표시
 * - 현재 경로 하이라이팅
 * - 펼침/접기 기능
 * - 반응형 디자인
 */
export const Navigation: React.FC<NavigationProps> = ({
  currentPath,
  onNavigate,
  userPermissions
}) => {
  // === 상태 관리 ===
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['products', 'bom']));
  
  // === 권한 체크 ===
  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true;
    return userPermissions.includes(permission) || userPermissions.includes('admin.all');
  };
  
  // === 메뉴 필터링 ===
  const filterMenuItems = (items: NavigationItem[]): NavigationItem[] => {
    return items
      .filter(item => hasPermission(item.permission))
      .map(item => ({
        ...item,
        children: item.children ? filterMenuItems(item.children) : undefined
      }))
      .filter(item => !item.children || item.children.length > 0);
  };
  
  const filteredMenuItems = filterMenuItems(defaultMenuItems);
  
  // === 메뉴 펼침/접기 ===
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };
  
  // === 메뉴 아이템 클릭 핸들러 ===
  const handleMenuClick = (item: NavigationItem) => {
    if (item.children && item.children.length > 0) {
      toggleExpanded(item.id);
    } else {
      onNavigate(item.path);
    }
  };
  
  // === 활성 경로 체크 ===
  const isActive = (path: string): boolean => {
    return currentPath === path || currentPath.startsWith(path + '/');
  };
  
  // === 메뉴 아이템 렌더링 ===
  const renderMenuItem = (item: NavigationItem, level: number = 0): React.ReactNode => {
    const active = isActive(item.path);
    const expanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    
    return (
      <MenuItem key={item.id} active={active} level={level}>
        <div
          className="menu-link"
          onClick={() => handleMenuClick(item)}
        >
          <span className="icon">{item.icon}</span>
          <span className="label">{item.label}</span>
          {hasChildren && (
            <span className="arrow">▶</span>
          )}
        </div>
        
        {hasChildren && (
          <SubMenuList expanded={expanded}>
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </SubMenuList>
        )}
      </MenuItem>
    );
  };
  
  return (
    <NavigationContainer>
      {/* 로고 영역 */}
      <Logo>
        <div className="title">MES System</div>
        <div className="subtitle">제품정보 관리</div>
      </Logo>
      
      {/* 메뉴 목록 */}
      <MenuList>
        {filteredMenuItems.map(item => renderMenuItem(item))}
      </MenuList>
      
      {/* 사용자 정보 */}
      <UserInfo>
        <div className="user-name">Admin User</div>
        <div className="user-role">시스템 관리자</div>
      </UserInfo>
    </NavigationContainer>
  );
};

/**
 * 네비게이션과 함께 사용할 메인 레이아웃 컴포넌트
 */
const MainLayout = styled.div`
  display: flex;
  min-height: 100vh;
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: 250px;
  background: #f8f9fa;
  min-height: 100vh;
  overflow-x: auto;
`;

export { MainLayout, MainContent };