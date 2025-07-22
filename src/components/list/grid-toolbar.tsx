import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ColumnDef } from './grid/types'

interface GridToolbarProps {
  listType?: string
  columns: ColumnDef[]
  onAddItem?: () => void
}

export function GridToolbar({ listType, columns, onAddItem }: GridToolbarProps) {
  // Count columns with filter property if it exists, otherwise assume 0
  const filterCount = columns.filter(col => col.filter !== undefined).length

  return (
    <div className="flex justify-between items-center p-2 border-b border-slate-light/20 bg-white">
      <div className="flex items-center space-x-2">
        {/* This toolbar is now used only for displaying optional list-specific actions */}
        {/* Search and filters are handled by the parent component */}
      </div>

      <div className="flex items-center space-x-2">
        {/* Label for columns count */}
        <span className="text-sm text-slate-400">
          {columns.length} columns • {listType || 'Item'}
        </span>

        {/* Add Item Button */}
        {onAddItem && (
          <Button
            onClick={onAddItem}
            size="sm"
            className="bg-teal-primary hover:bg-teal-primary/80 text-white text-xs px-2"
          >
            <Plus size={14} className="mr-1" />
            Add {listType || 'Item'}
          </Button>
        )}
      </div>
    </div>
  )
}
