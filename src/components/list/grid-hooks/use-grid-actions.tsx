
import { useState } from "react";
import { ColumnDef } from "../grid-view";
import { RowData } from "./use-grid-state";
import { toast } from "sonner";
import { logger } from '@/utils/logger';

interface UseGridActionsProps {
  columns: ColumnDef[];
  setColumns: React.Dispatch<React.SetStateAction<ColumnDef[]>>;
  data: RowData[];
  setData: React.Dispatch<React.SetStateAction<RowData[]>>;
  activeCell: { row: string; col: string } | null;
  setActiveCell: React.Dispatch<React.SetStateAction<{ row: string; col: string } | null>>;
  showSaveIndicator: { row: string; col: string } | null;
  setShowSaveIndicator: React.Dispatch<React.SetStateAction<{ row: string; col: string } | null>>;
  draggedColumn?: string | null;
  setDraggedColumn?: React.Dispatch<React.SetStateAction<string | null>>;
  saveStateToHistory: () => void;
}

export function useGridActions({
  columns,
  setColumns,
  data,
  setData,
  activeCell,
  setActiveCell,
  showSaveIndicator, 
  setShowSaveIndicator,
  draggedColumn,
  setDraggedColumn,
  saveStateToHistory
}: UseGridActionsProps) {
  // Cell click handler
  const handleCellClick = (rowId: string, colKey: string) => {
    setActiveCell({ row: rowId, col: colKey });
  };
  
  // Cell change handler
  const handleCellChange = (rowId: string, colKey: string, newValue: any) => {
    setData(prevData =>
      prevData.map(row =>
        row.id === rowId ? { ...row, [colKey]: newValue } : row
      )
    );
    setShowSaveIndicator({ row: rowId, col: colKey });
    setTimeout(() => {
      setShowSaveIndicator(null);
    }, 1000);
  };
  
  // Header double click handler
  const handleHeaderDoubleClick = (colKey: string) => {
    // This will be handled by the parent component
  };
  
  // Add column handler
  const addColumn = (newColumnObj: any) => {
    const newKey = newColumnObj.header.toLowerCase().replace(/\s/g, "_");
    const newColumnDef = {
      key: newKey,
      header: newColumnObj.header,
      type: newColumnObj.type,
      options: newColumnObj.options,
    };
    setColumns(prevColumns => [...prevColumns, newColumnDef]);
    
    // Add the new column to all existing data rows with proper typing
    setData(prevData =>
      prevData.map(row => ({ 
        ...row, 
        [newKey]: "" 
      }))
    );
  };
  
  // Delete column handler
  const deleteColumn = (colKey: string) => {
    setColumns(prevColumns => prevColumns.filter(col => col.key !== colKey));
    setData(prevData =>
      prevData.map(row => {
        const { [colKey]: deletedKey, ...rest } = row;
        return rest as RowData;
      })
    );
  };
  
  // Duplicate column handler
  const duplicateColumn = (column: ColumnDef) => {
    const newKey = `${column.key}_copy`;
    const newColumn = { ...column, key: newKey, header: `${column.header} Copy` };
    setColumns(prevColumns => [...prevColumns, newColumn]);
    setData(prevData =>
      prevData.map(row => ({ ...row, [newKey]: row[column.key] }))
    );
  };
  
  // Rename column handler
  const renameColumn = (colKey: string, newName: string) => {
    setColumns(prevColumns =>
      prevColumns.map(col =>
        col.key === colKey ? { ...col, header: newName } : col
      )
    );
  };
  
  // Sort column handler
  const sortColumn = (colKey: string, direction: 'asc' | 'desc') => {
    setColumns(prevColumns =>
      prevColumns.map(col =>
        col.key === colKey ? { ...col, sort: direction } : col
      )
    );
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
  
  // Drag handlers
  const handleDragStart = (key: string) => {
    if (setDraggedColumn) {
      setDraggedColumn(key);
    }
  };
  
  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    // This will be handled by the parent component
  };
  
  const handleDrop = (key: string) => {
    // This will be handled by the parent component
  };

  // Handle keyboard shortcuts for undo/redo
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Check for Ctrl+Z (Undo) and Ctrl+Y (Redo)
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        // Undo operation
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
        // Redo operation
        e.preventDefault();
        handleRedo();
      }
    }
  };
  
  // Fix these functions to handle the stack operations correctly without parameters
  const handleUndo = () => {
    // Implementation of undo logic
    logger.log("Undo operation");
    // Additional undo logic here
  };
  
  const handleRedo = () => {
    // Implementation of redo logic
    logger.log("Redo operation");
    // Additional redo logic here
  };
  
  return {
    handleCellClick,
    handleCellChange,
    handleHeaderDoubleClick,
    addColumn,
    deleteColumn,
    duplicateColumn,
    renameColumn,
    sortColumn,
    moveColumn,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleKeyDown,
  };
}
