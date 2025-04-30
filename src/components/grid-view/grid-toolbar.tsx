
import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AbsolutePopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Column } from './types';

interface FilterPopoverProps {
  columns: Column[];
  onApplyFilters: (filters: string[]) => void;
  onClose: () => void;
  activeFilters: string[];
}

const FilterPopover: React.FC<FilterPopoverProps> = ({ 
  columns, 
  onApplyFilters, 
  onClose,
  activeFilters: initialActiveFilters 
}) => {
  const [selectedFilters, setSelectedFilters] = useState<string[]>(initialActiveFilters);
  
  const handleToggleFilter = (columnId: string) => {
    setSelectedFilters(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId) 
        : [...prev, columnId]
    );
  };
  
  const handleApply = () => {
    console.log("Applying filters:", selectedFilters);
    onApplyFilters(selectedFilters);
    onClose();
  };
  
  const handleClear = () => {
    setSelectedFilters([]);
    onApplyFilters([]);
    onClose();
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
  onApplyFilters: (filters: string[]) => void;
  activeFilters: string[];
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
              position={{ top: 40, left: 0 }}
              className="filter-popover"
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
