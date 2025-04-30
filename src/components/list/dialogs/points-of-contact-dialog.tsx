
import { useState, useEffect } from "react";
import { X, Plus, Search, Trash2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/custom-button";
import { useContacts } from "@/hooks/supabase";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

export interface PointsOfContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  opportunityId: string;
  opportunityName: string;
  companyDomain?: string;
  onSave: (selectedContacts: any[]) => void;
  initialContacts?: any[];
}

export function PointsOfContactDialog({
  isOpen,
  onClose,
  listId,
  opportunityId,
  opportunityName,
  companyDomain,
  onSave,
  initialContacts = []
}: PointsOfContactDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<any[]>(initialContacts);
  const [suggestedContacts, setSuggestedContacts] = useState<any[]>([]);
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);
  const [newContactInfo, setNewContactInfo] = useState({ name: "", email: "", phone: "" });
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  
  const { contacts: allContacts, createContact } = useContacts(listId);
  const { toast } = useToast();
  
  // Generate mock suggested contacts based on company domain
  useEffect(() => {
    if (companyDomain) {
      // In a real app, this would fetch suggestions from email integration
      const mockSuggestions = [
        { id: "sugg1", name: "Alessandro Nuti", email: `alessandro@${companyDomain}`, company: companyDomain },
        { id: "sugg2", name: "Amy Bond", email: `amy@${companyDomain}`, company: companyDomain },
        { id: "sugg3", name: "Support Team", email: `support@${companyDomain}`, company: companyDomain },
      ].filter(contact => 
        !selectedContacts.some(selected => selected.id === contact.id)
      );
      
      setSuggestedContacts(mockSuggestions);
    } else {
      setSuggestedContacts([]);
    }
  }, [companyDomain, selectedContacts]);

  // Filter contacts based on search query
  const filteredContacts = allContacts
    .filter(contact => 
      !selectedContacts.some(selected => selected.id === contact.id) &&
      (contact.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
       (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase())))
    )
    .slice(0, 5); // Limit to 5 results

  // Handle adding a contact
  const handleAddContact = (contact: any) => {
    setSelectedContacts(prev => [...prev, contact]);
    setSearchQuery("");
  };

  // Handle removing a contact
  const handleRemoveContact = (contactId: string) => {
    setSelectedContacts(prev => prev.filter(contact => contact.id !== contactId));
  };

  // Handle adding all suggested contacts
  const handleAddAllSuggested = () => {
    const newSelectedContacts = [...selectedContacts];
    suggestedContacts.forEach(contact => {
      if (!selectedContacts.some(selected => selected.id === contact.id)) {
        newSelectedContacts.push(contact);
      }
    });
    setSelectedContacts(newSelectedContacts);
  };

  // Handle removing all contacts
  const handleRemoveAllContacts = () => {
    setSelectedContacts([]);
    setConfirmDeleteAllOpen(false);
  };

  // Handle creating a new contact
  const handleCreateContact = () => {
    if (!newContactInfo.name.trim()) return;
    
    const newContact = {
      id: crypto.randomUUID(),
      name: newContactInfo.name,
      email: newContactInfo.email,
      phone: newContactInfo.phone,
      company: companyDomain || "",
      data: {},
    };
    
    createContact(newContact);
    handleAddContact(newContact);
    setNewContactInfo({ name: "", email: "", phone: "" });
    setIsCreateContactOpen(false);
  };

  // Handle saving all changes
  const handleSave = () => {
    onSave(selectedContacts);
    toast({
      title: selectedContacts.length > 0 ? "Contacts added" : "Contacts removed",
      description: selectedContacts.length > 0 
        ? `${selectedContacts.length} contact(s) added to ${opportunityName}`
        : `All contacts removed from ${opportunityName}`,
      action: selectedContacts.length > 0 ? 
        <CustomButton variant="link" onClick={() => console.log("Undo action")}>
          Undo
        </CustomButton> : undefined
    });
    onClose();
  };

  // Determine if we should show "Create" option
  const showCreateOption = 
    searchQuery.trim() !== "" && 
    filteredContacts.length === 0 && 
    !selectedContacts.some(c => c.name.toLowerCase() === searchQuery.toLowerCase());

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[340px] rounded-md p-0 overflow-hidden">
        <DialogHeader className="p-3 border-b border-slate-light/30">
          <DialogTitle className="text-sm font-semibold">
            Points of Contact ({selectedContacts.length})
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-3 border-b border-slate-light/30">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-medium" />
            <Input
              placeholder="Add points of contact..."
              className="pl-8 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && showCreateOption) {
                  e.preventDefault();
                  setIsCreateContactOpen(true);
                  setNewContactInfo({ ...newContactInfo, name: searchQuery });
                }
              }}
            />
          </div>
          
          {searchQuery && (
            <div className="mt-1 border border-slate-light/30 rounded-md max-h-[240px] overflow-y-auto">
              <ul>
                {filteredContacts.map(contact => (
                  <li 
                    key={contact.id}
                    className="p-2 hover:bg-slate-light/10 cursor-pointer flex items-center justify-between"
                    onClick={() => handleAddContact(contact)}
                  >
                    <div>
                      <div>{contact.name}</div>
                      {contact.email && <div className="text-xs text-slate-medium">{contact.email}</div>}
                    </div>
                    <button className="p-1 text-slate-medium hover:text-teal-primary">
                      <Plus size={16} />
                    </button>
                  </li>
                ))}
                
                {showCreateOption && (
                  <li 
                    className="p-2 hover:bg-slate-light/10 cursor-pointer flex items-center text-teal-primary"
                    onClick={() => {
                      setIsCreateContactOpen(true);
                      setNewContactInfo({ ...newContactInfo, name: searchQuery });
                    }}
                  >
                    <Plus size={16} className="mr-2" />
                    Create "{searchQuery}"
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
        
        {/* Selected Contacts */}
        <div className="p-3 border-b border-slate-light/30">
          <div className="text-sm font-semibold mb-2">Selected</div>
          {selectedContacts.length > 0 ? (
            <div className="mb-2 space-y-1">
              {selectedContacts.map(contact => (
                <div 
                  key={contact.id} 
                  className="flex items-center justify-between bg-slate-light/10 rounded p-1.5"
                >
                  <div>
                    <div className="text-sm">{contact.name}</div>
                    {contact.email && <div className="text-xs text-slate-medium">{contact.email}</div>}
                  </div>
                  <button 
                    className="p-1 text-slate-medium hover:text-coral rounded-full hover:bg-slate-light/10"
                    onClick={() => handleRemoveContact(contact.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-medium my-2">No points of contact have been added</div>
          )}
          
          {selectedContacts.length > 1 && (
            <button 
              className="text-xs text-coral hover:underline"
              onClick={() => setConfirmDeleteAllOpen(true)}
            >
              Remove all {selectedContacts.length} contacts
            </button>
          )}
        </div>
        
        {/* Suggested Contacts */}
        {suggestedContacts.length > 0 && (
          <div className="p-3 border-b border-slate-light/30 max-h-[240px] overflow-y-auto">
            <div className="text-sm font-semibold mb-2">
              Suggested Points of Contact ({suggestedContacts.length})
            </div>
            <div className="space-y-1">
              {suggestedContacts.map(contact => (
                <div 
                  key={contact.id} 
                  className="flex items-center justify-between p-1.5 hover:bg-slate-light/10 rounded cursor-pointer group"
                  onClick={() => handleAddContact(contact)}
                >
                  <div>
                    <div className="text-sm">{contact.name}</div>
                    {contact.email && <div className="text-xs text-slate-medium">{contact.email}</div>}
                  </div>
                  <button className="p-1 text-teal-primary opacity-0 group-hover:opacity-100">
                    <Plus size={16} />
                  </button>
                </div>
              ))}
            </div>
            {suggestedContacts.length > 1 && (
              <button 
                className="mt-2 text-xs text-teal-primary hover:underline"
                onClick={handleAddAllSuggested}
              >
                Add all {suggestedContacts.length} suggestions
              </button>
            )}
          </div>
        )}
        
        <DialogFooter className="p-3 flex justify-end space-x-2">
          <CustomButton variant="outline" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton 
            variant="default" 
            size="sm" 
            onClick={handleSave}
            className="bg-teal-primary hover:bg-teal-primary/90"
          >
            Save
          </CustomButton>
        </DialogFooter>
      </DialogContent>
      
      {/* Create Contact Dialog */}
      <Dialog open={isCreateContactOpen} onOpenChange={setIsCreateContactOpen}>
        <DialogContent className="max-w-[340px] rounded-md">
          <DialogHeader>
            <DialogTitle>Create Contact</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input 
                value={newContactInfo.name}
                onChange={(e) => setNewContactInfo(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input 
                value={newContactInfo.email}
                onChange={(e) => setNewContactInfo(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input 
                value={newContactInfo.phone}
                onChange={(e) => setNewContactInfo(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <CustomButton 
              variant="outline" 
              onClick={() => setIsCreateContactOpen(false)}
            >
              Cancel
            </CustomButton>
            <CustomButton 
              onClick={handleCreateContact}
              disabled={!newContactInfo.name.trim()}
              className="bg-teal-primary hover:bg-teal-primary/90"
            >
              Create
            </CustomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={confirmDeleteAllOpen} onOpenChange={setConfirmDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove all contacts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {selectedContacts.length} contacts from this opportunity. 
              The contacts will remain in your address book.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveAllContacts}
              className="bg-coral hover:bg-coral/90"
            >
              Remove all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
