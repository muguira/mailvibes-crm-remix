
import React from 'react';
import { Column } from './types';
import { INDEX_COLUMN_WIDTH } from './grid-constants';

interface GridHeaderProps {
  columns: Column[];
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void;
  onColumnsReorder?: (columnIds: string[]) => void;
}

export function GridHeader({ columns, onColumnChange, onColumnsReorder }: GridHeaderProps) {
  // State for column resizing
  const [resizingColumnId, setResizingColumnId] = React.useState<string | null>(null);
  const [startX, setStartX] = React.useState(0);
  const [columnStartWidth, setColumnStartWidth] = React.useState(0);
  
  // Handle start resize
  const handleResizeStart = (e: React.MouseEvent, columnId: string, currentWidth: number) => {
    e.preventDefault();
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
          className={`grid-header-cell ${column.frozen ? 'grid-frozen-cell' : ''}`}
          style={{ width: column.width }}
        >
          <div className="grid-header-cell-content">
            {column.title}
          </div>
          
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
        <button className="text-teal-primary hover:text-teal-dark">+</button>
      </div>
    </div>
  );
}
