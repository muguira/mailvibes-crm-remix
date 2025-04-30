
import { useState } from "react";
import { ColumnDef, ColumnType } from "../grid-view";
import { toast } from "sonner";
import { generateSlug } from "../grid-utils";

interface UseGridActionsProps {
  columns: ColumnDef[];
  setColumns: React.Dispatch<React.SetStateAction<ColumnDef[]>>;
  data: { id: string; [key: string]: any }[];
  setData: React.Dispatch<React.SetStateAction<{ id: string; [key: string]: any }[]>>;
  activeCell: { row: string; col: string } | null;
  setActiveCell: React.Dispatch<React.SetStateAction<{ row: string; col: string } | null>>;
  showSaveIndicator: { row: string; col: string } | null;
  setShowSaveIndicator: React.Dispatch<React.SetStateAction<{ row: string; col: string } | null>>;
  saveStateToHistory: () => void;
  setDraggedColumn: React.Dispatch<React.SetStateAction<string | null>>;
  setDragOverColumn: React.Dispatch<React.SetStateAction<string | null>>;
  draggedColumn: string | null;
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
  setDragOverColumn,
  draggedColumn
}: UseGridActionsProps) {
  // Handler for cell clicks
  const handleCellClick = (
    rowId: string,
    colKey: string,
    type: ColumnType,
    options?: string[]
  ) => {
    // Clicked on same cell - maintain active state
    if (activeCell?.row === rowId && activeCell?.col === colKey) {
      return;
    }

    // Set the active cell
    setActiveCell({ row: rowId, col: colKey });
  };

  // Handler for header double click (rename)
  const handleHeaderDoubleClick = (colKey: string) => {
    const col = columns.find((c) => c.key === colKey);
    
    // Don't allow editing the opportunity column
    if (col && col.key !== "opportunity") {
      setEditingHeader(colKey);
    }
  };

  // Handler for cell changes
  const handleCellChange = (
    rowId: string,
    colKey: string,
    value: any,
    type: ColumnType
  ) => {
    // Save state for undo/redo
    saveStateToHistory();
    
    // Special handling for different types
    let processedValue = value;
    
    if (type === "currency" && value) {
      // Format currency value
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        processedValue = `$${numValue.toLocaleString()}`;
      }
    } else if (type === "url" && value) {
      // Ensure URLs have http:// prefix
      if (value && !value.startsWith("http://") && !value.startsWith("https://")) {
        processedValue = `https://${value}`;
      }
    }
    
    // Update the data state with the new value
    setData((prevData) =>
      prevData.map((row) =>
        row.id === rowId ? { ...row, [colKey]: processedValue } : row
      )
    );
    
    // Clear active cell selection
    setActiveCell(null);
    
    // Show save indicator briefly
    setShowSaveIndicator({ row: rowId, col: colKey });
    setTimeout(() => {
      setShowSaveIndicator(null);
    }, 1500);
  };

  // State for tracking which header is being edited
  const [editingHeader, setEditingHeader] = useState<string | null>(null);

  // Add a new column
  const addColumn = (
    newColumnInfo: {
      header: string;
      type: ColumnType;
      options?: string[];
      colors?: Record<string, string>;
    },
    setNewColumnInfo: (info: {
      header: string;
      type: ColumnType;
      options?: string[];
      colors?: Record<string, string>;
    }) => void,
    setIsAddingColumn: (isAdding: boolean) => void
  ) => {
    // Save state for undo/redo
    saveStateToHistory();
    
    // Generate a key for the new column
    const newKey = generateSlug(newColumnInfo.header);
    
    // Check for duplicate keys
    if (columns.some((col) => col.key === newKey)) {
      toast.error("A column with a similar name already exists");
      return;
    }
    
    // Create the new column definition
    const newColumn: ColumnDef = {
      key: newKey,
      header: newColumnInfo.header,
      type: newColumnInfo.type,
      editable: true,
      options: newColumnInfo.options,
      colors: newColumnInfo.colors,
      width: 150 // Default width
    };
    
    // Add the new column to the state
    setColumns([...columns, newColumn]);
    
    // Reset the new column info and close the dialog
    setNewColumnInfo({
      header: "",
      type: "text"
    });
    setIsAddingColumn(false);
    
    // Add the new column data to each row
    setData((prevData) =>
      prevData.map((row) => ({
        ...row,
        [newKey]: ""
      }))
    );
    
    toast.success(`Added column "${newColumnInfo.header}"`);
  };

  // Delete a column
  const deleteColumn = (colKey: string) => {
    // Save state for undo/redo
    saveStateToHistory();
    
    // Check if it's the opportunity column which shouldn't be deleted
    const column = columns.find((col) => col.key === colKey);
    if (column?.key === "opportunity") {
      toast.error("Cannot delete the Opportunity column");
      return;
    }
    
    // Remove the column from the columns state
    setColumns(columns.filter((col) => col.key !== colKey));
    
    // Remove the column data from each row
    setData((prevData) =>
      prevData.map((row) => {
        const newRow = { ...row };
        delete newRow[colKey];
        return newRow;
      })
    );
    
    toast.success(`Deleted column "${column?.header || colKey}"`);
  };

  // Duplicate a column
  const duplicateColumn = (column: ColumnDef) => {
    // Save state for undo/redo
    saveStateToHistory();
    
    // Generate a unique name for the duplicated column
    const newHeader = `${column.header} (copy)`;
    const newKey = generateSlug(newHeader);
    
    // Create the duplicated column definition
    const newColumn: ColumnDef = {
      ...column,
      key: newKey,
      header: newHeader
    };
    
    // Add the new column to the state
    setColumns([...columns, newColumn]);
    
    // Add the duplicated column data to each row
    setData((prevData) =>
      prevData.map((row) => ({
        ...row,
        [newKey]: row[column.key] || ""
      }))
    );
    
    toast.success(`Duplicated column "${column.header}"`);
  };

  // Rename a column
  const renameColumn = (colKey: string, newName: string) => {
    // Save state for undo/redo
    saveStateToHistory();
    
    // Update the column header
    setColumns(
      columns.map((col) =>
        col.key === colKey ? { ...col, header: newName } : col
      )
    );
    
    toast.success(`Renamed column to "${newName}"`);
  };

  // Sort a column
  const sortColumn = (colKey: string, direction: "asc" | "desc") => {
    // Save state for undo/redo
    saveStateToHistory();
    
    // Sort the data based on the column values
    const sortedData = [...data].sort((a, b) => {
      let valueA = a[colKey];
      let valueB = b[colKey];
      
      // Handle different data types
      if (typeof valueA === "string" && typeof valueB === "string") {
        // For currency, remove $ and commas
        if (valueA.startsWith("$")) {
          valueA = parseFloat(valueA.replace(/[$,]/g, ""));
          valueB = parseFloat(valueB.replace(/[$,]/g, ""));
        }
        
        // For strings, use localeCompare
        if (isNaN(valueA)) {
          return direction === "asc"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }
      }
      
      // For numbers and other types
      if (direction === "asc") {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      } else {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
    });
    
    // Update the data state with the sorted rows
    setData(sortedData);
    
    toast.success(
      `Sorted by "${columns.find((col) => col.key === colKey)?.header || colKey}" (${
        direction === "asc" ? "A-Z" : "Z-A"
      })`
    );
  };

  // Move a column left or right
  const moveColumn = (colKey: string, direction: "left" | "right") => {
    // Save state for undo/redo
    saveStateToHistory();
    
    const columnIndex = columns.findIndex((col) => col.key === colKey);
    if (columnIndex === -1) return;
    
    // Calculate the new index
    let newIndex = direction === "left" ? columnIndex - 1 : columnIndex + 1;
    
    // Ensure the index is within bounds and not moving into frozen columns
    if (newIndex < 0 || newIndex >= columns.length) return;
    
    // Can't move a non-frozen column before the frozen columns
    const isFrozen = columns[columnIndex].frozen;
    const targetIsFrozen = columns[newIndex].frozen;
    
    if (!isFrozen && targetIsFrozen && direction === "left") {
      toast.error("Cannot move non-frozen columns before frozen columns");
      return;
    }
    
    if (isFrozen && !targetIsFrozen && direction === "right") {
      toast.error("Cannot move frozen columns after non-frozen columns");
      return;
    }
    
    // Create a new array with the column moved
    const newColumns = [...columns];
    const [movedColumn] = newColumns.splice(columnIndex, 1);
    newColumns.splice(newIndex, 0, movedColumn);
    
    // Update the columns state
    setColumns(newColumns);
    
    toast.success(`Moved column "${movedColumn.header || colKey}" ${direction}`);
  };

  // Handle drag start for column reordering
  const handleDragStart = (key: string) => {
    setDraggedColumn(key);
  };

  // Handle drag over for column reordering
  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    if (draggedColumn === key) {
      return;
    }
    setDragOverColumn(key);
  };

  // Handle drop for column reordering
  const handleDrop = (key: string) => {
    if (!draggedColumn || draggedColumn === key) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }
    
    // Save state for undo/redo
    saveStateToHistory();
    
    const draggedColIndex = columns.findIndex((col) => col.key === draggedColumn);
    const dropColIndex = columns.findIndex((col) => col.key === key);
    
    if (draggedColIndex === -1 || dropColIndex === -1) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }
    
    const draggedColIsFrozen = columns[draggedColIndex].frozen;
    const dropColIsFrozen = columns[dropColIndex].frozen;
    
    // Don't allow dragging frozen columns to non-frozen and vice versa
    if (draggedColIsFrozen !== dropColIsFrozen) {
      toast.error("Cannot move between frozen and non-frozen columns");
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }
    
    // Create a new array with the column moved
    const newColumns = [...columns];
    const [movedColumn] = newColumns.splice(draggedColIndex, 1);
    newColumns.splice(dropColIndex, 0, movedColumn);
    
    // Update the columns state
    setColumns(newColumns);
    
    // Reset drag state
    setDraggedColumn(null);
    setDragOverColumn(null);
    
    toast.success(`Moved column "${movedColumn.header}"`);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (
    e: React.KeyboardEvent,
    undoStack: { columns: ColumnDef[]; data: { id: string; [key: string]: any }[] }[],
    setUndoStack: React.Dispatch<React.SetStateAction<{ columns: ColumnDef[]; data: { id: string; [key: string]: any }[] }[]>>,
    redoStack: { columns: ColumnDef[]; data: { id: string; [key: string]: any }[] }[],
    setRedoStack: React.Dispatch<React.SetStateAction<{ columns: ColumnDef[]; data: { id: string; [key: string]: any }[] }[]>>
  ) => {
    // Handle Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      
      if (undoStack.length > 0) {
        // Pop the last state off the undo stack
        const newUndoStack = [...undoStack];
        const prevState = newUndoStack.pop();
        
        if (prevState) {
          // Save current state to redo stack
          setRedoStack([...redoStack, { columns, data }]);
          
          // Restore previous state
          setColumns(prevState.columns);
          setData(prevState.data);
          
          // Update undo stack
          setUndoStack(newUndoStack);
        }
      }
    }
    
    // Handle Ctrl+Y for redo
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      
      if (redoStack.length > 0) {
        // Pop the last state off the redo stack
        const newRedoStack = [...redoStack];
        const nextState = newRedoStack.pop();
        
        if (nextState) {
          // Save current state to undo stack
          setUndoStack([...undoStack, { columns, data }]);
          
          // Restore next state
          setColumns(nextState.columns);
          setData(nextState.data);
          
          // Update redo stack
          setRedoStack(newRedoStack);
        }
      }
    }
    
    // Handle escape key to cancel editing
    if (e.key === 'Escape' && activeCell) {
      setActiveCell(null);
    }
  };

  // Handle column resize
  const handleColumnResize = (colKey: string, newWidth: number) => {
    // Save state for undo/redo
    saveStateToHistory();
    
    // Update the column width
    setColumns(
      columns.map((col) =>
        col.key === colKey ? { ...col, width: newWidth } : col
      )
    );
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
    handleColumnResize
  };
}
