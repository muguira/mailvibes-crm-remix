
import React, { useState, useRef, useMemo } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import { GridContainerProps, Column, GridRow } from './types';
import { ROW_HEIGHT, HEADER_HEIGHT, INDEX_COLUMN_WIDTH } from './grid-constants';
import { GridToolbar } from './grid-toolbar';
import { GridHeader } from './grid-header';
import './styles.css';

export function NewGridView({
  columns,
  data,
  listName = '',
  listType = '',
  onCellChange,
  onColumnChange,
  onColumnsReorder,
  className
}: GridContainerProps) {
  const gridRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate total width of columns
  const totalWidth = useMemo(() => {
    return columns.reduce((acc, column) => acc + column.width, 0) + INDEX_COLUMN_WIDTH;
  }, [columns]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    const term = searchTerm.toLowerCase();
    return data.filter(row => {
      return columns.some(column => {
        const value = row[column.id];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(term);
      });
    });
  }, [data, columns, searchTerm]);

  // Resize observer for container
  React.useEffect(() => {
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

  // Column getter for grid
  const getColumnWidth = (index: number) => {
    if (index === 0) return INDEX_COLUMN_WIDTH;
    return columns[index - 1]?.width || 0;
  };

  // Cell renderer
  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number, rowIndex: number, style: React.CSSProperties }) => {
    if (rowIndex === 0) {
      return null; // Header is rendered separately
    }
    
    const dataRowIndex = rowIndex - 1;
    const row = filteredData[dataRowIndex];
    
    if (!row) return null;
    
    if (columnIndex === 0) {
      return (
        <div 
          className="index-column grid-frozen-cell"
          style={style}
        >
          {dataRowIndex + 1}
        </div>
      );
    }
    
    const columnIdx = columnIndex - 1;
    const column = columns[columnIdx];
    
    if (!column) return null;
    
    const value = row[column.id];
    
    return (
      <div
        className={`grid-cell ${column.editable ? 'grid-cell-editable' : ''}`}
        style={style}
        onClick={() => {
          // Handle cell click
          console.log(`Cell clicked: row ${row.id}, column ${column.id}`);
        }}
      >
        {value !== undefined ? String(value) : ''}
      </div>
    );
  };

  return (
    <div className={`grid-view ${className || ''}`} ref={containerRef}>
      <GridToolbar 
        listName={listName}
        listType={listType}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
      
      <GridHeader 
        columns={columns}
        onColumnChange={onColumnChange}
        onColumnsReorder={onColumnsReorder}
      />
      
      <div className="grid-body">
        {containerWidth > 0 && containerHeight > 0 && (
          <Grid
            ref={gridRef}
            columnCount={columns.length + 1} // +1 for index column
            columnWidth={getColumnWidth}
            height={containerHeight - HEADER_HEIGHT}
            rowCount={filteredData.length + 1} // +1 for header placeholder
            rowHeight={() => ROW_HEIGHT}
            width={containerWidth}
            itemData={{
              columns,
              data: filteredData,
              onCellChange
            }}
          >
            {Cell}
          </Grid>
        )}
      </div>
    </div>
  );
}
