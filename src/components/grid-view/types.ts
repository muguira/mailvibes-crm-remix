
export type ColumnType = 'text' | 'number' | 'date' | 'currency' | 'status' | 'url';

export interface Column {
  id: string;
  title: string;
  type: ColumnType;
  width: number;
  editable?: boolean;
  frozen?: boolean;
  options?: string[];
  colors?: Record<string, string>;
  resizable?: boolean;
}

export interface GridRow {
  id: string;
  [key: string]: any;
}

export interface GridContainerProps {
  columns: Column[];
  data: GridRow[];
  listName?: string;
  listId?: string;
  listType?: string;
  onCellChange?: (rowId: string, columnId: string, value: any) => void;
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void;
  onColumnsReorder?: (columnIds: string[]) => void;
  onDeleteColumn?: (columnId: string) => void;
  onAddColumn?: (afterColumnId: string) => void;
  className?: string;
}
