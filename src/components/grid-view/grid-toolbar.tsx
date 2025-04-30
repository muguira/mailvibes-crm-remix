
import React from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GridToolbarProps {
  listName?: string;
  listType?: string;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function GridToolbar({ 
  listName, 
  listType, 
  searchTerm,
  onSearchChange
}: GridToolbarProps) {
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
        
        {/* Filter Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center text-xs font-normal px-2 text-slate-dark hover:text-slate-darker"
        >
          <Filter size={14} className="mr-1" />
          Filters (0)
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        {/* List Info */}
        <span className="text-sm text-slate-400">
          {listType || 'List'}: {listName || 'Untitled'}
        </span>
        
        {/* Add Item Button */}
        <Button 
          size="sm"
          className="bg-teal-primary hover:bg-teal-primary/80 text-white text-xs px-2"
        >
          <Plus size={14} className="mr-1" />
          Add {listType || 'Item'}
        </Button>
      </div>
    </div>
  );
}
