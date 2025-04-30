
import React, { useState, useEffect } from 'react';
import { TopNavbar } from "@/components/layout/top-navbar";
import { NewGridView } from '@/components/grid-view/new-grid-view';
import { Column, GridRow } from '@/components/grid-view/types';
import { DEFAULT_COLUMN_WIDTH } from '@/components/grid-view/grid-constants';
import { STATUS_COLORS } from '@/components/grid-view/grid-constants';
import { useLocation } from 'react-router-dom';

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

// Generate a large dataset for performance testing
const generateLargeDataset = (count: number): GridRow[] => {
  console.log(`Generating ${count} rows of data...`);
  
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
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
  }));
};

const NewGrid: React.FC = () => {
  const [columns, setColumns] = useState<Column[]>(opportunityColumns);
  const [data, setData] = useState<GridRow[]>([]);
  const location = useLocation();
  
  // Generate dataset based on URL parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const demo = params.get('demo');
    
    // Generate full 10k rows when demo=10k is in URL
    if (demo === '10k') {
      console.log("Generating 10,000 rows for performance testing");
      const largeDataset = generateLargeDataset(10000);
      console.log(`Generated ${largeDataset.length} rows`);
      setData(largeDataset);
    } else {
      // Default to 100 rows for normal use
      setData(generateLargeDataset(100));
    }
  }, [location.search]);
  
  // Handle cell value changes
  const handleCellChange = (rowId: string, columnId: string, value: any) => {
    setData(prev => 
      prev.map(row => 
        row.id === rowId 
          ? { ...row, [columnId]: value }
          : row
      )
    );
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
  
  return (
    <div className="flex flex-col h-screen">
      <TopNavbar />
      <div className="flex-1 overflow-hidden">
        <NewGridView 
          columns={columns} 
          data={data}
          listName="All Opportunities"
          listType="Opportunity"
          onCellChange={handleCellChange}
          onColumnChange={handleColumnChange}
          onColumnsReorder={handleColumnsReorder}
        />
      </div>
    </div>
  );
};

export default NewGrid;
