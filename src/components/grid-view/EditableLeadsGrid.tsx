import  { useState, useEffect, useCallback, useMemo } from 'react';
import { GridViewContainer } from '@/components/grid-view/GridViewContainer';
import { Column } from '@/components/grid-view/types';
import { GridSkeleton } from '@/components/grid-view/GridSkeleton';
import { GridPagination } from './GridPagination';
import { 
  DEFAULT_COLUMN_WIDTH,
  MOBILE_COLUMN_WIDTH,
} from '@/components/grid-view/grid-constants';
import { Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth';
import { logger } from '@/utils/logger';
import { useLeadsRows } from '@/hooks/supabase/use-leads-rows';
import { useInstantContacts } from '@/hooks/use-instant-contacts';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from '@/components/ui/use-toast';
import { useActivity } from "@/contexts/ActivityContext";
import { DeleteColumnDialog } from '@/components/grid-view/DeleteColumnDialog';
import { Progress } from '@/components/ui/progress';
import { getDefaultColumns, saveColumnsToLocal, extractDynamicFields, syncContact, loadColumnsFromLocal, loadColumnsFromSupabase } from '@/helpers/grid';
import { renderSocialLink } from '@/components/grid-view/RenderSocialLink';
import { useStore } from '@/stores';

export function EditableLeadsGrid() {
  const { user } = useAuth();
  const { logCellEdit, logColumnAdd, logColumnDelete, logFilterChange } = useActivity();
  
  // ==========================================
  // SLICE INTEGRATION (BASIC - WORKING)
  // ==========================================
  
  // Get slice state and actions (expanding migration)
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
    editableLeadsGridSetSearchTerm,
    editableLeadsGridSetActiveFilters,
    editableLeadsGridSetCurrentPage,
    editableLeadsGridSetPageSize,
    editableLeadsGridSetColumns,
    editableLeadsGridForceRerender,
  } = useStore();

  // Temporary setter functions until they are implemented in the slice
  const setHiddenColumns = (columns: Column[]) => {
    // TODO: Implement editableLeadsGridSetHiddenColumns in slice
    console.log('setHiddenColumns called with:', columns.length, 'columns');
  };
  
  const setDeletedColumnIds = (ids: Set<string>) => {
    // TODO: Implement editableLeadsGridSetDeletedColumnIds in slice
    console.log('setDeletedColumnIds called with:', ids.size, 'ids');
  };

  const setDeleteColumnDialog = (dialog: any) => {
    // TODO: Implement editableLeadsGridSetDeleteColumnDialog in slice
    console.log('setDeleteColumnDialog called with:', dialog);
  };

  const setColumnOperationLoading = (loading: any) => {
    // TODO: Implement editableLeadsGridSetColumnOperationLoading in slice
    console.log('setColumnOperationLoading called with:', loading);
  };

  // ==========================================
  // LOCAL STATE (TEMPORARY - TO BE MIGRATED GRADUALLY)
  // ==========================================
  
  // Keep local state for everything else during gradual migration

  const [isContactDeletionLoading, setIsContactDeletionLoading] = useState(false);
  
  // Persist deleted columns to localStorage
  useEffect(() => {
    localStorage.setItem('deletedColumnIds', JSON.stringify(Array.from(deletedColumnIds)));
  }, [deletedColumnIds]);
  
  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  
  // Convert activeFilters to ColumnFilter format for useInstantContacts
  const columnFilters = useMemo(() => {
    if (!activeFilters.columns || activeFilters.columns.length === 0) {
      return [];
    }
    
    return activeFilters.columns.map(columnId => {
      const filterValue = activeFilters.values[columnId] as any; // Type assertion since it's unknown
      const column = columns.find(col => col.id === columnId);
      
      if (!filterValue || !column) return null;
      
      // Convert based on filter type
      if (filterValue.type === 'text') {
        if (filterValue.operator === 'is_empty') {
          return { columnId, value: null, type: 'text', operator: 'is_empty' };
        } else if (filterValue.operator === 'is_not_empty') {
          return { columnId, value: null, type: 'text', operator: 'is_not_empty' };
        } else if (filterValue.text?.trim()) {
          return { 
            columnId, 
            value: filterValue.text.trim(), 
            type: 'text', 
            operator: filterValue.operator 
          };
        }
      } else if (filterValue.type === 'dropdown') {
        // Handle both single-select and multi-select dropdown filters
        if (filterValue.values && Array.isArray(filterValue.values) && filterValue.values.length > 0) {
          // Multi-select dropdown
          return { 
            columnId, 
            value: filterValue.values, 
            type: 'dropdown' 
          };
        } else if (filterValue.value && filterValue.value !== '' && filterValue.value !== '__all__') {
          // Single-select dropdown
          return { 
            columnId, 
            value: filterValue.value, 
            type: 'dropdown' 
          };
        }
      } else if (filterValue.type === 'status') {
        if (filterValue.statuses?.length > 0) {
          return { 
            columnId, 
            value: filterValue.statuses, 
            type: 'status' 
          };
        }
      } else if (filterValue.type === 'date') {
        console.log('Processing date filter:', {
          columnId,
          filterValue,
          operator: filterValue.operator,
          startDate: filterValue.startDate,
          endDate: filterValue.endDate
        });
        
        if (filterValue.operator === 'is_empty') {
          return { columnId, value: null, type: 'date', operator: 'is_empty' };
        } else if (filterValue.operator === 'is_not_empty') {
          return { columnId, value: null, type: 'date', operator: 'is_not_empty' };
        } else if (filterValue.startDate || filterValue.endDate) {
          // Convert the filter format to match what useInstantContacts expects
          const dateFilter: any = { 
            columnId, 
            type: 'date',
            operator: filterValue.operator
          };
          
          if (filterValue.operator === 'between' && filterValue.startDate && filterValue.endDate) {
            dateFilter.value = {
              start: filterValue.startDate,
              end: filterValue.endDate
            };
          } else if (filterValue.operator === 'before' && filterValue.startDate) {
            dateFilter.value = { end: filterValue.startDate };
          } else if (filterValue.operator === 'after' && filterValue.startDate) {
            dateFilter.value = { start: filterValue.startDate };
          } else if (filterValue.operator === 'on' && filterValue.startDate) {
            dateFilter.value = {
              start: filterValue.startDate,
              end: filterValue.startDate
            };
          } else {
            // Fallback for other operators or missing dates
            console.warn('Date filter missing required dates:', filterValue);
            return null;
          }
          
          console.log('Created date filter:', dateFilter);
          return dateFilter;
        } else {
          console.warn('Date filter missing startDate/endDate:', filterValue);
        }
      } else if (filterValue.type === 'number') {
        if (filterValue.operator === 'is_empty') {
          return { columnId, value: null, type: 'number', operator: 'is_empty' };
        } else if (filterValue.operator === 'is_not_empty') {
          return { columnId, value: null, type: 'number', operator: 'is_not_empty' };
        } else if (filterValue.number1 !== undefined) {
          const numberFilter: any = { 
            columnId, 
            type: 'number',
            operator: filterValue.operator
          };
          
          if (filterValue.operator === 'between') {
            numberFilter.value = {
              min: filterValue.number1,
              max: filterValue.number2
            };
          } else {
            numberFilter.value = filterValue.number1;
          }
          
          return numberFilter;
        }
      }
      
      return null;
    }).filter(filter => filter !== null);
  }, [activeFilters, columns]);

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
  
  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    editableLeadsGridSetCurrentPage(page);
    // Scroll to top of grid when changing pages
    const gridElement = document.querySelector('.grid-components-container');
    if (gridElement) {
      gridElement.scrollTop = 0;
    }
  }, []);
  
  // Handle page size change
  const handlePageSizeChange = useCallback((size: number) => {
    editableLeadsGridSetPageSize(size);
    // Reset to first page when changing page size
    editableLeadsGridSetCurrentPage(1);
  }, []);
  
  // Handle search change with immediate page reset to prevent multiple re-renders
  const handleSearchChange = useCallback((term: string) => {
    // Only update if the term actually changed to prevent unnecessary re-renders
    if (searchTerm !== term) {
      // Reset to first page immediately when search term changes
      editableLeadsGridSetCurrentPage(1);
      editableLeadsGridSetSearchTerm(term);
    }
  }, [searchTerm, editableLeadsGridSetCurrentPage, editableLeadsGridSetSearchTerm]);

  // Handle contact deletion
  const handleDeleteContacts = useCallback(async (contactIds: string[]) => {
    setIsContactDeletionLoading(true);
    
    try {
      await deleteContacts(contactIds);
      
      // Show success message
      toast({
        title: "Contacts deleted",
        description: `Successfully deleted ${contactIds.length} contact${contactIds.length === 1 ? '' : 's'}.`,
      });
      
      // Force re-render to update the grid
      editableLeadsGridForceRerender();
      
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast({
        title: "Error",
        description: "Failed to delete contacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsContactDeletionLoading(false);
    }
  }, [deleteContacts, toast, editableLeadsGridForceRerender]);

  // Function to persist columns to both localStorage and Supabase
  const persistColumns = useCallback(async (newColumns: Column[]) => {
    try {
      // Save to localStorage immediately for fast access
      saveColumnsToLocal(newColumns);
      
      // Save to Supabase for persistence across devices
      if (user) {
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase
          .from('user_settings' as any)
          .upsert({
            user_id: user.id,
            setting_key: 'grid_columns',
            setting_value: newColumns
          });
      }
    } catch (error) {
      logger.error('Error persisting columns:', error);
    }
  }, [user]);

  // Add dynamic columns based on imported data - memoized to prevent unnecessary recalculations
  const dynamicFields = useMemo(() => {
    if (rows.length === 0) return new Set<string>();
    return extractDynamicFields(rows);
  }, [rows]);

  const dynamicColumnsToAdd = useMemo(() => {
    const fieldsToAdd = Array.from(dynamicFields).filter(field => 
      !columns.some(col => col.id === field) && 
      !deletedColumnIds.has(field)
    );
    
    return fieldsToAdd.map(field => ({
      id: field,
      title: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
      type: 'text' as const,
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    }));
  }, [dynamicFields, columns, deletedColumnIds]);

  // Add dynamic columns when new fields are detected
  useEffect(() => {
    if (dynamicColumnsToAdd.length > 0) {
      editableLeadsGridSetColumns([...columns, ...dynamicColumnsToAdd.filter(newColumn => 
        !columns.some(col => col.id === newColumn.id)
      )]);
    }
  }, [dynamicColumnsToAdd, columns, editableLeadsGridSetColumns]);

  // Sync contacts with mockContactsById for stream view compatibility
  useEffect(() => {
    if (rows && rows.length > 0) {
      rows.forEach(row => {
        syncContact(row);
      });
    }
  }, [rows]);

  // Handle cell edit
  const handleCellChange = useCallback(async (rowId: string, columnId: string, value: any) => {
    console.log('EditableLeadsGrid handleCellChange called:', {
      rowId,
      columnId,
      value,
      timestamp: new Date().toISOString()
    });
    
    const cellKey = `${rowId}-${columnId}`;
    
    try {
      // Find the old value for activity logging
      const row = rows.find(r => r.id === rowId);
      const oldValue = row ? row[columnId] : null;

      console.log('Row found for handleCellChange:', {
        rowId,
        rowFound: !!row,
        rowName: row?.name,
        oldValue,
        newValue: value,
        columnId
      });

      // Format date values before saving
      const column = columns.find(c => c.id === columnId);
      let finalValue = value;
      if (column && column.type === 'date' && value instanceof Date) {
        finalValue = value.toISOString().split('T')[0];
      }

      console.log('Final value after processing:', {
        originalValue: value,
        finalValue,
        columnType: column?.type,
        isDateColumn: column?.type === 'date'
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

      console.log('EditableLeadsGrid handleCellChange completed successfully:', {
        rowId,
        columnId,
        finalValue,
        cellKey
      });

    } catch (error) {
      console.error('Error updating cell:', error);
      toast({
        title: "Error",
        description: "Failed to update cell. Please try again.",
        variant: "destructive",
      });
    }
  }, [rows, columns, updateCell, logCellEdit]);

  // Handle columns reordering
  const handleColumnsReorder = useCallback((columnIds: string[]) => {
    // Reorder columns based on new order
    const reorderedColumns = columnIds.map(id => columns.find(col => col.id === id)).filter(Boolean) as Column[];
    
    // Update state
    editableLeadsGridSetColumns(reorderedColumns);
    
    // Persist the new order
    persistColumns(reorderedColumns);
  }, [columns, persistColumns, editableLeadsGridSetColumns]);

  // Handle column deletion
  const handleDeleteColumn = useCallback(async (columnId: string) => {
    // Find the column to delete
    const columnToDelete = columns.find(col => col.id === columnId);
    if (!columnToDelete) return;

    // Set loading state
    setColumnOperationLoading({ type: 'delete', columnId });

    try {
      // Check if this is a default column that cannot be deleted
      const defaultColumnIds = ['name', 'email', 'company', 'phone', 'status', 'owner', 'revenue', 'source', 'created_at', 'updated_at'];
      
      if (defaultColumnIds.includes(columnId)) {
        setDeleteColumnDialog({
          isOpen: true,
          columnId,
          columnName: columnToDelete.title
        });
        return;
      }

      // Remove the column from the columns array
      const updatedColumns = columns.filter(col => col.id !== columnId);
      editableLeadsGridSetColumns(updatedColumns);
      
      // Add to deleted columns set
      setDeletedColumnIds(new Set([...deletedColumnIds, columnId]));
      
      // Remove column data from all rows
      const updatedRows = rows.map(row => {
        const { [columnId]: _, ...rest } = row as any;
        return rest;
      });
      console.log(`📝 Updated ${updatedRows.length} rows to remove column data`);
      
      // Update the rows in the database
      let updateErrors = 0;
      for (const row of updatedRows) {
        try {
          await updateCell({ rowId: (row as any).id, columnId, value: undefined });
        } catch (error) {
          updateErrors++;
          console.error(`Error updating row ${(row as any).id}:`, error);
        }
      }
      
      // Log the column deletion
      logColumnDelete(columnId, columnToDelete.title);
      
      // Persist the updated columns
      persistColumns(updatedColumns);
      
      // Show success message
      toast({
        title: "Column deleted",
        description: updateErrors > 0 
          ? `Column "${columnToDelete.title}" deleted with ${updateErrors} update errors.`
          : `Column "${columnToDelete.title}" deleted successfully.`,
        variant: updateErrors > 0 ? "destructive" : "default",
      });
      
    } catch (error) {
      console.error('Error deleting column:', error);
      toast({
        title: "Error",
        description: "Failed to delete column. Please try again.",
        variant: "destructive",
      });
    } finally {
      setColumnOperationLoading({ type: null });
    }
  }, [columns, rows, updateCell, logColumnDelete, persistColumns, toast]);

  // Handle the actual deletion after confirmation
  const handleConfirmDeleteColumn = useCallback(async () => {
    const { columnId, columnName } = deleteColumnDialog;
    
    // Close the dialog
    setDeleteColumnDialog({ isOpen: false, columnId: '', columnName: '' });
    
    // Set loading state
    setColumnOperationLoading({ type: 'delete', columnId });
    
    try {
      // Log the column deletion attempt
      console.log(`🗑️ Attempting to delete column: ${columnId} (${columnName})`);
      logColumnDelete(columnId, columnName);
      
      // Add to deleted columns set to prevent re-adding
      setDeletedColumnIds(new Set([...deletedColumnIds, columnId]));
      console.log(`🚫 Added ${columnId} to deleted columns list`);
      
      // Remove from columns array
      const newColumns = columns.filter(col => col.id !== columnId);
      console.log(`📊 Columns after deletion: ${newColumns.length} remaining`);
      editableLeadsGridSetColumns(newColumns);
      
      // Remove column data from all rows
      const updatedRows = rows.map(row => {
        const { [columnId]: _, ...rest } = row as any;
        return rest;
      });
      console.log(`📝 Updated ${updatedRows.length} rows to remove column data`);
      
      // Update the rows in the database
      let updateErrors = 0;
      for (const row of updatedRows) {
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
      await persistColumns(newColumns);
      console.log(`✅ Column deletion completed successfully`);
      
      toast({
        title: "Column deleted",
        description: `Successfully deleted column "${columnName}" and all its data`,
      });
    } catch (error) {
      console.error(`❌ Column deletion failed:`, error);
      toast({
        title: "Error deleting column",
        description: error instanceof Error ? error.message : "Failed to delete the column. Please try again.",
        variant: "destructive"
      });
    } finally {
      setColumnOperationLoading({ type: null });
    }
  }, [deleteColumnDialog, columns, rows, updateCell, logColumnDelete, persistColumns, toast]);
  
  // Resize handler extracted so it can be reused
  const handleResize = useCallback(() => {
    const isMobile = window.innerWidth < 768; // Standard mobile breakpoint
    const columnWidth = isMobile ? MOBILE_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH;

    editableLeadsGridSetColumns(
      columns.map(col => {
        // On mobile, keep the Contact column at 120px; otherwise use 180px
        if (col.id === 'name') {
          return { ...col, width: isMobile ? 120 : 180 };
        }

        // Update all other columns to use the appropriate width
        return { ...col, width: columnWidth };
      })
    );
  }, [columns, editableLeadsGridSetColumns]);
  
  
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

  // Add loading state to prevent duplicate loads
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Load columns from storage on component mount
  useEffect(() => {
    let isMounted = true;
    
    const loadStoredColumns = async () => {
      if (!isMounted) return;
      
      try {
        // First try localStorage to avoid unnecessary network requests
        let storedColumns: Column[] | null = loadColumnsFromLocal();
        
        // Only try Supabase if no local storage and user is authenticated
        if (!storedColumns && user) {
          storedColumns = await loadColumnsFromSupabase(user);
        }
        
        // If we found stored columns, use them
        if (storedColumns && storedColumns.length > 0 && isMounted) {
          // Ensure renderCell functions are preserved for social links
          const columnsWithRenderFunctions = storedColumns.map(col => {
            if (['facebook', 'instagram', 'linkedin', 'twitter'].includes(col.id)) {
              return { ...col, renderCell: renderSocialLink };
            }
            if (col.id === 'name') {
              return { 
                ...col, 
                renderCell: (value, row) => (
                  <Link to={`/stream-view/${row.id}`} className="text-primary hover:underline">
                    {value}
                  </Link>
                )
              };
            }
            return col;
          });
          
          editableLeadsGridSetColumns(columnsWithRenderFunctions);
          // Adjust column widths to match the current viewport
          handleResize();
        }
      } catch (error) {
        logger.error('Error loading stored columns:', error);
        // Keep default columns on error
      }
    };

    loadStoredColumns();
    
    return () => {
      isMounted = false;
    };
  }, [user, handleResize]);

  // Function to save hidden columns to storage
  const saveHiddenColumns = async (hiddenCols: Column[]) => {
    try {
      localStorage.setItem('hiddenColumns-v1', JSON.stringify(hiddenCols));
      
      if (user) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { error } = await supabase
          .from('user_settings' as any) // Type assertion to bypass TypeScript error
          .upsert({
            user_id: user.id,
            setting_key: 'hidden_columns',
            setting_value: hiddenCols,
            updated_at: new Date().toISOString()
          });
          
        if (error && !error.message?.includes('404') && error.code !== '42P01') {
          logger.error('Failed to save hidden columns:', error);
        }
      }
    } catch (error) {
      if (!String(error).includes('404') && !String(error).includes('42P01')) {
        logger.error('Failed to save hidden columns:', error);
      }
    }
  };

  // Load hidden columns on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadHiddenColumns = async () => {
      if (!isMounted) return;
      
      try {
        // First try localStorage to avoid unnecessary network requests
        const savedHidden = localStorage.getItem('hiddenColumns-v1');
        let storedHiddenColumns: Column[] | null = savedHidden ? JSON.parse(savedHidden) : null;
        
        // Only try Supabase if no local storage and user is authenticated
        if (!storedHiddenColumns && user) {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data, error } = await supabase
            .from('user_settings' as any) // Type assertion to bypass TypeScript error
            .select('setting_value')
            .eq('user_id', user.id)
            .eq('setting_key', 'hidden_columns')
            .single();
          
          if (data && !error) {
            storedHiddenColumns = (data as any).setting_value as Column[];
          } else if (error && error.code === '42P01') {
            // Table doesn't exist - silently fall back to localStorage
            // This prevents the error from being logged
          } else if (error && !error.message?.includes('404') && error.code !== 'PGRST116') {
            logger.error('Error loading hidden columns:', error);
          }
        }
        
        if (storedHiddenColumns && isMounted) {
          setHiddenColumns(storedHiddenColumns);
        }
      } catch (error) {
        // Only log errors that aren't related to missing table
        const errorMessage = String(error);
        if (!errorMessage.includes('404') && !errorMessage.includes('42P01')) {
          logger.error('Error loading hidden columns:', error);
        }
      }
    };

    loadHiddenColumns();
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Add effect to adjust column widths based on screen size
  useEffect(() => {
    handleResize(); // Initial call

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);
  
  // Handle adding a new column
  const handleAddColumn = async (afterColumnId: string) => {
    // Set loading state
    setColumnOperationLoading({ type: 'add' });
    
    try {
      // Create a new unique column ID
      const columnId = `column-${uuidv4().substring(0, 8)}`;
      
      // Create the new column - defaulting to text type
    const newColumn: Column = {
        id: columnId,
        title: `New Column`,
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    };
    
      // Find the index where we need to insert
      const afterIndex = columns.findIndex(col => col.id === afterColumnId);
      
      // Log the activity
      logColumnAdd(newColumn.id, newColumn.title);
      
      // Add the column at the right position
      const newColumns = [
        ...columns.slice(0, afterIndex + 1),
        newColumn,
        ...columns.slice(afterIndex + 1)
      ];
      
      editableLeadsGridSetColumns(newColumns);
      await persistColumns(newColumns);
      
      toast({
        title: "Column added",
        description: "Successfully added new column",
      });
    } catch (error) {
      toast({
        title: "Error adding column",
        description: "Failed to add new column. Please try again.",
        variant: "destructive"
      });
    } finally {
      setColumnOperationLoading({ type: null });
    }
  };

  // Handle inserting a new column with specific direction and header name
  const handleInsertColumn = async (direction: 'left' | 'right', targetIndex: number, headerName: string, columnType: string, config?: any) => {
    // Set loading state
    setColumnOperationLoading({ type: 'add' });
    
    try {
      // Create a new unique column ID
      const columnId = `column-${uuidv4().substring(0, 8)}`;
      
      // Create the new column with the provided header name and type
      const newColumn: Column = {
        id: columnId,
        title: headerName,
        type: columnType as Column['type'], // Use proper type instead of any
        width: DEFAULT_COLUMN_WIDTH,
        editable: true,
      };

      // Apply configuration based on column type
      if (columnType === 'currency' && config?.currencyType) {
        // Store currency type in the column for formatting
        newColumn.currencyType = config.currencyType;
      } else if (columnType === 'status' && config?.options && config?.colors) {
        // Add status options and colors from config
        newColumn.options = config.options;
        newColumn.colors = config.colors;
      } else if (columnType === 'status') {
        // Default status options if no config provided
        newColumn.options = ['Option 1', 'Option 2', 'Option 3'];
        newColumn.colors = {
          'Option 1': '#E4E5E8',
          'Option 2': '#DBCDF0', 
          'Option 3': '#C6DEF1',
        };
      }
      
      // Calculate insertion index based on direction
      const insertAt = direction === 'left' ? targetIndex : targetIndex + 1;
      
      // Log the activity
      logColumnAdd(newColumn.id, newColumn.title);
      
      // Insert the column at the calculated position
      const newColumns = [
        ...columns.slice(0, insertAt),
      newColumn,
        ...columns.slice(insertAt)
      ];
      
      editableLeadsGridSetColumns(newColumns);
      
      // Persist the new columns configuration
      await persistColumns(newColumns);
      
      toast({
        title: "Column added",
        description: `Successfully added column "${headerName}"`,
      });
    } catch (error) {
      toast({
        title: "Error adding column",
        description: "Failed to add new column. Please try again.",
        variant: "destructive"
      });
    } finally {
      setColumnOperationLoading({ type: null });
    }
  };

  // Handle hiding a column (remove from view but don't delete data)
  const handleHideColumn = async (columnId: string) => {
    // Set loading state
    setColumnOperationLoading({ type: 'hide', columnId });
    
    try {
      // Log the activity
      const column = columns.find(col => col.id === columnId);
      if (column) {
        logFilterChange({ type: 'column_hidden', columnId, columnName: column.title });
        
        // Store the current index of the column before hiding
        const currentIndex = columns.findIndex(col => col.id === columnId);
        const columnWithIndex = { ...column, originalIndex: currentIndex };
        
        // Add to hidden columns list with original index
        const newHiddenColumns = [...hiddenColumns, columnWithIndex];
        setHiddenColumns(newHiddenColumns);
        await saveHiddenColumns(newHiddenColumns);
      }
      
      // Remove from columns array (this hides it from view)
      const newColumns = columns.filter(col => col.id !== columnId);
      editableLeadsGridSetColumns(newColumns);
      
      // Persist the column changes
      await persistColumns(newColumns);
      
      toast({
        title: "Column hidden",
        description: `Column "${column?.title}" is now hidden`,
      });
    } catch (error) {
      toast({
        title: "Error hiding column",
        description: "Failed to hide the column. Please try again.",
        variant: "destructive"
      });
    } finally {
      setColumnOperationLoading({ type: null });
    }
  };

  // Handle unhiding a column
  const handleUnhideColumn = async (columnId: string) => {
    // Set loading state
    setColumnOperationLoading({ type: 'unhide', columnId });
    
    try {
      // Find the column in hidden columns
      const columnToUnhide = hiddenColumns.find(col => col.id === columnId);
      if (!columnToUnhide) return;

      // Restore render functions for social links and contact column
      let restoredColumn = { ...columnToUnhide };
      if (['facebook', 'instagram', 'linkedin', 'twitter'].includes(columnToUnhide.id)) {
        restoredColumn.renderCell = renderSocialLink;
      } else if (columnToUnhide.id === 'name') {
        restoredColumn.renderCell = (value, row) => (
          <Link to={`/stream-view/${row.id}`} className="text-primary hover:underline">
            {value}
          </Link>
        );
      }

      // Remove the originalIndex property as it's not part of the Column interface
      const { originalIndex, ...cleanColumn } = restoredColumn as any;

      // Calculate where to insert the column based on original index
      let insertIndex = originalIndex || 0;
      
      // Adjust the insert index if columns have been removed since hiding
      const currentColumnIds = columns.map(col => col.id);
      const defaultColumnOrder = getDefaultColumns().map(col => col.id);
      
      // Count how many columns that should come before this one are currently visible
      let adjustedIndex = 0;
      for (let i = 0; i < defaultColumnOrder.length && i < originalIndex; i++) {
        const colId = defaultColumnOrder[i];
        if (currentColumnIds.includes(colId)) {
          adjustedIndex++;
        }
      }
      
      // Ensure we don't insert beyond the current array length
      insertIndex = Math.min(adjustedIndex, columns.length);
      
      // Always keep lastContacted at the end if it exists
      const lastContactedIndex = columns.findIndex(col => col.id === 'lastContacted');
      if (lastContactedIndex !== -1 && insertIndex >= lastContactedIndex) {
        insertIndex = lastContactedIndex;
      }
      
      // Insert the column at the calculated position
      const newColumns = [...columns];
      newColumns.splice(insertIndex, 0, cleanColumn);
      
      editableLeadsGridSetColumns(newColumns);
      await persistColumns(newColumns);

      // Remove from hidden columns
      const newHiddenColumns = hiddenColumns.filter(col => col.id !== columnId);
      setHiddenColumns(newHiddenColumns);
      await saveHiddenColumns(newHiddenColumns);

      // Log the activity
      logFilterChange({ type: 'column_unhidden', columnId, columnName: cleanColumn.title });
      
      toast({
        title: "Column unhidden",
        description: `Column "${cleanColumn.title}" is now visible`,
      });
    } catch (error) {
      toast({
        title: "Error unhiding column",
        description: "Failed to unhide the column. Please try again.",
        variant: "destructive"
      });
    } finally {
      setColumnOperationLoading({ type: null });
    }
  };
  
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
          listName="All Leads"
          listType="Lead"
          listId="leads-grid"
          firstRowIndex={(currentPage - 1) * pageSize}  // Calculate the correct start index for row numbering
          onCellChange={handleCellChange}
          onColumnsReorder={handleColumnsReorder}
          onAddColumn={handleAddColumn}
          onInsertColumn={handleInsertColumn}
          onDeleteColumn={handleDeleteColumn}
          onHideColumn={handleHideColumn}
          onUnhideColumn={handleUnhideColumn}
          hiddenColumns={hiddenColumns}
          onSearchChange={handleSearchChange}
          searchTerm={searchTerm}
          activeFilters={activeFilters}
          onApplyFilters={editableLeadsGridSetActiveFilters}
          className="h-full"
          columnOperationLoading={columnOperationLoading}
          onDeleteContacts={handleDeleteContacts}
          isContactDeletionLoading={isContactDeletionLoading}
        />
      </div>
      <GridPagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalCount}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        loading={loading}
        isBackgroundLoading={isBackgroundLoading}
        loadedCount={loadedCount}
      />
      
      {/* Delete Column Confirmation Dialog */}
      <DeleteColumnDialog
        isOpen={deleteColumnDialog.isOpen}
        columnName={deleteColumnDialog.columnName}
        onClose={() => setDeleteColumnDialog({ isOpen: false, columnId: '', columnName: '' })}
        onConfirm={handleConfirmDeleteColumn}
      />
    </div>
  );
}

