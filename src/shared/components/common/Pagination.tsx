import React from 'react';
import { Pagination as StyledPagination } from '@shared/utils/styled';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
}) => {
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const showDots = -1;
    
    // 총 페이지가 7개 이하면 모든 페이지를 표시
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // 현재 페이지가 처음 4페이지 내에 있을 때
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push(showDots);
      pages.push(totalPages);
    }
    // 현재 페이지가 마지막 4페이지 내에 있을 때
    else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push(showDots);
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i);
      }
    }
    // 현재 페이지가 중간에 있을 때
    else {
      pages.push(1);
      pages.push(showDots);
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i);
      }
      pages.push(showDots);
      pages.push(totalPages);
    }

    return pages;
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  if (totalPages <= 1) {
    return (
      <StyledPagination>
        <div className="page-info">
          총 {totalCount}건
        </div>
      </StyledPagination>
    );
  }

  return (
    <StyledPagination>
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      >
        {'<<'}
      </button>
      
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        {'<'}
      </button>

      {getPageNumbers().map((page, index) => {
        if (page === -1) {
          return <span key={`dots-${index}`}>...</span>;
        }

        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={page === currentPage ? 'active' : ''}
          >
            {page}
          </button>
        );
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        {'>'}
      </button>

      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        {'>>'}
      </button>

      <div className="page-info">
        {startItem}-{endItem} / {totalCount}건
      </div>
    </StyledPagination>
  );
};