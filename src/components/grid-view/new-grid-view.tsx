import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import { GridContainerProps, Column, GridRow } from './types';
import { ROW_HEIGHT, HEADER_HEIGHT, INDEX_COLUMN_WIDTH } from './grid-constants';
import { GridToolbar } from './grid-toolbar';
import { GridHeader } from './grid-header';
import { Check } from 'lucide-react';
import './styles.css';
import { v4 as uuidv4 } from 'uuid';

export function NewGridView({
  columns,
  data,
  listName = '',
  listType = '',
  onCellChange,
  onColumnChange,
  onColumnsReorder,
  onDeleteColumn,
  onAddColumn,
  className
}: GridContainerProps) {
  const gridRef = useRef<any>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<{rowId: string, columnId: string} | null>(null);
  const [activeFilters, setActiveFilters] = useState<{columns: string[], values: Record<string, any>}>({ columns: [], values: {} });
  const [statusDropdownPosition, setStatusDropdownPosition] = useState<{ top: number; left: number; rowId: string; columnId: string } | null>(null);
  const [visibleData, setVisibleData] = useState<GridRow[]>([]);

  // Column widths state
  const [columnWidths, setColumnWidths] = useState<number[]>(
    [INDEX_COLUMN_WIDTH, ...columns.map(col => col.width)]
  );

  // Update column widths when columns change
  useEffect(() => {
    setColumnWidths([INDEX_COLUMN_WIDTH, ...columns.map(col => col.width)]);
  }, [columns]);

  // Set visible data on initial load
  useEffect(() => {
    setVisibleData(data);
  }, [data]);

  // Calculate total width of columns
  const totalWidth = useMemo(() => {
    return columnWidths.reduce((acc, width) => acc + width, 0);
  }, [columnWidths]);

  // Filter data based on search term and active filters
  const applyFilters = useCallback(() => {
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
    
    // Apply column filters with improved logic
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
              // If no specific values selected, just check if field has any value
              if (!filterValue || filterValue.length === 0) {
                return value !== null && value !== undefined && value !== '';
              }
              // Otherwise check if value is in the selected options
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
    
    return result;
  }, [data, columns, searchTerm, activeFilters]);

  // Apply filters whenever filter conditions change
  useEffect(() => {
    const filteredData = applyFilters();
    setVisibleData(filteredData);
  }, [applyFilters]);

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

  // Fix for column resize with proper persistence
  const handleColumnResize = useCallback((columnIndex: number, newWidth: number) => {
    console.log(`Resizing column ${columnIndex} to ${newWidth}px`);
    
    // Update column widths array with the new width
    setColumnWidths(prevWidths => {
      const newWidths = [...prevWidths];
      newWidths[columnIndex] = newWidth;
      return newWidths;
    });
    
    // Critical fix: Reset grid after column index with remeasure=true
    if (gridRef.current) {
      gridRef.current.resetAfterColumnIndex(columnIndex, true);
    }
    
    // If it's not the index column, update the column in the columns array
    if (columnIndex > 0 && onColumnChange) {
      const columnId = columns[columnIndex - 1].id;
      onColumnChange(columnId, { width: newWidth });
    }
  }, [columns, onColumnChange]);

  // Handle cell click for editing
  const handleCellClick = (rowId: string, columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    
    // Don't allow editing non-editable cells
    if (!column?.editable) return;
    
    // If it's a status column, show dropdown instead
    if (column.type === 'status' && column.options) {
      // Find the cell element to position the dropdown
      const cellElement = document.querySelector(`[data-cell="${rowId}-${columnId}"]`);
      if (cellElement) {
        const rect = cellElement.getBoundingClientRect();
        setStatusDropdownPosition({
          top: rect.bottom,
          left: rect.left,
          rowId,
          columnId
        });
      }
      return;
    }
    
    setEditingCell({ rowId, columnId });
  };

  // Handle cell value change
  const handleCellChange = (rowId: string, columnId: string, value: any) => {
    setEditingCell(null);
    
    if (onCellChange) {
      onCellChange(rowId, columnId, value);
    }
  };

  // Handle status selection
  const handleStatusSelect = (rowId: string, columnId: string, value: string) => {
    setStatusDropdownPosition(null);
    
    if (onCellChange) {
      onCellChange(rowId, columnId, value);
    }
  };

  // Handle key press in editing cell
  const handleKeyDown = (e: React.KeyboardEvent, rowId: string, columnId: string, value: any) => {
    const rowIndex = visibleData.findIndex(row => row.id === rowId);
    const colIndex = columns.findIndex(col => col.id === columnId);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Save the current cell value
      handleCellChange(rowId, columnId, value);
      
      if (e.shiftKey) {
        // Move to the cell above if not at the top
        if (rowIndex > 0) {
          const prevRow = visibleData[rowIndex - 1];
          setEditingCell({ rowId: prevRow.id, columnId });
        }
      } else {
        // Move to the cell below if not at the bottom
        if (rowIndex < visibleData.length - 1) {
          const nextRow = visibleData[rowIndex + 1];
          setEditingCell({ rowId: nextRow.id, columnId });
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      
      // Save the current cell value
      handleCellChange(rowId, columnId, value);
      
      if (e.shiftKey) {
        // Move to the previous cell if not at the start
        if (colIndex > 0) {
          setEditingCell({ rowId, columnId: columns[colIndex - 1].id });
        } else if (rowIndex > 0) {
          // Move to the end of the previous row
          const prevRow = visibleData[rowIndex - 1];
          setEditingCell({ 
            rowId: prevRow.id, 
            columnId: columns[columns.length - 1].id 
          });
        }
      } else {
        // Move to the next cell if not at the end
        if (colIndex < columns.length - 1) {
          setEditingCell({ rowId, columnId: columns[colIndex + 1].id });
        } else if (rowIndex < visibleData.length - 1) {
          // Move to the start of the next row
          const nextRow = visibleData[rowIndex + 1];
          setEditingCell({ 
            rowId: nextRow.id, 
            columnId: columns[0].id 
          });
        }
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Handle blur event for autosave
  const handleBlur = (rowId: string, columnId: string, value: any) => {
    handleCellChange(rowId, columnId, value);
  };

  // Column width getter for grid - using callback to ensure it's stable
  const getColumnWidth = useCallback((index: number) => {
    return columnWidths[index] || 150;
  }, [columnWidths]);

  // Row height callback for VariableSizeGrid
  const getRowHeight = useCallback(() => ROW_HEIGHT, []);

  // Handle filter changes with enhanced functionality
  const handleApplyFilters = (filters: {columns: string[], values: Record<string, any>}) => {
    console.log("Applying filters:", filters);
    setActiveFilters(filters);
  };

  // Sync header scrolling with grid body
  const handleGridScroll = useCallback(({ scrollLeft }: { scrollLeft: number; scrollTop: number }) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = scrollLeft;
    }
  }, []);

  // Close status dropdown when clicking outside
  useEffect(() => {
    if (statusDropdownPosition) {
      const handleClickOutside = (e: MouseEvent) => {
        const dropdown = document.querySelector('.status-dropdown');
        if (dropdown && !dropdown.contains(e.target as Node)) {
          setStatusDropdownPosition(null);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [statusDropdownPosition]);

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

  // Handle adding a column after another column
  const handleAddColumn = (afterColumnId: string) => {
    if (onAddColumn) {
      onAddColumn(afterColumnId);
    }
  };

  // Handle deleting a column
  const handleDeleteColumn = (columnId: string) => {
    if (onDeleteColumn && columnId !== 'opportunity') {
      onDeleteColumn(columnId);
    }
  };

  // Render edit input based on column type with enhanced UX
  const renderEditInput = (row: GridRow, column: Column) => {
    const value = row[column.id];
    
    // Add autofocus with selection for improved UX
    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    };
    
    switch (column.type) {
      case 'number':
      case 'currency':
        return (
          <input
            type="number"
            className={`grid-cell-input ${column.type === 'currency' ? 'text-right' : ''}`}
            defaultValue={value as number}
            autoFocus
            onFocus={handleInputFocus}
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
            onFocus={handleInputFocus}
            onBlur={(e) => handleBlur(row.id, column.id, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, row.id, column.id, e.currentTarget.value)}
          />
        );
      default:
        return (
          <input
            type="text"
            className="grid-cell-input"
            defaultValue={value as string}
            autoFocus
            onFocus={handleInputFocus}
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
        return renderStatusPill(value, column.colors || {});
      default:
        return highlightSearchTerm(String(value));
    }
  };

  // Render status pill
  const renderStatusPill = (value: string, colors: Record<string, string>) => {
    if (!value) return null;
    
    const backgroundColor = colors[value] || '#f3f4f6';
    const isLightColor = isColorLight(backgroundColor);
    const textColor = isLightColor ? '#000000' : '#ffffff';
    
    return (
      <span 
        className="px-2 py-0.5 rounded-full text-xs font-medium" 
        style={{ backgroundColor, color: textColor }}
      >
        {value}
      </span>
    );
  };

  // Helper function to determine if color is light
  const isColorLight = (color: string): boolean => {
    // Handle hex color
    let r = 0, g = 0, b = 0;
    
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
    // Handle rgb color
    else if (color.startsWith('rgb')) {
      const rgb = color.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        r = parseInt(rgb[0]);
        g = parseInt(rgb[1]);
        b = parseInt(rgb[2]);
      }
    }
    
    // Calculate brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
  };

  // Cell renderer with perfect alignment with header cells
  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number, rowIndex: number, style: React.CSSProperties }) => {
    if (rowIndex === 0) {
      return null; // Header is rendered separately
    }
    
    const dataRowIndex = rowIndex - 1;
    const row = visibleData[dataRowIndex];
    
    if (!row) return null;
    
    if (columnIndex === 0) {
      return (
        <div 
          className="index-column"
          style={{
            ...style,
            width: 48,
            minWidth: 48,
            maxWidth: 48,
            borderTop: 'none',
            borderBottom: '1px solid #e5e7eb',
            borderRight: '1px solid #e5e7eb',
            boxSizing: 'border-box' as 'border-box',
            height: ROW_HEIGHT
          }}
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
      (listType === 'Opportunity' && column.id === 'opportunity')
    );
    
    // Fix cell styles to perfectly align with headers
    const cellStyle = {
      ...style,
      width: column.width,
      minWidth: column.width,
      maxWidth: column.width,
      borderTop: 'none',
      borderLeft: 'none',
      borderBottom: '1px solid #e5e7eb',
      borderRight: '1px solid #e5e7eb',
      padding: isEditing ? 0 : '0.5rem',
      height: ROW_HEIGHT,
      boxSizing: 'border-box' as 'border-box',
      overflow: 'hidden'
    };
    
    return (
      <div
        className={`
          grid-cell 
          ${column.editable ? 'grid-cell-editable' : ''} 
          ${isEditing ? 'grid-cell-editing' : ''} 
          ${column.type === 'currency' ? 'text-right' : ''}
          ${isFirstColumn ? 'grid-frozen-cell opportunity-cell' : ''}
        `}
        style={cellStyle}
        data-cell={`${row.id}-${column.id}`}
        onClick={() => {
          if (shouldLinkToStream) {
            // Placeholder for navigation
            console.log(`Navigate to stream for ${row.id}`);
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

  // Custom inner element to remove border spacing and gaps
  const innerElementType = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
    ({ style, ...rest }, ref) => (
      <div
        ref={ref}
        style={{
          ...style,
          borderCollapse: 'collapse',
          borderSpacing: 0,
          padding: 0,
          margin: 0
        }}
        className="react-window-grid-inner"
        {...rest}
      />
    )
  );

  return (
    <div className={`grid-view ${className || ''}`} ref={containerRef}>
      <GridToolbar 
        listName={listName}
        listType={listType}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterCount={activeFilters.columns.length}
        columns={columns}
        onApplyFilters={handleApplyFilters}
        activeFilters={activeFilters}
      />
      
      <div ref={headerRef} style={{ overflow: 'hidden' }}>
        <GridHeader 
          columns={columns}
          onColumnChange={onColumnChange}
          onColumnsReorder={onColumnsReorder}
          onAddColumn={handleAddColumn}
          onDeleteColumn={handleDeleteColumn}
        />
      </div>
      
      <div className="grid-body">
        {containerWidth > 0 && containerHeight > 0 && (
          <Grid
            ref={gridRef}
            columnCount={columns.length + 1} // +1 for index column
            columnWidth={getColumnWidth}
            height={containerHeight - HEADER_HEIGHT}
            rowCount={visibleData.length + 1} // +1 for header placeholder
            rowHeight={getRowHeight}
            width={containerWidth}
            className="react-window-grid"
            style={{ 
              overflowX: 'auto', 
              overflowY: 'auto', 
              margin: 0, 
              padding: 0,
              borderTop: 0,
              borderCollapse: 'collapse',
              borderSpacing: 0
            }}
            innerElementType={innerElementType}
            onScroll={handleGridScroll}
          >
            {Cell}
          </Grid>
        )}
      </div>
      
      {/* Status Dropdown */}
      {statusDropdownPosition && (
        <div 
          className="status-dropdown"
          style={{
            top: statusDropdownPosition.top + 'px',
            left: statusDropdownPosition.left + 'px'
          }}
        >
          {(() => {
            const column = columns.find(col => col.id === statusDropdownPosition.columnId);
            const row = visibleData.find(r => r.id === statusDropdownPosition.rowId);
            const currentValue = row ? row[statusDropdownPosition.columnId] : '';
            
            return column?.options?.map((option) => (
              <div
                key={option}
                className={`status-option ${currentValue === option ? 'active' : ''}`}
                onClick={() => handleStatusSelect(
                  statusDropdownPosition.rowId,
                  statusDropdownPosition.columnId,
                  option
                )}
              >
                <div className="status-option-label">
                  {renderStatusPill(option, column.colors || {})}
                </div>
                {currentValue === option && <Check size={16} />}
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
