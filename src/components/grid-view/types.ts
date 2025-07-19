import React from 'react'

// Column definition for grid
export interface Column {
  id: string
  title: string
  type: 'text' | 'number' | 'date' | 'status' | 'currency' | 'url' | 'custom'
  width: number
  editable: boolean
  frozen?: boolean
  options?: string[]
  colors?: Record<string, string>
  currencyType?: string
  renderCell?: (value: any, row: GridRow) => React.ReactNode
}

// Row data interface
export interface GridRow {
  id: string
  [key: string]: any
}

// Extended type for editing cell to support special flags
export interface EditingCell {
  rowId: string
  columnId: string
  directTyping?: boolean
  clearDateSelection?: boolean
  initialValue?: string
}

// Props for the grid container
export interface GridContainerProps {
  columns: Column[]
  data: GridRow[]
  firstRowIndex?: number
  // listName, listType, listId - now constants within GridViewContainer
  // className - now handled internally with fixed styles
  // searchTerm, onSearchChange - now obtained from Zustand slice internally
  // activeFilters, onApplyFilters - now obtained from Zustand slice internally
  // hiddenColumns, onUnhideColumn - now obtained from Zustand slice internally
  // isContactDeletionLoading - now obtained from Zustand slice internally
  // columnOperationLoading - now obtained from Zustand slice internally
  // onColumnsReorder - now handled internally via Zustand slice with persistence
  onCellChange?: (rowId: string, columnId: string, value: any) => void
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void
  onDeleteColumn?: (columnId: string) => void
  onAddColumn?: (afterColumnId: string) => void
  onInsertColumn?: (
    direction: 'left' | 'right',
    targetIndex: number,
    headerName: string,
    columnType: string,
    config?: any,
  ) => void
  onHideColumn?: (columnId: string) => void
  onUnhideColumn?: (columnId: string) => void
  onShowColumn?: (columnId: string) => void // New: Show column permanently
  onDeleteContacts?: (contactIds: string[]) => Promise<void>
  cellUpdateLoading?: Set<string>
  isColumnTemporarilyVisible?: (columnId: string) => boolean // New: Check if column is temporarily visible
}

// Props for the grid toolbar
export interface GridToolbarProps {
  listName?: string
  listType?: string
  searchTerm: string
  onSearchChange: (term: string) => void
  filterCount: number
  columns: Column[]
  onApplyFilters: (filters: { columns: string[]; values: Record<string, any> }) => void
  activeFilters: { columns: string[]; values: Record<string, any> }
  hiddenColumns?: Column[]
  onUnhideColumn?: (columnId: string) => void
  frozenColumnIds?: string[]
  onTogglePin?: (columnId: string) => void
  selectedRowIds: Set<string>
  onDeleteSelectedContacts?: () => void
  isContactDeletionLoading?: boolean
  data: GridRow[]
}

// Props for the static columns component
export interface StaticColumnsProps {
  data: GridRow[]
  frozenColumns: Column[]
  scrollTop: number
  firstRowIndex: number
  onCellChange: (rowId: string, columnId: string, value: any) => void
  onContextMenu: (columnId: string, position: { x: number; y: number }) => void
  onTogglePin: (columnId: string) => void
  frozenColumnIds: string[]
  editingCell: { rowId: string; columnId: string; directTyping?: boolean; clearDateSelection?: boolean } | null
  setEditingCell: (
    cell: { rowId: string; columnId: string; directTyping?: boolean; clearDateSelection?: boolean } | null,
  ) => void
  selectedRowIds: Set<string>
  onToggleRowSelection: (rowId: string) => void
  onSelectAllRows: (select: boolean) => void
  onContextMenuForRow?: (rowId: string, position: { x: number; y: number }) => void
}

// Props for the context menu
export interface ContextMenuProps {
  column?: Column
  position: { x: number; y: number } | null
  onClose: () => void
  onDeleteColumn?: (columnId: string) => void
  onAddColumn?: () => void
  onRenameColumn?: (columnId: string, newName: string) => void
  onTogglePin?: (columnId: string) => void
  onHideColumn?: (columnId: string) => void
  isPinned?: boolean
  isForRow?: boolean
  rowId?: string
  onDeleteRow?: (rowId: string) => void
}

// Props for the delete contacts dialog
export interface DeleteContactsDialogProps {
  isOpen: boolean
  contactCount: number
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}
