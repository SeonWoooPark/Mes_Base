import React from 'react';
import { BOMTreeNode } from '../../../application/usecases/bom/GetBOMTreeUseCase';
import { Button, Flex } from '@shared/utils/styled';
import { ComponentType } from '../../../domain/entities/BOMItem';

/**
 * BOM 아이템 액션 Props
 */
interface BOMItemActionsProps {
  node: BOMTreeNode;                       // BOM 트리 노드
  onEdit: () => void;                      // 수정 핸들러
  onDelete: () => void;                    // 삭제 핸들러
  onAddChild: () => void;                  // 하위 구성품 추가 핸들러
  disabled?: boolean;                      // 비활성화 상태
  readonly?: boolean;                      // 읽기 전용 모드
}

/**
 * BOM 아이템별 액션 버튼 컴포넌트
 * 
 * 기능:
 * - 구성품별 상황에 맞는 액션 제공
 * - 비즈니스 규칙에 따른 버튼 활성화/비활성화
 * - 시각적 구분을 위한 아이콘 표시
 */
export const BOMItemActions: React.FC<BOMItemActionsProps> = ({
  node,
  onEdit,
  onDelete,
  onAddChild,
  disabled = false,
  readonly = false,
}) => {
  
  // === 비즈니스 규칙 검증 ===
  
  /**
   * 하위 구성품 추가 가능 여부 확인
   * - 원자재나 구매품은 하위 구성품을 가질 수 없음
   * - 소모품은 하위 구성품을 가질 수 없음
   */
  const canAddChild = (): boolean => {
    const nonAssemblyTypes = [
      ComponentType.RAW_MATERIAL,
      ComponentType.PURCHASED_PART,
      ComponentType.CONSUMABLE,
    ];
    
    return !nonAssemblyTypes.includes(node.componentType as ComponentType);
  };

  /**
   * 삭제 가능 여부 확인
   * - 필수 구성품(isOptional = false)은 삭제 시 경고 필요
   * - 하위 구성품이 있는 경우 확인 필요
   */
  const canDelete = (): boolean => {
    return node.isActive; // 비활성 아이템은 이미 삭제된 것으로 간주
  };

  /**
   * 수정 가능 여부 확인  
   * - 비활성 아이템도 수정 가능 (재활성화 목적)
   */
  const canEdit = (): boolean => {
    return true; // 모든 아이템 수정 가능
  };

  // === 클릭 핸들러들 ===
  
  const handleEdit = () => {
    if (!disabled && !readonly && canEdit()) {
      onEdit();
    }
  };

  const handleDelete = () => {
    if (!disabled && !readonly && canDelete()) {
      // 중요한 구성품 삭제 시 추가 확인
      const isImportant = !node.isOptional || node.totalCost > 100000;
      
      let confirmMessage = `구성품 '${node.componentName}'을(를) 삭제하시겠습니까?`;
      
      if (isImportant) {
        confirmMessage += '\n\n⚠️ 이 구성품은 필수 구성품이거나 고가의 구성품입니다.';
      }
      
      if (window.confirm(confirmMessage)) {
        onDelete();
      }
    }
  };

  const handleAddChild = () => {
    if (!disabled && !readonly && canAddChild()) {
      onAddChild();
    }
  };

  // === 읽기 전용 모드 ===
  if (readonly) {
    return (
      <Flex gap={4}>
        <Button
          variant="secondary"
          onClick={() => onEdit()} // 읽기 전용에서도 상세 보기는 가능
          style={{ fontSize: '12px', padding: '4px 8px' }}
        >
          보기
        </Button>
      </Flex>
    );
  }

  // === 메인 렌더링 ===
  return (
    <Flex gap={4}>
      {/* 수정 버튼 */}
      <Button
        variant="secondary"
        onClick={handleEdit}
        disabled={disabled || !canEdit()}
        style={{ fontSize: '12px', padding: '4px 8px' }}
        title="구성품 정보 수정"
      >
        수정
      </Button>

      {/* 하위 추가 버튼 - 조립품 유형만 표시 */}
      {canAddChild() && (
        <Button
          onClick={handleAddChild}
          disabled={disabled}
          style={{ 
            fontSize: '12px', 
            padding: '4px 8px',
            background: '#28a745',
            color: 'white'
          }}
          title="하위 구성품 추가"
        >
          +추가
        </Button>
      )}

      {/* 삭제 버튼 */}
      <Button
        variant="danger"
        onClick={handleDelete}
        disabled={disabled || !canDelete()}
        style={{ fontSize: '12px', padding: '4px 8px' }}
        title={node.isOptional ? "구성품 삭제" : "필수 구성품 삭제 (주의 필요)"}
      >
        삭제
      </Button>
    </Flex>
  );
};

/**
 * 액션 그룹 컴포넌트 - 여러 아이템에 대한 일괄 작업
 */
interface BOMBatchActionsProps {
  selectedNodes: BOMTreeNode[];            // 선택된 노드들
  onBatchEdit: () => void;                 // 일괄 수정
  onBatchDelete: () => void;               // 일괄 삭제
  onBatchMove: () => void;                 // 일괄 이동
  disabled?: boolean;
}

export const BOMBatchActions: React.FC<BOMBatchActionsProps> = ({
  selectedNodes,
  onBatchEdit,
  onBatchDelete,
  onBatchMove,
  disabled = false,
}) => {
  const hasSelection = selectedNodes.length > 0;

  if (!hasSelection) {
    return null;
  }

  return (
    <Flex gap={8} style={{ 
      padding: '12px',
      background: '#f8f9fa',
      borderRadius: '4px',
      border: '1px solid #dee2e6',
      margin: '16px 0'
    }}>
      <div style={{ fontSize: '14px', color: '#666' }}>
        {selectedNodes.length}개 항목 선택됨
      </div>
      
      <Flex gap={4}>
        <Button
          variant="secondary"
          onClick={onBatchEdit}
          disabled={disabled}
          style={{ fontSize: '12px', padding: '4px 8px' }}
        >
          일괄 수정
        </Button>
        
        <Button
          onClick={onBatchMove}
          disabled={disabled}
          style={{ fontSize: '12px', padding: '4px 8px' }}
        >
          이동
        </Button>
        
        <Button
          variant="danger"
          onClick={() => {
            if (window.confirm(`선택된 ${selectedNodes.length}개 구성품을 삭제하시겠습니까?`)) {
              onBatchDelete();
            }
          }}
          disabled={disabled}
          style={{ fontSize: '12px', padding: '4px 8px' }}
        >
          일괄 삭제
        </Button>
      </Flex>
    </Flex>
  );
};