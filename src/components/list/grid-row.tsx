
import { GridCell } from "./grid-cell";
import { ColumnDef } from "./grid/types";
import { SaveIndicator } from "./save-indicator";
import { clsx } from "clsx";

interface GridRowProps {
  rowData: { id: string; [key: string]: any };
  frozenColumns: ColumnDef[];
  scrollableColumns: ColumnDef[];
  frozenColsTemplate: string;
  scrollableColsTemplate: string;
  activeCell: { row: string; col: string } | null;
  showSaveIndicator: { row: string; col: string } | null;
  onCellClick: (rowId: string, colKey: string, colType: string, options?: string[]) => void;
  onCellChange: (rowId: string, colKey: string, value: any, type: string) => void;
  renderRowActions?: (rowId: string) => React.ReactNode;
}

export function GridRow({
  rowData,
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
  return (
    <div className="flex w-full hover:bg-slate-light/5 group relative">
      {/* Row number column */}
      <div 
        className="grid border-b border-r border-slate-light/20" 
        style={{ gridTemplateColumns: frozenColsTemplate }}
      >
        <div className="py-2 px-3 text-xs text-slate-medium flex items-center justify-center">
          {renderRowActions && (
            <div className="relative">
              {renderRowActions(rowData.id)}
            </div>
          )}
        </div>
        
        {/* Frozen columns */}
        {frozenColumns.map((column) => (
          <div key={column.key} className="relative">
            <GridCell
              value={rowData[column.key]}
              column={column}
              rowId={rowData.id}
              isActive={
                activeCell?.row === rowData.id && 
                activeCell?.col === column.key
              }
              onClick={() => 
                onCellClick(rowData.id, column.key, column.type, column.options)
              }
              onChange={(value) => 
                onCellChange(rowData.id, column.key, value, column.type)
              }
            />
            {showSaveIndicator && 
              showSaveIndicator.row === rowData.id && 
              showSaveIndicator.col === column.key && (
                <SaveIndicator show={true} />
              )
            }
          </div>
        ))}
      </div>
      
      {/* Scrollable columns */}
      <div 
        className="grid flex-1 border-b border-slate-light/20" 
        style={{ gridTemplateColumns: scrollableColsTemplate }}
      >
        {scrollableColumns.map((column) => (
          <div key={column.key} className="relative">
            <GridCell
              value={rowData[column.key]}
              column={column}
              rowId={rowData.id}
              isActive={
                activeCell?.row === rowData.id && 
                activeCell?.col === column.key
              }
              onClick={() => 
                onCellClick(rowData.id, column.key, column.type, column.options)
              }
              onChange={(value) => 
                onCellChange(rowData.id, column.key, value, column.type)
              }
            />
            {showSaveIndicator && 
              showSaveIndicator.row === rowData.id && 
              showSaveIndicator.col === column.key && (
                <SaveIndicator show={true} />
              )
            }
          </div>
        ))}
      </div>
    </div>
  );
}
