
export type ColumnType = "text" | "number" | "date" | "status" | "currency" | "select" | "checkbox" | "url";

export interface ColumnDef {
  key: string;
  header: string;
  type: ColumnType;
  editable?: boolean;
  width?: number;
  options?: string[];
  colors?: Record<string, string>;
  frozen?: boolean; // For keeping columns like "Opportunity" fixed
  filter?: boolean; // Added filter property for filtering functionality
}

export interface GridViewProps {
  columns: ColumnDef[];
  data: { id: string; [key: string]: any }[];
  listName: string;
  listType: string;
  listId?: string;
  onCellChange?: (rowId: string, colKey: string, value: any) => void;
  onAddItem?: (() => void) | null;
}
