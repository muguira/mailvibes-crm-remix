
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
  // Use the provided data directly as we've already ensured sufficient rows in ListContent
  const displayData = data;

  // Create an empty row data object with the same structure as normal rows
  const emptyRowId = `empty-row-${displayData.length + 1}`;
  const emptyRowData = {
    id: emptyRowId
  };

  // Add all columns to the empty row with empty values
  [...frozenColumns, ...scrollableColumns].forEach(col => {
    emptyRowData[col.key] = "";
  });

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

      {/* Add one additional empty row as a proper GridRow for new data entry */}
      <GridRow
        key={emptyRowId}
        rowData={emptyRowData}
        rowNumber={displayData.length + 1}
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
