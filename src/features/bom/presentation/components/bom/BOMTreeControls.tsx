import React, { useState, useCallback } from 'react';
import { BOMTreeFilter } from '../../hooks/useBOMTree';
import { ComponentType } from '../../../domain/entities/BOMItem';
import { 
  Button, 
  Input, 
  Select, 
  FormGroup, 
  Flex, 
  Card 
} from '@shared/utils/styled';

/**
 * BOM 트리 제어 Props
 */
interface BOMTreeControlsProps {
  // 트리 제어 액션들
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExpandToLevel: (level: number) => void;
  onRefresh: () => void;
  
  // 필터링
  currentFilter: BOMTreeFilter;
  onFilterChange: (filter: BOMTreeFilter) => void;
  onClearFilter: () => void;
  
  // 내보내기/가져오기
  onExport?: () => void;
  onImport?: () => void;
  
  // 상태
  loading?: boolean;
  disabled?: boolean;
  
  // 통계 정보
  totalItems: number;
  filteredItems: number;
  maxLevel: number;
}

/**
 * BOM 트리 제어 컴포넌트
 * 
 * 기능:
 * - 트리 펼침/접기 제어
 * - 레벨별 펼침
 * - 검색 및 필터링
 * - 내보내기/가져오기
 * - 통계 정보 표시
 */
