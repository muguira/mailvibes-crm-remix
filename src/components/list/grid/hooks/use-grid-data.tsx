import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '@/utils/logger'

interface UseGridDataProps {
  initialData: any[]
}

export function useGridData({ initialData }: UseGridDataProps) {
  // State for data
  const [data, setData] = useState<any[]>(initialData)
  const [activeCell, setActiveCell] = useState<{ row: string; col: string } | null>(null)
  const [showSaveIndicator, setShowSaveIndicator] = useState<{ row: string; col: string } | null>(null)

  // Sync data when initialData changes
  useEffect(() => {
    logger.log('initialData updated:', initialData)

    // Ensure all rows have valid unique IDs
    const processedData = initialData.map(row => {
      if (!row.id) {
        return { ...row, id: `data-${uuidv4()}` }
      }
      return row
    })

    setData(processedData)
  }, [initialData])

  return {
    data,
    setData,
    activeCell,
    setActiveCell,
    showSaveIndicator,
    setShowSaveIndicator,
  }
}
