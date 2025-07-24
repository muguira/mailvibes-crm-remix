import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
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
  getSyncCacheInfo: (
    contactEmail: string,
  ) => Promise<{ lastSync: Date | null; shouldSync: boolean; hasExistingEmails: boolean }>
}

interface ContactSyncStatus {
  hasExistingEmails: boolean
  existingEmailsCount: number
  lastContactSync: string | null
  lastAccountSync: string | null
  lastHistoryId: string | null
  accountHistoryId: string | null
  needsSync: boolean
  syncReason: string
  shouldUseIncremental: boolean
}

// Configuration constants
const MIN_SYNC_INTERVAL = 30 * 1000 // 30 seconds minimum between syncs

/**
 * Get comprehensive sync status from database for a contact
 */
const getSyncStatusFromDB = async (contactEmail: string, userId: string): Promise<ContactSyncStatus> => {
  try {
    // 1. Check existing emails for this contact
    const { count: existingEmails, error: emailsError } = await supabase
      .from('emails')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('from_email', contactEmail)

    if (emailsError) {
      logger.error('[EmailSync] Error checking existing emails:', emailsError)
    }

    // 2. Get last contact-specific sync from metadata
    const { data: contactSyncLogs, error: syncError } = await supabase
      .from('email_sync_log')
      .select('completed_at, metadata, emails_synced')
      .eq('status', 'completed')
      .contains('metadata', { contact_email: contactEmail })
      .order('completed_at', { ascending: false })
      .limit(1)

    if (syncError) {
      logger.error('[EmailSync] Error checking sync logs:', syncError)
    }

    // 3. Get email account sync status
    const { data: emailAccount, error: accountError } = await supabase
      .from('email_accounts')
      .select('last_sync_at, last_sync_status, email')
      .eq('user_id', userId)
      .eq('sync_enabled', true)
      .single()

    if (accountError && accountError.code !== 'PGRST116') {
      // Ignore "no rows" error
      logger.error('[EmailSync] Error checking email account:', accountError)
    }

    const existingEmailsCount = existingEmails || 0
    const hasExistingEmails = existingEmailsCount > 0
    const lastContactSync = contactSyncLogs?.[0]?.completed_at || null
    const lastAccountSync = emailAccount?.last_sync_at || null

    // Extract history IDs (will be null until migration is applied)
    const lastHistoryId = null // TODO: contactSyncLogs?.[0]?.gmail_history_id || null
    const accountHistoryId = null // TODO: emailAccount?.last_history_id || null

    // 4. Intelligent sync decision logic - ALWAYS SYNC when entering StreamView
    const now = Date.now()
    let needsSync = true
    let syncReason = 'initial_sync'
    let shouldUseIncremental = false

    if (hasExistingEmails && lastContactSync) {
      const timeSinceLastSync = now - new Date(lastContactSync).getTime()

      if (timeSinceLastSync < 24 * 60 * 60 * 1000) {
        // Less than 24 hours - perfect for incremental sync
        needsSync = true
        syncReason = 'incremental_sync'
        shouldUseIncremental = true // Will be enabled when history ID is available
      } else {
        needsSync = true
        syncReason = 'full_refresh'
        shouldUseIncremental = false
      }
    } else if (hasExistingEmails && !lastContactSync) {
      // Has emails but no sync log - might be from manual import
      needsSync = true
      syncReason = 'missing_sync_log'
      shouldUseIncremental = false
    }

    logger.info(`[EmailSync] DB status for ${contactEmail}:`, {
      hasExistingEmails,
      existingEmailsCount,
      lastContactSync,
      lastAccountSync,
      needsSync,
      syncReason,
    })

    return {
      hasExistingEmails,
      existingEmailsCount,
      lastContactSync,
      lastAccountSync,
      lastHistoryId,
      accountHistoryId,
      needsSync,
      syncReason,
      shouldUseIncremental,
    }
  } catch (error) {
    logger.error('[EmailSync] Error getting sync status from DB:', error)
    // Default to sync needed on error
    return {
      hasExistingEmails: false,
      existingEmailsCount: 0,
      lastContactSync: null,
      lastAccountSync: null,
      lastHistoryId: null,
      accountHistoryId: null,
      needsSync: true,
      syncReason: 'error_fallback',
      shouldUseIncremental: false,
    }
  }
}

