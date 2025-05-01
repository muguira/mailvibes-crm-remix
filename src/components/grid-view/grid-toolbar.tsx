
import React from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Checkbox } from '@/components/ui/checkbox';

interface GridToolbarProps {
  listName?: string;
  listType?: string;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterCount?: number;
}

export function GridToolbar({ 
  listName = 'All Opportunities', 
  listType = 'Opportunity', 
  searchTerm,
  onSearchChange,
  filterCount = 0
}: GridToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  return (
    <>
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
            variant="outline" 
            size="sm" 
            className="flex items-center text-xs font-normal px-2 text-slate-dark hover:text-slate-darker"
            onClick={() => setIsFilterOpen(true)}
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
      </div>

      {/* Filter Drawer */}
      <Drawer open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DrawerContent className="h-5/6">
          <div className="filter-drawer">
            <DrawerHeader className="filter-drawer-header">
              <DrawerTitle>Filters</DrawerTitle>
            </DrawerHeader>
            
            {/* Field Selection */}
            <div className="filter-section">
              <div className="filter-section-title">Select Fields</div>
              <div className="space-y-2">
                {['Opportunity', 'Status', 'Revenue', 'Close Date', 'Owner'].map((field) => (
                  <div className="flex items-center space-x-2" key={field}>
                    <Checkbox id={`field-${field}`} />
                    <label htmlFor={`field-${field}`} className="text-sm">{field}</label>
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
            
            <DrawerFooter className="filter-actions">
              <Button variant="outline" size="sm" onClick={() => setIsFilterOpen(false)}>
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsFilterOpen(false)}>
                Save View
              </Button>
              <Button size="sm" onClick={() => setIsFilterOpen(false)}>
                Apply
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
