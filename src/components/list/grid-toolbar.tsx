
import { Filter, FileDown, Plus, Search, ChevronDown } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
import { useState } from "react";
import { ColumnDef } from "./grid/types";

interface GridToolbarProps {
  listType: string;
  columns: ColumnDef[];
  onAddItem?: () => void;
}

export function GridToolbar({ listType, columns, onAddItem }: GridToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="bg-white border-b border-slate-light/30 p-2 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {/* Selection checkbox */}
        <button className="p-1 rounded hover:bg-slate-light/20 text-slate-medium">
          <input type="checkbox" className="mr-2" title="Select all" />
        </button>
        
        {/* Export Button */}
        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-light/20 text-slate-medium" title="Download">
          <FileDown size={18} />
        </button>
        
        {/* Search Field - Updated with softer colors */}
        <div className="flex items-center bg-white border border-slate-light/50 rounded px-2 py-1">
          <Search size={16} className="text-slate-medium" />
          <input 
            type="text" 
            placeholder="Search Field Values" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-40 lg:w-56 border-none outline-none text-sm px-2 text-slate-600"
          />
          <ChevronDown size={16} className="text-slate-medium" />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* List Info */}
        <span className="text-sm text-slate-medium">{columns.length} columns • {listType}</span>
        
        {/* Filter Button */}
        <div className="relative">
          <CustomButton 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1 border border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter size={14} />
            <span>Filters</span>
            <span className="text-xs bg-teal-primary text-white rounded-full px-1.5">2</span>
          </CustomButton>
          
          {filterOpen && (
            <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-light/50 shadow-relate rounded-md z-20">
              <div className="p-3 border-b border-slate-light/30">
                <p className="font-semibold text-sm">Custom Filter</p>
              </div>
              
              <div className="p-3 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {columns.map(col => (
                    <div key={col.key} className="flex items-center">
                      <input type="checkbox" id={`filter-${col.key}`} className="mr-2" />
                      <label htmlFor={`filter-${col.key}`} className="text-sm text-slate-600">{col.header}</label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-3 border-t border-slate-light/30 flex justify-end space-x-2">
                <button className="px-3 py-1 text-sm border border-slate-light/50 rounded text-slate-600">
                  Close
                </button>
                <button className="px-3 py-1 text-sm bg-teal-primary text-white rounded">
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Add Button */}
        <CustomButton 
          variant="default" 
          size="sm"
          className="flex items-center gap-1"
          onClick={onAddItem}
        >
          <Plus size={14} />
          <span>Add {listType}</span>
        </CustomButton>
      </div>
    </div>
  );
}
