import { useEffect, useCallback, useState, useRef } from 'react';

/**
 * 키보드 네비게이션 설정
 */
export interface KeyboardNavigationConfig {
  // 네비게이션 키 활성화
  enableArrowKeys?: boolean;           // 방향키 (상하좌우)
  enableEnterKey?: boolean;            // Enter 키
  enableSpaceKey?: boolean;            // Space 키
  enableEscapeKey?: boolean;           // Escape 키
  enableTabKey?: boolean;              // Tab 키
  
  // 검색 기능
  enableTypeAhead?: boolean;           // 타입-어헤드 검색
  typeAheadTimeout?: number;           // 검색 타임아웃 (ms)
  
  // 다중 선택
  enableMultiSelect?: boolean;         // Ctrl/Cmd + 클릭
  enableRangeSelect?: boolean;         // Shift + 클릭
  
  // 포커스 관리
  autoFocus?: boolean;                 // 자동 포커스
  focusOnMount?: boolean;              // 마운트 시 포커스
  
  // 스크롤 동작
  scrollIntoView?: boolean;            // 포커스된 항목으로 스크롤
  scrollBehavior?: 'auto' | 'smooth'; // 스크롤 동작
}

/**
 * 키보드 네비게이션 상태
 */
export interface KeyboardNavigationState {
  focusedIndex: number;                // 현재 포커스된 인덱스
  selectedIndexes: Set<number>;        // 선택된 인덱스들
  searchText: string;                  // 현재 검색 텍스트
  isSearching: boolean;                // 검색 중 여부
}

/**
 * 키보드 네비게이션 액션
 */
export interface KeyboardNavigationActions {
  setFocusedIndex: (index: number) => void;
  selectIndex: (index: number, multiSelect?: boolean) => void;
  selectRange: (startIndex: number, endIndex: number) => void;
  clearSelection: () => void;
  moveNext: () => void;
  movePrevious: () => void;
  moveFirst: () => void;
  moveLast: () => void;
  search: (text: string) => void;
  clearSearch: () => void;
}

/**
 * 아이템 매처 함수 타입
 */
export type ItemMatcher<T> = (item: T, searchText: string) => boolean;

/**
 * 기본 설정
 */
const defaultConfig: Required<KeyboardNavigationConfig> = {
  enableArrowKeys: true,
  enableEnterKey: true,
  enableSpaceKey: true,
  enableEscapeKey: true,
  enableTabKey: false,
  enableTypeAhead: true,
  typeAheadTimeout: 1000,
  enableMultiSelect: true,
  enableRangeSelect: true,
  autoFocus: true,
  focusOnMount: true,
  scrollIntoView: true,
  scrollBehavior: 'smooth',
};

/**
 * 키보드 네비게이션 커스텀 훅
 * 
 * 기능:
 * - 방향키 네비게이션
 * - 타입-어헤드 검색
 * - 다중 선택 (Ctrl+클릭, Shift+클릭)
 * - 키보드 단축키
 * - 포커스 관리
 * - 스크롤 동기화
 */
