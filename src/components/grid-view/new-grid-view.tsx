
import React, { useState, useRef, useMemo } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Temporary implementation without react-window
  // We'll replace this with proper virtualization once the dependency is ready
  const renderRows = () => {
    return filteredData.slice(0, 50).map((row, rowIndex) => (
      <div key={row.id} className="grid-row" style={{ height: `${ROW_HEIGHT}px` }}>
        <div className="grid-cell index-column grid-frozen-cell">
          {rowIndex + 1}
        </div>
        {columns.map(column => (
          <div 
            key={column.id} 
            className={`grid-cell ${column.editable ? 'grid-cell-editable' : ''}`}
            style={{ width: `${column.width}px` }}
            onClick={() => {
              console.log(`Cell clicked: row ${row.id}, column ${column.id}`);
              if (onCellChange && column.editable) {
                // This will be replaced with proper cell editing later
              }
            }}
          >
            {row[column.id] !== undefined ? String(row[column.id]) : ''}
          </div>
        ))}
      </div>
    ));
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
        {renderRows()}
      </div>
    </div>
  );
}
