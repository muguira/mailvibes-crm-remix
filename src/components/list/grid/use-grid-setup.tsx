
import { RefObject } from "react";
import { useGridState } from "../grid-hooks/use-grid-state";
import { useGridActions } from "../grid-hooks/use-grid-actions";
import { useGridScroll } from "../grid-hooks/use-grid-scroll";
import { ColumnDef } from "./types";

interface UseGridSetupProps {
  initialColumns: ColumnDef[];
  initialData: { id: string; [key: string]: any }[];
  headerRef: RefObject<HTMLDivElement>;
  bodyRef: RefObject<HTMLDivElement>;
}

export function useGridSetup({ initialColumns, initialData, headerRef, bodyRef }: UseGridSetupProps) {
  // Initialize grid state
  const {
    columns,
    setColumns,
    data,
    setData,
    activeCell,
    setActiveCell,
    editingHeader,
    setEditingHeader,
    draggedColumn,
    setDraggedColumn,
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
    frozenColumns,
    scrollableColumns,
    frozenColsTemplate,
    scrollableColsTemplate
  } = useGridState({
    initialColumns,
    initialData
  });
  
  // Create a wrapper function for setNewColumn that properly handles Partial<ColumnDef>
  const handleSetNewColumn = (column: Partial<ColumnDef>) => {
    setNewColumn({
      header: column.header || "",
      type: column.type || "text",
      options: column.options
    });
  };
  
  // Initialize grid actions with all required props
  const {
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
  } = useGridActions({
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
  });
  
  // Setup scroll synchronization
  useGridScroll(headerRef, bodyRef);
  
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
    setNewColumn: handleSetNewColumn, // Use our wrapper function instead of direct casting
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
  };
}
