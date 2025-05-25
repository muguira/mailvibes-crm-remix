
import { RefObject, useLayoutEffect, useState, CSSProperties } from "react";
import { VariableSizeList as List, ListChildComponentProps } from "react-window";
import { GridRow } from "./grid-row";
import { ColumnDef } from "./grid/types";

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

  console.log("GridBody: frozenColumns", frozenColumns);
  console.log("GridBody: scrollableColumns", scrollableColumns);
  console.log("First row index:", firstRowIndex);

  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const update = () => {
      if (bodyRef.current) {
        setSize({ width: bodyRef.current.clientWidth, height: bodyRef.current.clientHeight });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [bodyRef]);

  const ROW_HEIGHT = 40; // must match .grid-row height

  const itemCount = displayData.length + 1; // extra empty row

  const Row = ({ index, style }: ListChildComponentProps) => {
    if (index < displayData.length) {
      const row = displayData[index];
      return (
        <GridRow
          style={style as CSSProperties}
          rowData={row}
          rowNumber={firstRowIndex + index + 1}
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
      );
    }

    return (
      <div style={style as CSSProperties} className="grid-row h-[var(--row-height,32px)] bg-white border-0 hover:bg-slate-light/5">
        <div className="row-number-cell text-slate-300">{firstRowIndex + displayData.length + 1}</div>
        <div className="edit-column-cell"></div>
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${frozenColumns.length + scrollableColumns.length}, minmax(var(--cell-min-width, 150px), 1fr))` }}>
          {Array.from({ length: frozenColumns.length + scrollableColumns.length }, (_, colIndex) => (
            <div key={`empty-cell-${colIndex}`} className="grid-cell" tabIndex={0}></div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <List
      height={size.height}
      width={size.width}
      outerRef={bodyRef}
      itemCount={itemCount}
      itemSize={() => ROW_HEIGHT}
      itemKey={(index) => (index < displayData.length ? displayData[index].id : `empty-${index}`)}
    >
      {Row}
    </List>
  );
}
