import React, { useState } from 'react';
import styled from 'styled-components';
import { Flex } from '@shared/utils/styled';

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
 * 기본 메뉴 구조 (실제 구현된 페이지만)
 */
const defaultMenuItems: NavigationItem[] = [
  {
    id: 'products',
    label: '제품 관리',
    icon: '📦',
    path: '/products',
    permission: 'products.view'
  },
  {
    id: 'bom',
    label: 'BOM 관리',
    icon: '🏗️',
    path: '/bom',
    permission: 'bom.view'
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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // === 권한 체크 ===
  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true;
    
    // 권한이 없는 경우 기본 메뉴는 허용 (개발/테스트용)
    if (!userPermissions || userPermissions.length === 0) {
      const defaultPermissions = ['products.view', 'bom.view'];
      return defaultPermissions.includes(permission);
    }
    
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
  
  // === 디버깅 로그 (개발용) ===
  if (process.env.NODE_ENV === 'development') {
    console.log('Navigation - User permissions:', userPermissions);
    console.log('Navigation - Filtered menu items:', filteredMenuItems.map(item => ({ id: item.id, label: item.label })));
  }
  
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