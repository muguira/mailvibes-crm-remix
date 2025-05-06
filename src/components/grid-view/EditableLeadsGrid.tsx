import React, { useState, useEffect } from 'react';
import { GridViewContainer } from '@/components/grid-view/GridViewContainer';
import { Column, GridRow } from '@/components/grid-view/types';
import { DEFAULT_COLUMN_WIDTH } from '@/components/grid-view/grid-constants';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { mockContactsById, generateDummyLeads } from '@/components/stream/sample-data';
import { Button } from '@/components/ui/button';
import { PAGE_SIZE, LEADS_STORAGE_KEY } from '@/constants/grid';
import { useAuth } from '@/contexts/AuthContext';
import { useLeadsRows } from '@/hooks/supabase/use-leads-rows';

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
  
  // Use our leads rows hook for Supabase persistence
  const { rows, isLoading, updateCell } = useLeadsRows();
  
  const [searchTerm, setSearchTerm] = useState('');
  
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
          linkedIn: 'https://linkedin.com/company/example',
          employees: lead.employees || Math.floor(Math.random() * 1000),
          lastContacted: lead.lastContacted || new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          email: lead.email,
        };
    
        // Add row to storage
        updateCell({ rowId: rowData.id, columnId: 'opportunity', value: rowData.opportunity });
      });
    }
  }, [isLoading, rows, updateCell]);
  
  // Filter rows based on search term
  const filteredRows = rows.filter(row => {
    if (!searchTerm) return true;
    
    // Search across all columns
    return Object.entries(row).some(([key, value]) => {
      if (key === 'id' || !value) return false;
      return String(value).toLowerCase().includes(searchTerm.toLowerCase());
    });
  });
  
  // Sync mockContactsById with row data
  useEffect(() => {
    rows.forEach(syncContact);
  }, [rows]);
  
  // Define columns for the grid - with opportunity column marked as frozen
  const [columns, setColumns] = useState<Column[]>([
    {
      id: 'opportunity',
      title: 'Contacts',
      type: 'text',
      width: 180, // Changed from DEFAULT_COLUMN_WIDTH + 40 to exactly 180px
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
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true
    },
  ]);
  
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
    
    // Always use a fixed width of 180px for new columns
    const newColumn: Column = {
      id: uuidv4(),
      title: `New Column`,
      type: 'text',
      width: 180, // Explicit 180px, not using DEFAULT_COLUMN_WIDTH
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
  
  // Show loading message during initial data load
  if (isLoading) {
    return <div className="p-4 text-center">Loading leads data...</div>;
  }
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Grid with all filtered rows */}
      <div className="h-full overflow-hidden grid-container">
        <GridViewContainer 
          columns={columns} 
          data={filteredRows} // Use all filtered rows instead of paginated subset
          listName="All Leads"
          listType="Lead"
          listId="leads-grid"
          firstRowIndex={0} // Always start from 0 since we're showing all rows
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
    </div>
  );
}