export const BOMTreeControls: React.FC<BOMTreeControlsProps> = ({
  onExpandAll,
  onCollapseAll,
  onExpandToLevel,
  onRefresh,
  currentFilter,
  onFilterChange,
  onClearFilter,
  onExport,
  onImport,
  loading = false,
  disabled = false,
  totalItems,
  filteredItems,
  maxLevel,
}) => {
  // === 상태 관리 ===
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [expandLevel, setExpandLevel] = useState(2);

  // === 필터 업데이트 헬퍼 ===
  const updateFilter = useCallback((updates: Partial<BOMTreeFilter>) => {
    onFilterChange({ ...currentFilter, ...updates });
  }, [currentFilter, onFilterChange]);

  // === 필터 초기화 ===
  const handleClearFilter = useCallback(() => {
    onClearFilter();
    setShowAdvancedFilter(false);
  }, [onClearFilter]);

  // === 컴포넌트 유형 필터 토글 ===
  const toggleComponentType = useCallback((type: ComponentType) => {
    const current = currentFilter.componentTypes || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    
    updateFilter({ componentTypes: updated.length > 0 ? updated : undefined });
  }, [currentFilter.componentTypes, updateFilter]);

  return (
    <Card style={{ marginBottom: '16px' }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>BOM 트리 제어</h3>
        
        {/* 통계 정보 */}
        <div style={{ fontSize: '14px', color: '#666' }}>
          {filteredItems !== totalItems 
            ? `${filteredItems}/${totalItems}개 항목 (${maxLevel}레벨)`
            : `${totalItems}개 항목 (${maxLevel}레벨)`
          }
        </div>
      </Flex>

      {/* 주요 제어 버튼들 */}
      <Flex gap={8} style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
        <Button
          onClick={onRefresh}
          disabled={loading || disabled}
          title="BOM 트리 새로고침"
        >
          🔄 새로고침
        </Button>
        
        <Button
          variant="secondary"
          onClick={onExpandAll}
          disabled={loading || disabled}
          title="모든 노드 펼치기"
        >
          📂 전체 펼침
        </Button>
        
        <Button
          variant="secondary"
          onClick={onCollapseAll}
          disabled={loading || disabled}
          title="모든 노드 접기"
        >
          📁 전체 접기
        </Button>
        
        {/* 레벨별 펼침 */}
        <Flex gap={4} align="center">
          <Input
            type="number"
            min="1"
            max={maxLevel}
            value={expandLevel}
            onChange={(e) => setExpandLevel(parseInt(e.target.value) || 1)}
            style={{ width: '60px' }}
            disabled={loading || disabled}
          />
          <Button
            variant="secondary"
            onClick={() => onExpandToLevel(expandLevel)}
            disabled={loading || disabled}
            title={`${expandLevel}레벨까지 펼치기`}
          >
            레벨 펼침
          </Button>
        </Flex>

        {/* 내보내기/가져오기 */}
        {onExport && (
          <Button
            variant="secondary"
            onClick={onExport}
            disabled={loading || disabled}
            title="BOM 데이터 내보내기"
          >
            📤 내보내기
          </Button>
        )}
        
        {onImport && (
          <Button
            variant="secondary"
            onClick={onImport}
            disabled={loading || disabled}
            title="BOM 데이터 가져오기"
          >
            📥 가져오기
          </Button>
        )}
      </Flex>

      {/* 검색 및 기본 필터 */}
      <Flex gap={12} style={{ marginBottom: '12px', flexWrap: 'wrap' }}>
        {/* 텍스트 검색 */}
        <FormGroup style={{ margin: 0, flex: 1, minWidth: '200px' }}>
          <Input
            type="text"
            placeholder="구성품명, 코드, 위치로 검색..."
            value={currentFilter.searchKeyword || ''}
            onChange={(e) => updateFilter({ searchKeyword: e.target.value || undefined })}
            disabled={loading || disabled}
          />
        </FormGroup>

        {/* 활성상태 필터 */}
        <FormGroup style={{ margin: 0 }}>
          <Select
            value={currentFilter.includeInactive ? 'all' : 'active'}
            onChange={(e) => {
              const value = e.target.value;
              updateFilter({ 
                includeInactive: value === 'all' ? true : false
              });
            }}
            disabled={loading || disabled}
            style={{ width: '120px' }}
          >
            <option value="all">전체</option>
            <option value="active">활성만</option>
          </Select>
        </FormGroup>

        {/* 선택사항 필터 */}
        <FormGroup style={{ margin: 0 }}>
          <Select
            value={currentFilter.includeOptional ? 'all' : 'required'}
            onChange={(e) => {
              const value = e.target.value;
              updateFilter({ 
                includeOptional: value === 'all' ? true : false
              });
            }}
            disabled={loading || disabled}
            style={{ width: '120px' }}
          >
            <option value="all">필수/선택</option>
            <option value="required">필수만</option>
          </Select>
        </FormGroup>

        {/* 고급 필터 토글 */}
        <Button
          variant="secondary"
          onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          disabled={loading || disabled}
        >
          {showAdvancedFilter ? '간단히' : '고급 필터'}
        </Button>

        {/* 필터 초기화 */}
        {(currentFilter.searchKeyword || 
          currentFilter.includeInactive !== undefined || 
          currentFilter.includeOptional !== undefined ||
          currentFilter.componentTypes?.length ||
          currentFilter.levelRange ||
          currentFilter.costRange) && (
          <Button
            variant="danger"
            onClick={handleClearFilter}
            disabled={loading || disabled}
            title="모든 필터 초기화"
          >
            ✕ 초기화
          </Button>
        )}
      </Flex>

      {/* 고급 필터 옵션 */}
      {showAdvancedFilter && (
        <div style={{ 
          padding: '16px', 
          background: '#f8f9fa', 
          borderRadius: '4px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>고급 필터</h4>
          
          {/* 구성품 유형 필터 */}
          <FormGroup style={{ margin: '0 0 12px 0' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>구성품 유형</label>
            <Flex gap={8} style={{ flexWrap: 'wrap' }}>
              {Object.values(ComponentType).map(type => (
                <label key={type} style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={currentFilter.componentTypes?.includes(type) || false}
                    onChange={() => toggleComponentType(type)}
                    disabled={loading || disabled}
                    style={{ marginRight: '4px' }}
                  />
                  {(() => {
                    switch (type) {
                      case ComponentType.RAW_MATERIAL: return '원자재';
                      case ComponentType.SEMI_FINISHED: return '반제품';
                      case ComponentType.PURCHASED_PART: return '구매품';
                      case ComponentType.SUB_ASSEMBLY: return '조립품';
                      case ComponentType.CONSUMABLE: return '소모품';
                      default: return type;
                    }
                  })()}
                </label>
              ))}
            </Flex>
          </FormGroup>

          {/* 비용 범위 필터 */}
          <FormGroup style={{ margin: '0 0 12px 0' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>단가 범위</label>
            <Flex gap={8} align="center">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="최소"
                value={currentFilter.costRange?.min || ''}
                onChange={(e) => {
                  const min = e.target.value ? parseFloat(e.target.value) : undefined;
                  updateFilter({ 
                    costRange: {
                      ...currentFilter.costRange,
                      min
                    }
                  });
                }}
                disabled={loading || disabled}
                style={{ width: '100px' }}
              />
              <span>~</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="최대"
                value={currentFilter.costRange?.max || ''}
                onChange={(e) => {
                  const max = e.target.value ? parseFloat(e.target.value) : undefined;
                  updateFilter({ 
                    costRange: {
                      ...currentFilter.costRange,
                      max
                    }
                  });
                }}
                disabled={loading || disabled}
                style={{ width: '100px' }}
              />
              <span>원</span>
            </Flex>
          </FormGroup>

          {/* 레벨 범위 필터 */}
          <FormGroup style={{ margin: 0 }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>레벨 범위</label>
            <Flex gap={8} align="center">
              <Input
                type="number"
                min="1"
                max={maxLevel}
                placeholder="최소"
                value={currentFilter.levelRange?.min || ''}
                onChange={(e) => {
                  const min = e.target.value ? parseInt(e.target.value) : undefined;
                  updateFilter({ 
                    levelRange: {
                      ...currentFilter.levelRange,
                      min
                    }
                  });
                }}
                disabled={loading || disabled}
                style={{ width: '80px' }}
              />
              <span>~</span>
              <Input
                type="number"
                min="1"
                max={maxLevel}
                placeholder="최대"
                value={currentFilter.levelRange?.max || ''}
                onChange={(e) => {
                  const max = e.target.value ? parseInt(e.target.value) : undefined;
                  updateFilter({ 
                    levelRange: {
                      ...currentFilter.levelRange,
                      max
                    }
                  });
                }}
                disabled={loading || disabled}
                style={{ width: '80px' }}
              />
              <span>레벨</span>
            </Flex>
          </FormGroup>
        </div>
      )}
    </Card>
  );
};