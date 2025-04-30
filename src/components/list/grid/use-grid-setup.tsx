
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
  
  // Initialize grid actions
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
    showSaveIndicator,
    setShowSaveIndicator,
    draggedColumn,
    setDraggedColumn,
    saveStateToHistory
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
    addColumn: () => addColumn(newColumn),
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
