/**
 * Example: How to integrate useColumnOperations hook into existing components
 *
 * This example shows how to replace duplicate column operation code with the shared hook
 */

import React, { useState } from 'react'
import { useColumnOperations, Column, GridRow } from './use-column-operations'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/utils/logger'

// Example component showing integration
export function GridComponentWithColumnOps() {
  // Your existing state
  const [columns, setColumns] = useState<Column[]>([
    { id: 'name', title: 'Name', type: 'text', width: 180 },
    { id: 'status', title: 'Status', type: 'status', width: 150 },
    { id: 'email', title: 'Email', type: 'text', width: 200 },
  ])

  const [data, setData] = useState<GridRow[]>([
    { id: '1', name: 'John Doe', status: 'Active', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', status: 'Pending', email: 'jane@example.com' },
  ])

  // Example persistence function
  const persistColumns = async (updatedColumns: Column[]) => {
    try {
      // Your persistence logic here (e.g., save to database)
      await fetch('/api/columns', {
        method: 'POST',
        body: JSON.stringify(updatedColumns),
      })
    } catch (error) {
      logger.error('Failed to persist columns:', error)
    }
  }

  // Example activity logging
  const logActivity = (action: string, details: any) => {
    logger.log(`[Activity] ${action}:`, details)
    // You could send this to an analytics service or activity feed
  }

  // Initialize the hook with all necessary props
  const columnOps = useColumnOperations({
    columns,
    setColumns,
    data,
    setData,
    onPersist: persistColumns,
    protectedColumns: ['name'], // Name column can't be deleted
    onActivityLog: logActivity,
  })

  // Example usage in event handlers
  const handleColumnRename = (columnId: string) => {
    const newName = prompt('Enter new column name:')
    if (newName) {
      columnOps.renameColumn(columnId, newName)
    }
  }

  const handleColumnDelete = (columnId: string) => {
    if (confirm('Are you sure you want to delete this column?')) {
      const success = columnOps.deleteColumn(columnId)
      if (!success) {
        toast({
          title: 'Cannot delete column',
          description: 'This column is protected and cannot be deleted.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleColumnDuplicate = (column: Column) => {
    const newColumn = columnOps.duplicateColumn(column)
    if (newColumn) {
      toast({
        title: 'Column duplicated',
        description: `Created "${newColumn.title}"`,
      })
    }
  }

  // Example drag and drop handler
  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const sourceIndex = result.source.index
    const destIndex = result.destination.index

    const columnId = columns[sourceIndex].id
    columnOps.moveColumnToIndex(columnId, destIndex)
  }

  return (
    <div>
      {/* Your grid component JSX here */}
      <div className="grid-header">
        {columns.map(column => (
          <div key={column.id} className="column-header">
            <span>{column.title}</span>
            <button onClick={() => handleColumnRename(column.id)}>Rename</button>
            <button onClick={() => columnOps.sortColumn(column.id, 'asc')}>Sort ↑</button>
            <button onClick={() => columnOps.sortColumn(column.id, 'desc')}>Sort ↓</button>
            <button onClick={() => handleColumnDuplicate(column)}>Duplicate</button>
            <button onClick={() => handleColumnDelete(column.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Example: Migrating from old pattern to new pattern
export function MigrationExample() {
  const [columns, setColumns] = useState<Column[]>([])
  const [data, setData] = useState<GridRow[]>([])

  // ❌ OLD WAY - Duplicate code in each component:
  const oldRenameColumn = (colId: string, newName: string) => {
    setColumns(prev => prev.map(col => (col.id === colId ? { ...col, title: newName } : col)))
  }

  const oldDeleteColumn = (colId: string) => {
    setColumns(prev => prev.filter(col => col.id !== colId))
    setData(prev =>
      prev.map(row => {
        const { [colId]: _, ...rest } = row
        return rest
      }),
    )
  }

  // ✅ NEW WAY - Use the shared hook:
  const columnOps = useColumnOperations({
    columns,
    setColumns,
    data,
    setData,
  })

  // Now you can simply use:
  // columnOps.renameColumn(id, newName)
  // columnOps.deleteColumn(id)
  // columnOps.duplicateColumn(column)
  // etc.

  return null
}

// Example: Integration with existing EditableLeadsGrid
export function EditableLeadsGridIntegration() {
  const [columns, setColumns] = useState<Column[]>([])
  const [data, setData] = useState<GridRow[]>([])

  // Initialize the column operations hook
  const { renameColumn, deleteColumn, duplicateColumn, sortColumn, moveColumn, addColumn, hideColumn, reorderColumns } =
    useColumnOperations({
      columns,
      setColumns,
      data,
      setData,
      protectedColumns: ['name', 'status', 'company'],
      onPersist: async cols => {
        // Your existing persistColumns logic
        localStorage.setItem('grid-columns', JSON.stringify(cols))
      },
      onActivityLog: (action, details) => {
        // Your existing activity logging
        logger.log(`Column ${action}:`, details)
      },
    })

  // Replace your existing handlers with these:
  const handleColumnOperations = {
    onRename: renameColumn,
    onDelete: (id: string) => {
      if (!deleteColumn(id)) {
        toast({
          title: 'Cannot delete primary column',
          description: 'This column is required and cannot be removed.',
          variant: 'destructive',
        })
      }
    },
    onDuplicate: duplicateColumn,
    onSort: sortColumn,
    onMove: moveColumn,
    onAdd: (afterId: string) => addColumn(afterId, { width: 200 }),
    onHide: hideColumn,
    onReorder: reorderColumns,
  }

  return null // Your actual component JSX
}

// Example: Type-safe column definitions
export const COLUMN_DEFINITIONS = {
  text: {
    defaultWidth: 200,
    editable: true,
    type: 'text',
  },
  status: {
    defaultWidth: 150,
    editable: true,
    type: 'status',
    options: ['Active', 'Pending', 'Archived'],
    colors: {
      Active: '#10B981',
      Pending: '#F59E0B',
      Archived: '#6B7280',
    },
  },
  date: {
    defaultWidth: 150,
    editable: true,
    type: 'date',
  },
} as const

// Helper to create columns with consistent defaults
export function createColumn(
  id: string,
  title: string,
  type: keyof typeof COLUMN_DEFINITIONS = 'text',
  overrides?: Partial<Column>,
): Column {
  return {
    id,
    title,
    ...COLUMN_DEFINITIONS[type],
    ...overrides,
  }
}
