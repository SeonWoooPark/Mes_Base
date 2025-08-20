/**
 * 캐시 성능 모니터링 및 분석 도구
 * 
 * 실시간 캐시 성능 지표 모니터링:
 * - 캐시 히트율 추적
 * - 쿼리 응답 시간 분석
 * - 메모리 사용량 모니터링
 * - 네트워크 상태 기반 최적화 제안
 * - 개발자 도구 통합
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { cacheStrategyManager, CacheHitStats } from './CacheStrategyManager';
import { smartInvalidationManager } from './SmartInvalidationManager';

/**
 * 성능 메트릭 타입
 */
interface PerformanceMetrics {
  totalQueries: number;
  averageHitRate: number;
  averageResponseTime: number;
  slowestQueries: Array<{
    feature: string;
    operation: string;
    responseTime: number;
  }>;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  networkStatus?: {
    online: boolean;
    type: string;
    effectiveType: string;
  };
}

/**
 * 캐시 최적화 권장사항 타입
 */
interface OptimizationRecommendation {
  id: string;
  type: 'cache-policy' | 'network-adaptation' | 'memory-optimization';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: () => void;
}

/**
 * 스타일 컴포넌트들
 */
const MonitorContainer = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: ${props => props.isOpen ? '0' : '-400px'};
  width: 400px;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  color: white;
  transition: right 0.3s ease;
  z-index: 10000;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
`;

const MonitorHeader = styled.div`
  padding: 16px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MonitorTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: bold;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  
  &:hover {
    background: #333;
  }
`;

const Section = styled.div`
  padding: 16px;
  border-bottom: 1px solid #222;
`;

const SectionTitle = styled.h4`
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #888;
  text-transform: uppercase;
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const MetricLabel = styled.span`
  color: #ccc;
`;

const MetricValue = styled.span<{ status?: 'good' | 'warning' | 'error' }>`
  color: ${props => {
    switch (props.status) {
      case 'good': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'error': return '#F44336';
      default: return 'white';
    }
  }};
  font-weight: bold;
`;

const ProgressBar = styled.div<{ percentage: number; status?: 'good' | 'warning' | 'error' }>`
  width: 100%;
  height: 4px;
  background: #333;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
  
  &::after {
    content: '';
    display: block;
    width: ${props => props.percentage}%;
    height: 100%;
    background: ${props => {
      switch (props.status) {
        case 'good': return '#4CAF50';
        case 'warning': return '#FF9800'; 
        case 'error': return '#F44336';
        default: return '#2196F3';
      }
    }};
    transition: width 0.3s ease;
  }
`;

const RecommendationItem = styled.div<{ severity: string }>`
  padding: 8px;
  margin-bottom: 8px;
  border-left: 3px solid ${props => {
    switch (props.severity) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#2196F3';
    }
  }};
  background: rgba(255, 255, 255, 0.05);
`;

const RecommendationTitle = styled.div`
  font-weight: bold;
  margin-bottom: 4px;
`;

const RecommendationDesc = styled.div`
  font-size: 11px;
  color: #ccc;
  line-height: 1.3;
`;

const ToggleButton = styled.button<{ isOpen: boolean }>`
  position: fixed;
  top: 50%;
  right: ${props => props.isOpen ? '400px' : '0'};
  transform: translateY(-50%);
  background: #1976D2;
  color: white;
  border: none;
  padding: 12px 8px;
  cursor: pointer;
  border-radius: 4px 0 0 4px;
  font-size: 12px;
  writing-mode: vertical-lr;
  z-index: 10001;
  transition: right 0.3s ease;
  
  &:hover {
    background: #1565C0;
  }
`;

/**
 * 캐시 성능 모니터 컴포넌트
 */
