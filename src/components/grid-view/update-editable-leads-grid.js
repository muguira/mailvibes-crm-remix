const fs = require('fs');

// Read the existing file
const content = fs.readFileSync('src/components/grid-view/EditableLeadsGrid.tsx', 'utf8');

// Add the import for GridPagination after other imports
const importInsertPoint = content.indexOf('import { useActivity } from "@/contexts/ActivityContext";');
const afterImportPoint = content.indexOf('\n', importInsertPoint) + 1;

const updatedContent1 = 
  content.slice(0, afterImportPoint) +
  'import { GridPagination } from \'./GridPagination\';\n' +
  content.slice(afterImportPoint);

// Find where to add pagination state (after refreshData is defined)
const stateInsertPoint = updatedContent1.indexOf('  } = useLeadsRows();');
const afterStatePoint = updatedContent1.indexOf('\n', stateInsertPoint) + 1;

const paginationState = `
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Default to 50 rows per page
  
  // Calculate paginated data
  const totalItems = rows.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedRows = rows.slice(startIndex, endIndex);
  
  // Reset to first page when data changes significantly
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rows.length]);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of grid when changing pages
    const gridElement = document.querySelector('.grid-components-container');
    if (gridElement) {
      gridElement.scrollTop = 0;
    }
  };
  
  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    // Calculate new current page to stay on approximately the same data
    const newCurrentPage = Math.floor(startIndex / size) + 1;
    setCurrentPage(Math.max(1, Math.min(newCurrentPage, Math.ceil(totalItems / size))));
  };
`;

const updatedContent2 = 
  updatedContent1.slice(0, afterStatePoint) +
  paginationState +
  updatedContent1.slice(afterStatePoint);

// Find the return statement with GridViewContainer and replace it
const returnStart = updatedContent2.lastIndexOf('  return (');
const returnEnd = updatedContent2.lastIndexOf('  );') + 4;

const newReturn = `  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <GridViewContainer 
          columns={columns} 
          data={paginatedRows}  // Use paginated data instead of all rows
          listName="All Leads"
          listType="Lead"
          listId="leads-grid"
          firstRowIndex={startIndex}  // Pass the start index for correct row numbering
          onCellChange={handleCellChange}
          onColumnsReorder={handleColumnsReorder}
          onAddColumn={handleAddColumn}
          onInsertColumn={handleInsertColumn}
          onHideColumn={handleHideColumn}
          onUnhideColumn={handleUnhideColumn}
          hiddenColumns={hiddenColumns}
          onSearchChange={setSearchTerm}
          searchTerm={searchTerm}
          className="h-full"
        />
      </div>
      <GridPagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        loading={loading}
      />
    </div>
  );`;

const finalContent = 
  updatedContent2.slice(0, returnStart) +
  newReturn +
  updatedContent2.slice(returnEnd);

// Write the updated content
fs.writeFileSync('src/components/grid-view/EditableLeadsGrid.tsx', finalContent);

console.log('EditableLeadsGrid.tsx has been updated with pagination!');
