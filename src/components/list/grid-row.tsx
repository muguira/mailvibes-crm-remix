
import { Edit } from "lucide-react";
import { GridCell } from "./grid-cell";
import { ColumnDef, ColumnType } from "./grid-view";

interface GridRowProps {
  rowData: { id: string; [key: string]: any };
  frozenColumns: ColumnDef[];
  scrollableColumns: ColumnDef[];
  frozenColsTemplate: string;
  scrollableColsTemplate: string;
  activeCell: { row: string; col: string } | null;
  showSaveIndicator: { row: string; col: string } | null;
  onCellClick: (rowId: string, colKey: string, colType: ColumnType, options?: string[]) => void;
  onCellChange: (rowId: string, colKey: string, value: any, type: ColumnType) => void;
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
  onCellChange
}: GridRowProps) {
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
              key={`${rowData.id}-${column.key}`}
              rowId={rowData.id}
              colKey={column.key}
              value={rowData[column.key]}
              type={column.type}
              isActive={activeCell?.row === rowData.id && activeCell?.col === column.key}
              isEditable={!!column.editable}
              showSaveIndicator={!!(showSaveIndicator?.row === rowData.id && showSaveIndicator?.col === column.key)}
              options={column.options}
              onCellClick={onCellClick}
              onCellChange={onCellChange}
            />
          ))}
        </div>
      )}

      {/* Scrollable cells */}
      <div
        className="grid grid-row"
        style={{ gridTemplateColumns: scrollableColsTemplate }}
      >
        {frozenColumns.length === 0 && (
          <div className="grid-cell flex items-center">
            <input type="checkbox" className="ml-2" />
            <button className="ml-2 text-slate-medium">
              <Edit size={14} />
            </button>
          </div>
        )}

        {scrollableColumns.map((column) => (
          <GridCell
            key={`${rowData.id}-${column.key}`}
            rowId={rowData.id}
            colKey={column.key}
            value={rowData[column.key]}
            type={column.type}
            isActive={activeCell?.row === rowData.id && activeCell?.col === column.key}
            isEditable={!!column.editable}
            showSaveIndicator={!!(showSaveIndicator?.row === rowData.id && showSaveIndicator?.col === column.key)}
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
