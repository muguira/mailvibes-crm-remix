
import { RefObject, useRef, useEffect } from "react";
import { ColumnDef, ColumnType } from "./grid/types";
import { GridHeadersSection } from "./grid/components/grid-headers-section";
import { AddColumnButton } from "./grid/components/add-column-button";

interface GridHeadersProps {
  frozenColumns: ColumnDef[];
  scrollableColumns: ColumnDef[];
  frozenColsTemplate: string;
  scrollableColsTemplate: string;
  editingHeader: string | null;
  setEditingHeader: (key: string | null) => void;
  draggedColumn: string | null;
  dragOverColumn: string | null;
  headerRef: RefObject<HTMLDivElement>;
  isAddingColumn: boolean;
  setIsAddingColumn: (isAdding: boolean) => void;
  newColumn: {
    header: string;
    type: ColumnType;
    options?: string[];
    colors?: Record<string, string>;
  };
  setNewColumn: (newCol: {
    header: string;
    type: ColumnType;
    options?: string[];
    colors?: Record<string, string>;
  }) => void;
  addColumn: () => void;
  onHeaderDoubleClick: (colKey: string) => void;
  onRenameColumn: (colKey: string, newName: string) => void;
  onDuplicateColumn: (column: ColumnDef) => void;
  onMoveColumn: (colKey: string, direction: 'left' | 'right') => void;
  onSortColumn: (colKey: string, direction: 'asc' | 'desc') => void;
  onDeleteColumn: (colKey: string) => void;
  onDragStart: (key: string) => void;
  onDragOver: (e: React.DragEvent, key: string) => void;
  onDrop: (key: string) => void;
}

export function GridHeaders({
  frozenColumns,
  scrollableColumns,
  frozenColsTemplate,
  scrollableColsTemplate,
  editingHeader,
  setEditingHeader,
  draggedColumn,
  dragOverColumn,
  headerRef,
  isAddingColumn,
  setIsAddingColumn,
  newColumn,
  setNewColumn,
  addColumn,
  onHeaderDoubleClick,
  onRenameColumn,
  onDuplicateColumn,
  onMoveColumn,
  onSortColumn,
  onDeleteColumn,
  onDragStart,
  onDragOver,
  onDrop
}: GridHeadersProps) {
  // Local ref to help with head cell visibility
  const localHeaderRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    console.log("GridHeaders rendering with columns:", { 
      frozen: frozenColumns, 
      scrollable: scrollableColumns 
    });
    
    // Force visibility of header cells after they're rendered
    const ensureHeadersVisible = () => {
      if (headerRef.current) {
        const headerCells = headerRef.current.querySelectorAll('.grid-header-cell');
        headerCells.forEach(cell => {
          (cell as HTMLElement).style.visibility = 'visible';
          (cell as HTMLElement).style.opacity = '1';
          
          // Make sure the header text is visible too
          const headerText = cell.querySelector('span');
          if (headerText) {
            (headerText as HTMLElement).style.visibility = 'visible';
            (headerText as HTMLElement).style.opacity = '1';
          }
        });
      }
      
      if (localHeaderRef.current) {
        const allHeaderContainers = localHeaderRef.current.querySelectorAll('.grid-header');
        allHeaderContainers.forEach(container => {
          (container as HTMLElement).style.visibility = 'visible';
          (container as HTMLElement).style.opacity = '1';
        });
      }
    };
    
    // Execute multiple times to ensure it catches
    setTimeout(ensureHeadersVisible, 100);
    setTimeout(ensureHeadersVisible, 300);
  }, [frozenColumns, scrollableColumns, headerRef]);

  return (
    <div 
      className="grid-headers-container sticky top-0 z-10 bg-white"
      ref={localHeaderRef}
    >
      {/* Row number header */}
      <div className="row-number-header"></div>
      
      {/* Headers container */}
      <div className="flex flex-1 overflow-visible">
        {/* Frozen header columns */}
        {frozenColumns && frozenColumns.length > 0 && (
          <GridHeadersSection
            columns={frozenColumns}
            editingHeader={editingHeader}
            setEditingHeader={setEditingHeader}
            onHeaderDoubleClick={onHeaderDoubleClick}
            onRenameColumn={onRenameColumn}
            onDuplicateColumn={onDuplicateColumn}
            onMoveColumn={onMoveColumn}
            onSortColumn={onSortColumn}
            onDeleteColumn={onDeleteColumn}
            isFrozen={true}
            style={{
              boxShadow: "5px 0 5px -2px rgba(0,0,0,0.05)",
              position: "sticky",
              left: "40px", // Account for row number
              display: "flex",
              visibility: 'visible',
              opacity: 1
            }}
          />
        )}

        {/* Scrollable header columns */}
        <div className="flex flex-1 overflow-visible relative" style={{ 
          marginLeft: frozenColumns && frozenColumns.length > 0 ? 0 : "40px" // Adjust margin if no frozen columns
        }}>
          <GridHeadersSection
            columns={scrollableColumns}
            editingHeader={editingHeader}
            setEditingHeader={setEditingHeader}
            onHeaderDoubleClick={onHeaderDoubleClick}
            onRenameColumn={onRenameColumn}
            onDuplicateColumn={onDuplicateColumn}
            onMoveColumn={onMoveColumn}
            onSortColumn={onSortColumn}
            onDeleteColumn={onDeleteColumn}
            dragOverColumn={dragOverColumn}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            headerRef={headerRef}
          />

          {/* Add Column button - positioned as sticky */}
          <AddColumnButton
            isAddingColumn={isAddingColumn}
            setIsAddingColumn={setIsAddingColumn}
            newColumn={newColumn}
            setNewColumn={setNewColumn}
            addColumn={addColumn}
          />
        </div>
      </div>
    </div>
  );
}
