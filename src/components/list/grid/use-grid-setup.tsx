import { RefObject } from "react";
import { 
  useGridColumns, 
  useGridData, 
  useColumnActions, 
  useDragDrop, 
  useCellInteractions, 
  useHistory, 
  useNewColumn
} from "./hooks";
import { ColumnDef, ColumnType } from "./types";

interface GridSetupProps {
  initialColumns: ColumnDef[];
  initialData: any[];
  headerRef: React.RefObject<HTMLDivElement>;
  bodyRef: React.RefObject<HTMLDivElement>;
  onAddColumn?: (afterColumnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
}

export function useGridSetup({ 
  initialColumns, 
  initialData,
  headerRef,
  bodyRef,
  onAddColumn,
  onDeleteColumn
}: GridSetupProps) {
  // Use our modular hooks
  const {
    columns,
    setColumns,
    editingHeader,
    setEditingHeader,
    draggedColumn,
    setDraggedColumn,
    dragOverColumn,
    setDragOverColumn,
    frozenColumns,
    scrollableColumns,
    frozenColsTemplate,
    scrollableColsTemplate
  } = useGridColumns({ initialColumns });

  const {
    data,
    setData,
    activeCell,
    setActiveCell,
    showSaveIndicator,
    setShowSaveIndicator
  } = useGridData({ initialData });

  const {
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    saveStateToHistory,
    handleKeyDown: historyKeyDown
  } = useHistory({ columns, data });

  const {
    isAddingColumn,
    setIsAddingColumn,
    newColumn,
    setNewColumn
  } = useNewColumn();

  const {
    handleCellClick,
    handleCellChange
  } = useCellInteractions({ data, setData, setActiveCell, setShowSaveIndicator });

  const {
    handleHeaderDoubleClick,
    renameColumn,
    deleteColumn,
    duplicateColumn,
    sortColumn,
    moveColumn
  } = useColumnActions({ columns, setColumns, data, setData, saveStateToHistory });

  const {
    handleDragStart,
    handleDragOver,
    handleDrop: createHandleDrop
  } = useDragDrop({ setDraggedColumn, setDragOverColumn });

  // Create the final handleDrop function with necessary context
  const handleDrop = createHandleDrop(draggedColumn, columns, setColumns);

  // Add column handler with callback integration
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
    
    // Call the external callback if provided
    if (onAddColumn) {
      onAddColumn(newKey);
    }
    
    // Reset new column form
    setNewColumn({
      header: "",
      type: "text",
      options: []
    });
    
    setIsAddingColumn(false);
  };

  // Undo/Redo handlers
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

  // Main keyboard handler that combines history with other keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    historyKeyDown(e, handleUndo, handleRedo);
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
