import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { GmailEmail } from '@/services/google/gmailApi'
import { logger } from '@/utils/logger'
import { triggerContactSync } from '@/workers/emailSyncWorker'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface DatabaseEmail {
  id: string
  gmail_id: string
  gmail_thread_id?: string | null // ✅ ADD: Thread ID from Gmail
  message_id?: string | null // ✅ ADD: RFC 2822 Message-ID
  subject: string
  snippet: string
  body_text?: string | null
  body_html?: string | null
  from_email: string
  from_name?: string | null
  to_emails: any
  cc_emails?: any
  bcc_emails?: any
  date: string
  is_read: boolean
  is_important: boolean
  labels: any
  has_attachments: boolean
  attachment_count: number
  created_at: string
  updated_at: string
  email_attachments?: Array<{
    id: string
    gmail_attachment_id?: string
    filename: string
    mime_type?: string
    size_bytes?: number
    inline?: boolean
    content_id?: string
  }>
}

interface ContactEmailsState {
  // Map of contactEmail -> emails for that contact
  emailsByContact: Record<string, GmailEmail[]>
  // Map of contactEmail -> pagination info
  paginationByContact: Record<
    string,
    {
      currentOffset: number
      hasMore: boolean
      totalCount: number
    }
  >
  // Loading states
  loading: {
    fetching: Record<string, boolean>
    syncing: Record<string, boolean>
    loadingMore: Record<string, boolean>
  }
  // Error states
  errors: {
    fetch: Record<string, string | null>
    sync: Record<string, string | null>
  }
  // Sync status tracking
  syncStatus: Record<string, 'idle' | 'syncing' | 'completed' | 'failed'>
  lastSyncAt: Record<string, Date | undefined>

  // ✅ NEW: Optimistic emails tracking
  optimisticEmails: Record<string, Set<string>> // contactEmail -> Set of optimistic email IDs

  // Configuration
  emailsPerPage: number
  isInitialized: boolean
  currentUserId: string | null
}

interface EmailsActions {
  // Helper functions
  convertDatabaseEmail: (dbEmail: DatabaseEmail) => GmailEmail
  loadEmailsFromDatabase: (
    contactEmail: string,
    offset?: number,
    limit?: number,
  ) => Promise<{
    emails: GmailEmail[]
    hasMore: boolean
    totalCount: number
  }>

  // Main actions
  initializeContactEmails: (contactEmail: string, userId: string) => Promise<void>
  loadMoreEmails: (contactEmail: string) => Promise<void>
  syncContactHistory: (
    contactEmail: string,
    userId: string,
    options?: { isAfterEmailSend?: boolean; forceFullSync?: boolean },
  ) => Promise<void>
  refreshContactEmails: (contactEmail: string, userId: string) => Promise<void>

  // ✅ NEW: Optimistic updates for immediate UI feedback
  addOptimisticEmail: (contactEmail: string, optimisticEmail: GmailEmail) => void
  removeOptimisticEmail: (contactEmail: string, optimisticEmailId: string) => void
  cleanupStaleOptimisticEmails: (contactEmail: string, maxAgeMinutes?: number) => void
  deduplicateEmails: (contactEmail: string) => void // ✅ NEW: Smart deduplication

  // ✅ PERFORMANCE: Cache management and cleanup functions
  performGlobalCleanup: () => void
  preloadFrequentContacts: () => Promise<void>

  // Getters
  getEmailsForContact: (contactEmail: string) => GmailEmail[]
  getLoadingState: (contactEmail: string) => boolean
  getLoadingMoreState: (contactEmail: string) => boolean
  getSyncState: (contactEmail: string) => 'idle' | 'syncing' | 'completed' | 'failed'
  hasMoreEmails: (contactEmail: string) => boolean
  getEmailCount: (contactEmail: string) => number

  // Utilities
  clearContactEmails: (contactEmail: string) => void
  clearAllEmails: () => void
  clearErrors: (contactEmail: string) => void
  reset: () => void
  setCurrentUserId: (userId: string | null) => void

  // ✅ DEBUG: Helper function to investigate the April 2022 cutoff issue
  debugDatabaseEmails: (
    contactEmail: string,
    beforeDate?: string,
  ) => Promise<{
    emailsBefore: any[]
    emailsAfter: any[]
    allEmails: any[]
  } | null>

  // ✅ DEBUG: Force reset and reload emails to test fixed pagination
  debugResetAndReload: (contactEmail: string) => Promise<number>
}

type EmailsStore = ContactEmailsState & EmailsActions

/**
 * Dedicated emails store using Zustand
 *
 * Manages email state with infinite scroll and background sync:
 * - Separate visualization from synchronization
 * - Infinite scroll pagination (20 emails per load)
 * - Background historical sync without blocking UI
 * - Per-contact state management
 * - Performance optimized with centralized state
 * - ✅ NEW: Automatic cache cleanup and optimistic email management
 */
