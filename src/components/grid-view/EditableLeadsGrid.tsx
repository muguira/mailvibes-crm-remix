
import React, { useState, useEffect } from 'react';
import { NewGridView } from '@/components/grid-view/new-grid-view';
import { Column, GridRow } from '@/components/grid-view/types';
import { DEFAULT_COLUMN_WIDTH } from '@/components/grid-view/grid-constants';
import { Link } from 'react-router-dom';
import { ExternalLink, Filter, Search } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { mockContactsById } from '@/components/stream/sample-data';
import { Button } from '@/components/ui/button';
import { useLeadsRows } from '@/hooks/useLeadsRows';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function EditableLeadsGrid() {
  // Use our hook for Supabase persistence
  const { rows, loading, saveRow, filter, setFilter, getFilteredRows, PAGE_SIZE } = useLeadsRows();
  const [page, setPage] = useState(0);
  
  // Filter rows based on search query
  const filteredRows = getFilteredRows();
  const pageCount = Math.ceil(filteredRows.length / PAGE_SIZE);
  
  // Calculate the index of the first row on current page
  const firstRowIndex = page * PAGE_SIZE;
  
  // Get rows for current page
  const paginated = filteredRows.slice(firstRowIndex, firstRowIndex + PAGE_SIZE);
  
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
    // Find the row index
    const rowIndex = rows.findIndex(r => r.id === rowId);
    if (rowIndex === -1) return;
    
    // Create updated row
    const currentRow = rows[rowIndex];
    const updatedRow = { ...currentRow, [columnId]: value };
    
    // Save the updated row
    saveRow(rowIndex, updatedRow);
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

  // Create a custom toolbar with search
  const customToolbar = (
    <div className="flex justify-between items-center p-2 border-b border-slate-light/20 bg-white">
      <div className="flex items-center space-x-2">
        {/* Search Field - Updated to be inline with magnifying glass */}
        <div className="flex items-center border rounded-md px-2">
          <Search size={16} className="text-slate-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search across all leads..." 
            className="border-none outline-none text-sm py-1 w-64 focus:ring-0 bg-transparent"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0); // Reset to first page when searching
            }}
          />
          
          {/* Filter Button - moved inline with search */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2 text-xs font-normal"
              >
                <Filter size={14} className="mr-1" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <div className="p-4 space-y-2">
                <h4 className="font-medium">Filter Options</h4>
                <p className="text-sm text-slate-500">Filter options will go here.</p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Label for columns count */}
        <span className="text-sm text-slate-400">
          {columns.length} columns • Opportunity
        </span>
      </div>
    </div>
  );
  
  // Show loading state if data is still loading
  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading leads data...</div>;
  }
  
  // Convert the data to the format expected by the grid
  const gridData: GridRow[] = paginated.map((row, index) => ({
    id: row.id,
    originalIndex: firstRowIndex + index, // Store original index for "#" column
    opportunity: row.opportunity || row.name || '',
    status: row.status || 'New',
    revenue: row.revenue || 0,
    closeDate: row.closeDate || new Date().toISOString().split('T')[0],
    owner: row.owner || '',
    website: row.website || '',
    companyName: row.companyName || row.company || '',
    linkedIn: row.linkedIn || '',
    employees: row.employees || 0,
    lastContacted: row.lastContacted || '',
    email: row.email || '',
  }));
  
  return (
    <div className="flex flex-col h-full">
      {/* Custom toolbar with search */}
      {customToolbar}
      
      {/* Grid with paginated data */}
      <div className="flex-1 relative">
        <NewGridView 
          columns={columns} 
          data={gridData}
          listName={`All Opportunities (${filteredRows.length} total)`}
          listType="Opportunity"
          listId="opportunities-grid"
          onCellChange={handleCellChange}
          onColumnChange={handleColumnChange}
          onColumnsReorder={handleColumnsReorder}
          onDeleteColumn={handleDeleteColumn}
          onAddColumn={handleAddColumn}
        />
      </div>
      
      {/* Sticky pager UI at the bottom */}
      <div className="sticky bottom-0 z-10 bg-white border-t flex items-center justify-end gap-4 px-4 py-2">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={page === 0} 
          onClick={() => setPage(p => p - 1)}
        >
          Prev
        </Button>
        <span className="text-sm min-w-[110px] text-center whitespace-nowrap mx-2">
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
