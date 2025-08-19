import { useState, useMemo, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { ProductListItem } from '@features/product/application/usecases/product/GetProductListUseCase';
import { useProductList } from '@features/product/presentation/hooks/useProductList';

/**
 * 검색 옵션 타입
 */
export interface ProductSearchOptions {
  /** 최대 검색 결과 수 */
  maxResults?: number;
  /** 검색할 필드들 */
  searchFields?: ('name' | 'code')[];
  /** 대소문자 구분 여부 */
  caseSensitive?: boolean;
  /** 최소 검색어 길이 */
  minLength?: number;
  /** 디바운스 지연 시간 (ms) */
  debounceDelay?: number;
}

/**
 * 검색 결과 타입
 */
export interface ProductSearchResult {
  /** 검색된 제품 목록 */
  products: ProductListItem[];
  /** 검색어 하이라이팅 정보 */
  highlights: Map<string, { name: boolean; code: boolean }>;
  /** 전체 검색 결과 수 */
  totalCount: number;
  /** 표시된 결과 수 */
  displayedCount: number;
  /** 더 많은 결과가 있는지 여부 */
  hasMore: boolean;
}

/**
 * 검색 상태 타입
 */
export interface ProductSearchState {
  /** 현재 검색어 */
  searchTerm: string;
  /** 디바운스된 검색어 */
  debouncedSearchTerm: string;
  /** 검색 중 여부 */
  isSearching: boolean;
  /** 검색 결과 */
  searchResult: ProductSearchResult;
  /** 선택된 제품 인덱스 (키보드 네비게이션용) */
  selectedIndex: number;
}

/**
 * 검색 액션 타입
 */
export interface ProductSearchActions {
  /** 검색어 설정 */
  setSearchTerm: (term: string) => void;
  /** 검색어 클리어 */
  clearSearch: () => void;
  /** 제품 선택 (키보드 네비게이션) */
  selectNext: () => void;
  /** 이전 제품 선택 (키보드 네비게이션) */
  selectPrevious: () => void;
  /** 현재 선택된 제품 가져오기 */
  getSelectedProduct: () => ProductListItem | null;
  /** 인덱스로 제품 선택 */
  setSelectedIndex: (index: number) => void;
  /** 검색 결과 더 보기 */
  loadMore: () => void;
}

/**
 * 기본 검색 옵션
 */
const defaultOptions: Required<ProductSearchOptions> = {
  maxResults: 50,
  searchFields: ['name', 'code'],
  caseSensitive: false,
  minLength: 1,
  debounceDelay: 300,
};

/**
 * 제품 검색 전용 커스텀 훅
 * 
 * 기능:
 * - 실시간 제품 검색 및 필터링
 * - 디바운싱을 통한 성능 최적화
 * - 검색어 하이라이팅 지원
 * - 키보드 네비게이션 지원
 * - 검색 결과 페이지네이션
 * 
 * @param options 검색 옵션
 * @returns 검색 상태와 액션들
 * 
 * @example
 * ```tsx
 * const { searchState, searchActions } = useProductSearch({
 *   maxResults: 20,
 *   searchFields: ['name', 'code']
 * });
 * 
 * const handleSearch = (term: string) => {
 *   searchActions.setSearchTerm(term);
 * };
 * ```
 */
export const useProductSearch = (
  options: ProductSearchOptions = {}
): {
  searchState: ProductSearchState;
  searchActions: ProductSearchActions;
} => {
  // === 옵션 병합 ===
  const opts = { ...defaultOptions, ...options };
  
  // === 상태 관리 ===
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [currentMaxResults, setCurrentMaxResults] = useState(opts.maxResults);
  
  // === 디바운싱 ===
  const debouncedSearchTerm = useDebounce(searchTerm, opts.debounceDelay);
  
  // === 제품 데이터 ===
  const { products: allProducts, loading: productsLoading } = useProductList();
  
  // === 검색 로직 ===
  const searchResult = useMemo((): ProductSearchResult => {
    if (!debouncedSearchTerm || debouncedSearchTerm.length < opts.minLength) {
      return {
        products: [],
        highlights: new Map(),
        totalCount: 0,
        displayedCount: 0,
        hasMore: false,
      };
    }
    
    const searchTermLower = opts.caseSensitive ? debouncedSearchTerm : debouncedSearchTerm.toLowerCase();
    const highlights = new Map<string, { name: boolean; code: boolean }>();
    
    // 검색 필터링
    const filteredProducts = allProducts.filter((product) => {
      let nameMatch = false;
      let codeMatch = false;
      
      if (opts.searchFields.includes('name')) {
        const productName = opts.caseSensitive ? product.nm_material : product.nm_material.toLowerCase();
        nameMatch = productName.includes(searchTermLower);
      }
      
      if (opts.searchFields.includes('code')) {
        const productCode = opts.caseSensitive ? product.cd_material : product.cd_material.toLowerCase();
        codeMatch = productCode.includes(searchTermLower);
      }
      
      const isMatch = nameMatch || codeMatch;
      
      if (isMatch) {
        highlights.set(product.id, { name: nameMatch, code: codeMatch });
      }
      
      return isMatch;
    });
    
    // 정렬: 제품코드 일치 > 제품명 일치 > 알파벳 순
    const sortedProducts = [...filteredProducts].sort((a, b) => {
      const aHighlight = highlights.get(a.id)!;
      const bHighlight = highlights.get(b.id)!;
      
      // 제품코드 일치 우선
      if (aHighlight.code && !bHighlight.code) return -1;
      if (!aHighlight.code && bHighlight.code) return 1;
      
      // 제품명 일치 우선
      if (aHighlight.name && !bHighlight.name) return -1;
      if (!aHighlight.name && bHighlight.name) return 1;
      
      // 알파벳 순 정렬
      return a.cd_material.localeCompare(b.cd_material);
    });
    
    const totalCount = sortedProducts.length;
    const displayedProducts = sortedProducts.slice(0, currentMaxResults);
    const displayedCount = displayedProducts.length;
    const hasMore = totalCount > displayedCount;
    
    return {
      products: displayedProducts,
      highlights,
      totalCount,
      displayedCount,
      hasMore,
    };
  }, [debouncedSearchTerm, allProducts, opts, currentMaxResults]);
  
  // === 검색 상태 계산 ===
  const isSearching = productsLoading || (searchTerm !== debouncedSearchTerm);
  
  // === 액션 함수들 ===
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSelectedIndex(-1);
    setCurrentMaxResults(opts.maxResults);
  }, [opts.maxResults]);
  
  const selectNext = useCallback(() => {
    setSelectedIndex(prev => {
      const maxIndex = searchResult.products.length - 1;
      return prev < maxIndex ? prev + 1 : prev;
    });
  }, [searchResult.products.length]);
  
  const selectPrevious = useCallback(() => {
    setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
  }, []);
  
  const getSelectedProduct = useCallback((): ProductListItem | null => {
    if (selectedIndex >= 0 && selectedIndex < searchResult.products.length) {
      return searchResult.products[selectedIndex];
    }
    return null;
  }, [selectedIndex, searchResult.products]);
  
  const loadMore = useCallback(() => {
    setCurrentMaxResults(prev => prev + opts.maxResults);
  }, [opts.maxResults]);
  
  // === 검색어 변경 시 선택 인덱스 리셋 ===
  useMemo(() => {
    setSelectedIndex(-1);
  }, [debouncedSearchTerm]);
  
  // === 반환값 ===
  const searchState: ProductSearchState = {
    searchTerm,
    debouncedSearchTerm,
    isSearching,
    searchResult,
    selectedIndex,
  };
  
  const searchActions: ProductSearchActions = {
    setSearchTerm,
    clearSearch,
    selectNext,
    selectPrevious,
    getSelectedProduct,
    setSelectedIndex,
    loadMore,
  };
  
  return {
    searchState,
    searchActions,
  };
};

/**
 * 검색어 하이라이팅 유틸리티 함수
 * 
 * @param text 원본 텍스트
 * @param searchTerm 검색어
 * @param caseSensitive 대소문자 구분 여부
 * @returns 하이라이팅된 텍스트 조각들
 */
export const highlightSearchTerm = (
  text: string,
  searchTerm: string,
  caseSensitive: boolean = false
): Array<{ text: string; isHighlight: boolean }> => {
  if (!searchTerm) {
    return [{ text, isHighlight: false }];
  }
  
  const searchRegex = new RegExp(
    `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    caseSensitive ? 'g' : 'gi'
  );
  
  const parts = text.split(searchRegex);
  
  return parts.map((part, index) => ({
    text: part,
    isHighlight: index % 2 === 1, // 정규식으로 분할된 홀수 인덱스가 매치된 부분
  }));
};