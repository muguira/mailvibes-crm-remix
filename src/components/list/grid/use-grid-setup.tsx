
import { useMemo, useState, useRef, RefObject, useEffect } from "react";
import { ColumnDef, ColumnType } from "./types";

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
  // State for columns and data
  const [columns, setColumns] = useState<ColumnDef[]>(initialColumns);
  const [data, setData] = useState<any[]>(initialData);

  // Effect to update columns when initialColumns changes
  useEffect(() => {
    console.log("initialColumns updated:", initialColumns);
    setColumns(initialColumns);
  }, [initialColumns]);

  // Effect to update data when initialData changes
  useEffect(() => {
    console.log("initialData updated:", initialData);
    setData(initialData);
  }, [initialData]);

  // State for active cell and editing
  const [activeCell, setActiveCell] = useState<{ row: string; col: string } | null>(null);
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [showSaveIndicator, setShowSaveIndicator] = useState<{ row: string; col: string } | null>(null);
  
  // State for drag and drop functionality
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  // State for adding new columns
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumn, setNewColumn] = useState<{
    header: string;
    type: ColumnType;
    options?: string[];
    colors?: Record<string, string>;
  }>({
    header: "",
    type: "text",
    options: []
  });
  
  // State for undo/redo functionality
  const [undoStack, setUndoStack] = useState<{columns: ColumnDef[], data: any[]}[]>([]);
  const [redoStack, setRedoStack] = useState<{columns: ColumnDef[], data: any[]}[]>([]);
  
  // Memoized frozen and scrollable columns
  const frozenColumns = useMemo(() => {
    const frozen = columns.filter(col => col.frozen);
    console.log("Frozen columns computed:", frozen);
    return frozen;
  }, [columns]);
  
  const scrollableColumns = useMemo(() => {
    const scrollable = columns.filter(col => !col.frozen);
    console.log("Scrollable columns computed:", scrollable);
    return scrollable;
  }, [columns]);
  
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
  
  // Save current state to history for undo functionality
  const saveStateToHistory = () => {
    setUndoStack(prev => [...prev, {columns: [...columns], data: [...data]}]);
    setRedoStack([]);
  };
  
  // Cell click handler
  const handleCellClick = (rowId: string, colKey: string, colType?: string) => {
    setActiveCell({ row: rowId, col: colKey });
  };

  // Cell change handler
  const handleCellChange = (rowId: string, colKey: string, value: any, type?: string) => {
    setData(prevData => 
      prevData.map(row => 
        row.id === rowId ? { ...row, [colKey]: value } : row
      )
    );
    setShowSaveIndicator({ row: rowId, col: colKey });
    
    // Clear save indicator after a delay
    setTimeout(() => {
      setShowSaveIndicator(null);
    }, 1000);
  };
  
  // Header double click handler
  const handleHeaderDoubleClick = (colKey: string) => {
    console.log("Double click on header:", colKey);
    setEditingHeader(colKey);
  };
  
  // Add column handler
  const addColumn = () => {
    if (!newColumn.header) return;
    
    const newKey = newColumn.header.toLowerCase().replace(/\s/g, "_");
    const newColumnDef: ColumnDef = {
      key: newKey,
      header: newColumn.header,
      type: newColumn.type,
      options: newColumn.options,
      colors: newColumn.type === 'status' ? newColumn.colors : undefined,
    };
    
    console.log("Adding new column:", newColumnDef);
    saveStateToHistory();
    setColumns(prevColumns => [...prevColumns, newColumnDef]);
    
    // Add the new column to all existing data rows with proper typing
    setData(prevData =>
      prevData.map(row => ({ 
        ...row, 
        [newKey]: "" 
      }))
    );
    
    // Reset new column form
    setNewColumn({
      header: "",
      type: "text",
      options: []
    });
    
    setIsAddingColumn(false);
  };
  
  // Delete column handler
  const deleteColumn = (colKey: string) => {
    console.log("Deleting column:", colKey);
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
    console.log("Duplicating column:", column);
    saveStateToHistory();
    const newKey = `${column.key}_copy`;
    const newColumn = { ...column, key: newKey, header: `${column.header} Copy` };
    setColumns(prevColumns => [...prevColumns, newColumn]);
    setData(prevData =>
      prevData.map(row => ({ ...row, [newKey]: row[column.key] }))
    );
  };
  
  // Rename column handler
  const renameColumn = (colKey: string, newName: string) => {
    console.log("Renaming column:", colKey, "to", newName);
    saveStateToHistory();
    setColumns(prevColumns =>
      prevColumns.map(col =>
        col.key === colKey ? { ...col, header: newName } : col
      )
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
  
  // Drag handlers
  const handleDragStart = (key: string) => {
    console.log("Drag start:", key);
    setDraggedColumn(key);
  };
  
  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    setDragOverColumn(key);
  };
  
  const handleDrop = (key: string) => {
    console.log("Drop on:", key);
    if (!draggedColumn) return;
    
    const draggingColIndex = columns.findIndex(col => col.key === draggedColumn);
    const dropColIndex = columns.findIndex(col => col.key === key);
    
    if (draggingColIndex === dropColIndex) return;
    
    saveStateToHistory();
    
    // Create new columns array with reordered columns
    const newColumns = [...columns];
    const [draggedCol] = newColumns.splice(draggingColIndex, 1);
    newColumns.splice(dropColIndex, 0, draggedCol);
    
    setColumns(newColumns);
    setDraggedColumn(null);
    setDragOverColumn(null);
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

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    
    // Get the last state from undo stack
    const prevState = undoStack[undoStack.length - 1];
    
    // Save current state to redo stack
    setRedoStack(prev => [...prev, {columns: [...columns], data: [...data]}]);
    
    // Apply the previous state
    setColumns(prevState.columns);
    setData(prevState.data);
    
    // Remove the used state from undo stack
    setUndoStack(prev => prev.slice(0, -1));
  };
  
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    // Get the last state from redo stack
    const nextState = redoStack[redoStack.length - 1];
    
    // Save current state to undo stack
    setUndoStack(prev => [...prev, {columns: [...columns], data: [...data]}]);
    
    // Apply the next state
    setColumns(nextState.columns);
    setData(nextState.data);
    
    // Remove the used state from redo stack
    setRedoStack(prev => prev.slice(0, -1));
  };

  return {
    // State
    columns,
    data,
    activeCell,
    editingHeader,
    setEditingHeader,
    draggedColumn,
    dragOverColumn,
    newColumn,
    setNewColumn,
    isAddingColumn,
    setIsAddingColumn,
    showSaveIndicator,
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    
    // Computed values
    frozenColumns,
    scrollableColumns,
    frozenColsTemplate,
    scrollableColsTemplate,
    
    // Actions
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
    saveStateToHistory,
  };
}
