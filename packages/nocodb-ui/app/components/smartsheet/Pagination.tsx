"use client";

import { useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalRows: number;
  isLoading?: boolean;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRefresh?: () => void;
}

export function Pagination({
  currentPage,
  pageSize,
  totalRows,
  isLoading = false,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  onRefresh,
}: PaginationProps) {
  const [showPageSizeMenu, setShowPageSizeMenu] = useState(false);

  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const startRow = totalRows > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endRow = Math.min(currentPage * pageSize, totalRows);

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      onPageSizeChange(newSize);
      setShowPageSizeMenu(false);
    },
    [onPageSizeChange]
  );

  const goToFirstPage = useCallback(() => {
    if (canGoPrev) onPageChange(1);
  }, [canGoPrev, onPageChange]);

  const goToPrevPage = useCallback(() => {
    if (canGoPrev) onPageChange(currentPage - 1);
  }, [canGoPrev, currentPage, onPageChange]);

  const goToNextPage = useCallback(() => {
    if (canGoNext) onPageChange(currentPage + 1);
  }, [canGoNext, currentPage, onPageChange]);

  const goToLastPage = useCallback(() => {
    if (canGoNext) onPageChange(totalPages);
  }, [canGoNext, totalPages, onPageChange]);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-gray-200">
      {/* Left: Row count info */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          共 <span className="font-medium text-gray-900">{totalRows.toLocaleString()}</span> 条记录
        </span>
        {totalRows > 0 && (
          <span className="text-sm text-gray-500">
            显示 {startRow.toLocaleString()} - {endRow.toLocaleString()} 条
          </span>
        )}
      </div>

      {/* Right: Pagination controls */}
      <div className="flex items-center gap-3">
        {/* Page size selector */}
        <div className="relative">
          <button
            onClick={() => setShowPageSizeMenu(!showPageSizeMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
          >
            <span>每页 {pageSize} 条</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showPageSizeMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPageSizeMenu(false)}
              />
              <div className="absolute bottom-full right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[100px]">
                {pageSizeOptions.map((size) => (
                  <button
                    key={size}
                    onClick={() => handlePageSizeChange(size)}
                    className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-100 transition-colors ${
                      pageSize === size
                        ? "text-blue-600 bg-blue-50 font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    {size} 条/页
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
          {/* First page */}
          <button
            onClick={goToFirstPage}
            disabled={!canGoPrev || isLoading}
            className="p-1.5 rounded hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
            title="第一页"
          >
            <ChevronsLeft className="w-4 h-4 text-gray-600" />
          </button>

          {/* Previous page */}
          <button
            onClick={goToPrevPage}
            disabled={!canGoPrev || isLoading}
            className="p-1.5 rounded hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
            title="上一页"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>

          {/* Page info */}
          <div className="flex items-center gap-1.5 px-3 py-1 text-sm">
            <span className="text-gray-500">第</span>
            <span className="min-w-[24px] text-center font-medium text-gray-900">
              {currentPage}
            </span>
            <span className="text-gray-500">/</span>
            <span className="min-w-[24px] text-center text-gray-600">
              {totalPages}
            </span>
            <span className="text-gray-500">页</span>
          </div>

          {/* Next page */}
          <button
            onClick={goToNextPage}
            disabled={!canGoNext || isLoading}
            className="p-1.5 rounded hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
            title="下一页"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>

          {/* Last page */}
          <button
            onClick={goToLastPage}
            disabled={!canGoNext || isLoading}
            className="p-1.5 rounded hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
            title="最后一页"
          >
            <ChevronsRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${
              isLoading ? "cursor-not-allowed" : ""
            }`}
            title="刷新数据"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-500 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>
    </div>
  );
}
