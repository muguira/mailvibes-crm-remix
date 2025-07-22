import { CustomButton } from '@/components/ui/custom-button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Mail, RefreshCw } from 'lucide-react'
import { useStreamView } from './hooks/use-stream-view'
import { ActivityStream } from './stream/activity-stream'
import { ContactSidebarHeader } from './stream/contact-sidebar-header'
import { ContactsList } from './stream/contacts-list'
import { CreateContactDialog } from './stream/create-contact-dialog'
import { DetailsPanel } from './stream/details-panel'
import { EmptyState } from './stream/empty-state'
import { ContactData } from './types'

interface StreamViewProps {
  contacts?: ContactData[]
  listName: string
  listId?: string
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
    // ✅ NEW: Email sync state
    emailSyncState,
    setIsCreateContactOpen,
    setNewContact,
    handleContactSelect,
    handleCreateContact,
    handleAddComment,
    updateContact,
  } = useStreamView(listId)

  return (
    <div className="h-full flex">
      <div className="flex flex-col border-r border-slate-light/30 bg-white w-72">
        <ContactSidebarHeader listName={listName} onCreateContact={() => setIsCreateContactOpen(true)} />

        {contactsLoading ? (
          <div className="flex flex-col items-center justify-center p-8">
            <LoadingSpinner size="md" />
            <p className="mt-3 text-sm text-slate-medium">Loading contacts...</p>
          </div>
        ) : formattedContacts.length > 0 ? (
          <ContactsList
            contacts={formattedContacts}
            selectedContactId={selectedContactId || ''}
            onContactSelect={handleContactSelect}
            onCreateContact={() => setIsCreateContactOpen(true)}
          />
        ) : (
          <div className="p-4 text-center text-slate-medium">
            <p>No contacts found</p>
            <CustomButton variant="link" className="mt-2" onClick={() => setIsCreateContactOpen(true)}>
              Create your first contact
            </CustomButton>
          </div>
        )}
      </div>

      {selectedContact ? (
        <>
          <div className="flex-1 flex flex-col">
            {/* ✅ NEW: Email sync indicator */}
            {emailSyncState.isLoading && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100 text-blue-700 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <Mail className="w-4 h-4" />
                <span>Syncing emails from Gmail...</span>
              </div>
            )}

            <ActivityStream
              selectedContact={selectedContact as any}
              activities={formattedActivities}
              onAddComment={handleAddComment}
            />
          </div>

          <DetailsPanel
            selectedContact={selectedContact as any}
            onUpdateField={(field, value) => {
              updateContact({
                id: selectedContact.id,
                data: { ...selectedContact.data, [field]: value },
              })
            }}
          />
        </>
      ) : (
        <EmptyState isLoading={contactsLoading} onCreateContact={() => setIsCreateContactOpen(true)} />
      )}

      <CreateContactDialog
        isOpen={isCreateContactOpen}
        onClose={() => setIsCreateContactOpen(false)}
        newContact={newContact}
        onContactChange={setNewContact}
        onCreateContact={handleCreateContact}
      />
    </div>
  )
}
