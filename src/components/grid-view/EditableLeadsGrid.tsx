import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GridViewContainer } from '@/components/grid-view/GridViewContainer';
import { Column, GridRow } from '@/components/grid-view/types';
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
import { useAuth } from '@/contexts/AuthContext';
import { useLeadsRows } from '@/hooks/supabase/use-leads-rows';
import { toast } from '@/components/ui/use-toast';
import { useActivity } from "@/contexts/ActivityContext";

// Sync a row with the mockContactsById mapping
const syncContact = (row: GridRow): void => {
  if (!mockContactsById[row.id]) {
    // Create a new contact object if it doesn't exist
    mockContactsById[row.id] = { 
      id: row.id,
      name: row.name || '—',
      email: row.email || '—',
    };
  }
  
  // Update the contact object with row values
  mockContactsById[row.id] = {
    ...mockContactsById[row.id],
    name: row.name || '—',
    email: row.email || '—',
    company: row.company || '—',
    owner: row.owner || '—',
    leadStatus: row.status,
    revenue: row.revenue,
    description: row.description || '—',
    jobTitle: row.jobTitle || '—', 
    industry: row.industry || '—',
    phone: row.phone || '—',
    primaryLocation: row.primaryLocation || '—',
    facebook: row.facebook || '—',
    instagram: row.instagram || '—',
    linkedIn: row.linkedin || '—',
    twitter: row.twitter || '—',
    website: row.website || '—',
    associatedDeals: row.associatedDeals || '—',
    source: row.source || '—',
  };
};

// Create a reusable social link renderer function
const renderSocialLink = (value: any, row: any) => {
  if (!value || value === '—') return value;
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

export function EditableLeadsGrid() {
  // Get authentication state
  const { user } = useAuth();
  const { logCellEdit, logColumnAdd, logColumnDelete, logFilterChange } = useActivity();
  
  // Set up state for grid
  const [isGridReady, setIsGridReady] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use our custom hook for leads data
  const { 
    rows, 
    loading, 
    PAGE_SIZE,
    updateCell,
    addContact,
    refreshData
  } = useLeadsRows();
  
  // Set grid ready state when data is loaded
  useEffect(() => {
    if (!loading) {
      setIsGridReady(true);
    }
  }, [loading]);

  // Listen for contact-added events to refresh the grid
  useEffect(() => {
    const handleContactAdded = (event: Event) => {
      // Force refresh of the data
      refreshData();
    };

    // Add event listener
    document.addEventListener('contact-added', handleContactAdded);

    // Clean up
    return () => {
      document.removeEventListener('contact-added', handleContactAdded);
    };
  }, [refreshData]);
  
  // Define columns for the grid - with opportunity column marked as frozen
  const [columns, setColumns] = useState<Column[]>([
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
      id: 'status',
      title: 'Lead Status',
      type: 'status',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
      options: ['New', 'In Progress', 'On Hold', 'Closed Won', 'Closed Lost'],
      colors: {
        'New': '#F2FCE2',
        'In Progress': '#D3E4FD',
        'On Hold': '#FEF7CD',
        'Closed Won': '#F2FCE2',
        'Closed Lost': '#FFDEE2',
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
    {
      id: 'website',
      title: 'Website',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
      renderCell: renderSocialLink,
    },
  ]);
  
  // Add effect to adjust column widths based on screen size
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768; // Standard mobile breakpoint
      const columnWidth = isMobile ? MOBILE_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH;
      
      setColumns(prevColumns => {
        return prevColumns.map(col => {
          // For mobile, set contacts/opportunity column to 130px, otherwise keep at 180px
          if (col.id === 'name') {
            return { ...col, width: isMobile ? 130 : 180 };
          }
          
          // Update all other columns to use the appropriate width
          return { ...col, width: columnWidth };
        });
      });
    };
    
    // Initial call
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Handle cell edit
  const handleCellChange = (rowId: string, columnId: string, value: any) => {
    // Find the old value for activity logging
    const row = rows.find(r => r.id === rowId);
    const oldValue = row ? row[columnId] : null;
    
    // Save to Supabase through our hook
    updateCell({ rowId, columnId, value });
    
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
  };

  // Handle columns reordering
  const handleColumnsReorder = (columnIds: string[]) => {
    setColumns(columns.map(col => ({
      ...col,
      order: columnIds.indexOf(col.id)
    })).sort((a, b) => a.order - b.order));
    
    // Log the activity
    logFilterChange({ type: 'columns_reorder', columns: columnIds });
  };

  // Handle column deletion
  const handleDeleteColumn = (columnId: string) => {
    // Don't delete the primary columns
    if (['name', 'status', 'company'].includes(columnId)) {
      toast({
        title: "Cannot delete primary column",
        description: "This column is required and cannot be removed.",
        variant: "destructive"
      });
      return;
    }
    
    // Log the column deletion
    const column = columns.find(col => col.id === columnId);
    if (column) {
      logColumnDelete(columnId, column.title);
    }
    
    // Remove from columns array
    setColumns(columns.filter(col => col.id !== columnId));
  };

  // Handle adding a new column
  const handleAddColumn = (afterColumnId: string) => {
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
    setColumns([
      ...columns.slice(0, afterIndex + 1),
      newColumn,
      ...columns.slice(afterIndex + 1)
    ]);
  };
  
  // Show better loading UI to cover any potential flash
  if (loading || !isGridReady) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <div className="text-lg text-gray-600">Loading contacts...</div>
      </div>
    );
  }
  
  // Show empty state when there are no rows - GridViewContainer now has its own empty state UI
  if (rows.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Empty state is now handled by GridViewContainer */}
        <GridViewContainer
          columns={columns}
          data={[]}
          listName="Contacts"
          onCellChange={handleCellChange}
          onColumnsReorder={handleColumnsReorder}
          onAddColumn={handleAddColumn}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>
    );
  }
  
  return (
    <div className="h-full w-full">
      <GridViewContainer 
        columns={columns} 
        data={rows}
        listName="All Leads"
        listType="Lead"
        listId="leads-grid"
        firstRowIndex={0}
        onCellChange={handleCellChange}
        onColumnsReorder={handleColumnsReorder}
        onAddColumn={handleAddColumn}
        onSearchChange={setSearchTerm}
        searchTerm={searchTerm}
        className="h-full"
      />
    </div>
  );
}
