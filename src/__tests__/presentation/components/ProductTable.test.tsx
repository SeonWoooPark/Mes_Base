import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductTable } from '../../../presentation/components/product/ProductTable';
import { ProductListItem } from '../../../application/usecases/product/GetProductListUseCase';
import { ProductType } from '../../../domain/entities/Product';
import { SortField } from '../../../domain/repositories/ProductRepository';
import { mockProductData, mockPaginationData } from '../../../__mocks__/mockData';
import { renderWithErrorBoundary } from '../../../__mocks__/testUtils';

describe('ProductTable', () => {
  const mockProducts: ProductListItem[] = [
    {
      id: 'test-product-1',
      cd_material: 'TEST001',
      nm_material: '테스트 제품 1',
      type: ProductType.FINISHED_PRODUCT,
      categoryName: '전자부품',
      unitName: '개',
      safetyStock: 100,
      isActive: true,
    },
    {
      id: 'test-product-2',
      cd_material: 'TEST002',
      nm_material: '테스트 제품 2',
      type: ProductType.RAW_MATERIAL,
      categoryName: '원자재',
      unitName: 'KG',
      safetyStock: 50,
      isActive: false,
    },
    {
      id: 'test-product-3',
      cd_material: 'TEST003',
      nm_material: '테스트 제품 3',
      type: ProductType.SEMI_FINISHED,
      categoryName: '반제품',
      unitName: '개',
      safetyStock: 75,
      isActive: true,
    }
  ];

  const defaultProps = {
    products: mockProducts,
    loading: false,
    onSort: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onViewHistory: jest.fn(),
    onBOMManage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('렌더링', () => {
    it('제품 목록을 올바르게 렌더링한다', () => {
      render(<ProductTable {...defaultProps} />);
      
      // 헤더 확인
      expect(screen.getByText('제품코드')).toBeInTheDocument();
      expect(screen.getByText('제품명')).toBeInTheDocument();
      expect(screen.getByText('유형')).toBeInTheDocument();
      expect(screen.getByText('카테고리')).toBeInTheDocument();
      expect(screen.getByText('단위')).toBeInTheDocument();
      expect(screen.getByText('안전재고')).toBeInTheDocument();
      expect(screen.getByText('상태')).toBeInTheDocument();
      expect(screen.getByText('작업')).toBeInTheDocument();

      // 데이터 행 확인
      expect(screen.getByText('TEST001')).toBeInTheDocument();
      expect(screen.getByText('테스트 제품 1')).toBeInTheDocument();
      expect(screen.getByText('TEST002')).toBeInTheDocument();
      expect(screen.getByText('테스트 제품 2')).toBeInTheDocument();
      expect(screen.getByText('TEST003')).toBeInTheDocument();
      expect(screen.getByText('테스트 제품 3')).toBeInTheDocument();
    });

    it('제품 유형을 올바르게 표시한다', () => {
      render(<ProductTable {...defaultProps} />);
      
      expect(screen.getByText('완제품')).toBeInTheDocument();
      expect(screen.getByText('원자재')).toBeInTheDocument();
      expect(screen.getByText('반제품')).toBeInTheDocument();
    });

    it('활성/비활성 상태를 올바르게 표시한다', () => {
      render(<ProductTable {...defaultProps} />);
      
      const activeStatuses = screen.getAllByText('활성');
      const inactiveStatuses = screen.getAllByText('비활성');
      
      expect(activeStatuses).toHaveLength(2); // 제품 1, 3
      expect(inactiveStatuses).toHaveLength(1); // 제품 2
    });

    it('안전재고를 숫자 형식으로 표시한다', () => {
      render(<ProductTable {...defaultProps} />);
      
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
    });
  });

  describe('로딩 상태', () => {
    it('로딩 중일 때 로딩 스피너를 표시한다', () => {
      render(<ProductTable {...defaultProps} loading={true} />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('로딩 중일 때 제품 데이터를 표시하지 않는다', () => {
      render(<ProductTable {...defaultProps} loading={true} />);
      
      expect(screen.queryByText('TEST001')).not.toBeInTheDocument();
    });
  });

  describe('빈 데이터 상태', () => {
    it('제품이 없을 때 빈 상태 메시지를 표시한다', () => {
      render(<ProductTable {...defaultProps} products={[]} />);
      
      expect(screen.getByText('등록된 제품이 없습니다')).toBeInTheDocument();
      expect(screen.getByText('신규 등록 버튼을 클릭하여 제품을 추가하세요.')).toBeInTheDocument();
    });
  });

  describe('정렬 기능', () => {
    it('제품코드 헤더 클릭 시 정렬 함수가 호출된다', async () => {
      const user = userEvent.setup();
      render(<ProductTable {...defaultProps} />);
      
      const codeHeader = screen.getByText('제품코드');
      await user.click(codeHeader);
      
      expect(defaultProps.onSort).toHaveBeenCalledWith(SortField.CODE);
    });

    it('제품명 헤더 클릭 시 정렬 함수가 호출된다', async () => {
      const user = userEvent.setup();
      render(<ProductTable {...defaultProps} />);
      
      const nameHeader = screen.getByText('제품명');
      await user.click(nameHeader);
      
      expect(defaultProps.onSort).toHaveBeenCalledWith(SortField.NAME);
    });

    it('생성일 헤더 클릭 시 정렬 함수가 호출된다', async () => {
      const user = userEvent.setup();
      render(<ProductTable {...defaultProps} />);
      
      const createdDateHeader = screen.getByText('생성일');
      await user.click(createdDateHeader);
      
      expect(defaultProps.onSort).toHaveBeenCalledWith(SortField.CREATED_DATE);
    });

    it('정렬 불가능한 컬럼은 클릭해도 정렬 함수가 호출되지 않는다', async () => {
      const user = userEvent.setup();
      render(<ProductTable {...defaultProps} />);
      
      const typeHeader = screen.getByText('유형');
      await user.click(typeHeader);
      
      expect(defaultProps.onSort).not.toHaveBeenCalled();
    });
  });

  describe('액션 버튼', () => {
    it('수정 버튼 클릭 시 onEdit 함수가 호출된다', async () => {
      const user = userEvent.setup();
      render(<ProductTable {...defaultProps} />);
      
      const editButtons = screen.getAllByText('수정');
      await user.click(editButtons[0]);
      
      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockProducts[0]);
    });

    it('삭제 버튼 클릭 시 확인 후 onDelete 함수가 호출된다', async () => {
      const user = userEvent.setup();
      // window.confirm mock이 true를 반환하도록 설정 (setupTests.ts에서 이미 설정됨)
      render(<ProductTable {...defaultProps} />);
      
      const deleteButtons = screen.getAllByText('삭제');
      await user.click(deleteButtons[0]);
      
      expect(defaultProps.onDelete).toHaveBeenCalledWith(mockProducts[0]);
    });

    it('삭제 확인 대화상자에서 취소 시 onDelete 함수가 호출되지 않는다', async () => {
      const user = userEvent.setup();
      // window.confirm이 false를 반환하도록 설정
      window.confirm = jest.fn(() => false);
      
      render(<ProductTable {...defaultProps} />);
      
      const deleteButtons = screen.getAllByText('삭제');
      await user.click(deleteButtons[0]);
      
      expect(defaultProps.onDelete).not.toHaveBeenCalled();
    });

    it('이력 버튼 클릭 시 onViewHistory 함수가 호출된다', async () => {
      const user = userEvent.setup();
      render(<ProductTable {...defaultProps} />);
      
      const historyButtons = screen.getAllByText('이력');
      await user.click(historyButtons[0]);
      
      expect(defaultProps.onViewHistory).toHaveBeenCalledWith(mockProducts[0]);
    });

    it('BOM 관리 버튼 클릭 시 onBOMManage 함수가 호출된다', async () => {
      const user = userEvent.setup();
      render(<ProductTable {...defaultProps} />);
      
      const bomButtons = screen.getAllByText('BOM');
      await user.click(bomButtons[0]);
      
      expect(defaultProps.onBOMManage).toHaveBeenCalledWith(mockProducts[0]);
    });
  });

  describe('접근성', () => {
    it('테이블이 적절한 접근성 속성을 가지고 있다', () => {
      render(<ProductTable {...defaultProps} />);
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(8); // 8개 컬럼
      
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(4); // 헤더 1개 + 데이터 3개
    });

    it('정렬 가능한 헤더에 aria-sort 속성이 있다', () => {
      render(<ProductTable {...defaultProps} />);
      
      const sortableHeaders = ['제품코드', '제품명', '생성일'];
      
      sortableHeaders.forEach(headerText => {
        const header = screen.getByText(headerText);
        expect(header.closest('th')).toHaveAttribute('aria-sort');
      });
    });

    it('버튼들이 적절한 접근성 레이블을 가지고 있다', () => {
      render(<ProductTable {...defaultProps} />);
      
      const editButtons = screen.getAllByLabelText(/수정/);
      const deleteButtons = screen.getAllByLabelText(/삭제/);
      const historyButtons = screen.getAllByLabelText(/이력/);
      const bomButtons = screen.getAllByLabelText(/BOM/);
      
      expect(editButtons).toHaveLength(3);
      expect(deleteButtons).toHaveLength(3);
      expect(historyButtons).toHaveLength(3);
      expect(bomButtons).toHaveLength(3);
    });
  });

  describe('반응형 디자인', () => {
    it('작은 화면에서 테이블이 스크롤 가능하다', () => {
      // CSS 속성은 실제 브라우저에서만 확인 가능하므로 DOM 구조만 확인
      render(<ProductTable {...defaultProps} />);
      
      const tableContainer = screen.getByRole('table').parentElement;
      expect(tableContainer).toHaveClass('table-container');
    });
  });

  describe('성능', () => {
    it('대량의 제품 데이터를 처리할 수 있다', () => {
      const largeProductList = mockPaginationData.page1.products.map((product, index) => ({
        id: product.id,
        cd_material: product.cd_material,
        nm_material: product.nm_material,
        type: product.type,
        categoryName: '전자부품',
        unitName: '개',
        safetyStock: 100,
        isActive: true,
      }));
      
      const startTime = performance.now();
      render(<ProductTable {...defaultProps} products={largeProductList} />);
      const endTime = performance.now();
      
      // 렌더링 시간이 1초를 넘지 않는지 확인
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('에러 처리', () => {
    it('잘못된 제품 데이터에도 오류 없이 렌더링된다', () => {
      const invalidProducts = [
        {
          id: 'invalid-1',
          cd_material: '',
          nm_material: '',
          type: ProductType.FINISHED_PRODUCT,
          categoryName: '',
          unitName: '',
          safetyStock: -1,
          isActive: true,
        }
      ];
      
      expect(() => {
        render(<ProductTable {...defaultProps} products={invalidProducts} />);
      }).not.toThrow();
    });

    it('undefined나 null 값이 있어도 처리한다', () => {
      const productsWithNulls = [
        {
          id: 'null-test',
          cd_material: 'NULL001',
          nm_material: '널 테스트',
          type: ProductType.FINISHED_PRODUCT,
          categoryName: null as any,
          unitName: undefined as any,
          safetyStock: 0,
          isActive: true,
        }
      ];
      
      expect(() => {
        render(<ProductTable {...defaultProps} products={productsWithNulls} />);
      }).not.toThrow();
    });
  });

  describe('키보드 네비게이션', () => {
    it('Tab 키로 버튼 간 이동이 가능하다', async () => {
      const user = userEvent.setup();
      render(<ProductTable {...defaultProps} />);
      
      // 첫 번째 수정 버튼으로 포커스 이동
      const firstEditButton = screen.getAllByText('수정')[0];
      firstEditButton.focus();
      expect(firstEditButton).toHaveFocus();
      
      // Tab 키로 다음 버튼으로 이동
      await user.tab();
      const firstDeleteButton = screen.getAllByText('삭제')[0];
      expect(firstDeleteButton).toHaveFocus();
    });

    it('Enter 키로 버튼을 활성화할 수 있다', async () => {
      const user = userEvent.setup();
      render(<ProductTable {...defaultProps} />);
      
      const editButton = screen.getAllByText('수정')[0];
      editButton.focus();
      
      await user.keyboard('{Enter}');
      
      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockProducts[0]);
    });
  });

  describe('국제화', () => {
    it('한국어 텍스트가 올바르게 표시된다', () => {
      render(<ProductTable {...defaultProps} />);
      
      expect(screen.getByText('제품코드')).toBeInTheDocument();
      expect(screen.getByText('제품명')).toBeInTheDocument();
      expect(screen.getByText('완제품')).toBeInTheDocument();
      expect(screen.getByText('원자재')).toBeInTheDocument();
      expect(screen.getByText('반제품')).toBeInTheDocument();
      expect(screen.getByText('활성')).toBeInTheDocument();
      expect(screen.getByText('비활성')).toBeInTheDocument();
    });
  });
});