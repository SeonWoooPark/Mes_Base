import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

// 기본 테마 (실제 애플리케이션에서 사용하는 테마의 축약 버전)
const testTheme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
    white: '#ffffff',
    black: '#000000'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '3rem'
  },
  borderRadius: {
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.375rem',
    xl: '0.5rem'
  }
};

/**
 * 테스트용 커스텀 렌더러
 * 필요한 Provider들을 자동으로 감싸서 컴포넌트를 렌더링
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withTheme?: boolean;
  withRouter?: boolean;
}

const AllTheProviders: React.FC<{ children: React.ReactNode; withTheme?: boolean }> = ({ 
  children, 
  withTheme = true 
}) => {
  let wrapped = <>{children}</>;
  
  if (withTheme) {
    wrapped = (
      <ThemeProvider theme={testTheme}>
        {wrapped}
      </ThemeProvider>
    );
  }
  
  return wrapped;
};

export const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { withTheme = true, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders withTheme={withTheme}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

/**
 * 비동기 작업 대기 헬퍼
 */
export const waitForAsync = (ms: number = 0): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock 함수 리셋 헬퍼
 */
export const resetAllMocks = () => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
};

/**
 * 폼 입력 헬퍼
 */
export const fillInput = (input: HTMLElement, value: string) => {
  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
  }
};

/**
 * 선택 상자 변경 헬퍼
 */
export const selectOption = (select: HTMLElement, value: string) => {
  if (select instanceof HTMLSelectElement) {
    select.focus();
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.blur();
  }
};

/**
 * 테스트용 에러 바운더리
 */
export class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Test Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          <h2>테스트 에러가 발생했습니다</h2>
          <details>
            <summary>에러 상세</summary>
            <pre>{this.state.error?.stack}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 에러 바운더리와 함께 렌더링
 */
export const renderWithErrorBoundary = (ui: ReactElement, options?: CustomRenderOptions) => {
  return customRender(
    <TestErrorBoundary>
      {ui}
    </TestErrorBoundary>,
    options
  );
};

/**
 * 로딩 상태 시뮬레이션
 */
export const createLoadingMock = <T,>(
  data: T,
  loadingTime: number = 1000
): { result: Promise<T>; loading: boolean; setLoading: (loading: boolean) => void } => {
  let loading = true;
  const setLoading = (value: boolean) => { loading = value; };
  
  const result = new Promise<T>((resolve) => {
    setTimeout(() => {
      setLoading(false);
      resolve(data);
    }, loadingTime);
  });

  return { result, loading, setLoading };
};

/**
 * 테스트용 Repository Mock 생성기
 */
export const createMockRepository = <T extends Record<string, any>>(
  methods: Partial<T>
): T => {
  const mock = {} as any;
  
  Object.keys(methods).forEach(key => {
    mock[key as keyof T] = jest.fn().mockImplementation(methods[key]);
  });

  return mock as T;
};

/**
 * 콘솔 에러/경고 억제 헬퍼
 */
export const suppressConsoleError = (callback: () => void) => {
  const originalError = console.error;
  console.error = jest.fn();
  
  try {
    callback();
  } finally {
    console.error = originalError;
  }
};

/**
 * React Hook 테스트 헬퍼
 */
export const createHookWrapper = (
  providerProps?: any
): React.FC<{ children: React.ReactNode }> => {
  return ({ children }) => (
    <AllTheProviders {...providerProps}>
      {children}
    </AllTheProviders>
  );
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override render method
export { customRender as render };