
import { GridCell } from "./grid-cell";
import { SaveIndicator } from "./save-indicator";
import { ColumnDef } from "./grid/types";

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

  return (
    <div className={`grid-row group ${isActive ? 'bg-slate-light/10' : ''}`}>
      {/* Row number cell */}
      <div className="row-number-cell">
        {rowNumber}
      </div>

      {/* Frozen columns */}
      {frozenColumns.length > 0 && (
        <div
          className="grid h-full"
          style={{
            gridTemplateColumns: frozenColsTemplate,
            position: "sticky",
            left: "40px", // Account for row number cell
            zIndex: 4,
            backgroundColor: isActive ? "rgba(249, 250, 251, 0.95)" : undefined,
            boxShadow: "2px 0 5px -2px rgba(0,0,0,0.05)",
          }}
        >
          <div className="h-full w-8 relative">
            {renderRowActions && renderRowActions(rowData.id)}
          </div>
          {frozenColumns.map((column) => (
            <GridCell
              key={column.key}
              rowId={rowData.id}
              colKey={column.key}
              value={rowData[column.key]}
              type={column.type}
              options={column.options}
              isActive={activeCell?.row === rowData.id && activeCell?.col === column.key}
              onClick={onCellClick}
              onChange={onCellChange}
            />
          ))}
        </div>
      )}

      {/* Scrollable columns */}
      <div
        className="grid h-full"
        style={{
          gridTemplateColumns: scrollableColsTemplate,
          marginLeft: frozenColumns.length > 0 ? 0 : "40px", // Adjust margin if no frozen columns
        }}
      >
        {frozenColumns.length === 0 && (
          <div className="h-full w-8 relative">
            {renderRowActions && renderRowActions(rowData.id)}
          </div>
        )}

        {scrollableColumns.map((column) => (
          <GridCell
            key={column.key}
            rowId={rowData.id}
            colKey={column.key}
            value={rowData[column.key]}
            type={column.type}
            options={column.options}
            isActive={activeCell?.row === rowData.id && activeCell?.col === column.key}
            onClick={onCellClick}
            onChange={onCellChange}
          />
        ))}

        {/* Show save indicator if needed */}
        {showSaveIndicator?.row === rowData.id && (
          <SaveIndicator colKey={showSaveIndicator.col} />
        )}
      </div>
    </div>
  );
}
