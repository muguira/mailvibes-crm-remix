import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Column, GridRow, GridContainerProps } from './types';
import { GridToolbar } from './grid-toolbar';
import { StaticColumns } from './StaticColumns';
import { MainGridView } from './MainGridView';
import { INDEX_COLUMN_WIDTH } from './grid-constants';
import './styles.css';

export function GridViewContainer({
  columns,
  data,
  listName = '',
  listId = '',
  listType = '',
  firstRowIndex = 0,
  searchTerm: externalSearchTerm,
  onSearchChange: externalSearchChange,
  onCellChange,
  onColumnChange,
  onColumnsReorder,
  onDeleteColumn,
  onAddColumn,
  className
}: GridContainerProps) {
  // Container references for sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  
  // Search state - local or external
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : localSearchTerm;
  
  // Sync scroll positions between components
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // Filter state
  const [activeFilters, setActiveFilters] = useState<{ columns: string[], values: Record<string, any> }>({ columns: [], values: {} });
  const [visibleData, setVisibleData] = useState<GridRow[]>(data);
  
  // Context menu state
  const [contextMenuColumn, setContextMenuColumn] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);
  
  // Separate opportunity column from other columns
  const opportunityColumn = columns.find(col => col.id === 'opportunity');
  const gridColumns = columns.filter(col => col.id !== 'opportunity');
  
  // Width calculation for the static columns area
  const staticColumnsWidth = INDEX_COLUMN_WIDTH + (opportunityColumn?.width || 0);
  
  // Resize observer for container
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerWidth(width);
      setContainerHeight(height);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Filter data based on search term and active filters
  const applyFilters = useCallback(() => {
    // Start with all data
    let result = data;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(row => {
        return columns.some(column => {
          const value = row[column.id];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(term);
        });
      });
    }

    // Apply column filters
    if (activeFilters.columns.length > 0) {
      result = result.filter(row => {
        return activeFilters.columns.every(columnId => {
          const value = row[columnId];
          const filterValue = activeFilters.values[columnId];
          const column = columns.find(col => col.id === columnId);

          if (!column) return true;

          // Different filter logic based on column type
          switch (column.type) {
            case 'status':
              if (!filterValue || filterValue.length === 0) {
                return value !== null && value !== undefined && value !== '';
              }
              return filterValue.includes(value);

            case 'date':
              if (!filterValue) return value !== null && value !== undefined && value !== '';

              const dateValue = value ? new Date(value) : null;
              if (!dateValue) return false;

              const startDate = filterValue.start ? new Date(filterValue.start) : null;
              const endDate = filterValue.end ? new Date(filterValue.end) : null;

              if (startDate && endDate) {
                return dateValue >= startDate && dateValue <= endDate;
              } else if (startDate) {
                return dateValue >= startDate;
              } else if (endDate) {
                return dateValue <= endDate;
              }
              return true;

            default:
              return value !== null && value !== undefined && value !== '';
          }
        });
      });
    }

    // Sort data to show contacts in ascending order by their ID number
    result.sort((a, b) => {
      // Extract the numeric part from lead-XXX format (e.g., lead-001 → 1)
      const getNumberFromId = (id: string) => {
        if (id.startsWith('lead-')) {
          const numericPart = id.replace('lead-', '');
          // Parse as integer to remove leading zeros
          return parseInt(numericPart, 10);
        }
        return 0; // Default for non-lead IDs
      };
      
      const aNum = getNumberFromId(a.id);
      const bNum = getNumberFromId(b.id);
      
      // Sort numerically in ascending order
      return aNum - bNum;
    });

    return result;
  }, [data, columns, searchTerm, activeFilters]);

  // Apply filters whenever filter conditions change
  useEffect(() => {
    const filteredData = applyFilters();
    setVisibleData(filteredData);
  }, [applyFilters, searchTerm, activeFilters]);
  
  // Handle search change
  const handleSearchChange = (term: string) => {
    if (externalSearchChange) {
      externalSearchChange(term);
    } else {
      setLocalSearchTerm(term);
    }
  };
  
  // Handle filter changes
  const handleApplyFilters = (filters: { columns: string[], values: Record<string, any> }) => {
    console.log("Applying filters:", filters);
    setActiveFilters(filters);
  };
  
  // Open context menu for columns
  const handleOpenContextMenu = (columnId: string | null, position?: { x: number, y: number }) => {
    setContextMenuColumn(columnId);
    if (position) {
      setContextMenuPosition(position);
    } else {
      setContextMenuPosition(null);
    }
  };
  
  // Handle columns reordering - ensure opportunity column remains unchanged
  const handleColumnsReorder = (newColumnIds: string[]) => {
    if (onColumnsReorder) {
      // Make sure opportunity column stays in the correct position
      const opportunityColumnIndex = columns.findIndex(col => col.id === 'opportunity');
      const newColumns = newColumnIds
        .filter(id => id !== 'opportunity') // Remove opportunity if it's in the list
        .map(id => columns.find(col => col.id === id)!); // Map to full column objects
      
      // Re-insert opportunity at its original position if needed
      if (opportunityColumnIndex >= 0 && opportunityColumn) {
        // Only re-insert if it was in the original columns array
        newColumns.splice(opportunityColumnIndex, 0, opportunityColumn);
      }
      
      // Call the parent handler with the updated order
      onColumnsReorder(newColumns.map(col => col.id));
    }
  };
  
  // Handle scroll synchronization
  const handleScroll = ({ scrollTop: newScrollTop, scrollLeft: newScrollLeft }: { scrollTop: number, scrollLeft: number }) => {
    setScrollTop(newScrollTop);
    setScrollLeft(newScrollLeft);
  };
  
  return (
    <div className="grid-view" ref={containerRef}>
      <GridToolbar
        listType={listType}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        filterCount={activeFilters.columns.length}
        columns={columns}
        onApplyFilters={handleApplyFilters}
        activeFilters={activeFilters}
      />
      
      <div className="grid-components-container">
        {/* Left static columns (index + opportunity) */}
        <StaticColumns 
          data={visibleData}
          opportunityColumn={opportunityColumn}
          scrollTop={scrollTop}
          firstRowIndex={firstRowIndex}
          onCellChange={onCellChange}
          onContextMenu={handleOpenContextMenu}
        />
        
        {/* Main data grid - adjust width to account for static columns */}
        <MainGridView
          columns={gridColumns}
          data={visibleData}
          scrollTop={scrollTop}
          scrollLeft={scrollLeft}
          containerWidth={(containerWidth - staticColumnsWidth) || 300}
          containerHeight={containerHeight}
          onScroll={handleScroll}
          onCellChange={onCellChange}
          onColumnChange={onColumnChange}
          onColumnsReorder={handleColumnsReorder}
          onAddColumn={onAddColumn}
          onDeleteColumn={onDeleteColumn}
          onContextMenu={handleOpenContextMenu}
          contextMenuColumn={contextMenuColumn}
          contextMenuPosition={contextMenuPosition}
        />
      </div>
    </div>
  );
} 