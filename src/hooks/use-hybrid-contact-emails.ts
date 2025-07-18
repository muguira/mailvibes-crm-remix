import { useContactEmails } from '@/hooks/use-contact-emails-v2'
import { GmailEmail } from '@/services/google/gmailApi'

interface UseHybridContactEmailsOptions {
  contactEmail?: string
  maxResults?: number
  autoFetch?: boolean
  preferDatabase?: boolean
  maxAge?: number // Max age in minutes for database emails (deprecated - not used)
}

interface UseHybridContactEmailsReturn {
  emails: GmailEmail[]
  loading: boolean
  error: string | null
  hasMore: boolean
  source: 'database' | 'api' | 'hybrid' // Always 'database' now
  lastSyncAt?: Date
  syncStatus: 'idle' | 'syncing' | 'completed' | 'failed'
  totalEmails: number
  currentPage: number // Deprecated - always 0
  fetchEmails: () => Promise<void>
  fetchMore: () => Promise<void>
  refresh: () => Promise<void>
  triggerSync: () => Promise<void>
}

/**
 * DEPRECATED: Use useContactEmails from use-contact-emails-v2.ts instead
 *
 * Legacy wrapper around the new Zustand-based email store.
 * Maintains API compatibility for existing components.
 *
 * Migration guide:
 * - Replace: useHybridContactEmails({ contactEmail })
 * - With: useContactEmails({ contactEmail })
 *
 * New benefits:
 * - Centralized state management with Zustand
 * - True infinite scroll from database
 * - Background sync without blocking UI
 * - Better performance and less re-renders
 */
export function useHybridContactEmails(options: UseHybridContactEmailsOptions = {}): UseHybridContactEmailsReturn {
  const {
    contactEmail,
    autoFetch = true,
    // Deprecated options - ignored for compatibility
    maxResults,
    preferDatabase,
    maxAge,
  } = options

  // Use the new Zustand-based hook
  const {
    emails,
    loading,
    loadingMore,
    error,
    hasMore,
    syncStatus,
    totalEmails,
    loadMoreEmails,
    syncEmailHistory,
    refreshEmails,
  } = useContactEmails({
    contactEmail,
    autoFetch,
  })

  // Legacy API compatibility
  const fetchEmails = async () => {
    await refreshEmails()
  }

  const fetchMore = async () => {
    await loadMoreEmails()
  }

  const refresh = async () => {
    await refreshEmails()
  }

  const triggerSync = async () => {
    await syncEmailHistory()
  }

  return {
    emails,
    loading: loading || loadingMore, // Combine loading states for compatibility
    error,
    hasMore,
    source: 'database' as const, // Always database now
    lastSyncAt: undefined, // Not tracked in new implementation
    syncStatus,
    totalEmails,
    currentPage: 0, // Deprecated - always 0
    fetchEmails,
    fetchMore,
    refresh,
    triggerSync,
  }
}

export default useHybridContactEmails
