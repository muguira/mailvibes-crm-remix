
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Column } from './types';
import { Check, MoreVertical, ArrowUpDown, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface GridHeaderProps {
  columns: Column[];
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void;
  onColumnsReorder?: (columnIds: string[]) => void;
  onColumnResize?: (columnIndex: number, newWidth: number) => void;
  onAddColumn?: (afterColumnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
}

export function GridHeader({ 
  columns, 
  onColumnChange, 
  onColumnsReorder, 
  onColumnResize,
  onAddColumn,
  onDeleteColumn
}: GridHeaderProps) {
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [initialX, setInitialX] = useState(0);
  const [initialWidth, setInitialWidth] = useState(0);
  
  // Handle column header edit (double click)
  const handleHeaderDoubleClick = (columnId: string) => {
    if (columnId === 'opportunity') return; // Don't allow editing the opportunity column
    setEditingHeader(columnId);
  };
  
  // Save edited header title
  const handleHeaderSave = (columnId: string, newTitle: string) => {
    setEditingHeader(null);
    
    if (onColumnChange && newTitle.trim()) {
      onColumnChange(columnId, { title: newTitle });
    }
  };
  
  // Cancel header editing
  const handleHeaderKeyDown = (e: React.KeyboardEvent, columnId: string, newTitle: string) => {
    if (e.key === 'Enter') {
      handleHeaderSave(columnId, newTitle);
    } else if (e.key === 'Escape') {
      setEditingHeader(null);
    }
  };
  
  // Handle column drag start
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    if (columnId === 'opportunity') return; // Don't allow dragging the opportunity column
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);
    
    // Create a drag preview
    const dragPreview = document.createElement('div');
    dragPreview.className = 'drop-placeholder';
    dragPreview.style.width = '100px';
    dragPreview.style.height = '30px';
    dragPreview.style.position = 'absolute';
    dragPreview.style.left = '-1000px';
    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 50, 15);
  };
  
  // Handle column drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  // Handle column drop for reordering
  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    
    if (!draggedColumn || !onColumnsReorder || draggedColumn === targetColumnId) {
      setDraggedColumn(null);
      return;
    }
    
    // Don't allow dropping onto the opportunity column
    if (targetColumnId === 'opportunity') {
      setDraggedColumn(null);
      return;
    }
    
    const draggedColumnIndex = columns.findIndex(col => col.id === draggedColumn);
    const targetColumnIndex = columns.findIndex(col => col.id === targetColumnId);
    
    if (draggedColumnIndex < 0 || targetColumnIndex < 0) {
      setDraggedColumn(null);
      return;
    }
    
    // Reorder columns
    const newColumns = [...columns];
    const [draggedCol] = newColumns.splice(draggedColumnIndex, 1);
    newColumns.splice(targetColumnIndex, 0, draggedCol);
    
    onColumnsReorder(newColumns.map(col => col.id));
    setDraggedColumn(null);
  };
  
  // Handle column resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string, initialWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setResizingColumn(columnId);
    setInitialX(e.clientX);
    setInitialWidth(initialWidth);
    
    // Add event listeners for mousemove and mouseup
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, []);
  
  // Handle column resize move with improved live updating
  const handleResizeMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    
    if (!resizingColumn) return;
    
    const diffX = e.clientX - initialX;
    const newWidth = Math.max(100, initialWidth + diffX); // Minimum width of 100px
    
    // Update column width during drag in real-time
    const columnIndex = columns.findIndex(col => col.id === resizingColumn);
    
    if (columnIndex >= 0 && onColumnResize) {
      onColumnResize(columnIndex + 1, newWidth);
    }
  }, [resizingColumn, initialX, initialWidth, columns, onColumnResize]);
  
  // Handle column resize end with explicit update to ensure persistence
  const handleResizeEnd = useCallback((e: MouseEvent) => {
    e.preventDefault();
    
    if (resizingColumn && onColumnResize) {
      const columnIndex = columns.findIndex(col => col.id === resizingColumn);
      if (columnIndex >= 0) {
        const diffX = e.clientX - initialX;
        const newWidth = Math.max(100, initialWidth + diffX);
        onColumnResize(columnIndex + 1, newWidth);
      }
    }
    
    setResizingColumn(null);
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [resizingColumn, onColumnResize, columns, initialX, initialWidth, handleResizeMove]);
  
  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  const handleAddColumnAfter = (columnId: string) => {
    if (onAddColumn) {
      onAddColumn(columnId);
    }
  };

  const handleDeleteColumn = (columnId: string) => {
    if (onDeleteColumn && columnId !== 'opportunity') {
      onDeleteColumn(columnId);
    }
  };

  return (
    <div className="grid-header">
      <div className="index-header">#</div>
      <div className="columns-header">
        {columns.map((column, index) => {
          // Fix for first column display name
          const displayTitle = column.id === 'opportunity' ? 'Opportunity' : column.title;
          
          return (
            <div
              key={column.id}
              className={`
                grid-header-cell 
                ${column.id === 'opportunity' ? 'grid-frozen-header' : ''} 
                ${draggedColumn === column.id ? 'dragging' : ''}
                ${column.type === 'currency' ? 'text-right' : ''}
              `}
              draggable={column.id !== 'opportunity'}
              onDragStart={(e) => handleDragStart(e, column.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              onDoubleClick={() => handleHeaderDoubleClick(column.id)}
              style={{ width: column.width }}
            >
              {editingHeader === column.id ? (
                <input
                  type="text"
                  className="header-edit-input"
                  defaultValue={displayTitle}
                  autoFocus
                  onBlur={(e) => handleHeaderSave(column.id, e.target.value)}
                  onKeyDown={(e) => handleHeaderKeyDown(e, column.id, (e.target as HTMLInputElement).value)}
                />
              ) : (
                <>
                  <span className="header-title">{displayTitle}</span>
                  <div className="header-cell-actions">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="header-cell-menu-button">
                        <MoreVertical size={14} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {column.id !== 'opportunity' && (
                          <>
                            <DropdownMenuItem onClick={() => handleHeaderDoubleClick(column.id)}>
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => {}}>
                          <ArrowUpDown size={14} className="mr-2" />
                          Sort
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {}}>
                          <Eye size={14} className="mr-2" />
                          Hide
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAddColumnAfter(column.id)}>
                          <Plus size={14} className="mr-2" />
                          Add Column After
                        </DropdownMenuItem>
                        {column.id !== 'opportunity' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteColumn(column.id)}
                              className="text-red-500"
                            >
                              <Trash2 size={14} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, column.id, column.width)}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
        <div 
          className="add-column-button"
          onClick={() => onAddColumn && onAddColumn(columns[columns.length - 1].id)}  
        >
          +
        </div>
      </div>
    </div>
  );
}
