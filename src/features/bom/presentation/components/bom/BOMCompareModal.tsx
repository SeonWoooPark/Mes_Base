import React, { useState, useCallback, useMemo } from 'react';
import { ProductListItem } from '@features/product/application/usecases/product/GetProductListUseCase';
import { BOMTreeNode } from '../../../application/usecases/bom/GetBOMTreeUseCase';
import { DifferenceType } from '../../../application/usecases/bom/CompareBOMUseCase';
import { useBOMComparison } from '../../hooks/useBOMComparison';
import { 
  Modal,
  ModalContent,
  Button, 
  Select, 
  FormGroup, 
  Flex, 
  Card,
  LoadingSpinner,
  StatusBadge
} from '@shared/utils/styled';
import styled from 'styled-components';

/**
 * BOM 비교 모달 Props
 */
interface BOMCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductListItem[];             // 비교 가능한 제품 목록
  initialSourceProductId?: string;         // 초기 원본 제품 ID
  initialTargetProductId?: string;         // 초기 대상 제품 ID
}

/**
 * 비교 트리 스타일 컴포넌트
 */
const ComparisonContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: 500px;
  overflow: hidden;
`;

const TreePanel = styled.div<{ side: 'source' | 'target' }>`
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  .header {
    padding: 12px 16px;
    background: ${props => props.side === 'source' ? '#e3f2fd' : '#fff3e0'};
    border-bottom: 1px solid #ddd;
    font-weight: bold;
    font-size: 14px;
  }
  
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
`;

const TreeNode = styled.div<{ 
  level: number; 
  differenceType?: DifferenceType;
  isHighlighted?: boolean;
}>`
  padding: 6px 8px;
  padding-left: ${props => 8 + props.level * 16}px;
  margin-bottom: 2px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  
  ${props => {
    if (props.differenceType === DifferenceType.ADDED) {
      return 'background: #d4edda; border-left: 3px solid #28a745;';
    }
    if (props.differenceType === DifferenceType.REMOVED) {
      return 'background: #f8d7da; border-left: 3px solid #dc3545;';
    }
    if (props.differenceType === DifferenceType.QUANTITY_CHANGED || 
        props.differenceType === DifferenceType.COST_CHANGED ||
        props.differenceType === DifferenceType.PROPERTIES_CHANGED) {
      return 'background: #fff3cd; border-left: 3px solid #ffc107;';
    }
    return props.isHighlighted ? 'background: #f8f9fa;' : 'background: white;';
  }}
  
  &:hover {
    background: ${props => {
      if (props.differenceType) return 'current';
      return '#f0f0f0';
    }};
  }
  
  .node-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .node-details {
    flex: 1;
    min-width: 0;
  }
  
  .name {
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .code {
    color: #666;
    font-family: monospace;
    font-size: 10px;
  }
  
  .stats {
    display: flex;
    gap: 8px;
    font-size: 10px;
    color: #666;
  }
`;

const DifferenceFilters = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const FilterChip = styled.button<{ active: boolean; color: string }>`
  padding: 4px 8px;
  border: 1px solid ${props => props.color};
  background: ${props => props.active ? props.color : 'white'};
  color: ${props => props.active ? 'white' : props.color};
  border-radius: 12px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.color};
    color: white;
  }
`;

const StatsSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
  
  .stat-item {
    text-align: center;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 4px;
    
    .value {
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
    
    .label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
    }
  }
`;

/**
 * BOM 비교 모달 컴포넌트
 * 
 * 기능:
 * - 두 제품의 BOM 구조 시각적 비교
 * - 차이점 하이라이팅 및 필터링
 * - 통계 정보 표시
 * - 비교 결과 내보내기
 */
