import React, { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterPopupBase, FilterColumn } from '@/components/ui/FilterPopupBase';

export default function StreamToolbar() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  // TODO: Wire searchQuery to activitiesStore and implement timeline filtering in future sprint

  // Define columns for the filter popup
  const columns: FilterColumn[] = [
    { id: 'type', title: 'Activity Type' },
    { id: 'date', title: 'Date' },
    { id: 'status', title: 'Status' },
  ];

  const handleClearFilters = () => {
    setSelectedColumns([]);
    setFilterValues({});
    setIsFilterOpen(false);
  };

  const handleApplyFilters = () => {
    // TODO: Wire selectedFilters to leadsStore timeline
    setIsFilterOpen(false);
  };

  return (
    <div className="h-12 border-b border-slate-light/30 flex items-center justify-between px-4 bg-white">
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Grid view icon - navigates to /leads */}
        <button 
          className="p-1 rounded hover:bg-slate-light/20" 
          onClick={() => navigate('/leads')}
          aria-label="View as grid"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-slate-medium"
          >
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
          </svg>
        </button>
        
        {/* Search bar using SearchInput component */}
        <SearchInput 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search lead"
          width="w-[200px]"
        />
      </div>
      
      {/* Right section */}
      <div className="flex items-center gap-2">
        <span className="text-xs bg-slate-light/30 text-slate-dark px-2 py-1 rounded-full">
          29 Activities
        </span>
        
        {/* Filter popup using FilterPopupBase component */}
        <FilterPopupBase 
          columns={columns}
          isOpen={isFilterOpen}
          onOpenChange={setIsFilterOpen}
          selectedColumns={selectedColumns}
          onSelectedColumnsChange={setSelectedColumns}
          filterValues={filterValues}
          onFilterValuesChange={setFilterValues}
          onApplyFilters={handleApplyFilters}
          onClearFilters={handleClearFilters}
          triggerClassName="h-8 px-3"
        />
      </div>
    </div>
  );
}
