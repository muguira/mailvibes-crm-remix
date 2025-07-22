import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useIsMobile } from '@/hooks/use-mobile'
import { useStore } from '@/stores'

interface GridPaginationProps {
  // currentPage, pageSize - now obtained from Zustand slice internally
  // onPageChange, onPageSizeChange - now obtained from Zustand slice internally
  totalPages: number
  totalItems: number
  loading?: boolean
  isBackgroundLoading?: boolean
  loadedCount?: number
}

export function GridPagination({
  totalPages,
  totalItems,
  loading = false,
  isBackgroundLoading = false,
  loadedCount = 0,
}: GridPaginationProps) {
  const isMobile = useIsMobile()

  // Get pagination state and actions from Zustand slice
  const { currentPage, pageSize, editableLeadsGridHandlePageChange, editableLeadsGridHandlePageSizeChange } = useStore()

  // Calculate the range of items being displayed
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7 // Maximum number of page buttons to show

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className={`grid-pagination ${isMobile ? 'mobile' : ''}`}>
      {!isMobile && (
        <div className="pagination-info">
          {totalItems === 0 ? (
            <span>No contacts to display</span>
          ) : (
            <>
              <span>
                Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{totalItems}</strong>{' '}
                contacts
              </span>
              {isBackgroundLoading && loadedCount < totalItems && (
                <span className="ml-3 text-sm text-gray-500">
                  (Loading more... {Math.round((loadedCount / totalItems) * 100)}%)
                </span>
              )}
            </>
          )}
        </div>
      )}

      <div className="pagination-controls">
        {/* Page size selector - moved to the left */}
        <div className="page-size-selector">
          {!isMobile && (
            <label htmlFor="page-size" className="page-size-label">
              Rows per page:
            </label>
          )}
          <Select
            value={pageSize.toString()}
            onValueChange={value => editableLeadsGridHandlePageSizeChange(parseInt(value))}
            disabled={loading}
          >
            <SelectTrigger id="page-size" className="page-size-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="500">500</SelectItem>
              <SelectItem value="1000">1000</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Navigation buttons - moved to the right */}
        <div className="pagination-nav">
          {/* First page */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editableLeadsGridHandlePageChange(1)}
            disabled={currentPage === 1 || loading}
            className="pagination-button"
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous page */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editableLeadsGridHandlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="pagination-button"
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers - hide on mobile */}
          {!isMobile && (
            <div className="page-numbers">
              {getPageNumbers().map((page, index) => (
                <div key={index} className="pagination-item">
                  {page === '...' ? (
                    <span className="pagination-ellipsis">...</span>
                  ) : (
                    <Button
                      variant={currentPage === page ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editableLeadsGridHandlePageChange(page as number)}
                      disabled={loading}
                      className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                    >
                      {page}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Next page */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editableLeadsGridHandlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="pagination-button"
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editableLeadsGridHandlePageChange(totalPages)}
            disabled={currentPage === totalPages || loading}
            className="pagination-button"
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
