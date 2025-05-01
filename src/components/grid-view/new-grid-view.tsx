
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import { GridContainerProps, Column, GridRow } from './types';
import { ROW_HEIGHT, HEADER_HEIGHT, INDEX_COLUMN_WIDTH } from './grid-constants';
import { GridToolbar } from './grid-toolbar';
import { GridHeader } from './grid-header';
import { Check, Clipboard, Copy, Scissors, Filter, Clipboard as Paste, StretchHorizontal, Trash2, Eye, EyeOff } from 'lucide-react';
import './styles.css';
import { v4 as uuidv4 } from 'uuid';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';

// Constants for minimum column width
const MIN_COL_WIDTH = 100;

// Forward ref for outer element to ensure proper height handling
const OuterElementWrapper = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  ({ style, ...rest }, ref) => (
    <div
      ref={ref}
      style={{
        ...style,
        height: '100%', // Ensure it takes full height
        width: '100%',
      }}
      {...rest}
    />
  )
);

export function NewGridView({
  columns,
  data,
  listName = '',
  listId = '',
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
  const [focusedCell, setFocusedCell] = useState<{rowIndex: number, columnIndex: number} | null>(null);
  const [activeFilters, setActiveFilters] = useState<{columns: string[], values: Record<string, any>}>({ columns: [], values: {} });
  const [statusDropdownPosition, setStatusDropdownPosition] = useState<{ top: number; left: number; rowId: string; columnId: string } | null>(null);
  const [visibleData, setVisibleData] = useState<GridRow[]>([]);
  const [contextMenuColumn, setContextMenuColumn] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{x: number, y: number} | null>(null);

  // Load saved column widths from localStorage based on listId
  const localStorageKey = `grid-column-widths-${listId || 'default'}`;

  const [columnWidths, setColumnWidths] = useState<number[]>(() => {
    try {
      const savedWidths = localStorage.getItem(localStorageKey);
      if (savedWidths) {
        const parsed = JSON.parse(savedWidths);
        if (Array.isArray(parsed) && parsed.length >= columns.length + 1) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load column widths from localStorage', e);
    }
    return [INDEX_COLUMN_WIDTH, ...columns.map(col => col.width)];
  });

  // Save column widths to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(columnWidths));
    } catch (e) {
      console.error('Failed to save column widths to localStorage', e);
    }
  }, [columnWidths, localStorageKey]);

  // Update column widths when columns change
  useEffect(() => {
    // Only update if columns length is different to avoid resetting widths
    if (columnWidths.length !== columns.length + 1) {
      console.log('Updating column widths due to columns change', columns.length);
      setColumnWidths([INDEX_COLUMN_WIDTH, ...columns.map(col => col.width)]);
    }
  }, [columns.length]);

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
      newWidths[columnIndex] = Math.max(MIN_COL_WIDTH, newWidth);
      return newWidths;
    });
    
    // Critical fix: Reset grid after column index with remeasure=true
    // This ensures that both header and body cells are updated
    if (gridRef.current) {
      gridRef.current.resetAfterColumnIndex(columnIndex, true);
    }
    
    // If it's not the index column, update the column in the columns array
    if (columnIndex > 0 && onColumnChange) {
      const actualColumnIndex = columnIndex - 1; // Adjust for index column offset
      const columnId = columns[actualColumnIndex].id;
      onColumnChange(columnId, { width: newWidth });
    }
  }, [columns, onColumnChange]);

  // Handle cell click for editing
  const handleCellClick = (rowId: string, columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    
    if (!column?.editable) return;

    // Set focused cell for keyboard navigation
    const rowIndex = visibleData.findIndex(row => row.id === rowId);
    const columnIndex = columns.findIndex(col => col.id === columnId) + 1; // +1 for index column
    
    if (rowIndex >= 0 && columnIndex >= 0) {
      setFocusedCell({ rowIndex: rowIndex + 1, columnIndex }); // +1 for header row
    }
    
    if (column.type === 'status' && column.options) {
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
      handleCellChange(rowId, columnId, value);
      
      if (e.shiftKey) {
        if (rowIndex > 0) {
          const prevRow = visibleData[rowIndex - 1];
          setEditingCell({ rowId: prevRow.id, columnId });
        }
      } else {
        if (rowIndex < visibleData.length - 1) {
          const nextRow = visibleData[rowIndex + 1];
          setEditingCell({ rowId: nextRow.id, columnId });
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleCellChange(rowId, columnId, value);
      
      if (e.shiftKey) {
        if (colIndex > 0) {
          setEditingCell({ rowId, columnId: columns[colIndex - 1].id });
        } else if (rowIndex > 0) {
          const prevRow = visibleData[rowIndex - 1];
          setEditingCell({ 
            rowId: prevRow.id, 
            columnId: columns[columns.length - 1].id 
          });
        }
      } else {
        if (colIndex < columns.length - 1) {
          setEditingCell({ rowId, columnId: columns[colIndex + 1].id });
        } else if (rowIndex < visibleData.length - 1) {
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

  // Handle keyboard navigation
  useEffect(() => {
    if (!focusedCell) return;
    
    const handleGridKeyDown = (e: KeyboardEvent) => {
      if (editingCell) return; // Don't navigate while editing
      
      let { rowIndex, columnIndex } = focusedCell;
      let handled = true;
      
      const maxRow = visibleData.length;
      const maxColumn = columns.length + 1; // +1 for index column
      
      switch (e.key) {
        case 'ArrowUp':
          rowIndex = Math.max(1, rowIndex - 1); // Minimum is 1 (first data row)
          break;
        case 'ArrowDown':
          rowIndex = Math.min(maxRow, rowIndex + 1);
          break;
        case 'ArrowLeft':
          columnIndex = Math.max(1, columnIndex - 1); // Minimum is 1 (first real column, not index)
          break;
        case 'ArrowRight':
          columnIndex = Math.min(maxColumn, columnIndex + 1);
          break;
        case 'Home':
        case 'End':
          if (e.ctrlKey || e.metaKey) {
            if (e.key === 'Home') {
              rowIndex = 1; // First data row
            } else {
              rowIndex = maxRow; // Last row
            }
          } else {
            if (e.key === 'Home') {
              columnIndex = 1; // First column
            } else {
              columnIndex = maxColumn; // Last column
            }
          }
          break;
        default:
          handled = false;
      }
      
      if (handled) {
        e.preventDefault();
        setFocusedCell({ rowIndex, columnIndex });
        
        // Scroll to the focused cell
        if (gridRef.current) {
          gridRef.current.scrollToItem({
            rowIndex: Math.max(0, rowIndex - 1), // Adjust for header row
            columnIndex: columnIndex
          });
        }
        
        // Set focus to the cell when using arrow keys
        if (rowIndex >= 1 && columnIndex >= 1) {
          const actualRowIndex = rowIndex - 1; // Adjust for header row
          const actualColumnIndex = columnIndex - 1; // Adjust for index column
          
          if (actualRowIndex < visibleData.length && actualColumnIndex < columns.length) {
            const rowId = visibleData[actualRowIndex].id;
            const columnId = columns[actualColumnIndex].id;
            
            // Focus the cell without going into edit mode
            const cellElement = document.querySelector(`[data-cell="${rowId}-${columnId}"]`);
            if (cellElement instanceof HTMLElement) {
              cellElement.focus();
            }
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleGridKeyDown);
    return () => window.removeEventListener('keydown', handleGridKeyDown);
  }, [focusedCell, visibleData, columns, editingCell]);

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

  // Context menu handlers with position
  const handleContextMenu = (columnId: string | null, position?: { x: number, y: number }) => {
    setContextMenuColumn(columnId);
    if (position) {
      setContextMenuPosition(position);
    }
  };

  // Context menu actions
  const handleCutColumn = (columnId: string) => {
    console.log(`Cut column: ${columnId}`);
    setContextMenuColumn(null);
  };

  const handleCopyColumn = (columnId: string) => {
    console.log(`Copy column: ${columnId}`);
    setContextMenuColumn(null);
  };

  const handlePasteColumn = (columnId: string) => {
    console.log(`Paste into column: ${columnId}`);
    setContextMenuColumn(null);
  };

  const handlePasteSpecial = (columnId: string, type: string) => {
    console.log(`Paste special (${type}) into column: ${columnId}`);
    setContextMenuColumn(null);
  };

  const handleInsertColumnLeft = (columnId: string) => {
    console.log(`Insert column left of: ${columnId}`);
    const columnIndex = columns.findIndex(col => col.id === columnId);
    if (columnIndex > 0) {
      const prevColumnId = columns[columnIndex - 1].id;
      handleAddColumn(prevColumnId);
    } else {
      handleAddColumn(columnId);
    }
    setContextMenuColumn(null);
  };

  const handleInsertColumnRight = (columnId: string) => {
    console.log(`Insert column right of: ${columnId}`);
    handleAddColumn(columnId);
    setContextMenuColumn(null);
  };

  const handleClearColumn = (columnId: string) => {
    console.log(`Clear column: ${columnId}`);
    setContextMenuColumn(null);
  };

  const handleHideColumn = (columnId: string) => {
    console.log(`Hide column: ${columnId}`);
    setContextMenuColumn(null);
  };

  const handleResizeColumn = (columnId: string) => {
    console.log(`Resize column: ${columnId}`);
    setContextMenuColumn(null);
  };

  const handleCreateFilter = (columnId: string) => {
    console.log(`Create filter for column: ${columnId}`);
    setContextMenuColumn(null);
  };

  const handleSortAZ = (columnId: string) => {
    console.log(`Sort sheet A-Z by column: ${columnId}`);
    setContextMenuColumn(null);
  };

  const handleSortZA = (columnId: string) => {
    console.log(`Sort sheet Z-A by column: ${columnId}`);
    setContextMenuColumn(null);
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

  // Cell renderer with fixes for borders and alignment
  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number, rowIndex: number, style: React.CSSProperties }) => {
    if (rowIndex === 0) {
      return null; // Header is rendered separately
    }
    
    const dataRowIndex = rowIndex - 1;
    const row = visibleData[dataRowIndex];
    
    if (!row) return null;
    
    if (columnIndex === 0) {
      // Index column
      return (
        <div 
          className="index-column"
          style={{
            ...style,
            borderTop: 'none',
            borderBottom: '1px solid #e5e7eb',
            borderRight: '1px solid #e5e7eb',
            zIndex: 5
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
    const isFocused = focusedCell?.rowIndex === rowIndex && focusedCell?.columnIndex === columnIndex;
    const shouldLinkToStream = isFirstColumn && (
      (listType === 'Contact' && column.id === 'email') ||
      (listType === 'Opportunity' && column.id === 'opportunity')
    );
    
    // Fix cell styles to eliminate gaps and ensure alignment - fix type error
    const cellStyle: React.CSSProperties = {
      ...style,
      borderTop: 'none',
      borderLeft: 'none',
      padding: isEditing ? 0 : '0.75rem',
      position: 'absolute',
      height: ROW_HEIGHT,
      left: style.left as number | string,
      top: style.top as number | string,
      width: style.width as number | string
    };
    
    return (
      <div
        className={`
          grid-cell 
          ${column.editable ? 'grid-cell-editable' : ''} 
          ${isEditing ? 'grid-cell-editing' : ''} 
          ${column.type === 'currency' ? 'text-right' : ''}
          ${isFirstColumn ? 'grid-frozen-cell opportunity-cell' : ''}
          ${contextMenuColumn === column.id ? 'highlight-column' : ''}
          ${isFocused ? 'grid-cell-focused' : ''}
        `}
        style={cellStyle}
        data-cell={`${row.id}-${column.id}`}
        tabIndex={0}
        onClick={() => {
          if (shouldLinkToStream) {
            // Placeholder for navigation
            console.log(`Navigate to stream for ${row.id}`);
          } else {
            handleCellClick(row.id, column.id);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          handleContextMenu(column.id, { x: e.clientX, y: e.clientY });
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

  // Custom inner element for grid with perfect alignment
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

  // Render column context menu
  const renderColumnContextMenu = () => {
    if (!contextMenuColumn) return null;
    
    const column = columns.find(col => col.id === contextMenuColumn);
    if (!column) return null;
    
    // Calculate position for the context menu
    const menuStyle: React.CSSProperties = contextMenuPosition 
      ? {
          position: 'fixed',
          top: `${contextMenuPosition.y}px`,
          left: `${contextMenuPosition.x}px`,
          zIndex: 1000,
        }
      : {};
    
    return (
      <DropdownMenu 
        open={!!contextMenuColumn} 
        onOpenChange={(open) => !open && setContextMenuColumn(null)}
      >
        <DropdownMenuTrigger asChild>
          <div style={{ display: 'none' }} />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" style={menuStyle}>
          <DropdownMenuItem onClick={() => handleCutColumn(column.id)}>
            <Scissors className="mr-2 h-4 w-4" />
            <span>Cut</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘X</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCopyColumn(column.id)}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Copy</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘C</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePasteColumn(column.id)}>
            <Clipboard className="mr-2 h-4 w-4" />
            <span>Paste</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘V</span>
          </DropdownMenuItem>
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Clipboard className="mr-2 h-4 w-4" />
              <span>Paste special</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handlePasteSpecial(column.id, 'values')}>
                  Values only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePasteSpecial(column.id, 'format')}>
                  Format only
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleInsertColumnLeft(column.id)}>
            <span className="mr-2">+</span>
            <span>Insert column left</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleInsertColumnRight(column.id)}>
            <span className="mr-2">+</span>
            <span>Insert column right</span>
          </DropdownMenuItem>
          
          {column.id !== 'opportunity' && (
            <DropdownMenuItem onClick={() => handleDeleteColumn(column.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete column</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={() => handleClearColumn(column.id)}>
            <span className="mr-2">×</span>
            <span>Clear column</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleHideColumn(column.id)}>
            <EyeOff className="mr-2 h-4 w-4" />
            <span>Hide column</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleResizeColumn(column.id)}>
            <StretchHorizontal className="mr-2 h-4 w-4" />
            <span>Resize column</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleCreateFilter(column.id)}>
            <Filter className="mr-2 h-4 w-4" />
            <span>Create a filter</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleSortAZ(column.id)}>
            <span className="mr-2">A→Z</span>
            <span>Sort sheet A to Z</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleSortZA(column.id)}>
            <span className="mr-2">Z→A</span>
            <span>Sort sheet Z to A</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

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
      
      <div className="header-wrapper" ref={headerRef}>
        <GridHeader 
          columns={columns}
          onColumnChange={onColumnChange}
          onColumnsReorder={onColumnsReorder}
          onColumnResize={handleColumnResize}
          onAddColumn={handleAddColumn}
          onDeleteColumn={handleDeleteColumn}
          onContextMenu={handleContextMenu}
          activeContextMenu={contextMenuColumn}
        />
      </div>
      
      <div className="grid-wrapper">
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
              outerElementType={OuterElementWrapper}
              onScroll={handleGridScroll}
            >
              {Cell}
            </Grid>
          )}
        </div>
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
      
      {/* Column Context Menu */}
      {renderColumnContextMenu()}
    </div>
  );
}
