import React from 'react';

// Column definition for grid
export interface Column {
  id: string;
  title: string;
  type: 'text' | 'number' | 'date' | 'status' | 'currency' | 'url' | 'custom';
  width: number;
  editable: boolean;
  frozen?: boolean;
  options?: string[];
  colors?: Record<string, string>;
  currencyType?: string;
  renderCell?: (value: any, row: GridRow) => React.ReactNode;
}

// Row data interface
export interface GridRow {
  id: string;
  [key: string]: any;
}

// Extended type for editing cell to support special flags
export interface EditingCell {
  rowId: string;
  columnId: string;
  directTyping?: boolean;
  clearDateSelection?: boolean;
  initialValue?: string;
}

// Props for the grid container
export interface GridContainerProps {
  columns: Column[];
  data: GridRow[];
  listName?: string;
  listType?: string;
  listId?: string;
  firstRowIndex?: number;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  activeFilters?: { columns: string[], values: Record<string, any> };
  onApplyFilters?: (filters: { columns: string[], values: Record<string, any> }) => void;
  onCellChange?: (rowId: string, columnId: string, value: any) => void;
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void;
  onColumnsReorder?: (columnIds: string[]) => void;
  onDeleteColumn?: (columnId: string) => void;
  onAddColumn?: (afterColumnId: string) => void;
  onInsertColumn?: (direction: 'left' | 'right', targetIndex: number, headerName: string, columnType: string, config?: any) => void;
  onHideColumn?: (columnId: string) => void;
  onUnhideColumn?: (columnId: string) => void;
  onDeleteContacts?: (contactIds: string[]) => Promise<void>;
  isContactDeletionLoading?: boolean;
  hiddenColumns?: Column[];
  className?: string;
  columnOperationLoading?: {
    type: 'add' | 'delete' | 'rename' | 'hide' | 'unhide' | null;
    columnId?: string;
  };
  cellUpdateLoading?: Set<string>;
}

// Props for the grid toolbar
export interface GridToolbarProps {
  listName?: string;
  listType?: string;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterCount: number;
  columns: Column[];
  onApplyFilters: (filters: { columns: string[], values: Record<string, any> }) => void;
  activeFilters: { columns: string[], values: Record<string, any> };
  hiddenColumns?: Column[];
  onUnhideColumn?: (columnId: string) => void;
  frozenColumnIds?: string[];
  onTogglePin?: (columnId: string) => void;
  selectedRowIds: Set<string>;
  onDeleteSelectedContacts?: () => void;
  isContactDeletionLoading?: boolean;
  data: GridRow[];
}

// Props for the static columns component
export interface StaticColumnsProps {
  data: GridRow[];
  frozenColumns: Column[];
  scrollTop: number;
  firstRowIndex: number;
  onCellChange: (rowId: string, columnId: string, value: any) => void;
  onContextMenu: (columnId: string, position: { x: number; y: number }) => void;
  onTogglePin: (columnId: string) => void;
  frozenColumnIds: string[];
  editingCell: { rowId: string; columnId: string; directTyping?: boolean; clearDateSelection?: boolean } | null;
  setEditingCell: (cell: { rowId: string; columnId: string; directTyping?: boolean; clearDateSelection?: boolean } | null) => void;
  selectedRowIds: Set<string>;
  onToggleRowSelection: (rowId: string) => void;
  onSelectAllRows: (select: boolean) => void;
  onContextMenuForRow?: (rowId: string, position: { x: number; y: number }) => void;
}

// Props for the context menu
export interface ContextMenuProps {
  column?: Column;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onDeleteColumn?: (columnId: string) => void;
  onAddColumn?: () => void;
  onRenameColumn?: (columnId: string, newName: string) => void;
  onTogglePin?: (columnId: string) => void;
  onHideColumn?: (columnId: string) => void;
  isPinned?: boolean;
  isForRow?: boolean;
  rowId?: string;
  onDeleteRow?: (rowId: string) => void;
}

// Props for the delete contacts dialog
export interface DeleteContactsDialogProps {
  isOpen: boolean;
  contactCount: number;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}
