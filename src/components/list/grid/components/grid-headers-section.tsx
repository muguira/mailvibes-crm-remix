
import { useRef, useEffect } from "react";
import { ColumnDef } from "../types";
import { GridHeaderCell } from "../../grid-header-cell";

interface GridHeadersSectionProps {
  columns: ColumnDef[];
  editingHeader: string | null;
  setEditingHeader: (key: string | null) => void;
  onHeaderDoubleClick: (colKey: string) => void;
  onRenameColumn: (colKey: string, newName: string) => void;
  onDuplicateColumn: (column: ColumnDef) => void;
  onMoveColumn: (colKey: string, direction: 'left' | 'right') => void;
  onSortColumn: (colKey: string, direction: 'asc' | 'desc') => void;
  onDeleteColumn: (colKey: string) => void;
  dragOverColumn?: string | null;
  onDragStart?: (key: string) => void;
  onDragOver?: (e: React.DragEvent, key: string) => void;
  onDrop?: (key: string) => void;
  isFrozen?: boolean;
  headerRef?: React.RefObject<HTMLDivElement>;
  style?: React.CSSProperties;
}

export function GridHeadersSection({
  columns,
  editingHeader,
  setEditingHeader,
  onHeaderDoubleClick,
  onRenameColumn,
  onDuplicateColumn,
  onMoveColumn,
  onSortColumn,
  onDeleteColumn,
  dragOverColumn,
  onDragStart,
  onDragOver,
  onDrop,
  isFrozen = false,
  headerRef,
  style
}: GridHeadersSectionProps) {
  const localHeaderRef = useRef<HTMLDivElement>(null);
  
  // Force visibility on render
  useEffect(() => {
    console.log(`Rendering ${isFrozen ? 'frozen' : 'scrollable'} headers section with ${columns.length} columns`);
    
    // Force reflow of header cells to ensure they're visible
    const ref = headerRef || localHeaderRef;
    
    if (ref.current) {
      const element = ref.current;
      
      element.style.setProperty('visibility', 'visible', 'important');
      element.style.setProperty('opacity', '1', 'important');
      
      // Force reflow
      element.style.display = 'none';
      void element.offsetHeight;
      element.style.display = 'flex';
      
      // Apply to all header cells
      const headerCells = element.querySelectorAll('.grid-header-cell');
      headerCells.forEach((cell) => {
        (cell as HTMLElement).style.setProperty('visibility', 'visible', 'important');
        (cell as HTMLElement).style.setProperty('opacity', '1', 'important');
        
        // Make sure the header text is visible too
        const headerText = cell.querySelector('span');
        if (headerText) {
          (headerText as HTMLElement).style.setProperty('visibility', 'visible', 'important');
          (headerText as HTMLElement).style.setProperty('opacity', '1', 'important');
        }
      });
    }
  }, [columns, headerRef, isFrozen]);
  
  if (!columns || columns.length === 0) {
    return null;
  }
  
  return (
    <div 
      className="grid-header flex"
      style={{ 
        visibility: 'visible',
        opacity: 1,
        ...style 
      }}
      ref={headerRef || localHeaderRef}
    >
      {columns.map((column) => (
        <GridHeaderCell
          key={column.key}
          column={column}
          editingHeader={editingHeader}
          setEditingHeader={setEditingHeader}
          onHeaderDoubleClick={onHeaderDoubleClick}
          onRenameColumn={onRenameColumn}
          onDuplicateColumn={onDuplicateColumn}
          onMoveColumn={onMoveColumn}
          onSortColumn={onSortColumn}
          onDeleteColumn={onDeleteColumn}
          dragOverColumn={dragOverColumn}
          onDragStart={!isFrozen ? onDragStart : undefined}
          onDragOver={!isFrozen ? onDragOver : undefined}
          onDrop={!isFrozen ? onDrop : undefined}
          draggable={!isFrozen}
        />
      ))}
    </div>
  );
}
