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
  onCellChange?: (rowId: string, columnId: string, value: any) => void;
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void;
  onColumnsReorder?: (columnIds: string[]) => void;
  onDeleteColumn?: (columnId: string) => void;
  onAddColumn?: (afterColumnId: string) => void;
  onInsertColumn?: (direction: 'left' | 'right', targetIndex: number, headerName: string, columnType: string, config?: any) => void;
  onHideColumn?: (columnId: string) => void;
  onUnhideColumn?: (columnId: string) => void;
  hiddenColumns?: Column[];
  className?: string;
  columnOperationLoading?: {
    type: 'add' | 'delete' | 'rename' | 'hide' | 'unhide' | null;
    columnId?: string;
  };
  cellUpdateLoading?: Set<string>;
} 