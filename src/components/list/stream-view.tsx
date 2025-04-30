
import { useState } from "react";
import { ContactsList } from "./stream/contacts-list";
import { ActivityStream } from "./stream/activity-stream";
import { DetailsPanel } from "./stream/details-panel";
import { ContactData } from "./types";

interface StreamViewProps {
  contacts: ContactData[];
  listName: string;
}

export function StreamView({ contacts, listName }: StreamViewProps) {
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [activeContactId, setActiveContactId] = useState(contacts[0].id);
  
  const handleContactSelect = (contact: ContactData) => {
    setSelectedContact(contact);
    setActiveContactId(contact.id);
  };

  return (
    <div className="h-full flex">
      {/* Left Column - Contacts List */}
      <ContactsList 
        contacts={contacts}
        activeContactId={activeContactId}
        onContactSelect={handleContactSelect}
      />

      {/* Center Column - Activity Stream */}
      <ActivityStream selectedContact={selectedContact} />

      {/* Right Column - Details Panel */}
      <DetailsPanel selectedContact={selectedContact} />
    </div>
  );
}
