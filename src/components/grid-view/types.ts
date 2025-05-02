
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
  renderCell?: (value: any, row: GridRow) => React.ReactNode;
}

// Row data interface
export interface GridRow {
  id: string;
  [key: string]: any;
}

// Props for the grid container
export interface GridContainerProps {
  columns: Column[];
  data: GridRow[];
  listName?: string;
  listId?: string;
  listType?: string;
  className?: string;
  onCellChange?: (rowId: string, columnId: string, value: any) => void;
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void;
  onColumnsReorder?: (columnIds: string[]) => void;
  onDeleteColumn?: (columnId: string) => void;
  onAddColumn?: (afterColumnId: string) => void;
}
