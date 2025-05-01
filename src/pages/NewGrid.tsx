
import React, { useState, useEffect } from 'react';
import { TopNavbar } from "@/components/layout/top-navbar";
import { NewGridView } from '@/components/grid-view/new-grid-view';
import { Column, GridRow, PaginationState } from '@/components/grid-view/types';
import { DEFAULT_COLUMN_WIDTH } from '@/components/grid-view/grid-constants';
import { STATUS_COLORS } from '@/components/grid-view/grid-constants';
import { useLocation, useSearchParams } from 'react-router-dom';
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

// Generate a dataset with specified size
const generateDataset = (count: number): GridRow[] => {
  console.log(`Generating ${count} rows of data...`);
  
  return Array.from({ length: count }, (_, i) => ({
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
  }));
};

const ROWS_PER_PAGE = 100;

const NewGrid: React.FC = () => {
  const [columns, setColumns] = useState<Column[]>(opportunityColumns);
  const [allData, setAllData] = useState<GridRow[]>([]);
  const [paginatedData, setPaginatedData] = useState<GridRow[]>([]);
  const [searchParams] = useSearchParams();
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    rowsPerPage: ROWS_PER_PAGE,
    totalPages: 1
  });
  
  // Generate dataset based on URL parameter
  useEffect(() => {
    const demo = searchParams.get('demo');
    
    console.info('[GRID] Initializing grid with demo parameter:', demo);
    
    // Generate 1000 rows when demo=1k is in URL
    let rowCount = 100; // Default row count
    if (demo === '1k') {
      console.log("Generating 1000 rows for pagination demo");
      rowCount = 1000;
    } 
    
    const dataset = generateDataset(rowCount);
    setAllData(dataset);
    
    // Calculate total pages
    const totalPages = Math.ceil(rowCount / ROWS_PER_PAGE);
    setPagination(prev => ({
      ...prev,
      totalPages
    }));
    
    console.info('[GRID] cols', columns.length);
    console.info('[GRID] rows', rowCount);
  }, [searchParams, columns.length]);

  // Update paginated data whenever pagination state or all data changes
  useEffect(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.rowsPerPage;
    const endIndex = startIndex + pagination.rowsPerPage;
    const slicedData = allData.slice(startIndex, endIndex);
    
    console.log(`Showing page ${pagination.currentPage} (rows ${startIndex + 1}-${endIndex})`);
    setPaginatedData(slicedData);
  }, [pagination.currentPage, pagination.rowsPerPage, allData]);
  
  // Handle cell value changes
  const handleCellChange = (rowId: string, columnId: string, value: any) => {
    setAllData(prev => 
      prev.map(row => 
        row.id === rowId 
          ? { ...row, [columnId]: value }
          : row
      )
    );
    
    // Also update in the paginated view
    setPaginatedData(prev => 
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
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    // Ensure page is within valid range
    const validPage = Math.max(1, Math.min(newPage, pagination.totalPages));
    
    // Only update if page actually changed
    if (validPage !== pagination.currentPage) {
      setPagination(prev => ({
        ...prev,
        currentPage: validPage
      }));
      
      // Reset scroll position to top
      window.scrollTo(0, 0);
      const gridBody = document.querySelector('.grid-body');
      if (gridBody) {
        gridBody.scrollTop = 0;
      }
    }
  };
  
  return (
    <div className="flex flex-col h-screen">
      <TopNavbar />
      <div className="flex-1 overflow-hidden">
        <NewGridView 
          columns={columns} 
          data={paginatedData}
          listName="All Opportunities"
          listType="Opportunity"
          onCellChange={handleCellChange}
          onColumnChange={handleColumnChange}
        />
        
        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center py-2 border-t border-gray-200">
            <button 
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              « Prev
            </button>
            <span className="mx-4 text-sm text-gray-700">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button 
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Next »
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewGrid;
