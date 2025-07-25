import React, { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, DollarSign, Target, Calendar as CalendarIconRegular, Building2, User, Plus, X, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { GridRow } from './types';
import { PIPELINE_STAGES } from '@/types/opportunities';
import { Badge } from "@/components/ui/badge";

// Contact roles for opportunities
const CONTACT_ROLES = [
  { value: 'decision_maker', label: 'Decision Maker' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'champion', label: 'Champion' },
  { value: 'gatekeeper', label: 'Gatekeeper' },
  { value: 'end_user', label: 'End User' },
  { value: 'technical_buyer', label: 'Technical Buyer' },
  { value: 'economic_buyer', label: 'Economic Buyer' },
  { value: 'coach', label: 'Coach' }
];

interface ContactWithRole {
  id: string;
  name: string;
  email?: string;
  company?: string;
  role: string;
}

interface ConvertToOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConvert: (conversionData: {
    accountName: string;
    dealValue: number;
    closeDate?: Date;
    stage: string;
    priority: string;
    contacts: ContactWithRole[];
  }) => void;
  selectedContacts: GridRow[];
  isLoading?: boolean;
  allContacts?: GridRow[]; // All available contacts for intelligent suggestions
}

export function ConvertToOpportunityModal({
  isOpen,
  onClose,
  onConvert,
  selectedContacts,
  isLoading = false,
  allContacts = []
}: ConvertToOpportunityModalProps) {
  const [accountName, setAccountName] = useState<string>('');
  const [dealValue, setDealValue] = useState<string>('');
  const [closeDate, setCloseDate] = useState<Date>();
  const [stage, setStage] = useState<string>('Lead/New');
  const [priority, setPriority] = useState<string>('Medium');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isContactSearchOpen, setIsContactSearchOpen] = useState(false);
  const [hasUserEditedAccountName, setHasUserEditedAccountName] = useState(false);
  
  // Initialize contacts with roles - first contact gets 'decision_maker' by default
  const [contactsWithRoles, setContactsWithRoles] = useState<ContactWithRole[]>(() => {
    return selectedContacts.map((contact, index) => ({
      id: contact.id,
      name: contact.name || 'Unnamed Contact',
      email: contact.email,
      company: contact.company,
      role: index === 0 ? 'decision_maker' : 'influencer' // First contact is decision maker
    }));
  });

  // Auto-populate account name from the first contact's company (only when modal opens and user hasn't edited)
  React.useEffect(() => {
    if (isOpen && selectedContacts.length > 0 && !hasUserEditedAccountName) {
      const firstContact = selectedContacts[0];
      if (firstContact.company) {
        setAccountName(firstContact.company);
      } else {
        // If no company, suggest the domain from email
        const domain = firstContact.email?.split('@')[1];
        if (domain) {
          // Convert domain to a readable company name (remove .com, capitalize)
          const companyName = domain.replace(/\.(com|org|net|io|co)$/i, '')
            .split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
          setAccountName(companyName);
        }
      }
    }
  }, [isOpen, selectedContacts, hasUserEditedAccountName]); // Only auto-populate when modal opens

  // Get intelligent contact suggestions based on email domains
  const getSuggestedContacts = () => {
    if (contactsWithRoles.length === 0) return [];
    
    // Get email domains from current contacts in the opportunity
    const currentDomains = contactsWithRoles
      .map(contact => contact.email?.split('@')[1])
      .filter(Boolean);
    
    if (currentDomains.length === 0) return [];
    
    // Find other contacts with same domains that aren't already in the opportunity
    const currentContactIds = new Set(contactsWithRoles.map(c => c.id));
    
    return allContacts.filter(contact => {
      if (currentContactIds.has(contact.id)) return false;
      if (!contact.email) return false;
      
      const contactDomain = contact.email.split('@')[1];
      return currentDomains.includes(contactDomain);
    });
  };

  const suggestedContacts = getSuggestedContacts();

  // Reset contacts with roles when selectedContacts changes
  React.useEffect(() => {
    setContactsWithRoles(selectedContacts.map((contact, index) => ({
      id: contact.id,
      name: contact.name || 'Unnamed Contact',
      email: contact.email,
      company: contact.company,
      role: index === 0 ? 'decision_maker' : 'influencer'
    })));
    // Reset the edit flag when contacts change so user gets fresh suggestions
    setHasUserEditedAccountName(false);
  }, [selectedContacts]);

  // Form validation - require account name and valid deal value
  const isFormValid = accountName.trim() !== '' && dealValue !== '' && !isNaN(Number(dealValue)) && Number(dealValue) >= 0 && stage;

  const handleConvert = () => {
    if (!isFormValid) return;

    onConvert({
      accountName: accountName.trim(),
      dealValue: Number(dealValue),
      closeDate: closeDate,
      stage,
      priority,
      contacts: contactsWithRoles
    });
  };

  const handleClose = () => {
    // Reset form
    setAccountName('');
    setDealValue('');
    setCloseDate(undefined);
    setStage('Lead/New');
    setPriority('Medium');
    setIsCalendarOpen(false);
    setIsContactSearchOpen(false);
    setHasUserEditedAccountName(false); // Reset the edit flag
    // Reset contacts with roles
    setContactsWithRoles(selectedContacts.map((contact, index) => ({
      id: contact.id,
      name: contact.name || 'Unnamed Contact',
      email: contact.email,
      company: contact.company,
      role: index === 0 ? 'decision_maker' : 'influencer'
    })));
    onClose();
  };

  const handleContactRoleChange = (contactId: string, newRole: string) => {
    setContactsWithRoles(prev => 
      prev.map(contact => 
        contact.id === contactId 
          ? { ...contact, role: newRole }
          : contact
      )
    );
  };

  const handleAddSuggestedContact = (contact: GridRow, role: string = 'influencer') => {
    const newContact: ContactWithRole = {
      id: contact.id,
      name: contact.name || 'Unnamed Contact',
      email: contact.email,
      company: contact.company,
      role
    };
    
    setContactsWithRoles(prev => [...prev, newContact]);
  };

  const handleRemoveContact = (contactId: string) => {
    // Don't allow removing if it's the only contact
    if (contactsWithRoles.length <= 1) return;
    
    setContactsWithRoles(prev => prev.filter(contact => contact.id !== contactId));
  };

  const handleContactSearchSelect = (contacts: GridRow[]) => {
    // Add selected contacts with default role of 'influencer'
    const newContacts: ContactWithRole[] = contacts.map(contact => ({
      id: contact.id,
      name: contact.name || 'Unnamed Contact',
      email: contact.email,
      company: contact.company,
      role: 'influencer'
    }));
    
    // Filter out contacts that are already added
    const currentContactIds = new Set(contactsWithRoles.map(c => c.id));
    const filteredNewContacts = newContacts.filter(contact => !currentContactIds.has(contact.id));
    
    setContactsWithRoles(prev => [...prev, ...filteredNewContacts]);
    setIsContactSearchOpen(false);
  };

  const getRoleLabel = (roleValue: string) => {
    return CONTACT_ROLES.find(role => role.value === roleValue)?.label || roleValue;
  };

  const getRoleColor = (roleValue: string) => {
    const colorMap: Record<string, string> = {
      'decision_maker': 'bg-green-100 text-green-800',
      'influencer': 'bg-blue-100 text-blue-800',
      'champion': 'bg-purple-100 text-purple-800',
      'gatekeeper': 'bg-orange-100 text-orange-800',
      'end_user': 'bg-gray-100 text-gray-800',
      'technical_buyer': 'bg-indigo-100 text-indigo-800',
      'economic_buyer': 'bg-emerald-100 text-emerald-800',
      'coach': 'bg-pink-100 text-pink-800'
    };
    return colorMap[roleValue] || 'bg-gray-100 text-gray-800';
  };

  const selectedStage = PIPELINE_STAGES.find(s => s.value === stage);

  return (
    <>
      <Dialog open={isOpen && !isContactSearchOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[552px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-1">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-[#32BAB0]" />
              Convert to Opportunity
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create a new opportunity with account details and contact roles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Account Name - First and most prominent field */}
            <div className="space-y-1">
              <Label htmlFor="accountName" className="flex items-center gap-2 text-xs font-medium">
                <Building2 className="h-3 w-3 text-[#32BAB0]" />
                Account Name *
              </Label>
              <Input
                id="accountName"
                placeholder="Company name or Project name"
                value={accountName}
                onChange={(e) => {
                  setAccountName(e.target.value);
                  setHasUserEditedAccountName(true); // Mark that user has manually edited the field
                }}
                className="text-sm font-medium border-2 border-[#32BAB0]/20 focus:border-[#32BAB0] h-8"
                autoFocus
              />
            </div>

            {/* Contacts with Roles */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-medium">
                <User className="h-3 w-3 text-[#32BAB0]" />
                Contact Roles
              </Label>
              <div className="space-y-1.5 bg-gray-50 rounded-lg p-2">
                {contactsWithRoles.map((contact, index) => (
                  <div key={contact.id} className="flex items-center gap-2 bg-white rounded-md p-1.5 border text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate text-xs">{contact.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {contact.email && <span>{contact.email}</span>}
                        {contact.company && contact.email && <span> • </span>}
                        {contact.company && <span>{contact.company}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Select 
                        value={contact.role} 
                        onValueChange={(value) => handleContactRoleChange(contact.id, value)}
                      >
                        <SelectTrigger className="w-[160px] h-7 text-xs">
                          <SelectValue>
                            <Badge className={cn("text-xs px-1 py-0", getRoleColor(contact.role))}>
                              {getRoleLabel(contact.role)}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {CONTACT_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <Badge className={cn("text-xs px-1 py-0", getRoleColor(role.value))}>
                                {role.label}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {contactsWithRoles.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveContact(contact.id)}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Intelligent suggestions */}
                {suggestedContacts.length > 0 && (
                  <div className="pt-1 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Suggested contacts from the same company:</p>
                    {suggestedContacts.slice(0, 2).map((contact) => (
                      <div key={contact.id} className="flex items-center gap-2 bg-blue-50 rounded-md p-1.5 border border-blue-200 text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate text-xs">{contact.name}</div>
                          <div className="text-xs text-gray-500 truncate">{contact.email}</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddSuggestedContact(contact)}
                          className="h-6 px-2 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Search contact link */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsContactSearchOpen(true)}
                    className="text-xs text-[#48bfb6] hover:text-[#3da39a] flex items-center gap-1 font-medium"
                  >
                    <Search className="h-3 w-3" />
                    Search contact...
                  </button>
                </div>
              </div>
            </div>

            {/* Deal Value */}
            <div className="space-y-1">
              <Label htmlFor="dealValue" className="flex items-center gap-2 text-xs">
                <DollarSign className="h-3 w-3" />
                Deal Value
              </Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">$</span>
                <Input
                  id="dealValue"
                  type="number"
                  placeholder="0"
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  className="pl-6 h-8 text-xs"
                  min="0"
                  step="100"
                />
              </div>
            </div>

            {/* Close Date */}
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-xs">
                <CalendarIconRegular className="h-3 w-3" />
                Expected Close Date <span className="text-xs text-gray-500 font-normal">(optional)</span>
              </Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-8 text-xs",
                      !closeDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {closeDate ? format(closeDate, "PPP") : "Select close date (optional)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={closeDate}
                    onSelect={(date) => {
                      setCloseDate(date);
                      setIsCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {closeDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCloseDate(undefined)}
                  className="text-xs text-gray-500 hover:text-gray-700 h-5 px-2"
                >
                  Clear date
                </Button>
              )}
            </div>

            {/* Pipeline Stage */}
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-xs">
                <Target className="h-3 w-3" />
                Pipeline Stage
              </Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger className="h-8">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: selectedStage?.color }}
                      />
                      <span className="text-xs">{selectedStage?.label}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map((stageOption) => (
                    <SelectItem key={stageOption.value} value={stageOption.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: stageOption.color }}
                        />
                        <span className="text-xs">{stageOption.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button variant="outline" onClick={handleClose} disabled={isLoading} className="h-8 text-xs">
              Cancel
            </Button>
            <Button 
              onClick={handleConvert}
              disabled={!isFormValid || isLoading}
              className="bg-[#32BAB0] hover:bg-[#28a79d] text-white h-8 text-xs"
            >
              {isLoading ? 'Creating...' : `Create Opportunity`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Search Modal */}
      <ContactSearchModal
        isOpen={isContactSearchOpen}
        onClose={() => setIsContactSearchOpen(false)}
        onSelect={handleContactSearchSelect}
        allContacts={allContacts}
        excludeContactIds={contactsWithRoles.map(c => c.id)}
      />
    </>
  );
}

// Contact Search Modal Component
interface ContactSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (contacts: GridRow[]) => void;
  allContacts: GridRow[];
  excludeContactIds: string[];
}

function ContactSearchModal({ isOpen, onClose, onSelect, allContacts, excludeContactIds }: ContactSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  // Filter contacts based on search and exclude already added ones
  const filteredContacts = allContacts.filter(contact => {
    if (excludeContactIds.includes(contact.id)) return false;
    
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.company?.toLowerCase().includes(searchLower)
    );
  });

  const handleContactToggle = (contactId: string) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleSelect = () => {
    const selectedContacts = allContacts.filter(contact => selectedContactIds.has(contact.id));
    onSelect(selectedContacts);
    setSelectedContactIds(new Set());
    setSearchTerm('');
  };

  const handleModalClose = () => {
    setSelectedContactIds(new Set());
    setSearchTerm('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent 
        className="sm:max-w-lg max-h-[80vh] overflow-y-auto"
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-[#32BAB0]" />
            Select Contacts
          </DialogTitle>
          <DialogDescription className="text-xs">
            Choose contacts to add to this opportunity. You can search and select multiple contacts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 text-sm border-2 border-[#32BAB0]/20 focus:border-[#32BAB0]"
            />
          </div>

          {/* Select All */}
          <div className="flex items-center space-x-2 px-1">
            <input
              type="checkbox"
              id="selectAll"
              checked={filteredContacts.length > 0 && filteredContacts.every(contact => selectedContactIds.has(contact.id))}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedContactIds(new Set(filteredContacts.map(c => c.id)));
                } else {
                  setSelectedContactIds(new Set());
                }
              }}
              className="rounded border-gray-300 text-[#32BAB0] focus:ring-[#32BAB0]"
            />
            <Label htmlFor="selectAll" className="text-xs font-medium">
              Select All ({filteredContacts.length} contacts) 
              {selectedContactIds.size > 0 && (
                <span className="text-[#32BAB0] ml-1">
                  • {selectedContactIds.size} selected
                </span>
              )}
            </Label>
          </div>

          {/* Contact List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors",
                  selectedContactIds.has(contact.id) 
                    ? "bg-[#32BAB0]/10 border-[#32BAB0]/30" 
                    : "bg-white border-gray-200"
                )}
                onClick={() => handleContactToggle(contact.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedContactIds.has(contact.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleContactToggle(contact.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-gray-300 text-[#32BAB0] focus:ring-[#32BAB0]"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{contact.name || 'Unnamed Contact'}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {contact.email && <span>{contact.email}</span>}
                    {contact.company && contact.email && <span> • </span>}
                    {contact.company && <span>{contact.company}</span>}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredContacts.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                {searchTerm ? 'No contacts found matching your search.' : 'No contacts available.'}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3">
          <Button variant="outline" onClick={handleModalClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button 
            onClick={handleSelect}
            disabled={selectedContactIds.size === 0}
            className="bg-[#32BAB0] hover:bg-[#28a79d] text-white h-8 text-xs"
          >
            Add {selectedContactIds.size} Contact{selectedContactIds.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 