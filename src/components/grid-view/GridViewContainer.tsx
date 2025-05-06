import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Column, GridRow, GridContainerProps } from './types';
import { GridToolbar } from './grid-toolbar';
import { StaticColumns } from './StaticColumns';
import { MainGridView } from './MainGridView';
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

    // Sort data to show newest items first by checking for timestamp in ID
    result.sort((a, b) => {
      // Check if IDs are timestamp-based (lead-timestamp format)
      const aIsTimestamp = a.id.startsWith('lead-') && !isNaN(parseInt(a.id.split('-')[1]));
      const bIsTimestamp = b.id.startsWith('lead-') && !isNaN(parseInt(b.id.split('-')[1]));
      
      // If both are timestamp-based, sort by timestamp descending (newest first)
      if (aIsTimestamp && bIsTimestamp) {
        const aTimestamp = parseInt(a.id.split('-')[1]);
        const bTimestamp = parseInt(b.id.split('-')[1]);
        return bTimestamp - aTimestamp;
      }
      
      // If only one is timestamp-based, prioritize it
      if (aIsTimestamp) return -1;
      if (bIsTimestamp) return 1;
      
      // Default sort - keep original order
      return 0;
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
        
        {/* Main data grid */}
        <MainGridView
          columns={gridColumns}
          data={visibleData}
          scrollTop={scrollTop}
          scrollLeft={scrollLeft}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          onScroll={handleScroll}
          onCellChange={onCellChange}
          onColumnChange={onColumnChange}
          onColumnsReorder={onColumnsReorder}
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