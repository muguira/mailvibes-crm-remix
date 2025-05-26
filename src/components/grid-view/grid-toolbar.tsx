import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Filter, Search, Plus, Bell, X, Calendar as CalendarIcon, Calendar, User, Mail, Phone, Building2, CreditCard, Eye, Pin } from "lucide-react";
import { Column } from './types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterPopupBase, FilterColumn } from '@/components/ui/FilterPopupBase';
import { ProfileMenu } from '@/components/layout/profile-menu';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { v4 as uuidv4 } from 'uuid';
import { useLeadsRows } from '@/hooks/supabase/use-leads-rows';
import { toast } from '@/hooks/use-toast';

interface GridToolbarProps {
  listName?: string;
  listType?: string;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterCount: number;
  columns: Column[];
  onApplyFilters: (filters: { columns: string[], values: Record<string, any> }) => void;
  activeFilters: { columns: string[], values: Record<string, any> };
  hiddenColumns?: Column[];
  onUnhideColumn?: (columnId: string) => void;
  frozenColumnIds?: string[];
  onTogglePin?: (columnId: string) => void;
}

export function GridToolbar({ 
  listName = '',
  listType = '', 
  searchTerm,
  onSearchChange,
  filterCount,
  columns,
  onApplyFilters,
  activeFilters,
  hiddenColumns,
  onUnhideColumn,
  frozenColumnIds = [],
  onTogglePin
}: GridToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(activeFilters.columns || []);
  const [filterValues, setFilterValues] = useState<Record<string, any>>(activeFilters.values || {});
  const { updateCell, addContact } = useLeadsRows();
  const [isMobile, setIsMobile] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  // Pin management state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [tempPinnedColumns, setTempPinnedColumns] = useState<string[]>(frozenColumnIds);
  
  // Update temp pinned columns when frozenColumnIds changes
  useEffect(() => {
    setTempPinnedColumns(frozenColumnIds);
  }, [frozenColumnIds]);
  
  // Close popover when navigating away
  useEffect(() => {
    const handleNavigation = () => {
      setIsPinModalOpen(false);
      setIsFilterOpen(false);
      setIsAddContactOpen(false);
    };
    
    // Listen for navigation events
    window.addEventListener('beforeunload', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    
    // Listen for clicks on navigation links
    const handleLinkClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' || target.closest('a')) {
        handleNavigation();
      }
    };
    
    document.addEventListener('click', handleLinkClick);
    
    return () => {
      window.removeEventListener('beforeunload', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
      document.removeEventListener('click', handleLinkClick);
    };
  }, []);
  
  // Pin management functions
  const handleToggleTempPin = (columnId: string) => {
    // Check current frozen state for limit enforcement
    const nonIndexFrozenColumns = frozenColumnIds.filter(id => id !== 'index');
    const maxColumns = 2; // Mobile limit (excluding index)
    
    // Check if we're trying to pin and already at limit
    if (!frozenColumnIds.includes(columnId) && nonIndexFrozenColumns.length >= maxColumns) {
      // Show immediate feedback with toast
      toast({
        title: "Column limit reached",
        description: "You can pin up to 2 columns on mobile.",
        variant: "destructive",
        duration: 2000,
      });
      return; // Don't proceed if already at limit
    }
    
    // Apply the change immediately to the actual frozen columns
    if (onTogglePin) {
      onTogglePin(columnId);
    }
    
    // Update temp state to match the new frozen state
    setTempPinnedColumns(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };
  
  const handleApplyPins = () => {
    // Changes are now applied immediately, so just close the popover
    setIsPinModalOpen(false);
  };
  
  const handleCancelPins = () => {
    setTempPinnedColumns(frozenColumnIds);
    setIsPinModalOpen(false);
  };
  
  // Detect mobile devices based on screen width
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      
      // If switching to desktop, ensure search is expanded
      if (window.innerWidth >= 768) {
        setIsSearchExpanded(true);
      } else {
        // On mobile, collapse when empty
        setIsSearchExpanded(searchTerm.length > 0);
      }
    };
    
    // Check initially
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkMobile);
  }, [searchTerm]);
  
  // Handle search expansion for mobile
  const toggleSearchExpansion = () => {
    if (isMobile) {
      setIsSearchExpanded(!isSearchExpanded);
      // Focus the search input when expanding
      if (!isSearchExpanded) {
        setTimeout(() => {
          const searchInput = document.querySelector('.search-input-field') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        }, 10);
      }
    }
  };
  
  // Add Contact Dialog state
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    status: 'New',
    revenue: ''
  });
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission - updated to use batch operation
  const handleAddContact = () => {
    // Create a unique ID for the new contact
    const newContactId = `lead-${Date.now()}`;
    
    // Combine first and last name for the name field
    let fullName = `${contactForm.firstName} ${contactForm.lastName}`.trim();
    
    // Use email as the name if first/last name fields are empty
    if (!fullName) {
      fullName = contactForm.email;
    }
    
    // Create the new contact row with all properties - use name instead of opportunity
    const newContact = {
      id: newContactId,
      name: fullName, // IMPORTANT: Use name field instead of opportunity
      email: contactForm.email,
      status: contactForm.status,
      company: contactForm.company, // Use company instead of companyName
      revenue: contactForm.revenue ? parseInt(contactForm.revenue, 10) : 0,
      owner: '',
      closeDate: new Date().toISOString().split('T')[0],
      lastContacted: new Date().toISOString().split('T')[0],
      phone: contactForm.phone
    };
    
    // Use the batch contact addition function for better performance
    addContact(newContact);
    
    // Show success message
    toast({
      title: "Contact Added",
      description: `${fullName} has been added successfully.`
    });
    
    // Reset form and close dialog
    setContactForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      status: 'New',
      revenue: ''
    });
    setIsAddContactOpen(false);
    
    // Force a re-render of the grid without a full page reload
    setTimeout(() => {
      // Dispatch a custom event that can be listened for in the parent component
      const refreshEvent = new CustomEvent('contact-added', { detail: newContact });
      document.dispatchEvent(refreshEvent);
      
      // If there were no contacts before, simulate a page navigation to trigger the grid view to reload
      if (document.querySelector('.grid-components-container .flex-col')) {
        window.location.href = window.location.href.split('#')[0];
      }
    }, 200);
  };
  
  // Sync with active filters when they change externally
  useEffect(() => {
    setSelectedColumns(activeFilters.columns);
    setFilterValues(activeFilters.values);
  }, [activeFilters]);

  // Handle status option selection
  const handleStatusOptionSelect = (columnId: string, option: string, checked: boolean) => {
    const newFilterValues = { ...filterValues };
    const currentOptions = Array.isArray(newFilterValues[columnId]) ? [...newFilterValues[columnId]] : [];
    
    if (checked) {
      newFilterValues[columnId] = [...currentOptions, option];
    } else {
      newFilterValues[columnId] = currentOptions.filter(opt => opt !== option);
    }
    
    setFilterValues(newFilterValues);
  };

  // Handle date range filter changes
  const handleDateChange = (columnId: string, type: 'start' | 'end', value: Date | undefined) => {
    const newFilterValues = { ...filterValues };
    newFilterValues[columnId] = {
      ...newFilterValues[columnId] || {},
      [type]: value ? format(value, 'yyyy-MM-dd') : undefined
    };
    
    setFilterValues(newFilterValues);
  };

  // Apply filters
  const handleApplyFilters = () => {
    onApplyFilters({
      columns: selectedColumns,
      values: filterValues
    });
    setIsFilterOpen(false);
  };

  // Clear filters
  const handleClearFilters = () => {
    setSelectedColumns([]);
    setFilterValues({});
    onApplyFilters({
      columns: [],
      values: {}
    });
    setIsFilterOpen(false);
  };

  // Render filter value selector based on column type
  const renderFilterValueSelector = (column: Column) => {
    if (!column) return null;
    
    switch (column.type) {
      case 'status':
        return (
          <div className="space-y-2 mt-2">
            {column.options?.map(option => {
              const isSelected = Array.isArray(filterValues[column.id]) && 
                filterValues[column.id]?.includes(option);
              
              return (
                <div key={option} className="flex items-center space-x-2 py-1">
                  <Checkbox 
                    id={`filter-${column.id}-${option}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => 
                      handleStatusOptionSelect(column.id, option, checked === true)
                    }
                  />
                  <Label htmlFor={`filter-${column.id}-${option}`} className="flex items-center cursor-pointer">
                      <span 
                      className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ 
                          backgroundColor: column.colors?.[option] || '#e5e7eb' 
                        }}
                      />
                      {option}
                  </Label>
                </div>
              );
            })}
          </div>
        );
        
      case 'date':
        const dateValues = filterValues[column.id] || {};
        const startDate = dateValues.start ? new Date(dateValues.start) : undefined;
        const endDate = dateValues.end ? new Date(dateValues.end) : undefined;
        
        return (
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs">From</Label>
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[10005]" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => handleDateChange(column.id, 'start', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">To</Label>
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[10005]" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => handleDateChange(column.id, 'end', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="text-sm py-2 text-muted-foreground">
            No specific filter options for this column type.
          </div>
        );
    }
  };
  
  const columnCount = columns.length;

  // Convert Column type to FilterColumn type for the FilterPopupBase
  const filterColumns: FilterColumn[] = columns.map(col => ({
    id: col.id,
    title: col.title,
    type: col.type,
    options: col.options,
    colors: col.colors
  }));

  // Generate filter tags for individual filter values, not just columns
  const getFilterTags = () => {
    const tags = [];
    
    for (const columnId of selectedColumns) {
      const column = columns.find(col => col.id === columnId);
      if (!column) continue;
      
      const values = filterValues[columnId];
      
      if (Array.isArray(values) && values.length > 0) {
        // For status or multi-select columns, show each selected value as a tag
        values.forEach(value => {
          tags.push(
            <Badge key={`${columnId}-${value}`} variant="outline" className="gap-1">
              {column.title}: {value}
            </Badge>
          );
        });
      } else if (column.type === 'date' && values) {
        // For date ranges, show a combined tag
        const startDate = values.start ? format(new Date(values.start), "MMM d") : null;
        const endDate = values.end ? format(new Date(values.end), "MMM d") : null;
        
        if (startDate || endDate) {
          tags.push(
            <Badge key={`${columnId}-date`} variant="outline" className="gap-1">
              {column.title}: {startDate ? `from ${startDate}` : ''} {endDate ? `to ${endDate}` : ''}
            </Badge>
          );
        }
      } else if (values && typeof values === 'string') {
        // For text or other single-value columns
        tags.push(
          <Badge key={`${columnId}-${values}`} variant="outline" className="gap-1">
            {column.title}: {values}
          </Badge>
        );
      }
    }
    
    return tags;
  };

  return (
    <div className="grid-toolbar">
      <div className="flex items-center justify-between w-full">
        {/* Left side with search input - Mobile optimized */}
        <div className="flex items-center flex-grow">
          {isMobile ? (
            // Mobile-specific layout with buttons in correct order
            <div className="flex items-center w-full">
              {/* Search and filter section */}
              <div className="flex items-center flex-grow relative">
                {/* Container for search icon and filter button when search is collapsed */}
                <div className="flex items-center">
                  {/* Search icon - always visible and clickable on mobile */}
                  <button
                    className="p-2 flex items-center justify-center cursor-pointer"
                    onClick={toggleSearchExpansion}
                  >
                    <Search className="h-4 w-4 text-gray-500" />
                  </button>
                  
                  {/* Filter and Pin buttons - appears next to search icon when search is collapsed */}
                  {!isSearchExpanded && (
                    <div className="flex items-center ml-1">
                      <FilterPopupBase
                        columns={filterColumns}
                        isOpen={isFilterOpen}
                        onOpenChange={setIsFilterOpen}
                        selectedColumns={selectedColumns}
                        onSelectedColumnsChange={setSelectedColumns}
                        filterValues={filterValues}
                        onFilterValuesChange={setFilterValues}
                        onApplyFilters={handleApplyFilters}
                        onClearFilters={handleClearFilters}
                        align="end"
                        renderFilterValueSelector={renderFilterValueSelector}
                        triggerClassName="h-9 w-9 text-gray-500 flex items-center justify-center"
                        iconOnly={true}
                      />
                      
                      {/* Pin management button */}
                      <Popover open={isPinModalOpen} onOpenChange={(open) => {
                        setIsPinModalOpen(open);
                        if (!open) {
                          // Reset temp state when popover closes
                          setTempPinnedColumns(frozenColumnIds);
                        }
                      }}>
                        <PopoverTrigger asChild>
                          <button className="h-9 w-9 text-gray-500 flex items-center justify-center ml-1">
                            <Pin size={16} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="end">
                          <div className="p-3 border-b">
                            <h4 className="font-medium text-sm">Pin Columns</h4>
                            <p className="text-xs text-gray-500 mt-1">Select up to 2 columns to pin</p>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {columns
                              .filter(col => col.id !== 'index') // Exclude index column
                              .map((column) => {
                                const isPinned = frozenColumnIds.includes(column.id);
                                const nonIndexPinnedCount = frozenColumnIds.filter(id => id !== 'index').length;
                                const canPin = isPinned || nonIndexPinnedCount < 2;
                                
                                return (
                                  <button
                                    key={column.id}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between group"
                                    onClick={() => canPin && handleToggleTempPin(column.id)}
                                    disabled={!canPin}
                                  >
                                    <span className={`truncate ${!canPin ? 'text-gray-400' : ''}`}>{column.title}</span>
                                    <Pin 
                                      size={14} 
                                      className={`${
                                        isPinned 
                                          ? 'text-[#62BFAA]' 
                                          : !canPin
                                            ? 'text-gray-300'
                                            : 'text-gray-400 group-hover:text-[#62BFAA]'
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                          </div>
                          <div className="p-3 border-t">
                            <Button 
                              onClick={handleApplyPins}
                              className="w-full bg-[#32BAB0] hover:bg-[#28a79d] text-white"
                              size="sm"
                            >
                              Apply
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
                
                {/* Search input field - expanded when clicked */}
                {isSearchExpanded && (
                  <div className="absolute left-10 right-0 z-10 bg-white transition-all duration-200 ease-in-out flex items-center">
                    <div className="relative flex-grow">
                      <input
                        type="text"
                        className="search-input-field w-full pl-0 pr-6 py-1 text-sm focus:outline-none border-b border-gray-300 focus:border-[#62bfaa]"
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onBlur={() => {
                          if (searchTerm.length === 0) {
                            setIsSearchExpanded(false);
                          }
                        }}
                      />
                      {searchTerm && (
                        <button 
                          onClick={() => onSearchChange('')}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    
                    {/* Filter and Pin buttons - appears next to search when expanded */}
                    <div className="flex items-center ml-1">
                      <FilterPopupBase
                        columns={filterColumns}
                        isOpen={isFilterOpen}
                        onOpenChange={setIsFilterOpen}
                        selectedColumns={selectedColumns}
                        onSelectedColumnsChange={setSelectedColumns}
                        filterValues={filterValues}
                        onFilterValuesChange={setFilterValues}
                        onApplyFilters={handleApplyFilters}
                        onClearFilters={handleClearFilters}
                        align="end"
                        renderFilterValueSelector={renderFilterValueSelector}
                        triggerClassName="h-9 w-9 text-gray-500 flex items-center justify-center"
                        iconOnly={true}
                      />
                      
                      {/* Pin management button */}
                      <Popover open={isPinModalOpen} onOpenChange={(open) => {
                        setIsPinModalOpen(open);
                        if (!open) {
                          // Reset temp state when popover closes
                          setTempPinnedColumns(frozenColumnIds);
                        }
                      }}>
                        <PopoverTrigger asChild>
                          <button className="h-9 w-9 text-gray-500 flex items-center justify-center ml-1">
                            <Pin size={16} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="end">
                          <div className="p-3 border-b">
                            <h4 className="font-medium text-sm">Pin Columns</h4>
                            <p className="text-xs text-gray-500 mt-1">Select up to 2 columns to pin</p>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {columns
                              .filter(col => col.id !== 'index') // Exclude index column
                              .map((column) => {
                                const isPinned = frozenColumnIds.includes(column.id);
                                const nonIndexPinnedCount = frozenColumnIds.filter(id => id !== 'index').length;
                                const canPin = isPinned || nonIndexPinnedCount < 2;
                                
                                return (
                                  <button
                                    key={column.id}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between group"
                                    onClick={() => canPin && handleToggleTempPin(column.id)}
                                    disabled={!canPin}
                                  >
                                    <span className={`truncate ${!canPin ? 'text-gray-400' : ''}`}>{column.title}</span>
                                    <Pin 
                                      size={14} 
                                      className={`${
                                        isPinned 
                                          ? 'text-[#62BFAA]' 
                                          : !canPin
                                            ? 'text-gray-300'
                                            : 'text-gray-400 group-hover:text-[#62BFAA]'
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                          </div>
                          <div className="p-3 border-t">
                            <Button 
                              onClick={handleApplyPins}
                              className="w-full bg-[#32BAB0] hover:bg-[#28a79d] text-white"
                              size="sm"
                            >
                              Apply
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center ml-auto">
                {/* Notification Bell for mobile - positioned left of the Add Contact button */}
                <button className="p-2 rounded-full hover:bg-slate-light/20 text-gray-500">
                  <Bell className="h-5 w-5" />
                </button>
                
                <Button 
                  className="bg-[#32BAB0] hover:bg-[#28a79d] text-white rounded-md h-9 w-9 p-0 flex items-center justify-center ml-2"
                  onClick={() => setIsAddContactOpen(true)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ) : (
            // Desktop layout remains the same
            <>
              <SearchInput
                value={searchTerm}
                onChange={onSearchChange}
                placeholder="Search contacts..."
                width="w-[240px]"
              />
              
              {/* Active filter badges - Only shown when there are filters and space */}
              {filterCount > 0 && (
                <div className="flex gap-1 flex-wrap ml-2">
                  {getFilterTags()}
                </div>
              )}
            </>
          )}
        </div>
              
        {/* Right-aligned section for desktop only */}
        {!isMobile && (
          <div className="flex items-center">
            {/* Column count text - Only shown on desktop */}
            <div className="text-sm text-gray-500 mr-3">
              {columnCount} column{columnCount !== 1 ? 's' : ''}
            </div>
        
            {/* Filter button and Add Contact button */}
            <div className="flex items-center gap-2">
              {/* Unhide columns button - only show if there are hidden columns */}
              {hiddenColumns && hiddenColumns.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-auto px-3 bg-white border border-gray-300 rounded-md flex items-center gap-2 shadow-sm hover:bg-gray-50"
                    >
                      <Eye size={16} />
                      <span className="text-sm">Unhide ({hiddenColumns.length})</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="end">
                    <div className="p-3 border-b">
                      <h4 className="font-medium text-sm">Hidden Columns</h4>
                      <p className="text-xs text-gray-500 mt-1">Click to unhide columns</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {hiddenColumns.map((column) => (
                        <button
                          key={column.id}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between group"
                          onClick={() => onUnhideColumn?.(column.id)}
                        >
                          <span className="truncate">{column.title}</span>
                          <Eye size={14} className="text-gray-400 group-hover:text-gray-600" />
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              
              {/* Filter button */}
              <FilterPopupBase
                columns={filterColumns}
                isOpen={isFilterOpen}
                onOpenChange={setIsFilterOpen}
                selectedColumns={selectedColumns}
                onSelectedColumnsChange={setSelectedColumns}
                filterValues={filterValues}
                onFilterValuesChange={setFilterValues}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
                align="end"
                renderFilterValueSelector={renderFilterValueSelector}
                triggerClassName="h-10 w-10 bg-white border border-gray-300 rounded-md flex items-center justify-center shadow-sm"
                iconOnly={true}
              />
              
              {/* Add Contact button (full text version for desktop) */}
              <Button 
                className="bg-[#32BAB0] hover:bg-[#28a79d] text-white rounded-md px-6 py-2 h-10"
                onClick={() => setIsAddContactOpen(true)}
              >
                Add Contact
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile filter tags - REMOVED to hide on mobile */}
      {/* Only show filter tags on desktop - now handled in desktop view only */}
      
      {/* Add Contact Dialog */}
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent className={isMobile ? "w-[90vw] max-w-[500px] max-h-[80vh] overflow-y-auto" : "sm:max-w-[500px]"}>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Enter the contact information below. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Email Address - moved to the top as the first field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="flex items-center">
                <Mail className="mr-2 h-4 w-4 text-gray-400" />
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="john.doe@example.com" 
                  value={contactForm.email}
                  onChange={handleInputChange}
                  required
                  autoFocus
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
            </div>
            
            <div className={`${isMobile ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-2 gap-4'}`}>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="flex items-center">
                  <User className="mr-2 h-4 w-4 text-gray-400" />
                  <Input 
                    id="firstName" 
                    name="firstName" 
                    placeholder="John" 
                    value={contactForm.firstName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  name="lastName" 
                  placeholder="Doe" 
                  value={contactForm.lastName}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex items-center">
                <Phone className="mr-2 h-4 w-4 text-gray-400" />
                <Input 
                  id="phone" 
                  name="phone" 
                  placeholder="+1 (555) 123-4567" 
                  value={contactForm.phone}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <div className="flex items-center">
                <Building2 className="mr-2 h-4 w-4 text-gray-400" />
                <Input 
                  id="company" 
                  name="company" 
                  placeholder="Acme Inc." 
                  value={contactForm.company}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className={`${isMobile ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-2 gap-4'}`}>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select 
                  id="status" 
                  name="status" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={contactForm.status}
                  onChange={handleInputChange}
                >
                  <option value="New">New</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Closed Won">Closed Won</option>
                  <option value="Closed Lost">Closed Lost</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="revenue">Revenue ($)</Label>
                <div className="flex items-center">
                  <CreditCard className="mr-2 h-4 w-4 text-gray-400" />
                  <Input 
                    id="revenue" 
                    name="revenue" 
                    type="number" 
                    placeholder="0" 
                    value={contactForm.revenue}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
      </div>
          
          <DialogFooter className={isMobile ? "flex-col space-y-2" : ""}>
            <Button 
              variant="outline" 
              onClick={() => setIsAddContactOpen(false)}
              className={isMobile ? "w-full" : ""}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddContact}
              disabled={!contactForm.email}
              className={`bg-[#32BAB0] hover:bg-[#28a79d] text-white ${isMobile ? "w-full" : ""}`}
            >
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      

    </div>
  );
}

