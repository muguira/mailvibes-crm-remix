
import { ColumnType } from "../grid-view";

interface CellKeyHandlerProps {
  rowId: string;
  colKey: string;
  type: ColumnType;
  onCellChange: (rowId: string, colKey: string, value: any, type: ColumnType) => void;
  onCellClick: (rowId: string, colKey: string, type: ColumnType, options?: string[]) => void;
}

export function useCellKeyHandler({
  rowId,
  colKey,
  type,
  onCellChange,
  onCellClick
}: CellKeyHandlerProps) {
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onCellChange(rowId, colKey, e.currentTarget.value, type);
    } else if (e.key === 'Escape') {
      onCellClick("", "", "text"); // Reset active cell
    }
  };

  return { handleKeyDown };
}
