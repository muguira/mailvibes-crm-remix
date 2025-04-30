
import { RefObject } from "react";
import { GridRow } from "../grid-row";
import { ColumnDef } from "./types";

interface GridBodyProps {
  data: { id: string; [key: string]: any }[];
  frozenColumns: ColumnDef[];
  scrollableColumns: ColumnDef[];
  frozenColsTemplate: string;
  scrollableColsTemplate: string;
  activeCell: { row: string; col: string } | null;
  showSaveIndicator: { row: string; col: string } | null;
  bodyRef: RefObject<HTMLDivElement>;
  onCellClick: (rowId: string, colKey: string, colType: string, options?: string[]) => void;
  onCellChange: (rowId: string, colKey: string, value: any, type: string) => void;
  renderRowActions?: (rowId: string) => React.ReactNode;
}

export function GridBody({
  data,
  frozenColumns,
  scrollableColumns,
  frozenColsTemplate,
  scrollableColsTemplate,
  activeCell,
  showSaveIndicator,
  bodyRef,
  onCellClick,
  onCellChange,
  renderRowActions
}: GridBodyProps) {
  // Ensure we always render empty rows even when there's no data
  const displayData = data.length > 0 ? data : [];

  return (
    <div className="overflow-auto flex-1" ref={bodyRef}>
      {displayData.map((row, index) => (
        <GridRow
          key={row.id}
          rowData={row}
          rowNumber={index + 1}
          frozenColumns={frozenColumns}
          scrollableColumns={scrollableColumns}
          frozenColsTemplate={frozenColsTemplate}
          scrollableColsTemplate={scrollableColsTemplate}
          activeCell={activeCell}
          showSaveIndicator={showSaveIndicator}
          onCellClick={onCellClick}
          onCellChange={onCellChange}
          renderRowActions={renderRowActions}
        />
      ))}

      {/* Additional empty rows to ensure grid shows at least 20 rows */}
      {displayData.length > 0 && displayData.length < 20 && 
        Array.from({ length: 20 - displayData.length }, (_, i) => (
          <div key={`extra-row-${i}`} className="grid-row h-8 bg-white border-0 hover:bg-slate-light/5">
            <div className="row-number-cell text-slate-300">{displayData.length + i + 1}</div>
            <div className="edit-column-cell"></div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${frozenColumns.length + scrollableColumns.length}, minmax(150px, 1fr))` }}>
              {Array.from({ length: frozenColumns.length + scrollableColumns.length }, (_, colIndex) => (
                <div key={`empty-cell-${colIndex}`} className="grid-cell"></div>
              ))}
            </div>
          </div>
        ))
      }

      {/* Always include one more empty row for new data entry */}
      <div className="grid-row h-8 bg-white border-0 hover:bg-slate-light/5">
        <div className="row-number-cell text-slate-300">{Math.max(displayData.length, 20) + 1}</div>
        <div className="edit-column-cell"></div>
        <div className="flex-1"></div>
      </div>
    </div>
  );
}
