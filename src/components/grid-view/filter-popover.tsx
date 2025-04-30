
import React, { useState, useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FilterIcon } from 'lucide-react';
import { Column } from './types';

interface FilterPopoverProps {
  columns: Column[];
  activeFilters: {
    columns: string[];
    values: Record<string, any>;
  };
  onApplyFilters: (filters: { columns: string[]; values: Record<string, any> }) => void;
  filterCount: number;
}

export function FilterPopover({
  columns,
  activeFilters,
  onApplyFilters,
  filterCount,
}: FilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    columns: [...activeFilters.columns],
    values: { ...activeFilters.values },
  });

  // Get filterable columns
  const filterableColumns = useMemo(() => {
    return columns.filter((col) => col.type === 'status' || col.type === 'date');
  }, [columns]);

  // Handle filter column toggle
  const handleColumnToggle = (columnId: string, checked: boolean) => {
    setLocalFilters(prev => {
      const newColumns = checked
        ? [...prev.columns, columnId]
        : prev.columns.filter(id => id !== columnId);
      
      // Clean up values if column is deselected
      const newValues = { ...prev.values };
      if (!checked && newValues[columnId]) {
        delete newValues[columnId];
      }
      
      return {
        columns: newColumns,
        values: newValues,
      };
    });
  };

  // Handle status filter option toggle
  const handleStatusOptionToggle = (columnId: string, option: string, checked: boolean) => {
    setLocalFilters(prev => {
      const currentOptions = Array.isArray(prev.values[columnId]) ? [...prev.values[columnId]] : [];
      
      const newOptions = checked 
        ? [...currentOptions, option]
        : currentOptions.filter(opt => opt !== option);
      
      return {
        ...prev,
        values: {
          ...prev.values,
          [columnId]: newOptions,
        }
      };
    });
  };

  // Handle date range selection
  const handleDateRangeChange = (columnId: string, type: 'start' | 'end', date: Date | null) => {
    setLocalFilters(prev => {
      const currentRange = prev.values[columnId] || {};
      
      return {
        ...prev,
        values: {
          ...prev.values,
          [columnId]: {
            ...currentRange,
            [type]: date,
          }
        }
      };
    });
  };

  // Apply filters and close popover
  const handleApplyFilters = () => {
    onApplyFilters(localFilters);
    setIsOpen(false);
  };

  // Clear all filters
  const handleClearFilters = () => {
    const emptyFilters = {
      columns: [],
      values: {},
    };
    setLocalFilters(emptyFilters);
    onApplyFilters(emptyFilters);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 h-8"
        >
          <FilterIcon className="h-3.5 w-3.5" />
          <span>Filter</span>
          {filterCount > 0 && (
            <span className="ml-1 rounded-full bg-primary w-5 h-5 text-xs flex items-center justify-center text-white">
              {filterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="filter-popover w-80" align="start">
        <div className="space-y-4">
          <div className="font-medium">Filter data</div>
          
          <div className="filter-column-list">
            {filterableColumns.map((column) => {
              const isChecked = localFilters.columns.includes(column.id);
              
              return (
                <div key={column.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`filter-col-${column.id}`}
                    checked={isChecked} 
                    onCheckedChange={(checked) => 
                      handleColumnToggle(column.id, checked === true)
                    }
                  />
                  <Label htmlFor={`filter-col-${column.id}`} className="cursor-pointer">
                    {column.title}
                  </Label>
                </div>
              );
            })}
          </div>
          
          {/* Status filter options */}
          {localFilters.columns.some(colId => {
            const col = columns.find(c => c.id === colId);
            return col && col.type === 'status';
          }) && (
            <div className="filter-value-list">
              {localFilters.columns.map(colId => {
                const column = columns.find(c => c.id === colId);
                if (!column || column.type !== 'status' || !column.options) return null;
                
                const selectedOptions = Array.isArray(localFilters.values[colId]) 
                  ? localFilters.values[colId] 
                  : [];
                
                return (
                  <div key={`status-${colId}`} className="space-y-2">
                    <div className="font-medium text-sm">{column.title} values</div>
                    <div className="space-y-1">
                      {column.options.map(option => (
                        <div key={`${colId}-${option}`} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`filter-val-${colId}-${option}`}
                            checked={selectedOptions.includes(option)} 
                            onCheckedChange={(checked) => 
                              handleStatusOptionToggle(colId, option, checked === true)
                            }
                          />
                          <Label 
                            htmlFor={`filter-val-${colId}-${option}`} 
                            className="cursor-pointer flex items-center"
                          >
                            {column.colors && column.colors[option] ? (
                              <span 
                                className="inline-block w-3 h-3 rounded-full mr-1.5" 
                                style={{ backgroundColor: column.colors[option] }} 
                              />
                            ) : null}
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Date range filter */}
          {localFilters.columns.some(colId => {
            const col = columns.find(c => c.id === colId);
            return col && col.type === 'date';
          }) && (
            <div className="filter-date-range">
              {localFilters.columns.map(colId => {
                const column = columns.find(c => c.id === colId);
                if (!column || column.type !== 'date') return null;
                
                const dateRange = localFilters.values[colId] || {};
                const startDate = dateRange.start ? new Date(dateRange.start) : null;
                const endDate = dateRange.end ? new Date(dateRange.end) : null;
                
                return (
                  <div key={`date-${colId}`} className="space-y-2">
                    <div className="font-medium text-sm">{column.title} range</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">From</Label>
                        <div className="border rounded-md p-1">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => handleDateRangeChange(colId, 'start', date)}
                            className="p-0 pointer-events-auto"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">To</Label>
                        <div className="border rounded-md p-1">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => handleDateRangeChange(colId, 'end', date)}
                            className="p-0 pointer-events-auto"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="filter-buttons">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleClearFilters}
            >
              Clear
            </Button>
            <Button 
              size="sm"
              onClick={handleApplyFilters}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
