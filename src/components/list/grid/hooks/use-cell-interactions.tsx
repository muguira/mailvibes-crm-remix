interface UseCellInteractionsProps {
  data: any[]
  setData: React.Dispatch<React.SetStateAction<any[]>>
  setActiveCell: React.Dispatch<React.SetStateAction<{ row: string; col: string } | null>>
  setShowSaveIndicator: React.Dispatch<React.SetStateAction<{ row: string; col: string } | null>>
}

export function useCellInteractions({ data, setData, setActiveCell, setShowSaveIndicator }: UseCellInteractionsProps) {
  // Cell click handler
  const handleCellClick = (rowId: string, colKey: string, colType?: string) => {
    setActiveCell({ row: rowId, col: colKey })
  }

  // Cell change handler
  const handleCellChange = (rowId: string, colKey: string, value: any, type?: string) => {
    setData(prevData => prevData.map(row => (row.id === rowId ? { ...row, [colKey]: value } : row)))
    setShowSaveIndicator({ row: rowId, col: colKey })

    // Clear save indicator after a delay
    setTimeout(() => {
      setShowSaveIndicator(null)
    }, 1000)
  }

  return {
    handleCellClick,
    handleCellChange,
  }
}
