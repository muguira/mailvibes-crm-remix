import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/SearchInput";
import { Loader2, Search, User, Building2 } from "lucide-react";
import { useInstantContacts } from '@/hooks/use-instant-contacts';
import { ConvertToOpportunityModal } from './ConvertToOpportunityModal';

interface Contact {
  id: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
}

interface SelectContactsForOpportunitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConvert: (contacts: Contact[], conversionData: {
    accountName: string;
    dealValue: number;
    closeDate?: Date;
    stage: string;
    priority: string;
    contacts: Array<{
      id: string;
      name: string;
      email?: string;
      company?: string;
      role: string;
    }>;
  }) => void;
  isLoading?: boolean;
}

export function SelectContactsForOpportunitiesModal({
  isOpen,
  onClose,
  onConvert,
  isLoading = false
}: SelectContactsForOpportunitiesModalProps) {
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showConversionModal, setShowConversionModal] = useState(false);

  // Fetch contacts using the existing hook
  const {
    rows: contacts,
    loading: contactsLoading,
    totalCount
  } = useInstantContacts({
    searchTerm,
    pageSize: 100, // Show more contacts at once
    currentPage: 1,
    columnFilters: []
  });

  // Filter and transform contacts for display
  const displayContacts = useMemo(() => {
    return contacts.map(contact => ({
      id: contact.id,
      name: contact.name || 'Unnamed Contact',
      email: contact.email,
      company: contact.company,
      phone: contact.phone
    }));
  }, [contacts]);

  // Reset selection when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedContactIds(new Set());
      setSearchTerm('');
      setShowConversionModal(false);
    }
  }, [isOpen]);

  // Handle contact selection
  const handleContactSelect = (contactId: string, checked: boolean) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(contactId);
      } else {
        newSet.delete(contactId);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContactIds(new Set(displayContacts.map(c => c.id)));
    } else {
      setSelectedContactIds(new Set());
    }
  };

  // Handle proceeding to conversion
  const handleProceedToConversion = () => {
    if (selectedContactIds.size === 0) return;
    setShowConversionModal(true);
  };

  // Handle final conversion
  const handleConvert = (conversionData: {
    accountName: string;
    dealValue: number;
    closeDate?: Date;
    stage: string;
    priority: string;
    contacts: Array<{
      id: string;
      name: string;
      email?: string;
      company?: string;
      role: string;
    }>;
  }) => {
    // Pass full contact objects instead of just IDs
    const selectedContactsData = displayContacts.filter(c => selectedContactIds.has(c.id));
    onConvert(selectedContactsData, conversionData);
    setShowConversionModal(false);
  };

  const selectedContacts = displayContacts.filter(c => selectedContactIds.has(c.id));
  const isAllSelected = displayContacts.length > 0 && selectedContactIds.size === displayContacts.length;
  const isSomeSelected = selectedContactIds.size > 0 && selectedContactIds.size < displayContacts.length;

  return (
    <>
      <Dialog open={isOpen && !showConversionModal} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Contacts to Convert</DialogTitle>
            <DialogDescription>
              Choose existing contacts to convert to opportunities. You can search and select multiple contacts.
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="space-y-4">
            <div className="relative">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search contacts..."
                className="w-full"
              />
            </div>

            {/* Select All Checkbox */}
            {displayContacts.length > 0 && (
              <div className="flex items-center space-x-2 border-b pb-3">
                <Checkbox
                  id="select-all"
                  checked={isAllSelected}
                  ref={(ref) => {
                    if (ref) ref.indeterminate = isSomeSelected;
                  }}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm font-medium">
                  Select All ({displayContacts.length} contact{displayContacts.length !== 1 ? 's' : ''})
                </Label>
                {selectedContactIds.size > 0 && (
                  <span className="text-sm text-[#32BAB0] font-medium">
                    {selectedContactIds.size} selected
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto max-h-96">
            {contactsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#32BAB0]" />
                <span className="ml-2 text-sm text-gray-600">Loading contacts...</span>
              </div>
            ) : displayContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <User className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Add some contacts first to convert them to opportunities.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                      selectedContactIds.has(contact.id)
                        ? 'bg-[#32BAB0]/5 border-[#32BAB0]/30'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Checkbox
                      id={`contact-${contact.id}`}
                      checked={selectedContactIds.has(contact.id)}
                      onCheckedChange={(checked) => handleContactSelect(contact.id, checked as boolean)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {contact.name}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1">
                        {contact.email && (
                          <span className="text-xs text-gray-500 truncate">
                            {contact.email}
                          </span>
                        )}
                        {contact.company && (
                          <div className="flex items-center space-x-1">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500 truncate">
                              {contact.company}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleProceedToConversion}
              disabled={selectedContactIds.size === 0 || isLoading}
              className="bg-[#32BAB0] hover:bg-[#28a79d] text-white"
            >
              Convert {selectedContactIds.size} Contact{selectedContactIds.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Opportunities Modal */}
      <ConvertToOpportunityModal
        isOpen={showConversionModal}
        onClose={() => setShowConversionModal(false)}
        onConvert={handleConvert}
        selectedContacts={selectedContacts}
        isLoading={isLoading}
        allContacts={contacts} // Pass all contacts for intelligent suggestions
      />
    </>
  );
} 