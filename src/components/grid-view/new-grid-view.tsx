
import React, { useState, useRef, useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { GridContainerProps, Column, GridRow } from './types';
import { ROW_HEIGHT, HEADER_HEIGHT, INDEX_COLUMN_WIDTH } from './grid-constants';
import { GridToolbar } from './grid-toolbar';
import { GridHeader } from './grid-header';
import { StatusCell } from '../list/cell-types/status-cell';
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
  const [editingCell, setEditingCell] = useState<{rowId: string, columnId: string} | null>(null);

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

  // Handle cell click for editing
  const handleCellClick = (rowId: string, columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    
    // Don't allow editing non-editable cells
    if (!column?.editable) return;
    
    setEditingCell({ rowId, columnId });
  };

  // Handle cell value change
  const handleCellChange = (rowId: string, columnId: string, value: any) => {
    setEditingCell(null);
    
    if (onCellChange) {
      onCellChange(rowId, columnId, value);
    }
  };

  // Handle key press in editing cell
  const handleKeyDown = (e: React.KeyboardEvent, rowId: string, columnId: string, value: any) => {
    if (e.key === 'Enter') {
      handleCellChange(rowId, columnId, value);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Handle blur event for autosave
  const handleBlur = (rowId: string, columnId: string, value: any) => {
    handleCellChange(rowId, columnId, value);
  };

  // Column getter for grid
  const getColumnWidth = (index: number) => {
    if (index === 0) return INDEX_COLUMN_WIDTH;
    return columns[index - 1]?.width || 0;
  };

  // Highlight search term in text
  const highlightSearchTerm = (text: string) => {
    if (!searchTerm || !text) return text;
    
    const lowerText = text.toLowerCase();
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    if (!lowerText.includes(lowerSearchTerm)) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === lowerSearchTerm 
            ? <span key={i} className="search-highlight">{part}</span> 
            : part
        )}
      </>
    );
  };

  // Render edit input based on column type
  const renderEditInput = (row: GridRow, column: Column) => {
    const value = row[column.id];
    
    switch (column.type) {
      case 'number':
      case 'currency':
        return (
          <input
            type="number"
            className={`grid-cell-input ${column.type === 'currency' ? 'text-right' : ''}`}
            defaultValue={value as number}
            autoFocus
            onBlur={(e) => handleBlur(row.id, column.id, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, row.id, column.id, e.currentTarget.value)}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            className="grid-cell-input"
            defaultValue={value as string}
            autoFocus
            onBlur={(e) => handleBlur(row.id, column.id, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, row.id, column.id, e.currentTarget.value)}
          />
        );
      case 'status':
        // For status cells, we'd typically use a custom dropdown component
        // This is a placeholder for now
        return (
          <select
            className="grid-cell-input"
            defaultValue={value as string}
            autoFocus
            onChange={(e) => handleCellChange(row.id, column.id, e.target.value)}
            onBlur={(e) => handleBlur(row.id, column.id, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, row.id, column.id, e.currentTarget.value)}
          >
            {column.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type="text"
            className="grid-cell-input"
            defaultValue={value as string}
            autoFocus
            onBlur={(e) => handleBlur(row.id, column.id, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, row.id, column.id, e.currentTarget.value)}
          />
        );
    }
  };

  // Format cell value based on column type
  const formatCellValue = (value: any, column: Column) => {
    if (value === undefined || value === null) return '';
    
    switch (column.type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Number(value));
      case 'status':
        return <StatusCell value={value} colors={column.colors} />;
      default:
        return highlightSearchTerm(String(value));
    }
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
    
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
    const isFirstColumn = columnIdx === 0;
    const shouldLinkToStream = isFirstColumn && (
      (listType === 'Contact' && column.id === 'email') ||
      (listType === 'Opportunity' && column.id === 'companyName')
    );
    
    return (
      <div
        className={`
          grid-cell 
          ${column.editable ? 'grid-cell-editable' : ''} 
          ${isEditing ? 'grid-cell-editing' : ''} 
          ${column.type === 'currency' ? 'text-right' : ''}
          ${isFirstColumn ? 'grid-frozen-cell opportunity-cell' : ''}
        `}
        style={style}
        onClick={() => {
          if (shouldLinkToStream) {
            console.log(`Navigate to stream for ${row.id}`);
            // Placeholder for navigation
            alert(`Would navigate to stream view for ${row[column.id]}`);
          } else {
            handleCellClick(row.id, column.id);
          }
        }}
      >
        {isEditing ? (
          renderEditInput(row, column)
        ) : (
          formatCellValue(row[column.id], column)
        )}
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
            rowHeight={ROW_HEIGHT}
            width={containerWidth}
          >
            {Cell}
          </Grid>
        )}
      </div>
    </div>
  );
}
