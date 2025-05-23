import React, { useState, useEffect } from 'react';
import { Column, GridRow } from './types';
import { format } from 'date-fns';
import { Check, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandList, CommandGroup, CommandItem } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { formatCellValue, renderStatusPill } from './gridCellFormatUtils';

interface GridCellProps {
  row: GridRow;
  column: Column;
  value: any;
  isEditing: boolean;
  isSelected: boolean;
  cellId: string;
  contextMenuColumn?: string | null;
  onCellClick?: (rowId: string, columnId: string, e?: React.MouseEvent) => void;
  onCellDoubleClick?: (rowId: string, columnId: string, e?: React.MouseEvent) => void;
  onContextMenu?: (columnId: string, position?: { x: number, y: number }) => void;
  onCellChange?: (rowId: string, columnId: string, value: any) => void;
  onStartEdit?: (rowId: string, columnId: string) => void;
  onFinishEdit?: (rowId: string, columnId: string, value: any) => void;
  editingCell?: { rowId: string, columnId: string } | null;
  setEditingCell?: (cell: { rowId: string, columnId: string } | null) => void;
  optimisticValue?: any;
  style?: React.CSSProperties;
}

export const GridCell: React.FC<GridCellProps> = ({
  row,
  column,
  value,
  isEditing,
  isSelected,
  cellId,
  contextMenuColumn,
  onCellClick,
  onCellDoubleClick,
  onContextMenu,
  onCellChange,
  onStartEdit,
  onFinishEdit,
  editingCell,
  setEditingCell,
  optimisticValue,
  style
}) => {
  // Use optimistic value if present
  const displayValue = optimisticValue !== undefined ? optimisticValue : value;

  // Handlers
  const handleClick = (e: React.MouseEvent) => {
    if (onCellClick) onCellClick(row.id, column.id, e);
    if ((column.type === 'status' || column.type === 'date') && setEditingCell) {
      setEditingCell({ rowId: row.id, columnId: column.id });
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (onCellDoubleClick) onCellDoubleClick(row.id, column.id, e);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onContextMenu) onContextMenu(column.id, { x: e.clientX, y: e.clientY });
  };

  const handleClose = () => {
    console.log('cerrar popover/celda', row.id, column.id);
    if (setEditingCell) setTimeout(() => setEditingCell(null), 0);
  };

  const handleChange = (val: any) => {
    console.log('cambiar valor y cerrar', row.id, column.id, val);
    if (onCellChange) onCellChange(row.id, column.id, val);
    if (onFinishEdit) onFinishEdit(row.id, column.id, val);
    if (setEditingCell) setTimeout(() => setEditingCell(null), 0);
  };

  // Renderers for special types
  if (column.type === 'status') {
    return (
      <div
        style={style}
        className={`grid-cell ${column.id === contextMenuColumn ? 'highlight-column' : ''} ${isSelected ? 'selected-cell' : ''}`}
        data-cell={cellId}
        data-column-id={column.id}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {isEditing ? (
          <div className="w-full h-full flex justify-center items-center">
            <Popover
              key={`${row.id}-${column.id}-${isEditing}`}
              open={isEditing}
              onOpenChange={open => {
                console.log('Popover onOpenChange', open, row.id, column.id);
                if (!open && setEditingCell) setEditingCell(null);
                if (open && setEditingCell) setEditingCell({ rowId: row.id, columnId: column.id });
              }}
            >
              <PopoverTrigger asChild>
                <div className="cursor-pointer flex justify-center items-center">
                  {renderStatusPill(displayValue, column.colors || {})}
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="status-options-popup"
                align="start"
                side="bottom"
                alignOffset={-50}
                sideOffset={5}
                onInteractOutside={handleClose}
              >
                <div className="status-popup-header">
                  <span>Select Status</span>
                  <button
                    className="status-popup-close"
                    onClick={handleClose}
                    aria-label="Close status popup"
                  >
                    ✕
                  </button>
                </div>
                <Command className="status-command">
                  <CommandList>
                    <CommandGroup>
                      {(column.options || []).map(option => (
                        <CommandItem
                          key={option}
                          value={option}
                          onSelect={() => handleChange(option)}
                          className="status-command-item"
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span
                              className="inline-block w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: option === 'New' ? '#FAEDCB' :
                                  option === 'In Progress' ? '#C9E4DE' :
                                    option === 'On Hold' ? '#C6DEF1' :
                                      option === 'Closed Won' ? '#DBCDF0' :
                                        option === 'Closed Lost' ? '#F2C6DE' : '#F7D9C4'
                              }}
                            />
                            <span>{option}</span>
                            {displayValue === option && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <div className="flex justify-center items-center">
            {renderStatusPill(displayValue, column.colors || {})}
          </div>
        )}
      </div>
    );
  }

  if (column.type === 'date') {
    return (
      <div
        style={{
          ...style,
          borderRight: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb',
        }}
        className={`grid-cell ${column.id === contextMenuColumn ? 'highlight-column' : ''} ${isSelected ? 'selected-cell' : ''}`}
        data-cell={cellId}
        data-column-id={column.id}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {isEditing ? (
          <div className="w-full h-full flex justify-center items-center">
            <Popover
              key={`${row.id}-${column.id}-${isEditing}`}
              open={isEditing}
              onOpenChange={open => {
                console.log('Popover onOpenChange', open, row.id, column.id);
                if (!open && setEditingCell) setEditingCell(null);
                if (open && setEditingCell) setEditingCell({ rowId: row.id, columnId: column.id });
              }}
            >
              <PopoverTrigger asChild>
                <div className="cursor-pointer flex justify-center items-center">
                  {formatCellValue(displayValue, column, row)}
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="date-options-popup p-0"
                align="start"
                side="bottom"
                alignOffset={-50}
                sideOffset={5}
                onInteractOutside={handleClose}
              >
                <div className="date-popup-header p-3 border-b flex justify-between items-center border-2">
                  <span className="text-sm font-medium">Select Date</span>
                  <button
                    className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center"
                    onClick={handleClose}
                    aria-label="Close date popup"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="p-5">
                  <Calendar
                    mode="single"
                    selected={displayValue ? new Date(displayValue) : undefined}
                    onSelect={(date) => {
                      console.log('calendar select', date, row.id, column.id);
                      if (date) {
                        const adjustedDate = new Date(date);
                        adjustedDate.setDate(adjustedDate.getDate() + 1);
                        const formattedDate = format(adjustedDate, 'yyyy-MM-dd');
                        handleChange(formattedDate);
                      } else {
                        handleChange('');
                      }
                    }}
                    defaultMonth={displayValue ? new Date(displayValue) : new Date()}
                    initialFocus
                    modifiersStyles={{
                      today: {
                        backgroundColor: 'rgb(var(--teal) / 0.15)',
                        color: 'rgb(var(--teal))'
                      },
                      selected: {
                        backgroundColor: '#62BFAA',
                        color: 'white',
                        borderRadius: '5px'
                      }
                    }}
                    classNames={{
                      day_today: 'text-[#62BFAA] font-semibold',
                      day_selected: '!bg-[#62BFAA] text-white hover:!bg-[#62BFAA] hover:text-white focus:!bg-[#62BFAA] focus:text-white',
                      day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-[#62BFAA]/70 hover:text-white focus-visible:bg-[#62BFAA] focus-visible:text-white rounded-[5px]',
                      cell: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-transparent'
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <div className="cell-content">
            {formatCellValue(displayValue, column, row)}
          </div>
        )}
      </div>
    );
  }

  // Default: text, number, currency, etc.
  return (
    <div
      style={{
        ...style,
        borderRight: '1px solid #e5e7eb',
        borderBottom: '1px solid #e5e7eb',
      }}
      className={`grid-cell ${column.id === contextMenuColumn ? 'highlight-column' : ''} ${isSelected ? 'selected-cell' : ''}`}
      data-cell={cellId}
      data-column-id={column.id}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {isEditing ? (
        <input
          type={column.type === 'number' || column.type === 'currency' ? 'number' : 'text'}
          className="grid-cell-input"
          defaultValue={displayValue as string}
          autoFocus
          onBlur={(e) => handleChange(e.target.value)}
        />
      ) : (
        <div className="cell-content">
          {formatCellValue(displayValue, column, row)}
        </div>
      )}
    </div>
  );
}; 