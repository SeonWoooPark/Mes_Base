/**
 * OrderHistoryModal 수주 이력 조회 모달
 * 
 * 특정 수주의 변경 이력을 표시합니다.
 */

import React, { useState, useMemo } from 'react';
import { OrderHistoryItem } from '../../../application/usecases/order/GetOrderHistoryUseCase';
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
} from '../../utils/styled';

interface OrderHistoryModalProps {
  isOpen: boolean;
  orderNo: string;
  orderName: string;
  histories: OrderHistoryItem[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const OrderHistoryModal: React.FC<OrderHistoryModalProps> = ({
  isOpen,
  orderNo,
  orderName,
  histories,
  loading,
  error,
  onClose,
  onRefresh
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

    // 키워드 검색
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(history => 
        history.reason.toLowerCase().includes(keyword) ||
        history.userName.toLowerCase().includes(keyword) ||
        history.actionDisplay.toLowerCase().includes(keyword) ||
        history.changedFields.some(field => 
          field.field.toLowerCase().includes(keyword) ||
          field.oldValue.toLowerCase().includes(keyword) ||
          field.newValue.toLowerCase().includes(keyword)
        )
      );
    }

    return filtered;
  }, [histories, actionFilter, searchKeyword]);

  // 날짜 포맷팅
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date instanceof Date ? date : new Date(date));
  };

  // 액션별 스타일
  const getActionStyle = (action: string) => {
    switch (action) {
      case 'CREATE': return 'primary';
      case 'UPDATE': return 'warning';
      case 'DELETE': return 'danger';
      case 'CONFIRM': return 'success';
      case 'CANCEL': return 'danger';
      case 'START_PRODUCTION': return 'info';
      case 'SHIP': return 'info';
      case 'DELIVER': return 'success';
      default: return 'default';
    }
  };

  // 변경 필드 포맷팅
  const formatChangedFields = (fields: { field: string; oldValue: string; newValue: string }[]) => {
    if (fields.length === 0) return '-';
    
    return fields.map((field, index) => (
      <div key={index} style={{ marginBottom: index < fields.length - 1 ? '4px' : 0 }}>
        <strong>{field.field}:</strong>{' '}
        {field.oldValue && (
          <>
            <span style={{ color: '#dc3545', textDecoration: 'line-through' }}>
              {field.oldValue}
            </span>
            {' → '}
          </>
        )}
        <span style={{ color: '#28a745' }}>
          {field.newValue}
        </span>
      </div>
    ));
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent style={{ maxWidth: '900px', maxHeight: '80vh', overflow: 'auto' }}>
        {/* 헤더 */}
        <Flex justify="space-between" align="center" style={{ marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0' }}>수주 이력 조회</h2>
            <div style={{ fontSize: '14px', color: '#666' }}>
              <strong>{orderNo}</strong> - {orderName}
            </div>
          </div>
          <Button onClick={onClose} variant="secondary">
            닫기
          </Button>
        </Flex>

        {/* 에러 메시지 */}
        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px', 
            borderRadius: '4px',
            marginBottom: '16px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        {/* 필터 영역 */}
        <Card style={{ marginBottom: '20px' }}>
          <Flex gap={16} align="center">
            <div style={{ flex: '1' }}>
              <label style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>
                검색
              </label>
              <Input
                type="text"
                placeholder="사유, 사용자, 필드명으로 검색..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
            <div style={{ width: '200px' }}>
              <label style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>
                작업 유형
              </label>
              <Select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="ALL">전체</option>
                <option value="CREATE">생성</option>
                <option value="UPDATE">수정</option>
                <option value="DELETE">삭제</option>
                <option value="CONFIRM">확정</option>
                <option value="CANCEL">취소</option>
                <option value="START_PRODUCTION">생산시작</option>
                <option value="SHIP">출하</option>
                <option value="DELIVER">납품</option>
              </Select>
            </div>
            <Button
              onClick={onRefresh}
              disabled={loading}
              style={{ marginTop: '20px' }}
            >
              새로고침
            </Button>
          </Flex>
        </Card>

        {/* 이력 테이블 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            이력을 불러오는 중...
          </div>
        ) : filteredHistories.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            {histories.length === 0 ? (
              <>
                <div>아직 이 수주에 대한 변경 이력이 없습니다.</div>
              </>
            ) : (
              <>
                <div>검색 조건에 맞는 이력이 없습니다.</div>
              </>
            )}
          </Card>
        ) : (
          <>
            <div style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
              총 <strong>{filteredHistories.length}건</strong>의 이력
            </div>
            <Table>
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>일시</th>
                  <th style={{ width: '100px' }}>작업</th>
                  <th style={{ width: '100px' }}>수행자</th>
                  <th>변경 내용</th>
                  <th>사유</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistories.map((history) => (
                  <tr key={history.id}>
                    <td style={{ fontSize: '13px' }}>
                      {formatDateTime(history.dateTime)}
                    </td>
                    <td>
                      <StatusBadge variant={getActionStyle(history.action)}>
                        {history.actionDisplay}
                      </StatusBadge>
                    </td>
                    <td>{history.userName}</td>
                    <td style={{ fontSize: '13px' }}>
                      {formatChangedFields(history.changedFields)}
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      {history.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}

        {/* 하단 정보 */}
        <Card style={{ marginTop: '20px', backgroundColor: '#e7f3ff', borderColor: '#b3d9ff' }}>
          <Flex gap={8} align="center">
            <span style={{ fontSize: '20px' }}>ℹ️</span>
            <div style={{ fontSize: '14px', color: '#004085' }}>
              <strong>참고:</strong> 이 이력은 수주의 모든 변경사항을 시간순으로 보여줍니다. 
              각 이력 항목에는 변경한 사용자, 변경 시간, 변경 사유 및 구체적인 변경 내용이 포함됩니다.
            </div>
          </Flex>
        </Card>
      </ModalContent>
    </Modal>
  );
};