import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GridViewContainer } from '@/components/grid-view/GridViewContainer';
import { Column, GridRow } from '@/components/grid-view/types';
import { GridSkeleton } from '@/components/grid-view/GridSkeleton';
import { GridPagination } from './GridPagination';
import { 
  DEFAULT_COLUMN_WIDTH,
  MOBILE_COLUMN_WIDTH,
  ROW_HEIGHT,
  INDEX_COLUMN_WIDTH
} from '@/components/grid-view/grid-constants';
import { Link } from 'react-router-dom';
import { ExternalLink, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { mockContactsById } from '@/components/stream/sample-data';
import { Button } from '@/components/ui/button';
import { PAGE_SIZE, LEADS_STORAGE_KEY } from '@/constants/grid';
import { useAuth } from '@/components/auth';
import { logger } from '@/utils/logger';
import { useLeadsRows } from '@/hooks/supabase/use-leads-rows';
import { useInstantContacts } from '@/hooks/use-instant-contacts';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from '@/components/ui/use-toast';
import { useActivity } from "@/contexts/ActivityContext";
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DeleteColumnDialog } from '@/components/grid-view/DeleteColumnDialog';
import { Database } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Constants
const COLUMNS_STORAGE_KEY = 'gridColumns-v1';

// Save columns to localStorage
const saveColumnsToLocal = (columns: Column[]): void => {
  try {
    localStorage.setItem('grid-columns-v1', JSON.stringify(columns));
  } catch (error) {
    logger.error('Failed to save columns to localStorage:', error);
  }
};

// Load columns from localStorage
const loadColumnsFromLocal = (): Column[] | null => {
  try {
    const saved = localStorage.getItem('grid-columns-v1');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    logger.error('Failed to load columns from localStorage:', error);
  }
  return null;
};

// Save columns to Supabase
const saveColumnsToSupabase = async (user: any, columns: Column[]): Promise<void> => {
  if (!user) return;
  
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase
      .from('user_settings' as any) // Type assertion to bypass TypeScript error
      .upsert({
        user_id: user.id,
        setting_key: 'grid_columns',
        setting_value: columns,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      // Only log error if it's not a 404 (table not found) or 42P01 (relation does not exist)
      if (!error.message?.includes('404') && error.code !== '42P01') {
        logger.error('Failed to save columns to Supabase:', error);
      }
    }
  } catch (error) {
    // Silently fail for 404 errors
    if (!String(error).includes('404') && !String(error).includes('42P01')) {
      logger.error('Error saving columns to Supabase:', error);
    }
  }
};

// Load columns from Supabase
const loadColumnsFromSupabase = async (user: any): Promise<Column[] | null> => {
  if (!user) return null;
  
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('user_settings' as any) // Type assertion to bypass TypeScript error
      .select('setting_value')
      .eq('user_id', user.id)
      .eq('setting_key', 'grid_columns')
      .single();
    
    if (error) {
      // Return null for 404 errors or table not found errors
      if (error.message?.includes('404') || error.code === 'PGRST116' || error.code === '42P01') {
        return null;
      }
      // Only log other errors
      logger.error('Error loading columns from Supabase:', error);
      return null;
    }
    
    return data?.setting_value as Column[];
  } catch (error) {
    // Silently fail for 404 errors
    if (!String(error).includes('404') && !String(error).includes('42P01')) {
      logger.error('Error loading columns from Supabase:', error);
    }
    return null;
  }
};

// Sync a row with the mockContactsById mapping
const syncContact = (row: GridRow): void => {
  if (!mockContactsById[row.id]) {
    // Create a new contact object if it doesn't exist
    mockContactsById[row.id] = { 
      id: row.id,
      name: row.name || '',
      email: row.email || '',
    };
  }
  
  // Update the contact object with row values
  mockContactsById[row.id] = {
    ...mockContactsById[row.id],
    name: row.name || '',
    email: row.email || '',
    company: row.company || '',
    owner: row.owner || '',
    status: row.status,
    revenue: row.revenue,
    description: row.description || '',
    jobTitle: row.jobTitle || '', 
    industry: row.industry || '',
    phone: row.phone || '',
    primaryLocation: row.primaryLocation || '',
    facebook: row.facebook || '',
    instagram: row.instagram || '',
    linkedIn: row.linkedin || '',
    twitter: row.twitter || '',
    website: row.website || '',
    associatedDeals: row.associatedDeals || '',
    source: row.source || '',
  };
};

