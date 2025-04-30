
import { useState, useEffect } from "react";
import { ContactsList } from "./stream/contacts-list";
import { ActivityStream } from "./stream/activity-stream";
import { DetailsPanel } from "./stream/details-panel";
import { ContactData } from "./types";
import { useContacts, useActivities } from "@/hooks/use-supabase-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/custom-button";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface StreamViewProps {
  contacts?: ContactData[];
  listName: string;
  listId?: string;
}

export function StreamView({ contacts: initialContacts, listName, listId }: StreamViewProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    company: "",
    email: "",
    phone: ""
  });
  
  const { user } = useAuth();
  const { contacts, isLoading: contactsLoading, createContact, updateContact } = useContacts(listId);
  const { activities, createActivity } = useActivities(selectedContactId || undefined);
  
  // Set the first contact as selected when contacts are loaded
  useEffect(() => {
    if (contacts.length > 0 && !selectedContactId) {
      setSelectedContactId(contacts[0].id);
    }
  }, [contacts, selectedContactId]);
  
  // Find the selected contact
  const selectedContact = contacts.find(contact => contact.id === selectedContactId) || null;
  
  // Handle contact selection
  const handleContactSelect = (contact: ContactData) => {
    setSelectedContactId(contact.id);
  };
  
  // Create a new contact
  const handleCreateContact = () => {
    if (!newContact.name.trim() || !listId) return;
    
    createContact({
      name: newContact.name,
      company: newContact.company,
      email: newContact.email,
      phone: newContact.phone,
      data: {},
    });
    
    setNewContact({
      name: "",
      company: "",
      email: "",
      phone: ""
    });
    setIsCreateContactOpen(false);
  };
  
  // Handle adding a comment
  const handleAddComment = (content: string) => {
    if (!content.trim() || !selectedContactId) return;
    
    createActivity({
      type: "note",
      content
    });
  };
  
  // Convert database activities to the format expected by ActivityStream
  const formattedActivities = activities.map(activity => ({
    id: activity.id,
    type: activity.type as any,
    timestamp: new Date(activity.timestamp).toLocaleDateString(),
    content: activity.content || "",
    user: {
      name: user?.email?.split('@')[0] || "User",
      initials: (user?.email?.substring(0, 2) || "US").toUpperCase()
    }
  }));
  
  // Convert database contacts to the format expected by ContactsList
  const formattedContacts = contacts.map(contact => ({
    id: contact.id,
    name: contact.name,
    company: contact.company,
    lastActivity: new Date(contact.last_activity).toLocaleDateString(),
    activities: [],
    fields: contact.data || {}
  }));

  return (
    <div className="h-full flex">
      <div className="flex flex-col border-r border-slate-light/30 bg-white w-72">
        <div className="p-3 border-b border-slate-light/30 flex items-center justify-between">
          <h3 className="font-medium">{listName}</h3>
          <CustomButton 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1"
            onClick={() => setIsCreateContactOpen(true)}
          >
            <Plus size={14} />
            <span>New</span>
          </CustomButton>
        </div>
        
        {contactsLoading ? (
          <div className="p-4 text-center text-slate-medium">Loading contacts...</div>
        ) : (
          formattedContacts.length > 0 ? (
            <ContactsList 
              contacts={formattedContacts}
              activeContactId={selectedContactId || ""}
              onContactSelect={handleContactSelect}
            />
          ) : (
            <div className="p-4 text-center text-slate-medium">
              <p>No contacts found</p>
              <CustomButton 
                variant="link"
                className="mt-2"
                onClick={() => setIsCreateContactOpen(true)}
              >
                Create your first contact
              </CustomButton>
            </div>
          )
        )}
      </div>

      {selectedContact ? (
        <>
          {/* Center Column - Activity Stream */}
          <ActivityStream 
            selectedContact={selectedContact as any} 
            activities={formattedActivities}
            onAddComment={handleAddComment}
          />

          {/* Right Column - Details Panel */}
          <DetailsPanel 
            selectedContact={selectedContact as any} 
            onUpdateField={(field, value) => {
              updateContact({
                id: selectedContact.id,
                data: { ...selectedContact.data, [field]: value }
              });
            }}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-medium">
            {contactsLoading ? (
              <p>Loading contacts...</p>
            ) : (
              <p>Select a contact or create a new one</p>
            )}
          </div>
        </div>
      )}
      
      {/* Create contact dialog */}
      <Dialog open={isCreateContactOpen} onOpenChange={setIsCreateContactOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Contact</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-dark">
                  Name *
                </label>
                <input
                  id="name"
                  type="text" 
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  className="w-full p-2 border border-slate-light rounded focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  placeholder="Enter contact name"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="company" className="text-sm font-medium text-slate-dark">
                  Company
                </label>
                <input
                  id="company"
                  type="text" 
                  value={newContact.company}
                  onChange={(e) => setNewContact({...newContact, company: e.target.value})}
                  className="w-full p-2 border border-slate-light rounded focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  placeholder="Enter company name"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-dark">
                  Email
                </label>
                <input
                  id="email"
                  type="email" 
                  value={newContact.email}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  className="w-full p-2 border border-slate-light rounded focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  placeholder="Enter email address"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-slate-dark">
                  Phone
                </label>
                <input
                  id="phone"
                  type="text" 
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  className="w-full p-2 border border-slate-light rounded focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  placeholder="Enter phone number"
                />
              </div>
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
              disabled={!newContact.name.trim()}
            >
              Create Contact
            </CustomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
