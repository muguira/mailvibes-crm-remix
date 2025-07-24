import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/stores';
import { OpportunitiesGridViewContainer } from '@/components/grid-view/OpportunitiesGridViewContainer';
import { Column } from '@/components/grid-view/types';
import { GridSkeleton } from '@/components/grid-view/GridSkeleton';
import { GridPagination } from './GridPagination';
import { useAuth } from '@/components/auth';
import { useOpportunities } from '@/hooks/supabase/use-opportunities';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from '@/components/ui/use-toast';
import { useActivity } from "@/contexts/ActivityContext";
import { DeleteColumnDialog } from '@/components/grid-view/DeleteColumnDialog';

interface EditableOpportunitiesGridProps {
  viewToggle?: React.ReactNode;
}

/**
 * EditableOpportunitiesGrid Component
 * 
 * A comprehensive grid component for managing opportunities with advanced features.
 * Based on EditableLeadsGrid but adapted for opportunities table.
 * 
 * @component
 */
export function EditableOpportunitiesGrid({ viewToggle }: EditableOpportunitiesGridProps = {}) {
  const { user } = useAuth();
  const { logCellEdit, logColumnAdd, logColumnDelete, logFilterChange } = useActivity();
  
  // Destructure Zustand slice state and actions for opportunities
  const {
    opportunitiesSearchTerm,
    opportunitiesActiveFilters,
    opportunitiesCurrentPage,
    opportunitiesPageSize,
    opportunitiesColumns,
    opportunitiesHiddenColumns,
    opportunitiesForceRenderKey,
    opportunitiesDeletedColumnIds,
    opportunitiesDeleteColumnDialog,
    opportunitiesIsContactDeletionLoading,
    editableOpportunitiesGridSetCurrentPage,
    editableOpportunitiesGridForceRerender,
    editableOpportunitiesGridSetIsLoading,
    editableOpportunitiesGridAddDynamicColumns,
    editableOpportunitiesGridPersistColumns,
    editableOpportunitiesGridSetColumns,
    editableOpportunitiesGridDeleteColumn,
    editableOpportunitiesGridConfirmDeleteColumn,
    editableOpportunitiesGridAddColumn,
    editableOpportunitiesGridInsertColumn,
    editableOpportunitiesGridHideColumn,
    editableOpportunitiesGridUnhideColumn,
    editableOpportunitiesGridHandleCellEdit,
    editableOpportunitiesGridDeleteOpportunities,
    editableOpportunitiesGridGetColumnFilters,
    editableOpportunitiesGridSetSearchTerm,
  } = useStore();

  // Opportunities management hook
  const { 
    getOpportunities, 
    updateOpportunity, 
    deleteOpportunity,
    bulkConvertContactsToOpportunities
  } = useOpportunities();

  // Debounced search term
  const debouncedSearchTerm = useDebounce(opportunitiesSearchTerm, 200);

  // State for opportunities data
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch opportunities from database
  // 🚀 OPTIMIZED: Updated to use new paginated API with improved error handling
  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    
    try {
      // 🚀 PERFORMANCE: Use optimized API with server-side filtering and pagination
      const filters = {
        searchTerm: debouncedSearchTerm || undefined,
        // TODO: Add other filters from editableOpportunitiesGridGetColumnFilters()
      };
      
      const response = await getOpportunities(filters, {
        page: opportunitiesCurrentPage,
        pageSize: opportunitiesPageSize,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      
      // Extract data from the new response format
      const { data: opportunitiesData, totalCount: responseTotal } = response;
      
      setTotalCount(responseTotal);
      setOpportunities(opportunitiesData);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      
      // Implement retry logic for network errors (but not infinite retries)
      if (retryCount < 2) {
        console.log(`Retrying opportunities fetch (attempt ${retryCount + 1})`);
        setRetryCount(prev => prev + 1);
        // Retry after a short delay
        setTimeout(() => {
          fetchOpportunities();
        }, 2000); // 2 second delay
        return;
      }
      
      // Show error only after retries fail
      toast({
        title: "Error",
        description: "Failed to load opportunities. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getOpportunities, debouncedSearchTerm, opportunitiesCurrentPage, opportunitiesPageSize]);

  // Cleanup function to abort requests when component unmounts
  useEffect(() => {
    return () => {
      // No abortController to manage here as it's removed from fetchOpportunities
    };
  }, []);

  // Fetch opportunities on mount and when dependencies change
  useEffect(() => {
    fetchOpportunities();
  }, [debouncedSearchTerm, opportunitiesCurrentPage, opportunitiesPageSize]); // Removed fetchOpportunities from deps to prevent infinite loop

  // Render function for opportunity name column with navigation link to contact stream view
  const renderOpportunityLink = useCallback(
    (value: any, row: any) => (
      <Link 
        to={`/stream-view/${row.originalContactId || row.id}`} 
        className="text-[#32BAB0] hover:text-[#28a79d] hover:underline font-medium"
      >
        {value}
      </Link>
    ), []
  );

  // Add render function to opportunity column
  useEffect(() => {
    const opportunityColumn = opportunitiesColumns.find(col => col.id === 'opportunity');
    if (opportunityColumn && !opportunityColumn.renderCell) {
      const updatedColumns = opportunitiesColumns.map(col => 
        col.id === 'opportunity' 
          ? { ...col, renderCell: renderOpportunityLink }
          : col
      );
      
      // Update the store state immediately (this was missing!)
      editableOpportunitiesGridSetColumns(updatedColumns);
      
      // Also persist to localStorage for future sessions
      editableOpportunitiesGridPersistColumns(updatedColumns, user);
    }
  }, [opportunitiesColumns, renderOpportunityLink, editableOpportunitiesGridPersistColumns, editableOpportunitiesGridSetColumns, user]);

  // Handle cell value changes
  const handleCellChange = useCallback(async (rowId: string, columnId: string, value: any) => {
    try {
      await editableOpportunitiesGridHandleCellEdit(rowId, columnId, value);
      
      // Update in database
      const updates: any = { [columnId]: value };
      
      // Handle special cases for column types
      if (columnId === 'revenue' && typeof value === 'string') {
        // Parse currency string to number
        const numValue = parseFloat(value.replace(/[^0-9.-]+/g, ''));
        updates.revenue = numValue;
      }
      
      await updateOpportunity(rowId, updates);
      
      // Log the edit
      const row = opportunities.find(r => r.id === rowId);
      const oldValue = row ? row[columnId] : null;
      logCellEdit(rowId, columnId, value, oldValue);
      
      // Refresh data
      await fetchOpportunities();
    } catch (error) {
      console.error('Error updating opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to update opportunity",
        variant: "destructive",
      });
    }
  }, [opportunities, updateOpportunity, logCellEdit, editableOpportunitiesGridHandleCellEdit, fetchOpportunities]);

  // Handle opportunity deletion
  const handleDeleteOpportunities = useCallback(async (opportunityIds: string[]) => {
    try {
      await editableOpportunitiesGridDeleteOpportunities(opportunityIds);
      
      // Delete from database
      for (const id of opportunityIds) {
        await deleteOpportunity(id);
      }
      
      toast({
        title: "Opportunities deleted",
        description: `Successfully deleted ${opportunityIds.length} opportunit${opportunityIds.length === 1 ? 'y' : 'ies'}.`,
      });
      
      // Refresh data
      await fetchOpportunities();
      
    } catch (error) {
      console.error('Error deleting opportunities:', error);
      toast({
        title: "Error",
        description: "Failed to delete opportunities",
        variant: "destructive",
      });
    }
  }, [deleteOpportunity, editableOpportunitiesGridDeleteOpportunities, fetchOpportunities]);

  // Handle column operations
  const handleAddColumn = useCallback(async (afterColumnId: string) => {
    editableOpportunitiesGridAddColumn(afterColumnId);
    logColumnAdd(`column-${Math.random().toString(36).substring(2, 10)}`, 'New Column');
  }, [editableOpportunitiesGridAddColumn, logColumnAdd]);

  const handleInsertColumn = useCallback(async (direction: 'left' | 'right', targetIndex: number, headerName: string, columnType: string, config?: any) => {
    editableOpportunitiesGridInsertColumn(direction, targetIndex, headerName, columnType, config);
    logColumnAdd(`column-${Math.random().toString(36).substring(2, 10)}`, headerName);
  }, [editableOpportunitiesGridInsertColumn, logColumnAdd]);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    const column = opportunitiesColumns.find(col => col.id === columnId);
    if (column) {
      await editableOpportunitiesGridDeleteColumn(columnId);
    }
  }, [opportunitiesColumns, editableOpportunitiesGridDeleteColumn]);

  const handleConfirmDeleteColumn = useCallback(async () => {
    await editableOpportunitiesGridConfirmDeleteColumn();
  }, [editableOpportunitiesGridConfirmDeleteColumn]);

  const handleHideColumn = useCallback(async (columnId: string) => {
    const column = opportunitiesColumns.find(col => col.id === columnId);
    if (column) {
      logFilterChange({ type: 'column_hidden', columnId, columnName: column.title });
    }
    await editableOpportunitiesGridHideColumn(columnId);
  }, [opportunitiesColumns, editableOpportunitiesGridHideColumn, logFilterChange]);

  const handleUnhideColumn = useCallback(async (columnId: string) => {
    await editableOpportunitiesGridUnhideColumn(columnId);
  }, [editableOpportunitiesGridUnhideColumn]);

  // Helper function to check if a column is temporarily visible
  const isColumnTemporarilyVisible = useCallback((columnId: string) => {
    const hiddenColumnsFilter = opportunitiesActiveFilters.values['__hidden_columns__'] as any;
    const showHiddenColumns = hiddenColumnsFilter?.showHidden === true;
    return showHiddenColumns && opportunitiesHiddenColumns.some(col => col.id === columnId);
  }, [opportunitiesActiveFilters.values, opportunitiesHiddenColumns]);

  // Handle converting contacts to opportunities (for Add Opportunities button)
  const handleConvertToOpportunities = useCallback(async (
    contacts: Array<{ id: string; name: string; email?: string; company?: string; phone?: string; }>,
    conversionData: {
      accountName: string;
      dealValue: number;
      closeDate?: Date;
      stage: string;
      priority: string;
      contacts: Array<{
        id: string;
        name: string;
        email?: string;
        company?: string;
        role: string;
      }>;
    }
  ) => {
    try {
      // Use the actual contact data passed from the modal
      const contactsForConversion = contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        email: contact.email || '',
        company: contact.company || '',
        source: 'Contact Selection'
      }));

      const result = await bulkConvertContactsToOpportunities(contactsForConversion, conversionData);
      
      if (result.success) {
        console.log('✅ Successfully created opportunity:', conversionData.accountName);
        // Refresh opportunities data
        await fetchOpportunities();
        
        toast({
          title: "Opportunity created",
          description: `Successfully created opportunity "${conversionData.accountName}".`,
        });
      }
    } catch (error) {
      console.error('❌ Error creating opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to create opportunity. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [bulkConvertContactsToOpportunities, fetchOpportunities]);

  // Compute display columns
  const displayColumns = useMemo(() => {
    const hiddenColumnsFilter = opportunitiesActiveFilters.values['__hidden_columns__'] as any;
    const showHiddenColumns = hiddenColumnsFilter?.showHidden === true;

    if (showHiddenColumns && opportunitiesHiddenColumns.length > 0) {
      let result = [...opportunitiesColumns];
      
      opportunitiesHiddenColumns.forEach((hiddenCol: any) => {
        const originalIndex = hiddenCol.originalIndex;
        if (originalIndex !== undefined && originalIndex >= 0) {
          const insertAt = Math.min(originalIndex, result.length);
          result.splice(insertAt, 0, hiddenCol);
        } else {
          result.push(hiddenCol);
        }
      });
      
      // Remove duplicates
      const uniqueColumns = Array.from(
        new Map(result.map(col => [col.id, col])).values()
      );
      
      return uniqueColumns;
    }
    
    return opportunitiesColumns;
  }, [opportunitiesColumns, opportunitiesHiddenColumns, opportunitiesActiveFilters.values]);

  // Calculate total pages
  const totalPages = useMemo(() => Math.ceil(totalCount / opportunitiesPageSize), [totalCount, opportunitiesPageSize]);
  
  // Stable grid key
  const gridKey = useMemo(() => `opportunities-grid-${opportunitiesForceRenderKey}`, [opportunitiesForceRenderKey]);

  // Show loading skeleton when loading
  if (loading && opportunities.length === 0) {
    return <GridSkeleton rowCount={10} columnCount={10} loadingText="Loading opportunities..." />;
  }

  // Render the grid
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-hidden relative">
        <OpportunitiesGridViewContainer 
          key={gridKey}
          columns={displayColumns as any} 
          data={opportunities}
          firstRowIndex={0}
          onCellChange={handleCellChange}
          onAddColumn={handleAddColumn}
          onInsertColumn={handleInsertColumn}
          onDeleteColumn={handleDeleteColumn}
          onHideColumn={handleHideColumn}
          onUnhideColumn={handleUnhideColumn}
          onShowColumn={handleUnhideColumn}
          onDeleteContacts={handleDeleteOpportunities}
          isColumnTemporarilyVisible={isColumnTemporarilyVisible}
          onSearchChange={(term) => editableOpportunitiesGridSetSearchTerm(term)}
          onConvertToOpportunities={handleConvertToOpportunities}
          viewToggle={viewToggle}
        />
      </div>
      <GridPagination
        totalPages={totalPages}
        totalItems={totalCount}
        loading={loading}
        isBackgroundLoading={false}
        loadedCount={opportunities.length}
        currentPage={opportunitiesCurrentPage}
        pageSize={opportunitiesPageSize}
        onPageChange={editableOpportunitiesGridSetCurrentPage}
        onPageSizeChange={(size) => {
          // Note: We should implement setPageSize in the opportunities slice
          // For now, just log it to prevent errors
          console.log('Page size change requested:', size);
        }}
      />
      
      <DeleteColumnDialog
        onConfirm={handleConfirmDeleteColumn}
      />
    </div>
  );
} 