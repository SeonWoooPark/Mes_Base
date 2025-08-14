import React from 'react';
import styled from 'styled-components';
import { BOMTreeNode as BOMTreeNodeType } from '../../../application/usecases/bom/GetBOMTreeUseCase';
import { ComponentType } from '../../../domain/entities/BOMItem';
import { StatusBadge, Flex } from '@shared/utils/styled';

/**
 * BOM 트리 노드 Props
 */
interface BOMTreeNodeProps {
  node: BOMTreeNodeType;                   // 노드 데이터
  variant?: 'card' | 'compact' | 'detailed'; // 표시 형태
  showActions?: boolean;                   // 액션 버튼 표시 여부
  onClick?: (node: BOMTreeNodeType) => void; // 클릭 핸들러
  selected?: boolean;                      // 선택 상태
  className?: string;
}

/**
 * 노드 카드 스타일드 컴포넌트
 */
const NodeCard = styled.div<{ selected?: boolean; clickable?: boolean }>`
  background: white;
  border: 1px solid ${props => props.selected ? '#007bff' : '#ddd'};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 8px;
  box-shadow: ${props => props.selected ? '0 2px 8px rgba(0,123,255,0.15)' : '0 1px 3px rgba(0,0,0,0.1)'};
  transition: all 0.2s;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  
  &:hover {
    ${props => props.clickable && `
      border-color: #007bff;
      box-shadow: 0 2px 6px rgba(0,123,255,0.15);
    `}
  }
`;

const NodeHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const NodeTitle = styled.div`
  .component-name {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    margin-bottom: 4px;
  }
  
  .component-code {
    font-size: 12px;
    color: #666;
    font-family: monospace;
  }
`;

const NodeMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
`;

const NodeContent = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 12px;
`;

const InfoItem = styled.div`
  .label {
    font-size: 11px;
    color: #666;
    text-transform: uppercase;
    font-weight: 500;
    margin-bottom: 2px;
  }
  
  .value {
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }
  
  .sub-value {
    font-size: 11px;
    color: #666;
    margin-top: 1px;
  }
`;

const ComponentTypeIcon = styled.span<{ type: ComponentType }>`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  color: white;
  margin-right: 8px;
  
  ${props => {
    switch (props.type) {
      case ComponentType.RAW_MATERIAL:
        return 'background-color: #6c757d;';
      case ComponentType.SEMI_FINISHED:
        return 'background-color: #fd7e14;';
      case ComponentType.PURCHASED_PART:
        return 'background-color: #20c997;';
      case ComponentType.SUB_ASSEMBLY:
        return 'background-color: #0d6efd;';
      case ComponentType.CONSUMABLE:
        return 'background-color: #dc3545;';
      default:
        return 'background-color: #6c757d;';
    }
  }}
`;

