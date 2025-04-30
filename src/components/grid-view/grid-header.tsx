
import React, { useState } from 'react';
import { Column } from './types';

interface GridHeaderProps {
  columns: Column[];
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void;
  onColumnsReorder?: (columnIds: string[]) => void;
  onColumnResize?: (columnIndex: number, newWidth: number) => void;
}

export function GridHeader({ columns, onColumnChange, onColumnsReorder, onColumnResize }: GridHeaderProps) {
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [initialX, setInitialX] = useState(0);
  const [initialWidth, setInitialWidth] = useState(0);
  
  // Handle column header edit (double click)
  const handleHeaderDoubleClick = (columnId: string) => {
    setEditingHeader(columnId);
  };
  
  // Save edited header title
  const handleHeaderSave = (columnId: string, newTitle: string) => {
    setEditingHeader(null);
    
    if (onColumnChange) {
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
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  // Handle column drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  // Handle column drop for reordering
  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    
    if (!draggedColumn || !onColumnsReorder || draggedColumn === targetColumnId) {
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
  const handleResizeStart = (e: React.MouseEvent, columnId: string, initialWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setResizingColumn(columnId);
    setInitialX(e.clientX);
    setInitialWidth(initialWidth);
    
    // Add event listeners for mousemove and mouseup
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  
  // Handle column resize move
  const handleResizeMove = (e: MouseEvent) => {
    e.preventDefault();
    
    if (!resizingColumn) return;
    
    const diffX = e.clientX - initialX;
    const newWidth = Math.max(100, initialWidth + diffX); // Minimum width of 100px
    
    // Update column width visually during drag
    const columnIndex = columns.findIndex(col => col.id === resizingColumn);
    
    if (columnIndex >= 0 && onColumnResize) {
      // Add 1 for the index column
      onColumnResize(columnIndex + 1, newWidth);
    }
  };
  
  // Handle column resize end
  const handleResizeEnd = (e: MouseEvent) => {
    e.preventDefault();
    
    setResizingColumn(null);
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  return (
    <div className="grid-header">
      <div className="index-header">
        #
      </div>
      <div className="columns-header">
        {columns.map((column, index) => (
          <div
            key={column.id}
            className={`
              grid-header-cell 
              ${column.frozen ? 'grid-frozen-header' : ''} 
              ${draggedColumn === column.id ? 'dragging' : ''}
              ${column.type === 'currency' ? 'text-right' : ''}
            `}
            draggable
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
                defaultValue={column.title}
                autoFocus
                onBlur={(e) => handleHeaderSave(column.id, e.target.value)}
                onKeyDown={(e) => handleHeaderKeyDown(e, column.id, (e.target as HTMLInputElement).value)}
              />
            ) : (
              <>
                <span className="header-title">{column.title}</span>
                <div
                  className="resize-handle"
                  onMouseDown={(e) => handleResizeStart(e, column.id, column.width)}
                />
              </>
            )}
          </div>
        ))}
        <div className="add-column-button">+</div>
      </div>
    </div>
  );
}
