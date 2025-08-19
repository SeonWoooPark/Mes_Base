import React, { useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { ProductListItem } from '@features/product/application/usecases/product/GetProductListUseCase';
import { 
  useProductSearch, 
  ProductSearchOptions, 
  highlightSearchTerm 
} from '@shared/hooks/useProductSearch';
import { Input, LoadingSpinner, Flex } from '@shared/utils/styled';

/**
 * 제품 검색 입력 컴포넌트 Props
 */
export interface ProductSearchInputProps {
  /** 제품 선택 시 콜백 */
  onSelect: (product: ProductListItem) => void;
  /** 검색 취소 시 콜백 */
  onCancel?: () => void;
  /** 검색 옵션 */
  searchOptions?: ProductSearchOptions;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 자동 포커스 여부 */
  autoFocus?: boolean;
  /** 검색 결과 표시 여부 */
  showResults?: boolean;
  /** 최대 높이 (검색 결과 영역) */
  maxHeight?: string;
  /** 스타일 커스터마이징 */
  className?: string;
  /** 기본 검색어 */
  defaultSearchTerm?: string;
}

/**
 * 스타일드 컴포넌트들
 */
const SearchContainer = styled.div`
  position: relative;
  width: 100%;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  
  .search-input {
    flex: 1;
    padding-right: 80px; /* 아이콘 및 버튼 공간 확보 */
  }
  
  .search-icons {
    position: absolute;
    right: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    pointer-events: none;
    
    .loading-icon {
      display: flex;
      align-items: center;
    }
    
    .search-icon {
      color: #999;
      font-size: 16px;
    }
    
    .clear-button {
      color: #666;
      cursor: pointer;
      padding: 4px;
      border-radius: 2px;
      pointer-events: auto;
      font-size: 14px;
      
      &:hover {
        background: #f0f0f0;
        color: #333;
      }
    }
  }
`;

const SearchResults = styled.div<{ show: boolean; maxHeight: string }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  
  max-height: ${props => props.show ? props.maxHeight : '0'};
  overflow: hidden;
  transition: max-height 0.2s ease;
`;

const SearchResultsList = styled.div<{ maxHeight: string }>`
  max-height: ${props => props.maxHeight};
  overflow-y: auto;
`;

const SearchResultItem = styled.div<{ isSelected: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s;
  
  background: ${props => props.isSelected ? '#e8f4fd' : 'white'};
  
  &:hover {
    background: ${props => props.isSelected ? '#d1ecf9' : '#f8f9fa'};
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  .product-code {
    font-weight: 600;
    color: #333;
    margin-bottom: 4px;
    font-size: 14px;
    
    .highlight {
      background: #ffeb3b;
      color: #333;
      padding: 1px 2px;
      border-radius: 2px;
    }
  }
  
  .product-name {
    color: #666;
    font-size: 13px;
    line-height: 1.3;
    
    .highlight {
      background: #ffeb3b;
      color: #333;
      padding: 1px 2px;
      border-radius: 2px;
    }
  }
  
  .product-meta {
    display: flex;
    gap: 12px;
    margin-top: 4px;
    font-size: 11px;
    color: #999;
    
    span {
      display: flex;
      align-items: center;
      gap: 2px;
    }
  }
`;

const SearchStatus = styled.div`
  padding: 16px;
  text-align: center;
  color: #666;
  font-size: 14px;
  
  &.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  
  &.no-results {
    color: #999;
    font-style: italic;
  }
  
  &.error {
    color: #dc3545;
  }
`;

const LoadMoreButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: #f8f9fa;
  border: none;
  border-top: 1px solid #e0e0e0;
  color: #007bff;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.2s;
  
  &:hover {
    background: #e9ecef;
  }
  
  &:disabled {
    cursor: not-allowed;
    color: #999;
  }
`;

/**
 * 제품 검색 입력 컴포넌트
 * 
 * 기능:
 * - 실시간 제품 검색
 * - 검색 결과 하이라이팅
 * - 키보드 네비게이션 (↑↓, Enter, Escape)
 * - 검색어 자동완성
 * - 로딩 상태 표시
 * - 무한 스크롤 지원
 * 
 * @example
 * ```tsx
 * <ProductSearchInput
 *   onSelect={(product) => handleProductSelect(product)}
 *   onCancel={() => setShowSearch(false)}
 *   placeholder="제품명 또는 제품코드로 검색..."
 *   autoFocus
 * />
 * ```
 */
export const ProductSearchInput: React.FC<ProductSearchInputProps> = ({
  onSelect,
  onCancel,
  searchOptions,
  placeholder = "제품명 또는 제품코드로 검색...",
  autoFocus = false,
  showResults = true,
  maxHeight = "300px",
  className,
  defaultSearchTerm = "",
}) => {
  // === Refs ===
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // === 제품 검색 훅 ===
  const { searchState, searchActions } = useProductSearch(searchOptions);
  const {
    searchTerm,
    debouncedSearchTerm,
    isSearching,
    searchResult,
    selectedIndex,
  } = searchState;
  
  // === 초기값 설정 ===
  useEffect(() => {
    if (defaultSearchTerm && defaultSearchTerm !== searchTerm) {
      searchActions.setSearchTerm(defaultSearchTerm);
    }
  }, [defaultSearchTerm]);
  
  // === 자동 포커스 ===
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);
  
  // === 키보드 이벤트 핸들러 ===
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        searchActions.selectNext();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        searchActions.selectPrevious();
        break;
        
      case 'Enter':
        e.preventDefault();
        const selectedProduct = searchActions.getSelectedProduct();
        if (selectedProduct) {
          onSelect(selectedProduct);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        if (searchTerm) {
          searchActions.clearSearch();
        } else if (onCancel) {
          onCancel();
        }
        break;
    }
  }, [searchActions, onSelect, onCancel, searchTerm]);
  
  // === 검색어 변경 핸들러 ===
  const handleSearchTermChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    searchActions.setSearchTerm(e.target.value);
  }, [searchActions]);
  
  // === 검색어 클리어 핸들러 ===
  const handleClearSearch = useCallback(() => {
    searchActions.clearSearch();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchActions]);
  
  // === 제품 선택 핸들러 ===
  const handleProductSelect = useCallback((product: ProductListItem, index: number) => {
    searchActions.setSelectedIndex(index);
    onSelect(product);
  }, [searchActions, onSelect]);
  
  // === 하이라이팅 렌더링 ===
  const renderHighlightedText = useCallback((text: string, isHighlighted: boolean) => {
    if (!isHighlighted || !debouncedSearchTerm) {
      return text;
    }
    
    const highlights = highlightSearchTerm(text, debouncedSearchTerm, false);
    
    return (
      <>
        {highlights.map((part, index) => (
          <span key={index} className={part.isHighlight ? 'highlight' : ''}>
            {part.text}
          </span>
        ))}
      </>
    );
  }, [debouncedSearchTerm]);
  
  // === 검색 결과 표시 여부 ===
  const shouldShowResults = showResults && (searchTerm.length > 0 || searchResult.products.length > 0);
  
  return (
    <SearchContainer className={className}>
      {/* 검색 입력 영역 */}
      <SearchInputWrapper>
        <Input
          ref={inputRef}
          className="search-input"
          type="text"
          value={searchTerm}
          onChange={handleSearchTermChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
        />
        
        <div className="search-icons">
          {isSearching ? (
            <div className="loading-icon">
              <LoadingSpinner style={{ width: '16px', height: '16px' }} />
            </div>
          ) : (
            <span className="search-icon">🔍</span>
          )}
          
          {searchTerm && (
            <span className="clear-button" onClick={handleClearSearch} title="검색어 지우기">
              ✖️
            </span>
          )}
        </div>
      </SearchInputWrapper>
      
      {/* 검색 결과 영역 */}
      <SearchResults show={shouldShowResults} maxHeight={maxHeight}>
        <SearchResultsList maxHeight={maxHeight}>
          {isSearching && searchResult.products.length === 0 ? (
            <SearchStatus className="loading">
              <LoadingSpinner style={{ width: '16px', height: '16px' }} />
              <span>검색 중...</span>
            </SearchStatus>
          ) : searchResult.products.length > 0 ? (
            <>
              {searchResult.products.map((product, index) => {
                const highlight = searchResult.highlights.get(product.id) || { name: false, code: false };
                const isSelected = index === selectedIndex;
                
                return (
                  <SearchResultItem
                    key={product.id}
                    isSelected={isSelected}
                    onClick={() => handleProductSelect(product, index)}
                    onMouseEnter={() => searchActions.setSelectedIndex(index)}
                  >
                    <div className="product-code">
                      {renderHighlightedText(product.cd_material, highlight.code)}
                    </div>
                    <div className="product-name">
                      {renderHighlightedText(product.nm_material, highlight.name)}
                    </div>
                    <div className="product-meta">
                      <span>📦 {product.type}</span>
                      <span>📏 {product.unitName}</span>
                      {product.safetyStock > 0 && (
                        <span>📊 재고: {product.safetyStock}</span>
                      )}
                    </div>
                  </SearchResultItem>
                );
              })}
              
              {/* 더보기 버튼 */}
              {searchResult.hasMore && (
                <LoadMoreButton
                  onClick={searchActions.loadMore}
                  disabled={isSearching}
                >
                  더 보기 ({searchResult.totalCount - searchResult.displayedCount}개 남음)
                </LoadMoreButton>
              )}
            </>
          ) : debouncedSearchTerm && searchResult.products.length === 0 ? (
            <SearchStatus className="no-results">
              '{debouncedSearchTerm}'에 대한 검색 결과가 없습니다.
            </SearchStatus>
          ) : null}
        </SearchResultsList>
      </SearchResults>
    </SearchContainer>
  );
};