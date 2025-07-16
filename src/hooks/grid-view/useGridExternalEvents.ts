import { useEffect } from 'react'
import { logger } from '@/utils/logger'

/**
 * Custom hook for handling external contact events
 *
 * Manages event listeners for contact operations from other parts of the application:
 * - contact-added: Standard contact addition events
 * - contact-added-immediate: Immediate contact addition with forced re-render
 * - mockContactsUpdated: Contact updates from stream view
 *
 * @param refreshData - Function to refresh contact data
 * @param forceRerender - Function to force grid re-render
 * @returns void
 *
 * @example
 * ```tsx
 * useGridExternalEvents(refreshData, editableLeadsGridForceRerender);
 * ```
 */
export const useGridExternalEvents = (refreshData: () => void, forceRerender: () => void) => {
  useEffect(() => {
    /**
     * Handle contact added events from other components
     *
     * @param {Event} event - The contact added event
     */
    const handleContactAdded = (event: Event) => {
      logger.log('Contact added event received, clearing cache and refreshing data...')
      refreshData()
    }

    /**
     * Handle immediate contact addition with forced re-render
     *
     * @param {CustomEvent} event - Custom event with contact details
     */
    const handleContactAddedImmediate = (event: CustomEvent) => {
      logger.log('Contact added immediate event received, forcing re-render...')
      const newContact = event.detail?.contact

      if (newContact) {
        forceRerender()
        refreshData()
      }
    }

    /**
     * Handle contact updates from stream view
     *
     * @param {CustomEvent} event - Custom event with update details
     */
    const handleContactUpdated = (event: CustomEvent) => {
      const { contactId, field, value, oldValue } = event.detail

      logger.log(`Contact updated from stream view: ${contactId} - ${field} = ${value}`)

      try {
        const { useContactsStore } = require('@/stores/contactsStore')
        const { updateContact: updateContactInStore } = useContactsStore.getState()

        if (typeof updateContactInStore === 'function') {
          const storeUpdate: any = { [field]: value }
          updateContactInStore(contactId, storeUpdate)
          logger.log(`Updated contact ${contactId} in contacts store via event`)
        }
      } catch (error) {
        logger.warn('Could not update contacts store:', error)
      }

      forceRerender()
      refreshData()
    }

    // Register event listeners
    document.addEventListener('contact-added', handleContactAdded)
    document.addEventListener('contact-added-immediate', handleContactAddedImmediate as EventListener)
    document.addEventListener('mockContactsUpdated', handleContactUpdated as EventListener)

    // Cleanup function to remove event listeners
    return () => {
      document.removeEventListener('contact-added', handleContactAdded)
      document.removeEventListener('contact-added-immediate', handleContactAddedImmediate as EventListener)
      document.removeEventListener('mockContactsUpdated', handleContactUpdated as EventListener)
    }
  }, [refreshData, forceRerender])
}
