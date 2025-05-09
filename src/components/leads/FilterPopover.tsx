import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Filter, 
  X, 
  ChevronLeft, 
  Check, 
  CalendarIcon 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

type FilterType = 'date' | 'status' | 'text' | 'number';

interface FilterOption {
  id: string;
  label: string;
  type: FilterType;
  options?: string[];
  colors?: Record<string, string>;
}

interface SelectedFilter {
  id: string;
  type: FilterType;
  value: any;
}

const FILTER_OPTIONS: FilterOption[] = [
  {
    id: 'closeDate',
    label: 'Close Date',
    type: 'date'
  },
  {
    id: 'status',
    label: 'Status',
    type: 'status',
    options: ['New', 'In Progress', 'On Hold', 'Closed Won', 'Closed Lost'],
    colors: {
      'New': '#F2FCE2',
      'In Progress': '#D3E4FD',
      'On Hold': '#FEF7CD',
      'Closed Won': '#F2FCE2',
      'Closed Lost': '#FFDEE2',
    }
  },
  {
    id: 'revenue',
    label: 'Revenue',
    type: 'number'
  },
  {
    id: 'owner',
    label: 'Owner',
    type: 'text'
  },
  {
    id: 'companyName',
    label: 'Company Name',
    type: 'text'
  }
];

interface FilterPopoverProps {
  onApplyFilters?: (filters: SelectedFilter[]) => void;
}

export default function FilterPopover({ onApplyFilters }: FilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilter[]>([]);
  
  // Date range state
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  
  // Status selection state
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  
  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId);
  };
  
  const handleStatusToggle = (status: string, checked: boolean) => {
    if (checked) {
      setSelectedStatuses(prev => [...prev, status]);
    } else {
      setSelectedStatuses(prev => prev.filter(s => s !== status));
    }
  };
  
  const handleApplyFilter = () => {
    const newFilters = [...selectedFilters];
    
    if (activeFilterId) {
      const filterOption = FILTER_OPTIONS.find(f => f.id === activeFilterId);
      
      if (!filterOption) return;
      
      // Remove any existing filter with the same ID
      const existingIndex = newFilters.findIndex(f => f.id === activeFilterId);
      if (existingIndex >= 0) {
        newFilters.splice(existingIndex, 1);
      }
      
      // Create a new filter based on the type
      if (filterOption.type === 'date' && (fromDate || toDate)) {
        newFilters.push({
          id: activeFilterId,
          type: 'date',
          value: {
            from: fromDate,
            to: toDate
          }
        });
      } else if (filterOption.type === 'status' && selectedStatuses.length > 0) {
        newFilters.push({
          id: activeFilterId,
          type: 'status',
          value: selectedStatuses
        });
      }
    }
    
    setSelectedFilters(newFilters);
    
    if (onApplyFilters) {
      onApplyFilters(newFilters);
    }
    
    setIsOpen(false);
    setActiveFilterId(null);
    setFromDate(undefined);
    setToDate(undefined);
    setSelectedStatuses([]);
  };
  
  const handleRemoveFilter = (filterId: string) => {
    setSelectedFilters(prev => prev.filter(f => f.id !== filterId));
  };
  
  const handleClearAllFilters = () => {
    setSelectedFilters([]);
    setActiveFilterId(null);
    setFromDate(undefined);
    setToDate(undefined);
    setSelectedStatuses([]);
    
    if (onApplyFilters) {
      onApplyFilters([]);
    }
  };
  
  const renderFilterPanel = () => {
    if (!activeFilterId) {
      return (
        <div className="p-2">
          <p className="text-sm text-center text-gray-500 mb-2">Select a filter type</p>
          <div className="space-y-1">
            {FILTER_OPTIONS.map(filter => (
              <Button
                key={filter.id}
                variant="ghost"
                className="w-full justify-start text-left h-9"
                onClick={() => handleFilterSelect(filter.id)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      );
    }
    
    const filter = FILTER_OPTIONS.find(f => f.id === activeFilterId);
    if (!filter) return null;
    
    return (
      <div className="p-3">
        <div className="flex items-center mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 mr-2"
            onClick={() => setActiveFilterId(null)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-medium">{filter.label}</h3>
        </div>
        
        {filter.type === 'date' && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs mb-1 block">From</Label>
              <div className="relative">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      size="sm"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, 'PPP') : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-0" 
                    align="start"
                    style={{
                      width: '320px',
                      maxWidth: '95vw'
                    }}
                  >
                    <Calendar
                      key={`filter-cal-${Date.now()}`}
                      mode="single"
                      selected={null}
                      onSelect={(date) => {
                        setFromDate(date);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div>
              <Label className="text-xs mb-1 block">To</Label>
              <div className="relative">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      size="sm"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, 'PPP') : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-0" 
                    align="start"
                    style={{
                      width: '320px', 
                      maxWidth: '95vw'
                    }}
                  >
                    <Calendar
                      key={`filter-cal-${Date.now()}`}
                      mode="single"
                      selected={null}
                      onSelect={(date) => {
                        setToDate(date);
                      }}
                      initialFocus
                      disabled={(date) => 
                        fromDate ? date < fromDate : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}
        
        {filter.type === 'status' && filter.options && (
          <div className="space-y-2">
            {filter.options.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${option}`}
                  checked={selectedStatuses.includes(option)}
                  onCheckedChange={(checked) => handleStatusToggle(option, !!checked)}
                />
                <Label
                  htmlFor={`status-${option}`}
                  className="flex items-center text-sm cursor-pointer"
                >
                  <span
                    className="h-3 w-3 rounded-full mr-2"
                    style={{ backgroundColor: filter.colors?.[option] || '#e5e7eb' }}
                  />
                  {option}
                </Label>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-6 flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveFilterId(null)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApplyFilter}
          >
            Apply Filter
          </Button>
        </div>
      </div>
    );
  };
  
  const getFilterCount = () => selectedFilters.length;
  
  const getFilterBadges = () => {
    return selectedFilters.map(filter => {
      const filterOption = FILTER_OPTIONS.find(f => f.id === filter.id);
      if (!filterOption) return null;
      
      let label = '';
      
      if (filter.type === 'date') {
        const { from, to } = filter.value;
        if (from && to) {
          label = `${format(from, 'MMM d')} - ${format(to, 'MMM d')}`;
        } else if (from) {
          label = `From ${format(from, 'MMM d')}`;
        } else if (to) {
          label = `Until ${format(to, 'MMM d')}`;
        }
      } else if (filter.type === 'status') {
        label = filter.value.join(', ');
      }
      
      return (
        <Badge
          key={filter.id}
          variant="outline"
          className="flex items-center gap-1"
        >
          {filterOption.label}: {label}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => handleRemoveFilter(filter.id)}
          />
        </Badge>
      );
    });
  };
  
  return (
    <div>
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-9 gap-1.5 ${getFilterCount() > 0 ? 'bg-primary/10 border-primary/30' : ''}`}
            >
              <Filter className="h-4 w-4" />
              Filter
              {getFilterCount() > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-[20px] bg-primary/20 hover:bg-primary/20"
                >
                  {getFilterCount()}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-0"
            align="end"
          >
            <div className="border-b px-3 py-2 flex items-center justify-between">
              <h3 className="font-medium">Filters</h3>
              {getFilterCount() > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-sm"
                  onClick={handleClearAllFilters}
                >
                  Clear all
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-80">
              {renderFilterPanel()}
            </ScrollArea>
          </PopoverContent>
        </Popover>
        
        {/* Filter badges */}
        {getFilterCount() > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {getFilterBadges()}
          </div>
        )}
      </div>
    </div>
  );
} 