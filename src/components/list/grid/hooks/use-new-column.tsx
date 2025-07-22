import { useState } from 'react'
import { ColumnType } from '../types'

export function useNewColumn() {
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumn, setNewColumn] = useState<{
    header: string
    type: ColumnType
    options?: string[]
    colors?: Record<string, string>
  }>({
    header: '',
    type: 'text',
    options: [],
  })

  return {
    isAddingColumn,
    setIsAddingColumn,
    newColumn,
    setNewColumn,
  }
}
