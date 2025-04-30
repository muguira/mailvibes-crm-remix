
export type CellType = 'text' | 'number' | 'date' | 'status' | 'currency' | 'url' | 'select' | 'multi-select';

export interface Column {
  id: string;
  title: string;
  type: CellType;
  width: number;
  editable?: boolean;
  frozen?: boolean;
  options?: string[];
  colors?: Record<string, string>;
  formatter?: (value: any) => string;
}

export interface GridRow {
  id: string;
  [key: string]: any;
}

export interface GridProps {
  columns: Column[];
  data: GridRow[];
  listName?: string;
  listType?: string;
  onCellChange?: (rowId: string, columnId: string, value: any) => void;
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void;
  onColumnsReorder?: (columnIds: string[]) => void;
}

export interface GridContainerProps extends GridProps {
  className?: string;
}
