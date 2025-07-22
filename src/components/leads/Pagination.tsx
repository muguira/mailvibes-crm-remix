import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  status?: string
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  status = 'No leads data available',
}: PaginationProps) {
  return (
    <div className="py-2 px-4 flex items-center justify-between border-t">
      <div className="text-sm text-gray-500">{status}</div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Prev
        </Button>
        <span className="flex items-center text-sm">
          Page <strong className="mx-1">{currentPage}</strong> of <strong className="ml-1">{totalPages || 1}</strong>
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
