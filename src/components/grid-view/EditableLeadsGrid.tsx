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
import { mockContactsById, generateDummyLeads } from '@/components/stream/sample-data';
import { Button } from '@/components/ui/button';
import { PAGE_SIZE, LEADS_STORAGE_KEY } from '@/constants/grid';
import { useAuth } from '@/contexts/AuthContext';
import { useLeadsRows } from '@/hooks/supabase/use-leads-rows';
import { toast } from '@/components/ui/use-toast';

// Sync a row with the mockContactsById mapping
const syncContact = (row: GridRow): void => {
  if (!mockContactsById[row.id]) {
    // Create a new contact object if it doesn't exist
    mockContactsById[row.id] = { 
      id: row.id,
      name: row.opportunity || '—',
      email: row.email || '—',
    };
  }
  
  // Update the contact object with row values
  mockContactsById[row.id] = {
    ...mockContactsById[row.id],
    name: row.opportunity || '—',
    email: row.email || '—',
    company: row.companyName || '—',
    owner: row.owner || '—',
    opportunity: row.opportunity || '—',
    leadStatus: row.status,
    revenue: row.revenue,
    description: row.description || '—',
    jobTitle: row.jobTitle || '—', 
    industry: row.industry || '—',
    phone: row.phone || '—',
    primaryLocation: row.primaryLocation || '—',
    facebook: row.facebook || '—',
    instagram: row.instagram || '—',
    linkedIn: row.linkedIn || '—',
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
  
  // Use our leads rows hook for Supabase persistence
  const { rows, isLoading, updateCell } = useLeadsRows();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isGridReady, setIsGridReady] = useState(false);
  
  // Prevent any rendering of data until fully processed and sorted
  const [processedRows, setProcessedRows] = useState<GridRow[]>([]);
    
  // Process and sort rows once data is loaded
  useEffect(() => {
    if (!isLoading && rows.length > 0) {
      // Deep clone rows to avoid reference issues
      const rowsToProcess = JSON.parse(JSON.stringify(rows));
      
      // Sync contacts
      rowsToProcess.forEach(syncContact);
      
      // Allow the browser to breathe before showing the grid
      const timer = setTimeout(() => {
        setProcessedRows(rowsToProcess);
        setIsGridReady(true);
      }, 500); // Increase to 500ms for more reliable loading
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, rows]);
    
  // Handle case where no data exists by generating dummy data
  useEffect(() => {
    if (!isLoading && rows.length === 0) {
      // Generate dummy leads if no data exists
    const dummyLeads = generateDummyLeads();
    
      // Create rows for each dummy lead
      dummyLeads.forEach(lead => {
        const rowData: GridRow = {
      id: lead.id,
      opportunity: lead.name,
      status: lead.status || ['New', 'In Progress', 'On Hold', 'Closed Won', 'Closed Lost'][Math.floor(Math.random() * 5)],
      revenue: lead.revenue || Math.floor(Math.random() * 100000),
      closeDate: lead.closeDate || new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      owner: lead.owner || lead.name?.split(' ')[0] || '',
      website: lead.website || 'https://example.com',
      companyName: lead.company || `Company ${lead.id.split('-')[1]}`,
          linkedIn: lead.linkedIn || 'linkedin.com/in/example',
      employees: lead.employees || Math.floor(Math.random() * 1000),
      lastContacted: lead.lastContacted || new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      email: lead.email,
          description: lead.description || `Description for ${lead.name}`,
          jobTitle: lead.jobTitle || 'Manager',
          industry: lead.industry || 'Technology',
          phone: lead.phone || '+1-555-123-4567',
          primaryLocation: lead.location || 'New York, NY',
          facebook: lead.facebook || 'facebook.com/example',
          instagram: lead.instagram || 'instagram.com/example',
          twitter: lead.twitter || 'twitter.com/example',
          associatedDeals: lead.associatedDeals || 'Deal 1, Deal 2',
          source: lead.source || 'Website',
        };
  
        // Add row to storage
        updateCell({ rowId: rowData.id, columnId: 'opportunity', value: rowData.opportunity });
      });
    }
  }, [isLoading, rows, updateCell]);
  
  // Filter rows based on search term (use processed rows instead)
  const filteredRows = processedRows.filter(row => {
    if (!searchTerm) return true;
  
    // Search across all columns
    return Object.entries(row).some(([key, value]) => {
      if (key === 'id' || !value) return false;
      return String(value).toLowerCase().includes(searchTerm.toLowerCase());
    });
  });
  
  // Define columns for the grid - with opportunity column marked as frozen
  const [columns, setColumns] = useState<Column[]>([
    {
      id: 'opportunity',
      title: 'Contacts',
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
      id: 'companyName',
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
      id: 'linkedIn',
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
          if (col.id === 'opportunity') {
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
  
  // Handle cell value changes - update Supabase and sync with mockContactsById
  const handleCellChange = (rowId: string, columnId: string, value: any) => {
    // Update cell in Supabase or localStorage
    updateCell({ rowId, columnId, value });
      
    // Update mockContactsById for Stream View integrity
      const row = rows.find(r => r.id === rowId);
      if (row) {
        const updatedRow = { ...row, [columnId]: value };
        syncContact(updatedRow);
    }
  };

  // Handle column updates (width, title, etc)
  const handleColumnChange = (columnId: string, updates: Partial<Column>) => {
    setColumns(prev => 
      prev.map(col => 
        col.id === columnId 
          ? { ...col, ...updates }
          : col
      )
    );
  };
  
  // Handle column reordering
  const handleColumnsReorder = (columnIds: string[]) => {
    const reorderedColumns: Column[] = columnIds.map(
      id => columns.find(col => col.id === id)!
    );
    setColumns(reorderedColumns);
  };
  
  // Handle column deletion
  const handleDeleteColumn = (columnId: string) => {
    if (columnId === 'opportunity') return; // Protect the opportunity column
    setColumns(prev => prev.filter(col => col.id !== columnId));
  };
  
  // Handle adding a new column
  const handleAddColumn = (afterColumnId: string) => {
    // Don't allow adding columns after lastContacted
    if (afterColumnId === 'lastContacted') {
      console.log("Cannot add columns after lastContacted");
      return;
    }
    
    // Log for debugging
    console.log(`Adding column after: ${afterColumnId}`);
    
    // Check if adding before lastContacted
    const lastContactedIdx = columns.findIndex(col => col.id === 'lastContacted');
    const afterColumnIdx = columns.findIndex(col => col.id === afterColumnId);
    
    // Don't allow adding columns that would push lastContacted further right
    if (lastContactedIdx >= 0 && afterColumnIdx >= lastContactedIdx) {
      console.log("Cannot add columns that would push lastContacted further right");
      return;
    }
    
    // Set width based on screen size
    const isMobile = window.innerWidth < 768;
    const columnWidth = isMobile ? MOBILE_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH;
    
    // Always use width based on screen size for new columns
    const newColumn: Column = {
      id: uuidv4(),
      title: `New Column`,
      type: 'text',
      width: columnWidth, // Use screen size responsive width
      editable: true
    };
    
    // Add the column at the right position
    setColumns(prevColumns => {
      const afterColumnIndex = prevColumns.findIndex(col => col.id === afterColumnId);
    
      // If column found in the list
      if (afterColumnIndex >= 0) {
        // Simple insertion after the target column
        let result = [...prevColumns];
        result.splice(afterColumnIndex + 1, 0, newColumn);
        return result;
      }
      
      // Fallback - add at beginning (after opportunity)
      const opportunityIndex = prevColumns.findIndex(col => col.id === 'opportunity');
      if (opportunityIndex >= 0) {
        let result = [...prevColumns];
        result.splice(opportunityIndex + 1, 0, newColumn);
        return result;
      }
      
      return [...prevColumns, newColumn];
    });
  };
  
  // Show better loading UI to cover any potential flash
  if (isLoading || !isGridReady) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <div className="text-lg text-gray-600">Loading contacts...</div>
      </div>
    );
  }
  
  // Show empty state when there are no rows
  if (rows.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Banner to restore test data */}
        <div className="bg-yellow-100 p-3 mb-2 flex justify-between items-center">
          <span className="text-sm">No contacts. Restore test data?</span>
          <button
            className="bg-[#33B9B0] hover:bg-[#2aa39b] text-white px-3 py-1 rounded text-sm"
            onClick={() => {
              // Generate dummy leads and add them
              const dummyLeads = generateDummyLeads(5); // Just create 5 test contacts
              
              // Add them to the system
              dummyLeads.forEach(lead => {
                const rowData: GridRow = {
                  id: lead.id,
                  opportunity: lead.name,
                  status: lead.status || 'New',
                  // Add other required fields
                  email: lead.email,
                  companyName: lead.company || '',
                  linkedIn: lead.linkedIn || 'linkedin.com/in/example',
                  // Fill in additional fields
                };
                
                // Use existing updateCell function to add the contact
                updateCell({ rowId: rowData.id, columnId: 'opportunity', value: rowData.opportunity });
              });
              
              // Refresh to show the new data
              setTimeout(() => window.location.reload(), 500);
            }}
          >
            Restore Test Data
          </button>
        </div>
        
        {/* Empty state UI */}
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="64" 
            height="64" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-gray-300 mb-4"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <h3 className="text-lg font-medium mb-2 text-gray-700">No contacts added yet</h3>
          <a 
            href="#" 
            className="text-[#33B9B0] hover:underline"
            onClick={(e) => {
              e.preventDefault();
              // Open the Add Contact dialog - we'll reuse the existing functionality
              const addContactButton = document.querySelector('[aria-label="Add Contact"]') as HTMLButtonElement;
              if (addContactButton) {
                addContactButton.click();
              }
            }}
          >
            Add new contact
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full">
      <GridViewContainer 
        columns={columns} 
        data={filteredRows}
        listName="All Leads"
        listType="Lead"
        listId="leads-grid"
        firstRowIndex={0}
        onCellChange={handleCellChange}
        onColumnChange={handleColumnChange}
        onColumnsReorder={handleColumnsReorder}
        onDeleteColumn={handleDeleteColumn}
        onAddColumn={handleAddColumn}
        onSearchChange={setSearchTerm}
        searchTerm={searchTerm}
        className="h-full"
      />
    </div>
  );
}
