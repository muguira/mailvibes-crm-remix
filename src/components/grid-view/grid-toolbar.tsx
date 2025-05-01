
import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Plus, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AbsolutePopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Column } from './types';

interface FilterPopoverProps {
  columns: Column[];
  onApplyFilters: (filters: any) => void;
  onClose: () => void;
  activeFilters: any;
}

const FilterPopover: React.FC<FilterPopoverProps> = ({ 
  columns, 
  onApplyFilters, 
  onClose,
  activeFilters: initialActiveFilters 
}) => {
  const [selectedFilters, setSelectedFilters] = useState<string[]>(initialActiveFilters.columns || []);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, any>>(initialActiveFilters.values || {});
  
  // Handle toggle column filter
  const handleToggleFilter = (columnId: string) => {
    if (selectedFilters.includes(columnId)) {
      setSelectedFilters(prev => prev.filter(id => id !== columnId));
      // Only clear selected field if it was this column
      if (selectedField === columnId) {
        setSelectedField(null);
      }
    } else {
      setSelectedFilters(prev => [...prev, columnId]);
      setSelectedField(columnId);
    }
  };

  // Handle setting filter values
  const handleSetFilterValue = (columnId: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [columnId]: value
    }));
  };
  
  // Handle status option toggle
  const handleToggleStatusOption = (columnId: string, option: string) => {
    setFilterValues(prev => {
      const currentValues = prev[columnId] || [];
      const newValues = currentValues.includes(option)
        ? currentValues.filter((val: string) => val !== option)
        : [...currentValues, option];
      
      return {
        ...prev,
        [columnId]: newValues
      };
    });
  };
  
  // Handle date range
  const handleDateRangeChange = (columnId: string, field: 'start' | 'end', value: string) => {
    setFilterValues(prev => ({
      ...prev,
      [columnId]: {
        ...prev[columnId] || {},
        [field]: value
      }
    }));
  };
  
  // Apply filters
  const handleApply = () => {
    console.log("Applying filters:", {
      columns: selectedFilters,
      values: filterValues
    });
    
    onApplyFilters({
      columns: selectedFilters,
      values: filterValues
    });
    
    onClose();
  };
  
  // Clear filters
  const handleClear = () => {
    setSelectedFilters([]);
    setFilterValues({});
    setSelectedField(null);
    onApplyFilters({ columns: [], values: {} });
    onClose();
  };

  // Render filter values section based on column type
  const renderFilterValueSelector = (column: Column) => {
    if (!column) return null;
    
    switch (column.type) {
      case 'status':
        return (
          <div className="filter-value-section">
            <h4 className="filter-section-title">Select Status Values</h4>
            <div className="filter-values-list">
              {column.options?.map(option => (
                <div key={option} className="filter-option-label">
                  <input
                    type="checkbox"
                    id={`filter-value-${column.id}-${option}`}
                    checked={
                      filterValues[column.id] ? 
                      filterValues[column.id].includes(option) : 
                      false
                    }
                    onChange={() => handleToggleStatusOption(column.id, option)}
                    className="mr-2"
                  />
                  <label htmlFor={`filter-value-${column.id}-${option}`}>
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: column.colors?.[option] || '#f3f4f6',
                        color: isColorLight(column.colors?.[option] || '#f3f4f6') ? '#000000' : '#ffffff'
                      }}
                    >
                      {option}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'date':
        return (
          <div className="filter-value-section">
            <h4 className="filter-section-title">Select Date Range</h4>
            <div className="date-range-inputs">
              <div>
                <label htmlFor={`filter-date-start-${column.id}`} className="text-xs text-gray-500">
                  From
                </label>
                <input
                  type="date"
                  id={`filter-date-start-${column.id}`}
                  className="date-range-input"
                  value={filterValues[column.id]?.start || ''}
                  onChange={(e) => handleDateRangeChange(column.id, 'start', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor={`filter-date-end-${column.id}`} className="text-xs text-gray-500">
                  To
                </label>
                <input
                  type="date"
                  id={`filter-date-end-${column.id}`}
                  className="date-range-input"
                  value={filterValues[column.id]?.end || ''}
                  onChange={(e) => handleDateRangeChange(column.id, 'end', e.target.value)}
                />
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="filter-value-section">
            <p className="text-sm text-gray-500">
              Filter will include all non-empty values for this column.
            </p>
          </div>
        );
    }
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
  
  return (
    <div className="filter-popover">
      <div className="filter-popover-content">
        <div className="filter-section">
          <h3 className="filter-section-title">Filter by Column</h3>
          {columns.map(column => (
            <div key={column.id} className="filter-option-label">
              <input
                type="checkbox"
                id={`filter-${column.id}`}
                checked={selectedFilters.includes(column.id)}
                onChange={() => handleToggleFilter(column.id)}
                className="mr-2"
              />
              <label htmlFor={`filter-${column.id}`}>{column.title}</label>
            </div>
          ))}
        </div>
        
        {selectedField && renderFilterValueSelector(
          columns.find(col => col.id === selectedField)!
        )}
      </div>
      <div className="filter-actions">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleClear}
        >
          Clear
        </Button>
        <Button 
          onClick={handleApply} 
          size="sm"
          className="bg-teal-500 hover:bg-teal-600 text-white"
        >
          Apply
        </Button>
      </div>
    </div>
  );
};

interface GridToolbarProps {
  columns: Column[];
  listName?: string;
  listType?: string;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterCount: number;
  onApplyFilters: (filters: any) => void;
  activeFilters: any;
}

export function GridToolbar({ 
  columns, 
  listName,
  listType,
  searchTerm,
  onSearchChange,
  filterCount,
  onApplyFilters,
  activeFilters
}: GridToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  
  // Calculate filter button position
  const [filterButtonPos, setFilterButtonPos] = useState({ top: 0, left: 0 });
  
  useEffect(() => {
    if (filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      setFilterButtonPos({ 
        top: rect.bottom, 
        left: rect.left 
      });
    }
  }, [showFilters]);
  
  // Close filter popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showFilters &&
        filterPopoverRef.current && 
        filterButtonRef.current &&
        !filterPopoverRef.current.contains(e.target as Node) &&
        !filterButtonRef.current.contains(e.target as Node)
      ) {
        setShowFilters(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);
  
  // Close filter popover on ESC key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showFilters) {
        setShowFilters(false);
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [showFilters]);
  
  return (
    <div className="grid-toolbar">
      <div className="flex items-center space-x-2">
        <div className="search-field">
          <Search className="text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="relative">
          <Button
            ref={filterButtonRef}
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center"
          >
            <Filter className="text-gray-500 h-4 w-4 mr-1" />
            <span>Filters</span>
            {filterCount > 0 && (
              <span className="filter-badge">{filterCount}</span>
            )}
          </Button>
          
          {showFilters && (
            <AbsolutePopoverContent 
              ref={filterPopoverRef}
              position={{ top: filterButtonPos.top, left: filterButtonPos.left }}
              className="filter-popover-container"
            >
              <FilterPopover 
                columns={columns}
                onApplyFilters={onApplyFilters}
                onClose={() => setShowFilters(false)}
                activeFilters={activeFilters}
              />
            </AbsolutePopoverContent>
          )}
        </div>
      </div>
      
      <div className="flex items-center text-sm text-gray-500">
        <span>{listName || ''}</span>
        {listType && <span className="ml-1">• {listType}</span>}
      </div>
    </div>
  );
}
