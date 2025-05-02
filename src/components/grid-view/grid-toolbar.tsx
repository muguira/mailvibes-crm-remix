import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Search, Filter, X, Check, ChevronLeft, Calendar as CalendarIcon, Calendar } from "lucide-react";
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
  const [selectedField, setSelectedField] = useState<string | null>(null);
  
  // Sync with active filters when they change externally
  useEffect(() => {
    setSelectedColumns(activeFilters.columns);
    setFilterValues(activeFilters.values);
  }, [activeFilters]);

  // Handle checkbox change for column selection
  const handleColumnSelect = (columnId: string, checked: boolean) => {
    let newSelectedColumns: string[];
    
    if (checked) {
      newSelectedColumns = [...selectedColumns, columnId];
    } else {
      newSelectedColumns = selectedColumns.filter(id => id !== columnId);
      
      // Also remove any values for this column
      const newValues = { ...filterValues };
      delete newValues[columnId];
      setFilterValues(newValues);
    }
    
    setSelectedColumns(newSelectedColumns);
    
    // If a column is selected, set it as the selected field for second-tier values
    if (checked) {
      setSelectedField(columnId);
    } else if (columnId === selectedField) {
      // If we're deselecting the currently selected field, choose another one or null
      setSelectedField(newSelectedColumns.length > 0 ? newSelectedColumns[0] : null);
    }
  };

  // Handle status option selection
  const handleStatusOptionSelect = (columnId: string, option: string, checked: boolean) => {
    setFilterValues(prev => {
      const currentOptions = Array.isArray(prev[columnId]) ? [...prev[columnId]] : [];
      
      if (checked) {
        return {
          ...prev,
          [columnId]: [...currentOptions, option]
        };
      } else {
        return {
          ...prev,
          [columnId]: currentOptions.filter(opt => opt !== option)
        };
      }
    });
  };

  // Handle date range filter changes
  const handleDateChange = (columnId: string, type: 'start' | 'end', value: Date | undefined) => {
    setFilterValues(prev => ({
      ...prev,
      [columnId]: {
        ...prev[columnId] || {},
        [type]: value ? format(value, 'yyyy-MM-dd') : undefined
      }
    }));
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

  // Get active filter badges
  const getActiveFilterBadges = () => {
    return selectedColumns.map(columnId => {
      const column = columns.find(col => col.id === columnId);
      if (!column) return null;
      
      return (
        <Badge key={columnId} variant="outline" className="gap-1">
          {column.title}
          <X 
            size={14} 
            className="cursor-pointer" 
            onClick={() => handleColumnSelect(columnId, false)}
          />
        </Badge>
      );
    });
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
          <div className="text-sm text-muted-foreground mt-2">
            No specific filters for this column type
          </div>
        );
    }
  };

  // Get the selected column
  const selectedColumn = selectedField ? columns.find(col => col.id === selectedField) : null;

  return (
    <div className="grid-toolbar">
      <div className="flex flex-col w-full gap-4">
        {/* List name with clean search field */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{listName}</h2>
          <div className="text-sm text-muted-foreground">
            {columns.length} columns
          </div>
        </div>
        
        {/* Clean search field and filter button */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              type="search"
              placeholder={`Search ${listType || 'items'}...`}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 h-9 bg-transparent border-0 border-b focus-visible:ring-0 focus-visible:border-primary rounded-none"
            />
          </div>
          
          <div className="flex items-center gap-2">
            {filterCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {getActiveFilterBadges()}
              </div>
            )}
            
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 relative"
                >
                  <Filter size={14} className="mr-1.5" />
                  Filter
                  {filterCount > 0 && (
                    <span className="ml-1 bg-primary text-primary-foreground rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px]">
                      {filterCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" sideOffset={5}>
                <div className="flex flex-col">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Filters</h3>
                      {filterCount > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleClearFilters}
                          className="h-8 text-xs"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                    
                    {/* Show active filter badges */}
                    {filterCount > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {getActiveFilterBadges()}
                      </div>
                    )}
                    
                    {!selectedField ? (
                      <div className="space-y-3">
                        <div className="text-xs text-muted-foreground font-medium">Select a field to filter</div>
                        <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                          {columns.map(column => (
                            <div key={column.id} className="flex items-center space-x-2 py-1.5 hover:bg-muted rounded px-1">
                              <Checkbox 
                                id={`filter-col-${column.id}`}
                                checked={selectedColumns.includes(column.id)}
                                onCheckedChange={(checked) => 
                                  handleColumnSelect(column.id, checked === true)
                                }
                              />
                              <Label 
                                htmlFor={`filter-col-${column.id}`}
                                className="flex-1 cursor-pointer"
                                onClick={() => {
                                  if (!selectedColumns.includes(column.id)) {
                                    handleColumnSelect(column.id, true);
                                  }
                                  setSelectedField(column.id);
                                }}
                              >
                                {column.title}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center mb-4">
                          <button 
                            className="text-sm flex items-center text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedField(null)}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back
                          </button>
                          <h3 className="font-medium text-sm ml-auto">{selectedColumn?.title}</h3>
                        </div>
                        <div className="max-h-[250px] overflow-y-auto pr-1">
                          {renderFilterValueSelector(selectedColumn!)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-end p-3 bg-muted/50">
                    <Button 
                      size="sm"
                      onClick={handleApplyFilters}
                      className="h-8"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
