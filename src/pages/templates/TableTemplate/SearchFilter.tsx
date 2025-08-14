/**
 * 검색 및 필터 컴포넌트
 * 
 * 검색어 입력과 다양한 필터 조건을 제공합니다.
 * 기존 ProductSearchFilter를 일반화한 버전입니다.
 */

import React, { useState, useCallback } from 'react';
import { SearchField } from './types';
import { FilterCondition } from '../../../shared/types/common';
import { Card, Button, Flex, Input, Select } from '../../../presentation/utils/styled';

interface SearchFilterProps {
  fields: SearchField[];
  onSearch: (keyword: string) => void;
  onFilter: (filters: FilterCondition[]) => void;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  fields,
  onSearch,
  onFilter
}) => {
  // === 상태 관리 ===
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // === 검색어 처리 ===
  const handleSearch = useCallback(() => {
    onSearch(keyword.trim());
  }, [keyword, onSearch]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // === 필터 처리 ===
  const handleFilterChange = useCallback((fieldKey: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  }, []);

  const applyFilters = useCallback(() => {
    const conditions: FilterCondition[] = [];

    fields.forEach(field => {
      const value = filters[field.key];
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return;
      }

      conditions.push({
        field: field.key,
        operator: field.operator || 'eq',
        value,
        label: field.label
      });
    });

    onFilter(conditions);
  }, [fields, filters, onFilter]);

  const clearFilters = useCallback(() => {
    setKeyword('');
    setFilters({});
    onSearch('');
    onFilter([]);
  }, [onSearch, onFilter]);

  // === 필터 필드 렌더링 ===
  const renderFilterField = useCallback((field: SearchField) => {
    const value = filters[field.key] || '';

    switch (field.type) {
      case 'text':
        return (
          <Input
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFilterChange(field.key, e.target.value)}
          />
        );

      case 'select':
        return (
          <Select
            value={value}
            onChange={(e) => handleFilterChange(field.key, e.target.value)}
          >
            <option value="">전체</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFilterChange(field.key, e.target.value)}
          />
        );

      case 'dateRange':
        const dateRange = value || { start: '', end: '' };
        return (
          <Flex gap={8}>
            <Input
              type="date"
              placeholder="시작일"
              value={dateRange.start}
              onChange={(e) => handleFilterChange(field.key, { ...dateRange, start: e.target.value })}
            />
            <span style={{ alignSelf: 'center' }}>~</span>
            <Input
              type="date"
              placeholder="종료일"
              value={dateRange.end}
              onChange={(e) => handleFilterChange(field.key, { ...dateRange, end: e.target.value })}
            />
          </Flex>
        );

      default:
        return null;
    }
  }, [filters, handleFilterChange]);

  // === 렌더링 ===
  return (
    <Card style={{ marginBottom: '20px', padding: '16px' }}>
      {/* 기본 검색 */}
      <Flex gap={12} align="center" style={{ marginBottom: showAdvanced ? '16px' : '0' }}>
        <div style={{ flex: 1 }}>
          <Input
            placeholder="검색어를 입력하세요..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>
        <Button onClick={handleSearch}>검색</Button>
        {fields.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '간단 검색' : '상세 검색'}
          </Button>
        )}
      </Flex>

      {/* 고급 필터 */}
      {showAdvanced && fields.length > 0 && (
        <div style={{
          borderTop: '1px solid #e9ecef',
          paddingTop: '16px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {fields.map(field => (
              <div key={field.key}>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#495057'
                }}>
                  {field.label}
                </label>
                {renderFilterField(field)}
              </div>
            ))}
          </div>

          <Flex gap={8}>
            <Button onClick={applyFilters}>필터 적용</Button>
            <Button variant="secondary" onClick={clearFilters}>초기화</Button>
          </Flex>
        </div>
      )}
    </Card>
  );
};