import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GridViewContainer } from '@/components/grid-view/GridViewContainer';
import { Column, GridRow } from '@/components/grid-view/types';
import { 
  DEFAULT_COLUMN_WIDTH,
  ROW_HEIGHT,
  INDEX_COLUMN_WIDTH
} from '@/components/grid-view/grid-constants';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
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
  
  // Add a global listener for mockContactsByIdUpdated event
  useEffect(() => {
    // Create a custom event for notifying grid about mockContactsById updates
    const handleMockContactsUpdate = () => {
      // Force a refresh of rows by getting the latest mockContactsById data
      console.log("Mock contacts updated event received in grid");
      
      // Create a collection of all row IDs for easy lookup
      const rowIds = new Set(rows.map(row => row.id));
      
      // Synchronize with mockContactsById
      Object.entries(mockContactsById).forEach(([id, contact]) => {
        if (rowIds.has(id)) {
          // This contact exists in our rows, update it properly
          const row = rows.find(r => r.id === id);
          if (row) {
            // Create a batch of updates to apply at once
            const updates: {rowId: string, columnId: string, value: any}[] = [];
            
            // Check and queue all potential updates
            if (row.opportunity !== contact.name) {
              updates.push({ rowId: id, columnId: 'opportunity', value: contact.name });
            }
            if (row.email !== contact.email) {
              updates.push({ rowId: id, columnId: 'email', value: contact.email });
            }
            if (row.status !== contact.leadStatus) {
              updates.push({ rowId: id, columnId: 'status', value: contact.leadStatus });
            }
            if (row.companyName !== contact.company) {
              updates.push({ rowId: id, columnId: 'companyName', value: contact.company });
            }
            if (row.jobTitle !== contact.jobTitle) {
              updates.push({ rowId: id, columnId: 'jobTitle', value: contact.jobTitle });
            }
            if (row.industry !== contact.industry) {
              updates.push({ rowId: id, columnId: 'industry', value: contact.industry });
            }
            if (row.phone !== contact.phone) {
              updates.push({ rowId: id, columnId: 'phone', value: contact.phone });
            }
            if (row.primaryLocation !== contact.primaryLocation) {
              updates.push({ rowId: id, columnId: 'primaryLocation', value: contact.primaryLocation });
            }
            if (row.facebook !== contact.facebook) {
              updates.push({ rowId: id, columnId: 'facebook', value: contact.facebook });
            }
            if (row.instagram !== contact.instagram) {
              updates.push({ rowId: id, columnId: 'instagram', value: contact.instagram });
            }
            if (row.linkedIn !== contact.linkedIn) {
              updates.push({ rowId: id, columnId: 'linkedIn', value: contact.linkedIn });
            }
            if (row.twitter !== contact.twitter) {
              updates.push({ rowId: id, columnId: 'twitter', value: contact.twitter });
            }
            if (row.associatedDeals !== contact.associatedDeals) {
              updates.push({ rowId: id, columnId: 'associatedDeals', value: contact.associatedDeals });
            }
            if (row.owner !== contact.owner) {
              updates.push({ rowId: id, columnId: 'owner', value: contact.owner });
            }
            if (row.source !== contact.source) {
              updates.push({ rowId: id, columnId: 'source', value: contact.source });
            }
            if (row.description !== contact.description) {
              updates.push({ rowId: id, columnId: 'description', value: contact.description });
            }
            if (row.website !== contact.website) {
              updates.push({ rowId: id, columnId: 'website', value: contact.website });
            }
            
            // Apply all updates in sequence with small delays to ensure they all get processed
            if (updates.length > 0) {
              updates.forEach((update, index) => {
                setTimeout(() => {
                  updateCell(update);
                }, index * 50); // Small delay between updates
              });
            }
          }
        }
      });
    };
    
    // Listen for the custom event
    window.addEventListener('mockContactsUpdated', handleMockContactsUpdate);
    
    // Initial sync on mount
    handleMockContactsUpdate();
    
    return () => {
      window.removeEventListener('mockContactsUpdated', handleMockContactsUpdate);
    };
  }, [rows, updateCell]);
  
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
  
  // Enhanced synchronization between stream view and grid view
  useEffect(() => {
    // Add a handler for contact data changes
    const handleContactChange = (event: CustomEvent) => {
      const { contactId, field, value } = event.detail;
      console.log(`Contact updated: ${contactId}, ${field}=${value}`);
      
      // Find row with matching contactId
      const rowToUpdate = rows.find(row => row.id === contactId);
      if (rowToUpdate) {
        // Map from contact field names to grid column names
        const fieldMapping: Record<string, string> = {
          'name': 'opportunity',
          'company': 'companyName',
          'leadStatus': 'status',
          // Add all other field mappings to ensure proper sync
          'email': 'email',
          'jobTitle': 'jobTitle',
          'industry': 'industry',
          'phone': 'phone',
          'primaryLocation': 'primaryLocation',
          'facebook': 'facebook',
          'instagram': 'instagram',
          'linkedin': 'linkedIn',
          'twitter': 'twitter',
          'website': 'website',
          'associatedDeals': 'associatedDeals',
          'owner': 'owner',
          'source': 'source',
          'description': 'description'
        };
        
        // Get the corresponding column id
        const columnId = fieldMapping[field];
        if (columnId) {
          // Update the cell
          updateCell({ rowId: contactId, columnId, value });
          console.log(`Updated grid cell: ${contactId}.${columnId} = ${value}`);
        }
      }
    };
    
    // Listen for custom event with stronger typing
    window.addEventListener('mockContactsUpdated', 
      ((e: CustomEvent) => handleContactChange(e)) as EventListener
    );
    
    return () => {
      window.removeEventListener('mockContactsUpdated', 
        ((e: CustomEvent) => handleContactChange(e)) as EventListener
      );
    };
  }, [rows, updateCell]);
  
  // Show loading message during initial data load
  if (isLoading) {
    return <div className="p-4 text-center">Loading leads data...</div>;
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
