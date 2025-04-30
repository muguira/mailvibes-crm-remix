
import { Edit } from "lucide-react";
import { GridCell } from "./grid-cell";
import { ColumnDef } from "./grid-view";

interface GridRowProps {
  rowData: { id: string; [key: string]: any };
  columns?: ColumnDef[];
  frozenColumns?: ColumnDef[];
  scrollableColumns?: ColumnDef[];
  frozenColsTemplate?: string;
  scrollableColsTemplate?: string;
  activeCell: { row: string; col: string } | null;
  showSaveIndicator: { row: string; col: string } | null;
  onCellClick: (rowId: string, colKey: string, type: string, options?: string[]) => void;
  onCellChange: (rowId: string, colKey: string, value: any, type: string) => void;
  showRowNumber?: boolean;
  rowId?: string;
}

export function GridRow({
  rowId,
  rowData,
  columns,
  frozenColumns = [],
  scrollableColumns = [],
  frozenColsTemplate,
  scrollableColsTemplate,
  activeCell,
  showSaveIndicator,
  onCellClick,
  onCellChange,
  showRowNumber
}: GridRowProps) {
  // Use rowId if provided, otherwise use rowData.id
  const id = rowId || rowData.id;
  
  return (
    <div className="flex">
      {/* Frozen cells */}
      {frozenColumns.length > 0 && (
        <div
          className="grid grid-row"
          style={{
            gridTemplateColumns: frozenColsTemplate,
            position: "sticky",
            left: 0,
            zIndex: 5,
            backgroundColor: "white",
            boxShadow: "5px 0 5px -2px rgba(0,0,0,0.05)"
          }}
        >
          <div className="grid-cell flex items-center">
            <input type="checkbox" className="ml-2" />
            <button className="ml-2 text-slate-medium">
              <Edit size={14} />
            </button>
          </div>

          {frozenColumns.map(column => (
            <GridCell
              key={`${id}-${column.key}`}
              rowId={id}
              colKey={column.key}
              value={rowData[column.key]}
              type={column.type}
              isActive={activeCell?.row === id && activeCell?.col === column.key}
              isEditable={!!column.editable}
              showSaveIndicator={!!(showSaveIndicator?.row === id && showSaveIndicator?.col === column.key)}
              options={column.options}
              onCellClick={onCellClick}
              onCellChange={onCellChange}
            />
          ))}
        </div>
      )}

      {/* Scrollable cells or all cells if columns prop is provided */}
      <div
        className="grid grid-row"
        style={{ gridTemplateColumns: scrollableColsTemplate }}
      >
        {/* Show checkbox column if frozenColumns is empty or if showRowNumber is true */}
        {(frozenColumns.length === 0 || showRowNumber) && (
          <div className="grid-cell flex items-center">
            <input type="checkbox" className="ml-2" />
            <button className="ml-2 text-slate-medium">
              <Edit size={14} />
            </button>
          </div>
        )}

        {/* Render from columns prop if provided, otherwise use scrollableColumns */}
        {columns ? columns.map((column) => (
          <GridCell
            key={`${id}-${column.key}`}
            rowId={id}
            colKey={column.key}
            value={rowData[column.key]}
            type={column.type}
            isActive={activeCell?.row === id && activeCell?.col === column.key}
            isEditable={!!column.editable}
            showSaveIndicator={!!(showSaveIndicator?.row === id && showSaveIndicator?.col === column.key)}
            options={column.options}
            onCellClick={onCellClick}
            onCellChange={onCellChange}
          />
        )) : scrollableColumns.map((column) => (
          <GridCell
            key={`${id}-${column.key}`}
            rowId={id}
            colKey={column.key}
            value={rowData[column.key]}
            type={column.type}
            isActive={activeCell?.row === id && activeCell?.col === column.key}
            isEditable={!!column.editable}
            showSaveIndicator={!!(showSaveIndicator?.row === id && showSaveIndicator?.col === column.key)}
            options={column.options}
            onCellClick={onCellClick}
            onCellChange={onCellChange}
          />
        ))}
        <div className="grid-cell"></div>
      </div>
    </div>
  );
}
