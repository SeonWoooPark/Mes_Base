import React, { useEffect, useRef, useState } from 'react';
import { ProductListItem } from '../../../application/usecases/product/GetProductListUseCase';
import { useProductSearch, highlightSearchTerm } from '@shared/hooks/useProductSearch';
import { useSimpleKeyboardNavigation } from '@shared/hooks/useSimpleKeyboardNavigation';

interface ProductSearchDropdownProps {
  /** 검색어 */
  searchTerm: string;
  /** 드롭다운 표시 여부 */
  isOpen: boolean;
  /** 드롭다운 닫기 */
  onClose: () => void;
  /** 제품 선택 시 콜백 */
  onSelect: (product: ProductListItem) => void;
  /** 검색어 변경 콜백 */
  onSearchChange?: (searchTerm: string) => void;
  /** 최대 표시 결과 수 */
  maxResults?: number;
  /** 입력 필드 참조 (위치 계산용) */
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const ProductSearchDropdown: React.FC<ProductSearchDropdownProps> = ({
  searchTerm,
  isOpen,
  onClose,
  onSelect,
  onSearchChange,
  maxResults = 10,
  inputRef,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // 제품 검색 훅 사용
  const { searchState, searchActions } = useProductSearch({
    maxResults,
    searchFields: ['name', 'code'],
    debounceDelay: 200,
  });

  // 검색어 동기화
  useEffect(() => {
    if (searchTerm !== searchState.searchTerm) {
      searchActions.setSearchTerm(searchTerm);
    }
  }, [searchTerm, searchState.searchTerm, searchActions]);

  // 키보드 네비게이션 설정
  const { handleKeyDown } = useSimpleKeyboardNavigation({
    itemCount: searchState.searchResult.products.length,
    selectedIndex,
    onSelectionChange: setSelectedIndex,
    onSelect: (index) => {
      const product = searchState.searchResult.products[index];
      if (product) {
        onSelect(product);
        onClose();
      }
    },
    onEscape: onClose,
  });

  // 외부 클릭으로 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef?.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, inputRef]);

  // 키보드 이벤트 리스너
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (isOpen) {
        handleKeyDown(event);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleGlobalKeyDown);
      return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // 드롭다운이 열릴 때 선택 인덱스 초기화
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // 검색어가 변경될 때 선택 인덱스 초기화
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchState.debouncedSearchTerm]);

  if (!isOpen) return null;

  const { products, totalCount, displayedCount, hasMore } = searchState.searchResult;
  const { isSearching } = searchState;
  const showAllProducts = !searchTerm.trim();

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: 'white',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        zIndex: 1000,
        maxHeight: '300px',
        overflowY: 'auto',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #e5e7eb',
          fontSize: '12px',
          color: '#6b7280',
          backgroundColor: '#f9fafb',
        }}
      >
        {isSearching ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                border: '2px solid #e5e7eb',
                borderTop: '2px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            검색 중...
          </div>
        ) : showAllProducts ? (
          `전체 제품 목록 (${totalCount}개)`
        ) : (
          `검색 결과 ${displayedCount}/${totalCount}개`
        )}
      </div>

      {/* 검색 결과 목록 */}
      <div role="listbox" aria-label="제품 검색 결과">
        {products.length === 0 ? (
          <div
            style={{
              padding: '16px 12px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px',
            }}
          >
            {showAllProducts ? '데이터가 없습니다.' : '검색 결과가 없습니다.'}
          </div>
        ) : (
          products.map((product, index) => {
            const isSelected = index === selectedIndex;
            const highlight = searchState.searchResult.highlights.get(product.id);

            return (
              <div
                key={product.id}
                role="option"
                aria-selected={isSelected}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#eff6ff' : 'white',
                  borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
                }}
                onClick={() => {
                  onSelect(product);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    {/* 제품코드 */}
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>
                      {highlight?.code ? (
                        <HighlightedText
                          text={product.cd_material}
                          searchTerm={searchTerm}
                        />
                      ) : (
                        product.cd_material
                      )}
                    </div>
                    
                    {/* 제품명 */}
                    <div style={{ fontSize: '12px', color: '#4b5563' }}>
                      {highlight?.name ? (
                        <HighlightedText
                          text={product.nm_material}
                          searchTerm={searchTerm}
                        />
                      ) : (
                        product.nm_material
                      )}
                    </div>
                  </div>
                  
                  {/* 제품 유형 */}
                  <div
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '12px',
                      color: '#374151',
                      whiteSpace: 'nowrap',
                      marginLeft: '8px',
                    }}
                  >
                    {product.typeName}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 더보기 버튼 */}
      {hasMore && (
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            textAlign: 'center',
          }}
        >
          <button
            onClick={() => searchActions.loadMore()}
            style={{
              fontSize: '12px',
              color: '#3b82f6',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            더보기 ({totalCount - displayedCount}개 더)
          </button>
        </div>
      )}

      {/* CSS 애니메이션 */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

/**
 * 검색어 하이라이팅 컴포넌트
 */
const HighlightedText: React.FC<{
  text: string;
  searchTerm: string;
}> = ({ text, searchTerm }) => {
  const parts = highlightSearchTerm(text, searchTerm, false);

  return (
    <>
      {parts.map((part, index) => (
        <span
          key={index}
          style={{
            backgroundColor: part.isHighlight ? '#fef3c7' : 'transparent',
            fontWeight: part.isHighlight ? 600 : 400,
          }}
        >
          {part.text}
        </span>
      ))}
    </>
  );
};