import React, { useMemo } from 'react';
import { BOMInfo, BOMStatistics as BOMStatsType } from '../../../application/usecases/bom/GetBOMTreeUseCase';
import { ComponentType } from '../../../domain/entities/BOMItem';
import { 
  Card, 
  Flex, 
  StatusBadge 
} from '@shared/utils/styled';

/**
 * BOM 통계 컴포넌트 Props
 */
interface BOMStatisticsProps {
  bomInfo?: BOMInfo;                     // BOM 기본 정보
  statistics?: BOMStatsType;             // BOM 통계 데이터
  totalItems: number;                    // 총 아이템 수
  activeItems: number;                   // 활성 아이템 수
  totalCost: number;                     // 총 비용
  maxLevel: number;                      // 최대 레벨
  loading?: boolean;
}

/**
 * 통계 카드 컴포넌트
 */
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  color = '#007bff',
  icon 
}) => (
  <div style={{
    padding: '16px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    textAlign: 'center',
    minWidth: '120px'
  }}>
    {icon && (
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
    )}
    <div style={{ 
      fontSize: '24px', 
      fontWeight: 'bold', 
      color,
      marginBottom: '4px' 
    }}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </div>
    <div style={{ 
      fontSize: '12px', 
      color: '#666',
      fontWeight: 'bold'
    }}>
      {title}
    </div>
    {subtitle && (
      <div style={{ 
        fontSize: '11px', 
        color: '#999',
        marginTop: '2px'
      }}>
        {subtitle}
      </div>
    )}
  </div>
);

/**
 * 진행률 바 컴포넌트
 */
