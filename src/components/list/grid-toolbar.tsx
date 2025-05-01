
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus } from "lucide-react";
import { ColumnDef } from "./grid/types";

interface GridToolbarProps {
  listType?: string;
  columns: ColumnDef[];
  onAddItem?: () => void;
}

export function GridToolbar({ 
  listType, 
  columns, 
  onAddItem
}: GridToolbarProps) {
  // Count columns with filter property if it exists, otherwise assume 0
  const filterCount = columns.filter(col => col.filter !== undefined).length;

  return (
    <div className="flex justify-between items-center p-2 border-b border-slate-light/20 bg-white">
      <div className="flex items-center space-x-2">
        {/* Search Field - Updated to be inline with magnifying glass */}
        <div className="flex items-center border-b border-gray-300">
          <Search size={16} className="text-slate-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search Field Values" 
            className="border-none outline-none text-sm py-1 w-52 focus:ring-0 bg-transparent"
          />
        </div>
        
        {/* Filter Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center text-xs font-normal px-2 text-slate-dark hover:text-slate-darker"
        >
          <Filter size={14} className="mr-1" />
          Filters ({filterCount})
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Label for columns count */}
        <span className="text-sm text-slate-400">
          {columns.length} columns • {listType || 'Item'}
        </span>
        
        {/* Add Item Button */}
        {onAddItem && (
          <Button 
            onClick={onAddItem} 
            size="sm"
            className="bg-teal-primary hover:bg-teal-primary/80 text-white text-xs px-2"
          >
            <Plus size={14} className="mr-1" />
            Add {listType || 'Item'}
          </Button>
        )}
      </div>
    </div>
  );
}