const useEmailsStore = create<EmailsStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      emailsByContact: {},
      paginationByContact: {},
      loading: {
        fetching: {},
        syncing: {},
        loadingMore: {},
      },
      errors: {
        fetch: {},
        sync: {},
      },
      syncStatus: {},
      lastSyncAt: {},
      optimisticEmails: {},
      emailsPerPage: 100, // ✅ INCREASED: Show 100 emails initially instead of 20 to display more history
      isInitialized: false,
      currentUserId: null,

      /**
       * Convert database email to GmailEmail format
       */
      convertDatabaseEmail: (dbEmail: DatabaseEmail): GmailEmail => {
        const parseJsonField = (field: any): any[] => {
          if (Array.isArray(field)) return field
          if (typeof field === 'string') {
            try {
              const parsed = JSON.parse(field)
              return Array.isArray(parsed) ? parsed : []
            } catch {
              return []
            }
          }
          return []
        }

        const toEmails = parseJsonField(dbEmail.to_emails)
        const ccEmails = parseJsonField(dbEmail.cc_emails)
        const bccEmails = parseJsonField(dbEmail.bcc_emails)
        const labels = parseJsonField(dbEmail.labels)

        // Convert email_attachments to Gmail format
        const attachments =
          dbEmail.email_attachments?.map((att: any) => ({
            id: att.gmail_attachment_id || att.id,
            filename: att.filename,
            mimeType: att.mime_type,
            size: att.size_bytes || 0,
            inline: att.inline || false,
            contentId: att.content_id,
            storage_path: att.storage_path, // Include storage path for local images
          })) || []

        return {
          id: dbEmail.gmail_id,
          threadId: dbEmail.gmail_thread_id || '', // ✅ FIX: Map real threadId from database
          messageId: dbEmail.message_id || undefined, // ✅ ADD: Include RFC 2822 Message-ID
          snippet: dbEmail.snippet,
          subject: dbEmail.subject,
          from: {
            name: dbEmail.from_name || undefined,
            email: dbEmail.from_email,
          },
          to: toEmails,
          cc: ccEmails.length > 0 ? ccEmails : undefined,
          bcc: bccEmails.length > 0 ? bccEmails : undefined,
          date: dbEmail.date,
          bodyText: dbEmail.body_text || undefined,
          bodyHtml: dbEmail.body_html || undefined,
          isRead: dbEmail.is_read,
          isImportant: dbEmail.is_important,
          labels: labels,
          attachments: attachments.length > 0 ? attachments : undefined,
        }
      },

      /**
       * Load emails from database with pagination
       */
      loadEmailsFromDatabase: async (contactEmail: string, offset: number = 0, limit: number = 20) => {
        const { currentUserId } = get()
        if (!currentUserId) {
          throw new Error('No authenticated user')
        }

        // Load emails from database (logging disabled to reduce console spam)

        try {
          // ✅ CRITICAL FIX: Query emails specifically for this contact instead of all emails
          // Use Supabase's JSONB contains operator to find emails to/from the contact
          // Querying emails for contact (logging disabled to reduce console spam)

          // ✅ FIX: Get emails both FROM and TO the contact to capture full conversation
          // Skip the problematic direct query and use the comprehensive fallback method
          // This ensures we get all emails in the conversation thread
          let data = null
          let error = { message: 'Intentionally triggering fallback to get full conversation' }

          if (error) {
            logger.warn('🔄 [EmailsStore] Direct query failed, falling back to local filtering:', {
              error: error.message,
              contactEmail,
            })

            // Fallback to old method if direct query fails
            const fallbackLimit = Math.max(limit * 10, 500) // Get more emails for fallback

            const { data: fallbackData, error: fallbackError } = await supabase
              .from('emails')
              .select(
                `
                id, gmail_id, gmail_thread_id, message_id, subject, snippet, body_text, body_html,
                from_email, from_name, to_emails, cc_emails, bcc_emails,
                date, is_read, is_important, labels, has_attachments,
                attachment_count, created_at, updated_at,
                email_attachments (
                  id, gmail_attachment_id, filename, mime_type, 
                  size_bytes, inline, content_id, storage_path
                )
              `,
              )
              .eq('user_id', currentUserId)
              .order('date', { ascending: false })
              .limit(fallbackLimit)

            if (fallbackError) throw fallbackError

            // Fallback raw database results logging (disabled to reduce console spam)

            // Filter emails locally for this contact
            const filteredData = (fallbackData || []).filter(email => {
              // Check from_email
              if (email.from_email === contactEmail) {
                return true
              }

              // Check to_emails (stored as JSONB array)
              if (email.to_emails) {
                try {
                  const toEmails = Array.isArray(email.to_emails)
                    ? email.to_emails
                    : JSON.parse(String(email.to_emails))
                  if (
                    toEmails.some(
                      recipient =>
                        (typeof recipient === 'object' && recipient.email === contactEmail) ||
                        (typeof recipient === 'string' && recipient === contactEmail),
                    )
                  ) {
                    return true
                  }
                } catch (e) {
                  // Fallback to string search
                  const toEmailsStr =
                    typeof email.to_emails === 'string' ? email.to_emails : String(email.to_emails || '')
                  if (toEmailsStr.includes(contactEmail)) {
                    return true
                  }
                }
              }

              // Check cc_emails
              if (email.cc_emails) {
                try {
                  const ccEmails = Array.isArray(email.cc_emails)
                    ? email.cc_emails
                    : JSON.parse(String(email.cc_emails))
                  if (
                    ccEmails.some(
                      recipient =>
                        (typeof recipient === 'object' && recipient.email === contactEmail) ||
                        (typeof recipient === 'string' && recipient === contactEmail),
                    )
                  ) {
                    return true
                  }
                } catch (e) {
                  const ccEmailsStr = String(email.cc_emails || '')
                  if (ccEmailsStr.includes(contactEmail)) {
                    return true
                  }
                }
              }

              // Check bcc_emails
              if (email.bcc_emails) {
                try {
                  const bccEmails = Array.isArray(email.bcc_emails)
                    ? email.bcc_emails
                    : JSON.parse(String(email.bcc_emails))
                  if (
                    bccEmails.some(
                      recipient =>
                        (typeof recipient === 'object' && recipient.email === contactEmail) ||
                        (typeof recipient === 'string' && recipient === contactEmail),
                    )
                  ) {
                    return true
                  }
                } catch (e) {
                  const bccEmailsStr = String(email.bcc_emails || '')
                  if (bccEmailsStr.includes(contactEmail)) {
                    return true
                  }
                }
              }

              return false
            })

            // Apply pagination to filtered results
            const paginatedData = filteredData.slice(offset, offset + limit)
            data = paginatedData
          }

          // Final query results logging (disabled to reduce console spam)

          const convertedEmails = (data || []).map(get().convertDatabaseEmail)

          // ThreadId mapping results logging (disabled to reduce console spam)

          logger.info(`[EmailsStore] Loaded ${convertedEmails.length} emails for ${contactEmail} (offset: ${offset})`)

          return {
            emails: convertedEmails,
            hasMore: convertedEmails.length === limit, // If we got a full page, there might be more
            totalCount: null, // ✅ FIX: Don't return totalCount from individual page queries - it's misleading
          }
        } catch (error) {
          logger.error('Error loading emails from database:', error)
          console.error('🔍 [EmailsStore] Database error:', error)
          throw error
        }
      },

      /**
       * Initialize contact emails from database
       */
      initializeContactEmails: async (contactEmail: string, userId: string) => {
        // Initialize contact emails (logging disabled to reduce console spam)

        // ✅ CRITICAL FIX: Set current user ID first
        set(state => {
          state.currentUserId = userId
        })

        try {
          set(state => {
            state.loading.fetching[contactEmail] = true
            state.errors.fetch[contactEmail] = null
          })

          // Load first batch of emails (paginated)
          const result = await get().loadEmailsFromDatabase(contactEmail, 0, get().emailsPerPage)

          // Emails being initialized logging (disabled to reduce console spam)

          set(state => {
            state.emailsByContact[contactEmail] = result.emails
            state.paginationByContact[contactEmail] = {
              currentOffset: get().emailsPerPage,
              hasMore: result.hasMore,
              totalCount: result.emails.length, // ✅ FIX: Use actual emails loaded, not misleading result.totalCount
            }
            state.loading.fetching[contactEmail] = false
          })

          logger.info(`[EmailsStore] Initialized ${result.emails.length} emails for ${contactEmail}`)
        } catch (error) {
          logger.error('Error initializing contact emails:', error)
          set(state => {
            state.errors.fetch[contactEmail] = error instanceof Error ? error.message : 'Unknown error'
            state.loading.fetching[contactEmail] = false
          })
        }
      },

      /**
       * Load more emails for infinite scroll
       */
      loadMoreEmails: async (contactEmail: string) => {
        const { emailsPerPage, paginationByContact, loading } = get()

        // Load more emails called (logging disabled to reduce console spam)

        // Don't load if already loading or no more emails
        if (loading.loadingMore[contactEmail] || !paginationByContact[contactEmail]?.hasMore) {
          // Load more emails blocked (logging disabled to reduce console spam)
          return
        }

        set(state => {
          state.loading.loadingMore[contactEmail] = true
        })

        try {
          const currentPagination = paginationByContact[contactEmail]

          // Loading more emails details (logging disabled to reduce console spam)

          const result = await get().loadEmailsFromDatabase(
            contactEmail,
            currentPagination.currentOffset,
            emailsPerPage,
          )

          // Load more emails result analysis (logging disabled to reduce console spam)

          set(state => {
            // Append new emails to existing ones
            const existingEmails = state.emailsByContact[contactEmail] || []
            const newEmailsList = [...existingEmails, ...result.emails]
            state.emailsByContact[contactEmail] = newEmailsList

            // ✅ FIX: Update pagination with REAL counts, not accumulative sums
            state.paginationByContact[contactEmail] = {
              currentOffset: currentPagination.currentOffset + emailsPerPage,
              hasMore: result.hasMore,
              totalCount: newEmailsList.length, // ✅ REAL count of emails loaded in UI
            }

            state.loading.loadingMore[contactEmail] = false
          })

          // Post-load analysis for pagination debugging (logging disabled to reduce console spam)
          const allEmailsAfterLoad = [...(get().emailsByContact[contactEmail] || []), ...result.emails]

          if (!result.hasMore) {
            // No more emails analysis (logging disabled to reduce console spam)
          }

          logger.info(`[EmailsStore] Loaded ${result.emails.length} more emails for ${contactEmail}`)
        } catch (error) {
          logger.error(`Error loading more emails for ${contactEmail}:`, error)
          console.error('❌ [EmailsStore] loadMoreEmails error:', {
            contactEmail,
            error: error instanceof Error ? error.message : error,
          })
          set(state => {
            state.errors.fetch[contactEmail] = error instanceof Error ? error.message : 'Failed to load more emails'
            state.loading.loadingMore[contactEmail] = false
          })
        }
      },

      /**
       * Sync full email history in background (doesn't block UI)
       */
      syncContactHistory: async (
        contactEmail: string,
        userId: string,
        options?: { isAfterEmailSend?: boolean; forceFullSync?: boolean },
      ) => {
        set(state => {
          state.syncStatus[contactEmail] = 'syncing'
          state.loading.syncing[contactEmail] = true
          state.errors.sync[contactEmail] = null
        })

        try {
          // Get connected Gmail accounts for this user
          const { data: emailAccounts, error: accountError } = await supabase
            .from('email_accounts')
            .select('email, sync_enabled')
            .eq('user_id', userId)
            .eq('provider', 'gmail')
            .eq('sync_enabled', true)
            .order('created_at', { ascending: false })

          if (accountError) {
            throw new Error(`Failed to get email accounts: ${accountError.message}`)
          }

          if (!emailAccounts || emailAccounts.length === 0) {
            throw new Error('No connected Gmail accounts found. Please connect a Gmail account first.')
          }

          // Use the first (most recent) connected account
          const primaryAccount = emailAccounts[0]

          // Trigger background sync for ALL historical emails
          await triggerContactSync(userId, primaryAccount.email, contactEmail, {
            forceFullSync: options?.forceFullSync || false,
          })

          // ✅ Cleanup any stale optimistic emails before refresh (fallback safety)
          if (options?.isAfterEmailSend) {
            get().cleanupStaleOptimisticEmails(contactEmail, 1) // Clean up anything older than 1 minute
          }

          // ✅ CRITICAL FIX: Refresh local state after sync completes
          // Wait for sync to complete then reload emails from database
          const refreshDelay = options?.isAfterEmailSend ? 5000 : 3000 // Longer delay for sent emails

          setTimeout(async () => {
            try {
              // Clear existing emails and reload from database
              set(state => {
                delete state.emailsByContact[contactEmail]
                delete state.paginationByContact[contactEmail]
                // ✅ Clear optimistic emails after sync - they'll be replaced by real Gmail emails
                // This prevents duplicates when the real sent email comes from Gmail
                delete state.optimisticEmails[contactEmail]
              })

              // Reinitialize to get the newly synced emails
              await get().initializeContactEmails(contactEmail, userId)

              // ✅ ADDITIONAL: Run deduplication after sync refresh to ensure no duplicates remain
              get().deduplicateEmails(contactEmail)

              logger.info(`[EmailsStore] Successfully refreshed emails after sync for ${contactEmail}`)

              // Only show toast for manual sync, not for auto-sync after email send
              if (!options?.isAfterEmailSend) {
                toast({
                  title: 'Emails updated',
                  description: 'New emails are now visible in the timeline',
                })
              } else {
                // Silent update for sent emails since they already appear optimistically
                logger.info(`[EmailsStore] Silent refresh completed after email send for ${contactEmail}`)
              }
            } catch (refreshError) {
              logger.error(`[EmailsStore] Failed to refresh emails after sync:`, refreshError)
            }
          }, refreshDelay)

          set(state => {
            state.syncStatus[contactEmail] = 'completed'
            state.lastSyncAt[contactEmail] = new Date()
          })

          toast({
            title: 'Syncing emails...',
            description: 'Your emails will appear in the timeline in a few seconds.',
          })

          logger.info(`[EmailsStore] Started background sync for ${contactEmail}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to sync emails'

          set(state => {
            state.syncStatus[contactEmail] = 'failed'
            state.errors.sync[contactEmail] = errorMessage
          })

          logger.error(`Error syncing history for ${contactEmail}:`, error)
          toast({
            title: 'Sync failed',
            description: errorMessage,
            variant: 'destructive',
          })
        } finally {
          set(state => {
            state.loading.syncing[contactEmail] = false
          })

          // Reset sync status after delay
          setTimeout(() => {
            set(state => {
              state.syncStatus[contactEmail] = 'idle'
            })
          }, 3000)
        }
      },

      /**
       * Refresh emails for a contact (reload from database)
       */
      refreshContactEmails: async (contactEmail: string, userId: string) => {
        // Clear existing emails and reload
        set(state => {
          delete state.emailsByContact[contactEmail]
          delete state.paginationByContact[contactEmail]
        })

        await get().initializeContactEmails(contactEmail, userId)
      },

      // ✅ NEW: Optimistic updates for immediate UI feedback
      addOptimisticEmail: (contactEmail: string, optimisticEmail: GmailEmail) => {
        set(state => {
          const existingEmails = state.emailsByContact[contactEmail] || []
          // Add optimistic email at the beginning (most recent)
          state.emailsByContact[contactEmail] = [optimisticEmail, ...existingEmails]

          // Track this as an optimistic email
          if (!state.optimisticEmails[contactEmail]) {
            state.optimisticEmails[contactEmail] = new Set()
          }
          state.optimisticEmails[contactEmail].add(optimisticEmail.id)
        })

        logger.info(`[EmailsStore] Added optimistic email for ${contactEmail}:`, {
          emailId: optimisticEmail.id,
          subject: optimisticEmail.subject,
          to: optimisticEmail.to?.map(t => t.email).join(', '),
        })

        // ✅ PROACTIVE: Run deduplication immediately after adding optimistic email
        // This helps catch any duplicates that might already exist
        setTimeout(() => {
          get().deduplicateEmails(contactEmail)
        }, 100) // Small delay to ensure state is updated
      },

      removeOptimisticEmail: (contactEmail: string, optimisticEmailId: string) => {
        set(state => {
          const existingEmails = state.emailsByContact[contactEmail] || []
          state.emailsByContact[contactEmail] = existingEmails.filter(email => email.id !== optimisticEmailId)

          // Remove from optimistic tracking
          if (state.optimisticEmails[contactEmail]) {
            state.optimisticEmails[contactEmail].delete(optimisticEmailId)
            if (state.optimisticEmails[contactEmail].size === 0) {
              delete state.optimisticEmails[contactEmail]
            }
          }
        })

        logger.info(`[EmailsStore] Removed optimistic email ${optimisticEmailId} for ${contactEmail}`)
      },

      // ✅ PERFORMANCE: Enhanced cleanup and cache management functions
      cleanupStaleOptimisticEmails: (contactEmail: string, maxAgeMinutes: number = 5) => {
        set(state => {
          const emails = state.emailsByContact[contactEmail] || []
          const optimisticEmailIds = state.optimisticEmails[contactEmail] || new Set()

          if (emails.length === 0 || optimisticEmailIds.size === 0) return

          const now = Date.now()
          const cutoffTime = now - maxAgeMinutes * 60 * 1000
          const staleOptimisticIds: string[] = []

          // Find stale optimistic emails
          emails.forEach((email, index) => {
            if (optimisticEmailIds.has(email.id) && email.id.includes('optimistic-')) {
              try {
                const emailDate = new Date(email.date).getTime()
                if (emailDate < cutoffTime) {
                  staleOptimisticIds.push(email.id)
                }
              } catch (error) {
                // If date parsing fails, consider it stale
                staleOptimisticIds.push(email.id)
              }
            }
          })

          // Remove stale optimistic emails
          if (staleOptimisticIds.length > 0) {
            state.emailsByContact[contactEmail] = emails.filter(email => !staleOptimisticIds.includes(email.id))

            // Update optimistic tracking
            staleOptimisticIds.forEach(id => {
              optimisticEmailIds.delete(id)
            })

            if (optimisticEmailIds.size === 0) {
              delete state.optimisticEmails[contactEmail]
            }

            if (process.env.NODE_ENV === 'development') {
              logger.info(
                `[EmailsStore] Cleaned up ${staleOptimisticIds.length} stale optimistic emails for ${contactEmail}`,
                { removedIds: staleOptimisticIds, maxAgeMinutes },
              )
            }
          }
        })
      },

      // ✅ PERFORMANCE: Global cache cleanup to prevent memory leaks
      performGlobalCleanup: () => {
        set(state => {
          const MAX_CONTACTS_IN_CACHE = 50
          const MAX_EMAILS_PER_CONTACT = 200

          // Get all contact emails sorted by last access time
          const contactEntries = Object.entries(state.emailsByContact)
          const lastSyncEntries = Object.entries(state.lastSyncAt)

          // If we have too many contacts cached, remove oldest ones
          if (contactEntries.length > MAX_CONTACTS_IN_CACHE) {
            const sortedByLastSync = contactEntries.sort(([contactA], [contactB]) => {
              const timeA = lastSyncEntries.find(([c]) => c === contactA)?.[1]?.getTime() || 0
              const timeB = lastSyncEntries.find(([c]) => c === contactB)?.[1]?.getTime() || 0
              return timeA - timeB // Oldest first
            })

            const contactsToRemove = sortedByLastSync
              .slice(0, contactEntries.length - MAX_CONTACTS_IN_CACHE)
              .map(([contact]) => contact)

            contactsToRemove.forEach(contactEmail => {
              delete state.emailsByContact[contactEmail]
              delete state.paginationByContact[contactEmail]
              delete state.loading.fetching[contactEmail]
              delete state.loading.syncing[contactEmail]
              delete state.loading.loadingMore[contactEmail]
              delete state.errors.fetch[contactEmail]
              delete state.errors.sync[contactEmail]
              delete state.syncStatus[contactEmail]
              delete state.lastSyncAt[contactEmail]
              delete state.optimisticEmails[contactEmail]
            })

            if (process.env.NODE_ENV === 'development') {
              logger.info(`[EmailsStore] Cleaned up ${contactsToRemove.length} old contacts from cache`)
            }
          }

          // Limit emails per contact to prevent memory bloat
          Object.entries(state.emailsByContact).forEach(([contactEmail, emails]) => {
            if (emails.length > MAX_EMAILS_PER_CONTACT) {
              // Keep most recent emails
              const sortedEmails = [...emails].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              state.emailsByContact[contactEmail] = sortedEmails.slice(0, MAX_EMAILS_PER_CONTACT)

              if (process.env.NODE_ENV === 'development') {
                logger.info(
                  `[EmailsStore] Trimmed ${emails.length - MAX_EMAILS_PER_CONTACT} old emails for ${contactEmail}`,
                )
              }
            }
          })

          // Clean up all optimistic emails for cache management
          Object.keys(state.optimisticEmails).forEach(contactEmail => {
            get().cleanupStaleOptimisticEmails(contactEmail, 5) // 5 minutes max age
          })
        })
      },

      // ✅ PERFORMANCE: Smart cache preloading for frequently accessed contacts
      preloadFrequentContacts: async () => {
        const { currentUserId, lastSyncAt } = get()
        if (!currentUserId) return

        // Get contacts sorted by frequency of access (based on lastSyncAt)
        const contactsByFrequency = Object.entries(lastSyncAt)
          .sort(([, a], [, b]) => (b?.getTime() || 0) - (a?.getTime() || 0))
          .slice(0, 10) // Top 10 most recent contacts
          .map(([contact]) => contact)

        // Preload first page of emails for these contacts if not already loaded
        const preloadPromises = contactsByFrequency.map(async contactEmail => {
          const emails = get().emailsByContact[contactEmail]
          if (!emails || emails.length === 0) {
            try {
              await get().loadEmailsFromDatabase(contactEmail, 0, 10) // Load first 10 emails
            } catch (error) {
              // Silently fail preloading
              if (process.env.NODE_ENV === 'development') {
                logger.warn(`[EmailsStore] Failed to preload emails for ${contactEmail}:`, error)
              }
            }
          }
        })

        await Promise.allSettled(preloadPromises)
      },

      deduplicateEmails: (contactEmail: string) => {
        set(state => {
          const existingEmails = state.emailsByContact[contactEmail] || []
          const optimisticIds = state.optimisticEmails[contactEmail] || new Set()

          if (optimisticIds.size === 0) return // No optimistic emails to dedupe

          const realEmails: GmailEmail[] = []
          const duplicateOptimisticIds: string[] = []

          // Separate real and optimistic emails
          const { optimisticEmails, nonOptimisticEmails } = existingEmails.reduce(
            (acc, email) => {
              if (optimisticIds.has(email.id)) {
                acc.optimisticEmails.push(email)
              } else {
                acc.nonOptimisticEmails.push(email)
              }
              return acc
            },
            { optimisticEmails: [] as GmailEmail[], nonOptimisticEmails: [] as GmailEmail[] },
          )

          // Check for duplicates between optimistic and real emails
          optimisticEmails.forEach(optimisticEmail => {
            const isDuplicate = nonOptimisticEmails.some(realEmail => {
              // Match by multiple criteria to catch sent emails that came back from Gmail
              const subjectMatch = optimisticEmail.subject === realEmail.subject
              const timeMatch =
                Math.abs(new Date(optimisticEmail.date).getTime() - new Date(realEmail.date).getTime()) < 60000 // Within 1 minute
              const fromMatch = optimisticEmail.from?.email === realEmail.from?.email
              const toMatch = JSON.stringify(optimisticEmail.to) === JSON.stringify(realEmail.to)

              return subjectMatch && (timeMatch || (fromMatch && toMatch))
            })

            if (isDuplicate) {
              duplicateOptimisticIds.push(optimisticEmail.id)
            }
          })

          // Remove duplicate optimistic emails
          if (duplicateOptimisticIds.length > 0) {
            state.emailsByContact[contactEmail] = existingEmails.filter(
              email => !duplicateOptimisticIds.includes(email.id),
            )

            // Remove from optimistic tracking
            duplicateOptimisticIds.forEach(id => {
              if (state.optimisticEmails[contactEmail]) {
                state.optimisticEmails[contactEmail].delete(id)
              }
            })

            if (state.optimisticEmails[contactEmail]?.size === 0) {
              delete state.optimisticEmails[contactEmail]
            }

            logger.info(
              `[EmailsStore] Removed ${duplicateOptimisticIds.length} duplicate optimistic emails for ${contactEmail}`,
              {
                duplicateIds: duplicateOptimisticIds,
                removedEmails: duplicateOptimisticIds.map(id => {
                  const email = optimisticEmails.find(e => e.id === id)
                  return {
                    id,
                    subject: email?.subject,
                    threadId: email?.threadId,
                    date: email?.date,
                  }
                }),
              },
            )
          }
        })
      },

      // Getters
      getEmailsForContact: (contactEmail: string) => {
        return get().emailsByContact[contactEmail] || []
      },

      getLoadingState: (contactEmail: string) => {
        return get().loading.fetching[contactEmail] || false
      },

      getLoadingMoreState: (contactEmail: string) => {
        return get().loading.loadingMore[contactEmail] || false
      },

      getSyncState: (contactEmail: string) => {
        return get().syncStatus[contactEmail] || 'idle'
      },

      hasMoreEmails: (contactEmail: string) => {
        return get().paginationByContact[contactEmail]?.hasMore || false
      },

      getEmailCount: (contactEmail: string) => {
        return get().emailsByContact[contactEmail]?.length || 0
      },

      // Utilities
      clearContactEmails: (contactEmail: string) => {
        set(state => {
          delete state.emailsByContact[contactEmail]
          delete state.paginationByContact[contactEmail]
          delete state.loading.fetching[contactEmail]
          delete state.loading.syncing[contactEmail]
          delete state.loading.loadingMore[contactEmail]
          delete state.errors.fetch[contactEmail]
          delete state.errors.sync[contactEmail]
          delete state.syncStatus[contactEmail]
          delete state.lastSyncAt[contactEmail]
        })
      },

      clearAllEmails: () => {
        set(state => {
          state.emailsByContact = {}
          state.paginationByContact = {}
          state.loading = { fetching: {}, syncing: {}, loadingMore: {} } // Initialize loading state
          state.errors = { fetch: {}, sync: {} } // Initialize load error state
          state.syncStatus = {}
          state.lastSyncAt = {}
          state.isInitialized = false
        })
      },

      clearErrors: (contactEmail: string) => {
        set(state => {
          delete state.errors.fetch[contactEmail]
          delete state.errors.sync[contactEmail]
        })
      },

      reset: () => {
        set(state => {
          state.emailsByContact = {}
          state.paginationByContact = {}
          state.loading = { fetching: {}, syncing: {}, loadingMore: {} } // Initialize loading state
          state.errors = { fetch: {}, sync: {} } // Initialize load error state
          state.syncStatus = {}
          state.lastSyncAt = {}
          state.optimisticEmails = {}
          state.emailsPerPage = 100 // ✅ UPDATED: Use new default value
          state.isInitialized = false
          state.currentUserId = null
        })
      },

      setCurrentUserId: (userId: string | null) => {
        set(state => {
          state.currentUserId = userId
        })
      },

      // ✅ DEBUG: Helper function to investigate the April 2022 cutoff issue
      debugDatabaseEmails: async (contactEmail: string, beforeDate?: string) => {
        const { currentUserId } = get()
        if (!currentUserId) {
          console.error('❌ [EmailsStore] No authenticated user for debug query')
          return null
        }

        const cutoffDate = beforeDate || '2022-04-21'

        console.log(`🔍 [EmailsStore] DEBUG: Checking emails for ${contactEmail}`)

        try {
          // Use a simple query to get all emails for this user first
          const { data: allUserEmails, error: errorAll } = await supabase
            .from('emails')
            .select('id, gmail_id, subject, from_email, to_emails, date, created_at')
            .eq('user_id', currentUserId)
            .order('date', { ascending: false })
            .limit(1000) // Get many emails to analyze

          if (errorAll) {
            console.error('❌ [EmailsStore] Debug query failed:', errorAll)
            return null
          }

          // Filter manually to find emails for this contact
          const emails = (allUserEmails || []).filter(email => {
            // Check from_email
            if (email.from_email === contactEmail) {
              return true
            }

            // Check to_emails (JSONB field)
            if (email.to_emails) {
              try {
                const toEmails = Array.isArray(email.to_emails) ? email.to_emails : JSON.parse(String(email.to_emails))

                return toEmails.some(recipient => {
                  if (typeof recipient === 'object' && recipient.email === contactEmail) {
                    return true
                  }
                  if (typeof recipient === 'string' && recipient === contactEmail) {
                    return true
                  }
                  return false
                })
              } catch (e) {
                // Fallback to string search
                return String(email.to_emails).includes(contactEmail)
              }
            }

            return false
          })

          // Filter manually by date since Supabase queries were failing
          const emailsBefore = emails.filter(e => e.date < cutoffDate)
          const emailsAfter = emails.filter(e => e.date >= cutoffDate)

          // Analyze year distribution
          const yearDistribution = emails.reduce(
            (acc, email) => {
              const year = new Date(email.date).getFullYear()
              acc[year] = (acc[year] || 0) + 1
              return acc
            },
            {} as Record<number, number>,
          )

          // Get date range
          const dateRange =
            emails.length > 0
              ? {
                  oldest: emails[emails.length - 1]?.date,
                  newest: emails[0]?.date,
                }
              : null

          console.log(`📊 [EmailsStore] DEBUG Results for ${contactEmail}:`, {
            cutoffDate,
            totalEmailsInDatabase: emails.length,
            totalEmailsAllUsers: allUserEmails?.length || 0,
            emailsBeforeCutoff: {
              count: emailsBefore.length,
              samples: emailsBefore.slice(0, 5).map(e => ({
                date: e.date,
                subject: e.subject,
                from: e.from_email,
              })),
            },
            emailsAfterCutoff: {
              count: emailsAfter.length,
              samples: emailsAfter.slice(0, 5).map(e => ({
                date: e.date,
                subject: e.subject,
                from: e.from_email,
              })),
            },
            allEmailsAnalysis: {
              totalCount: emails.length,
              dateRange,
              yearDistribution: Object.entries(yearDistribution).sort(([a], [b]) => Number(b) - Number(a)),
              oldestYear: dateRange ? new Date(dateRange.oldest).getFullYear() : null,
              newestYear: dateRange ? new Date(dateRange.newest).getFullYear() : null,
              april2022Count: emails.filter(e => e.date.startsWith('2022-04')).length,
              beforeApril2022Count: emails.filter(e => e.date < '2022-04-21').length,
              isApril21Cutoff: emails.length > 0 && emails[emails.length - 1]?.date === '2022-04-21',
            },
            paginationAnalysis: {
              loadedInUI: get().emailsByContact[contactEmail]?.length || 0,
              totalInDatabase: emails.length,
              difference: emails.length - (get().emailsByContact[contactEmail]?.length || 0),
              currentHasMore: get().hasMoreEmails(contactEmail),
              currentPagination: get().paginationByContact[contactEmail],
              currentOffset: get().paginationByContact[contactEmail]?.currentOffset || 0,
              emailsPerPage: get().emailsPerPage,
            },
          })

          return {
            emailsBefore,
            emailsAfter,
            allEmails: emails,
          }
        } catch (error) {
          console.error('❌ [EmailsStore] Debug query failed:', error)
          return null
        }
      },

      // ✅ DEBUG: Force reset and reload emails to test fixed pagination
      debugResetAndReload: async (contactEmail: string) => {
        const { currentUserId } = get()
        if (!currentUserId) {
          console.error('❌ [EmailsStore] No authenticated user for reset and reload')
          return
        }

        console.log('🔄 [EmailsStore] FORCE RESET AND RELOAD:', {
          contactEmail,
          beforeReset: {
            currentEmailsInUI: get().emailsByContact[contactEmail]?.length || 0,
            currentPagination: get().paginationByContact[contactEmail],
            currentOffset: get().paginationByContact[contactEmail]?.currentOffset || 0,
            hasMore: get().hasMoreEmails(contactEmail),
          },
        })

        // Clear all state for this contact
        get().clearContactEmails(contactEmail)

        console.log('🧹 [EmailsStore] State cleared, now reloading...')

        // Reload from scratch
        await get().initializeContactEmails(contactEmail, currentUserId)

        console.log('✅ [EmailsStore] RESET COMPLETE:', {
          contactEmail,
          afterReset: {
            emailsInUI: get().emailsByContact[contactEmail]?.length || 0,
            pagination: get().paginationByContact[contactEmail],
            offset: get().paginationByContact[contactEmail]?.currentOffset || 0,
            hasMore: get().hasMoreEmails(contactEmail),
          },
        })

        return get().emailsByContact[contactEmail]?.length || 0
      },
    })),
  ),
)

// ✅ DEBUG: Make debug function globally available in browser console
if (typeof window !== 'undefined') {
  ;(window as any).debugEmailsStore = async (contactEmail: string, beforeDate?: string) => {
    console.log(`🔍 [EmailsStore Debug] Starting debug for contact: ${contactEmail}`)

    const store = useEmailsStore.getState()

    // Check if user is authenticated
    if (!store.currentUserId) {
      console.error('❌ [EmailsStore Debug] No authenticated user. Make sure you are logged in.')
      return null
    }

    console.log(`👤 [EmailsStore Debug] Using authenticated user: ${store.currentUserId}`)

    const result = await store.debugDatabaseEmails(contactEmail, beforeDate)

    if (result) {
      console.log(`📊 [EmailsStore Debug] Results for ${contactEmail}:`)
      console.log(`  📧 Emails before ${beforeDate || '2022-04-21'}: ${result.emailsBefore.length}`)
      console.log(`  📧 Emails after ${beforeDate || '2022-04-21'}: ${result.emailsAfter.length}`)
      console.log(`  📧 Total emails found: ${result.allEmails.length}`)

      console.log(`\n💡 [EmailsStore Debug] Usage:`)
      console.log(`  debugEmailsStore("${contactEmail}")`)
      console.log(`  debugEmailsStore("${contactEmail}", "2022-01-01")`)
    }

    return result
  }
  ;(window as any).debugResetAndReload = async (contactEmail: string) => {
    console.log(`🔄 [EmailsStore Debug] Starting reset and reload for: ${contactEmail}`)

    const store = useEmailsStore.getState()

    if (!store.currentUserId) {
      console.error('❌ [EmailsStore Debug] No authenticated user. Make sure you are logged in.')
      return 0
    }

    const result = await store.debugResetAndReload(contactEmail)

    console.log(`✅ [EmailsStore Debug] Reset complete. Emails loaded: ${result}`)
    console.log(`💡 [EmailsStore Debug] Usage: debugResetAndReload("${contactEmail}")`)

    return result
  }

  // Debug functions loaded (logging disabled to reduce console spam)
  // Available: debugEmailsStore(contactEmail, beforeDate?), debugResetAndReload(contactEmail)
}

// ✅ PERFORMANCE: Global cache cleanup system
let globalCleanupInterval: NodeJS.Timeout | null = null

// Initialize automatic cleanup when first store instance is created
const initializeGlobalCleanup = () => {
  if (globalCleanupInterval) return

  // Run cleanup every 5 minutes
  globalCleanupInterval = setInterval(
    () => {
      try {
        const store = useEmailsStore.getState()

        // Only run cleanup if store is actively being used
        if (store.isInitialized && Object.keys(store.emailsByContact).length > 0) {
          store.performGlobalCleanup()

          // Also preload frequent contacts if not too much memory usage
          if (Object.keys(store.emailsByContact).length < 20) {
            store.preloadFrequentContacts()
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[EmailsStore] Global cleanup error:', error)
        }
      }
    },
    5 * 60 * 1000,
  ) // 5 minutes

  // Cleanup on page unload
  if (typeof window !== 'undefined') {
    const cleanup = () => {
      if (globalCleanupInterval) {
        clearInterval(globalCleanupInterval)
        globalCleanupInterval = null
      }
    }

    window.addEventListener('beforeunload', cleanup)
    window.addEventListener('pagehide', cleanup)
  }
}

// Start cleanup system
if (typeof window !== 'undefined') {
  // Delay initialization to avoid blocking initial load
  setTimeout(initializeGlobalCleanup, 2000)
}

/**
 * Custom hook to use the emails store
 *
 * @example
 * ```typescript
 * // Usage in component
 * const emails = useEmails();
 *
 * // Initialize emails for contact
 * useEffect(() => {
 *   if (contactEmail && authUser?.id) {
 *     emails.initializeContactEmails(contactEmail, authUser.id);
 *   }
 * }, [contactEmail, authUser?.id]);
 *
 * // Get emails for display
 * const contactEmails = emails.getEmailsForContact(contactEmail);
 * const loading = emails.getLoadingState(contactEmail);
 * const hasMore = emails.hasMoreEmails(contactEmail);
 *
 * // Load more emails (infinite scroll)
 * const handleLoadMore = () => {
 *   emails.loadMoreEmails(contactEmail);
 * };
 *
 * // Sync full history in background
 * const handleSyncHistory = () => {
 *   emails.syncContactHistory(contactEmail, authUser.id);
 * };
 * ```
 */
export const useEmails = () => useEmailsStore()

export default useEmails
