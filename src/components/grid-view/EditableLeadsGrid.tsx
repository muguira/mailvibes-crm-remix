import { useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';
import { useStore } from '@/stores';
import { GridViewContainer } from '@/components/grid-view/GridViewContainer';
import { Column } from '@/components/grid-view/types';
import { GridSkeleton } from '@/components/grid-view/GridSkeleton';
import { renderSocialLink } from '@/components/grid-view/RenderSocialLink';
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
import { logger } from '@/utils/logger';
import { syncContact } from '@/helpers/grid';

/**
 * EditableLeadsGrid Component
 * 
 * A fully-featured grid component for managing leads with:
 * - State management via Zustand slice
 * - Real-time search and filtering
 * - Column management (add, delete, hide, reorder)
 * - Pagination with instant loading
 * - Persistence to localStorage and Supabase
 * - Contact operations (edit, delete)
 * - Activity logging
 * 
 * @returns {JSX.Element} The editable leads grid component
 */
export function EditableLeadsGrid() {
  const { user } = useAuth();
  const { logCellEdit, logColumnAdd, logColumnDelete, logFilterChange } = useActivity();
  
  // ==========================================
  // SLICE INTEGRATION (BASIC - WORKING)
  // ==========================================
  
  // Get slice state and actions (fully migrated)
  const {
    searchTerm,
    activeFilters,
    currentPage,
    pageSize,
    columns,
    forceRenderKey,
    hiddenColumns,
    deletedColumnIds,
    deleteColumnDialog,
    columnOperationLoading,
    isContactDeletionLoading,
    editableLeadsGridSetSearchTerm,
    editableLeadsGridSetActiveFilters,
    editableLeadsGridSetCurrentPage,
    editableLeadsGridForceRerender,
    editableLeadsGridSetIsContactDeletionLoading,
    editableLeadsGridHandlePageChange,
    editableLeadsGridHandlePageSizeChange,
    editableLeadsGridCloseDeleteColumnDialog,
    editableLeadsGridReorderColumns,
    editableLeadsGridAddDynamicColumns,
    editableLeadsGridPersistColumns,
    editableLeadsGridLoadStoredColumns,
    editableLeadsGridDeleteColumn,
    editableLeadsGridConfirmDeleteColumn,
    editableLeadsGridAddColumn,
    editableLeadsGridInsertColumn,
    editableLeadsGridHideColumn,
    editableLeadsGridUnhideColumn,
    editableLeadsGridHandleCellEdit,
    editableLeadsGridDeleteContacts,
    editableLeadsGridInitialize,
    editableLeadsGridLoadHiddenColumns,
    editableLeadsGridHandleResize,
    editableLeadsGridGetColumnFilters,
  } = useStore();
  


  // Use slice setters directly
  const setIsContactDeletionLoading = editableLeadsGridSetIsContactDeletionLoading;

  // Enhanced persistence using slice action
  const persistColumns = useCallback(async (newColumns: Column[]) => {
    await editableLeadsGridPersistColumns(newColumns, user);
  }, [user, editableLeadsGridPersistColumns]);


  // ==========================================
  // LOCAL STATE (TEMPORARY - TO BE MIGRATED GRADUALLY)
  // ==========================================
  
  // Keep local state for everything else during gradual migration
  
  // Initialize grid when component mounts - using slice action
  useEffect(() => {
    let isMounted = true;
    
    const initializeGrid = async () => {
      if (!isMounted) return;
      
      try {
        // Step 1: Initialize grid state through slice
        await editableLeadsGridInitialize(user);
        
        // Get initialization result
        const { lastInitialization } = useStore.getState();
        if (!lastInitialization || lastInitialization.status === 'error') {
          throw new Error('Grid initialization failed');
        }
        
        // Step 2: Load stored columns with render functions (only if user is authenticated)
        if (user) {
          const renderNameLink = (value: any, row: any) => (
            <Link to={`/stream-view/${row.id}`} className="text-primary hover:underline">
              {value}
            </Link>
          );
          
          await editableLeadsGridLoadStoredColumns(user, renderSocialLink, renderNameLink);
        }
        
        // Step 3: Load hidden columns as part of initialization
        await editableLeadsGridLoadHiddenColumns(user);
        
        console.log('✅ Complete grid initialization process completed');
        
      } catch (error) {
        console.error('❌ Grid initialization process failed:', error);
        toast({
          title: "Initialization Error",
          description: "Failed to initialize grid. Please refresh the page.",
          variant: "destructive",
        });
      }
    };
    
    initializeGrid();
    
    return () => {
      isMounted = false;
    };
  }, [user, editableLeadsGridInitialize, editableLeadsGridLoadStoredColumns, editableLeadsGridLoadHiddenColumns, toast]);

  // Persist deleted columns to localStorage
  useEffect(() => {
    localStorage.setItem('deletedColumnIds', JSON.stringify(Array.from(deletedColumnIds)));
  }, [deletedColumnIds]);
  
  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  
  // Convert activeFilters to ColumnFilter format for useInstantContacts - using slice action
  const columnFilters = useMemo(() => {
    return editableLeadsGridGetColumnFilters();
  }, [activeFilters, columns, editableLeadsGridGetColumnFilters]);

  // Use the instant contacts hook with proper filters
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
    columnFilters, // Use converted filters
  });
  
  // Keep the original hook for mutations only
  const { 
    updateCell,
    deleteContacts,
    refreshData
  } = useLeadsRows();

  // Calculate total pages based on filtered results
  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize), [totalCount, pageSize]);
  
  // Create stable grid key to prevent unnecessary re-renders
  const gridKey = useMemo(() => `grid-stable-${forceRenderKey}`, [forceRenderKey]);
  
  // Handle page change - using slice action
  const handlePageChange = editableLeadsGridHandlePageChange;
  
  // Handle page size change - using slice action
  const handlePageSizeChange = editableLeadsGridHandlePageSizeChange;
  
  // Handle search change with immediate page reset to prevent multiple re-renders
  const handleSearchChange = useCallback((term: string) => {
    // Only update if the term actually changed to prevent unnecessary re-renders
    if (searchTerm !== term) {
      // Reset to first page immediately when search term changes
      editableLeadsGridSetCurrentPage(1);
      editableLeadsGridSetSearchTerm(term);
    }
  }, [searchTerm, editableLeadsGridSetCurrentPage, editableLeadsGridSetSearchTerm]);

  // Handle contact deletion - using slice action for state management
  const handleDeleteContacts = useCallback(async (contactIds: string[]) => {
    setIsContactDeletionLoading(true);
    
    try {
      // Prepare deletion state through slice
      await editableLeadsGridDeleteContacts(contactIds);
      
      // Get the preparation result from slice
      const { lastContactDeletion } = useStore.getState();
      if (!lastContactDeletion || lastContactDeletion.status === 'error') {
        throw new Error('Contact deletion preparation failed');
      }
      
      // Execute the actual deletion using the hook
      await deleteContacts(contactIds);
      
      // Update slice with success status
      useStore.setState(state => ({
        lastContactDeletion: {
          ...state.lastContactDeletion!,
          status: 'success' as const
        }
      }));
      
      // Show success message
      toast({
        title: "Contacts deleted",
        description: `Successfully deleted ${contactIds.length} contact${contactIds.length === 1 ? '' : 's'}.`,
      });
      
      // Force re-render to update the grid
      editableLeadsGridForceRerender();
      
    } catch (error) {
      console.error('Error deleting contacts:', error);
      
      // Update slice with error status
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
  }, [deleteContacts, editableLeadsGridDeleteContacts, toast, editableLeadsGridForceRerender]);



  // Dynamic columns are now handled entirely by slice actions

  // Add dynamic columns when new fields are detected - using slice action
  useEffect(() => {
    if (rows.length > 0) {
      editableLeadsGridAddDynamicColumns(rows);
    }
  }, [rows, editableLeadsGridAddDynamicColumns]);

  // Sync contacts with mockContactsById for stream view compatibility
  useEffect(() => {
    if (rows && rows.length > 0) {
      rows.forEach(row => {
        syncContact(row);
      });
    }
  }, [rows]);

  // Handle cell edit - using slice action for processing
  const handleCellChange = useCallback(async (rowId: string, columnId: string, value: any) => {
    console.log('EditableLeadsGrid handleCellChange called:', {
      rowId,
      columnId,
      value,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Process the cell edit through the slice
      await editableLeadsGridHandleCellEdit(rowId, columnId, value);
      
      // Get the processed value from the slice
      const { lastCellEdit } = useStore.getState();
      if (!lastCellEdit || lastCellEdit.rowId !== rowId || lastCellEdit.columnId !== columnId) {
        throw new Error('Cell edit processing failed');
      }
      
      const { finalValue } = lastCellEdit;
      
      // Find the old value for activity logging
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

      // Update the cell using the hook
      await updateCell({ rowId, columnId, value: finalValue });

      // Log the activity with contact name if available
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
  }, [rows, updateCell, logCellEdit, editableLeadsGridHandleCellEdit, toast]);

  // Handle columns reordering - using slice action
  const handleColumnsReorder = useCallback((columnIds: string[]) => {
    // Reorder columns using slice action
    editableLeadsGridReorderColumns(columnIds);
    
    // Get the reordered columns for persistence
    const reorderedColumns = columnIds.map(id => columns.find(col => col.id === id)).filter(Boolean) as Column[];
    
    // Persist the new order
    persistColumns(reorderedColumns);
  }, [columns, persistColumns, editableLeadsGridReorderColumns]);

  // Handle column deletion - using slice action
  const handleDeleteColumn = useCallback(async (columnId: string) => {
    // Check if this is a default column that requires confirmation
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
      // For default columns, use the slice to open the confirmation dialog
      await editableLeadsGridDeleteColumn(columnId);
    } else {
      // For custom columns, handle deletion directly with persistence
      console.log('🚀 Handling custom column deletion with persistence:', columnId);
      
      const column = columns.find(col => col.id === columnId);
      if (!column) return;

      try {
        // First, execute the slice action to update local state
        useStore.setState(state => ({
          deleteColumnDialog: {
            isOpen: true,
            columnId,
            columnName: column.title,
          }
        }));
        
        await editableLeadsGridConfirmDeleteColumn();
        
        // Now handle persistence operations that require hooks
        console.log('🗄️ Persisting column deletion to database...');
        
        // Remove column data from all rows in the database
        let updateErrors = 0;
        for (const row of rows) {
          try {
            await updateCell({ rowId: (row as any).id, columnId, value: undefined });
          } catch (error) {
            updateErrors++;
            console.error(`❌ Failed to update row ${(row as any).id}:`, error);
          }
        }
        
        if (updateErrors > 0) {
          console.warn(`⚠️ ${updateErrors} rows failed to update during column deletion`);
        }
        
        // Persist the column configuration
        const newColumns = columns.filter(col => col.id !== columnId);
        await persistColumns(newColumns);
        
        // Log the column deletion
        logColumnDelete(columnId, column.title);
        
        console.log(`✅ Custom column deletion completed successfully with persistence`);
        
        // Show success message
        toast({
          title: "Column deleted",
          description: updateErrors > 0 
            ? `Column "${column.title}" deleted with ${updateErrors} update errors.`
            : `Column "${column.title}" deleted successfully.`,
          variant: updateErrors > 0 ? "destructive" : "default",
        });
        
      } catch (error) {
        console.error('Error in custom column deletion:', error);
        toast({
          title: "Error",
          description: "Failed to delete column. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [editableLeadsGridDeleteColumn, editableLeadsGridConfirmDeleteColumn, columns, rows, updateCell, persistColumns, logColumnDelete, toast]);

  // Handle the actual deletion after confirmation - using slice action with row updates
  const handleConfirmDeleteColumn = useCallback(async () => {
    const { columnId, columnName } = deleteColumnDialog;
    
    try {
      // Execute the slice action first (handles state updates)
      await editableLeadsGridConfirmDeleteColumn();
      
      // Now handle the operations that require hooks (row updates and persistence)
      const column = columns.find(col => col.id === columnId);
      if (!column) return;
      
      // Remove column data from all rows in the database
      let updateErrors = 0;
      for (const row of rows) {
        try {
          await updateCell({ rowId: (row as any).id, columnId, value: undefined });
        } catch (error) {
          updateErrors++;
          console.error(`❌ Failed to update row ${(row as any).id}:`, error);
        }
      }
      
      if (updateErrors > 0) {
        console.warn(`⚠️ ${updateErrors} rows failed to update during column deletion`);
      }
      
      // Persist the column deletion
      const newColumns = columns.filter(col => col.id !== columnId);
      await persistColumns(newColumns);
      
      // Log the column deletion
      logColumnDelete(columnId, columnName);
      
      console.log(`✅ Column deletion completed successfully with row updates and persistence`);
      
      // Show final success message
      toast({
        title: "Column deleted",
        description: updateErrors > 0 
          ? `Column "${columnName}" deleted with ${updateErrors} update errors.`
          : `Column "${columnName}" deleted successfully.`,
        variant: updateErrors > 0 ? "destructive" : "default",
      });
      
    } catch (error) {
      console.error('Error in column deletion process:', error);
      toast({
        title: "Error",
        description: "Failed to delete column. Please try again.",
        variant: "destructive",
      });
    }
  }, [deleteColumnDialog, columns, rows, updateCell, persistColumns, logColumnDelete, toast, editableLeadsGridConfirmDeleteColumn]);
  

  
  
  // Listen for contact-added events to refresh the data
  useEffect(() => {
    const handleContactAdded = (event: Event) => {
      logger.log("Contact added event received, clearing cache and refreshing data...");
      // Clear cache and refresh data using the hook
      refreshData();
    };

    const handleContactAddedImmediate = (event: CustomEvent) => {
      logger.log("Contact added immediate event received, forcing re-render...");
      const newContact = event.detail?.contact;
      
      if (newContact) {
        // Force a re-render by updating the render key
        editableLeadsGridForceRerender();
        
        // Refresh the data to ensure the new contact is visible
        refreshData();
      }
    };

    // Listen for contact updates from stream view
    const handleContactUpdated = (event: CustomEvent) => {
      const { contactId, field, value, oldValue } = event.detail;
      
      logger.log(`Contact updated from stream view: ${contactId} - ${field} = ${value}`);
      
      // Update the contacts store directly
      try {
        const { useContactsStore } = require('@/stores/contactsStore');
        const { updateContact: updateContactInStore } = useContactsStore.getState();
        
        if (typeof updateContactInStore === 'function') {
          // Create the update object
          const storeUpdate: any = { [field]: value };
          updateContactInStore(contactId, storeUpdate);
          logger.log(`Updated contact ${contactId} in contacts store via event`);
        }
      } catch (error) {
        logger.warn('Could not update contacts store:', error);
      }
      
      // Force a re-render to reflect the changes
      editableLeadsGridForceRerender();
      
      // Also refresh the data to ensure consistency
      refreshData();
    };

    document.addEventListener("contact-added", handleContactAdded);
    document.addEventListener("contact-added-immediate", handleContactAddedImmediate as EventListener);
    document.addEventListener("mockContactsUpdated", handleContactUpdated as EventListener);

    return () => {
      document.removeEventListener("contact-added", handleContactAdded);
      document.removeEventListener("contact-added-immediate", handleContactAddedImmediate as EventListener);
      document.removeEventListener("mockContactsUpdated", handleContactUpdated as EventListener);
    };
  }, [refreshData]);

  // Add effect to adjust column widths based on screen size - using slice action
  useEffect(() => {
    editableLeadsGridHandleResize(); // Initial call
    window.addEventListener('resize', editableLeadsGridHandleResize);

    return () => window.removeEventListener('resize', editableLeadsGridHandleResize);
  }, []); // Empty dependency array to run only once
  
  // Handle adding a new column - using slice action
  const handleAddColumn = useCallback(async (afterColumnId: string) => {
    await editableLeadsGridAddColumn(afterColumnId);
    
    // Log the activity (only operation that requires hooks)
    try {
      logColumnAdd(`column-${Math.random().toString(36).substring(2, 10)}`, 'New Column');
    } catch (error) {
      console.warn('Failed to log column addition:', error);
    }
  }, [editableLeadsGridAddColumn, logColumnAdd]);

  // Handle inserting a new column with specific direction and header name - using slice action
  const handleInsertColumn = useCallback(async (direction: 'left' | 'right', targetIndex: number, headerName: string, columnType: string, config?: any) => {
    await editableLeadsGridInsertColumn(direction, targetIndex, headerName, columnType, config);
    
    // Log the activity (only operation that requires hooks)
    try {
      logColumnAdd(`column-${Math.random().toString(36).substring(2, 10)}`, headerName);
    } catch (error) {
      console.warn('Failed to log column insertion:', error);
    }
  }, [editableLeadsGridInsertColumn, logColumnAdd]);

  // Handle hiding a column - using slice action with logging
  const handleHideColumn = useCallback(async (columnId: string) => {
    // Log the activity before hiding
    const column = columns.find(col => col.id === columnId);
    if (column) {
      try {
        logFilterChange({ type: 'column_hidden', columnId, columnName: column.title });
      } catch (error) {
        console.warn('Failed to log column hide:', error);
      }
    }
    
    // Execute slice action
    await editableLeadsGridHideColumn(columnId);
  }, [columns, editableLeadsGridHideColumn, logFilterChange]);

  // Handle unhiding a column - using slice action
  const handleUnhideColumn = useCallback(async (columnId: string) => {
    await editableLeadsGridUnhideColumn(columnId);
  }, [editableLeadsGridUnhideColumn]);
  
  // Show loading skeleton only when there are no contacts loaded yet
  // This prevents showing skeleton when contacts are preloaded but settings are still loading
  if (loading && rows.length === 0) {
    return <GridSkeleton rowCount={15} columnCount={10} />;
  }

  // Check if we're waiting for contacts to load for the current page
  // This happens when user jumps to a page beyond what's loaded (e.g., clicking page 2142)
  const waitingForPageData = rows.length === 0 && loading && 
    currentPage > Math.ceil(totalCount / pageSize);

  if (waitingForPageData) {
    const percentage = Math.round((totalCount / pageSize) * 100);
    const remainingContacts = totalCount - rows.length;
    const estimatedSeconds = Math.ceil(remainingContacts / 1000 * 0.5); // ~0.5s per 1000 contacts
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
  
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-hidden relative">
        <GridViewContainer 
          key={gridKey} // Use stable key to prevent unnecessary re-renders
          columns={columns} 
          data={rows}  // Use all rows instead of paginated data
          firstRowIndex={(currentPage - 1) * pageSize}  // Calculate the correct start index for row numbering
          onCellChange={handleCellChange}
          onColumnsReorder={handleColumnsReorder}
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
      
      {/* Delete Column Confirmation Dialog */}
      <DeleteColumnDialog
        isOpen={deleteColumnDialog.isOpen}
        columnName={deleteColumnDialog.columnName}
        onClose={editableLeadsGridCloseDeleteColumnDialog}
        onConfirm={handleConfirmDeleteColumn}
      />
    </div>
  );
}

