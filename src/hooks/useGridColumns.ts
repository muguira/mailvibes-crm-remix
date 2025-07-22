import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Column } from '@/components/grid-view/types'
import { DEFAULT_COLUMN_WIDTH } from '@/components/grid-view/grid-constants'

export interface UseGridColumnsHook {
  columns: Column[]
  setColumns: (columns: Column[]) => void
  insertColumn: (direction: 'left' | 'right', targetIdx: number, header?: string) => void
}

export function useGridColumns(initialColumns: Column[]): UseGridColumnsHook {
  const [columns, setColumns] = useState<Column[]>(initialColumns)

  const insertColumn = useCallback((direction: 'left' | 'right', targetIdx: number, header: string = 'New Column') => {
    const insertAt = direction === 'left' ? targetIdx : targetIdx + 1

    const newColumn: Column = {
      id: `column-${uuidv4().substring(0, 8)}`,
      title: header,
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    }

    setColumns(cols => [...cols.slice(0, insertAt), newColumn, ...cols.slice(insertAt)])
  }, [])

  return {
    columns,
    setColumns,
    insertColumn,
  }
}
