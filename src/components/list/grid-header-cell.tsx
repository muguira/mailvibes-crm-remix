
import { ChevronDown, PencilLine, Copy, ArrowLeft, ArrowRight, SortAsc, SortDesc, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ColumnDef } from "./grid/types";
import { useState, useEffect } from "react";

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
  draggable = false
}: GridHeaderCellProps) {
  
  useEffect(() => {
    // Debug log to verify column header rendering
    console.log("Rendering header cell:", column.header, column.key);
  }, [column]);
  
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

  return (
    <div 
      className={`grid-header-cell ${dragOverColumn === column.key ? 'border-l-2 border-r-2 border-teal-primary' : ''}`}
      onDoubleClick={() => onHeaderDoubleClick(column.key)}
      draggable={draggable}
      onDragStart={draggable ? handleDragStartEvent : undefined}
      onDragOver={draggable ? handleDragOverEvent : undefined}
      onDrop={draggable ? handleDropEvent : undefined}
      data-header-key={column.key}
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
        <span className="font-medium text-navy-deep uppercase text-xs">
          {column.header || "Unnamed Column"}
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
    </div>
  );
}
