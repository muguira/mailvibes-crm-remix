
import { useRef } from "react";
import { GridToolbar } from "./grid-toolbar";
import { GridHeaders } from "./grid-headers";
import { GridRow } from "./grid-row";
import { useGridState } from "./grid-hooks/use-grid-state";
import { useGridActions } from "./grid-hooks/use-grid-actions";
import { useGridScroll } from "./grid-hooks/use-grid-scroll";

export type ColumnType = "text" | "number" | "date" | "status" | "currency" | "select" | "checkbox" | "url";

export interface ColumnDef {
  key: string;
  header: string;
  type: ColumnType;
  editable?: boolean;
  width?: number;
  options?: string[];
  colors?: Record<string, string>;
  frozen?: boolean; // For keeping columns like "Opportunity" fixed
}

interface GridViewProps {
  columns: ColumnDef[];
  data: { id: string; [key: string]: any }[];
  listName: string;
  listType: string;
}

export function GridView({ columns: initialColumns, data: initialData, listName, listType }: GridViewProps) {
  // Container references for sync scrolling
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  
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
    saveStateToHistory,
    setDraggedColumn,
    setDragOverColumn
  });
  
  // Setup scroll synchronization
  useGridScroll(headerRef, bodyRef);
  
  return (
    <div 
      className="h-full flex flex-col" 
      onKeyDown={(e) => handleKeyDown(e, undoStack, setUndoStack, redoStack, setRedoStack)} 
      tabIndex={-1}
    >
      {/* Toolbar */}
      <GridToolbar listType={listType} columns={columns} />
      
      {/* Grid Headers */}
      <GridHeaders 
        frozenColumns={frozenColumns}
        scrollableColumns={scrollableColumns}
        frozenColsTemplate={frozenColsTemplate}
        scrollableColsTemplate={scrollableColsTemplate}
        editingHeader={editingHeader}
        setEditingHeader={setEditingHeader}
        draggedColumn={draggedColumn}
        dragOverColumn={dragOverColumn}
        headerRef={headerRef}
        isAddingColumn={isAddingColumn}
        setIsAddingColumn={setIsAddingColumn}
        newColumn={newColumn}
        setNewColumn={setNewColumn}
        addColumn={() => addColumn(newColumn, setNewColumn, setIsAddingColumn)}
        onHeaderDoubleClick={handleHeaderDoubleClick}
        onRenameColumn={renameColumn}
        onDuplicateColumn={duplicateColumn}
        onMoveColumn={moveColumn}
        onSortColumn={sortColumn}
        onDeleteColumn={deleteColumn}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
      
      {/* Grid Content */}
      <div className="overflow-auto flex-1" ref={bodyRef}>
        {data.map((row) => (
          <GridRow
            key={row.id}
            rowData={row}
            frozenColumns={frozenColumns}
            scrollableColumns={scrollableColumns}
            frozenColsTemplate={frozenColsTemplate}
            scrollableColsTemplate={scrollableColsTemplate}
            activeCell={activeCell}
            showSaveIndicator={showSaveIndicator}
            onCellClick={handleCellClick}
            onCellChange={handleCellChange}
          />
        ))}
      </div>
    </div>
  );
}
