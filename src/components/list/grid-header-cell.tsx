
import { ChevronDown, PencilLine, Copy, ArrowLeft, ArrowRight, SortAsc, SortDesc, Trash2, GripVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ColumnDef } from "./grid-view";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface GridHeaderCellProps {
  column: ColumnDef;
  onHeaderDoubleClick: (colKey: string) => void;
  onRenameColumn: (colKey: string, newName: string) => void;
  onDuplicateColumn: (column: ColumnDef) => void;
  onMoveColumn: (colKey: string, direction: 'left' | 'right') => void;
  onSortColumn: (colKey: string, direction: 'asc' | 'desc') => void;
  onDeleteColumn: (colKey: string) => void;
  editingHeader: string | null;
  setEditingHeader: (key: string | null) => void;
  dragOverColumn?: string | null;
  onDragStart?: (key: string) => void;
  onDragOver?: (e: React.DragEvent, key: string) => void;
  onDrop?: (key: string) => void;
  draggable?: boolean;
  onResize?: (colKey: string, newWidth: number) => void;
}

export function GridHeaderCell({ 
  column, 
  onHeaderDoubleClick,
  onRenameColumn,
  onDuplicateColumn,
  onMoveColumn,
  onSortColumn,
  onDeleteColumn,
  editingHeader,
  setEditingHeader,
  dragOverColumn,
  onDragStart,
  onDragOver,
  onDrop,
  draggable = false,
  onResize
}: GridHeaderCellProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [initialWidth, setInitialWidth] = useState(column.width || 150);
  const cellRef = useRef<HTMLDivElement>(null);
  const resizeTooltipRef = useRef<HTMLDivElement>(null);
  
  const handleHeaderEditComplete = (key: string, newName: string) => {
    if (!newName.trim() || newName.trim() === column.header) {
      setEditingHeader(null);
      return;
    }
    onRenameColumn(key, newName);
    setEditingHeader(null);
  };

  const handleDragOverEvent = (e: React.DragEvent) => {
    if (onDragOver) onDragOver(e, column.key);
  };
  
  const handleDropEvent = () => {
    if (onDrop) onDrop(column.key);
  };

  const handleDragStartEvent = () => {
    if (onDragStart) onDragStart(column.key);
  };
  
  // Handle column resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartX(e.clientX);
    
    if (cellRef.current) {
      setInitialWidth(cellRef.current.offsetWidth);
    }
    
    // Show resize tooltip
    if (resizeTooltipRef.current) {
      resizeTooltipRef.current.style.display = 'block';
      resizeTooltipRef.current.textContent = `${initialWidth}px`;
    }
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  
  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const diff = e.clientX - resizeStartX;
    const newWidth = Math.max(80, initialWidth + diff); // Minimum width of 80px
    
    // Update resize tooltip
    if (resizeTooltipRef.current) {
      resizeTooltipRef.current.textContent = `${newWidth}px`;
      
      // Position tooltip near the cursor
      resizeTooltipRef.current.style.left = `${e.clientX + 10}px`;
      resizeTooltipRef.current.style.top = `${e.clientY - 20}px`;
    }
    
    // Update the width visually during drag
    if (cellRef.current) {
      cellRef.current.style.width = `${newWidth}px`;
    }
  };
  
  const handleResizeEnd = () => {
    setIsResizing(false);
    
    // Hide resize tooltip
    if (resizeTooltipRef.current) {
      resizeTooltipRef.current.style.display = 'none';
    }
    
    // Calculate final width
    if (cellRef.current && onResize) {
      const finalWidth = cellRef.current.offsetWidth;
      onResize(column.key, finalWidth);
    }
    
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };
  
  useEffect(() => {
    // Clean up event listeners when component unmounts
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  return (
    <div 
      ref={cellRef}
      className={`grid-header-cell ${dragOverColumn === column.key ? 'border-l-2 border-r-2 border-teal-primary' : ''} relative`}
      onDoubleClick={() => onHeaderDoubleClick(column.key)}
      draggable={draggable}
      onDragStart={draggable ? handleDragStartEvent : undefined}
      onDragOver={draggable ? handleDragOverEvent : undefined}
      onDrop={draggable ? handleDropEvent : undefined}
      style={{ width: column.width ? `${column.width}px` : undefined }}
    >
      {editingHeader === column.key ? (
        <input 
          type="text"
          className="w-full bg-transparent outline-none border-b border-teal-primary"
          defaultValue={column.header}
          autoFocus
          onBlur={(e) => handleHeaderEditComplete(column.key, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleHeaderEditComplete(column.key, e.currentTarget.value);
            } else if (e.key === 'Escape') {
              setEditingHeader(null);
            }
          }}
        />
      ) : (
        // Don't style the opportunity header as a link
        <span className={column.key === "opportunity" ? "font-medium text-navy-deep" : ""}>
          {column.header}
        </span>
      )}
      
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger className="p-1 rounded hover:bg-slate-light/20">
            <ChevronDown size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {column.key !== "opportunity" && (
              <DropdownMenuItem onClick={() => {
                const newName = prompt("Rename column:", column.header);
                if (newName) onRenameColumn(column.key, newName);
              }}>
                <PencilLine size={14} className="mr-2" />
                Rename
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onDuplicateColumn(column)}>
              <Copy size={14} className="mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {column.key !== "opportunity" && (
              <>
                <DropdownMenuItem onClick={() => onMoveColumn(column.key, 'left')}>
                  <ArrowLeft size={14} className="mr-2" />
                  Move Left
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMoveColumn(column.key, 'right')}>
                  <ArrowRight size={14} className="mr-2" />
                  Move Right
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => onSortColumn(column.key, 'asc')}>
              <SortAsc size={14} className="mr-2" />
              Sort A-Z
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortColumn(column.key, 'desc')}>
              <SortDesc size={14} className="mr-2" />
              Sort Z-A
            </DropdownMenuItem>
            {column.key !== "opportunity" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDeleteColumn(column.key)} className="text-red-500">
                  <Trash2 size={14} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Column resize handle */}
      {onResize && (
        <div 
          className="absolute top-0 right-0 h-full w-2 cursor-col-resize flex items-center hover:bg-teal-primary/20"
          onMouseDown={handleResizeStart}
        >
          <GripVertical size={10} className="opacity-0 group-hover:opacity-100 text-slate-medium" />
        </div>
      )}
      
      {/* Resize tooltip */}
      <div 
        ref={resizeTooltipRef}
        className="fixed bg-slate-dark text-white px-2 py-1 text-xs rounded pointer-events-none hidden z-50"
        style={{ left: '0', top: '0' }}
      ></div>
    </div>
  );
}