interface ProgressBarProps {
  label: string;
  current: number;
  total: number;
  color?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  label, 
  current, 
  total, 
  color = '#007bff' 
}) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  
  return (
    <div style={{ marginBottom: '12px' }}>
      <Flex justify="space-between" style={{ marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: '500' }}>{label}</span>
        <span style={{ fontSize: '12px', color: '#666' }}>
          {current.toLocaleString()} / {total.toLocaleString()} ({percentage.toFixed(1)}%)
        </span>
      </Flex>
      <div style={{ 
        width: '100%', 
        height: '8px', 
        background: '#e9ecef', 
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: color,
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
};

/**
 * BOM 통계 컴포넌트
 * 
 * 기능:
 * - BOM 기본 정보 표시
 * - 구성품 통계 (수량, 유형별, 레벨별)
 * - 비용 분석
 * - 시각적 차트 및 진행률
 */
export const BOMStatistics: React.FC<BOMStatisticsProps> = ({
  bomInfo,
  statistics,
  totalItems,
  activeItems,
  totalCost,
  maxLevel,
  loading = false,
}) => {
  // === 계산된 통계 ===
  const computedStats = useMemo(() => {
    if (!statistics) return null;

    // 구성품 유형별 통계
    const componentTypeStats = new Map<ComponentType, { count: number; percentage: number }>();
    let totalTypeCount = 0;
    
    statistics.componentTypeCount.forEach((count, type) => {
      totalTypeCount += count;
    });
    
    statistics.componentTypeCount.forEach((count, type) => {
      componentTypeStats.set(type, {
        count,
        percentage: totalTypeCount > 0 ? (count / totalTypeCount) * 100 : 0
      });
    });

    // 레벨별 통계
    const levelStats: { level: number; count: number; cost: number }[] = [];
    for (let level = 1; level <= maxLevel; level++) {
      levelStats.push({
        level,
        count: statistics.levelCount.get(level) || 0,
        cost: statistics.costByLevel.get(level) || 0
      });
    }

    return {
      componentTypeStats,
      levelStats,
      inactiveItems: totalItems - activeItems,
      activePercentage: totalItems > 0 ? (activeItems / totalItems) * 100 : 0,
    };
  }, [statistics, totalItems, activeItems, maxLevel]);

  const componentTypeLabels: Record<ComponentType, string> = {
    [ComponentType.RAW_MATERIAL]: '원자재',
    [ComponentType.SEMI_FINISHED]: '반제품',
    [ComponentType.PURCHASED_PART]: '구매품',
    [ComponentType.SUB_ASSEMBLY]: '조립품',
    [ComponentType.CONSUMABLE]: '소모품',
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>통계를 불러오는 중...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 style={{ margin: '0 0 20px 0' }}>📊 BOM 통계</h3>

      {/* BOM 기본 정보 */}
      {bomInfo && (
        <div style={{ 
          padding: '12px', 
          background: '#f8f9fa', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <Flex justify="space-between" align="center">
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {bomInfo.productName}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                버전: {bomInfo.version} | 상태: {bomInfo.isActive ? '활성' : '비활성'}
              </div>
            </div>
            <StatusBadge active={bomInfo.isActive}>
              {bomInfo.isActive ? '활성' : '비활성'}
            </StatusBadge>
          </Flex>
        </div>
      )}

      {/* 주요 지표 카드들 */}
      <Flex gap={12} style={{ marginBottom: '24px', flexWrap: 'wrap' }}>
        <StatCard
          title="총 구성품"
          value={totalItems}
          subtitle={`${maxLevel}레벨`}
          icon="📦"
          color="#007bff"
        />
        
        <StatCard
          title="활성 구성품"
          value={activeItems}
          subtitle={`${((activeItems / totalItems) * 100).toFixed(1)}%`}
          icon="✅"
          color="#28a745"
        />
        
        <StatCard
          title="총 비용"
          value={`₩${totalCost.toLocaleString()}`}
          subtitle={statistics ? `평균 ₩${Math.round(statistics.averageCostPerItem).toLocaleString()}` : undefined}
          icon="💰"
          color="#fd7e14"
        />
        
        {statistics && (
          <>
            <StatCard
              title="선택사항"
              value={statistics.optionalItemsCount}
              subtitle={`${((statistics.optionalItemsCount / totalItems) * 100).toFixed(1)}%`}
              icon="⚪"
              color="#6c757d"
            />
            
            <StatCard
              title="중요 구성품"
              value={statistics.criticalItemsCount}
              subtitle="고가/핵심 부품"
              icon="⭐"
              color="#dc3545"
            />
          </>
        )}
      </Flex>

      {computedStats && (
        <>
          {/* 구성품 유형별 분포 */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>구성품 유형별 분포</h4>
            {Array.from(computedStats.componentTypeStats.entries()).map(([type, stats]) => (
              <ProgressBar
                key={type}
                label={componentTypeLabels[type]}
                current={stats.count}
                total={totalItems}
                color={(() => {
                  switch (type) {
                    case ComponentType.RAW_MATERIAL: return '#6c757d';
                    case ComponentType.SEMI_FINISHED: return '#fd7e14';
                    case ComponentType.PURCHASED_PART: return '#20c997';
                    case ComponentType.SUB_ASSEMBLY: return '#007bff';
                    case ComponentType.CONSUMABLE: return '#dc3545';
                    default: return '#6c757d';
                  }
                })()}
              />
            ))}
          </div>

          {/* 레벨별 분포 */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>레벨별 분포</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              {computedStats.levelStats.map(({ level, count, cost }) => (
                <div key={level} style={{
                  padding: '8px 12px',
                  background: '#f8f9fa',
                  borderRadius: '4px',
                  border: '1px solid #e9ecef'
                }}>
                  <Flex justify="space-between" align="center">
                    <span style={{ fontWeight: 'bold', fontSize: '12px' }}>
                      Level {level}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {count}개
                      </div>
                      <div style={{ fontSize: '10px', color: '#666' }}>
                        ₩{cost.toLocaleString()}
                      </div>
                    </div>
                  </Flex>
                </div>
              ))}
            </div>
          </div>

          {/* 활성/비활성 분포 */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>활성 상태 분포</h4>
            <ProgressBar
              label="활성 구성품"
              current={activeItems}
              total={totalItems}
              color="#28a745"
            />
            <ProgressBar
              label="비활성 구성품"
              current={computedStats.inactiveItems}
              total={totalItems}
              color="#dc3545"
            />
          </div>

          {/* 추가 통계 정보 */}
          {statistics && (
            <div style={{ 
              padding: '12px',
              background: '#f8f9fa',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>추가 정보:</strong>
              </div>
              <div>• 평균 구성품 단가: ₩{Math.round(statistics.averageCostPerItem).toLocaleString()}</div>
              <div>• 선택사항 비율: {((statistics.optionalItemsCount / totalItems) * 100).toFixed(1)}%</div>
              <div>• 중요 구성품 비율: {((statistics.criticalItemsCount / totalItems) * 100).toFixed(1)}%</div>
              <div>• 최대 구조 깊이: {maxLevel}레벨</div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};