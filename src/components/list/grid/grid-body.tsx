
import { ColumnDef } from "../grid-view";
import { GridRow } from "../grid-row";
import { RefObject } from "react";

interface GridBodyProps {
  data: { id: string; [key: string]: any }[];
  frozenColumns: ColumnDef[];
  scrollableColumns: ColumnDef[];
  frozenColsTemplate: string;
  scrollableColsTemplate: string;
  activeCell: { row: string; col: string } | null;
  showSaveIndicator: { row: string; col: string } | null;
  bodyRef: RefObject<HTMLDivElement>;
  onCellClick: (rowId: string, colKey: string, type: string, options?: string[]) => void;
  onCellChange: (rowId: string, colKey: string, value: any, type: string) => void;
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
  onCellChange
}: GridBodyProps) {
  return (
    <div className="flex-1 overflow-hidden relative">
      {/* Grid body container */}
      <div className="grid-view h-full flex">
        {/* Frozen body columns */}
        {frozenColumns.length > 0 && (
          <div
            className="grid-body grid"
            style={{
              gridTemplateColumns: frozenColsTemplate,
              boxShadow: "5px 0 5px -2px rgba(0,0,0,0.05)",
              position: "sticky",
              left: 0,
              zIndex: 5
            }}
          >
            {data.map((row) => (
              <GridRow
                key={row.id}
                rowId={row.id}
                rowData={row}
                frozenColumns={frozenColumns}
                frozenColsTemplate={frozenColsTemplate}
                activeCell={activeCell}
                showSaveIndicator={showSaveIndicator}
                onCellClick={onCellClick}
                onCellChange={onCellChange}
              />
            ))}
          </div>
        )}

        {/* Scrollable body columns */}
        <div
          className="grid-body grid overflow-auto"
          style={{ gridTemplateColumns: scrollableColsTemplate }}
          ref={bodyRef}
        >
          {data.map((row) => (
            <GridRow
              key={row.id}
              rowId={row.id}
              rowData={row}
              scrollableColumns={scrollableColumns}
              scrollableColsTemplate={scrollableColsTemplate}
              activeCell={activeCell}
              showSaveIndicator={showSaveIndicator}
              onCellClick={onCellClick}
              onCellChange={onCellChange}
              showRowNumber={frozenColumns.length === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
