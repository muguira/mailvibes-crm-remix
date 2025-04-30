
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ColumnDef, ColumnType } from "../grid-view";
import { RowData } from "./use-grid-state";

interface UseGridActionsProps {
  columns: ColumnDef[];
  setColumns: React.Dispatch<React.SetStateAction<ColumnDef[]>>;
  data: RowData[];
  setData: React.Dispatch<React.SetStateAction<RowData[]>>;
  activeCell: { row: string; col: string } | null;
  setActiveCell: React.Dispatch<React.SetStateAction<{ row: string; col: string } | null>>;
  showSaveIndicator: {row: string, col: string} | null;
  setShowSaveIndicator: React.Dispatch<React.SetStateAction<{row: string, col: string} | null>>;
  saveStateToHistory: () => void;
  setDraggedColumn: React.Dispatch<React.SetStateAction<string | null>>;
  setDragOverColumn: React.Dispatch<React.SetStateAction<string | null>>;
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
  saveStateToHistory,
  setDraggedColumn,
  setDragOverColumn
}: UseGridActionsProps) {
  
  const handleCellClick = (rowId: string, colKey: string, colType: ColumnType, options?: string[]) => {
    // Reset active cell if clicking on a blank area or the same cell
    if (rowId === "" && colKey === "") {
      setActiveCell(null);
      return;
    }
    
    // Set the active cell (only for direct editing types)
    if (colType !== "checkbox" && colType !== "date" && colType !== "status" && colType !== "select") {
      setActiveCell({ row: rowId, col: colKey });
    }
  };
  
  const handleHeaderDoubleClick = (colKey: string) => {
    // Don't allow editing the opportunity column header
    if (colKey === "opportunity") return;
  };

  const toggleCheckbox = (rowId: string, colKey: string) => {
    // Save previous state for undo
    saveStateToHistory();
    
    // Toggle the checkbox value
    setData(prevData => prevData.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          [colKey]: !row[colKey]
        };
      }
      return row;
    }));
    
    // Show save indicator
    setShowSaveIndicator({ row: rowId, col: colKey });
    setTimeout(() => setShowSaveIndicator(null), 500);
  };

  const handleCellChange = (rowId: string, colKey: string, value: any, type: ColumnType) => {
    // Save previous state for undo
    saveStateToHistory();
    
    // Format value based on type
    let formattedValue = value;
    
    if (type === "number") {
      formattedValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
    } else if (type === "currency") {
      // Remove currency symbol and format
      const numValue = value.replace(/[^0-9.-]+/g, "");
      formattedValue = isNaN(parseFloat(numValue)) ? 0 : `$${parseFloat(numValue).toLocaleString()}`;
    } else if (type === "url") {
      // Basic validation for URLs
      if (value && !isValidUrl(value)) {
        toast.warning("Please enter a valid URL with protocol or domain extension");
        formattedValue = "";
      }
    } else if (type === "checkbox") {
      toggleCheckbox(rowId, colKey);
      return;
    }
    
    // Update data
    setData(prevData => prevData.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          [colKey]: formattedValue
        };
      }
      return row;
    }));
    
    // Show save indicator
    setShowSaveIndicator({ row: rowId, col: colKey });
    setTimeout(() => setShowSaveIndicator(null), 500);
    
    // Reset active cell after editing
    setActiveCell(null);
  };

  const undo = (undoStack: {columns: ColumnDef[], data: RowData[]}[], setUndoStack: any, redoStack: any, setRedoStack: any) => {
    if (undoStack.length > 0) {
      // Get last state from undo stack
      const lastState = undoStack[undoStack.length - 1];
      // Remove last state from undo stack
      setUndoStack(prev => prev.slice(0, -1));
      // Save current state to redo stack
      setRedoStack(prev => [...prev, { columns, data }]);
      // Restore last state
      setColumns(lastState.columns);
      setData(lastState.data);
    }
  };

  const redo = (redoStack: {columns: ColumnDef[], data: RowData[]}[], setRedoStack: any, undoStack: any, setUndoStack: any) => {
    if (redoStack.length > 0) {
      // Get last state from redo stack
      const nextState = redoStack[redoStack.length - 1];
      // Remove last state from redo stack
      setRedoStack(prev => prev.slice(0, -1));
      // Save current state to undo stack
      setUndoStack(prev => [...prev, { columns, data }]);
      // Restore next state
      setColumns(nextState.columns);
      setData(nextState.data);
    }
  };

  const addColumn = (newColumn: { header: string; type: ColumnType; options?: string[] }, setNewColumn: any, setIsAddingColumn: any) => {
    // Save current state for undo
    saveStateToHistory();
    
    const key = newColumn.header.toLowerCase().replace(/\s+/g, '_');
    
    // Add new column to columns array
    const newColumnDef: ColumnDef = {
      key,
      header: newColumn.header,
      type: newColumn.type,
      editable: true,
      options: newColumn.type === 'select' || newColumn.type === 'status' ? newColumn.options : undefined
    };
    
    setColumns(prev => [...prev, newColumnDef]);
    
    // Add default values for new column to all rows
    setData(prevData => prevData.map(row => {
      return {
        ...row,
        [key]: newColumn.type === 'checkbox' ? false : ''
      };
    }));
    
    // Reset new column state
    setNewColumn({ header: '', type: 'text' });
    setIsAddingColumn(false);
    
    toast.success(`Column "${newColumn.header}" added successfully`);
  };

  const deleteColumn = (key: string) => {
    // Don't allow deleting the opportunity column
    if (key === "opportunity") {
      toast.error("The Opportunity column cannot be deleted");
      return;
    }
    
    // Save current state for undo
    saveStateToHistory();
    
    // Remove column from columns array
    setColumns(prev => prev.filter(col => col.key !== key));
    
    // Remove column data from all rows
    setData(prev => prev.map(row => {
      const { [key]: _, ...rest } = row;
      return rest as RowData; // Explicitly cast to RowData to ensure id property exists
    }));
    
    toast.success("Column deleted");
  };

  const duplicateColumn = (column: ColumnDef) => {
    // Save current state for undo
    saveStateToHistory();
    
    const newKey = `${column.key}_copy`;
    const newHeader = `${column.header} (Copy)`;
    
    // Create duplicate column
    const duplicatedColumn: ColumnDef = {
      ...column,
      key: newKey,
      header: newHeader,
      frozen: false // Duplicated columns are never frozen
    };
    
    // Add duplicate column to columns array
    setColumns(prev => [...prev, duplicatedColumn]);
    
    // Add duplicate data to all rows
    setData(prev => prev.map(row => ({
      ...row,
      [newKey]: row[column.key]
    })));
    
    toast.success(`Column "${column.header}" duplicated`);
  };

  const renameColumn = (key: string, newName: string) => {
    // Don't allow renaming the opportunity column
    if (key === "opportunity") {
      toast.error("The Opportunity column cannot be renamed");
      return;
    }
    
    // Save current state for undo
    saveStateToHistory();
    
    // Update column header
    setColumns(prev => prev.map(col => {
      if (col.key === key) {
        return {
          ...col,
          header: newName
        };
      }
      return col;
    }));
    
    toast.success(`Column renamed to "${newName}"`);
  };

  const sortColumn = (key: string, direction: 'asc' | 'desc') => {
    // Save current state for undo
    saveStateToHistory();
    
    const column = columns.find(col => col.key === key);
    if (!column) return;
    
    // Sort data based on column type
    setData(prev => [...prev].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];
      
      if (column.type === 'number' || column.type === 'currency') {
        // Convert to numbers for numeric comparison
        const aNum = parseFloat(String(aValue).replace(/[^0-9.-]+/g, ''));
        const bNum = parseFloat(String(bValue).replace(/[^0-9.-]+/g, ''));
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      if (column.type === 'date') {
        // Convert to dates for date comparison
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        return direction === 'asc' 
          ? aDate.getTime() - bDate.getTime() 
          : bDate.getTime() - aDate.getTime();
      }
      
      // Default to string comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return direction === 'asc' 
        ? aStr.localeCompare(bStr) 
        : bStr.localeCompare(aStr);
    }));
    
    toast.success(`Sorted by ${column.header} (${direction === 'asc' ? 'Ascending' : 'Descending'})`);
  };

  const moveColumn = (key: string, direction: 'left' | 'right') => {
    // Don't allow moving the opportunity column
    if (key === "opportunity" && direction === "left") {
      toast.error("The Opportunity column must remain first");
      return;
    }
    
    // Save current state for undo
    saveStateToHistory();
    
    const columnIndex = columns.findIndex(col => col.key === key);
    if (columnIndex === -1) return;
    
    // Calculate new index
    const newIndex = direction === 'left' 
      ? Math.max(0, columnIndex - 1)
      : Math.min(columns.length - 1, columnIndex + 1);
    
    // Don't do anything if we're already at the edge
    if (newIndex === columnIndex) return;
    
    // Don't allow other columns to move to the leftmost position if opportunity column exists
    if (newIndex === 0 && columns.some(col => col.key === "opportunity")) {
      toast.error("The Opportunity column must remain first");
      return;
    }
    
    // Create new columns array with moved column
    const newColumns = [...columns];
    const [removed] = newColumns.splice(columnIndex, 1);
    newColumns.splice(newIndex, 0, removed);
    
    setColumns(newColumns);
  };

  const handleDragStart = (key: string) => {
    // Don't allow dragging the opportunity column
    if (key === "opportunity") {
      toast.error("The Opportunity column cannot be reordered");
      return;
    }
    
    setDraggedColumn(key);
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    // Don't allow dropping to the left of the opportunity column
    if (key === "opportunity" && columns[0]?.key === "opportunity") {
      return;
    }
    
    if (draggedColumn && draggedColumn !== key) {
      setDragOverColumn(key);
    }
  };

  const handleDrop = (key: string) => {
    if (!draggedColumn || draggedColumn === key) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }
    
    // Don't allow dropping to the left of the opportunity column
    if (key === "opportunity" && columns[0]?.key === "opportunity") {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }
    
    // Save current state for undo
    saveStateToHistory();
    
    const fromIndex = columns.findIndex(col => col.key === draggedColumn);
    let toIndex = columns.findIndex(col => col.key === key);
    
    // Prevent moving to position 0 if opportunity column exists and is first
    if (toIndex === 0 && columns[0]?.key === "opportunity") {
      toIndex = 1;
    }
    
    if (fromIndex !== -1 && toIndex !== -1) {
      // Create new columns array with reordered columns
      const newColumns = [...columns];
      const [removed] = newColumns.splice(fromIndex, 1);
      newColumns.splice(toIndex, 0, removed);
      
      setColumns(newColumns);
    }
    
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, undoStack: any, setUndoStack: any, redoStack: any, setRedoStack: any) => {
    // Handle undo/redo
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      if (e.shiftKey) {
        // Redo: Ctrl/Cmd + Shift + Z
        redo(redoStack, setRedoStack, undoStack, setUndoStack);
      } else {
        // Undo: Ctrl/Cmd + Z
        undo(undoStack, setUndoStack, redoStack, setRedoStack);
      }
    }
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
    handleKeyDown,
    toggleCheckbox,
    undo,
    redo
  };
}
