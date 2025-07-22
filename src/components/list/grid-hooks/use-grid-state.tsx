import { useState } from 'react'
import { ColumnDef, ColumnType } from '../grid-view'
import { toast } from 'sonner'

export interface RowData {
  id: string
  [key: string]: any
}

export interface GridState {
  columns: ColumnDef[]
  data: RowData[]
  activeCell: { row: string; col: string } | null
  editingHeader: string | null
  draggedColumn: string | null
  dragOverColumn: string | null
  newColumn: {
    header: string
    type: ColumnType
    options?: string[]
  }
  isAddingColumn: boolean
  showSaveIndicator: { row: string; col: string } | null
}

interface UseGridStateProps {
  initialColumns: ColumnDef[]
  initialData: RowData[]
}

export function useGridState({ initialColumns, initialData }: UseGridStateProps) {
  // Initialize columns with opportunity column as frozen and first
  const [columns, setColumns] = useState<ColumnDef[]>(() => {
    return initialColumns.map(col => ({
      ...col,
      frozen: col.key === 'opportunity',
    }))
  })

  const [data, setData] = useState<RowData[]>(initialData)
  const [activeCell, setActiveCell] = useState<{ row: string; col: string } | null>(null)
  const [editingHeader, setEditingHeader] = useState<string | null>(null)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [newColumn, setNewColumn] = useState<{
    header: string
    type: ColumnType
    options?: string[]
  }>({
    header: '',
    type: 'text',
  })
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [showSaveIndicator, setShowSaveIndicator] = useState<{ row: string; col: string } | null>(null)

  // History stack for undo/redo functionality
  const [undoStack, setUndoStack] = useState<{ columns: ColumnDef[]; data: RowData[] }[]>([])
  const [redoStack, setRedoStack] = useState<{ columns: ColumnDef[]; data: RowData[] }[]>([])

  // Calculate frozen and scrollable columns
  const frozenColumns = columns.filter(col => col.frozen)
  const scrollableColumns = columns.filter(col => !col.frozen)

  // Calculate grid template columns for both sections
  const frozenColsTemplate =
    frozenColumns.length > 0 ? `40px repeat(${frozenColumns.length}, minmax(150px, 1fr))` : '40px'

  const scrollableColsTemplate = `repeat(${scrollableColumns.length}, minmax(150px, 1fr)) auto`

  const saveStateToHistory = () => {
    // Save current state to undo stack
    setUndoStack(prev => [...prev, { columns, data }])
    // Clear redo stack when new action is performed
    setRedoStack([])
  }

  return {
    // State
    columns,
    setColumns,
    data,
    setData,
    activeCell,
    setActiveCell,
    editingHeader,
    setEditingHeader,
    draggedColumn,
    setDraggedColumn,
    dragOverColumn,
    setDragOverColumn,
    newColumn,
    setNewColumn,
    isAddingColumn,
    setIsAddingColumn,
    showSaveIndicator,
    setShowSaveIndicator,

    // History
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    saveStateToHistory,

    // Computed values
    frozenColumns,
    scrollableColumns,
    frozenColsTemplate,
    scrollableColsTemplate,
  }
}
