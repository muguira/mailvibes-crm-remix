import { useAuth } from '@/components/auth'
import { useContactEmailSync } from '@/hooks/use-contact-email-sync'
import { useActivities, useContacts } from '@/hooks/use-supabase-data'
import { useEffect, useState } from 'react'
import { ContactData } from '../types'

export function useStreamView(listId?: string) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false)
  const [newContact, setNewContact] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
  })

  const { user } = useAuth()
  const { contacts, isLoading: contactsLoading, createContact, updateContact } = useContacts(listId)
  const { activities, createActivity } = useActivities(selectedContactId || undefined)

  // ✅ NEW: Email sync integration
  const { syncContactEmails, syncState } = useContactEmailSync()

  // Set the first contact as selected when contacts are loaded
  useEffect(() => {
    if (contacts.length > 0 && !selectedContactId) {
      setSelectedContactId(contacts[0].id)
    }
  }, [contacts, selectedContactId])

  // Find the selected contact
  const selectedContact = contacts.find(contact => contact.id === selectedContactId) || null

  // ✅ ENHANCED: Handle contact selection with email sync
  const handleContactSelect = async (contact: ContactData) => {
    setSelectedContactId(contact.id)

    // Trigger email sync if contact has email
    if (contact.email?.trim()) {
      try {
        await syncContactEmails(contact.email, {
          showToast: true, // Show user feedback
          silent: false, // Update loading states
        })
      } catch (error) {
        // Error handling is done inside the hook
        console.error('Email sync error for contact:', contact.email, error)
      }
    }
  }

  // Create a new contact
  const handleCreateContact = () => {
    if (!newContact.name.trim() || !listId) return

    createContact({
      id: crypto.randomUUID(),
      name: newContact.name,
      company: newContact.company,
      email: newContact.email,
      phone: newContact.phone,
      data: {},
    })

    setNewContact({
      name: '',
      company: '',
      email: '',
      phone: '',
    })
    setIsCreateContactOpen(false)
  }

  // Handle adding a comment
  const handleAddComment = (content: string) => {
    if (!content.trim() || !selectedContactId) return

    createActivity({
      type: 'note',
      content,
    })
  }

  // Format activities for the UI
  const formattedActivities = activities.map(activity => ({
    id: activity.id,
    type: activity.type as any,
    timestamp: new Date(activity.timestamp).toLocaleDateString(),
    content: activity.content || '',
    user: {
      name: user?.email?.split('@')[0] || 'User',
      initials: (user?.email?.substring(0, 2) || 'US').toUpperCase(),
    },
  }))

  // Format contacts for the UI
  const formattedContacts = contacts.map(contact => ({
    id: contact.id,
    name: contact.name,
    company: contact.company,
    email: contact.email, // ✅ CRITICAL FIX: Include email field
    lastActivity: contact.last_activity ? new Date(contact.last_activity).toLocaleDateString() : 'No activity',
    activities: [],
    fields: contact.data || {},
  }))

  return {
    selectedContactId,
    selectedContact,
    isCreateContactOpen,
    newContact,
    contactsLoading,
    formattedContacts,
    formattedActivities,
    // ✅ NEW: Email sync state for UI feedback
    emailSyncState: syncState,
    syncContactEmails, // Expose for manual trigger if needed
    setIsCreateContactOpen,
    setNewContact,
    handleContactSelect,
    handleCreateContact,
    handleAddComment,
    updateContact,
  }
}
