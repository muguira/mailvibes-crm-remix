
import { useState, useEffect } from "react";
import { useContacts, useActivities } from "@/hooks/use-supabase-data";
import { useAuth } from "@/contexts/AuthContext";
import { ContactData } from "../types";

export function useStreamView(listId?: string) {
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
      id: crypto.randomUUID(),
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
  
  // Format activities for the UI
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
  
  // Format contacts for the UI
  const formattedContacts = contacts.map(contact => ({
    id: contact.id,
    name: contact.name,
    company: contact.company,
    lastActivity: contact.last_activity ? new Date(contact.last_activity).toLocaleDateString() : 'No activity',
    activities: [],
    fields: contact.data || {}
  }));

  return {
    selectedContactId,
    selectedContact,
    isCreateContactOpen,
    newContact,
    contactsLoading,
    formattedContacts,
    formattedActivities,
    setIsCreateContactOpen,
    setNewContact,
    handleContactSelect,
    handleCreateContact,
    handleAddComment,
    updateContact
  };
}
