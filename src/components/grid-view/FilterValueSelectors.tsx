import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FilterColumn } from '@/components/ui/FilterPopupBase';
import { useColumnFilterValues } from '@/hooks/supabase/use-column-filter-values';

interface FilterValueSelectorProps {
  column: FilterColumn;
  value: any;
  onChange: (value: any) => void;
  data?: any[]; // Optional data for extracting unique values
}

// Text Filter Component
export function TextFilterSelector({ column, value, onChange }: FilterValueSelectorProps) {
  const [operator, setOperator] = useState(value?.operator || 'contains');
  const [text, setText] = useState(value?.text || '');

  useEffect(() => {
    onChange({
      operator,
      text: text.trim(),
      type: 'text'
    });
  }, [operator, text, onChange]);

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-medium text-gray-600">Filter Type</Label>
        <Select value={operator} onValueChange={setOperator}>
          <SelectTrigger className="w-full mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contains">Contains</SelectItem>
            <SelectItem value="equals">Equals</SelectItem>
            <SelectItem value="starts_with">Starts with</SelectItem>
            <SelectItem value="ends_with">Ends with</SelectItem>
            <SelectItem value="is_empty">Is empty</SelectItem>
            <SelectItem value="is_not_empty">Is not empty</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {operator !== 'is_empty' && operator !== 'is_not_empty' && (
        <div>
          <Label className="text-xs font-medium text-gray-600">Value</Label>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Enter ${column.title.toLowerCase()}...`}
            className="mt-1"
          />
        </div>
      )}
    </div>
  );
}

// Date Filter Component
export function DateFilterSelector({ column, value, onChange }: FilterValueSelectorProps) {
  const [operator, setOperator] = useState(value?.operator || 'between');
  const [startDate, setStartDate] = useState<Date | undefined>(
    value?.startDate ? new Date(value.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    value?.endDate ? new Date(value.endDate) : undefined
  );

  useEffect(() => {
    onChange({
      operator,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      type: 'date'
    });
  }, [operator, startDate, endDate, onChange]);

  const handlePresetSelect = (preset: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const lastYear = new Date(today);
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    switch (preset) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'yesterday':
        setStartDate(yesterday);
        setEndDate(yesterday);
        break;
      case 'last_7_days':
        setStartDate(lastWeek);
        setEndDate(today);
        break;
      case 'last_30_days':
        setStartDate(lastMonth);
        setEndDate(today);
        break;
      case 'last_year':
        setStartDate(lastYear);
        setEndDate(today);
        break;
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-medium text-gray-600">Filter Type</Label>
        <Select value={operator} onValueChange={setOperator}>
          <SelectTrigger className="w-full mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="between">Between</SelectItem>
            <SelectItem value="before">Before</SelectItem>
            <SelectItem value="after">After</SelectItem>
            <SelectItem value="on">On</SelectItem>
            <SelectItem value="is_empty">Is empty</SelectItem>
            <SelectItem value="is_not_empty">Is not empty</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {operator !== 'is_empty' && operator !== 'is_not_empty' && (
        <>
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-2 block">Quick Presets</Label>
            <div className="grid grid-cols-2 gap-1">
              {[
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'last_7_days', label: 'Last 7 days' },
                { key: 'last_30_days', label: 'Last 30 days' },
              ].map((preset) => (
                <Button
                  key={preset.key}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handlePresetSelect(preset.key)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-medium text-gray-600">
                {operator === 'between' ? 'Start Date' : 
                 operator === 'before' ? 'Before' : 
                 operator === 'after' ? 'After' : 'Date'}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {operator === 'between' && (
              <div>
                <Label className="text-xs font-medium text-gray-600">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Status Filter Component
export function StatusFilterSelector({ column, value, onChange, data }: FilterValueSelectorProps) {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(value?.statuses || []);

  // Extract unique status values from data or use predefined options
  const statusOptions = column.options || [
    'New',
    'Qualified',
    'Negotiation', 
    'Deal Won',
    'Deal Lost',
    'Contacted',
    'Follow-up',
    'Unqualified'
  ];

  useEffect(() => {
    onChange({
      statuses: selectedStatuses,
      type: 'status'
    });
  }, [selectedStatuses, onChange]);

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-medium text-gray-600 mb-2 block">Select Status Values</Label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {statusOptions.map((status) => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${status}`}
                checked={selectedStatuses.includes(status)}
                onCheckedChange={() => handleStatusToggle(status)}
              />
              <Label
                htmlFor={`status-${status}`}
                className="text-sm cursor-pointer flex-1"
              >
                <div className="flex items-center">
                  {column.colors?.[status] && (
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: column.colors[status] }}
                    />
                  )}
                  {status}
                </div>
              </Label>
            </div>
          ))}
        </div>
      </div>
      
      {selectedStatuses.length > 0 && (
        <div>
          <Label className="text-xs font-medium text-gray-600 mb-2 block">Selected ({selectedStatuses.length})</Label>
          <div className="flex flex-wrap gap-1">
            {selectedStatuses.map((status) => (
              <div
                key={status}
                className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs"
              >
                {status}
                <X
                  size={12}
                  className="ml-1 cursor-pointer"
                  onClick={() => handleStatusToggle(status)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Number/Currency Filter Component  
export function NumberFilterSelector({ column, value, onChange }: FilterValueSelectorProps) {
  const [operator, setOperator] = useState(value?.operator || 'equals');
  const [number1, setNumber1] = useState(value?.number1 || '');
  const [number2, setNumber2] = useState(value?.number2 || '');

  useEffect(() => {
    onChange({
      operator,
      number1: number1 ? parseFloat(number1) : undefined,
      number2: number2 ? parseFloat(number2) : undefined,
      type: 'number'
    });
  }, [operator, number1, number2, onChange]);

  const isCurrency = column.type === 'currency';

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-medium text-gray-600">Filter Type</Label>
        <Select value={operator} onValueChange={setOperator}>
          <SelectTrigger className="w-full mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals">Equals</SelectItem>
            <SelectItem value="greater_than">Greater than</SelectItem>
            <SelectItem value="less_than">Less than</SelectItem>
            <SelectItem value="greater_equal">Greater than or equal</SelectItem>
            <SelectItem value="less_equal">Less than or equal</SelectItem>
            <SelectItem value="between">Between</SelectItem>
            <SelectItem value="is_empty">Is empty</SelectItem>
            <SelectItem value="is_not_empty">Is not empty</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {operator !== 'is_empty' && operator !== 'is_not_empty' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs font-medium text-gray-600">
              {operator === 'between' ? 'Min Value' : 'Value'}
            </Label>
            <div className="relative mt-1">
              {isCurrency && (
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                  $
                </span>
              )}
              <Input
                type="number"
                value={number1}
                onChange={(e) => setNumber1(e.target.value)}
                placeholder={isCurrency ? "0.00" : "Enter number"}
                className={isCurrency ? "pl-8" : ""}
              />
            </div>
          </div>

          {operator === 'between' && (
            <div>
              <Label className="text-xs font-medium text-gray-600">Max Value</Label>
              <div className="relative mt-1">
                {isCurrency && (
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    $
                  </span>
                )}
                <Input
                  type="number"
                  value={number2}
                  onChange={(e) => setNumber2(e.target.value)}
                  placeholder={isCurrency ? "0.00" : "Enter number"}
                  className={isCurrency ? "pl-8" : ""}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Dropdown Filter Component for default columns with actual data values
export function DropdownFilterSelector({ column, value, onChange, data }: FilterValueSelectorProps) {
  // Define which columns should be multi-select
  const multiSelectColumns = ['industry', 'company', 'importListName', 'jobTitle', 'associatedDeals', 'source'];
  const isMultiSelect = multiSelectColumns.includes(column.id);
  
  const [selectedValues, setSelectedValues] = useState<string[]>(
    isMultiSelect ? (value?.values || []) : (value?.value ? [value.value] : [])
  );

  // Use the new hook to get all unique values for this column
  const { values: hookValues, isLoading: isLoadingValues, error: valuesError } = useColumnFilterValues({
    columnId: column.id,
    enabled: true,
    maxValues: 200
  });

  // Fallback to local data if hook fails or has no data
  const localUniqueValues = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const values = new Set<string>();
    data.forEach(row => {
      const cellValue = row[column.id];
      if (cellValue && cellValue !== '' && typeof cellValue === 'string') {
        values.add(cellValue.trim());
      }
    });
    
    return Array.from(values).sort();
  }, [data, column.id]);

  // Use hook values if available, otherwise fallback to local data
  const uniqueValues = useMemo(() => {
    console.log(`[FilterSelector] ${column.id} - Values comparison:`, {
      hookValues: hookValues?.length || 0,
      localValues: localUniqueValues.length,
      hookSample: hookValues?.slice(0, 3).map(v => v.value),
      localSample: localUniqueValues.slice(0, 3),
    });
    
    if (hookValues && hookValues.length > 0) {
      console.log(`[FilterSelector] ${column.id} - Using hook values (${hookValues.length} total)`);
      return hookValues.map(v => v.value);
    }
    console.log(`[FilterSelector] ${column.id} - Using local values (${localUniqueValues.length} total)`);
    return localUniqueValues;
  }, [hookValues, localUniqueValues, column.id]);

  useEffect(() => {
    if (isMultiSelect) {
      onChange({
        values: selectedValues,
        type: 'dropdown'
      });
    } else {
      onChange({
        value: selectedValues.length > 0 ? selectedValues[0] : '',
        type: 'dropdown'
      });
    }
  }, [selectedValues, onChange, isMultiSelect]);

  const handleValueToggle = (val: string) => {
    if (isMultiSelect) {
      setSelectedValues(prev => 
        prev.includes(val) 
          ? prev.filter(v => v !== val)
          : [...prev, val]
      );
    } else {
      // Single select - replace the selection
      setSelectedValues(prev => prev.includes(val) ? [] : [val]);
    }
  };

  if (isMultiSelect) {
    // Multi-select interface with checkboxes
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-medium text-gray-600 mb-2 block">
            Select {column.title} Values
            {isLoadingValues && (
              <Loader2 className="inline-block w-3 h-3 ml-1 animate-spin" />
            )}
          </Label>
          
          {valuesError && (
            <p className="text-xs text-orange-600 mb-2">
              Using local data - some values may be missing
            </p>
          )}
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uniqueValues.map((val) => (
              <div key={val} className="flex items-center space-x-2">
                <Checkbox
                  id={`${column.id}-${val}`}
                  checked={selectedValues.includes(val)}
                  onCheckedChange={() => handleValueToggle(val)}
                />
                <Label
                  htmlFor={`${column.id}-${val}`}
                  className="text-sm cursor-pointer flex-1 truncate"
                  title={val}
                >
                  {val}
                </Label>
              </div>
            ))}
          </div>
          
          {uniqueValues.length === 0 && !isLoadingValues && (
            <p className="text-sm text-gray-500 py-2">
              No values found for this column
            </p>
          )}
          
          {hookValues && hookValues.length > 0 && (
            <p className="text-xs text-green-600 mt-1">
              Showing all {hookValues.length} unique values
            </p>
          )}
        </div>
        
        {selectedValues.length > 0 && (
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-2 block">
              Selected ({selectedValues.length})
            </Label>
            <div className="flex flex-wrap gap-1">
              {selectedValues.map((val) => (
                <div
                  key={val}
                  className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs max-w-[120px]"
                >
                  <span className="truncate" title={val}>{val}</span>
                  <X
                    size={12}
                    className="ml-1 cursor-pointer flex-shrink-0"
                    onClick={() => handleValueToggle(val)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  } else {
    // Single-select interface with dropdown
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-medium text-gray-600">
            Select {column.title}
            {isLoadingValues && (
              <Loader2 className="inline-block w-3 h-3 ml-1 animate-spin" />
            )}
          </Label>
          
          {valuesError && (
            <p className="text-xs text-orange-600 mb-2">
              Using local data - some values may be missing
            </p>
          )}
          
          <Select value={selectedValues.length > 0 ? selectedValues[0] : '__all__'} onValueChange={(val) => setSelectedValues(val === '__all__' ? [] : [val])}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder={`Choose ${column.title.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All {column.title}s</SelectItem>
              {uniqueValues.map((val) => (
                <SelectItem key={val} value={val}>
                  {val}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {uniqueValues.length === 0 && !isLoadingValues && (
            <p className="text-sm text-gray-500 py-2 mt-1">
              No values found for this column
            </p>
          )}
          
          {hookValues && hookValues.length > 0 && (
            <p className="text-xs text-green-600 mt-1">
              Showing all {hookValues.length} unique values
            </p>
          )}
        </div>
      </div>
    );
  }
}

// Hidden Columns Filter Component - Simple checkbox to show/hide columns temporarily
export function HiddenColumnsFilterSelector({ column, value, onChange }: FilterValueSelectorProps) {
  const [showHiddenColumns, setShowHiddenColumns] = useState(value?.showHidden || false);

  const handleCheckboxChange = useCallback((checked: boolean) => {
    setShowHiddenColumns(checked);
    onChange({
      showHidden: checked,
      type: 'hidden_columns'
    });
  }, [onChange]);

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-medium text-gray-600">Hidden Columns Visibility</Label>
        <div className="mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-hidden-columns"
              checked={showHiddenColumns}
              onCheckedChange={handleCheckboxChange}
            />
            <Label
              htmlFor="show-hidden-columns"
              className="text-sm cursor-pointer"
            >
              Show hidden columns temporarily
            </Label>
          </div>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-2">
        When enabled, hidden columns will be visible. Remove this filter to hide them again.
      </div>
    </div>
  );
}

// Main Filter Value Selector Component
export function FilterValueSelector({ column, value, onChange, data }: FilterValueSelectorProps) {
  // Safety check - return null if column is undefined
  if (!column) {
    return null;
  }
  
  // Handle special Hidden Columns filter
  if (column.id === '__hidden_columns__') {
    return <HiddenColumnsFilterSelector column={column} value={value} onChange={onChange} data={data} />;
  }
  
  // Use dropdown filter for specific default columns that should show actual data values
  const dropdownColumns = ['company', 'industry', 'source', 'jobTitle', 'associatedDeals', 'importListName'];
  
  if (dropdownColumns.includes(column.id)) {
    return <DropdownFilterSelector column={column} value={value} onChange={onChange} data={data} />;
  }
  
  // Use type-based filters for other columns
  switch (column.type) {
    case 'text':
      return <TextFilterSelector column={column} value={value} onChange={onChange} data={data} />;
    case 'date':
      return <DateFilterSelector column={column} value={value} onChange={onChange} data={data} />;
    case 'status':
      return <StatusFilterSelector column={column} value={value} onChange={onChange} data={data} />;
    case 'number':
    case 'currency':
      return <NumberFilterSelector column={column} value={value} onChange={onChange} data={data} />;
    default:
      return <TextFilterSelector column={column} value={value} onChange={onChange} data={data} />;
  }
} 