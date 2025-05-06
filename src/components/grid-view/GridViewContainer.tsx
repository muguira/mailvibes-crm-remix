import React, { useState, useRef, useEffect } from 'react';
import { Column, GridRow, GridContainerProps } from './types';
import { GridToolbar } from './grid-toolbar';
import { StaticColumns } from './StaticColumns';
import { MainGridView } from './MainGridView';
import { ActionColumn } from './ActionColumn';
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
  const [visibleData, setVisibleData] = useState<GridRow[]>([]);
  
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
  
  // Set visible data on initial load and when filters change
  useEffect(() => {
    setVisibleData(data);
  }, [data]);
  
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
        
        {/* Right action column */}
        <ActionColumn
          data={visibleData}
          scrollTop={scrollTop}
          onAddNewColumn={onAddColumn ? () => onAddColumn('') : undefined}
        />
      </div>
    </div>
  );
} 