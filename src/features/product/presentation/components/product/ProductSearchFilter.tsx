import React, { useState, useCallback, useRef } from 'react';
import { ProductFilter } from '../../../domain/repositories/ProductRepository';
import { ProductType } from '../../../domain/entities/Product';
import { ProductListItem } from '../../../application/usecases/product/GetProductListUseCase';
import { Input, Select, Button } from '@shared/utils/styled';
import { useDebounce } from '@shared/hooks/useDebounce';
import { ProductSearchDropdown } from './ProductSearchDropdown';

interface ProductSearchFilterProps {
  onSearch: (keyword: string) => void;
  onFilter: (filters: ProductFilter[]) => void;
  onProductSelect?: (product: ProductListItem) => void; // 자동완성에서 제품 선택 시 콜백
}

export const ProductSearchFilter: React.FC<ProductSearchFilterProps> = ({
  onSearch,
  onFilter,
  onProductSelect,
}) => {
  // === 상태 관리 ===
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // === Refs ===
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // === 디바운스된 검색어 ===
  const debouncedSearchKeyword = useDebounce(searchKeyword, 150);
  
  // === 디바운스된 검색어 변경 시 자동 검색 실행 ===
  React.useEffect(() => {
    // 디바운스된 검색어로 검색 실행 (빈 문자열도 포함 - 초기화 목적)
    const trimmedKeyword = debouncedSearchKeyword.trim();
    console.log('📝 Search Filter: Debounced search triggered', {
      original: debouncedSearchKeyword,
      trimmed: trimmedKeyword,
      timestamp: new Date().toISOString()
    });
    onSearch(trimmedKeyword);
  }, [debouncedSearchKeyword, onSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchKeyword.trim());
    setIsDropdownOpen(false); // 검색 시 드롭다운 닫기
  };

  const handleFilterChange = useCallback(() => {
    const filters: ProductFilter[] = [];

    if (selectedType) {
      filters.push({ field: 'type', value: selectedType });
    }

    if (selectedStatus !== '') {
      filters.push({ field: 'isActive', value: selectedStatus === 'active' });
    }

    onFilter(filters);
    // onFilter는 부모에서 전달되는 prop이므로 의존성에 넣으면 불안정해져 무한 루프의 원인이 될 수 있음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedStatus]);

  const handleClear = () => {
    // 모든 상태 초기화
    setSearchKeyword('');
    setSelectedType('');
    setSelectedStatus('');
    setIsDropdownOpen(false);
    
    // 전체 데이터 표시를 위해 빈 검색어와 빈 필터 전달
    onSearch('');
    onFilter([]);
  };

  // === 자동완성 관련 핸들러 ===
  const handleInputFocus = () => {
    setIsFocused(true);
    setIsDropdownOpen(true);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    // 약간의 지연을 두어 드롭다운 클릭이 가능하도록 함
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsDropdownOpen(false);
      }
    }, 150);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchKeyword(value);
    
    // 검색어가 있거나 포커스 상태일 때 드롭다운 열기
    if (isFocused) {
      setIsDropdownOpen(true);
    }
  };

  const handleProductSelect = (product: ProductListItem) => {
    // 선택된 제품의 이름을 검색어로 설정
    setSearchKeyword(product.nm_material);
    setIsDropdownOpen(false);
    
    // 부모 컴포넌트에 선택된 제품 전달
    if (onProductSelect) {
      onProductSelect(product);
    }
    
    // 검색어를 즉시 적용
    onSearch(product.nm_material);
  };

  const handleDropdownClose = () => {
    setIsDropdownOpen(false);
  };

  // === 필터 변경 시 자동 적용 ===
  React.useEffect(() => {
    handleFilterChange();
  }, [handleFilterChange]);

  return (
    <div
      ref={containerRef}
      style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '20px', 
        alignItems: 'center',
        flexWrap: 'nowrap', // 한 줄에 모든 요소 표시
        overflow: 'auto' // 필요시 스크롤
      }}
    >
      {/* 검색 입력 영역 - 자동완성 포함 */}
      <div style={{ position: 'relative', flex: 1, minWidth: '0' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Input
              ref={inputRef}
              type="text"
              placeholder="제품코드, 제품명으로 검색..."
              value={searchKeyword}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              style={{ 
                flex: 1, 
                minWidth: '200px',
                paddingRight: searchKeyword ? '32px' : '12px', // Clear 버튼 공간
              }}
              autoComplete="off"
            />
            
            {/* 검색어 삭제 버튼 */}
            {searchKeyword && (
              <button
                type="button"
                onClick={() => {
                  setSearchKeyword('');
                  setIsDropdownOpen(false);
                  // 검색어 즉시 초기화 및 전체 데이터 표시
                  onSearch('');
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#6b7280',
                  padding: '2px',
                  borderRadius: '50%',
                }}
              >
                ×
              </button>
            )}
          </div>
          <Button type="submit" style={{ whiteSpace: 'nowrap' }}>검색</Button>
        </form>

        {/* 자동완성 드롭다운 */}
        <ProductSearchDropdown
          searchTerm={searchKeyword}
          isOpen={isDropdownOpen}
          onClose={handleDropdownClose}
          onSelect={handleProductSelect}
          maxResults={10}
          inputRef={inputRef}
        />
      </div>

      {/* 필터 선택 영역 */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          style={{ minWidth: '100px', width: '100px' }}
          aria-label="제품 유형 필터"
        >
          <option value="">전체 유형</option>
          <option value={ProductType.FINISHED_PRODUCT}>완제품</option>
          <option value={ProductType.SEMI_FINISHED}>반제품</option>
          <option value={ProductType.RAW_MATERIAL}>원자재</option>
        </Select>

        <Select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{ minWidth: '100px', width: '100px' }}
          aria-label="제품 상태 필터"
        >
          <option value="">전체 상태</option>
          <option value="active">사용</option>
          <option value="inactive">미사용</option>
        </Select>

        <Button 
          variant="secondary" 
          onClick={handleClear} 
          style={{ whiteSpace: 'nowrap' }}
          title="모든 필터 초기화"
        >
          초기화
        </Button>
      </div>
    </div>
  );
};