import React, { useState, useEffect } from 'react';
import { NewGridView } from '@/components/grid-view/new-grid-view';
import { Column, GridRow } from '@/components/grid-view/types';
import { DEFAULT_COLUMN_WIDTH } from '@/components/grid-view/grid-constants';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { mockContactsById } from '@/components/stream/sample-data';

// Storage key for persisting data
const STORAGE_KEY = 'leadsRows-v1';

// Generate sample row data
const generateRow = (i: number): GridRow => ({
  id: `row-${uuidv4()}`,
  opportunity: `Opportunity ${i}`,
  status: ['New', 'In Progress', 'On Hold', 'Closed Won', 'Closed Lost'][Math.floor(Math.random() * 5)],
  revenue: Math.floor(Math.random() * 100000),
  closeDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  owner: ['John Doe', 'Jane Smith', 'Robert Johnson'][Math.floor(Math.random() * 3)],
  website: 'https://example.com',
  companyName: `Company ${i}`,
  linkedIn: 'https://linkedin.com/company/example',
  employees: Math.floor(Math.random() * 1000),
  lastContacted: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  email: `contact${i}@example.com`,
});

// Generate default sample data
const generateSampleData = (count: number): GridRow[] => {
  return Array.from({ length: count }, (_, i) => generateRow(i));
};

// Load rows from localStorage
const loadRows = (): GridRow[] => {
  try {
    const savedRows = localStorage.getItem(STORAGE_KEY);
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

// Save rows to localStorage
const saveRows = (rows: GridRow[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (error) {
    console.error('Failed to save rows to localStorage:', error);
  }
};

// Sync a row with the mockContactsById mapping
const syncContactWithRow = (row: GridRow): void => {
  if (!mockContactsById[row.id]) {
    // Create a new contact object if it doesn't exist
    mockContactsById[row.id] = { 
      id: row.id,
      activities: []
    };
  }
  
  // Update the contact object with row values
  mockContactsById[row.id] = {
    ...mockContactsById[row.id],
    name: row.opportunity || '—',
    email: row.email || '—',
    company: row.companyName || '—',
    owner: row.owner || '—',
  };
};

export function EditableLeadsGrid() {
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
  
  // Initialize rows state with localStorage data or sample data
  const [rows, setRows] = useState<GridRow[]>(() => {
    const loadedRows = loadRows();
    if (loadedRows.length > 0) {
      return loadedRows;
    }
    // Default to sample data if nothing in localStorage
    return generateSampleData(10);
  });

  // Keep localStorage and mockContactsById in sync when rows change
  useEffect(() => {
    rows.forEach(syncContactWithRow);
    saveRows(rows);
  }, [rows]);
  
  // Handle cell value changes
  const handleCellChange = (rowId: string, columnId: string, value: any) => {
    // Store the current ID before update (needed for ID changes)
    const currentRow = rows.find(row => row.id === rowId);
    if (!currentRow) return;
    
    const oldId = currentRow.id;
    const isIdChange = columnId === 'id';
    
    // Update the row with the new value
    setRows(prevRows => {
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
          syncContactWithRow(updatedRow);
          
          // Check if old ID is still used by any row
          const oldIdStillUsed = updatedRows.some(row => row.id === oldId);
          if (!oldIdStillUsed) {
            // If old ID no longer used, remove it from mapping
            delete mockContactsById[oldId];
          }
        } else {
          // Regular update
          syncContactWithRow(updatedRow);
        }
      }
      
      return updatedRows;
    });
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
    <NewGridView 
      columns={columns} 
      data={rows}
      listName="All Opportunities"
      listType="Opportunity"
      listId="opportunities-grid"
      onCellChange={handleCellChange}
      onColumnChange={handleColumnChange}
      onColumnsReorder={handleColumnsReorder}
      onDeleteColumn={handleDeleteColumn}
      onAddColumn={handleAddColumn}
    />
  );
}
