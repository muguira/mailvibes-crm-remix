
import React, { useState } from 'react';
import { Column } from './types';
import { INDEX_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH } from './grid-constants';

interface GridHeaderProps {
  columns: Column[];
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void;
  onColumnsReorder?: (columnIds: string[]) => void;
}

export function GridHeader({ columns, onColumnChange, onColumnsReorder }: GridHeaderProps) {
  // State for column resizing
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [columnStartWidth, setColumnStartWidth] = useState(0);
  
  // State for column reordering
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  
  // State for header editing
  const [editingHeaderId, setEditingHeaderId] = useState<string | null>(null);
  
  // Handle start resize
  const handleResizeStart = (e: React.MouseEvent, columnId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumnId(columnId);
    setStartX(e.clientX);
    setColumnStartWidth(currentWidth);
    
    // Add document-level mouse move and up listeners
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  
  // Handle resize move
  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingColumnId) return;
    
    const diff = e.clientX - startX;
    const newWidth = Math.max(80, columnStartWidth + diff); // Minimum width: 80px
    
    if (onColumnChange) {
      onColumnChange(resizingColumnId, { width: newWidth });
    }
  };
  
  // Handle resize end
  const handleResizeEnd = () => {
    setResizingColumnId(null);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };
  
  // Handle column drag start
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggingColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
    // Use a transparent drag image
    const dragImage = document.createElement('div');
    dragImage.style.width = '1px';
    dragImage.style.height = '1px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };
  
  // Handle column drag over
  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggingColumnId === columnId) return;
  };
  
  // Handle column drop
  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggingColumnId || draggingColumnId === targetColumnId) return;
    
    // Prevent reordering of the first column if it's locked
    const draggingIndex = columns.findIndex(col => col.id === draggingColumnId);
    const targetIndex = columns.findIndex(col => col.id === targetColumnId);
    
    if (draggingIndex === 0 && columns[0].frozen) return;
    if (targetIndex === 0 && columns[0].frozen) return;
    
    const newColumnOrder = [...columns];
    const [draggedColumn] = newColumnOrder.splice(draggingIndex, 1);
    newColumnOrder.splice(targetIndex, 0, draggedColumn);
    
    if (onColumnsReorder) {
      onColumnsReorder(newColumnOrder.map(col => col.id));
    }
    
    setDraggingColumnId(null);
  };
  
  // Handle double click on header for renaming
  const handleHeaderDoubleClick = (columnId: string) => {
    // Don't allow renaming frozen columns
    const column = columns.find(col => col.id === columnId);
    if (column?.frozen) return;
    
    setEditingHeaderId(columnId);
  };
  
  // Handle header edit completion
  const handleHeaderEditComplete = (columnId: string, newTitle: string) => {
    if (onColumnChange && newTitle.trim()) {
      onColumnChange(columnId, { title: newTitle });
    }
    setEditingHeaderId(null);
  };
  
  // Handle add column button click
  const handleAddColumn = () => {
    // This would typically open a modal to configure the new column
    // For now, we'll just add a placeholder column
    if (onColumnChange) {
      const newColumnId = `column-${columns.length + 1}`;
      const newColumn: Column = {
        id: newColumnId,
        title: `New Column`,
        type: 'text',
        width: DEFAULT_COLUMN_WIDTH,
        editable: true
      };
      
      if (onColumnsReorder) {
        onColumnsReorder([...columns.map(c => c.id), newColumnId]);
      }
    }
  };

  return (
    <div className="grid-header">
      {/* Index Column Header */}
      <div 
        className="index-column grid-frozen-cell"
        style={{ width: INDEX_COLUMN_WIDTH }}
      >
        #
      </div>
      
      {/* Data Column Headers */}
      {columns.map((column, index) => (
        <div
          key={column.id}
          className={`grid-header-cell ${column.frozen ? 'grid-frozen-cell' : ''} ${draggingColumnId === column.id ? 'dragging' : ''}`}
          style={{ width: column.width }}
          draggable={!column.frozen}
          onDragStart={(e) => handleDragStart(e, column.id)}
          onDragOver={(e) => handleDragOver(e, column.id)}
          onDrop={(e) => handleDrop(e, column.id)}
          onDoubleClick={() => handleHeaderDoubleClick(column.id)}
        >
          {editingHeaderId === column.id ? (
            <input
              type="text"
              className="header-edit-input"
              defaultValue={column.title}
              autoFocus
              onBlur={(e) => handleHeaderEditComplete(column.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleHeaderEditComplete(column.id, e.currentTarget.value);
                } else if (e.key === 'Escape') {
                  setEditingHeaderId(null);
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="grid-header-cell-content">
              {column.title}
            </div>
          )}
          
          {/* Column resizer */}
          <div 
            className="grid-header-cell-resizer"
            onMouseDown={(e) => handleResizeStart(e, column.id, column.width)}
          />
        </div>
      ))}
      
      {/* Add Column Button */}
      <div 
        className="grid-header-cell" 
        style={{ width: 40, justifyContent: 'center' }}
      >
        <button 
          className="text-teal-primary hover:text-teal-dark"
          onClick={handleAddColumn}
        >
          +
        </button>
      </div>
    </div>
  );
}