/**
 * Fetch incremental changes using Gmail History API
 */
const fetchIncrementalChanges = async (
  lastHistoryId: string,
  contactEmail: string,
  gmailStore: any,
): Promise<{
  newEmails: any[]
  newHistoryId: string
  hasMore: boolean
}> => {
  try {
    logger.info(`[EmailSync] Fetching incremental changes since historyId: ${lastHistoryId}`)

    // Call Gmail History API through the store
    const changes = await gmailStore.getHistory(lastHistoryId, {
      historyTypes: ['messageAdded'], // Only new emails
      maxResults: 500,
    })

    // Process history changes to get detailed email information
    const { getEmailsByHistoryChanges } = await import('@/services/google/gmailApi')
    const { getValidToken } = await import('@/services/google/tokenService')
    const { supabase } = await import('@/integrations/supabase/client')

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const token = await getValidToken(user.id)
    if (!token) {
      throw new Error('No valid access token available')
    }

    const relevantEmails = await getEmailsByHistoryChanges(token, changes.history, contactEmail)

    logger.info(`[EmailSync] Found ${relevantEmails.length} new emails for ${contactEmail}`)

    return {
      newEmails: relevantEmails,
      newHistoryId: changes.historyId,
      hasMore: !!changes.nextPageToken,
    }
  } catch (error: any) {
    if (error.message?.includes('HISTORY_ID_INVALID') || error.message?.includes('HISTORY_EXPIRED')) {
      // HistoryId expired - fallback to full sync
      logger.warn(`[EmailSync] History ID expired for ${contactEmail}, will fallback to full sync`)
      throw new Error('HISTORY_EXPIRED')
    }
    logger.error(`[EmailSync] Error fetching incremental changes:`, error)
    throw error
  }
}

/**
 * Check if a Gmail message is from/to the specified contact
 */
const isMessageFromContact = (message: any, contactEmail: string): boolean => {
  // This is a simplified check - in reality we'd need to parse the message headers
  // For now, we'll assume the gmail service handles this filtering
  return true // TODO: Implement proper message filtering
}

/**
 * Process incremental emails (only new emails)
 */
const processIncrementalEmails = async (
  newEmails: any[],
  contactEmail: string,
  gmailStore: any,
): Promise<{ emailsCreated: number; emailsUpdated: number }> => {
  if (newEmails.length === 0) {
    return { emailsCreated: 0, emailsUpdated: 0 }
  }

  logger.info(`[EmailSync] Processing ${newEmails.length} incremental emails for ${contactEmail}`)

  // Process emails in smaller batches for better performance
  const BATCH_SIZE = 10
  let totalCreated = 0
  let totalUpdated = 0

  for (let i = 0; i < newEmails.length; i += BATCH_SIZE) {
    const batch = newEmails.slice(i, i + BATCH_SIZE)

    // Process this batch using the gmail store
    const result = await gmailStore.processEmailBatch(batch, contactEmail)
    totalCreated += result.emailsCreated || 0
    totalUpdated += result.emailsUpdated || 0
  }

  return { emailsCreated: totalCreated, emailsUpdated: totalUpdated }
}

/**
 * Update sync completion status in database
 */
const updateSyncStatusInDB = async (
  contactEmail: string,
  userId: string,
  syncResult: any,
  syncReason: string,
  historyId?: string,
): Promise<void> => {
  try {
    // Get email account ID
    const { data: emailAccount } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('sync_enabled', true)
      .single()

    if (!emailAccount) {
      logger.warn('[EmailSync] No email account found for sync log update')
      return
    }

    // Create sync log entry with contact-specific metadata
    const syncLogData: any = {
      email_account_id: emailAccount.id,
      sync_type: syncReason === 'incremental_sync' ? 'incremental' : 'full',
      status: syncResult.success ? 'completed' : 'failed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      emails_synced: syncResult.emailsSynced || 0,
      emails_created: syncResult.emailsCreated || 0,
      emails_updated: syncResult.emailsUpdated || 0,
      error_message: syncResult.error || null,
      metadata: {
        contact_email: contactEmail,
        sync_reason: syncReason,
        time_taken_ms: syncResult.duration || 0,
        total_emails_for_contact: (syncResult.emailsCreated || 0) + (syncResult.emailsUpdated || 0),
      },
    }

    // Add gmail_history_id if provided (for incremental sync tracking)
    if (historyId) {
      syncLogData.gmail_history_id = historyId
    }

    const { error: logError } = await supabase.from('email_sync_log').insert(syncLogData)

    if (logError) {
      logger.error('[EmailSync] Error creating sync log:', logError)
    } else {
      logger.info(`[EmailSync] Sync log created for ${contactEmail}:`, {
        type: syncReason,
        status: syncResult.success ? 'completed' : 'failed',
        emailsCreated: syncResult.emailsCreated,
        emailsUpdated: syncResult.emailsUpdated,
      })
    }
  } catch (error) {
    logger.error('[EmailSync] Error updating sync status in DB:', error)
  }
}

