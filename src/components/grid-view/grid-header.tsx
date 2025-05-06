import React, { useState, useEffect, useRef } from 'react';
import { Column } from './types';
import { MIN_COLUMN_WIDTH, INDEX_COLUMN_WIDTH } from './grid-constants';
import {
  MoreVertical,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  Filter,
  StretchHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSub,
  DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import { ContextMenu } from './ContextMenu';

interface GridHeaderProps {
  columns: Column[];
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void;
  onColumnsReorder?: (columnIds: string[]) => void;
  onAddColumn?: (afterColumnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onContextMenu?: (columnId: string | null, position?: { x: number, y: number }) => void;
  activeContextMenu?: string | null;
  columnWidths?: number[]; // Add columnWidths prop
  contextMenuPosition?: { x: number, y: number } | null;
  onCopy?: (columnId: string) => void;
  onPaste?: (columnId: string) => void;
  onSortAZ?: (columnId: string) => void;
  onSortZA?: (columnId: string) => void;
}

export function GridHeader({
  columns,
  onColumnChange,
  onColumnsReorder,
  onAddColumn,
  onDeleteColumn,
  onContextMenu,
  activeContextMenu,
  columnWidths = [], // Default to empty array
  contextMenuPosition,
  onCopy,
  onPaste,
  onSortAZ,
  onSortZA
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

  // Handle header editing
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

  // Handle column drop for reordering
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

  // Handler for more vertical menu click
  const handleMenuClick = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get the position for the context menu from the button
    const position = { x: e.clientX, y: e.clientY };

    if (onContextMenu) {
      onContextMenu(columnId, position);
    }
  };

  // Functions for column operations that get called from the new ContextMenu
  const handleCopyColumn = (columnId: string) => {
    console.log(`Copy column: ${columnId}`);
    if (onCopy) onCopy(columnId);
  };

  const handlePasteColumn = (columnId: string) => {
    console.log(`Paste into column: ${columnId}`);
    if (onPaste) onPaste(columnId);
  };

  const handleInsertColumnLeft = (columnId: string) => {
    console.log(`Insert column left of: ${columnId}`);
    const columnIndex = columns.findIndex(col => col.id === columnId);
    if (columnIndex > 0) {
      const prevColumnId = columns[columnIndex - 1].id;
      if (onAddColumn) onAddColumn(prevColumnId);
    } else {
      if (onAddColumn) onAddColumn(columnId);
    }
  };

  const handleInsertColumnRight = (columnId: string) => {
    console.log(`Insert column right of: ${columnId}`);
    if (onAddColumn) onAddColumn(columnId);
  };

  const handleDeleteColumnAction = (columnId: string) => {
    console.log(`Delete column: ${columnId}`);
    if (onDeleteColumn && columnId !== 'opportunity') onDeleteColumn(columnId);
  };

  const handleSortAZAction = (columnId: string) => {
    console.log(`Sort sheet A-Z by column: ${columnId}`);
    if (onSortAZ) onSortAZ(columnId);
  };

  const handleSortZAAction = (columnId: string) => {
    console.log(`Sort sheet Z-A by column: ${columnId}`);
    if (onSortZA) onSortZA(columnId);
  };

  // Get the width for a column
  const getColumnWidth = (index: number, column: Column) => {
    // Use columnWidths if provided (for alignment with grid cells)
    if (columnWidths && columnWidths.length > index + 1) {
      return columnWidths[index + 1]; // +1 to skip index column
    }
    return column.width || MIN_COLUMN_WIDTH;
  };

  // Render the grid header
  return (
    <div
      className="flex"
      style={{ height: '36px' }}
    >
      {columns.map((column, index) => {
        // Check if this is the opportunity column (should be frozen)
        const isFrozen = column.frozen || column.id === 'opportunity';
        const isActive = activeContextMenu === column.id;
        
        return (
          <div
            key={column.id}
            className={`
              grid-header-cell
              ${draggedColumn === column.id ? 'dragging' : ''}
              ${isActive ? 'highlight-column bg-[#D6EBFF]/25' : ''}
              ${isFrozen ? 'grid-frozen-header' : ''}
              group
            `}
            style={{ 
              width: `${columnWidths[index] || column.width}px`,
              ...(isFrozen ? { position: 'sticky', left: '48px', zIndex: 35 } : {})
            }}
            draggable={!isFrozen}
            onDragStart={(e) => handleDragStart(e, column.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
            onContextMenu={(e) => handleHeaderContextMenu(e, column.id)}
          >
            {editingHeader === column.id ? (
              <input
                className="header-edit-input"
                autoFocus
                defaultValue={column.title}
                onBlur={(e) => handleHeaderSave(column.id, e.target.value)}
                onKeyDown={(e) => handleHeaderKeyDown(e, column.id, e.currentTarget.value)}
              />
            ) : (
              <div className="flex w-full justify-between items-center">
                <span
                  className="header-title"
                  onDoubleClick={() => handleHeaderDoubleClick(column.id)}
                >
                  {column.title}
                </span>
                
                <div className="header-cell-actions">
                  <button 
                    className={`header-cell-menu-button opacity-0 group-hover:opacity-100 ${isActive ? 'opacity-100 ring-1 ring-gray-300' : ''}`} 
                    onClick={(e) => handleMenuClick(e, column.id)}
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Add column button */}
      <div
        className="add-column-button"
        onClick={() => {
          if (onAddColumn && columns.length > 0) {
            onAddColumn(columns[columns.length - 1].id);
          }
        }}
      >
        <Plus size={16} />
      </div>

      {/* Render Context Menu if active */}
      {activeContextMenu && contextMenuPosition && (
        <ContextMenu
          x={contextMenuPosition.x}
          y={contextMenuPosition.y}
          columnId={activeContextMenu}
          onClose={() => onContextMenu && onContextMenu(null)}
          onCopy={handleCopyColumn}
          onPaste={handlePasteColumn}
          onInsertLeft={handleInsertColumnLeft}
          onInsertRight={handleInsertColumnRight}
          onDelete={handleDeleteColumnAction}
          onSortAZ={handleSortAZAction}
          onSortZA={handleSortZAAction}
          isVisible={!!activeContextMenu}
        />
      )}
    </div>
  );
}
