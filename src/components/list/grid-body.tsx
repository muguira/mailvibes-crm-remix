
import { RefObject } from "react";
import { GridRow } from "./grid-row";
import { ColumnDef } from "./grid/types";

interface GridBodyProps {
  data: { id: string; [key: string]: any }[];
  frozenColumns: ColumnDef[];
  scrollableColumns: ColumnDef[];
  frozenColsTemplate: string;
  scrollableColsTemplate: string;
  activeCell: { row: string; col: string } | null;
  showSaveIndicator: { row: string; col: string } | null;
  bodyRef: RefObject<HTMLDivElement>;
  onCellClick: (rowId: string, colKey: string) => void;
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
  
  // Create an empty row data object for the "add new" row
  const emptyRowId = `empty-row-${validRows.length + 1}`;
  const emptyRowData = {
    id: emptyRowId
  };

  // Add all columns to the empty row with empty values
  [...frozenColumns, ...scrollableColumns].forEach(col => {
    emptyRowData[col.key] = "";
  });

  return (
    <div className="overflow-auto flex-1 grid-body" ref={bodyRef}>
      <div className="grid-container">
        {validRows.map((row, index) => (
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
            onCellClick={(rowId, colKey, colType) => onCellClick(rowId, colKey)}
            onCellChange={onCellChange}
            renderRowActions={renderRowActions}
          />
        ))}

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
          onCellClick={(rowId, colKey, colType) => onCellClick(rowId, colKey)}
          onCellChange={onCellChange}
          renderRowActions={renderRowActions}
        />
      </div>
    </div>
  );
}