/**
 * Custom hook for intelligent email synchronization with database-backed tracking
 *
 * Features:
 * - Database-backed sync status checking (persistent across sessions)
 * - Intelligent sync decisions based on existing data
 * - Contact-specific sync tracking and logging
 * - Performance optimizations with smart caching
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
   * Get sync status from database with intelligent caching
   */
  const getSyncCacheInfo = useCallback(
    async (contactEmail: string) => {
      if (!authUser?.id) {
        return { lastSync: null, shouldSync: true, hasExistingEmails: false }
      }

      const dbStatus = await getSyncStatusFromDB(contactEmail, authUser.id)

      return {
        lastSync: dbStatus.lastContactSync ? new Date(dbStatus.lastContactSync) : null,
        shouldSync: dbStatus.needsSync,
        hasExistingEmails: dbStatus.hasExistingEmails,
      }
    },
    [authUser?.id],
  )

  /**
   * Clear sync cache (now clears database sync status)
   */
  const clearSyncCache = useCallback(
    async (contactEmail?: string) => {
      if (!authUser?.id) return

      try {
        if (contactEmail) {
          // Clear sync logs for specific contact
          const { error } = await supabase
            .from('email_sync_log')
            .delete()
            .contains('metadata', { contact_email: contactEmail })

          if (error) {
            logger.error('[EmailSync] Error clearing sync cache for contact:', error)
          } else {
            logger.info(`[EmailSync] Sync cache cleared for: ${contactEmail}`)
          }
        } else {
          // This would clear all sync logs for user - use with caution
          logger.info('[EmailSync] Clearing all sync cache not implemented for safety')
        }
      } catch (error) {
        logger.error('[EmailSync] Error clearing sync cache:', error)
      }
    },
    [authUser?.id],
  )

  /**
   * Sync emails for a specific contact with intelligent database-backed decisions
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

      // Check database status unless force sync
      let dbStatus: ContactSyncStatus | null = null
      if (!forceFullSync) {
        dbStatus = await getSyncStatusFromDB(contactEmail, authUser.id)

        if (!dbStatus.needsSync) {
          logger.debug(`[EmailSync] Skipping sync for ${contactEmail} - ${dbStatus.syncReason}`)

          // Update UI state to show existing emails count
          setSyncState(prev => ({
            ...prev,
            emailsCount: dbStatus.existingEmailsCount,
            lastSyncTime: dbStatus.lastContactSync ? new Date(dbStatus.lastContactSync) : null,
          }))
          return
        }

        // Additional rate limiting check
        if (dbStatus.lastContactSync) {
          const timeSinceLastSync = Date.now() - new Date(dbStatus.lastContactSync).getTime()
          if (timeSinceLastSync < MIN_SYNC_INTERVAL) {
            logger.debug(`[EmailSync] Sync rate limited for: ${contactEmail}`)
            return
          }
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
        const syncReason = dbStatus?.syncReason || (forceFullSync ? 'force_sync' : 'manual_sync')

        // 🚀 NEW: Decide between incremental and full sync
        const useIncremental =
          dbStatus?.shouldUseIncremental &&
          dbStatus?.lastHistoryId &&
          !forceFullSync &&
          syncReason === 'incremental_sync'

        if (showToast) {
          const syncTypeMessage = useIncremental ? '🔄 Checking for new emails...' : '📥 Downloading email history...'

          toast({
            title: '📧 Syncing Emails',
            description: syncTypeMessage,
          })
        }

        logger.info(`[EmailSync] Starting sync for: ${contactEmail} (${syncReason})`)

        let result: any
        let newHistoryId: string | undefined

        if (useIncremental) {
          logger.info(`[EmailSync] 🔄 Performing INCREMENTAL sync for: ${contactEmail}`)

          try {
            // Fetch only new emails using History API
            const changes = await fetchIncrementalChanges(dbStatus.lastHistoryId!, contactEmail, gmailStore)

            // Process only the new emails
            const incrementalResult = await processIncrementalEmails(changes.newEmails, contactEmail, gmailStore)

            newHistoryId = changes.newHistoryId
            result = {
              success: true,
              emailsCreated: incrementalResult.emailsCreated,
              emailsUpdated: incrementalResult.emailsUpdated,
              emailsSynced: changes.newEmails.length,
              syncType: 'incremental',
            }

            logger.info(
              `[EmailSync] ✅ Incremental sync completed: ${incrementalResult.emailsCreated} new, ${incrementalResult.emailsUpdated} updated`,
            )
          } catch (error: any) {
            if (error.message === 'HISTORY_EXPIRED') {
              logger.warn(`[EmailSync] History expired, falling back to full sync for: ${contactEmail}`)

              // Fallback to full sync
              const fallbackResult = await gmailStore.syncContactEmails(contactEmail, {
                maxEmails: Infinity,
                forceFullSync: true,
              })
              result = {
                ...fallbackResult,
                syncType: 'full_fallback',
              }
            } else {
              throw error
            }
          }
        } else {
          logger.info(`[EmailSync] 📥 Performing FULL sync for: ${contactEmail}`)

          // Perform full sync
          const fullSyncResult = await gmailStore.syncContactEmails(contactEmail, {
            maxEmails: Infinity,
            forceFullSync,
          })
          result = {
            ...fullSyncResult,
            syncType: 'full',
          }
        }

        const duration = performance.now() - startTime

        if (result.success) {
          // Update database sync status with history ID
          await updateSyncStatusInDB(
            contactEmail,
            authUser.id,
            {
              ...result,
              duration,
            },
            syncReason,
            newHistoryId, // Save the new history ID for next incremental sync
          )

          // Update local state
          setSyncState(prev => ({
            ...prev,
            isLoading: false,
            lastSyncTime: new Date(),
            emailsCount: result.emailsCreated + result.emailsUpdated,
            error: null,
          }))

          // ✅ FIX: Trigger email refresh event to update UI immediately
          if (result.emailsCreated > 0 || result.emailsUpdated > 0) {
            try {
              logger.info(`[EmailSync] Dispatching email-sync-complete event for ${contactEmail}`)

              // Dispatch custom event to notify UI components that emails have been synced
              const refreshEvent = new CustomEvent('email-sync-complete', {
                detail: {
                  contactEmail,
                  userId: authUser.id,
                  emailsCreated: result.emailsCreated,
                  emailsUpdated: result.emailsUpdated,
                  syncReason,
                },
              })

              window.dispatchEvent(refreshEvent)

              logger.info(`[EmailSync] ✅ Email refresh event dispatched for ${contactEmail}`)
            } catch (refreshError) {
              logger.warn(`[EmailSync] Failed to dispatch email refresh event for ${contactEmail}:`, refreshError)
              // Don't fail the sync if event dispatch fails
            }
          }

          logger.info(`[EmailSync] Success for ${contactEmail}:`, {
            duration: `${duration.toFixed(0)}ms`,
            emailsCreated: result.emailsCreated,
            emailsUpdated: result.emailsUpdated,
            emailsSynced: result.emailsSynced,
            syncReason,
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

        // Update database with error status
        if (authUser?.id) {
          await updateSyncStatusInDB(
            contactEmail,
            authUser.id,
            {
              success: false,
              error: errorMessage,
              duration,
              emailsCreated: 0,
              emailsUpdated: 0,
              emailsSynced: 0,
            },
            dbStatus?.syncReason || 'error',
          )
        }

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
    [authUser?.id, gmailStore],
  )

  return {
    syncState,
    syncContactEmails,
    clearSyncCache,
    getSyncCacheInfo,
  }
}
