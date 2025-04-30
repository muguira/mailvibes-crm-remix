
import { CustomButton } from "@/components/ui/custom-button";
import { ContactsList } from "./stream/contacts-list";
import { ActivityStream } from "./stream/activity-stream";
import { DetailsPanel } from "./stream/details-panel";
import { CreateContactDialog } from "./stream/create-contact-dialog";
import { EmptyState } from "./stream/empty-state";
import { ContactSidebarHeader } from "./stream/contact-sidebar-header";
import { useStreamView } from "./hooks/use-stream-view";
import { ContactData } from "./types";

interface StreamViewProps {
  contacts?: ContactData[];
  listName: string;
  listId?: string;
}

export function StreamView({ listName, listId }: StreamViewProps) {
  const {
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
  } = useStreamView(listId);

  return (
    <div className="h-full flex">
      <div className="flex flex-col border-r border-slate-light/30 bg-white w-72">
        <ContactSidebarHeader 
          listName={listName} 
          onCreateContact={() => setIsCreateContactOpen(true)} 
        />
        
        {contactsLoading ? (
          <div className="p-4 text-center text-slate-medium">Loading contacts...</div>
        ) : (
          formattedContacts.length > 0 ? (
            <ContactsList 
              contacts={formattedContacts}
              selectedContactId={selectedContactId || ""}
              onContactSelect={handleContactSelect}
              onCreateContact={() => setIsCreateContactOpen(true)}
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
          <ActivityStream 
            selectedContact={selectedContact as any} 
            activities={formattedActivities}
            onAddComment={handleAddComment}
          />

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
        <EmptyState 
          isLoading={contactsLoading} 
          onCreateContact={() => setIsCreateContactOpen(true)} 
        />
      )}
      
      <CreateContactDialog
        isOpen={isCreateContactOpen}
        onClose={() => setIsCreateContactOpen(false)}
        newContact={newContact}
        onContactChange={setNewContact}
        onCreateContact={handleCreateContact}
      />
    </div>
  );
}
