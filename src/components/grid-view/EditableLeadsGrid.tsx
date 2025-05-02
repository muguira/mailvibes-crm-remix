
import React, { useState, useEffect } from 'react';
import { NewGridView } from '@/components/grid-view/new-grid-view';
import { Column, GridRow } from '@/components/grid-view/types';
import { DEFAULT_COLUMN_WIDTH } from '@/components/grid-view/grid-constants';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { mockContactsById, generateDummyLeads, LeadContact } from '@/components/stream/sample-data';
import { Button } from '@/components/ui/button';
import { PAGE_SIZE, LEADS_STORAGE_KEY } from '@/constants/grid';
import { useGridData } from '@/hooks/supabase/use-grid-data';
import { useAuth } from '@/contexts/AuthContext';

// Fallback function to load rows from localStorage when not authenticated
const loadRowsFromLocalStorage = (): GridRow[] => {
  try {
    const savedRows = localStorage.getItem(LEADS_STORAGE_KEY);
    if (savedRows) {
      const parsedRows = JSON.parse(savedRows);
      if (Array.isArray(parsedRows) && parsedRows.length > 0) {
        return parsedRows;
      }
    }
  } catch (error) {
    console.error('Failed to load rows from localStorage:', error);
  }
  return [];
};

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
  };
};

export function EditableLeadsGrid() {
  // Get authentication state
  const { user } = useAuth();
  const listId = 'leads-grid';
  
  // Use Supabase grid data hook when authenticated
  const { gridData, isLoading, saveGridChange } = useGridData(listId);
  
  // Component state
  const [localRows, setLocalRows] = useState<GridRow[]>(() => {
    const stored = loadRowsFromLocalStorage();
    if (stored.length) return stored;
    
    // Generate dummy data for first load
    const dummyLeads = generateDummyLeads();
    
    // Convert to GridRow format
    const dummyRows = dummyLeads.map(lead => ({
      id: lead.id,
      opportunity: lead.name,
      status: lead.status || ['New', 'In Progress', 'On Hold', 'Closed Won', 'Closed Lost'][Math.floor(Math.random() * 5)],
      revenue: lead.revenue || Math.floor(Math.random() * 100000),
      closeDate: lead.closeDate || new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      owner: lead.owner || lead.name?.split(' ')[0] || '',
      website: lead.website || 'https://example.com',
      companyName: lead.company || `Company ${lead.id.split('-')[1]}`,
      linkedIn: 'https://linkedin.com/company/example',
      employees: lead.employees || Math.floor(Math.random() * 1000),
      lastContacted: lead.lastContacted || new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      email: lead.email,
    }));
    
    // Save to localStorage as fallback
    try {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(dummyRows));
    } catch (error) {
      console.error('Failed to save initial rows to localStorage:', error);
    }
    
    return dummyRows;
  });
  
  const [page, setPage] = useState(0);
  
  // Determine which data source to use (Supabase or localStorage)
  const rows = user && gridData.length > 0 ? gridData : localRows;
  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  
  // Calculate the index of the first row on current page
  const firstRowIndex = page * PAGE_SIZE;
  
  // Get rows for current page
  const paginated = rows.slice(firstRowIndex, firstRowIndex + PAGE_SIZE);
  
  // Keep localStorage and mockContactsById in sync when rows change
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(localRows));
      } catch (error) {
        console.error('Failed to save rows to localStorage:', error);
      }
      localRows.forEach(syncContact);
    }
  }, [localRows, user]);
  
  // Sync mockContactsById with Supabase data when available
  useEffect(() => {
    if (user && gridData.length > 0) {
      gridData.forEach(syncContact);
    }
  }, [gridData, user]);
  
  // Define columns for the grid
  const [columns, setColumns] = useState<Column[]>([
    {
      id: 'opportunity',
      title: 'Opportunity',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
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
      title: 'Status',
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
      id: 'email',
      title: 'Email',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
    {
      id: 'companyName',
      title: 'Company Name',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
    {
      id: 'employees',
      title: 'Employees',
      type: 'number',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
    {
      id: 'lastContacted',
      title: 'Last Contacted',
      type: 'date',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
    {
      id: 'streamLink',
      title: '',
      type: 'custom',
      width: 60,
      editable: false,
      renderCell: (_, row) => (
        <div className="flex justify-center hidden sm:flex">
          <Link 
            to={`/stream-view/${row.id}`} 
            className="text-gray-500 hover:text-primary"
            aria-label="Open in Stream View"
          >
            <ExternalLink size={16} />
          </Link>
        </div>
      ),
    }
  ]);
  
  // Handle cell value changes
  const handleCellChange = (rowId: string, columnId: string, value: any) => {
    if (user) {
      // When authenticated, save to Supabase
      saveGridChange({
        rowId,
        colKey: columnId,
        value
      });
      
      // Also update the local state mockContactsById
      const row = rows.find(r => r.id === rowId);
      if (row) {
        const updatedRow = { ...row, [columnId]: value };
        syncContact(updatedRow);
      }
    } else {
      // When not authenticated, use localStorage
      // Store the current ID before update (needed for ID changes)
      const currentRow = localRows.find(row => row.id === rowId);
      if (!currentRow) return;
      
      const oldId = currentRow.id;
      const isIdChange = columnId === 'id';
      
      // Update the row with the new value
      setLocalRows(prevRows => {
        const updatedRows = prevRows.map(row => {
          // If this is the row we're updating
          if (row.id === rowId) {
            const updatedRow = { ...row, [columnId]: value };
            
            // If we're changing the ID, update it
            if (isIdChange) {
              updatedRow.id = value;
            }
            
            return updatedRow;
          }
          return row;
        });
        
        // Sync with mockContactsById
        const updatedRow = updatedRows.find(row => {
          return isIdChange ? row.id === value : row.id === rowId;
        });
        
        if (updatedRow) {
          // Handle ID change
          if (isIdChange && value !== oldId) {
            // Create entry for new ID
            syncContact(updatedRow);
            
            // Check if old ID is still used by any row
            const oldIdStillUsed = updatedRows.some(row => row.id === oldId);
            if (!oldIdStillUsed) {
              // If old ID no longer used, remove it from mapping
              delete mockContactsById[oldId];
            }
          } else {
            // Regular update
            syncContact(updatedRow);
          }
        }
        
        return updatedRows;
      });
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
    const newColumnId = `column-${uuidv4()}`;
    const newColumn: Column = {
      id: newColumnId,
      title: 'New Column',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    };
    
    const afterColumnIndex = columns.findIndex(col => col.id === afterColumnId);
    
    setColumns(prev => [
      ...prev.slice(0, afterColumnIndex + 1),
      newColumn,
      ...prev.slice(afterColumnIndex + 1)
    ]);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Grid with paginated data */}
      <NewGridView 
        columns={columns} 
        data={paginated}
        listName="All Leads"
        listType="Lead"
        listId="leads-grid"
        onCellChange={handleCellChange}
        onColumnChange={handleColumnChange}
        onColumnsReorder={handleColumnsReorder}
        onDeleteColumn={handleDeleteColumn}
        onAddColumn={handleAddColumn}
      />
      
      {/* Sticky pager UI at the bottom */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-slate-light flex items-center justify-end gap-2 px-4 py-2">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={page === 0} 
          onClick={() => setPage(p => p - 1)}
        >
          Prev
        </Button>
        <span className="px-2 flex items-center text-sm">
          Page <b>{page + 1}</b> of {pageCount}
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={page >= pageCount-1} 
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