export const BOMCompareModal: React.FC<BOMCompareModalProps> = ({
  isOpen,
  onClose,
  products,
  initialSourceProductId,
  initialTargetProductId,
}) => {
  // === 로컬 상태 ===
  const [sourceProductId, setSourceProductId] = useState(initialSourceProductId || '');
  const [targetProductId, setTargetProductId] = useState(initialTargetProductId || '');
  const [hasCompared, setHasCompared] = useState(false);
  
  // === BOM 비교 훅 ===
  const {
    loading,
    error,
    comparison,
    differences,
    statistics,
    showOnlyDifferences,
    selectedDifferenceTypes,
    expandedNodes,
    compareProducts,
    reset,
    setShowOnlyDifferences,
    toggleDifferenceType,
    expandNode,
    collapseNode,
    expandAll,
    collapseAll,
    expandDifferences,
    exportComparison,
  } = useBOMComparison();
  
  // === 제품 정보 ===
  const sourceProduct = useMemo(() => 
    products.find(p => p.id === sourceProductId), [products, sourceProductId]
  );
  
  const targetProduct = useMemo(() => 
    products.find(p => p.id === targetProductId), [products, targetProductId]
  );
  
  // === 차이점 맵 생성 ===
  const differenceMap = useMemo(() => {
    const map = new Map<string, DifferenceType>();
    differences.forEach(diff => {
      if (diff.sourceNode) {
        map.set(diff.sourceNode.id, diff.type);
      }
      if (diff.targetNode) {
        map.set(diff.targetNode.id, diff.type);
      }
    });
    return map;
  }, [differences]);
  
  // === 필터된 노드들 ===
  const filteredNodes = useMemo(() => {
    if (!comparison) return { source: [], target: [] };
    
    const filterNodes = (nodes: BOMTreeNode[]) => {
      if (!showOnlyDifferences) return nodes;
      
      return nodes.filter(node => {
        const diffType = differenceMap.get(node.id);
        return diffType && selectedDifferenceTypes.has(diffType);
      });
    };
    
    return {
      source: filterNodes(comparison.sourceTree),
      target: filterNodes(comparison.targetTree)
    };
  }, [comparison, showOnlyDifferences, differenceMap, selectedDifferenceTypes]);
  
  // === 비교 실행 ===
  const handleCompare = useCallback(async () => {
    if (!sourceProductId || !targetProductId) {
      alert('비교할 두 제품을 선택해주세요.');
      return;
    }
    
    if (sourceProductId === targetProductId) {
      alert('다른 제품을 선택해주세요.');
      return;
    }
    
    try {
      await compareProducts(sourceProductId, targetProductId);
      setHasCompared(true);
    } catch (error) {
      console.error('Comparison error:', error);
    }
  }, [sourceProductId, targetProductId, compareProducts]);
  
  // === 모달 닫기 ===
  const handleClose = useCallback(() => {
    reset();
    setSourceProductId('');
    setTargetProductId('');
    setHasCompared(false);
    onClose();
  }, [reset, onClose]);
  
  // === 내보내기 ===
  const handleExport = useCallback(async () => {
    try {
      await exportComparison();
      alert('비교 결과가 성공적으로 내보내졌습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '내보내기 중 오류가 발생했습니다.');
    }
  }, [exportComparison]);
  
  // === 차이점 유형별 색상 ===
  const getDifferenceTypeColor = (type: DifferenceType): string => {
    switch (type) {
      case DifferenceType.ADDED: return '#28a745';
      case DifferenceType.REMOVED: return '#dc3545';
      case DifferenceType.QUANTITY_CHANGED: return '#ffc107';
      case DifferenceType.COST_CHANGED: return '#fd7e14';
      case DifferenceType.PROPERTIES_CHANGED: return '#6f42c1';
      default: return '#6c757d';
    }
  };
  
  // === 차이점 유형별 라벨 ===
  const getDifferenceTypeLabel = (type: DifferenceType): string => {
    switch (type) {
      case DifferenceType.ADDED: return '추가됨';
      case DifferenceType.REMOVED: return '제거됨';
      case DifferenceType.QUANTITY_CHANGED: return '수량 변경';
      case DifferenceType.COST_CHANGED: return '비용 변경';
      case DifferenceType.PROPERTIES_CHANGED: return '속성 변경';
      default: return type;
    }
  };
  
  // === 트리 노드 렌더링 ===
  const renderTreeNode = useCallback((node: BOMTreeNode, side: 'source' | 'target') => {
    const differenceType = differenceMap.get(node.id);
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = (side === 'source' ? comparison?.sourceTree : comparison?.targetTree)
      ?.some(n => n.parentId === node.id) || false;
    
    return (
      <TreeNode
        key={node.id}
        level={node.level}
        differenceType={differenceType}
        onClick={() => hasChildren ? (isExpanded ? collapseNode(node.id) : expandNode(node.id)) : undefined}
      >
        <div className="node-info">
          <div className="node-details">
            <div className="name" title={node.componentName}>
              {hasChildren && (isExpanded ? '▼' : '▶')} {node.componentName}
            </div>
            <div className="code">{node.componentCode}</div>
          </div>
          <div className="stats">
            <span>{node.quantity.toLocaleString()}{node.unitName}</span>
            <span>₩{node.totalCost.toLocaleString()}</span>
          </div>
        </div>
      </TreeNode>
    );
  }, [comparison, differenceMap, expandedNodes, expandNode, collapseNode]);
  
  return (
    <Modal isOpen={isOpen}>
      <ModalContent>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>BOM 비교</h2>
          <Button variant="secondary" onClick={handleClose}>닫기</Button>
        </div>
          {/* 제품 선택 */}
          <Card style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>비교할 제품 선택</h3>
          
          <Flex gap={16} style={{ marginBottom: '16px' }}>
            <FormGroup style={{ flex: 1 }}>
              <label>원본 제품 (A)</label>
              <Select
                value={sourceProductId}
                onChange={(e) => setSourceProductId(e.target.value)}
                disabled={loading}
              >
                <option value="">제품을 선택하세요</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.nm_material} ({product.cd_material})
                  </option>
                ))}
              </Select>
            </FormGroup>
            
            <FormGroup style={{ flex: 1 }}>
              <label>대상 제품 (B)</label>
              <Select
                value={targetProductId}
                onChange={(e) => setTargetProductId(e.target.value)}
                disabled={loading}
              >
                <option value="">제품을 선택하세요</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.nm_material} ({product.cd_material})
                  </option>
                ))}
              </Select>
            </FormGroup>
          </Flex>
          
          <Flex gap={8}>
            <Button
              onClick={handleCompare}
              disabled={!sourceProductId || !targetProductId || loading}
            >
              {loading ? <LoadingSpinner /> : '비교 시작'}
            </Button>
            
            {hasCompared && (
              <Button variant="secondary" onClick={() => { reset(); setHasCompared(false); }}>
                초기화
              </Button>
            )}
          </Flex>
        </Card>
        
        {/* 에러 메시지 */}
        {error && (
          <Card style={{ marginBottom: '20px', background: '#f8d7da', border: '1px solid #dc3545' }}>
            <div style={{ color: '#721c24' }}>{error}</div>
          </Card>
        )}
        
        {/* 비교 결과 */}
        {comparison && (
          <>
            {/* 통계 요약 */}
            <Card style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0' }}>비교 결과 요약</h3>
              
              <StatsSummary>
                <div className="stat-item">
                  <div className="value">{statistics.totalItems}</div>
                  <div className="label">총 구성품</div>
                </div>
                <div className="stat-item" style={{ background: '#d4edda' }}>
                  <div className="value" style={{ color: '#155724' }}>{statistics.addedItems}</div>
                  <div className="label">추가됨</div>
                </div>
                <div className="stat-item" style={{ background: '#f8d7da' }}>
                  <div className="value" style={{ color: '#721c24' }}>{statistics.removedItems}</div>
                  <div className="label">제거됨</div>
                </div>
                <div className="stat-item" style={{ background: '#fff3cd' }}>
                  <div className="value" style={{ color: '#856404' }}>{statistics.modifiedItems}</div>
                  <div className="label">수정됨</div>
                </div>
                <div className="stat-item">
                  <div className="value">{statistics.unchangedItems}</div>
                  <div className="label">변경없음</div>
                </div>
                <div className="stat-item">
                  <div className="value" style={{ color: statistics.costDifference >= 0 ? '#dc3545' : '#28a745' }}>
                    {statistics.costDifference >= 0 ? '+' : ''}₩{statistics.costDifference.toLocaleString()}
                  </div>
                  <div className="label">비용 차이</div>
                </div>
              </StatsSummary>
            </Card>
            
            {/* 필터 및 제어 */}
            <Card style={{ marginBottom: '20px' }}>
              <Flex justify="space-between" align="center" style={{ marginBottom: '12px' }}>
                <h3 style={{ margin: 0 }}>차이점 필터</h3>
                <Flex gap={8}>
                  <Button variant="secondary" onClick={expandAll}>
                    전체 펼침
                  </Button>
                  <Button variant="secondary" onClick={collapseAll}>
                    전체 접기
                  </Button>
                  <Button variant="secondary" onClick={expandDifferences}>
                    차이점 펼침
                  </Button>
                  <Button variant="secondary" onClick={handleExport}>
                    내보내기
                  </Button>
                </Flex>
              </Flex>
              
              <Flex gap={8} style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                  <input
                    type="checkbox"
                    checked={showOnlyDifferences}
                    onChange={(e) => setShowOnlyDifferences(e.target.checked)}
                    style={{ marginRight: '4px' }}
                  />
                  차이점만 표시
                </label>
              </Flex>
              
              <DifferenceFilters>
                {Object.values(DifferenceType).map(type => (
                  <FilterChip
                    key={type}
                    active={selectedDifferenceTypes.has(type)}
                    color={getDifferenceTypeColor(type)}
                    onClick={() => toggleDifferenceType(type)}
                  >
                    {getDifferenceTypeLabel(type)}
                  </FilterChip>
                ))}
              </DifferenceFilters>
            </Card>
            
            {/* 비교 트리 */}
            <ComparisonContainer>
              <TreePanel side="source">
                <div className="header">
                  {sourceProduct ? `${sourceProduct.nm_material} (${sourceProduct.cd_material})` : '원본 제품'}
                </div>
                <div className="content">
                  {filteredNodes.source.map(node => renderTreeNode(node, 'source'))}
                </div>
              </TreePanel>
              
              <TreePanel side="target">
                <div className="header">
                  {targetProduct ? `${targetProduct.nm_material} (${targetProduct.cd_material})` : '대상 제품'}
                </div>
                <div className="content">
                  {filteredNodes.target.map(node => renderTreeNode(node, 'target'))}
                </div>
              </TreePanel>
            </ComparisonContainer>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};