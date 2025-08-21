import { useCallback } from 'react';

/**
 * 간단한 키보드 네비게이션 옵션
 */
export interface SimpleKeyboardNavigationOptions {
  /** 네비게이션할 아이템 개수 */
  itemCount: number;
  /** 현재 선택된 인덱스 */
  selectedIndex: number;
  /** 선택 인덱스 변경 콜백 */
  onSelectionChange: (index: number) => void;
  /** 아이템 선택 콜백 */
  onSelect: (index: number) => void;
  /** Escape 키 콜백 */
  onEscape: () => void;
  /** 루프 네비게이션 여부 (기본: false) */
  loop?: boolean;
}

/**
 * 간단한 키보드 네비게이션 훅
 * 
 * 드롭다운, 리스트, 메뉴 등에서 기본적인 키보드 네비게이션 기능을 제공합니다.
 * 
 * 지원하는 키:
 * - ArrowDown: 다음 아이템으로 이동
 * - ArrowUp: 이전 아이템으로 이동
 * - Enter: 현재 아이템 선택
 * - Escape: 닫기
 * - Home: 첫 번째 아이템으로 이동
 * - End: 마지막 아이템으로 이동
 * 
 * @example
 * ```tsx
 * const { handleKeyDown } = useSimpleKeyboardNavigation({
 *   itemCount: items.length,
 *   selectedIndex,
 *   onSelectionChange: setSelectedIndex,
 *   onSelect: handleItemSelect,
 *   onEscape: handleClose,
 * });
 * 
 * // 키보드 이벤트 리스너에 연결
 * useEffect(() => {
 *   document.addEventListener('keydown', handleKeyDown);
 *   return () => document.removeEventListener('keydown', handleKeyDown);
 * }, [handleKeyDown]);
 * ```
 */
export const useSimpleKeyboardNavigation = ({
  itemCount,
  selectedIndex,
  onSelectionChange,
  onSelect,
  onEscape,
  loop = false,
}: SimpleKeyboardNavigationOptions) => {

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 아이템이 없으면 아무것도 하지 않음
    if (itemCount === 0) {
      return;
    }

    const { key, ctrlKey, metaKey, altKey } = event;

    // 수정키가 눌린 경우 무시
    if (ctrlKey || metaKey || altKey) {
      return;
    }

    let newIndex = selectedIndex;
    let shouldPreventDefault = false;

    switch (key) {
      case 'ArrowDown':
        shouldPreventDefault = true;
        if (selectedIndex < itemCount - 1) {
          newIndex = selectedIndex + 1;
        } else if (loop) {
          newIndex = 0;
        }
        break;

      case 'ArrowUp':
        shouldPreventDefault = true;
        if (selectedIndex > 0) {
          newIndex = selectedIndex - 1;
        } else if (loop) {
          newIndex = itemCount - 1;
        }
        break;

      case 'Home':
        shouldPreventDefault = true;
        newIndex = 0;
        break;

      case 'End':
        shouldPreventDefault = true;
        newIndex = itemCount - 1;
        break;

      case 'Enter':
        shouldPreventDefault = true;
        if (selectedIndex >= 0 && selectedIndex < itemCount) {
          onSelect(selectedIndex);
        }
        break;

      case 'Escape':
        shouldPreventDefault = true;
        onEscape();
        break;

      default:
        // 다른 키는 처리하지 않음
        break;
    }

    // 기본 동작 방지
    if (shouldPreventDefault) {
      event.preventDefault();
    }

    // 인덱스가 변경된 경우에만 업데이트
    if (newIndex !== selectedIndex) {
      onSelectionChange(newIndex);
    }
  }, [itemCount, selectedIndex, onSelectionChange, onSelect, onEscape, loop]);

  return {
    handleKeyDown,
  };
};