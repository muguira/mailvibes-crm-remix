import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Filter, Search, Plus, Bell, X, Calendar as CalendarIcon, Calendar, User, Mail, Phone, Building2, CreditCard, Eye, Pin, Trash2, Loader2 } from "lucide-react";
import { Column, GridRow } from './types';
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
  selectedRowIds?: Set<string>;
  onDeleteSelectedContacts?: () => void;
  isContactDeletionLoading?: boolean;
  data?: GridRow[];
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
  onTogglePin,
  selectedRowIds = new Set(),
  data = [],
  onDeleteSelectedContacts,
  isContactDeletionLoading = false
}: GridToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(activeFilters.columns || []);
  const [filterValues, setFilterValues] = useState<Record<string, any>>(activeFilters.values || {});
  const { updateCell, addContact } = useLeadsRows();
  const [isMobile, setIsMobile] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  
  // Pin management state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [tempPinnedColumns, setTempPinnedColumns] = useState<string[]>(frozenColumnIds);
  
  // Contact form state
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    status: 'New',
    revenue: ''
  });
  
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
  
  // Filter columns to show only those with filterable types
  const filterColumns = columns.filter(col => 
    ['text', 'number', 'date', 'status', 'currency'].includes(col.type)
  );
  
  // Helper function to apply filters
  function handleApplyFilters() {
    onApplyFilters({
      columns: selectedColumns,
      values: filterValues
    });
  }
  
  return (
    <div className="grid-toolbar">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          {/* Search input */}
          <div className="relative">
            <SearchInput 
              value={searchTerm}
              onChange={onSearchChange}
              placeholder="Search contacts..."
              className="w-full max-w-xs"
            />
          </div>
          
          {/* Show delete button when rows are selected - immediately to the right of search */}
          {selectedRowIds.size > 0 && (
            <div className="flex items-center ml-6">
              <Button 
                variant="outline" 
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={onDeleteSelectedContacts}
                disabled={isContactDeletionLoading}
              >
                {isContactDeletionLoading ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </>
                )}
              </Button>
              <span className="text-sm font-medium text-gray-700 ml-2">
                {selectedRowIds.size} selected
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Filter button */}
          <div className="flex items-center toolbar-button-container">
            <FilterPopupBase
              columns={filterColumns}
              isOpen={isFilterOpen}
              onOpenChange={setIsFilterOpen}
              selectedColumns={selectedColumns}
              onSelectedColumnsChange={setSelectedColumns}
              filterValues={filterValues}
              onFilterValuesChange={setFilterValues}
              onApplyFilters={handleApplyFilters}
              onClearFilters={() => {
                setSelectedColumns([]);
                setFilterValues({});
                onApplyFilters({ columns: [], values: {} });
              }}
              align="end"
              triggerClassName={`h-9 px-3 border border-gray-300 rounded-md text-sm flex items-center ${filterCount > 0 ? "has-filters" : ""}`}
              iconOnly={isMobile}
            />
          </div>
          
          {/* Add Contact button */}
          <div className="flex items-center toolbar-button-container">
            <Button 
              size={isMobile ? "icon" : "sm"}
              onClick={() => setIsAddContactOpen(true)}
              className={`bg-[#32BAB0] hover:bg-[#28a79d] text-white ${isMobile ? 'mobile-add-btn' : ''}`}
            >
              {isMobile ? (
                <div className="icon-container">
                  <Plus className="h-4 w-4 plus-icon" />
                  <User className="h-4 w-4 user-icon" />
                </div>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  <span>Add Contact</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