export const CachePerformanceMonitor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalQueries: 0,
    averageHitRate: 0,
    averageResponseTime: 0,
    slowestQueries: [],
  });
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);

  // 성능 지표 업데이트
  useEffect(() => {
    const updateMetrics = () => {
      const hitStats = cacheStrategyManager.getCacheHitStats();
      const invalidationStats = smartInvalidationManager.getStats();
      const networkStatus = cacheStrategyManager.getNetworkStatus();

      // 메트릭 계산
      const totalQueries = hitStats.reduce((sum, stat) => sum + stat.hitCount + stat.missCount, 0);
      const averageHitRate = totalQueries > 0 
        ? hitStats.reduce((sum, stat) => sum + stat.hitRate, 0) / hitStats.length 
        : 0;
      const averageResponseTime = hitStats.length > 0
        ? hitStats.reduce((sum, stat) => sum + stat.averageResponseTime, 0) / hitStats.length
        : 0;

      // 느린 쿼리 찾기
      const slowestQueries = hitStats
        .filter(stat => stat.averageResponseTime > 1000) // 1초 이상
        .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
        .slice(0, 5)
        .map(stat => ({
          feature: stat.feature,
          operation: stat.operation,
          responseTime: stat.averageResponseTime,
        }));

      // 메모리 사용량 (가능한 경우)
      let memoryUsage;
      if (typeof (performance as any)?.memory !== 'undefined') {
        const memory = (performance as any).memory;
        memoryUsage = {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
          percentage: memory.usedJSHeapSize / memory.totalJSHeapSize,
        };
      }

      setMetrics({
        totalQueries,
        averageHitRate: averageHitRate * 100, // 백분율
        averageResponseTime,
        slowestQueries,
        memoryUsage,
        networkStatus: networkStatus ? {
          online: networkStatus.online,
          type: networkStatus.connectionType,
          effectiveType: networkStatus.effectiveType,
        } : undefined,
      });

      // 권장사항 생성
      generateRecommendations(hitStats, { totalQueries, averageHitRate, averageResponseTime, memoryUsage });
    };

    // 초기 업데이트
    updateMetrics();

    // 주기적 업데이트
    const interval = setInterval(updateMetrics, 5000); // 5초마다

    return () => clearInterval(interval);
  }, []);

  // 권장사항 생성
  const generateRecommendations = (
    hitStats: CacheHitStats[], 
    metrics: { totalQueries: number; averageHitRate: number; averageResponseTime: number; memoryUsage?: any }
  ) => {
    const newRecommendations: OptimizationRecommendation[] = [];

    // 낮은 캐시 히트율
    if (metrics.averageHitRate < 50) {
      newRecommendations.push({
        id: 'low-hit-rate',
        type: 'cache-policy',
        severity: 'high',
        title: '낮은 캐시 히트율',
        description: `현재 히트율이 ${metrics.averageHitRate.toFixed(1)}%입니다. staleTime을 늘리거나 refetch 정책을 조정하세요.`,
      });
    }

    // 느린 응답 시간
    if (metrics.averageResponseTime > 2000) {
      newRecommendations.push({
        id: 'slow-response',
        type: 'network-adaptation',
        severity: 'medium',
        title: '느린 응답 시간',
        description: `평균 응답 시간이 ${(metrics.averageResponseTime / 1000).toFixed(1)}초입니다. 네트워크 상태에 따른 적응형 캐싱을 고려하세요.`,
      });
    }

    // 메모리 사용량 경고
    if (metrics.memoryUsage && metrics.memoryUsage.percentage > 0.8) {
      newRecommendations.push({
        id: 'high-memory',
        type: 'memory-optimization',
        severity: 'high',
        title: '높은 메모리 사용량',
        description: `메모리 사용량이 ${(metrics.memoryUsage.percentage * 100).toFixed(1)}%입니다. gcTime을 줄이거나 캐시 정리를 실행하세요.`,
        action: () => {
          // 메모리 정리 트리거
          window.dispatchEvent(new CustomEvent('cache-cleanup'));
        },
      });
    }

    // 개별 쿼리 최적화 권장사항
    hitStats.forEach(stat => {
      if (stat.hitRate < 0.3 && (stat.hitCount + stat.missCount) > 10) {
        newRecommendations.push({
          id: `optimize-${stat.feature}-${stat.operation}`,
          type: 'cache-policy',
          severity: 'medium',
          title: `${stat.feature}.${stat.operation} 최적화`,
          description: `이 쿼리의 히트율이 ${(stat.hitRate * 100).toFixed(1)}%로 낮습니다. 캐시 정책을 검토하세요.`,
        });
      }
    });

    setRecommendations(newRecommendations);
  };

  // 히트율 상태 계산
  const getHitRateStatus = (hitRate: number) => {
    if (hitRate >= 80) return 'good';
    if (hitRate >= 50) return 'warning';
    return 'error';
  };

  // 응답 시간 상태 계산
  const getResponseTimeStatus = (responseTime: number) => {
    if (responseTime <= 500) return 'good';
    if (responseTime <= 2000) return 'warning';
    return 'error';
  };

  return (
    <>
      <ToggleButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
        CACHE MONITOR
      </ToggleButton>
      
      <MonitorContainer isOpen={isOpen}>
        <MonitorHeader>
          <MonitorTitle>캐시 성능 모니터</MonitorTitle>
          <CloseButton onClick={() => setIsOpen(false)}>×</CloseButton>
        </MonitorHeader>

        <Section>
          <SectionTitle>전체 성능 지표</SectionTitle>
          
          <MetricRow>
            <MetricLabel>총 쿼리 수:</MetricLabel>
            <MetricValue>{metrics.totalQueries.toLocaleString()}</MetricValue>
          </MetricRow>

          <MetricRow>
            <MetricLabel>평균 히트율:</MetricLabel>
            <MetricValue status={getHitRateStatus(metrics.averageHitRate)}>
              {metrics.averageHitRate.toFixed(1)}%
            </MetricValue>
          </MetricRow>
          <ProgressBar 
            percentage={metrics.averageHitRate} 
            status={getHitRateStatus(metrics.averageHitRate)} 
          />

          <MetricRow>
            <MetricLabel>평균 응답 시간:</MetricLabel>
            <MetricValue status={getResponseTimeStatus(metrics.averageResponseTime)}>
              {metrics.averageResponseTime.toFixed(0)}ms
            </MetricValue>
          </MetricRow>
          <ProgressBar 
            percentage={Math.min(100, metrics.averageResponseTime / 50)} 
            status={getResponseTimeStatus(metrics.averageResponseTime)} 
          />
        </Section>

        {metrics.memoryUsage && (
          <Section>
            <SectionTitle>메모리 사용량</SectionTitle>
            
            <MetricRow>
              <MetricLabel>사용량:</MetricLabel>
              <MetricValue>
                {metrics.memoryUsage.used}MB / {metrics.memoryUsage.total}MB
              </MetricValue>
            </MetricRow>
            
            <ProgressBar 
              percentage={metrics.memoryUsage.percentage * 100}
              status={metrics.memoryUsage.percentage > 0.8 ? 'error' : 
                     metrics.memoryUsage.percentage > 0.6 ? 'warning' : 'good'}
            />
          </Section>
        )}

        {metrics.networkStatus && (
          <Section>
            <SectionTitle>네트워크 상태</SectionTitle>
            
            <MetricRow>
              <MetricLabel>연결 상태:</MetricLabel>
              <MetricValue status={metrics.networkStatus.online ? 'good' : 'error'}>
                {metrics.networkStatus.online ? 'ONLINE' : 'OFFLINE'}
              </MetricValue>
            </MetricRow>
            
            <MetricRow>
              <MetricLabel>연결 타입:</MetricLabel>
              <MetricValue>{metrics.networkStatus.effectiveType.toUpperCase()}</MetricValue>
            </MetricRow>
          </Section>
        )}

        {metrics.slowestQueries.length > 0 && (
          <Section>
            <SectionTitle>느린 쿼리 Top 5</SectionTitle>
            {metrics.slowestQueries.map((query, index) => (
              <MetricRow key={`${query.feature}-${query.operation}`}>
                <MetricLabel>{query.feature}.{query.operation}:</MetricLabel>
                <MetricValue status="warning">
                  {query.responseTime.toFixed(0)}ms
                </MetricValue>
              </MetricRow>
            ))}
          </Section>
        )}

        {recommendations.length > 0 && (
          <Section>
            <SectionTitle>최적화 권장사항</SectionTitle>
            {recommendations.map(rec => (
              <RecommendationItem key={rec.id} severity={rec.severity}>
                <RecommendationTitle>{rec.title}</RecommendationTitle>
                <RecommendationDesc>
                  {rec.description}
                  {rec.action && (
                    <button
                      onClick={rec.action}
                      style={{
                        marginLeft: '8px',
                        padding: '2px 8px',
                        background: '#1976D2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '10px',
                      }}
                    >
                      실행
                    </button>
                  )}
                </RecommendationDesc>
              </RecommendationItem>
            ))}
          </Section>
        )}
      </MonitorContainer>
    </>
  );
};

/**
 * 개발 모드에서만 모니터 표시
 */
export const CachePerformanceMonitorWrapper: React.FC = () => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <CachePerformanceMonitor />;
};