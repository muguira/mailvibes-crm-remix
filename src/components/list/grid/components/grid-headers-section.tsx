
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
  onContextMenu?: (e: React.MouseEvent, colKey: string) => void;
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
  onContextMenu,
  dragOverColumn,
  onDragStart,
  onDragOver,
  onDrop,
  isFrozen = false,
  headerRef,
  style
}: GridHeadersSectionProps) {
  const localHeaderRef = useRef<HTMLDivElement>(null);
  
  // Force header visibility
  useEffect(() => {
    console.log(`Rendering headers section with ${columns.length} columns`);
    console.log("Columns:", columns.map(col => `${col.key}: ${col.header || 'no header'}`));
    
    const ref = headerRef || localHeaderRef;
    
    // Apply direct styles to ensure headers are visible
    const forceVisible = () => {
      if (ref.current) {
        // Use setAttribute for !important styles
        ref.current.setAttribute('style', 'visibility: visible !important; opacity: 1 !important; z-index: 10 !important;');
        
        // Apply to each header cell
        const headerCells = ref.current.querySelectorAll('.grid-header-cell');
        headerCells.forEach(cell => {
          (cell as HTMLElement).setAttribute('style',
            'visibility: visible !important; opacity: 1 !important; z-index: 20 !important;');
          
          // Apply to the header text
          const headerText = cell.querySelector('span');
          if (headerText) {
            (headerText as HTMLElement).setAttribute('style',
              'visibility: visible !important; opacity: 1 !important; display: inline-block !important; z-index: 25 !important;');
          }
        });
      }
    };
    
    // Execute multiple times to ensure it works
    forceVisible();
    const timer1 = setTimeout(forceVisible, 100);
    const timer2 = setTimeout(forceVisible, 300);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
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
        zIndex: 10,
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
          onContextMenu={onContextMenu}
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
