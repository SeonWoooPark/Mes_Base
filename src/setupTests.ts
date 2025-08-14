// Jest DOM 테스트 유틸리티 설정
import '@testing-library/jest-dom';

// 전역 테스트 설정
global.console = {
  ...console,
  // 테스트 중 불필요한 로그 억제
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// window.confirm mock (BOM 삭제 등에서 사용)
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: jest.fn(() => true)
});

// window.alert mock
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn()
});

// localStorage mock
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Date mock 설정 (일관된 테스트를 위해)
const mockDate = new Date('2024-12-01T00:00:00.000Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

// 환경 변수 mock
process.env.REACT_APP_USE_MOCK_DATA = 'true';
process.env.REACT_APP_API_BASE_URL = 'http://localhost:8080';