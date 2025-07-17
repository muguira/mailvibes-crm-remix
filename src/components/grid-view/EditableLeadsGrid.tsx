import { useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';
import { useStore } from '@/stores';
import { GridViewContainer } from '@/components/grid-view/GridViewContainer';
import { Column } from '@/components/grid-view/types';
import { GridSkeleton } from '@/components/grid-view/GridSkeleton';
import { GridPagination } from './GridPagination';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth';
import { useLeadsRows } from '@/hooks/supabase/use-leads-rows';
import { useInstantContacts } from '@/hooks/use-instant-contacts';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from '@/components/ui/use-toast';
import { useActivity } from "@/contexts/ActivityContext";
import { DeleteColumnDialog } from '@/components/grid-view/DeleteColumnDialog';
import { Progress } from '@/components/ui/progress';
import { syncContact } from '@/helpers/grid';
import { 
  useEditableGridInitialization,
  useGridExternalEvents,
  useGridResize
} from '@/hooks/grid-view';
import { useFilterCacheInvalidation } from '@/hooks/supabase/use-filter-cache-invalidation';
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';

/**
 * EditableLeadsGrid Component
 * 
 * A comprehensive grid component for managing leads and contacts with advanced features.
 * Provides real-time search, filtering, column management, pagination, and contact operations.
 * State is managed through Zustand slice with persistence to localStorage and Supabase.
 * 
 * @component
 * @returns {JSX.Element} The fully-featured editable leads grid
 * 
 * @example
 * ```tsx
 * <EditableLeadsGrid />
 * ```
 * 
 * @features
 * - Real-time search and filtering with debounced input
 * - Column management (add, delete, hide, reorder, resize)
 * - Pagination with instant loading and background sync
 * - Contact operations (edit cells, delete contacts)
 * - Activity logging for all user actions
 * - Persistence to localStorage and Supabase database
 * - Mobile-responsive design with touch support
 * - Virtual scrolling for large datasets
 */
export function EditableLeadsGrid() {
  const { user } = useAuth();
  const { logCellEdit, logColumnAdd, logColumnDelete, logFilterChange } = useActivity();
  
  // Performance monitoring for optimization tracking
  const { logSummary, renderCount } = usePerformanceMonitor('EditableLeadsGrid');
  
  /**
   * Destructure Zustand slice state and actions
   * All grid state is centrally managed through the editableLeadsGrid slice
   */
  const {
    searchTerm,
    activeFilters,
    currentPage,
    pageSize,
    columns,
    forceRenderKey,
    deletedColumnIds,
    deleteColumnDialog,
    editableLeadsGridSetCurrentPage,
    editableLeadsGridForceRerender,
    editableLeadsGridSetIsContactDeletionLoading,
    editableLeadsGridAddDynamicColumns,
    editableLeadsGridPersistColumns,
    editableLeadsGridDeleteColumn,
    editableLeadsGridConfirmDeleteColumn,
    editableLeadsGridAddColumn,
    editableLeadsGridInsertColumn,
    editableLeadsGridHideColumn,
    editableLeadsGridUnhideColumn,
    editableLeadsGridHandleCellEdit,
    editableLeadsGridDeleteContacts,
    editableLeadsGridHandleResize,
    editableLeadsGridGetColumnFilters,
  } = useStore();
  
  /**
   * Alias for contact deletion loading state setter
   * Provides cleaner API for setting loading state during contact operations
   */
  const setIsContactDeletionLoading = editableLeadsGridSetIsContactDeletionLoading;

  /**
   * Persist columns to database and localStorage
   * OPTIMIZED: Use user?.id instead of user object to prevent unnecessary re-renders
   * 
   * @param {Column[]} newColumns - Array of column definitions to persist
   * @returns {Promise<void>} Promise that resolves when persistence is complete
   */
  const persistColumns = useCallback(async (newColumns: Column[]) => {
    await editableLeadsGridPersistColumns(newColumns, user);
  }, [user?.id, editableLeadsGridPersistColumns]);

  /**
   * Render function for contact name column with navigation link
   * OPTIMIZED: Memoized to prevent recreation on every render
   * 
   * @param {any} value - The contact name value
   * @param {any} row - The full contact row data
   * @returns {JSX.Element} Link element to contact stream view
   */
  const renderNameLink = useMemo(() => 
    (value: any, row: any) => (
      <Link to={`/stream-view/${row.id}`} className="text-primary hover:underline">
        {value}
      </Link>
    ), []
  );

  /**
   * Initialize grid component using custom hook
   * Handles loading stored columns, hidden columns, and setting up render functions
   */
  const { isInitialized, initializationError } = useEditableGridInitialization(user, renderNameLink);

  /**
   * Setup automatic filter cache invalidation when columns change
   */
  useFilterCacheInvalidation();

  /**
   * Persist deleted column IDs to localStorage
   * Ensures deleted columns remain hidden across browser sessions
   * 
   * @effect
   */
  useEffect(() => {
    localStorage.setItem('deletedColumnIds', JSON.stringify(Array.from(deletedColumnIds)));
  }, [deletedColumnIds]);
  
  /**
   * Debounced search term for performance optimization
   * Prevents excessive API calls while user is typing
   */
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  
  /**
   * Convert active filters to column filter format
   * Transforms filter state into format expected by useInstantContacts hook
   */
  const columnFilters = useMemo(() => {
    return editableLeadsGridGetColumnFilters();
  }, [activeFilters, columns, editableLeadsGridGetColumnFilters]);

  /**
   * Instant contacts hook for real-time data loading
   * Provides paginated contact data with background loading and search/filter support
   */
  const {
    rows,
    loading,
    totalCount,
    isBackgroundLoading,
    loadedCount
  } = useInstantContacts({
    searchTerm: debouncedSearchTerm,
    pageSize,
    currentPage,
    columnFilters,
  });
  
  /**
   * Leads rows hook for mutation operations
   * Provides functions for updating cells, deleting contacts, and bulk column operations
   */
  const { 
    updateCell,
    bulkDeleteColumnData, // 🆕 New function for efficient column deletion
    deleteContacts,
    refreshData
  } = useLeadsRows();

  /**
   * Calculate total pages based on filtered results
   * Determines pagination controls based on current filter state
   */
  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize), [totalCount, pageSize]);
  
  /**
   * Stable grid key to prevent unnecessary re-renders
   * Changes only when force re-render is triggered
   */
  const gridKey = useMemo(() => `grid-stable-${forceRenderKey}`, [forceRenderKey]);

  
  /**
   * Handle contact deletion with loading state management
   * OPTIMIZED: Better dependency management for improved performance
   * Combines slice state management with hook-based database operations
   * 
   * @param {string[]} contactIds - Array of contact IDs to delete
   * @returns {Promise<void>} Promise that resolves when deletion is complete
   */
  const handleDeleteContacts = useCallback(async (contactIds: string[]) => {
    setIsContactDeletionLoading(true);
    
    try {
      await editableLeadsGridDeleteContacts(contactIds);
      
      const { lastContactDeletion } = useStore.getState();
      if (!lastContactDeletion || lastContactDeletion.status === 'error') {
        throw new Error('Contact deletion preparation failed');
      }
      
      await deleteContacts(contactIds);
      
      useStore.setState(state => ({
        lastContactDeletion: {
          ...state.lastContactDeletion!,
          status: 'success' as const
        }
      }));
      
      toast({
        title: "Contacts deleted",
        description: `Successfully deleted ${contactIds.length} contact${contactIds.length === 1 ? '' : 's'}.`,
      });
      
      editableLeadsGridForceRerender();
      
    } catch (error) {
      console.error('Error deleting contacts:', error);
      
      useStore.setState(state => ({
        lastContactDeletion: state.lastContactDeletion ? {
          ...state.lastContactDeletion,
          status: 'error' as const
        } : null
      }));
      
      toast({
        title: "Error",
        description: "Failed to delete contacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsContactDeletionLoading(false);
    }
  }, [deleteContacts, editableLeadsGridDeleteContacts, editableLeadsGridForceRerender]);

  /**
   * Add dynamic columns when new fields are detected in contact data
   * Automatically creates columns for previously unseen contact properties
   * 
   * @effect
   */
  useEffect(() => {
    if (rows.length > 0) {
      editableLeadsGridAddDynamicColumns(rows);
    }
  }, [rows, editableLeadsGridAddDynamicColumns]);

  /**
   * Sync contacts with global state for stream view compatibility
   * Ensures contact data is available in mockContactsById for other components
   * 
   * @effect
   */
  useEffect(() => {
    if (rows && rows.length > 0) {
      rows.forEach(row => {
        syncContact(row);
      });
    }
  }, [rows]);

  /**
   * Handle individual cell value changes
   * OPTIMIZED: Better dependency management and memoization for improved performance
   * Processes cell edits through slice then updates database
   * 
   * @param {string} rowId - The ID of the contact row being edited
   * @param {string} columnId - The ID of the column being edited
   * @param {any} value - The new value for the cell
   * @returns {Promise<void>} Promise that resolves when edit is complete
   */
  const handleCellChange = useCallback(async (rowId: string, columnId: string, value: any) => {
    console.log('EditableLeadsGrid handleCellChange called:', {
      rowId,
      columnId,
      value,
      timestamp: new Date().toISOString()
    });
    
    try {
      await editableLeadsGridHandleCellEdit(rowId, columnId, value);
      
      const { lastCellEdit } = useStore.getState();
      if (!lastCellEdit || lastCellEdit.rowId !== rowId || lastCellEdit.columnId !== columnId) {
        throw new Error('Cell edit processing failed');
      }
      
      const { finalValue } = lastCellEdit;
      
      const row = rows.find(r => r.id === rowId);
      const oldValue = row ? row[columnId] : null;

      console.log('Row found for handleCellChange:', {
        rowId,
        rowFound: !!row,
        rowName: row?.name,
        oldValue,
        newValue: finalValue,
        columnId
      });

      await updateCell({ rowId, columnId, value: finalValue });

      logCellEdit(
        rowId,
        columnId,
        finalValue, 
        oldValue
      );

    } catch (error) {
      console.error('Error updating cell:', error);
      toast({
        title: "Error",
        description: "Failed to update cell. Please try again.",
        variant: "destructive",
      });
    }
  }, [rows, updateCell, logCellEdit, editableLeadsGridHandleCellEdit]);

  // Log performance summary periodically for monitoring
  useEffect(() => {
    if (renderCount > 0 && renderCount % 20 === 0) {
      logSummary();
    }
  }, [renderCount, logSummary]);

  /**
   * Handle column deletion with different logic for default vs custom columns
   * Default columns require user confirmation, custom columns are deleted immediately
   * 
   * @param {string} columnId - The ID of the column to delete
   * @returns {Promise<void>} Promise that resolves when deletion process is complete
   */
  const handleDeleteColumn = useCallback(async (columnId: string) => {
    const defaultColumnIds = [
      'name',
      'email', 
      'company',
      'phone',
      'status',
      'owner',
      'revenue',
      'source',
      'created_at',
      'updated_at',
    ];

    if (defaultColumnIds.includes(columnId)) {
      await editableLeadsGridDeleteColumn(columnId);
    } else {
      console.log('🚀 Handling custom column deletion with persistence:', columnId);
      
      const column = columns.find(col => col.id === columnId);
      if (!column) return;

      try {
        useStore.setState(state => ({
          deleteColumnDialog: {
          isOpen: true,
          columnId,
            columnName: column.title,
          }
        }));
        
        await editableLeadsGridConfirmDeleteColumn();
        
        console.log('🗄️ Persisting column deletion to database...');
        
        // Show loading state during bulk deletion
        toast({
          title: "Deleting column...",
          description: `Removing "${column.title}" from all contacts. This may take a moment.`,
        });
        
        // 🚀 NEW: Use bulk deletion instead of row-by-row updates
        const bulkResult = await bulkDeleteColumnData(columnId);
        
        if (!bulkResult.success) {
          throw new Error(bulkResult.error || 'Bulk column deletion failed');
        }
        
        console.log(`✅ Bulk deletion completed successfully:`, {
          affectedRows: bulkResult.affectedRows,
        });
        
        // Log the deletion for activity tracking
        logColumnDelete(columnId, column.title);
        
        toast({
          title: "Column deleted",
          description: `Successfully removed "${column.title}" from ${bulkResult.affectedRows} contacts.`,
        });
        
      } catch (error) {
        console.error('Error during column deletion:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete column. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [columns, editableLeadsGridDeleteColumn, editableLeadsGridConfirmDeleteColumn, bulkDeleteColumnData, logColumnDelete]);

  /**
   * Handle confirmation of column deletion
   * Called when user confirms deletion in the dialog
   * 
   * @returns {Promise<void>} Promise that resolves when deletion is confirmed
   */
  const handleConfirmDeleteColumn = useCallback(async () => {
    await editableLeadsGridConfirmDeleteColumn();
  }, [editableLeadsGridConfirmDeleteColumn]);

  /**
   * Handle adding a new column to the grid
   * Creates a new column after the specified column
   * 
   * @param {string} afterColumnId - The ID of the column after which to add new column
   * @returns {Promise<void>} Promise that resolves when column is added
   */
  const handleAddColumn = useCallback(async (afterColumnId: string) => {
    await editableLeadsGridAddColumn(afterColumnId);
    
    try {
      logColumnAdd(`column-${Math.random().toString(36).substring(2, 10)}`, 'New Column');
    } catch (error) {
      console.warn('Failed to log column addition:', error);
    }
  }, [editableLeadsGridAddColumn, logColumnAdd]);

  /**
   * Handle inserting a new column at a specific position
   * 
   * @param {string} direction - Direction to insert ('left' or 'right')
   * @param {number} targetIndex - Index position to insert at
   * @param {string} headerName - Name for the new column header
   * @param {string} columnType - Type of column to create
   * @param {any} [config] - Optional configuration for the column
   * @returns {Promise<void>} Promise that resolves when column is inserted
   */
  const handleInsertColumn = useCallback(async (direction: 'left' | 'right', targetIndex: number, headerName: string, columnType: string, config?: any) => {
    await editableLeadsGridInsertColumn(direction, targetIndex, headerName, columnType, config);
    
    try {
      logColumnAdd(`column-${Math.random().toString(36).substring(2, 10)}`, headerName);
    } catch (error) {
      console.warn('Failed to log column insertion:', error);
    }
  }, [editableLeadsGridInsertColumn, logColumnAdd]);

  /**
   * Handle hiding a column from view
   * 
   * @param {string} columnId - The ID of the column to hide
   * @returns {Promise<void>} Promise that resolves when column is hidden
   */
  const handleHideColumn = useCallback(async (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (column) {
      try {
        logFilterChange({ type: 'column_hidden', columnId, columnName: column.title });
      } catch (error) {
        console.warn('Failed to log column hide:', error);
      }
    }
    
    await editableLeadsGridHideColumn(columnId);
  }, [columns, editableLeadsGridHideColumn, logFilterChange]);

  /**
   * Handle showing a previously hidden column
   * 
   * @param {string} columnId - The ID of the column to unhide
   * @returns {Promise<void>} Promise that resolves when column is shown
   */
  const handleUnhideColumn = useCallback(async (columnId: string) => {
    await editableLeadsGridUnhideColumn(columnId);
  }, [editableLeadsGridUnhideColumn]);
  
  /**
   * Show loading skeleton when no contacts are loaded yet
   * Prevents showing skeleton when contacts are preloaded but settings are loading
   */
  if (loading && rows.length === 0) {
    return <GridSkeleton rowCount={15} columnCount={10} />;
  }

  /**
   * Check if we're waiting for contacts to load for current page
   * Occurs when user navigates to a page beyond currently loaded data
   */
  const waitingForPageData = rows.length === 0 && loading && 
    currentPage > Math.ceil(totalCount / pageSize);

  /**
   * Render loading state for pages beyond current data
   * Shows progress indicator and estimated loading time
   */
  if (waitingForPageData) {
    const percentage = Math.round((totalCount / pageSize) * 100);
    const remainingContacts = totalCount - rows.length;
    const estimatedSeconds = Math.ceil(remainingContacts / 1000 * 0.5);
    const estimatedMinutes = Math.floor(estimatedSeconds / 60);
    const displaySeconds = estimatedSeconds % 60;

    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md">
            <div className="space-y-2">
              <Database className="h-12 w-12 text-blue-500 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900">
                Loading Page {currentPage.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-600">
                We're loading contacts for page {currentPage.toLocaleString()}. This may take a moment as we fetch the data.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-900 font-medium">{rows.length}</span>
                  <span className="text-gray-500"> of </span>
                  <span className="text-gray-900 font-medium">{totalCount}</span>
                  <span className="text-gray-500"> contacts</span>
                </div>
                <div className="text-gray-500">
                  {percentage}% loaded
                </div>
              </div>
              
              <Progress value={percentage} className="h-2" />
              
              {estimatedMinutes > 0 ? (
                <p className="text-xs text-gray-500">
                  Estimated time: {estimatedMinutes}m {displaySeconds}s
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Estimated time: {displaySeconds}s
                </p>
              )}
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => editableLeadsGridSetCurrentPage(1)}
              >
                Go to First Page
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  /**
   * Render the main grid interface with pagination
   * Uses stable key to prevent unnecessary re-renders
   */
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-hidden relative">
        <GridViewContainer 
          key={gridKey}
          columns={columns} 
          data={rows}
          firstRowIndex={(currentPage - 1) * pageSize}
          onCellChange={handleCellChange}
          onAddColumn={handleAddColumn}
          onInsertColumn={handleInsertColumn}
          onDeleteColumn={handleDeleteColumn}
          onHideColumn={handleHideColumn}
          onUnhideColumn={handleUnhideColumn}
          onDeleteContacts={handleDeleteContacts}
        />
      </div>
      <GridPagination
        totalPages={totalPages}
        totalItems={totalCount}
        loading={loading}
        isBackgroundLoading={isBackgroundLoading}
        loadedCount={loadedCount}
      />
      
      <DeleteColumnDialog
        onConfirm={handleConfirmDeleteColumn}
      />
    </div>
  );
}