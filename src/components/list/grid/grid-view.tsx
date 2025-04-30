
import { useRef } from "react";
import { GridToolbar } from "../grid-toolbar";
import { GridHeaders } from "../grid-headers";
import { GridBody } from "../grid-body";
import { useGridSetup } from "./use-grid-setup";
import { GridViewProps } from "./types";
import { SaveIndicatorProvider } from "./contexts/save-indicator-context";
import { ZoomProvider, useZoom } from "./contexts/zoom-context";
import { PointsOfContactDialogContainer } from "./components/points-of-contact-dialog-container";
import { usePointsOfContact } from "./hooks/use-points-of-contact";
import "./grid-view.css";

// Internal Grid component that uses the contexts
function GridViewContent({ 
  columns: initialColumns, 
  data: initialData, 
  listName, 
  listType,
  listId,
  onCellChange,
  onAddItem
}: GridViewProps & { 
  listId?: string,
  onCellChange?: (rowId: string, colKey: string, value: any) => void,
  onAddItem?: (() => void) | null
}) {
  // Container references for sync scrolling
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  
  // Access zoom context
  const { zoomLevel, setZoomLevel, gridStyle } = useZoom();
  
  // Setup points of contact functionality
  const { setOpenPointsOfContactFn, renderRowActions } = usePointsOfContact();
  
  const {
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
  } = useGridSetup({
    initialColumns,
    initialData,
    headerRef,
    bodyRef
  });

  // Wrap the cell change handler to save to Supabase
  const handleCellChangeAndSave = (rowId: string, colKey: string, value: any, type: string) => {
    // First handle the local change
    handleCellChange(rowId, colKey, value);
    
    // Then save to Supabase if callback is provided
    if (onCellChange && !rowId.startsWith('empty-row-')) {
      onCellChange(rowId, colKey, value);
    }
  };
  
  return (
    <div 
      className="h-full flex flex-col full-screen-grid" 
      onKeyDown={(e) => handleKeyDown(e)} 
      tabIndex={-1}
      style={gridStyle}
    >
      {/* Grid Toolbar - Including filter options */}
      <GridToolbar 
        listType={listType} 
        columns={columns}
        onAddItem={onAddItem || undefined}
        onZoomChange={setZoomLevel}
        currentZoom={zoomLevel}
      />
      
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
        addColumn={addColumn}
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
      <GridBody
        data={data}
        frozenColumns={frozenColumns}
        scrollableColumns={scrollableColumns}
        frozenColsTemplate={frozenColsTemplate}
        scrollableColsTemplate={scrollableColsTemplate}
        activeCell={activeCell}
        showSaveIndicator={showSaveIndicator}
        bodyRef={bodyRef}
        onCellClick={handleCellClick}
        onCellChange={handleCellChangeAndSave}
        renderRowActions={(rowId) => renderRowActions(rowId, data.find(r => r.id === rowId))}
      />
      
      {/* Points of Contact Dialog */}
      <PointsOfContactDialogContainer 
        listId={listId} 
        onCellChange={onCellChange} 
        ref={setOpenPointsOfContactFn} 
      />
    </div>
  );
}

// Main GridView wrapper with providers
export function GridView(props: GridViewProps & { 
  listId?: string,
  onCellChange?: (rowId: string, colKey: string, value: any) => void,
  onAddItem?: (() => void) | null
}) {
  return (
    <SaveIndicatorProvider>
      <ZoomProvider>
        <GridViewContent {...props} />
      </ZoomProvider>
    </SaveIndicatorProvider>
  );
}
