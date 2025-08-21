/**
 * 제품 이력 조회 모달 컴포넌트
 */

import React, { useState, useMemo } from 'react';
import { ProductHistoryItem } from '../../application/usecases/product/GetProductHistoryUseCase';
import { 
  Modal, 
  ModalContent,
  Button, 
  Table,
  Select,
  Input,
  Flex,
  StatusBadge,
  Card
} from '@shared/utils/styled';

interface ProductHistoryModalProps {
  isOpen: boolean;
  productName: string;
  productCode: string;
  histories: ProductHistoryItem[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const ProductHistoryModal: React.FC<ProductHistoryModalProps> = ({
  isOpen,
  productName,
  productCode,
  histories,
  loading,
  error,
  onClose,
  onRefresh,
}) => {
  // 필터 및 검색 상태
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 필터링된 이력 목록
  const filteredHistories = useMemo(() => {
    let filtered = histories;

    // 액션 필터
    if (actionFilter !== 'ALL') {
      filtered = filtered.filter(history => history.action === actionFilter);
    }

    // 검색어 필터
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(history => 
        history.userName.toLowerCase().includes(keyword) ||
        history.reason?.toLowerCase().includes(keyword) ||
        history.changedFields.fieldName.toLowerCase().includes(keyword) ||
        String(history.changedFields.oldValue || '').toLowerCase().includes(keyword) ||
        String(history.changedFields.newValue || '').toLowerCase().includes(keyword)
      );
    }

    return filtered;
  }, [histories, actionFilter, searchKeyword]);

  // 액션별 배지 색상
  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return '#28a745'; // 초록색
      case 'UPDATE':
        return '#ffc107'; // 노란색
      case 'DELETE':
        return '#dc3545'; // 빨간색
      case 'ACTIVATE':
        return '#17a2b8'; // 청록색
      case 'DEACTIVATE':
        return '#6c757d'; // 회색
      default:
        return '#007bff'; // 파란색
    }
  };

  // 날짜 포맷팅
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  // 필드 값 표시 (null/undefined 처리)
  const formatFieldValue = (value: any) => {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'boolean') {
      return value ? '예' : '아니오';
    }
    return String(value);
  };

  // 필드명 한글 변환
  const getFieldDisplayName = (fieldName: string) => {
    const fieldMap: { [key: string]: string } = {
      'cd_material': '제품코드',
      'nm_material': '제품명',
      'type': '제품구분',
      'unitName': '단위',
      'safetyStock': '안전재고',
      'leadTime': '리드타임',
      'supplier': '공급업체',
      'location': '보관위치',
      'memo': '메모',
      'isActive': '사용여부'
    };
    return fieldMap[fieldName] || fieldName;
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen}>
      <ModalContent style={{ width: '900px', maxHeight: '80vh' }}>
        {/* 헤더 */}
        <div style={{ padding: '0 0 20px 0', borderBottom: '1px solid #e9ecef', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>📋 제품 이력 조회</h2>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            {productName} ({productCode})
          </div>
        </div>

        {/* 필터 및 검색 영역 */}
        <Card style={{ marginBottom: '20px', padding: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>액션 필터</label>
              <Select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                style={{ width: '120px' }}
              >
                <option value="ALL">전체</option>
                <option value="CREATE">등록</option>
                <option value="UPDATE">수정</option>
                <option value="DELETE">삭제</option>
                <option value="ACTIVATE">활성화</option>
                <option value="DEACTIVATE">비활성화</option>
              </Select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>검색</label>
              <Input
                type="text"
                placeholder="작업자, 변경사유, 필드명, 값 검색..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>

            <Button 
              variant="secondary" 
              onClick={onRefresh}
              disabled={loading}
              style={{ alignSelf: 'flex-end' }}
            >
              새로고침
            </Button>
          </div>
        </Card>

        {/* 오류 메시지 */}
        {error && (
          <div style={{ 
            color: '#dc3545', 
            marginBottom: '16px', 
            padding: '12px', 
            background: '#f8d7da', 
            borderRadius: '4px',
            border: '1px solid #f5c6cb'
          }}>
            <strong>오류:</strong> {error}
          </div>
        )}

        {/* 이력 목록 */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              이력을 조회하고 있습니다...
            </div>
          ) : filteredHistories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              {histories.length === 0 ? '이력이 없습니다.' : '검색 조건에 해당하는 이력이 없습니다.'}
            </div>
          ) : (
            filteredHistories.map((history, index) => (
              <Card 
                key={history.id} 
                style={{ 
                  marginBottom: '16px', 
                  border: '1px solid #e9ecef',
                  position: 'relative'
                }}
              >
                {/* 이력 헤더 */}
                <div style={{ 
                  padding: '12px 16px', 
                  borderBottom: '1px solid #e9ecef',
                  background: '#f8f9fa'
                }}>
                  <Flex justify="space-between" align="center">
                    <Flex gap={12} align="center">
                      <StatusBadge 
                        active={history.action === 'CREATE' || history.action === 'ACTIVATE'}
                        style={{ 
                          backgroundColor: getActionBadgeColor(history.action),
                          color: 'white',
                          fontSize: '12px',
                          padding: '4px 8px'
                        }}
                      >
                        {history.actionName}
                      </StatusBadge>
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {history.userName}
                      </span>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {formatDateTime(history.timestamp)}
                      </span>
                    </Flex>
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      #{index + 1}
                    </span>
                  </Flex>
                  
                  {/* 변경 사유 */}
                  {history.reason && (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '12px', 
                      color: '#666',
                      fontStyle: 'italic'
                    }}>
                      사유: {history.reason}
                    </div>
                  )}
                </div>

                {/* 변경 필드 목록 */}
                <div style={{ padding: '16px' }}>
                  {!history.changedFields.fieldName ? (
                    <div style={{ 
                      textAlign: 'center', 
                      color: '#666', 
                      fontSize: '14px',
                      fontStyle: 'italic'
                    }}>
                      변경 내역 없음
                    </div>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <th>필드</th>
                          <th>이전 값</th>
                          <th>이후 값</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 'bold', fontSize: '12px' }}>
                            {getFieldDisplayName(history.changedFields.fieldName)}
                          </td>
                          <td style={{ 
                            fontSize: '12px',
                            color: '#666',
                            textDecoration: 'line-through'
                          }}>
                            {formatFieldValue(history.changedFields.oldValue)}
                          </td>
                          <td style={{ 
                            fontSize: '12px',
                            color: '#28a745',
                            fontWeight: 'bold'
                          }}>
                            {formatFieldValue(history.changedFields.newValue)}
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* 이력 통계 */}
        {!loading && histories.length > 0 && (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: '#f8f9fa', 
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666'
          }}>
            <Flex gap={16}>
              <span>전체 이력: {histories.length}건</span>
              <span>표시 중: {filteredHistories.length}건</span>
              {actionFilter !== 'ALL' && (
                <span>필터: {actionFilter}</span>
              )}
              {searchKeyword && (
                <span>검색: "{searchKeyword}"</span>
              )}
            </Flex>
          </div>
        )}

        {/* 푸터 */}
        <div style={{ 
          borderTop: '1px solid #e9ecef', 
          paddingTop: '20px', 
          marginTop: '20px',
          textAlign: 'right'
        }}>
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
};