import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Filter, X, ChevronLeft } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface FilterColumn {
  id: string;
  title: string;
  type?: string;
  options?: string[];
  colors?: Record<string, string>;
}

export interface FilterPopupBaseProps {
  columns: FilterColumn[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedColumns: string[];
  onSelectedColumnsChange: (columns: string[]) => void;
  filterValues: Record<string, any>;
  onFilterValuesChange: (values: Record<string, any>) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  triggerClassName?: string;
  align?: "start" | "center" | "end";
  renderFilterValueSelector?: (column: FilterColumn) => React.ReactNode;
}

export function FilterPopupBase({
  columns,
  isOpen,
  onOpenChange,
  selectedColumns,
  onSelectedColumnsChange,
  filterValues,
  onFilterValuesChange,
  onApplyFilters,
  onClearFilters,
  triggerClassName = "",
  align = "end",
  renderFilterValueSelector
}: FilterPopupBaseProps) {
  const [selectedField, setSelectedField] = useState<string | null>(null);

  // Reset selected field when popup closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedField(null);
    }
  }, [isOpen]);

  // Handle checkbox change for column selection
  const handleColumnSelect = (columnId: string, checked: boolean) => {
    let newSelectedColumns: string[];
    
    if (checked) {
      newSelectedColumns = [...selectedColumns, columnId];
      // If we're selecting a column, automatically show its detail panel
      setSelectedField(columnId);
    } else {
      newSelectedColumns = selectedColumns.filter(id => id !== columnId);
      
      // If we're deselecting the currently selected field, choose another one or null
      if (columnId === selectedField) {
        setSelectedField(newSelectedColumns.length > 0 ? newSelectedColumns[0] : null);
      }
    }
    
    onSelectedColumnsChange(newSelectedColumns);
  };

  // Get active filter badges
  const getActiveFilterBadges = () => {
    return selectedColumns.map(columnId => {
      const column = columns.find(col => col.id === columnId);
      if (!column) return null;
      
      return (
        <Badge key={columnId} variant="outline" className="gap-1">
          {column.title}
          <X 
            size={14} 
            className="cursor-pointer" 
            onClick={() => handleColumnSelect(columnId, false)}
          />
        </Badge>
      );
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={`${triggerClassName} ${selectedColumns.length > 0 ? "bg-primary/10 border-primary/30" : ""}`}
          onClick={() => onOpenChange(!isOpen)}
        >
          <Filter size={16} className="mr-1" />
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0 shadow-lg rounded-lg z-[1000]" align={align}>
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-medium text-sm">Filter Data</h3>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onClearFilters}
            className="text-xs h-7 px-2"
            disabled={selectedColumns.length === 0}
          >
            Clear All
          </Button>
        </div>
        
        {selectedField ? (
          // Detail view for selected column
          <div className="border-b border-gray-100">
            <div className="p-3">
              <div className="flex items-center mb-3">
                <button 
                  onClick={() => setSelectedField(null)}
                  className="text-xs flex items-center text-gray-500 hover:text-gray-700"
                >
                  <ChevronLeft size={14} className="mr-1" />
                  Back
                </button>
                <p className="text-xs font-medium ml-2">
                  {columns.find(col => col.id === selectedField)?.title}
                </p>
              </div>
              
              {renderFilterValueSelector ? 
                renderFilterValueSelector(columns.find(col => col.id === selectedField)!)
                : 
                <div className="text-sm text-gray-500 py-2">
                  Filter options coming soon
                </div>
              }
            </div>
          </div>
        ) : (
          // Column selection view
          <div className="border-b border-gray-100 p-3 overflow-y-auto max-h-[300px]">
            <p className="text-xs font-medium mb-2 text-gray-500">Columns</p>
            {columns.map(column => (
              <div key={column.id} className="flex items-center space-x-2 py-1.5">
                <Checkbox 
                  id={`column-${column.id}`}
                  checked={selectedColumns.includes(column.id)}
                  onCheckedChange={(checked) => 
                    handleColumnSelect(column.id, checked === true)
                  }
                />
                <Label 
                  htmlFor={`column-${column.id}`}
                  className={
                    "text-sm cursor-pointer " +
                    (selectedColumns.includes(column.id) ? "font-medium text-primary" : "")
                  }
                >
                  {column.title}
                </Label>
              </div>
            ))}
          </div>
        )}
        
        <div className="p-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-2 mb-3">
            {getActiveFilterBadges()}
          </div>
          
          <Button 
            className="w-full"
            size="sm"
            disabled={selectedColumns.length === 0}
            onClick={onApplyFilters}
          >
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
} 