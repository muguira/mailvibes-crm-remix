
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
      style={{ 
        display: 'flex', 
        height: 'var(--row-height, 32px)', 
        borderBottom: '1px solid #e5e7eb',
        width: '100%'
      }}
    >
      {/* Row number cell */}
      <div 
        className="row-number-cell"
        style={{
          width: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          flexShrink: 0,
          color: '#6b7280'
        }}
      >
        {rowNumber}
      </div>

      {/* Container for all columns */}
      <div className="flex flex-1">
        {/* Frozen columns section (if any) */}
        {frozenColumns.length > 0 && (
          <div 
            className="frozen-columns"
            style={{
              display: 'flex',
              position: 'sticky',
              left: 0,
              zIndex: 2,
              boxShadow: '2px 0 5px rgba(0,0,0,0.05)',
              backgroundColor: '#fff'
            }}
          >
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
          </div>
        )}

        {/* Scrollable columns */}
        <div className="scrollable-columns flex-1" style={{ display: 'flex' }}>
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
      </div>

      {/* Render row actions if provided */}
      {renderRowActions && (
        <div className="row-actions">
          {renderRowActions(rowData.id)}
        </div>
      )}
    </div>
  );
}
