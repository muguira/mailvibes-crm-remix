import { KeyboardEvent, MouseEvent, SetStateAction } from "react";
import { ColumnDef } from "../grid/types";

// Replace this import with an inline implementation
// import { columnService } from "@/services/column.service";
const columnService = {
  getDefaultConfig: (type: string) => {
    return {
      key: `col_${Date.now()}`,
      name: "New Column",
      type: type || "text",
      editable: true
    };
  }
};

// Define RowData type to match the expected structure
interface RowData {
  id: string;
  [key: string]: any;
}

export interface UseGridActionsProps {
  columns: ColumnDef[];
  setColumns: (columns: SetStateAction<ColumnDef[]>) => void;
  data: RowData[];
  setData: (data: SetStateAction<RowData[]>) => void;
  activeCell: { row: string; col: string } | null;
  setActiveCell: (cell: { row: string; col: string } | null) => void;
  editingHeader: string | null;
  setEditingHeader: (key: string | null) => void;
  dragOverColumn: string | null;
  setDragOverColumn: (key: string | null) => void;
  newColumn: Partial<ColumnDef>;
  setNewColumn: (column: Partial<ColumnDef>) => void;
  isAddingColumn: boolean;
  setIsAddingColumn: (isAdding: boolean) => void;
  showSaveIndicator: { row: string; col: string } | null;
  setShowSaveIndicator: (cell: { row: string; col: string } | null) => void;
  undoStack: any[];
  setUndoStack: (stack: SetStateAction<any[]>) => void;
  redoStack: any[];
  setRedoStack: (stack: SetStateAction<any[]>) => void;
  saveStateToHistory: () => void;
  setDraggedColumn: (key: string | null) => void;
  draggedColumn: string | null;
}

export function useGridActions({
  columns,
  setColumns,
  data,
  setData,
  activeCell,
  setActiveCell,
  editingHeader,
  setEditingHeader,
  dragOverColumn,
  setDragOverColumn,
  newColumn,
  setNewColumn,
  isAddingColumn,
  setIsAddingColumn,
  showSaveIndicator,
  setShowSaveIndicator,
  undoStack,
  setUndoStack,
  redoStack,
  setRedoStack,
  saveStateToHistory,
  setDraggedColumn,
  draggedColumn
}: UseGridActionsProps) {
  // Cell click handler
  const handleCellClick = (rowId: string, colKey: string) => {
    setActiveCell({ row: rowId, col: colKey });
  };
  
  // Cell change handler
  const handleCellChange = (rowId: string, colKey: string, value: any, type: string) => {
    // Logic to handle cell value changes
    saveStateToHistory();
    
    setData((prevData) => {
      return prevData.map((row) => {
        if (row.id === rowId) {
          return { ...row, [colKey]: value };
        }
        return row;
      });
    });
    
    setShowSaveIndicator({ row: rowId, col: colKey });
    
    setTimeout(() => {
      setShowSaveIndicator(null);
    }, 1500);
  };
  
  // Header double click handler
  const handleHeaderDoubleClick = (colKey: string) => {
    setEditingHeader(colKey);
  };
  
  // Add column handler - fixed TypeScript error
  const addColumn = (newColumn: any, setNewColumn: any, setIsAddingColumn: any) => {
    const newKey = newColumn.header.toLowerCase().replace(/\s/g, "_");
    const newColumnDef = {
      key: newKey,
      header: newColumn.header,
      type: newColumn.type,
      options: newColumn.options,
    };
    setColumns(prevColumns => [...prevColumns, newColumnDef]);
    setNewColumn({ header: "", type: "text" });
    setIsAddingColumn(false);
    
    // Add the new column to all existing data rows - fixed TypeScript error
    setData(prevData =>
      prevData.map(row => ({
        ...row,
        [newKey]: ""
      })) as RowData[] // Type assertion to fix TS error
    );
  };
  
  // Delete column handler
  const deleteColumn = (colKey: string) => {
    setColumns(prevColumns => prevColumns.filter(col => col.key !== colKey));
    setData(prevData =>
      prevData.map(row => {
        const { [colKey]: deletedKey, ...rest } = row;
        return rest as RowData; // Type assertion to fix TS error
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
    setDraggedColumn(key);
  };
  
  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    setDragOverColumn(key);
  };
  
  const handleDrop = (key: string) => {
    if (draggedColumn && dragOverColumn && draggedColumn !== dragOverColumn) {
      setColumns(prevColumns => {
        const draggedIndex = prevColumns.findIndex(col => col.key === draggedColumn);
        const dropIndex = prevColumns.findIndex(col => col.key === dragOverColumn);
        
        if (draggedIndex === -1 || dropIndex === -1) return prevColumns;
        
        const newColumns = [...prevColumns];
        const [draggedColumnItem] = newColumns.splice(draggedIndex, 1);
        newColumns.splice(dropIndex, 0, draggedColumnItem);
        
        setDraggedColumn(null);
        setDragOverColumn(null);
        
        return newColumns;
      });
    }
  };

  // Handle keyboard shortcuts for undo/redo
  const handleKeyDown = (
    e: React.KeyboardEvent,
  ) => {
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
    console.log("Undo operation");
    // Additional undo logic here
  };
  
  const handleRedo = () => {
    // Implementation of redo logic
    console.log("Redo operation");
    // Additional redo logic here
  };
  
  return {
    handleCellClick,
    handleHeaderDoubleClick,
    handleCellChange,
    addColumn,
    deleteColumn,
    duplicateColumn,
    renameColumn,
    sortColumn,
    moveColumn,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleKeyDown
  };
}
