
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
    resizable: false, // Don't allow resizing the opportunity column
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

// Generate datasets of different sizes
const generateDataset = (count: number): GridRow[] => {
  console.log(`Generating ${count} rows of data...`);
  return Array.from({ length: count }, (_, i) => generateRow(i + 1));
};

const NewGrid: React.FC = () => {
  const [columns, setColumns] = useState<Column[]>(opportunityColumns);
  const [data, setData] = useState<GridRow[]>([]);
  const location = useLocation();
  
  // Generate dataset based on URL parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const demo = searchParams.get('demo');
    
    if (demo === '10k') {
      console.log("Generating 10,000 rows for performance testing");
      // Generate 10k rows efficiently
      setData(generateDataset(10000));
    } else if (demo === '1k') {
      console.log("Generating 1,000 rows for pagination testing");
      // Generate 1k rows for pagination testing
      setData(generateDataset(1000));
    } else {
      // Default to 100 rows for normal use
      setData(generateDataset(100));
    }
  }, [location.search]);
  
  // Handle cell value changes with retry logic for duplicate key errors
  const handleCellChange = (rowId: string, columnId: string, value: any) => {
    console.log("Cell change:", rowId, columnId, value);
    // Attempt to update the cell value
    try {
      setData(prev => 
        prev.map(row => 
          row.id === rowId 
            ? { ...row, [columnId]: value }
            : row
        )
      );
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
    console.log("Delete column:", columnId);
    // This is kept simple for now
    setColumns(prev => prev.filter(col => col.id !== columnId));
  };
  
  // Handle adding a new column
  const handleAddColumn = (afterColumnId: string) => {
    console.log("Add column after:", afterColumnId);
    const newColumnId = `column-${uuidv4().substring(0, 8)}`;
    const newColumn: Column = {
      id: newColumnId,
      title: `New Column`,
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true
    };
    
    const afterIndex = columns.findIndex(col => col.id === afterColumnId);
    const newColumns = [...columns];
    newColumns.splice(afterIndex + 1, 0, newColumn);
    setColumns(newColumns);
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
