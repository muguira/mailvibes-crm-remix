
import { GridCell } from "./grid-cell";
import { SaveIndicator } from "./save-indicator";
import { ColumnDef } from "./grid/types";
import { Pencil } from "lucide-react";

interface GridRowProps {
  rowData: { id: string; [key: string]: any };
  rowNumber: number;
  frozenColumns: ColumnDef[];
  scrollableColumns: ColumnDef[];
  frozenColsTemplate: string;
  scrollableColsTemplate: string;
  activeCell: { row: string; col: string } | null;
  showSaveIndicator: { row: string; col: string } | null;
  onCellClick: (rowId: string, colKey: string, colType?: string, options?: string[]) => void;
  onCellChange: (rowId: string, colKey: string, value: any, type: string) => void;
  renderRowActions?: (rowId: string) => React.ReactNode;
}

export function GridRow({
  rowData,
  rowNumber,
  frozenColumns,
  scrollableColumns,
  frozenColsTemplate,
  scrollableColsTemplate,
  activeCell,
  showSaveIndicator,
  onCellClick,
  onCellChange,
  renderRowActions
}: GridRowProps) {
  const isActive = activeCell?.row === rowData.id;

  return (
    <div 
      className={`grid-row ${isActive ? 'active-row' : ''}`}
      data-row-id={rowData.id}
    >
      {/* Row number cell */}
      <div className="row-number-cell">
        {rowNumber}
      </div>

      {/* Frozen columns (if any) */}
      {frozenColumns.map((column) => (
        <GridCell
          key={`${rowData.id}-${column.key}`}
          rowId={rowData.id}
          colKey={column.key}
          value={rowData[column.key]}
          type={column.type}
          options={column.options}
          colors={column.colors}
          isActive={activeCell?.row === rowData.id && activeCell?.col === column.key}
          onClick={() => onCellClick(rowData.id, column.key, column.type, column.options)}
          onChange={(value) => onCellChange(rowData.id, column.key, value, column.type)}
          showSaveIndicator={showSaveIndicator?.row === rowData.id && showSaveIndicator?.col === column.key}
        />
      ))}

      {/* Scrollable columns */}
      {scrollableColumns.map((column) => (
        <GridCell
          key={`${rowData.id}-${column.key}`}
          rowId={rowData.id}
          colKey={column.key}
          value={rowData[column.key]}
          type={column.type}
          options={column.options}
          colors={column.colors}
          isActive={activeCell?.row === rowData.id && activeCell?.col === column.key}
          onClick={() => onCellClick(rowData.id, column.key, column.type, column.options)}
          onChange={(value) => onCellChange(rowData.id, column.key, value, column.type)}
          showSaveIndicator={showSaveIndicator?.row === rowData.id && showSaveIndicator?.col === column.key}
        />
      ))}
    </div>
  );
}
