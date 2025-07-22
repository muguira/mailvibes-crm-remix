import { useMemo, useState, useEffect } from 'react'
import { ColumnDef, ColumnType } from '../types'
import { logger } from '@/utils/logger'

interface UseGridColumnsProps {
  initialColumns: ColumnDef[]
}

export function useGridColumns({ initialColumns }: UseGridColumnsProps) {
  // State for columns
  const [columns, setColumns] = useState<ColumnDef[]>(initialColumns)
  const [editingHeader, setEditingHeader] = useState<string | null>(null)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  // Sync columns when initialColumns change
  useEffect(() => {
    logger.log('initialColumns updated:', initialColumns)
    setColumns(initialColumns)
  }, [initialColumns])

  // Memoized frozen and scrollable columns
  const frozenColumns = useMemo(() => {
    const frozen = columns.filter(col => col.frozen)
    logger.log('Frozen columns computed:', frozen)
    return frozen
  }, [columns])

  const scrollableColumns = useMemo(() => {
    const scrollable = columns.filter(col => !col.frozen)
    logger.log('Scrollable columns computed:', scrollable)
    return scrollable
  }, [columns])

  const colMinWidth = 150
  const colDefaultWidth = 150

  const frozenColsTemplate = useMemo(() => {
    document.documentElement.style.setProperty('--cell-min-width', `${colMinWidth}px`)
    document.documentElement.style.setProperty('--cell-width', `${colDefaultWidth}px`)

    return frozenColumns.map(() => `${colDefaultWidth}px`).join(' ')
  }, [frozenColumns])

  const scrollableColsTemplate = useMemo(() => {
    return scrollableColumns.map(() => `${colDefaultWidth}px`).join(' ')
  }, [scrollableColumns])

  return {
    columns,
    setColumns,
    editingHeader,
    setEditingHeader,
    draggedColumn,
    setDraggedColumn,
    dragOverColumn,
    setDragOverColumn,
    frozenColumns,
    scrollableColumns,
    frozenColsTemplate,
    scrollableColsTemplate,
  }
}