// Create a reusable social link renderer function
const renderSocialLink = (value: any, row: any) => {
  if (!value) return value;
  const url = value.startsWith('http') ? value : `https://${value}`;
  return (
    <div className="flex items-center w-full" onClick={(e) => e.stopPropagation()}>
      <span className="text-[#33B9B0] truncate">{value}</span>
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-[#33B9B0] hover:text-[#2aa39b] ml-1"
        onClick={(e) => {
          e.stopPropagation();
          window.open(url, '_blank');
        }}
      >
        <ExternalLink size={14} />
      </a>
    </div>
  );
};

// Default columns configuration
const getDefaultColumns = (): Column[] => [
  {
    id: 'name',
    title: 'Contact',
      type: 'text',
    width: 180, // Keep contacts column at 180px
      editable: true,
      frozen: true,
      renderCell: (value, row) => (
        <Link to={`/stream-view/${row.id}`} className="text-primary hover:underline">
          {value}
        </Link>
      ),
    },
  {
    id: 'importListName',
    title: 'List Name',
    type: 'text',
    width: DEFAULT_COLUMN_WIDTH,
    editable: false,
    },
    {
      id: 'status',
    title: 'Lead Status',
      type: 'status',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
      options: ['New', 'In Progress', 'On Hold', 'Closed Won', 'Closed Lost'],
      colors: {
      'New': '#E4E5E8',
      'In Progress': '#DBCDF0',
      'On Hold': '#C6DEF1',
      'Closed Won': '#C9E4DE',
      'Closed Lost': '#F4C6C6',
    },
  },
  {
    id: 'description',
    title: 'Description',
    type: 'text',
    width: DEFAULT_COLUMN_WIDTH,
    editable: true,
  },
  {
    id: 'company',
    title: 'Company',
    type: 'text',
    width: DEFAULT_COLUMN_WIDTH,
    editable: true,
  },
  {
    id: 'jobTitle',
    title: 'Job Title',
    type: 'text',
    width: DEFAULT_COLUMN_WIDTH,
    editable: true,
  },
  {
    id: 'industry',
    title: 'Industry',
    type: 'text',
    width: DEFAULT_COLUMN_WIDTH,
    editable: true,
  },
  {
    id: 'phone',
    title: 'Phone',
    type: 'text',
    width: DEFAULT_COLUMN_WIDTH,
    editable: true,
  },
  {
    id: 'primaryLocation',
    title: 'Primary Location',
    type: 'text',
    width: DEFAULT_COLUMN_WIDTH,
    editable: true,
  },
  {
    id: 'email',
    title: 'Email',
    type: 'text',
    width: DEFAULT_COLUMN_WIDTH,
    editable: true,
  },
  {
    id: 'facebook',
    title: 'Facebook',
    type: 'text',
    width: DEFAULT_COLUMN_WIDTH,
    editable: true,
    renderCell: renderSocialLink,
  },
  {
    id: 'instagram',
    title: 'Instagram',
    type: 'text',
    width: DEFAULT_COLUMN_WIDTH,
    editable: true,
    renderCell: renderSocialLink,
  },
  {
    id: 'linkedin',
    title: 'LinkedIn',
    type: 'text',
    width: DEFAULT_COLUMN_WIDTH,
    editable: true,
    renderCell: renderSocialLink,
  },
  {
    id: 'twitter',
    title: 'X',
    type: 'text',
    width: DEFAULT_COLUMN_WIDTH,
    editable: true,
    renderCell: renderSocialLink,
  },
  {
    id: 'associatedDeals',
    title: 'Associated Deals',
    type: 'text',
    width: DEFAULT_COLUMN_WIDTH,
    editable: true,
  },
    {
      id: 'revenue',
      title: 'Revenue',
      type: 'currency',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    currencyType: 'USD',
    },
    {
      id: 'closeDate',
      title: 'Close Date',
      type: 'date',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
    {
      id: 'owner',
      title: 'Owner',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
    {
    id: 'source',
    title: 'Source',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
    {
      id: 'lastContacted',
      title: 'Last Contacted',
      type: 'date',
      width: DEFAULT_COLUMN_WIDTH,
    editable: true
  },
];

// Helper function to extract dynamic fields from rows data
const extractDynamicFields = (rows: any[]): Set<string> => {
  const dynamicFields = new Set<string>();
  const standardFields = new Set(getDefaultColumns().map(col => col.id));
  
  rows.forEach(row => {
    // Check fields directly on the row
    Object.keys(row).forEach(key => {
      if (!standardFields.has(key) && key !== 'id' && key !== 'data') {
        dynamicFields.add(key);
      }
    });
    
    // Check fields in the data object
    if (row.data && typeof row.data === 'object') {
      Object.keys(row.data).forEach(key => {
        // Skip internal fields
        if (!key.startsWith('_') && key !== 'account' && key !== 'importedAt') {
          dynamicFields.add(key);
        }
      });
    }
  });
  
  return dynamicFields;
};

// Function to create columns for dynamic fields
const createDynamicColumns = (fields: Set<string>): Column[] => {
  return Array.from(fields).map(field => ({
    id: field,
    title: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1').trim(),
    type: 'text' as const,
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
  }));
};

export function EditableLeadsGrid() {
  // Get authentication state
  const { user } = useAuth();
  const { logCellEdit, logColumnAdd, logColumnDelete, logFilterChange } = useActivity();
    
  // Set up state for grid
  const [isGridReady, setIsGridReady] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<{ columns: string[], values: Record<string, unknown> }>({ columns: [], values: {} });
  
  // Add loading states for column operations
  const [columnOperationLoading, setColumnOperationLoading] = useState<{
    type: 'add' | 'delete' | 'rename' | 'hide' | 'unhide' | null;
    columnId?: string;
  }>({ type: null });
  
  // Add loading state for cell updates
  const [cellUpdateLoading, setCellUpdateLoading] = useState<Set<string>>(new Set());
  
  // Define columns for the grid - start with default columns, then load from storage
  const [columns, setColumns] = useState<Column[]>(getDefaultColumns);
  
  // State to track hidden columns for unhide functionality
  const [hiddenColumns, setHiddenColumns] = useState<Column[]>([]);
  
  // Add state for delete column dialog
  const [deleteColumnDialog, setDeleteColumnDialog] = useState<{
    isOpen: boolean;
    columnId: string;
    columnName: string;
  }>({
    isOpen: false,
    columnId: '',
    columnName: ''
  });
  
  // Add a force re-render state for when contacts are added
  const [forceRenderKey, setForceRenderKey] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20); // Default to 20 rows per page (optimized for desktop view)
  
  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  
  // Use the new instant contacts hook
  const {
    rows,
    loading,
    totalCount,
    isBackgroundLoading,
    loadedCount
  } = useInstantContacts({
    searchTerm: debouncedSearchTerm,
    pageSize,
    currentPage
  });
  
  // Keep the original hook for mutations only
  const { 
    updateCell,
    addContact,
    deleteContacts,
    refreshData
  } = useLeadsRows();

  // Calculate total pages based on filtered results
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilters]);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of grid when changing pages
    const gridElement = document.querySelector('.grid-components-container');
    if (gridElement) {
      gridElement.scrollTop = 0;
    }
  };
  
  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    // Reset to first page when changing page size
    setCurrentPage(1);
  };

  // Handle contact deletion
  const [isContactDeletionLoading, setIsContactDeletionLoading] = useState(false);
  
  const handleDeleteContacts = async (contactIds: string[]): Promise<void> => {
    setIsContactDeletionLoading(true);
    try {
      await deleteContacts(contactIds);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    } finally {
      setIsContactDeletionLoading(false);
    }
  };
  
  // Function to persist columns to both localStorage and Supabase
  const persistColumns = async (newColumns: Column[]) => {
    // Save to localStorage immediately
    saveColumnsToLocal(newColumns);
    
    // Save to Supabase if user is authenticated
    if (user) {
      await saveColumnsToSupabase(user, newColumns);
    }
  };
  
  // Resize handler extracted so it can be reused
  const handleResize = useCallback(() => {
    const isMobile = window.innerWidth < 768; // Standard mobile breakpoint
    const columnWidth = isMobile ? MOBILE_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH;

    setColumns(prevColumns =>
      prevColumns.map(col => {
        // On mobile, keep the Contact column at 120px; otherwise use 180px
        if (col.id === 'name') {
          return { ...col, width: isMobile ? 120 : 180 };
        }

        // Update all other columns to use the appropriate width
        return { ...col, width: columnWidth };
      })
    );
  }, []);
  
  // Set grid ready state when data is loaded
  useEffect(() => {
    if (!loading) {
      setIsGridReady(true);
    }
  }, [loading]);
  
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
        setForceRenderKey(prev => prev + 1);
        
        // Also force a column re-render
        setColumns(prevColumns => [...prevColumns]);
        
        // Refresh the data to ensure the new contact is visible
        refreshData();
      }
    };

    document.addEventListener("contact-added", handleContactAdded);
    document.addEventListener("contact-added-immediate", handleContactAddedImmediate as EventListener);

    return () => {
      document.removeEventListener("contact-added", handleContactAdded);
      document.removeEventListener("contact-added-immediate", handleContactAddedImmediate as EventListener);
    };
  }, [refreshData]);

  // Add dynamic columns based on imported data
  useEffect(() => {
    if (rows.length > 0) {
      const dynamicFields = extractDynamicFields(rows);
      const dynamicColumns = createDynamicColumns(dynamicFields);
      
      // Get current column IDs
      const currentColumnIds = new Set(columns.map(col => col.id));
      
      // Only add new dynamic columns that don't already exist
      const newColumns = dynamicColumns.filter(col => !currentColumnIds.has(col.id));
      
      if (newColumns.length > 0) {
        setColumns(prev => [...prev, ...newColumns]);
      }
    }
  }, [rows]); // Removed columns from dependencies to prevent re-renders

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
          
          setColumns(columnsWithRenderFunctions);
          // Adjust column widths to match the current viewport
          handleResize();
        }
      } catch (error) {
        logger.error('Error loading stored columns:', error);
        // Keep default columns on error
      } finally {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
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
            storedHiddenColumns = data.setting_value as Column[];
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
  
  // Handle cell edit
  const handleCellChange = async (rowId: string, columnId: string, value: any) => {
    const cellKey = `${rowId}-${columnId}`;
    
    // Add to loading set
    setCellUpdateLoading(prev => new Set(prev).add(cellKey));
    
    try {
      // Find the old value for activity logging
      const row = rows.find(r => r.id === rowId);
      const oldValue = row ? row[columnId] : null;
              
      // Save to Supabase through our hook
      await updateCell({ rowId, columnId, value });
          
      // Sync with mockContactsById
      const updatedRow = rows.find(r => r.id === rowId) || { id: rowId };
      updatedRow[columnId] = value;
      syncContact(updatedRow as GridRow);
      
      // Log the activity with contact name if available
      logCellEdit(
        rowId, 
        columnId, 
        value, 
        oldValue
      );
    } catch (error) {
      toast({
        title: "Error updating cell",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Remove from loading set
      setCellUpdateLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
    }
  };

  // Handle columns reordering
  const handleColumnsReorder = (columnIds: string[]) => {
    const newColumns = columns.map(col => ({
      ...col,
      order: columnIds.indexOf(col.id)
    })).sort((a, b) => a.order - b.order);
    
    setColumns(newColumns);
    
    // Persist the reordered columns
    persistColumns(newColumns);
    
    // Log the activity
    logFilterChange({ type: 'columns_reorder', columns: columnIds });
  };
  
  // Handle column deletion
  const handleDeleteColumn = async (columnId: string) => {
    // Don't delete the primary columns
    if (['name', 'status', 'company'].includes(columnId)) {
      toast({
        title: "Cannot delete primary column",
        description: "This column is required and cannot be removed.",
        variant: "destructive"
      });
      return;
    }
    
    // Find the column to get its name
    const column = columns.find(col => col.id === columnId);
    if (!column) return;
    
    // Show the confirmation dialog
    setDeleteColumnDialog({
      isOpen: true,
      columnId,
      columnName: column.title
    });
  };
  
  // Handle the actual deletion after confirmation
  const handleConfirmDeleteColumn = async () => {
    const { columnId, columnName } = deleteColumnDialog;
    
    // Close the dialog
    setDeleteColumnDialog({ isOpen: false, columnId: '', columnName: '' });
    
    // Set loading state
    setColumnOperationLoading({ type: 'delete', columnId });
    
    try {
      // Log the column deletion
      logColumnDelete(columnId, columnName);
      
      // Remove from columns array
      const newColumns = columns.filter(col => col.id !== columnId);
      setColumns(newColumns);
      
      // Remove column data from all rows
      const updatedRows = rows.map(row => {
        const { [columnId]: _, ...rest } = row;
        return rest;
      });
      
      // Update the rows in the database
      for (const row of updatedRows) {
        await updateCell({ rowId: row.id, columnId, value: undefined });
      }
      
      // Persist the column deletion
      await persistColumns(newColumns);
      
      toast({
        title: "Column deleted",
        description: `Successfully deleted column "${columnName}" and all its data`,
      });
    } catch (error) {
      toast({
        title: "Error deleting column",
        description: "Failed to delete the column. Please try again.",
        variant: "destructive"
      });
    } finally {
      setColumnOperationLoading({ type: null });
    }
  };
  
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
      
      setColumns(newColumns);
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
      
      setColumns(newColumns);
      
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
      setColumns(newColumns);
      
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
      
      setColumns(newColumns);
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
  const waitingForPageData = rows.length === 0 && isBackgroundLoading && 
    currentPage > Math.ceil(loadedCount / pageSize);
  
  if (waitingForPageData) {
    const percentage = Math.round((loadedCount / totalCount) * 100);
    const remainingContacts = totalCount - loadedCount;
    const estimatedSeconds = Math.ceil(remainingContacts / 1000 * 0.5); // ~0.5s per 1000 contacts
    const estimatedMinutes = Math.floor(estimatedSeconds / 60);
    const remainingSeconds = estimatedSeconds % 60;
    
    return (
      <div className="flex items-center justify-center h-full bg-gray-50/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-8 max-w-md w-full mx-4 transform transition-all animate-in fade-in-0 zoom-in-95 duration-300">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[#4ab4a7]/20 rounded-full animate-ping"></div>
              <div className="absolute inset-0 bg-[#4ab4a7]/10 rounded-full animate-pulse"></div>
              <Database className="h-8 w-8 text-[#4ab4a7] relative z-10" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Preloading contacts...</h3>
              <p className="text-sm text-gray-500 mt-0.5">Please wait while we load your data</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Custom progress bar with moving pill */}
            <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
              {/* Filled progress background */}
              <div 
                className="absolute inset-y-0 left-0 bg-[#4ab4a7] transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
              
              {/* Moving percentage pill */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-300 ease-out"
                style={{ left: `calc(${percentage}% - ${percentage > 95 ? '60px' : percentage < 5 ? '0px' : '30px'})` }}
              >
                <div className="bg-white px-3 py-1 rounded-full shadow-md border border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">{percentage}%</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-gray-900 font-medium">{loadedCount.toLocaleString()}</span>
                <span className="text-gray-500"> of </span>
                <span className="text-gray-900 font-medium">{totalCount.toLocaleString()}</span>
                <span className="text-gray-500"> contacts</span>
              </div>
              {estimatedSeconds > 0 && (
                <div className="text-gray-500">
                  ~{estimatedMinutes > 0 ? `${estimatedMinutes}m ${remainingSeconds}s` : `${remainingSeconds}s`} remaining
                </div>
              )}
            </div>
            
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                💡 Tip: You can navigate to other pages while contacts load in the background
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Remove the special empty state handling - pagination should always be shown
  
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-hidden relative">
        <GridViewContainer 
          key={`grid-${rows.length}-${rows[0]?.id || 'empty'}-${forceRenderKey}`} // Force re-render when rows change
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
          onSearchChange={setSearchTerm}
          searchTerm={searchTerm}
          activeFilters={activeFilters}
          onApplyFilters={setActiveFilters}
          className="h-full"
          columnOperationLoading={columnOperationLoading}
          cellUpdateLoading={cellUpdateLoading}
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

