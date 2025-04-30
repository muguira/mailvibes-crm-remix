
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
  return (
    <div className="overflow-auto flex-1" ref={bodyRef}>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-full p-8 text-center">
          <div className="max-w-md">
            <h3 className="text-lg font-medium text-slate-dark mb-2">No data available</h3>
            <p className="text-slate-medium">Add your first item to get started with this list.</p>
          </div>
        </div>
      ) : (
        data.map((row) => (
          <GridRow
            key={row.id}
            rowData={row}
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
      )}
    </div>
  );
}
