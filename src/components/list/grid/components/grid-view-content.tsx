
import { useRef, useEffect, useState } from "react";
import { GridToolbar } from "../../grid-toolbar";
import { GridHeaders } from "../../grid-headers";
import { GridBody } from "../../grid-body";
import { useGridSetup } from "../use-grid-setup";
import { GridViewProps } from "../types";
import { PointsOfContactDialogContainer } from "./points-of-contact-dialog-container";
import { usePointsOfContact } from "../hooks/use-points-of-contact";
import "../grid-view.css";

interface GridViewContentProps extends GridViewProps {
  listId?: string;
  onCellChange?: (rowId: string, colKey: string, value: any) => void;
  onAddItem?: (() => void) | null;
}

export function GridViewContent({ 
  columns: initialColumns, 
  data: initialData, 
  listName, 
  listType,
  listId,
  onCellChange,
  onAddItem
}: GridViewContentProps) {
  // Container references for sync scrolling
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);
  
  // Context menu state
  const [activeColumnMenu, setActiveColumnMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
  
  // Setup points of contact functionality
  const { setOpenPointsOfContactFn, renderRowActions } = usePointsOfContact();
  
  const {
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
    redoStack,
    setUndoStack,
    setRedoStack,
    frozenColumns,
    scrollableColumns,
    frozenColsTemplate,
    scrollableColsTemplate,
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
  
  // Unified column context menu handler
  const handleColumnContextMenu = (colKey: string, position: { x: number, y: number }) => {
    setActiveColumnMenu(colKey);
    setMenuPosition(position);
  };
  
  // Close context menu
  const closeContextMenu = () => {
    setActiveColumnMenu(null);
    setMenuPosition(null);
  };

  // Debug log to verify columns data
  useEffect(() => {
    console.log("GridViewContent: Columns data", {
      frozen: frozenColumns,
      scrollable: scrollableColumns,
      all: columns
    });
  }, [frozenColumns, scrollableColumns, columns]);

  // Force header visibility with multiple approaches
  useEffect(() => {
    const forceHeaderVisibility = () => {
      if (headerRef.current) {
        console.log("Forcing header visibility");
        
        // Add !important styles
        headerRef.current.setAttribute('style', 'visibility: visible !important; opacity: 1 !important; display: flex !important');
        
        // Force reflow by temporarily hiding and showing
        headerRef.current.style.display = 'none';
        void headerRef.current.offsetHeight; // Force reflow
        headerRef.current.style.display = 'flex';
        
        // Apply to all header cells
        const headerCells = headerRef.current.querySelectorAll('.grid-header-cell');
        headerCells.forEach((cell) => {
          (cell as HTMLElement).setAttribute('style', 'visibility: visible !important; opacity: 1 !important');
          
          // Also make sure spans are visible
          const spans = cell.querySelectorAll('span');
          spans.forEach((span) => {
            (span as HTMLElement).setAttribute('style', 'visibility: visible !important; opacity: 1 !important');
          });
        });
        
        // Ensure all header container is visible
        const headersContainer = document.querySelector('.grid-headers-container');
        if (headersContainer) {
          (headersContainer as HTMLElement).setAttribute('style', 'visibility: visible !important; opacity: 1 !important');
        }
        
        setHeaderVisible(true);
      }
    };
    
    // Apply multiple times with delays to ensure it works
    forceHeaderVisibility();
    setTimeout(forceHeaderVisibility, 100);
    setTimeout(forceHeaderVisibility, 300);
    setTimeout(forceHeaderVisibility, 500);
    setTimeout(forceHeaderVisibility, 1000);
    
  }, [columns, initialColumns, initialData]);

  // Wrap the cell change handler to save to Supabase
  const handleCellChangeAndSave = (rowId: string, colKey: string, value: any, type: string) => {
    // First handle the local change
    handleCellChange(rowId, colKey, value, type);
    
    // Then save to Supabase if callback is provided
    if (onCellChange && !rowId.startsWith('empty-row-')) {
      onCellChange(rowId, colKey, value);
    }
  };
  
  // Menu action handlers
  const handleCopyColumn = (colKey: string) => {
    console.log(`Copy column: ${colKey}`);
    closeContextMenu();
  };
  
  const handlePasteColumn = (colKey: string) => {
    console.log(`Paste into column: ${colKey}`);
    closeContextMenu();
  };
  
  const handleInsertColumnLeft = (colKey: string) => {
    // Find previous column
    const currentIndex = columns.findIndex(col => col.key === colKey);
    if (currentIndex > 0) {
      const prevColKey = columns[currentIndex - 1].key;
      addColumn();
    } else {
      addColumn();
    }
    closeContextMenu();
  };
  
  const handleInsertColumnRight = (colKey: string) => {
    addColumn();
    closeContextMenu();
  };
  
  const handleDeleteColumnAction = (colKey: string) => {
    if (colKey !== 'opportunity') {
      deleteColumn(colKey);
    }
    closeContextMenu();
  };
  
  const handleSortAZ = (colKey: string) => {
    sortColumn(colKey, 'asc');
    closeContextMenu();
  };
  
  const handleSortZA = (colKey: string) => {
    sortColumn(colKey, 'desc');
    closeContextMenu();
  };
  
  return (
    <div 
      className="h-full flex flex-col full-screen-grid" 
      onKeyDown={(e) => handleKeyDown(e)} 
      tabIndex={-1}
    >
      {/* Grid Toolbar - Including filter options */}
      <GridToolbar 
        listType={listType} 
        columns={columns}
        onAddItem={onAddItem || undefined}
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
        onContextMenu={handleColumnContextMenu}
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
        onCellContextMenu={handleColumnContextMenu}
        renderRowActions={(rowId) => renderRowActions(rowId, data.find(r => r.id === rowId))}
      />
      
      {/* Points of Contact Dialog */}
      <PointsOfContactDialogContainer 
        listId={listId} 
        onCellChange={onCellChange} 
        ref={setOpenPointsOfContactFn} 
      />
      
      {/* Column Context Menu (rendered conditionally) */}
      {activeColumnMenu && menuPosition && (
        <div 
          style={{
            position: 'absolute',
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
            zIndex: 1000
          }}
        >
          {/* Using the shared context menu component */}
        </div>
      )}
    </div>
  );
}
