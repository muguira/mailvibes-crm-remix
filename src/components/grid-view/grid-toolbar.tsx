
import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AbsolutePopoverContent } from '@/components/ui/popover';
import { Column } from './types';

interface GridToolbarProps {
  listName?: string;
  listType?: string;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterCount?: number;
  columns?: Column[];
  onApplyFilters?: (filters: string[]) => void;
}

export function GridToolbar({ 
  listName = 'All Opportunities', 
  listType = 'Opportunity', 
  searchTerm,
  onSearchChange,
  filterCount = 0,
  columns = [],
  onApplyFilters
}: GridToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  // Calculate position for the filter popover
  useEffect(() => {
    if (isFilterOpen && filterBtnRef.current) {
      const rect = filterBtnRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + 4, // Position below button with small gap
        left: rect.left
      });
    }
  }, [isFilterOpen]);

  // Handle click outside to close the popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterPopoverRef.current && 
        !filterPopoverRef.current.contains(event.target as Node) &&
        filterBtnRef.current &&
        !filterBtnRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isFilterOpen]);

  // Toggle selected filter
  const toggleFilter = (columnId: string) => {
    setSelectedFilters(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  // Apply filters
  const handleApplyFilters = () => {
    if (onApplyFilters) {
      onApplyFilters(selectedFilters);
    }
    setIsFilterOpen(false);
  };

  // Clear filters
  const handleClearFilters = () => {
    setSelectedFilters([]);
    if (onApplyFilters) {
      onApplyFilters([]);
    }
    setIsFilterOpen(false);
  };

  return (
    <div className="grid-toolbar">
      <div className="flex items-center space-x-3">
        {/* Search Field - Inline with magnifying glass */}
        <div className="search-field">
          <Search size={16} className="text-slate-400 mr-2" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Field Values" 
            className="search-input"
          />
        </div>
        
        {/* Filter Button with Count Badge */}
        <Button 
          ref={filterBtnRef}
          variant="outline" 
          size="sm" 
          className="flex items-center text-xs font-normal px-2 text-slate-dark hover:text-slate-darker"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
        >
          <Filter size={14} className="mr-1" />
          Filters {filterCount > 0 && <span className="filter-badge">{filterCount}</span>}
        </Button>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* List Info */}
        <span className="text-sm text-slate-600">
          {listType}: {listName}
        </span>
        
        {/* Add Item Button */}
        <Button 
          size="sm"
          className="bg-teal-500 hover:bg-teal-600 text-white text-xs px-3 py-1.5"
        >
          <Plus size={14} className="mr-1" />
          Add {listType}
        </Button>
      </div>

      {/* Filter Popover */}
      {isFilterOpen && (
        <AbsolutePopoverContent 
          ref={filterPopoverRef}
          position={popoverPosition}
          className="filter-popover"
        >
          <div className="filter-popover-content">
            {/* Field Selection */}
            <div className="filter-section">
              <div className="flex justify-between items-center mb-2">
                <div className="filter-section-title">Select Fields</div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 h-auto" 
                  onClick={() => setIsFilterOpen(false)}
                >
                  <X size={16} />
                </Button>
              </div>
              <div className="space-y-2">
                {columns.map((column) => (
                  <div className="flex items-center space-x-2" key={column.id}>
                    <Checkbox 
                      id={`field-${column.id}`} 
                      checked={selectedFilters.includes(column.id)}
                      onCheckedChange={() => toggleFilter(column.id)}
                    />
                    <label 
                      htmlFor={`field-${column.id}`} 
                      className="text-sm cursor-pointer"
                    >
                      {column.title}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Condition Builder */}
            <div className="filter-section">
              <div className="filter-section-title">Conditions</div>
              <div className="bg-gray-50 p-2 border rounded-md">
                <div className="text-sm text-gray-500 italic">
                  Add conditions to filter your data
                </div>
              </div>
            </div>
          </div>
          
          <div className="filter-actions">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearFilters}
            >
              Clear
            </Button>
            <Button 
              size="sm" 
              className="bg-teal-500 hover:bg-teal-600"
              onClick={handleApplyFilters}
            >
              Apply
            </Button>
          </div>
        </AbsolutePopoverContent>
      )}
    </div>
  );
}
