import { toast } from '@/hooks/use-toast'
import { useStore } from '@/stores'
import { useGmailStore } from '@/stores/gmail/gmailStore'
import { logger } from '@/utils/logger'
import { useCallback, useRef, useState } from 'react'

interface EmailSyncOptions {
  silent?: boolean
  forceFullSync?: boolean
  showToast?: boolean
}

interface EmailSyncState {
  isLoading: boolean
  lastSyncTime: Date | null
  error: string | null
  emailsCount: number
}

interface UseContactEmailSyncReturn {
  syncState: EmailSyncState
  syncContactEmails: (contactEmail: string, options?: EmailSyncOptions) => Promise<void>
  clearSyncCache: (contactEmail?: string) => void
  getSyncCacheInfo: (contactEmail: string) => { lastSync: Date | null; shouldSync: boolean }
}

// Global cache for sync times - prevents unnecessary API calls
const syncCache = new Map<string, Date>()
const SYNC_CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache
const MIN_SYNC_INTERVAL = 30 * 1000 // 30 seconds minimum between syncs

/**
 * Custom hook for manual email synchronization
 *
 * Features:
 * - Intelligent caching to prevent unnecessary syncs
 * - Loading states and error handling
 * - Toast notifications for user feedback
 * - Performance optimizations
 * - Clean separation of concerns
 *
 * @example
 * ```typescript
 * const { syncContactEmails, syncState } = useContactEmailSync();
 *
 * await syncContactEmails('contact@example.com', {
 *   showToast: true
 * });
 * ```
 */
export function useContactEmailSync(): UseContactEmailSyncReturn {
  const { authUser } = useStore()
  const gmailStore = useGmailStore()

  // Local state for UI feedback
  const [syncState, setSyncState] = useState<EmailSyncState>({
    isLoading: false,
    lastSyncTime: null,
    error: null,
    emailsCount: 0,
  })

  // Ref to prevent multiple simultaneous syncs for same contact
  const activeSyncs = useRef(new Set<string>())

  /**
   * Get cache information for a contact
   */
  const getSyncCacheInfo = useCallback((contactEmail: string) => {
    const lastSync = syncCache.get(contactEmail)
    const now = Date.now()
    const shouldSync = !lastSync || now - lastSync.getTime() > SYNC_CACHE_TTL

    return { lastSync, shouldSync }
  }, [])

  /**
   * Clear sync cache for specific contact or all contacts
   */
  const clearSyncCache = useCallback((contactEmail?: string) => {
    if (contactEmail) {
      syncCache.delete(contactEmail)
      logger.info(`[EmailSync] Cache cleared for: ${contactEmail}`)
    } else {
      syncCache.clear()
      logger.info('[EmailSync] All sync cache cleared')
    }
  }, [])

  /**
   * Sync emails for a specific contact with intelligent caching
   */
  const syncContactEmails = useCallback(
    async (contactEmail: string, options: EmailSyncOptions = {}) => {
      const { silent = false, forceFullSync = false, showToast = !silent } = options

      // Validation
      if (!contactEmail?.trim()) {
        logger.warn('[EmailSync] Invalid contact email provided')
        return
      }

      if (!authUser?.id) {
        logger.warn('[EmailSync] No authenticated user found')
        return
      }

      if (!gmailStore.service) {
        logger.warn('[EmailSync] Gmail service not initialized')
        if (showToast) {
          toast({
            title: 'Gmail Not Connected',
            description: 'Please connect your Gmail account first',
            variant: 'destructive',
          })
        }
        return
      }

      // Prevent multiple simultaneous syncs for same contact
      if (activeSyncs.current.has(contactEmail)) {
        logger.debug(`[EmailSync] Sync already in progress for: ${contactEmail}`)
        return
      }

      // Check cache unless force sync
      if (!forceFullSync) {
        const { lastSync, shouldSync } = getSyncCacheInfo(contactEmail)

        if (!shouldSync) {
          logger.debug(`[EmailSync] Skipping sync for ${contactEmail} - cache still fresh`)
          return
        }

        // Minimum interval check to prevent spam
        if (lastSync && Date.now() - lastSync.getTime() < MIN_SYNC_INTERVAL) {
          logger.debug(`[EmailSync] Sync rate limited for: ${contactEmail}`)
          return
        }
      }

      // Start sync process
      activeSyncs.current.add(contactEmail)

      if (!silent) {
        setSyncState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }))
      }

      const startTime = performance.now()

      try {
        if (showToast) {
          toast({
            title: '📧 Syncing Emails',
            description: `Getting latest emails for ${contactEmail}...`,
          })
        }

        logger.info(`[EmailSync] Starting sync for: ${contactEmail}`)

        // Perform the actual sync
        const result = await gmailStore.syncContactEmails(contactEmail, {
          maxEmails: Infinity, // Get all emails for this contact
          forceFullSync,
        })

        const duration = performance.now() - startTime

        if (result.success) {
          // Update cache
          syncCache.set(contactEmail, new Date())

          // Update state
          setSyncState(prev => ({
            ...prev,
            isLoading: false,
            lastSyncTime: new Date(),
            emailsCount: result.emailsCreated + result.emailsUpdated,
            error: null,
          }))

          logger.info(`[EmailSync] Success for ${contactEmail}:`, {
            duration: `${duration.toFixed(0)}ms`,
            emailsCreated: result.emailsCreated,
            emailsUpdated: result.emailsUpdated,
            emailsSynced: result.emailsSynced,
          })

          if (showToast) {
            const message =
              result.emailsCreated > 0
                ? `Found ${result.emailsCreated} new emails`
                : result.emailsUpdated > 0
                  ? `Updated ${result.emailsUpdated} emails`
                  : 'All emails up to date'

            toast({
              title: '✅ Sync Complete',
              description: message,
            })
          }
        } else {
          throw new Error(result.error || 'Sync failed')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        const duration = performance.now() - startTime

        logger.error(`[EmailSync] Failed for ${contactEmail}:`, {
          error: errorMessage,
          duration: `${duration.toFixed(0)}ms`,
        })

        setSyncState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }))

        if (showToast) {
          toast({
            title: '❌ Sync Failed',
            description: `Failed to sync emails: ${errorMessage}`,
            variant: 'destructive',
          })
        }
      } finally {
        // Clean up
        activeSyncs.current.delete(contactEmail)
      }
    },
    [authUser?.id, gmailStore, getSyncCacheInfo],
  )

  return {
    syncState,
    syncContactEmails,
    clearSyncCache,
    getSyncCacheInfo,
  }
}
