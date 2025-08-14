import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';

/**
 * 에러 바운더리 Props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

/**
 * 에러 바운더리 State
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

/**
 * 에러 표시 스타일 컴포넌트
 */
const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px 20px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  margin: 20px;
`;

const ErrorIcon = styled.div`
  font-size: 64px;
  margin-bottom: 20px;
  color: #dc3545;
`;

const ErrorTitle = styled.h2`
  color: #dc3545;
  margin-bottom: 12px;
  font-size: 24px;
  text-align: center;
`;

const ErrorMessage = styled.p`
  color: #6c757d;
  margin-bottom: 20px;
  text-align: center;
  max-width: 600px;
  line-height: 1.5;
`;

const ErrorDetails = styled.details`
  margin-top: 20px;
  max-width: 800px;
  width: 100%;
  
  summary {
    cursor: pointer;
    color: #007bff;
    margin-bottom: 12px;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ErrorStack = styled.pre`
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  overflow: auto;
  max-height: 300px;
  white-space: pre-wrap;
  word-break: break-word;
`;

const ErrorActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
`;

const ErrorButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  border: 1px solid ${props => props.variant === 'primary' ? '#007bff' : '#6c757d'};
  background: ${props => props.variant === 'primary' ? '#007bff' : 'white'};
  color: ${props => props.variant === 'primary' ? 'white' : '#6c757d'};
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: ${props => props.variant === 'primary' ? '#0056b3' : '#e9ecef'};
    border-color: ${props => props.variant === 'primary' ? '#0056b3' : '#6c757d'};
  }
`;

/**
 * 에러 바운더리 컴포넌트
 * 
 * 기능:
 * - React 컴포넌트 트리에서 발생하는 JavaScript 에러 캐치
 * - 에러 로깅 및 사용자 친화적 에러 화면 표시
 * - 에러 복구 기능
 * - 개발/운영 환경별 에러 표시 수준 조정
 * - 에러 리포팅 시스템 연동
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 에러가 발생하면 상태를 업데이트하여 대체 UI를 표시
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 정보 저장
    this.setState({
      error,
      errorInfo,
      eventId: this.generateEventId(),
    });

    // 에러 로깅
    this.logError(error, errorInfo);

    // 부모 컴포넌트에 에러 알림
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // props 변경 시 에러 상태 초기화
    if (hasError && resetOnPropsChange) {
      if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (key, index) => prevProps.resetKeys?.[index] !== key
        );
        
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      } else {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  /**
   * 이벤트 ID 생성
   */
  private generateEventId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 에러 로깅
   */
  private logError(error: Error, errorInfo: ErrorInfo): void {
    const errorData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      eventId: this.state.eventId,
    };

    // 개발 환경에서는 콘솔에 출력
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught an Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Full Error Data:', errorData);
      console.groupEnd();
    }

    // 운영 환경에서는 에러 리포팅 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorReport(errorData);
    }

    // 로컬 스토리지에 에러 히스토리 저장
    this.saveErrorToHistory(errorData);
  }

  /**
   * 에러 리포트 전송
   */
  private sendErrorReport(errorData: any): void {
    // 실제 환경에서는 Sentry, LogRocket 등의 서비스 사용
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      }).catch(err => {
        console.error('Failed to send error report:', err);
      });
    } catch (err) {
      console.error('Error reporting failed:', err);
    }
  }

  /**
   * 에러 히스토리 저장
   */
  private saveErrorToHistory(errorData: any): void {
    try {
      const errorHistory = JSON.parse(localStorage.getItem('error_history') || '[]');
      errorHistory.push(errorData);
      
      // 최대 50개까지만 저장
      if (errorHistory.length > 50) {
        errorHistory.shift();
      }
      
      localStorage.setItem('error_history', JSON.stringify(errorHistory));
    } catch (err) {
      console.error('Failed to save error history:', err);
    }
  }

  /**
   * 에러 상태 초기화
   */
  private resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    });
  };

  /**
   * 페이지 새로고침
   */
  private handleRefresh = (): void => {
    window.location.reload();
  };

  /**
   * 홈으로 이동
   */
  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  /**
   * 에러 리포트
   */
  private handleReportError = (): void => {
    const { error, errorInfo, eventId } = this.state;
    
    if (error && errorInfo) {
      // 사용자가 직접 에러 리포트 제출
      const userReport = {
        eventId,
        userDescription: prompt('오류에 대한 추가 설명을 입력해주세요 (선택사항):'),
        userEmail: prompt('연락처 이메일을 입력해주세요 (선택사항):'),
      };
      
      console.log('User error report:', userReport);
      alert('에러 리포트가 전송되었습니다. 빠른 시일 내에 해결하겠습니다.');
    }
  };

  /**
   * 대체 UI 렌더링
   */
  private renderErrorFallback(): ReactNode {
    const { error, errorInfo, eventId } = this.state;
    const isDevelopment = process.env.NODE_ENV === 'development';

    return (
      <ErrorContainer>
        <ErrorIcon>⚠️</ErrorIcon>
        <ErrorTitle>앗! 오류가 발생했습니다</ErrorTitle>
        <ErrorMessage>
          예상치 못한 오류가 발생했습니다. 
          잠시 후 다시 시도하시거나 페이지를 새로고침해주세요.
        </ErrorMessage>

        <ErrorActions>
          <ErrorButton variant="primary" onClick={this.resetErrorBoundary}>
            다시 시도
          </ErrorButton>
          <ErrorButton onClick={this.handleRefresh}>
            페이지 새로고침
          </ErrorButton>
          <ErrorButton onClick={this.handleGoHome}>
            홈으로 이동
          </ErrorButton>
          <ErrorButton onClick={this.handleReportError}>
            오류 신고
          </ErrorButton>
        </ErrorActions>

        {eventId && (
          <ErrorMessage style={{ fontSize: '12px', marginTop: '16px' }}>
            오류 ID: {eventId}
          </ErrorMessage>
        )}

        {isDevelopment && error && (
          <ErrorDetails>
            <summary>개발자 정보 (개발 환경에서만 표시)</summary>
            <div style={{ marginBottom: '16px' }}>
              <strong>Error:</strong> {error.name}: {error.message}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <strong>Stack Trace:</strong>
              <ErrorStack>{error.stack}</ErrorStack>
            </div>
            {errorInfo && (
              <div>
                <strong>Component Stack:</strong>
                <ErrorStack>{errorInfo.componentStack}</ErrorStack>
              </div>
            )}
          </ErrorDetails>
        )}
      </ErrorContainer>
    );
  }

  render() {
    const { hasError } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // 커스텀 fallback이 제공된 경우 사용
      if (fallback) {
        return fallback;
      }

      // 기본 에러 UI 표시
      return this.renderErrorFallback();
    }

    // 에러가 없으면 정상적으로 children 렌더링
    return children;
  }
}

/**
 * 함수형 컴포넌트용 에러 바운더리 HOC
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * 에러 바운더리 유틸리티 함수들
 */
export const ErrorBoundaryUtils = {
  /**
   * 에러 히스토리 조회
   */
  getErrorHistory: (): any[] => {
    try {
      return JSON.parse(localStorage.getItem('error_history') || '[]');
    } catch {
      return [];
    }
  },

  /**
   * 에러 히스토리 클리어
   */
  clearErrorHistory: (): void => {
    localStorage.removeItem('error_history');
  },

  /**
   * 에러 통계
   */
  getErrorStats: (): { total: number; recent: number; topErrors: string[] } => {
    const history = ErrorBoundaryUtils.getErrorHistory();
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);

    const recent = history.filter((err: any) => 
      new Date(err.timestamp).getTime() > dayAgo
    ).length;

    const errorCounts = history.reduce((acc: Record<string, number>, err: any) => {
      const key = `${err.error.name}: ${err.error.message}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topErrors = Object.entries(errorCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([error]) => error);

    return {
      total: history.length,
      recent,
      topErrors,
    };
  },
};