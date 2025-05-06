import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Filter, Check, ChevronLeft, Calendar as CalendarIcon, Calendar } from "lucide-react";
import { Column } from './types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterPopupBase, FilterColumn } from '@/components/ui/FilterPopupBase';

interface GridToolbarProps {
  listName?: string;
  listType?: string;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterCount: number;
  columns: Column[];
  onApplyFilters: (filters: { columns: string[], values: Record<string, any> }) => void;
  activeFilters: { columns: string[], values: Record<string, any> };
}

export function GridToolbar({ 
  listName = '',
  listType = '', 
  searchTerm,
  onSearchChange,
  filterCount,
  columns,
  onApplyFilters,
  activeFilters
}: GridToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(activeFilters.columns || []);
  const [filterValues, setFilterValues] = useState<Record<string, any>>(activeFilters.values || {});
  
  // Sync with active filters when they change externally
  useEffect(() => {
    setSelectedColumns(activeFilters.columns);
    setFilterValues(activeFilters.values);
  }, [activeFilters]);

  // Handle status option selection
  const handleStatusOptionSelect = (columnId: string, option: string, checked: boolean) => {
    const newFilterValues = { ...filterValues };
    const currentOptions = Array.isArray(newFilterValues[columnId]) ? [...newFilterValues[columnId]] : [];
    
    if (checked) {
      newFilterValues[columnId] = [...currentOptions, option];
    } else {
      newFilterValues[columnId] = currentOptions.filter(opt => opt !== option);
    }
    
    setFilterValues(newFilterValues);
  };

  // Handle date range filter changes
  const handleDateChange = (columnId: string, type: 'start' | 'end', value: Date | undefined) => {
    const newFilterValues = { ...filterValues };
    newFilterValues[columnId] = {
      ...newFilterValues[columnId] || {},
      [type]: value ? format(value, 'yyyy-MM-dd') : undefined
    };
    
    setFilterValues(newFilterValues);
  };

  // Apply filters
  const handleApplyFilters = () => {
    onApplyFilters({
      columns: selectedColumns,
      values: filterValues
    });
    setIsFilterOpen(false);
  };

  // Clear filters
  const handleClearFilters = () => {
    setSelectedColumns([]);
    setFilterValues({});
    onApplyFilters({
      columns: [],
      values: {}
    });
    setIsFilterOpen(false);
  };

  // Render filter value selector based on column type
  const renderFilterValueSelector = (column: Column) => {
    if (!column) return null;
    
    switch (column.type) {
      case 'status':
        return (
          <div className="space-y-2 mt-2">
            {column.options?.map(option => {
              const isSelected = Array.isArray(filterValues[column.id]) && 
                filterValues[column.id]?.includes(option);
              
              return (
                <div key={option} className="flex items-center space-x-2 py-1">
                  <Checkbox 
                    id={`filter-${column.id}-${option}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => 
                      handleStatusOptionSelect(column.id, option, checked === true)
                    }
                  />
                  <Label htmlFor={`filter-${column.id}-${option}`} className="flex items-center cursor-pointer">
                      <span 
                      className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ 
                          backgroundColor: column.colors?.[option] || '#e5e7eb' 
                        }}
                      />
                      {option}
                  </Label>
                </div>
              );
            })}
          </div>
        );
        
      case 'date':
        const dateValues = filterValues[column.id] || {};
        const startDate = dateValues.start ? new Date(dateValues.start) : undefined;
        const endDate = dateValues.end ? new Date(dateValues.end) : undefined;
        
        return (
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs">From</Label>
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => handleDateChange(column.id, 'start', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">To</Label>
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => handleDateChange(column.id, 'end', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="text-sm py-2 text-muted-foreground">
            No specific filter options for this column type.
          </div>
        );
    }
  };
  
  const columnCount = columns.length;

  // Convert Column type to FilterColumn type for the FilterPopupBase
  const filterColumns: FilterColumn[] = columns.map(col => ({
    id: col.id,
    title: col.title,
    type: col.type,
    options: col.options,
    colors: col.colors
  }));

  // Generate filter tags for individual filter values, not just columns
  const getFilterTags = () => {
    const tags = [];
    
    for (const columnId of selectedColumns) {
      const column = columns.find(col => col.id === columnId);
      if (!column) continue;
      
      const values = filterValues[columnId];
      
      if (Array.isArray(values) && values.length > 0) {
        // For status or multi-select columns, show each selected value as a tag
        values.forEach(value => {
          tags.push(
            <Badge key={`${columnId}-${value}`} variant="outline" className="gap-1">
              {column.title}: {value}
            </Badge>
          );
        });
      } else if (column.type === 'date' && values) {
        // For date ranges, show a combined tag
        const startDate = values.start ? format(new Date(values.start), "MMM d") : null;
        const endDate = values.end ? format(new Date(values.end), "MMM d") : null;
        
        if (startDate || endDate) {
          tags.push(
            <Badge key={`${columnId}-date`} variant="outline" className="gap-1">
              {column.title}: {startDate ? `from ${startDate}` : ''} {endDate ? `to ${endDate}` : ''}
            </Badge>
          );
        }
      } else if (values && typeof values === 'string') {
        // For text or other single-value columns
        tags.push(
          <Badge key={`${columnId}-${values}`} variant="outline" className="gap-1">
            {column.title}: {values}
          </Badge>
        );
      }
    }
    
    return tags;
  };

  return (
    <div className="grid-toolbar">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          {/* Search field */}
          <SearchInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search contacts..."
            width="w-[240px]"
          />
        
          {/* Active filter badges - moved left with the search */}
              {filterCount > 0 && (
            <div className="flex gap-1 flex-wrap ml-2">
              {getFilterTags()}
                  </div>
                )}
              </div>
              
        {/* Right-aligned section */}
        <div className="flex items-center gap-2">
          {/* Column count text */}
          <div className="text-sm text-gray-500">
            {columnCount} column{columnCount !== 1 ? 's' : ''}
          </div>
      
          {/* Filter button and Add Contact button */}
          <div className="flex items-center gap-3">
            {/* Filter button styled to match the image */}
            <FilterPopupBase
              columns={filterColumns}
              isOpen={isFilterOpen}
              onOpenChange={setIsFilterOpen}
              selectedColumns={selectedColumns}
              onSelectedColumnsChange={setSelectedColumns}
              filterValues={filterValues}
              onFilterValuesChange={setFilterValues}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              align="end"
              renderFilterValueSelector={renderFilterValueSelector}
              triggerClassName="h-10 w-10 bg-white border border-gray-300 rounded-md flex items-center justify-center shadow-sm"
              iconOnly={true}
            />
            
            {/* Add Contact button */}
            <Button 
              className="bg-[#32BAB0] hover:bg-[#28a79d] text-white rounded-md px-6 py-2 h-10"
              onClick={() => console.log('Add Contact clicked')}
            >
              Add Contact
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
