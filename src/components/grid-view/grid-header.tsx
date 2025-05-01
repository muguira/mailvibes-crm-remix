import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Column } from './types';
import { MIN_COLUMN_WIDTH } from './grid-constants';
import {
  MoreVertical,
  ArrowUpDown,
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

interface GridHeaderProps {
  columns: Column[];
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void;
  onColumnsReorder?: (columnIds: string[]) => void;
  onColumnResize?: (columnIndex: number, newWidth: number) => void;
  onAddColumn?: (afterColumnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onContextMenu?: (columnId: string | null, position?: { x: number, y: number }) => void;
  activeContextMenu?: string | null;
}

export function GridHeader({
  columns,
  onColumnChange,
  onColumnsReorder,
  onColumnResize,
  onAddColumn,
  onDeleteColumn,
  onContextMenu,
  activeContextMenu
}: GridHeaderProps) {
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [initialX, setInitialX] = useState(0);
  const [initialWidth, setInitialWidth] = useState(0);
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

  // Handle column resize start with improved live update
  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string, initialWidth: number) => {
    e.preventDefault();
    e.stopPropagation();

    setResizingColumn(columnId);
    setInitialX(e.clientX);
    setInitialWidth(initialWidth);

    const handleResizeMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();

      if (resizingColumn === null) return;

      const diffX = moveEvent.clientX - initialX;
      const newWidth = Math.max(100, initialWidth + diffX); // Minimum width of 100px

      // Update column width during drag in real-time
      const columnIndex = columns.findIndex(col => col.id === columnId);

      if (columnIndex >= 0 && onColumnResize) {
        onColumnResize(columnIndex, newWidth);
      }
    };

    const handleResizeEnd = (upEvent: MouseEvent) => {
      upEvent.preventDefault();

      // Final update to ensure persistence
      if (onColumnResize) {
        const columnIndex = columns.findIndex(col => col.id === columnId);
        if (columnIndex >= 0) {
          const diffX = upEvent.clientX - initialX;
          const newWidth = Math.max(100, initialWidth + diffX);
          onColumnResize(columnIndex, newWidth);
        }
      }

      setResizingColumn(null);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };

    // Add event listeners for mousemove and mouseup
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [columns, onColumnResize, initialX, initialWidth, resizingColumn]);

  // Handler for the context menu - now with position
  const handleHeaderContextMenu = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();

    // Get the position for the context menu
    const position = { x: e.clientX, y: e.clientY };

    if (onContextMenu) {
      onContextMenu(columnId, position);
    }
  };

  // Clipboard operations stubs
  const handleCutColumn = (columnId: string) => {
    console.log(`Cut column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  const handleCopyColumn = (columnId: string) => {
    console.log(`Copy column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  const handlePasteColumn = (columnId: string) => {
    console.log(`Paste into column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  const handlePasteSpecial = (columnId: string, type: string) => {
    console.log(`Paste special (${type}) into column: ${columnId}`);
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

  const handleClearColumn = (columnId: string) => {
    console.log(`Clear column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  const handleHideColumn = (columnId: string) => {
    console.log(`Hide column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  const handleResizeColumnAction = (columnId: string) => {
    console.log(`Resize column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  // Sort and filter
  const handleCreateFilter = (columnId: string) => {
    console.log(`Create filter for column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

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

          // Render dropdown menu for column options
          const renderColumnMenu = (columnId: string) => (
            <DropdownMenu>
              <DropdownMenuTrigger className="header-cell-menu-button">
                <MoreVertical size={14} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleCutColumn(columnId)}>
                  <Scissors size={14} className="mr-2" />
                  Cut
                  <span className="ml-auto text-xs text-muted-foreground">⌘X</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => handleCopyColumn(columnId)}>
                  <Copy size={14} className="mr-2" />
                  Copy
                  <span className="ml-auto text-xs text-muted-foreground">⌘C</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => handlePasteColumn(columnId)}>
                  <Clipboard size={14} className="mr-2" />
                  Paste
                  <span className="ml-auto text-xs text-muted-foreground">⌘V</span>
                </DropdownMenuItem>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Clipboard size={14} className="mr-2" />
                    Paste special
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handlePasteSpecial(columnId, 'values')}>
                        Values only
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePasteSpecial(columnId, 'format')}>
                        Format only
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => handleInsertColumnLeft(columnId)}>
                  <Plus size={14} className="mr-2" />
                  Insert column left
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => handleInsertColumnRight(columnId)}>
                  <Plus size={14} className="mr-2" />
                  Insert column right
                </DropdownMenuItem>

                {columnId !== 'opportunity' && (
                  <DropdownMenuItem onClick={() => handleDeleteColumnAction(columnId)}>
                    <Trash2 size={14} className="mr-2" />
                    Delete column
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={() => handleClearColumn(columnId)}>
                  <span className="mr-2">×</span>
                  Clear column
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => handleHideColumn(columnId)}>
                  <EyeOff size={14} className="mr-2" />
                  Hide column
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => handleResizeColumnAction(columnId)}>
                  <StretchHorizontal size={14} className="mr-2" />
                  Resize column
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => handleCreateFilter(columnId)}>
                  <Filter size={14} className="mr-2" />
                  Create a filter
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => handleSortAZ(columnId)}>
                  <span className="mr-2">A→Z</span>
                  Sort sheet A to Z
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => handleSortZA(columnId)}>
                  <span className="mr-2">Z→A</span>
                  Sort sheet Z to A
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );

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
                    {renderColumnMenu(column.id)}
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
