
import React, { useState, useEffect, useRef } from 'react';
import { Column } from './types';
import { MIN_COLUMN_WIDTH } from './grid-constants';
import { MoreVertical } from 'lucide-react';
import { ColumnContextMenu } from './column-context-menu';

interface GridHeaderProps {
  columns: Column[];
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void;
  onColumnsReorder?: (columnIds: string[]) => void;
  onAddColumn?: (afterColumnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onContextMenu?: (columnId: string | null, position?: { x: number, y: number }) => void;
  activeContextMenu?: string | null;
}

export function GridHeader({
  columns,
  onColumnChange,
  onColumnsReorder,
  onAddColumn,
  onDeleteColumn,
  onContextMenu,
  activeContextMenu
}: GridHeaderProps) {
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<HTMLDivElement | null>(null);

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

  // Handle column drag start - improved with better drag preview
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    if (columnId === 'opportunity') return; // Don't allow dragging the opportunity column

    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);

    // Create a more visible drag preview
    const column = columns.find(col => col.id === columnId);
    if (!column) return;

    const dragPreview = document.createElement('div');
    dragPreview.className = 'drag-preview-column';
    dragPreview.textContent = column.title;
    dragPreview.style.position = 'absolute';
    dragPreview.style.top = '-1000px';
    dragPreview.style.backgroundColor = '#d4e6ff';
    dragPreview.style.border = '2px dashed #2684ff';
    dragPreview.style.padding = '8px 12px';
    dragPreview.style.borderRadius = '4px';
    dragPreview.style.width = `${column.width}px`;
    dragPreview.style.zIndex = '1000';
    dragPreview.style.opacity = '0.8';

    document.body.appendChild(dragPreview);
    setDragPreview(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 50, 15);
  };

  // Clean up drag preview when dragging ends
  useEffect(() => {
    const handleDragEnd = () => {
      if (dragPreview) {
        document.body.removeChild(dragPreview);
        setDragPreview(null);
      }
      setDraggedColumn(null);
    };

    window.addEventListener('dragend', handleDragEnd);
    return () => {
      window.removeEventListener('dragend', handleDragEnd);
      if (dragPreview) {
        try {
          document.body.removeChild(dragPreview);
        } catch (e) {
          // Preview may have been removed already
        }
      }
    };
  }, [dragPreview]);

  // Handle column drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle column drop for reordering - with improved visual feedback
  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();

    if (!draggedColumn || !onColumnsReorder || draggedColumn === targetColumnId) {
      setDraggedColumn(null);
      return;
    }

    // Don't allow dropping onto the opportunity column if it's first
    if (targetColumnId === 'opportunity' && columns[0].id === 'opportunity') {
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

  // Handler for the context menu - now with position
  const handleHeaderContextMenu = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();

    // Get the position for the context menu
    const position = { x: e.clientX, y: e.clientY };

    if (onContextMenu) {
      onContextMenu(columnId, position);
    }
  };

  // Clipboard operations
  const handleCopyColumn = (columnId: string) => {
    console.log(`Copy column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  const handlePasteColumn = (columnId: string) => {
    console.log(`Paste into column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  // Column operations
  const handleInsertColumnLeft = (columnId: string) => {
    console.log(`Insert column left of: ${columnId}`);
    const columnIndex = columns.findIndex(col => col.id === columnId);
    if (columnIndex > 0) {
      const prevColumnId = columns[columnIndex - 1].id;
      if (onAddColumn) onAddColumn(prevColumnId);
    } else {
      if (onAddColumn) onAddColumn(columnId);
    }
    if (onContextMenu) onContextMenu(null);
  };

  const handleInsertColumnRight = (columnId: string) => {
    console.log(`Insert column right of: ${columnId}`);
    if (onAddColumn) onAddColumn(columnId);
    if (onContextMenu) onContextMenu(null);
  };

  const handleDeleteColumnAction = (columnId: string) => {
    console.log(`Delete column: ${columnId}`);
    if (onDeleteColumn && columnId !== 'opportunity') onDeleteColumn(columnId);
    if (onContextMenu) onContextMenu(null);
  };

  // Sort operations
  const handleSortAZ = (columnId: string) => {
    console.log(`Sort sheet A-Z by column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  const handleSortZA = (columnId: string) => {
    console.log(`Sort sheet Z-A by column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  return (
    <div className="grid-header">
      <div className="index-header">#</div>
      <div className="columns-header">
        {columns.map((column, index) => {
          // Fix for first column display name
          const displayTitle = column.id === 'opportunity' ? 'Opportunity' : column.title;
          const isContextMenuOpen = activeContextMenu === column.id;

          return (
            <div
              key={column.id}
              className={`
                grid-header-cell 
                ${column.id === 'opportunity' ? 'grid-frozen-header' : ''} 
                ${draggedColumn === column.id ? 'dragging' : ''}
                ${column.type === 'currency' ? 'text-right' : ''}
                ${isContextMenuOpen ? 'highlight-column' : ''}
              `}
              draggable={column.id !== 'opportunity'}
              onDragStart={(e) => handleDragStart(e, column.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              onDoubleClick={() => handleHeaderDoubleClick(column.id)}
              onContextMenu={(e) => handleHeaderContextMenu(e, column.id)}
              style={{ width: column.width || MIN_COLUMN_WIDTH }}
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
                    <ColumnContextMenu
                      columnId={column.id}
                      isOpportunity={column.id === 'opportunity'}
                      trigger={<button className="header-cell-menu-button"><MoreVertical size={14} /></button>}
                      onCopyColumn={handleCopyColumn}
                      onPasteColumn={handlePasteColumn}
                      onInsertColumnLeft={handleInsertColumnLeft}
                      onInsertColumnRight={handleInsertColumnRight}
                      onDeleteColumn={handleDeleteColumnAction}
                      onSortAZ={handleSortAZ}
                      onSortZA={handleSortZA}
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

// Export this function to be used by the grid cell component too
export const useColumnContextMenu = () => {
  return {
    openColumnContextMenu: (
      columnId: string, 
      position: { x: number, y: number },
      callbacks: {
        onCopyColumn?: (columnId: string) => void,
        onPasteColumn?: (columnId: string) => void,
        onInsertColumnLeft?: (columnId: string) => void,
        onInsertColumnRight?: (columnId: string) => void,
        onDeleteColumn?: (columnId: string) => void,
        onSortAZ?: (columnId: string) => void,
        onSortZA?: (columnId: string) => void,
      }
    ) => {
      // This function can be expanded with more functionality if needed
      console.log(`Opening context menu for column ${columnId} at position ${position.x},${position.y}`);
      return { columnId, position };
    }
  };
};
