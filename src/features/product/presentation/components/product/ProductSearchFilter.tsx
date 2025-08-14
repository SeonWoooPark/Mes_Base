import React, { useState, useCallback } from 'react';
import { ProductFilter } from '../../../domain/repositories/ProductRepository';
import { ProductType } from '../../../domain/entities/Product';
import { Input, Select, Button } from '@shared/utils/styled';

interface ProductSearchFilterProps {
  onSearch: (keyword: string) => void;
  onFilter: (filters: ProductFilter[]) => void;
}

export const ProductSearchFilter: React.FC<ProductSearchFilterProps> = ({
  onSearch,
  onFilter,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchKeyword.trim());
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
  }, [selectedType, selectedStatus, onFilter]);

  const handleClear = () => {
    setSearchKeyword('');
    setSelectedType('');
    setSelectedStatus('');
    onSearch('');
    onFilter([]);
  };

  React.useEffect(() => {
    handleFilterChange();
  }, [handleFilterChange]);

  return (
    <div style={{ 
      display: 'flex', 
      gap: '12px', 
      marginBottom: '20px', 
      alignItems: 'center',
      flexWrap: 'nowrap', // 한 줄에 모든 요소 표시
      overflow: 'auto' // 필요시 스크롤
    }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '0' }}>
        <Input
          type="text"
          placeholder="제품코드, 제품명으로 검색..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }} // 반응형 크기 조정
        />
        <Button type="submit" style={{ whiteSpace: 'nowrap' }}>검색</Button>
      </form>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          style={{ minWidth: '100px', width: '100px' }}
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
        >
          <option value="">전체 상태</option>
          <option value="active">사용</option>
          <option value="inactive">미사용</option>
        </Select>

        <Button variant="secondary" onClick={handleClear} style={{ whiteSpace: 'nowrap' }}>
          초기화
        </Button>
      </div>
    </div>
  );
};