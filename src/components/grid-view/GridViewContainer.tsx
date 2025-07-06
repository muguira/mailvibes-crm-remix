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
import { DeleteContactsDialog } from './DeleteContactsDialog';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, Mail } from 'lucide-react';

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
  onDeleteContacts,
  isContactDeletionLoading,
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

  // Row selection state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Add navigate hook
  const navigate = useNavigate();

  // Listen for immediate delete feedback to close dialog quickly
  useEffect(() => {
    const handleImmediateDelete = (event: CustomEvent) => {
      console.log(`⚡ [DELETE UI] Closing dialog immediately after ${event.detail.timing?.toFixed(2) || 'unknown'}ms`);
      setShowDeleteDialog(false);
      // Clear selection immediately for better UX
      setSelectedRowIds(new Set());
    };

    document.addEventListener('contacts-deleted-immediate', handleImmediateDelete as EventListener);
    
    return () => {
      document.removeEventListener('contacts-deleted-immediate', handleImmediateDelete as EventListener);
    };
  }, []);

  // Toggle row selection
  const handleToggleRowSelection = useCallback((rowId: string) => {
    setSelectedRowIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  // Select all rows on current page
  const handleSelectAllRows = useCallback((select: boolean) => {
    if (select) {
      // Select all rows in the current data set
      const rowsToSelect = data.map(row => row.id);
      setSelectedRowIds(new Set(rowsToSelect));
    } else {
      // Clear selection
      setSelectedRowIds(new Set());
    }
  }, [data]);

  // Handle contact deletion
  const handleConfirmDelete = useCallback(() => {
    if (onDeleteContacts && selectedRowIds.size > 0) {
      onDeleteContacts(Array.from(selectedRowIds))
        .then(() => {
          toast({
            title: `${selectedRowIds.size} contact${selectedRowIds.size !== 1 ? 's' : ''} deleted`,
            description: "The contacts have been successfully deleted.",
          });
          setSelectedRowIds(new Set());
        })
        .catch((error) => {
          toast({
            title: "Failed to delete contacts",
            description: error.message || "An error occurred while deleting contacts.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setShowDeleteDialog(false);
        });
    }
  }, [onDeleteContacts, selectedRowIds]);

  // Estado para columnas fijas (frozen)
  const [frozenColumnIds, setFrozenColumnIds] = useState<string[]>(() => {
    const key = `frozenColumnIds-${listId || 'default'}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        // Get stored columns but ensure index and name are always included
        const storedColumns = JSON.parse(stored);
        if (!storedColumns.includes('index')) storedColumns.unshift('index');
        if (!storedColumns.includes('name')) storedColumns.push('name');
        return storedColumns;
      }
    } catch (error) {
      logger.error('Error parsing frozen column IDs:', error);
    }
    // Default: index and name columns are always pinned
    return ['index', 'name'];
  });

  // Guardar en localStorage cuando cambian
  useEffect(() => {
    const key = `frozenColumnIds-${listId || 'default'}`;
    localStorage.setItem(key, JSON.stringify(frozenColumnIds));
  }, [frozenColumnIds, listId]);

  // Callback para fijar/desfijar columnas
  const toggleFrozenColumn = (columnId: string) => {
    // Don't allow unpinning index or name columns
    if (columnId === 'index' || columnId === 'name') {
      return;
    }
    
    setFrozenColumnIds(prev => {
      const isMobile = window.innerWidth < 768;
      // Always keep index and name columns, plus allow 2 more on mobile or unlimited on desktop
      const maxFrozenColumns = isMobile ? 4 : Infinity; // Increased to 4 to account for index and name always being pinned

      if (prev.includes(columnId)) {
        // Unfreezing a column
        return prev.filter(id => id !== columnId);
      } else {
        // Freezing a column
        // Count non-required columns (not index or name)
        const nonRequiredFrozenColumns = prev.filter(id => id !== 'index' && id !== 'name');

        if (isMobile && nonRequiredFrozenColumns.length >= (maxFrozenColumns - 2)) {
          // Show toast with shorter duration and better styling
          toast({
            title: "Column limit reached",
            description: "You can pin up to 2 additional columns on mobile.",
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
  const contactColumn = columns.find(col => col.id === 'name') ||
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
        selectedRowIds={selectedRowIds}
        data={data}
        onDeleteSelectedContacts={() => {
          if (selectedRowIds.size > 0 && onDeleteContacts) {
            // Open delete confirmation dialog
            setShowDeleteDialog(true);
          }
        }}
        isContactDeletionLoading={isContactDeletionLoading}
      />

      {/* Delete Contacts Dialog */}
      <DeleteContactsDialog
        isOpen={showDeleteDialog}
        contactCount={selectedRowIds.size}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isContactDeletionLoading}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No contacts yet</h3>
            <p className="text-sm text-gray-500 text-center max-w-sm mb-6">
              Add your first contact to get started. You can add contacts manually or import them from a CSV file or Gmail.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/import')}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import from CSV
              </Button>
              <Button
                onClick={() => navigate('/gmail-import')}
                className="flex items-center gap-2 bg-[#62BFAA] hover:bg-[#52AF9A] text-white"
              >
                <Mail className="w-4 h-4" />
                Import from Gmail
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Static columns (index + frozen columns) */}
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
              selectedRowIds={selectedRowIds}
              onToggleRowSelection={handleToggleRowSelection}
              onSelectAllRows={handleSelectAllRows}
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
              selectedRowIds={selectedRowIds}
            />
          </>
        )}
      </div>
    </div>
  );
} 