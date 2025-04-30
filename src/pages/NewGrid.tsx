
import React, { useState, useEffect } from 'react';
import { TopNavbar } from "@/components/layout/top-navbar";
import { NewGridView } from '@/components/grid-view/new-grid-view';
import { Column, GridRow } from '@/components/grid-view/types';
import { DEFAULT_COLUMN_WIDTH, INDEX_COLUMN_WIDTH } from '@/components/grid-view/grid-constants';
import { STATUS_COLORS } from '@/components/grid-view/grid-constants';
import { useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

// Sample column definitions for opportunities
const opportunityColumns: Column[] = [
  {
    id: 'opportunity',
    title: 'Opportunity',
    type: 'text',
    width: DEFAULT_COLUMN_WIDTH,
    editable: true,
    frozen: true,
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
    id: 'website',
    title: 'Website',
    type: 'url',
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
    id: 'linkedIn',
    title: 'Company LinkedIn',
    type: 'url',
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
  }
];

// Generate sample row data
const generateRow = (i: number): GridRow => ({
  id: `row-${uuidv4()}`, // Use UUID to ensure uniqueness for API calls
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
});

// Generate a large dataset for performance testing
const generateLargeDataset = (count: number): GridRow[] => {
  console.log(`Generating ${count} rows of data...`);
  
  // Use Array.from for better performance with large datasets
  return Array.from({ length: count }, (_, i) => generateRow(i));
};

const NewGrid: React.FC = () => {
  const [columns, setColumns] = useState<Column[]>(opportunityColumns);
  const [data, setData] = useState<GridRow[]>([]);
  const location = useLocation();
  
  // Generate dataset based on URL parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const demo = searchParams.get('demo');
    
    // Generate full 10k rows when demo=10k is in URL
    if (demo === '10k') {
      console.log("Generating 10,000 rows for performance testing");
      // Generate 10k rows efficiently
      const largeDataset = Array.from({ length: 10000 }, (_, i) => generateRow(i));
      console.log(`Generated ${largeDataset.length} rows`);
      setData(largeDataset);
    } else {
      // Default to 100 rows for normal use
      setData(generateLargeDataset(100));
    }
  }, [location.search]);
  
  // Handle cell value changes with retry logic for duplicate key errors
  const handleCellChange = (rowId: string, columnId: string, value: any) => {
    // Attempt to update the cell value
    try {
      setData(prev => 
        prev.map(row => 
          row.id === rowId 
            ? { ...row, [columnId]: value }
            : row
        )
      );
      
      // In a real API implementation, you would handle 409 errors here
      // and retry with a new UUID if needed
    } catch (error) {
      console.error("Error updating cell:", error);
      // If there's a 409 error, generate a new ID and retry
      const newRowId = `row-${uuidv4()}`;
      console.log(`Retrying with new ID: ${newRowId}`);
      
      // Update the row with a new ID
      setData(prev => {
        const updatedRow = prev.find(row => row.id === rowId);
        if (!updatedRow) return prev;
        
        return [
          ...prev.filter(row => row.id !== rowId),
          { ...updatedRow, id: newRowId, [columnId]: value }
        ];
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
    <div className="flex flex-col h-screen">
      <TopNavbar />
      <div className="flex-1 overflow-hidden">
        <NewGridView 
          columns={columns} 
          data={data}
          listName="All Opportunities"
          listType="Opportunity"
          listId="opportunities-grid"
          onCellChange={handleCellChange}
          onColumnChange={handleColumnChange}
          onColumnsReorder={handleColumnsReorder}
          onDeleteColumn={handleDeleteColumn}
          onAddColumn={handleAddColumn}
        />
      </div>
    </div>
  );
};

export default NewGrid;
