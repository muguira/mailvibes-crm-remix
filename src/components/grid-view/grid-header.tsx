
import React, { useState, useCallback, useEffect } from 'react';
import { Column } from './types';
import { MoreVertical, ArrowUpDown, Eye, Plus, Trash2 } from 'lucide-react';
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
  onAddColumn?: (afterColumnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
}

export function GridHeader({ 
  columns, 
  onColumnChange, 
  onColumnsReorder, 
  onAddColumn,
  onDeleteColumn
}: GridHeaderProps) {
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  
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
        {columns.map((column) => {
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
              style={{ 
                width: column.width,
                minWidth: column.width,
                maxWidth: column.width,
                boxSizing: 'border-box'
              }}
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
