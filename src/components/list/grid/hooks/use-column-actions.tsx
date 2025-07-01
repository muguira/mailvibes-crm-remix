
import { ColumnDef } from "../types";
import { logger } from '@/utils/logger';

interface UseColumnActionsProps {
  columns: ColumnDef[];
  setColumns: React.Dispatch<React.SetStateAction<ColumnDef[]>>;
  data: any[];
  setData: React.Dispatch<React.SetStateAction<any[]>>;
  saveStateToHistory: () => void;
}

export function useColumnActions({
  columns,
  setColumns,
  data,
  setData,
  saveStateToHistory
}: UseColumnActionsProps) {
  
  // Header double click handler
  const handleHeaderDoubleClick = (colKey: string) => {
    logger.log("Double click on header:", colKey);
  };
  
  // Rename column handler
  const renameColumn = (colKey: string, newName: string) => {
    logger.log("Renaming column:", colKey, "to", newName);
    saveStateToHistory();
    setColumns(prevColumns =>
      prevColumns.map(col =>
        col.key === colKey ? { ...col, header: newName } : col
      )
    );
  };
  
  // Delete column handler
  const deleteColumn = (colKey: string) => {
    logger.log("Deleting column:", colKey);
    saveStateToHistory();
    setColumns(prevColumns => prevColumns.filter(col => col.key !== colKey));
    setData(prevData =>
      prevData.map(row => {
        const { [colKey]: deletedKey, ...rest } = row;
        return rest;
      })
    );
  };
  
  // Duplicate column handler
  const duplicateColumn = (column: ColumnDef) => {
    logger.log("Duplicating column:", column);
    saveStateToHistory();
    const newKey = `${column.key}_copy`;
    const newColumn = { ...column, key: newKey, header: `${column.header} Copy` };
    setColumns(prevColumns => [...prevColumns, newColumn]);
    setData(prevData =>
      prevData.map(row => ({ ...row, [newKey]: row[column.key] }))
    );
  };
  
  // Sort column handler
  const sortColumn = (colKey: string, direction: 'asc' | 'desc') => {
    saveStateToHistory();
    setData(prevData => {
      const sortedData = [...prevData].sort((a, b) => {
        const valueA = a[colKey];
        const valueB = b[colKey];
        
        if (valueA === valueB) return 0;
        
        if (direction === 'asc') {
          return valueA < valueB ? -1 : 1;
        } else {
          return valueA > valueB ? -1 : 1;
        }
      });
      return sortedData;
    });
  };
  
  // Move column handler
  const moveColumn = (colKey: string, direction: 'left' | 'right') => {
    saveStateToHistory();
    setColumns(prevColumns => {
      const columnIndex = prevColumns.findIndex(col => col.key === colKey);
      if (columnIndex === -1) return prevColumns;
      
      const newIndex = direction === 'left' ? columnIndex - 1 : columnIndex + 1;
      if (newIndex < 0 || newIndex >= prevColumns.length) return prevColumns;
      
      const newColumns = [...prevColumns];
      // Remove the column from the current index
      const [movedColumn] = newColumns.splice(columnIndex, 1);
      // Insert the column at the new index
      newColumns.splice(newIndex, 0, movedColumn);
      
      return newColumns;
    });
  };

  return {
    handleHeaderDoubleClick,
    renameColumn,
    deleteColumn,
    duplicateColumn,
    sortColumn,
    moveColumn
  };
}
