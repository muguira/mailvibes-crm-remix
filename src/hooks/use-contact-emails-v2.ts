import { useEffect } from 'react'
import { useStore } from '@/stores'
import { GmailEmail } from '@/services/google/gmailApi'
import { useEmails } from '@/hooks/use-emails-store'

interface UseContactEmailsOptions {
  contactEmail?: string
  autoFetch?: boolean
}

interface UseContactEmailsReturn {
  emails: GmailEmail[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  syncStatus: 'idle' | 'syncing' | 'completed' | 'failed'
  totalEmails: number

  // Actions
  loadMoreEmails: () => Promise<void>
  syncEmailHistory: (options?: { isAfterEmailSend?: boolean }) => Promise<void>
  refreshEmails: () => Promise<void>

  // ✅ NEW: Optimistic updates
  addOptimisticEmail: (optimisticEmail: GmailEmail) => void
  removeOptimisticEmail: (optimisticEmailId: string) => void
}

/**
 * Simplified hook for contact emails using Zustand store
 *
 * Provides clean API for:
 * - Infinite scroll pagination (20 emails per load from database)
 * - Background email history sync (doesn't block UI)
 * - Centralized state management with better performance
 *
 * @example
 * ```typescript
 * const {
 *   emails,
 *   loading,
 *   hasMore,
 *   loadMoreEmails,
 *   syncEmailHistory
 * } = useContactEmails({
 *   contactEmail: 'contact@example.com'
 * });
 *
 * // Emails are automatically loaded on mount
 * // Use loadMoreEmails() for infinite scroll
 * // Use syncEmailHistory() to fetch ALL historical emails in background
 * ```
 */
export function useContactEmails(options: UseContactEmailsOptions = {}): UseContactEmailsReturn {
  const { contactEmail, autoFetch = true } = options

  const { authUser } = useStore()
  const emails = useEmails()

  // Auto-initialize emails when contact or user changes
  useEffect(() => {
    if (autoFetch && contactEmail && authUser?.id) {
      emails.initializeContactEmails(contactEmail, authUser.id)
    }
  }, [autoFetch, contactEmail, authUser?.id])

  // Get current state for this contact
  const contactEmails = contactEmail ? emails.getEmailsForContact(contactEmail) : []
  const loading = contactEmail ? emails.getLoadingState(contactEmail) : false
  const loadingMore = contactEmail ? emails.getLoadingMoreState(contactEmail) : false
  const syncStatus = contactEmail ? emails.getSyncState(contactEmail) : 'idle'
  const hasMore = contactEmail ? emails.hasMoreEmails(contactEmail) : false
  const totalEmails = contactEmail ? emails.getEmailCount(contactEmail) : 0

  // Get errors (simplified)
  const error = null // You can add error handling if needed

  // Actions
  const loadMoreEmails = async () => {
    if (contactEmail) {
      await emails.loadMoreEmails(contactEmail)
    }
  }

  const syncEmailHistory = async (options?: { isAfterEmailSend?: boolean }) => {
    if (contactEmail && authUser?.id) {
      await emails.syncContactHistory(contactEmail, authUser.id, options)
    }
  }

  const refreshEmails = async () => {
    if (contactEmail && authUser?.id) {
      await emails.refreshContactEmails(contactEmail, authUser.id)
    }
  }

  // ✅ NEW: Optimistic update functions
  const addOptimisticEmail = (optimisticEmail: GmailEmail) => {
    if (contactEmail) {
      emails.addOptimisticEmail(contactEmail, optimisticEmail)
    }
  }

  const removeOptimisticEmail = (optimisticEmailId: string) => {
    if (contactEmail) {
      emails.removeOptimisticEmail(contactEmail, optimisticEmailId)
    }
  }

  return {
    emails: contactEmails,
    loading,
    loadingMore,
    error,
    hasMore,
    syncStatus,
    totalEmails,
    loadMoreEmails,
    syncEmailHistory,
    refreshEmails,
    addOptimisticEmail,
    removeOptimisticEmail,
  }
}

export default useContactEmails
