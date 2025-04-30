
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, Plus } from "lucide-react";
import { ColumnDef } from "./grid/types";
import { ZoomControl } from "./zoom-control";

interface GridToolbarProps {
  listType?: string;
  columns: ColumnDef[];
  onAddItem?: () => void;
  onZoomChange?: (zoom: string) => void;
  currentZoom?: string;
}

export function GridToolbar({ 
  listType, 
  columns, 
  onAddItem,
  onZoomChange,
  currentZoom
}: GridToolbarProps) {
  return (
    <div className="flex justify-between items-center p-2 border-b border-slate-light/20 bg-white">
      <div className="flex items-center space-x-2">
        {/* Search Field */}
        <div className="search-field">
          <Search size={16} className="text-slate-400" />
          <input type="text" placeholder="Search Field Values" className="w-48" />
        </div>
        
        {/* Filter Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center text-xs font-normal px-2 text-slate-dark hover:text-slate-darker"
        >
          <Filter size={14} className="mr-1" />
          Filters ({columns.filter(col => col.filter).length})
        </Button>
        
        {/* Download Button - Moved to the left of zoom control */}
        <Button
          variant="outline"
          size="sm"
          className="flex items-center text-xs font-normal px-2 text-slate-dark hover:text-slate-darker"
        >
          <Download size={14} className="mr-1" />
          Export
        </Button>
        
        {/* Zoom Control */}
        <ZoomControl onZoomChange={onZoomChange} />
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
