import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Column, GridRow, GridContainerProps, EditingCell } from './types';
import { GridToolbar } from './grid-toolbar';
import { StaticColumns } from './StaticColumns';
import { MainGridView } from './MainGridView';
import { INDEX_COLUMN_WIDTH } from './grid-constants';
import { toast } from '@/hooks/use-toast';
import './styles.css';
import { logger } from '@/utils/logger';
import { LoadingOverlay } from '@/components/ui/loading-spinner';

export function GridViewContainer({
  columns,
  data,
  listName = '',
  listId = '',
  listType = '',
  firstRowIndex = 0,
  searchTerm: externalSearchTerm,
  onSearchChange: externalSearchChange,
  activeFilters: externalActiveFilters,
  onApplyFilters: externalOnApplyFilters,
  onCellChange,
  onColumnChange,
  onColumnsReorder,
  onDeleteColumn,
  onAddColumn,
  onInsertColumn,
  onHideColumn,
  onUnhideColumn,
  hiddenColumns = [],
  className,
  columnOperationLoading,
  cellUpdateLoading
}: GridContainerProps) {
  // Container references for sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const mainGridRef = useRef<any>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Search state - local or external
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : localSearchTerm;

  // Sync scroll positions between components
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Filter state - use external if provided, otherwise local
  const [localActiveFilters, setLocalActiveFilters] = useState<{ columns: string[], values: Record<string, unknown> }>({ columns: [], values: {} });
  const activeFilters = externalActiveFilters !== undefined ? externalActiveFilters : localActiveFilters;

  // Context menu state
  const [contextMenuColumn, setContextMenuColumn] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);

  // Estado para edición de celdas (global)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  // Estado para columnas fijas (frozen)
  const [frozenColumnIds, setFrozenColumnIds] = useState<string[]>(() => {
    const key = `frozenColumnIds-${listId || 'default'}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (error) {
      logger.error('Error parsing frozen column IDs:', error);
    }
    // Por defecto, solo el índice está fijo
    return ['index'];
  });

  // Guardar en localStorage cuando cambian
  useEffect(() => {
    const key = `frozenColumnIds-${listId || 'default'}`;
    localStorage.setItem(key, JSON.stringify(frozenColumnIds));
  }, [frozenColumnIds, listId]);

  // Callback para fijar/desfijar columnas
  const toggleFrozenColumn = (columnId: string) => {
    setFrozenColumnIds(prev => {
      const isMobile = window.innerWidth < 768;
      const maxFrozenColumns = isMobile ? 2 : Infinity; // Limit to 2 on mobile (excluding index)

      if (prev.includes(columnId)) {
        // Unfreezing a column
        return prev.filter(id => id !== columnId);
      } else {
        // Freezing a column
        // On mobile, exclude the 'index' column from the count - index doesn't count toward limit
        const nonIndexFrozenColumns = prev.filter(id => id !== 'index');

        if (isMobile && nonIndexFrozenColumns.length >= maxFrozenColumns) {
          // Show toast with shorter duration and better styling
          toast({
            title: "Column limit reached",
            description: "You can pin up to 2 columns on mobile.",
            variant: "destructive",
            duration: 2000, // 2 seconds instead of default 5
          });
          return prev;
        }
        return [...prev, columnId];
      }
    });
  };

  // Separar columnas fijas y scrollables manteniendo el orden original
  const frozenColumns = columns.filter(col => frozenColumnIds.includes(col.id));
  const scrollableColumns = columns.filter(col => !frozenColumnIds.includes(col.id));

  // Find the frozen column - first look for 'name', then fall back to 'opportunity' for backward compatibility
  const contactColumn = columns.find(col => col.id === 'name' && col.frozen) ||
    columns.find(col => col.id === 'opportunity');

  // Width calculation for the static columns area
  const staticColumnsWidth = INDEX_COLUMN_WIDTH + (contactColumn?.width || 0);

  // Resize observer for container
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerWidth(width);
      setContainerHeight(height);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Handle search change
  const handleSearchChange = (term: string) => {
    if (externalSearchChange) {
      externalSearchChange(term);
    } else {
      setLocalSearchTerm(term);
    }
  };

  // Handle filter changes
  const handleApplyFilters = (filters: { columns: string[], values: Record<string, unknown> }) => {
    logger.log("Applying filters:", filters);
    if (externalOnApplyFilters) {
      externalOnApplyFilters(filters);
    } else {
      setLocalActiveFilters(filters);
    }
  };

  // Open context menu for columns
  const handleOpenContextMenu = (columnId: string | null, position?: { x: number, y: number }) => {
    setContextMenuColumn(columnId);
    if (position) {
      setContextMenuPosition(position);
    } else {
      setContextMenuPosition(null);
    }
  };

  // Handle columns reordering - ensure frozen column remains unchanged
  const handleColumnsReorder = useCallback((newColumnIds: string[]) => {
    if (onColumnsReorder) {
      // Make sure contact column stays in the correct position
      const contactColumnIndex = columns.findIndex(col => (col.id === 'name' && col.frozen) || col.id === 'opportunity');
      const newColumns = newColumnIds
        .filter(id => id !== 'name' && id !== 'opportunity') // Remove contact/opportunity if it's in the list
        .map(id => columns.find(col => col.id === id)!); // Map to full column objects

      // Re-insert contact at its original position if needed
      if (contactColumnIndex >= 0 && contactColumn) {
        // Only re-insert if it was in the original columns array
        newColumns.splice(contactColumnIndex, 0, contactColumn);
      }

      // Call the parent handler with the updated order
      onColumnsReorder(newColumns.map(col => col.id));
    }
  }, [onColumnsReorder, columns, contactColumn]);

  // Memoized callback for MainGridView onColumnsReorder
  const handleMainGridColumnsReorder = useCallback((columns: Column[]) => {
    handleColumnsReorder(columns.map(col => col.id));
  }, [handleColumnsReorder]);

  // Memoized callback for MainGridView onAddColumn
  const handleMainGridAddColumn = useCallback(() => {
    onAddColumn(contextMenuColumn ?? '');
  }, [onAddColumn, contextMenuColumn]);

  // Handle scroll synchronization
  const handleScroll = ({ scrollTop: newScrollTop, scrollLeft: newScrollLeft }: { scrollTop: number, scrollLeft: number }) => {
    setScrollTop(newScrollTop);
    setScrollLeft(newScrollLeft);
  };

  return (
    <div className="grid-view" ref={containerRef}>
      <GridToolbar
        listType={listType}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        filterCount={activeFilters.columns.length}
        columns={columns}
        onApplyFilters={handleApplyFilters}
        activeFilters={activeFilters}
        hiddenColumns={hiddenColumns}
        onUnhideColumn={onUnhideColumn}
        frozenColumnIds={frozenColumnIds}
        onTogglePin={toggleFrozenColumn}
      />

      <div className="grid-components-container relative">
        {/* Loading overlay for column operations */}
        <LoadingOverlay
          show={columnOperationLoading?.type !== null && columnOperationLoading?.type !== undefined}
          message={
            columnOperationLoading?.type === 'add' ? 'Adding column...' :
            columnOperationLoading?.type === 'delete' ? 'Deleting column...' :
            columnOperationLoading?.type === 'rename' ? 'Renaming column...' :
            columnOperationLoading?.type === 'hide' ? 'Hiding column...' :
            columnOperationLoading?.type === 'unhide' ? 'Showing column...' :
            'Processing...'
          }
        />
        
        {data.length === 0 ? (
          // Empty state message when there are no contacts
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] w-full">
            <div className="rounded-full bg-gray-100 p-6 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#32BAB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2">No contacts yet</h2>
            <p className="text-gray-500 text-center max-w-md mb-6">Let's add a contact as our first step to more customers.</p>
            <button
              className="bg-[#32BAB0] hover:bg-[#28a79d] text-white rounded-md px-6 py-2 flex items-center gap-2"
              onClick={() => {
                // Find the main Add Contact button in the header and click it
                const addContactButton = document.querySelector('.grid-toolbar button.bg-\\[\\#32BAB0\\]') as HTMLButtonElement;
                if (addContactButton) {
                  addContactButton.click();
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Contact
            </button>
          </div>
        ) : (
          <>
            {/* Left static columns (index + contact/opportunity) */}
            <StaticColumns
              data={data}
              frozenColumns={frozenColumns}
              scrollTop={scrollTop}
              firstRowIndex={firstRowIndex}
              onCellChange={onCellChange}
              onContextMenu={handleOpenContextMenu}
              onTogglePin={toggleFrozenColumn}
              frozenColumnIds={frozenColumnIds}
              editingCell={editingCell}
              setEditingCell={setEditingCell}
            />

            {/* Main data grid - adjust width to account for static columns */}
            <MainGridView
              ref={mainGridRef}
              columns={scrollableColumns}
              data={data}
              scrollTop={scrollTop}
              scrollLeft={scrollLeft}
              containerWidth={(containerWidth - frozenColumns.reduce((w, c) => w + (c.width || 180), 0)) || 300}
              containerHeight={containerHeight}
              onScroll={handleScroll}
              onCellChange={onCellChange}
              onColumnChange={onColumnChange}
              onColumnsReorder={handleMainGridColumnsReorder}
              onAddColumn={handleMainGridAddColumn}
              onDeleteColumn={onDeleteColumn}
              onContextMenu={handleOpenContextMenu}
              contextMenuColumn={contextMenuColumn}
              contextMenuPosition={contextMenuPosition}
              onTogglePin={toggleFrozenColumn}
              frozenColumnIds={frozenColumnIds}
              editingCell={editingCell}
              setEditingCell={setEditingCell}
              onInsertColumn={onInsertColumn}
              allColumns={columns}
              onHideColumn={onHideColumn}
              cellUpdateLoading={cellUpdateLoading}
            />
          </>
        )}
      </div>
    </div>
  );
} 