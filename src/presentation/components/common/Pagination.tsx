import React from 'react';
import { Pagination as StyledPagination } from '../../utils/styled';

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
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, -1);
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push(-2, totalPages);
    } else {
      if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }
    }

    return rangeWithDots;
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
        if (page === -1 || page === -2) {
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