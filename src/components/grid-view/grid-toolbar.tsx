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
import { useContactsStore } from '@/stores/contactsStore';
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
  
  // Reset form when dialog closes
  useEffect(() => {
    if (!isAddContactOpen) {
      setContactForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        status: 'New',
        revenue: ''
      });
    }
  }, [isAddContactOpen]);
  
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
  
  // Handle form input changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle form submission
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactForm.email.trim()) {
      toast({
        title: "Error",
        description: "Email address is required",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Determine the display name for the contact
      const name = contactForm.firstName && contactForm.lastName
        ? `${contactForm.firstName} ${contactForm.lastName}`
        : contactForm.firstName || contactForm.lastName
        ? contactForm.firstName || contactForm.lastName
        : contactForm.email;
      
      // Create the contact object
      const newContact = {
        id: uuidv4(), // This will be replaced by the addContact function
        name,
        email: contactForm.email,
        phone: contactForm.phone,
        company: contactForm.company,
        status: contactForm.status,
        revenue: contactForm.revenue ? parseFloat(contactForm.revenue) : undefined
      };
      
      // Close the dialog first for better UX (especially on mobile)
      setIsAddContactOpen(false);
      
      // Reset the form
      setContactForm({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        company: '',
        status: 'New',
        revenue: ''
      });
      
      // Add to contacts store immediately for instant visibility
      const { addContact: addToStore } = useContactsStore.getState();
      addToStore(newContact);
      
      // Also add via the useLeadsRows hook for database persistence
      await addContact(newContact);
      
      // Show a brief success message that auto-dismisses quickly
      const { dismiss } = toast({
        title: "Contact Added",
        description: `${name} has been added successfully`,
        variant: "default",
        duration: 3000, // 3 seconds instead of default
        className: "mobile-friendly-toast", // Add custom class for mobile styling
      });
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        dismiss();
      }, 3000);
      
    } catch (error) {
      console.error("Error adding contact:", error);
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };
  
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
      
      {/* Add Contact Dialog */}
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Enter the contact information below. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddContact}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={contactForm.firstName}
                    onChange={handleFormChange}
                    placeholder="John"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={contactForm.lastName}
                    onChange={handleFormChange}
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <Input
                    id="email"
                    name="email"
                    value={contactForm.email}
                    onChange={handleFormChange}
                    placeholder="example@email.com"
                    required
                    type="email"
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <Input
                    id="phone"
                    name="phone"
                    value={contactForm.phone}
                    onChange={handleFormChange}
                    placeholder="+1 (555) 123-4567"
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="company">Company</Label>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <Input
                    id="company"
                    name="company"
                    value={contactForm.company}
                    onChange={handleFormChange}
                    placeholder="Acme Inc."
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    value={contactForm.status}
                    onChange={(e) => setContactForm(prev => ({ ...prev, status: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="revenue">Revenue ($)</Label>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <Input
                      id="revenue"
                      name="revenue"
                      value={contactForm.revenue}
                      onChange={handleFormChange}
                      placeholder="0"
                      type="number"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddContactOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-[#32BAB0] hover:bg-[#28a79d] text-white"
              >
                Add Contact
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
