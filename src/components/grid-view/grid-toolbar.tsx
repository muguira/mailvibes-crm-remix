
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus, X, Check } from "lucide-react";
import { Column } from './types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

  // Handle filter value changes based on column type
  const handleFilterValueChange = (columnId: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [columnId]: value
    }));
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
  const handleDateRangeChange = (columnId: string, type: 'start' | 'end', value: string) => {
    setFilterValues(prev => ({
      ...prev,
      [columnId]: {
        ...prev[columnId] || {},
        [type]: value
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

  // Render filter value selector based on column type
  const renderFilterValueSelector = (column: Column) => {
    if (!column) return null;
    
    switch (column.type) {
      case 'status':
        return (
          <div className="filter-values-list">
            {column.options?.map(option => {
              const isSelected = Array.isArray(filterValues[column.id]) && 
                filterValues[column.id]?.includes(option);
              
              return (
                <div key={option} className="filter-option-label">
                  <input 
                    type="checkbox"
                    id={`filter-${column.id}-${option}`}
                    checked={isSelected}
                    onChange={(e) => handleStatusOptionSelect(column.id, option, e.target.checked)}
                  />
                  <label htmlFor={`filter-${column.id}-${option}`}>
                    <div className="flex items-center gap-2">
                      <span 
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ 
                          backgroundColor: column.colors?.[option] || '#e5e7eb' 
                        }}
                      />
                      {option}
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        );
        
      case 'date':
        const dateValues = filterValues[column.id] || {};
        
        return (
          <div className="date-range-inputs">
            <div>
              <label htmlFor={`date-start-${column.id}`} className="block text-xs mb-1">From</label>
              <input 
                type="date"
                id={`date-start-${column.id}`}
                className="date-range-input"
                value={dateValues.start || ''}
                onChange={(e) => handleDateRangeChange(column.id, 'start', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={`date-end-${column.id}`} className="block text-xs mb-1">To</label>
              <input 
                type="date"
                id={`date-end-${column.id}`}
                className="date-range-input"
                value={dateValues.end || ''}
                onChange={(e) => handleDateRangeChange(column.id, 'end', e.target.value)}
              />
            </div>
          </div>
        );
        
      default:
        return (
          <div className="text-sm text-gray-500">
            Select columns to filter
          </div>
        );
    }
  };

  return (
    <div className="grid-toolbar">
      <div className="flex items-center space-x-2">
        {/* Search Field - Updated to be inline with magnifying glass */}
        <div className="search-field">
          <Search size={16} className="text-slate-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search Field Values" 
            className="search-input"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        {/* Filter Button with Popover */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center text-xs font-normal px-2 text-slate-dark hover:text-slate-darker"
            >
              <Filter size={14} className="mr-1" />
              Filters
              {filterCount > 0 && (
                <span className="filter-badge">{filterCount}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="filter-popover-container p-0" sideOffset={5}>
            <div className="filter-popover">
              <div className="filter-popover-content">
                <div className="filter-section">
                  <div className="filter-section-title">Select columns to filter</div>
                  <div>
                    {columns.map(column => (
                      <div key={column.id} className="filter-option-label">
                        <input 
                          type="checkbox"
                          id={`filter-col-${column.id}`}
                          checked={selectedColumns.includes(column.id)}
                          onChange={(e) => handleColumnSelect(column.id, e.target.checked)}
                        />
                        <label htmlFor={`filter-col-${column.id}`}>{column.title}</label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedField && (
                  <div className="filter-value-section">
                    <div className="filter-section-title">
                      {columns.find(col => col.id === selectedField)?.title} values
                    </div>
                    {renderFilterValueSelector(columns.find(col => col.id === selectedField)!)}
                  </div>
                )}
              </div>
              
              <div className="filter-actions">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearFilters}
                >
                  <X size={14} className="mr-1" />
                  Clear
                </Button>
                <Button 
                  size="sm"
                  onClick={handleApplyFilters}
                >
                  <Check size={14} className="mr-1" />
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Label for columns count */}
        <span className="text-sm text-slate-400">
          {columns.length} columns • {listType || 'Item'}
        </span>
      </div>
    </div>
  );
}
