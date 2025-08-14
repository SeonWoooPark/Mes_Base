import React, { useState } from 'react';
import { ProductFilter } from '../../../domain/repositories/ProductRepository';
import { ProductType } from '../../../domain/entities/Product';
import { SearchContainer, Input, Select, Button, Flex } from '../../utils/styled';

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

  const handleFilterChange = () => {
    const filters: ProductFilter[] = [];

    if (selectedType) {
      filters.push({ field: 'type', value: selectedType });
    }

    if (selectedStatus !== '') {
      filters.push({ field: 'isActive', value: selectedStatus === 'active' });
    }

    onFilter(filters);
  };

  const handleClear = () => {
    setSearchKeyword('');
    setSelectedType('');
    setSelectedStatus('');
    onSearch('');
    onFilter([]);
  };

  React.useEffect(() => {
    handleFilterChange();
  }, [selectedType, selectedStatus, onFilter]);

  return (
    <SearchContainer>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1 }}>
        <Input
          type="text"
          placeholder="제품코드, 제품명으로 검색..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          style={{ minWidth: '300px' }}
        />
        <Button type="submit">검색</Button>
      </form>

      <Flex gap={12}>
        <div>
          <Select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ minWidth: '120px' }}
          >
            <option value="">전체 유형</option>
            <option value={ProductType.FINISHED_PRODUCT}>완제품</option>
            <option value={ProductType.SEMI_FINISHED}>반제품</option>
            <option value={ProductType.RAW_MATERIAL}>원자재</option>
          </Select>
        </div>

        <div>
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ minWidth: '100px' }}
          >
            <option value="">전체 상태</option>
            <option value="active">사용</option>
            <option value="inactive">미사용</option>
          </Select>
        </div>

        <Button variant="secondary" onClick={handleClear}>
          초기화
        </Button>
      </Flex>
    </SearchContainer>
  );
};