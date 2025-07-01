
import { RefObject } from "react";
import { GridRow } from "./grid-row";
import { ColumnDef } from "./grid/types";
import { logger } from '@/utils/logger';

interface GridBodyProps {
  data: { id: string; originalIndex?: number; [key: string]: any }[];
  frozenColumns: ColumnDef[];
  scrollableColumns: ColumnDef[];
  frozenColsTemplate: string;
  scrollableColsTemplate: string;
  activeCell: { row: string; col: string } | null;
  showSaveIndicator: { row: string; col: string } | null;
  bodyRef: RefObject<HTMLDivElement>;
  onCellClick: (rowId: string, colKey: string, colType?: string) => void;
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
  // Get the first row index (originalIndex) for absolute row numbering
  const firstRowIndex = data.length > 0 && 'originalIndex' in data[0] 
    ? data[0].originalIndex as number
    : 0;
    
  // Use the provided data directly as we've already ensured sufficient rows in ListContent
  const displayData = data;

  logger.log("GridBody: frozenColumns", frozenColumns);
  logger.log("GridBody: scrollableColumns", scrollableColumns);
  logger.log("First row index:", firstRowIndex);

  return (
    <div className="overflow-auto flex-1 bg-white" ref={bodyRef}>
      {displayData.map((row, index) => (
        <GridRow
          key={row.id}
          rowData={row}
          rowNumber={firstRowIndex + index + 1} // Use absolute row number across pages
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

      {/* Add one additional empty row at the end for new data entry */}
      <div className="grid-row h-[var(--row-height,32px)] bg-white border-0 hover:bg-slate-light/5">
        <div className="row-number-cell text-slate-300">{firstRowIndex + displayData.length + 1}</div>
        <div className="edit-column-cell"></div>
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${frozenColumns.length + scrollableColumns.length}, minmax(var(--cell-min-width, 150px), 1fr))` }}>
          {Array.from({ length: frozenColumns.length + scrollableColumns.length }, (_, colIndex) => (
            <div 
              key={`empty-cell-${colIndex}`} 
              className="grid-cell"
              tabIndex={0}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
