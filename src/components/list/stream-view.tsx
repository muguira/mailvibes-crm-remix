import StreamTimeline from '@/components/stream/StreamTimeline'
import { CustomButton } from '@/components/ui/custom-button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Mail, RefreshCw } from 'lucide-react'
import { useStreamView } from './hooks/use-stream-view'
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
    emailSyncState,
    setIsCreateContactOpen,
    setNewContact,
    handleContactSelect,
    handleCreateContact,
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
            {/* ✅ ENHANCED: Better email sync indicator with more context */}
            {emailSyncState.isLoading && (
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-b border-blue-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-blue-800">Downloading email history from Gmail</div>
                      <div className="text-xs text-blue-600">
                        {emailSyncState.emailsCount > 0
                          ? `${emailSyncState.emailsCount} emails processed so far`
                          : 'This may take a moment for contacts with many emails'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-blue-600 font-medium">In Progress</span>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ NEW: Success indicator when sync completes */}
            {!emailSyncState.isLoading && emailSyncState.lastSyncTime && emailSyncState.emailsCount > 0 && (
              <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-b border-green-200 px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-green-800">
                      Email sync completed - {emailSyncState.emailsCount} emails loaded
                    </span>
                  </div>
                  <span className="text-xs text-green-600">Ready</span>
                </div>
              </div>
            )}

            {/* Timeline component */}
            {selectedContact.email ? (
              <StreamTimeline
                contactId={selectedContact.id}
                contactEmail={selectedContact.email}
                contactName={selectedContact.name}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <div>
                  <h3 className="text-lg font-semibold">No Email Available</h3>
                  <p className="text-sm text-slate-medium mt-2">
                    This contact doesn't have an email address. Add one to see email timeline.
                  </p>
                  <CustomButton
                    onClick={() => {
                      // Focus on email field in details panel
                      const emailField = document.querySelector('input[type="email"]') as HTMLInputElement
                      if (emailField) {
                        emailField.focus()
                      }
                    }}
                    className="mt-4 bg-teal-primary hover:bg-teal-primary/90 text-white"
                  >
                    Add Email Address
                  </CustomButton>
                </div>
              </div>
            )}
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
