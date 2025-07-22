import { ColumnType } from '../grid-view'
import { isValidUrl } from '../grid-utils'

interface CellClickHandlerProps {
  isEditable: boolean
  type: ColumnType
  value: any
  isActive: boolean
  rowId: string
  colKey: string
  options?: string[]
  onCellChange: (rowId: string, colKey: string, value: any, type: ColumnType) => void
  onCellClick: (rowId: string, colKey: string, type: ColumnType, options?: string[]) => void
  openPopover: (element: HTMLElement, type: 'select' | 'date' | 'none') => void
}

export function useCellClickHandler({
  isEditable,
  type,
  value,
  isActive,
  rowId,
  colKey,
  options,
  onCellChange,
  onCellClick,
  openPopover,
}: CellClickHandlerProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (!isEditable) return

    // Handle checkbox toggle directly
    if (type === 'checkbox') {
      onCellChange(rowId, colKey, !value, type)
      return
    }

    // Handle URL click (open link in new tab)
    if (type === 'url' && value && isValidUrl(value)) {
      if (!isActive) {
        window.open(value, '_blank')
        return
      }
    }

    // For status or select type, open the dropdown
    if ((type === 'status' || type === 'select') && options && options.length > 0) {
      const cellElement = e.currentTarget as HTMLElement
      openPopover(cellElement, 'select')
      return
    }

    // For date type, open the date picker
    if (type === 'date') {
      const cellElement = e.currentTarget as HTMLElement
      openPopover(cellElement, 'date')
      return
    }

    // For other types, activate the cell for direct editing
    onCellClick(rowId, colKey, type, options)
  }

  return { handleClick }
}
