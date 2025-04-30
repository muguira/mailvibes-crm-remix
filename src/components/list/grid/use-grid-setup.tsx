import { useMemo, useState } from "react";
import { ColumnDef } from "./types";

interface GridSetupProps {
  initialColumns: ColumnDef[];
  initialData: any[];
  headerRef: React.RefObject<HTMLDivElement>;
  bodyRef: React.RefObject<HTMLDivElement>;
}

export function useGridSetup({ 
  initialColumns, 
  initialData,
  headerRef,
  bodyRef
}: GridSetupProps) {
  const [columns, setColumns] = useState(initialColumns);
  const [data, setData] = useState(initialData);
  const [activeCell, setActiveCell] = useState<{ row: string; col: string } | null>(null);
  const [showSaveIndicator, setShowSaveIndicator] = useState<{ row: string; col: string } | null>(null);
  
  const frozenColumns = useMemo(() => columns.filter(col => col.frozen), [columns]);
  const scrollableColumns = useMemo(() => columns.filter(col => !col.frozen), [columns]);
  
  const colMinWidth = 150;
  const colDefaultWidth = 150;
  
  const frozenColsTemplate = useMemo(() => {
    document.documentElement.style.setProperty('--cell-min-width', `${colMinWidth}px`);
    document.documentElement.style.setProperty('--cell-width', `${colDefaultWidth}px`);
    
    return frozenColumns.map(() => `${colDefaultWidth}px`).join(' ');
  }, [frozenColumns]);
  
  const scrollableColsTemplate = useMemo(() => {
    return scrollableColumns.map(() => `${colDefaultWidth}px`).join(' ');
  }, [scrollableColumns]);
  
  const handleCellClick = (rowId: string, colKey: string) => {
    setActiveCell({ row: rowId, col: colKey });
  };

  const handleCellChange = (rowId: string, colKey: string, value: any) => {
    setData(prevData => 
      prevData.map(row => 
        row.id === rowId ? { ...row, [colKey]: value } : row
      )
    );
    setShowSaveIndicator({ row: rowId, col: colKey });
  };

  return {
    columns,
    data,
    activeCell,
    showSaveIndicator,
    frozenColumns,
    scrollableColumns,
    frozenColsTemplate,
    scrollableColsTemplate,
    handleCellClick,
    handleCellChange,
  };
}