export const useKeyboardNavigation = <T>(
  items: T[],
  config: KeyboardNavigationConfig = {},
  itemMatcher?: ItemMatcher<T>
): KeyboardNavigationState & KeyboardNavigationActions => {
  
  const finalConfig = { ...defaultConfig, ...config };
  
  // === 상태 관리 ===
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // === 참조 ===
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSelectedIndexRef = useRef<number>(0);
  
  // === 검색 기능 ===
  const search = useCallback((text: string) => {
    if (!finalConfig.enableTypeAhead || !itemMatcher) return;
    
    setSearchText(text);
    setIsSearching(true);
    
    // 매칭되는 첫 번째 아이템으로 이동
    const matchedIndex = items.findIndex(item => itemMatcher(item, text));
    if (matchedIndex !== -1) {
      setFocusedIndex(matchedIndex);
    }
    
    // 타임아웃 후 검색 상태 초기화
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(false);
      setSearchText('');
    }, finalConfig.typeAheadTimeout);
  }, [items, itemMatcher, finalConfig.enableTypeAhead, finalConfig.typeAheadTimeout]);
  
  const clearSearch = useCallback(() => {
    setSearchText('');
    setIsSearching(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);
  
  // === 선택 관리 ===
  const selectIndex = useCallback((index: number, multiSelect = false) => {
    if (index < 0 || index >= items.length) return;
    
    if (multiSelect && finalConfig.enableMultiSelect) {
      setSelectedIndexes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
        return newSet;
      });
    } else {
      setSelectedIndexes(new Set([index]));
    }
    
    lastSelectedIndexRef.current = index;
  }, [items.length, finalConfig.enableMultiSelect]);
  
  const selectRange = useCallback((startIndex: number, endIndex: number) => {
    if (!finalConfig.enableRangeSelect) return;
    
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const rangeIndexes = new Set<number>();
    
    for (let i = start; i <= end; i++) {
      if (i >= 0 && i < items.length) {
        rangeIndexes.add(i);
      }
    }
    
    setSelectedIndexes(rangeIndexes);
  }, [items.length, finalConfig.enableRangeSelect]);
  
  const clearSelection = useCallback(() => {
    setSelectedIndexes(new Set());
  }, []);
  
  // === 네비게이션 액션 ===
  const moveNext = useCallback(() => {
    setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
  }, [items.length]);
  
  const movePrevious = useCallback(() => {
    setFocusedIndex(prev => Math.max(prev - 1, 0));
  }, []);
  
  const moveFirst = useCallback(() => {
    setFocusedIndex(0);
  }, []);
  
  const moveLast = useCallback(() => {
    setFocusedIndex(items.length - 1);
  }, [items.length]);
  
  // === 안전한 포커스 인덱스 설정 ===
  const safeSetFocusedIndex = useCallback((index: number) => {
    const safeIndex = Math.max(0, Math.min(index, items.length - 1));
    setFocusedIndex(safeIndex);
  }, [items.length]);
  
  // === 키보드 이벤트 처리 ===
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 입력 필드에서는 네비게이션 비활성화
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
    
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    
    switch (e.key) {
      case 'ArrowDown':
        if (finalConfig.enableArrowKeys) {
          e.preventDefault();
          if (isShift && finalConfig.enableRangeSelect) {
            selectRange(lastSelectedIndexRef.current, focusedIndex + 1);
          }
          moveNext();
        }
        break;
        
      case 'ArrowUp':
        if (finalConfig.enableArrowKeys) {
          e.preventDefault();
          if (isShift && finalConfig.enableRangeSelect) {
            selectRange(lastSelectedIndexRef.current, focusedIndex - 1);
          }
          movePrevious();
        }
        break;
        
      case 'Home':
        if (finalConfig.enableArrowKeys) {
          e.preventDefault();
          if (isCtrlOrCmd) {
            moveFirst();
          }
        }
        break;
        
      case 'End':
        if (finalConfig.enableArrowKeys) {
          e.preventDefault();
          if (isCtrlOrCmd) {
            moveLast();
          }
        }
        break;
        
      case 'Enter':
        if (finalConfig.enableEnterKey) {
          e.preventDefault();
          selectIndex(focusedIndex, isCtrlOrCmd);
        }
        break;
        
      case ' ':
        if (finalConfig.enableSpaceKey) {
          e.preventDefault();
          selectIndex(focusedIndex, isCtrlOrCmd);
        }
        break;
        
      case 'Escape':
        if (finalConfig.enableEscapeKey) {
          e.preventDefault();
          clearSelection();
          clearSearch();
        }
        break;
        
      case 'a':
        if (isCtrlOrCmd && finalConfig.enableMultiSelect) {
          e.preventDefault();
          // 전체 선택
          const allIndexes = new Set<number>();
          for (let i = 0; i < items.length; i++) {
            allIndexes.add(i);
          }
          setSelectedIndexes(allIndexes);
        }
        break;
        
      default:
        // 타입-어헤드 검색
        if (finalConfig.enableTypeAhead && 
            itemMatcher && 
            e.key.length === 1 && 
            !isCtrlOrCmd) {
          const newSearchText = searchText + e.key.toLowerCase();
          search(newSearchText);
        }
        break;
    }
  }, [
    focusedIndex,
    selectedIndexes,
    searchText,
    items.length,
    finalConfig,
    selectIndex,
    selectRange,
    clearSelection,
    clearSearch,
    moveNext,
    movePrevious,
    moveFirst,
    moveLast,
    search,
    itemMatcher,
  ]);
  
  // === 이벤트 리스너 등록 ===
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  // === 아이템 변경 시 포커스 조정 ===
  useEffect(() => {
    if (items.length === 0) {
      setFocusedIndex(0);
      setSelectedIndexes(new Set());
    } else if (focusedIndex >= items.length) {
      setFocusedIndex(items.length - 1);
    }
  }, [items.length, focusedIndex]);
  
  // === 마운트 시 포커스 ===
  useEffect(() => {
    if (finalConfig.focusOnMount && items.length > 0) {
      setFocusedIndex(0);
    }
  }, [finalConfig.focusOnMount, items.length]);
  
  // === 정리 ===
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    // 상태
    focusedIndex,
    selectedIndexes,
    searchText,
    isSearching,
    
    // 액션
    setFocusedIndex: safeSetFocusedIndex,
    selectIndex,
    selectRange,
    clearSelection,
    moveNext,
    movePrevious,
    moveFirst,
    moveLast,
    search,
    clearSearch,
  };
};