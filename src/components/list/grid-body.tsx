
import { RefObject } from "react";
import { GridRow } from "./grid-row";
import { ColumnDef } from "./grid/types";
import { v4 as uuidv4 } from "uuid";

interface GridBodyProps {
  data: { id: string; [key: string]: any }[];
  frozenColumns: ColumnDef[];
  scrollableColumns: ColumnDef[];
  frozenColsTemplate: string;
  scrollableColsTemplate: string;
  activeCell: { row: string; col: string } | null;
  showSaveIndicator: { row: string; col: string } | null;
  bodyRef: RefObject<HTMLDivElement>;
  onCellClick: (rowId: string, colKey: string, colType?: string, options?: string[]) => void;
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
  // Only include rows with valid IDs and filter out any potential duplicates
  const validRows = data.filter((row, index, self) => 
    row.id && self.findIndex(r => r.id === row.id) === index
  );
  
  // Create an empty row with a UUID instead of timestamp-based ID to avoid duplicates
  const emptyRowId = `new-row-${uuidv4()}`;
  const emptyRowData = {
    id: emptyRowId
  };

  // Add all columns to the empty row with empty values
  [...frozenColumns, ...scrollableColumns].forEach(col => {
    emptyRowData[col.key] = "";
  });

  console.log("GridBody rendering rows:", validRows.length);

  return (
    <div className="overflow-auto flex-1 bg-white" ref={bodyRef}>
      {validRows.length > 0 ? (
        validRows.map((row, index) => (
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
        ))
      ) : (
        <div className="p-4 text-center text-gray-500">No data available</div>
      )}

      <GridRow
        key={emptyRowId}
        rowData={emptyRowData}
        rowNumber={validRows.length + 1}
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
    </div>
  );
}
