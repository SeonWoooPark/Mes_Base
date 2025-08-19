import styled from 'styled-components';

export const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

export const Card = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 24px;
  margin-bottom: 20px;
`;

export const Button = styled.button<{ 
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'small' | 'medium' | 'large';
}>`
  padding: ${({ size = 'medium' }) => 
    size === 'small' ? '6px 12px' : size === 'large' ? '10px 20px' : '8px 16px'};
  border-radius: 4px;
  border: ${({ variant }) => (variant === 'outline' ? '1px solid #6c757d' : 'none')};
  font-size: ${({ size = 'medium' }) => 
    size === 'small' ? '12px' : size === 'large' ? '16px' : '14px'};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  ${({ variant = 'primary' }) => {
    switch (variant) {
      case 'primary':
        return `
          background: #007bff;
          color: white;
          &:hover { background: #0056b3; }
        `;
      case 'secondary':
        return `
          background: #6c757d;
          color: white;
          &:hover { background: #545b62; }
        `;
      case 'danger':
        return `
          background: #dc3545;
          color: white;
          &:hover { background: #c82333; }
        `;
      case 'outline':
        return `
          background: transparent;
          color: #6c757d;
          &:hover { background: rgba(108, 117, 125, 0.1); }
        `;
      default:
        return `
          background: #007bff;
          color: white;
          &:hover { background: #0056b3; }
        `;
    }
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

export const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  width: 100%;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;

  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }

  th {
    background-color: #f8f9fa;
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  tbody tr:hover {
    background-color: #f5f5f5;
  }
`;

export const Flex = styled.div<{ gap?: number; justify?: string; align?: string }>`
  display: flex;
  gap: ${({ gap = 8 }) => gap}px;
  justify-content: ${({ justify = 'flex-start' }) => justify};
  align-items: ${({ align = 'center' }) => align};
`;

export const FormGroup = styled.div`
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 4px;
    font-weight: 500;
    color: #333;
  }

  .error {
    color: #dc3545;
    font-size: 12px;
    margin-top: 4px;
  }
`;

export const Modal = styled.div<{ isOpen: boolean }>`
  display: ${({ isOpen }) => (isOpen ? 'flex' : 'none')};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const ModalContent = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;

  h2 {
    margin: 0 0 20px 0;
    color: #333;
  }
`;

export const StatusBadge = styled.span<{ active: boolean }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;

  ${({ active }) =>
    active
      ? `
      background: #d4edda;
      color: #155724;
    `
      : `
      background: #f8d7da;
      color: #721c24;
    `}
`;

export const SearchContainer = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
  flex-wrap: wrap;
`;

export const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 20px;

  button {
    padding: 8px 12px;
    border: 1px solid #ddd;
    background: white;
    cursor: pointer;
    border-radius: 4px;

    &:hover {
      background: #f5f5f5;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }
  }

  .page-info {
    margin: 0 16px;
    color: #666;
    font-size: 14px;
  }
`;

export const LoadingSpinner = styled.div<{ size?: 'small' | 'medium' | 'large' }>`
  display: inline-block;
  width: ${({ size = 'medium' }) => (size === 'small' ? '16px' : size === 'large' ? '28px' : '20px')};
  height: ${({ size = 'medium' }) => (size === 'small' ? '16px' : size === 'large' ? '28px' : '20px')};
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export const TabContainer = styled.div`
  margin-bottom: 24px;
`;

export const TabList = styled.div`
  display: flex;
  border-bottom: 2px solid #e9ecef;
  margin-bottom: 24px;
`;

export const Tab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  border: none;
  background: none;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  color: ${({ active }) => (active ? '#007bff' : '#666')};
  transition: all 0.2s;

  &:hover {
    color: #007bff;
    background-color: rgba(0, 123, 255, 0.1);
  }

  ${({ active }) =>
    active &&
    `
    &:after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background-color: #007bff;
    }
  `}
`;

export const TabPanel = styled.div<{ active: boolean }>`
  display: ${({ active }) => (active ? 'block' : 'none')};
`;