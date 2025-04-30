
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
  onCellClick: (rowId: string, colKey: string, colType: string, options?: string[]) => void;
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
  const isEven = rowNumber % 2 === 0;

  return (
    <div 
      className={`grid-row group ${isActive ? 'bg-slate-light/10' : isEven ? 'bg-white' : 'bg-slate-50/50'}`}
    >
      {/* Row number cell */}
      <div className="row-number-cell">
        {rowNumber}
      </div>

      {/* Edit action column */}
      <div 
        className="edit-column-cell"
      >
        {renderRowActions && !rowData.id.startsWith('empty-row-') && (
          <button 
            className="w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-teal-primary transition-all"
            title="Edit"
            onClick={() => renderRowActions && renderRowActions(rowData.id)}
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {/* Frozen columns */}
      {frozenColumns.length > 0 && (
        <div
          className="grid h-full"
          style={{
            gridTemplateColumns: frozenColsTemplate,
            position: "sticky",
            left: "72px", /* Account for row number + edit column */
            zIndex: 4,
            backgroundColor: isActive ? "rgba(249, 250, 251, 0.95)" : isEven ? "rgba(255, 255, 255, 0.95)" : "rgba(249, 250, 251, 0.95)",
            boxShadow: "2px 0 5px -2px rgba(0,0,0,0.05)",
          }}
        >
          {frozenColumns.map((column) => (
            <GridCell
              key={column.key}
              rowId={rowData.id}
              colKey={column.key}
              value={rowData[column.key]}
              type={column.type}
              options={column.options}
              isActive={activeCell?.row === rowData.id && activeCell?.col === column.key}
              onClick={() => onCellClick(rowData.id, column.key, column.type, column.options)}
              onChange={(value) => onCellChange(rowData.id, column.key, value, column.type)}
            />
          ))}
        </div>
      )}

      {/* Scrollable columns */}
      <div
        className="grid h-full"
        style={{
          gridTemplateColumns: scrollableColsTemplate,
          marginLeft: frozenColumns.length > 0 ? 0 : "72px", /* Adjust margin if no frozen columns */
        }}
      >
        {scrollableColumns.map((column) => (
          <GridCell
            key={column.key}
            rowId={rowData.id}
            colKey={column.key}
            value={rowData[column.key]}
            type={column.type}
            options={column.options}
            isActive={activeCell?.row === rowData.id && activeCell?.col === column.key}
            onClick={() => onCellClick(rowData.id, column.key, column.type, column.options)}
            onChange={(value) => onCellChange(rowData.id, column.key, value, column.type)}
          />
        ))}

        {/* Show save indicator if needed */}
        {showSaveIndicator?.row === rowData.id && (
          <SaveIndicator show={true} />
        )}
      </div>
    </div>
  );
}