const CompactNode = styled.div<{ selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: ${props => props.selected ? '#e3f2fd' : 'white'};
  border: 1px solid ${props => props.selected ? '#2196f3' : '#eee'};
  border-radius: 4px;
  font-size: 14px;
  
  .node-info {
    flex: 1;
  }
  
  .node-stats {
    font-size: 12px;
    color: #666;
    text-align: right;
  }
`;

/**
 * BOM 트리 노드 컴포넌트
 * 
 * 기능:
 * - 다양한 표시 형태 지원 (카드, 컴팩트, 상세)
 * - 구성품 유형별 시각적 구분
 * - 계층 레벨 표시
 * - 비용 정보 표시
 * - 선택 상태 관리
 */
export const BOMTreeNode: React.FC<BOMTreeNodeProps> = ({
  node,
  variant = 'card',
  showActions = false,
  onClick,
  selected = false,
  className,
}) => {

  // === 구성품 유형 표시명 매핑 ===
  const componentTypeLabels: Record<ComponentType, string> = {
    [ComponentType.RAW_MATERIAL]: '원자재',
    [ComponentType.SEMI_FINISHED]: '반제품', 
    [ComponentType.PURCHASED_PART]: '구매품',
    [ComponentType.SUB_ASSEMBLY]: '조립품',
    [ComponentType.CONSUMABLE]: '소모품',
  };

  const handleClick = () => {
    if (onClick) {
      onClick(node);
    }
  };

  // === 컴팩트 형태 렌더링 ===
  if (variant === 'compact') {
    return (
      <CompactNode 
        selected={selected} 
        onClick={handleClick}
        className={className}
      >
        <ComponentTypeIcon type={node.componentType as ComponentType}>
          {componentTypeLabels[node.componentType as ComponentType]?.[0] || 'C'}
        </ComponentTypeIcon>
        
        <div className="node-info">
          <div style={{ fontWeight: 'bold' }}>{node.componentName}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{node.componentCode}</div>
        </div>
        
        <div className="node-stats">
          <div>{node.quantity.toLocaleString()} {node.unitName}</div>
          <div>₩{node.totalCost.toLocaleString()}</div>
        </div>
      </CompactNode>
    );
  }

  // === 카드 형태 렌더링 ===
  return (
    <NodeCard 
      selected={selected}
      clickable={!!onClick}
      onClick={handleClick}
      className={className}
    >
      <NodeHeader>
        <NodeTitle>
          <div className="component-name">
            <ComponentTypeIcon type={node.componentType as ComponentType}>
              {componentTypeLabels[node.componentType as ComponentType]?.[0] || 'C'}
            </ComponentTypeIcon>
            {node.componentName}
          </div>
          <div className="component-code">{node.componentCode}</div>
        </NodeTitle>
        
        <NodeMeta>
          <div style={{ fontSize: '11px', color: '#999' }}>
            Level {node.level}
          </div>
          <StatusBadge active={node.isActive} style={{ fontSize: '10px' }}>
            {node.isActive ? '활성' : '비활성'}
          </StatusBadge>
          {node.isOptional && (
            <StatusBadge active={false} style={{ fontSize: '10px' }}>
              선택
            </StatusBadge>
          )}
        </NodeMeta>
      </NodeHeader>

      <NodeContent>
        {/* 구성품 유형 */}
        <InfoItem>
          <div className="label">유형</div>
          <div className="value">{node.componentTypeDisplay}</div>
        </InfoItem>

        {/* 수량 정보 */}
        <InfoItem>
          <div className="label">수량</div>
          <div className="value">{node.quantity.toLocaleString()} {node.unitName}</div>
          {node.actualQuantity !== node.quantity && (
            <div className="sub-value">실제: {node.actualQuantity.toLocaleString()}</div>
          )}
        </InfoItem>

        {/* 단가 */}
        <InfoItem>
          <div className="label">단가</div>
          <div className="value">₩{node.unitCost.toLocaleString()}</div>
        </InfoItem>

        {/* 총 비용 */}
        <InfoItem>
          <div className="label">총 비용</div>
          <div className="value">₩{node.totalCost.toLocaleString()}</div>
        </InfoItem>

        {/* 스크랩률 */}
        {node.scrapRate > 0 && (
          <InfoItem>
            <div className="label">스크랩률</div>
            <div className="value">{node.scrapRate}%</div>
          </InfoItem>
        )}

        {/* 위치 */}
        {node.position && (
          <InfoItem>
            <div className="label">위치</div>
            <div className="value">{node.position}</div>
          </InfoItem>
        )}

        {/* 공정 */}
        {node.processStep && (
          <InfoItem>
            <div className="label">공정</div>
            <div className="value">{node.processStep}</div>
          </InfoItem>
        )}
      </NodeContent>

      {/* 비고 */}
      {node.remarks && (
        <div style={{ marginTop: '12px', padding: '8px', background: '#f8f9fa', borderRadius: '4px' }}>
          <div className="label" style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>비고</div>
          <div style={{ fontSize: '13px' }}>{node.remarks}</div>
        </div>
      )}
    </NodeCard>
  );
};

/**
 * 노드 리스트 컴포넌트 - 여러 노드를 목록 형태로 표시
 */
interface BOMNodeListProps {
  nodes: BOMTreeNodeType[];
  variant?: 'card' | 'compact';
  selectedNodes?: Set<string>;
  onSelectNode?: (nodeId: string, selected: boolean) => void;
  onNodeClick?: (node: BOMTreeNodeType) => void;
}

export const BOMNodeList: React.FC<BOMNodeListProps> = ({
  nodes,
  variant = 'compact',
  selectedNodes = new Set(),
  onSelectNode,
  onNodeClick,
}) => {
  return (
    <div>
      {nodes.map(node => (
        <BOMTreeNode
          key={node.id}
          node={node}
          variant={variant}
          selected={selectedNodes.has(node.id)}
          onClick={onNodeClick}
        />
      ))}
    </div>
  );
};