import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { supabase } from '@/integrations/supabase/client'
import { GmailEmail } from '@/services/google/gmailApi'
import { triggerContactSync } from '@/workers/emailSyncWorker'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/utils/logger'

interface DatabaseEmail {
  id: string
  gmail_id: string
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
  syncContactHistory: (contactEmail: string, userId: string) => Promise<void>
  refreshContactEmails: (contactEmail: string, userId: string) => Promise<void>

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
      emailsPerPage: 20,
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
          threadId: '',
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

        console.log('🔍 [EmailsStore] loadEmailsFromDatabase called:', {
          contactEmail,
          userId: currentUserId,
          offset,
          limit,
        })

        try {
          // Get more emails than needed to filter locally (JSONB cs operator is unreliable)
          const fetchLimit = Math.max(limit * 5, 200) // Increased: Get at least 200 or 5x the limit

          const { data, error } = await supabase
            .from('emails')
            .select(
              `
              id, gmail_id, subject, snippet, body_text, body_html,
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
            .limit(fetchLimit)

          if (error) throw error

          console.log('🔍 [EmailsStore] Raw database results:', {
            totalFetched: data?.length || 0,
            contactEmail,
            sampleEmails: (data || []).slice(0, 3).map(email => ({
              from: email.from_email,
              to: email.to_emails,
              subject: email.subject,
            })),
          })

          // Filter emails locally for this contact
          const filteredData = (data || []).filter(email => {
            // Check from_email
            if (email.from_email === contactEmail) {
              return true
            }

            // Check to_emails (stored as JSONB array)
            if (email.to_emails) {
              try {
                const toEmails = Array.isArray(email.to_emails) ? email.to_emails : JSON.parse(String(email.to_emails))
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
                const ccEmails = Array.isArray(email.cc_emails) ? email.cc_emails : JSON.parse(String(email.cc_emails))
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

          console.log('🔍 [EmailsStore] Filtered results:', {
            totalFiltered: filteredData.length,
            contactEmail,
            matchingEmails: filteredData.slice(0, 3).map(email => ({
              from: email.from_email,
              to: email.to_emails,
              subject: email.subject,
              date: email.date,
            })),
          })

          // Apply pagination to filtered results
          const paginatedData = filteredData.slice(offset, offset + limit)

          const convertedEmails = paginatedData.map(get().convertDatabaseEmail)

          logger.info(
            `[EmailsStore] Loaded ${convertedEmails.length} emails for ${contactEmail} (offset: ${offset}, filtered from ${filteredData.length} total matches)`,
          )

          return {
            emails: convertedEmails,
            hasMore: filteredData.length > offset + limit,
            totalCount: filteredData.length,
          }
        } catch (error) {
          logger.error('Error loading emails from database:', error)
          console.error('🔍 [EmailsStore] Database error:', error)
          throw error
        }
      },

      /**
       * Initialize emails for a contact - loads first page from database
       */
      initializeContactEmails: async (contactEmail: string, userId: string) => {
        const { emailsPerPage } = get()

        console.log('🔍 [EmailsStore] initializeContactEmails called:', {
          contactEmail,
          userId,
          emailsPerPage,
          currentState: get().emailsByContact[contactEmail]?.length || 0,
        })

        // Set current user
        set(state => {
          state.currentUserId = userId
        })

        // Set loading state
        set(state => {
          state.loading.fetching[contactEmail] = true
          state.errors.fetch[contactEmail] = null
        })

        try {
          const result = await get().loadEmailsFromDatabase(contactEmail, 0, emailsPerPage)

          set(state => {
            // Set emails for this contact
            state.emailsByContact[contactEmail] = result.emails

            // Set pagination info
            state.paginationByContact[contactEmail] = {
              currentOffset: emailsPerPage,
              hasMore: result.hasMore,
              totalCount: result.totalCount,
            }

            state.isInitialized = true
          })

          logger.info(`[EmailsStore] Initialized ${result.emails.length} emails for ${contactEmail}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load emails'

          set(state => {
            state.errors.fetch[contactEmail] = errorMessage
          })

          logger.error(`Error initializing emails for ${contactEmail}:`, error)
          toast({
            title: 'Error loading emails',
            description: errorMessage,
            variant: 'destructive',
          })
        } finally {
          set(state => {
            state.loading.fetching[contactEmail] = false
          })
        }
      },

      /**
       * Load more emails for infinite scroll
       */
      loadMoreEmails: async (contactEmail: string) => {
        const { emailsPerPage, paginationByContact, loading } = get()

        // Don't load if already loading or no more emails
        if (loading.loadingMore[contactEmail] || !paginationByContact[contactEmail]?.hasMore) {
          return
        }

        set(state => {
          state.loading.loadingMore[contactEmail] = true
        })

        try {
          const currentPagination = paginationByContact[contactEmail]
          const result = await get().loadEmailsFromDatabase(
            contactEmail,
            currentPagination.currentOffset,
            emailsPerPage,
          )

          set(state => {
            // Append new emails to existing ones
            const existingEmails = state.emailsByContact[contactEmail] || []
            state.emailsByContact[contactEmail] = [...existingEmails, ...result.emails]

            // Update pagination
            state.paginationByContact[contactEmail] = {
              currentOffset: currentPagination.currentOffset + emailsPerPage,
              hasMore: result.hasMore,
              totalCount: result.totalCount,
            }
          })

          logger.info(`[EmailsStore] Loaded ${result.emails.length} more emails for ${contactEmail}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load more emails'

          set(state => {
            state.errors.fetch[contactEmail] = errorMessage
          })

          logger.error(`Error loading more emails for ${contactEmail}:`, error)
          toast({
            title: 'Error loading more emails',
            description: errorMessage,
            variant: 'destructive',
          })
        } finally {
          set(state => {
            state.loading.loadingMore[contactEmail] = false
          })
        }
      },

      /**
       * Sync full email history in background (doesn't block UI)
       */
      syncContactHistory: async (contactEmail: string, userId: string) => {
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
          await triggerContactSync(userId, primaryAccount.email, contactEmail)

          set(state => {
            state.syncStatus[contactEmail] = 'completed'
            state.lastSyncAt[contactEmail] = new Date()
          })

          toast({
            title: 'Email sync started',
            description: 'Historical emails are being synced in the background',
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
          state.loading = { fetching: {}, syncing: {}, loadingMore: {} }
          state.errors = { fetch: {}, sync: {} }
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
          state.loading = { fetching: {}, syncing: {}, loadingMore: {} }
          state.errors = { fetch: {}, sync: {} }
          state.syncStatus = {}
          state.lastSyncAt = {}
          state.emailsPerPage = 20
          state.isInitialized = false
          state.currentUserId = null
        })
      },

      setCurrentUserId: (userId: string | null) => {
        set(state => {
          state.currentUserId = userId
        })
      },
    })),
  ),
)

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
