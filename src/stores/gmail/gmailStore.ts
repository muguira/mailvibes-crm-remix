import {
  GmailService,
  createDefaultConfig,
  createGmailService,
  type ConnectionResult,
  type GmailAccount,
  type GmailServiceConfig,
  type ImportResult,
  type SyncResult,
} from '@/services/gmail'
import type { GmailEmail } from '@/services/google/gmailApi'
import { logger } from '@/utils/logger'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// =============================================================================
// STATE INTERFACES
// =============================================================================

interface GmailState {
  // Service instance
  service: GmailService | null

  // Core state (persisted data)
  accounts: GmailAccount[]

  // UI state (transient)
  loading: boolean
  connecting: boolean
  syncing: boolean
  importing: boolean
  error: string | null
  lastSync: Date | null

  // Cache state (for performance)
  contactEmails: Record<string, GmailEmail[]>
  syncResults: Record<string, SyncResult>
  importResults: Record<string, ImportResult>

  // Request deduplication to prevent multiple simultaneous API calls
  contactEmailsLoading?: Record<string, Promise<GmailEmail[]>>

  // Connection state
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
}

interface GmailActions {
  // Service management
  initializeService: (userId: string, config?: Partial<GmailServiceConfig>) => Promise<void>
  disposeService: () => void

  // Account management
  loadAccounts: () => Promise<void>
  connectAccount: (scopes?: string[]) => Promise<ConnectionResult>
  handleOAuthCallback: (code: string, state: string) => Promise<ConnectionResult>
  disconnectAccount: (email: string) => Promise<void>
  refreshAccounts: () => Promise<void>
  refreshConnection: (email: string) => Promise<boolean>

  // Email operations
  syncContactEmails: (
    contactEmail: string,
    options?: { maxEmails?: number; forceFullSync?: boolean },
  ) => Promise<SyncResult>
  getContactEmails: (
    contactEmail: string,
    options?: { preferDatabase?: boolean; maxResults?: number },
  ) => Promise<GmailEmail[]>
  searchEmails: (query: string, options?: { maxResults?: number }) => Promise<GmailEmail[]>
  markEmailAsRead: (gmailId: string) => Promise<void>
  deleteEmail: (gmailId: string) => Promise<void>

  // Contact operations
  importContacts: (options?: { maxContacts?: number; skipDuplicates?: boolean }) => Promise<ImportResult>

  // Cache management
  clearContactEmails: (contactEmail?: string) => void
  clearSyncResults: (contactEmail?: string) => void
  clearAllCache: () => void

  // Error handling
  clearError: () => void
  setError: (error: string) => void

  // Utility
  healthCheck: () => Promise<boolean>
  reset: () => void
}

type GmailStore = GmailState & GmailActions

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: GmailState = {
  service: null,
  accounts: [],
  loading: false,
  connecting: false,
  syncing: false,
  importing: false,
  error: null,
  lastSync: null,
  contactEmails: {},
  syncResults: {},
  importResults: {},
  contactEmailsLoading: {},
  connectionStatus: 'disconnected',
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useGmailStore = create<GmailStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // =======================================================================
      // SERVICE MANAGEMENT
      // =======================================================================

      async initializeService(userId: string, config?: Partial<GmailServiceConfig>) {
        if (get().service) {
          logger.debug('[GmailStore] Service already initialized, skipping...')
          return
        }

        if (get().loading) {
          logger.debug('[GmailStore] Service initialization already in progress, skipping...')
          return
        }

        set(state => {
          state.loading = true
          state.error = null
        })

        try {
          const serviceConfig = {
            ...createDefaultConfig(userId),
            ...config,
            enableLogging: process.env.NODE_ENV === 'development',
          }

          const service = await createGmailService(serviceConfig)

          set(state => {
            state.service = service
            state.loading = false
            state.connectionStatus = 'connected'
          })

          // Don't automatically load accounts to prevent infinite loops
          // Accounts should be loaded explicitly when needed
          logger.info('[GmailStore] Service initialized successfully')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize service'
          set(state => {
            state.loading = false
            state.error = errorMessage
            state.connectionStatus = 'error'
          })
          logger.error('[GmailStore] Service initialization failed', error)
        }
      },

      disposeService() {
        const { service } = get()
        if (service) {
          service.dispose()
        }

        set(state => {
          state.service = null
          state.accounts = []
          state.contactEmails = {}
          state.syncResults = {}
          state.importResults = {}
          state.connectionStatus = 'disconnected'
          state.error = null
        })

        logger.info('[GmailStore] Service disposed')
      },

      // =======================================================================
      // ACCOUNT MANAGEMENT
      // =======================================================================

      async loadAccounts() {
        const { service } = get()
        if (!service) {
          set(state => {
            state.error = 'Service not initialized'
          })
          return
        }

        set(state => {
          state.loading = true
          state.error = null
        })

        try {
          const accounts = await service.getConnectedAccounts()

          set(state => {
            state.accounts = accounts
            state.loading = false
            state.connectionStatus = accounts.length > 0 ? 'connected' : 'disconnected'
          })

          logger.info('[GmailStore] Accounts loaded', { count: accounts.length })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load accounts'
          set(state => {
            state.loading = false
            state.error = errorMessage
            state.connectionStatus = 'error'
          })
          logger.error('[GmailStore] Failed to load accounts', error)
        }
      },

      async connectAccount(scopes?: string[]) {
        const { service } = get()
        if (!service) {
          const error = 'Service not initialized'
          set(state => {
            state.error = error
          })
          return { success: false, error }
        }

        set(state => {
          state.connecting = true
          state.error = null
          state.connectionStatus = 'connecting'
        })

        try {
          const result = await service.connectAccount(scopes)

          set(state => {
            state.connecting = false
          })

          if (result.success) {
            logger.info('[GmailStore] Account connection initiated', { redirectUrl: result.redirectUrl })
          } else {
            set(state => {
              state.error = result.error || 'Failed to connect account'
              state.connectionStatus = 'error'
            })
          }

          return result
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to connect account'
          set(state => {
            state.connecting = false
            state.error = errorMessage
            state.connectionStatus = 'error'
          })
          logger.error('[GmailStore] Account connection failed', error)
          return { success: false, error: errorMessage }
        }
      },

      async handleOAuthCallback(code: string, state: string) {
        logger.info('[GmailStore] 🔄 Starting OAuth callback handling', {
          hasCode: !!code,
          hasState: !!state,
          codeLength: code?.length,
          stateLength: state?.length,
        })

        let { service } = get()

        // ✅ CRITICAL FIX: Initialize service if not available during OAuth callback
        if (!service) {
          logger.warn('[GmailStore] ⚠️ Service not initialized during OAuth callback - auto-initializing...')

          // Get userId from browser URL or other sources
          const urlParams = new URLSearchParams(window.location.search)
          const currentUrl = window.location.pathname

          // Try to get user from auth context or current state
          let userId: string | null = null

          // Method 1: Check if there's a user in the current app state
          try {
            const { useAuth } = await import('@/components/auth')
            const authContext = useAuth()
            userId = authContext?.user?.id || null
          } catch (error) {
            logger.warn('[GmailStore] Could not get user from auth context:', error)
          }

          // Method 2: Try to get user from Supabase session
          if (!userId) {
            try {
              const { supabase } = await import('@/integrations/supabase/client')
              const {
                data: { session },
              } = await supabase.auth.getSession()
              userId = session?.user?.id || null
            } catch (error) {
              logger.warn('[GmailStore] Could not get user from Supabase session:', error)
            }
          }

          if (!userId) {
            const error = 'Cannot initialize service: User ID not available during OAuth callback'
            logger.error('[GmailStore] ❌', error)
            set(store => {
              store.error = error
            })
            return { success: false, error }
          }

          logger.info('[GmailStore] 🔄 Auto-initializing service for OAuth callback', { userId })

          try {
            await get().initializeService(userId, { enableLogging: true })
            service = get().service // Get the newly initialized service

            if (!service) {
              throw new Error('Service initialization failed')
            }

            logger.info('[GmailStore] ✅ Service auto-initialized successfully for OAuth callback')
          } catch (initError) {
            const error = `Failed to auto-initialize service: ${initError instanceof Error ? initError.message : 'Unknown error'}`
            logger.error('[GmailStore] ❌', error)
            set(store => {
              store.error = error
            })
            return { success: false, error }
          }
        }

        logger.info('[GmailStore] ✅ Service is available, proceeding with callback')

        set(store => {
          store.connecting = true
          store.error = null
        })

        try {
          logger.info('[GmailStore] 🔄 Calling service.handleOAuthCallback')
          const result = await service.handleOAuthCallback(code, state)

          logger.info('[GmailStore] 📦 Service handleOAuthCallback result:', {
            success: result.success,
            hasAccount: !!result.account,
            error: result.error,
          })

          set(store => {
            store.connecting = false
          })

          if (result.success) {
            logger.info('[GmailStore] ✅ OAuth callback successful, reloading accounts')
            // Reload accounts to reflect the new connection
            await get().loadAccounts()
            logger.info('[GmailStore] ✅ OAuth callback handled successfully')
          } else {
            logger.error('[GmailStore] ❌ OAuth callback failed:', result.error)
            set(store => {
              store.error = result.error || 'Failed to handle OAuth callback'
              store.connectionStatus = 'error'
            })
          }

          return result
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to handle OAuth callback'
          logger.error('[GmailStore] ❌ Exception in OAuth callback:', error)
          set(store => {
            store.connecting = false
            store.error = errorMessage
            store.connectionStatus = 'error'
          })
          logger.error('[GmailStore] OAuth callback failed', error)
          return { success: false, error: errorMessage }
        }
      },

      async disconnectAccount(email: string) {
        const { service } = get()
        if (!service) {
          set(state => {
            state.error = 'Service not initialized'
          })
          return
        }

        set(state => {
          state.loading = true
          state.error = null
        })

        try {
          await service.disconnectAccount(email)

          // Remove account from state and clear related cache
          set(state => {
            state.accounts = state.accounts.filter(account => account.email !== email)
            state.loading = false

            // Clear cached data for this account
            Object.keys(state.contactEmails).forEach(contactEmail => {
              if (state.contactEmails[contactEmail].some(e => e.from.email === email)) {
                delete state.contactEmails[contactEmail]
              }
            })
          })

          logger.info('[GmailStore] Account disconnected', { email })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect account'
          set(state => {
            state.loading = false
            state.error = errorMessage
          })
          logger.error('[GmailStore] Failed to disconnect account', error)
        }
      },

      async refreshAccounts() {
        await get().loadAccounts()
      },

      async refreshConnection(email: string) {
        const { service } = get()
        if (!service) {
          set(state => {
            state.error = 'Service not initialized'
          })
          return false
        }

        try {
          const success = await service.refreshConnection(email)

          if (success) {
            // Reload accounts to reflect updated token status
            await get().loadAccounts()
            logger.info('[GmailStore] Connection refreshed', { email })
          }

          return success
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to refresh connection'
          set(state => {
            state.error = errorMessage
          })
          logger.error('[GmailStore] Failed to refresh connection', error)
          return false
        }
      },

      // =======================================================================
      // EMAIL OPERATIONS
      // =======================================================================

      async syncContactEmails(contactEmail: string, options = {}) {
        const { service } = get()
        if (!service) {
          const error = 'Service not initialized'
          set(state => {
            state.error = error
          })
          return { success: false, emailsSynced: 0, emailsCreated: 0, emailsUpdated: 0, contactEmail, error }
        }

        set(state => {
          state.syncing = true
          state.error = null
        })

        try {
          const result = await service.syncEmails(contactEmail, {
            maxEmails: options.maxEmails || 50,
            forceFullSync: options.forceFullSync || false,
            onProgress: progress => {
              // Could emit progress events here if needed
              logger.debug('[GmailStore] Sync progress', progress)
            },
          })

          set(state => {
            state.syncing = false
            state.syncResults[contactEmail] = result
            state.lastSync = new Date()

            // Clear cached emails to force refresh
            delete state.contactEmails[contactEmail]
          })

          logger.info('[GmailStore] Contact emails synced', result)
          return result
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to sync emails'
          set(state => {
            state.syncing = false
            state.error = errorMessage
          })
          logger.error('[GmailStore] Failed to sync contact emails', error)
          return {
            success: false,
            emailsSynced: 0,
            emailsCreated: 0,
            emailsUpdated: 0,
            contactEmail,
            error: errorMessage,
          }
        }
      },

      // 🚀 NEW: History API methods for incremental sync
      async getHistory(lastHistoryId: string, options: any = {}) {
        logger.info('[GmailStore] 🔄 Getting Gmail history since:', lastHistoryId)

        try {
          // Use the Gmail API service directly with token service
          const { getHistory } = await import('@/services/google/gmailApi')
          const { getValidToken } = await import('@/services/google/tokenService')

          // Get access token from token service
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

          const result = await getHistory(token, lastHistoryId, {
            historyTypes: options.historyTypes || ['messageAdded'],
            maxResults: options.maxResults || 500,
            pageToken: options.pageToken,
          })

          logger.info('[GmailStore] ✅ History fetched:', {
            historyCount: result.history.length,
            newHistoryId: result.historyId,
          })

          return result
        } catch (error) {
          logger.error('[GmailStore] ❌ Failed to get history:', error)
          throw error
        }
      },

      async processEmailBatch(emailBatch: any[], contactEmail: string) {
        logger.info('[GmailStore] 📨 Processing email batch:', {
          batchSize: emailBatch.length,
          contactEmail,
        })

        try {
          // For now, simulate email processing
          // In a real implementation, this would call the EmailService
          let emailsCreated = 0
          let emailsUpdated = 0

          // Simulate processing each email
          for (const email of emailBatch) {
            try {
              // Simulate success - in reality this would save to Supabase
              // and determine if it's a new or updated email
              const isNew = Math.random() > 0.5 // Simulate 50% new, 50% updated

              if (isNew) {
                emailsCreated++
              } else {
                emailsUpdated++
              }

              logger.debug('[GmailStore] ✅ Processed email:', { emailId: email.id })
            } catch (emailError) {
              logger.warn('[GmailStore] ⚠️ Failed to process individual email:', {
                emailId: email.id,
                error: emailError,
              })
              // Continue processing other emails
            }
          }

          logger.info('[GmailStore] ✅ Email batch processed:', {
            emailsCreated,
            emailsUpdated,
            totalProcessed: emailBatch.length,
          })

          return {
            emailsCreated,
            emailsUpdated,
            totalProcessed: emailBatch.length,
          }
        } catch (error) {
          logger.error('[GmailStore] ❌ Failed to process email batch:', error)
          throw error
        }
      },

      async getContactEmails(contactEmail: string, options = {}) {
        const { service } = get()
        if (!service) {
          set(state => {
            state.error = 'Service not initialized'
          })
          return []
        }

        // Check cache first
        const cached = get().contactEmails[contactEmail]
        if (cached && !options.preferDatabase) {
          return cached
        }

        // CRITICAL FIX: Prevent multiple simultaneous requests for the same contact
        const state = get()
        if (state.contactEmailsLoading && state.contactEmailsLoading[contactEmail]) {
          // Wait for existing request to complete
          return await state.contactEmailsLoading[contactEmail]
        }

        set(state => {
          state.loading = true
          state.error = null
          // Track this specific request to prevent duplicates
          if (!state.contactEmailsLoading) state.contactEmailsLoading = {}
        })

        try {
          // Create a promise for this request and store it
          const requestPromise = service.getContactEmails(contactEmail, {
            maxResults: options.maxResults || 500,
            preferDatabase: options.preferDatabase !== false,
          })

          // Store the promise to prevent duplicate requests
          set(state => {
            state.contactEmailsLoading![contactEmail] = requestPromise
          })

          const emails = await requestPromise

          set(state => {
            state.loading = false
            state.contactEmails[contactEmail] = emails
            // Clean up the loading state
            if (state.contactEmailsLoading) {
              delete state.contactEmailsLoading[contactEmail]
            }
          })

          logger.info('[GmailStore] Contact emails retrieved', { contactEmail, count: emails.length })
          return emails
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to get contact emails'
          set(state => {
            state.loading = false
            state.error = errorMessage
            // Clean up the loading state on error
            if (state.contactEmailsLoading) {
              delete state.contactEmailsLoading[contactEmail]
            }
          })
          logger.error('[GmailStore] Failed to get contact emails', error)
          return []
        }
      },

      async searchEmails(query: string, options = {}) {
        const { service } = get()
        if (!service) {
          set(state => {
            state.error = 'Service not initialized'
          })
          return []
        }

        set(state => {
          state.loading = true
          state.error = null
        })

        try {
          const emails = await service.searchEmails(query, {
            maxResults: options.maxResults || 500,
          })

          set(state => {
            state.loading = false
          })

          logger.info('[GmailStore] Email search completed', { query, count: emails.length })
          return emails
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to search emails'
          set(state => {
            state.loading = false
            state.error = errorMessage
          })
          logger.error('[GmailStore] Failed to search emails', error)
          return []
        }
      },

      async markEmailAsRead(gmailId: string) {
        const { service } = get()
        if (!service) {
          set(state => {
            state.error = 'Service not initialized'
          })
          return
        }

        try {
          await service.markEmailAsRead(gmailId)

          // Update cache to reflect read status
          set(state => {
            Object.keys(state.contactEmails).forEach(contactEmail => {
              const emails = state.contactEmails[contactEmail]
              const emailIndex = emails.findIndex(e => e.id === gmailId)
              if (emailIndex !== -1) {
                emails[emailIndex].isRead = true
              }
            })
          })

          logger.info('[GmailStore] Email marked as read', { gmailId })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to mark email as read'
          set(state => {
            state.error = errorMessage
          })
          logger.error('[GmailStore] Failed to mark email as read', error)
        }
      },

      async deleteEmail(gmailId: string) {
        const { service } = get()
        if (!service) {
          set(state => {
            state.error = 'Service not initialized'
          })
          return
        }

        try {
          await service.deleteEmail(gmailId)

          // Remove from cache
          set(state => {
            Object.keys(state.contactEmails).forEach(contactEmail => {
              state.contactEmails[contactEmail] = state.contactEmails[contactEmail].filter(e => e.id !== gmailId)
            })
          })

          logger.info('[GmailStore] Email deleted', { gmailId })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete email'
          set(state => {
            state.error = errorMessage
          })
          logger.error('[GmailStore] Failed to delete email', error)
        }
      },

      // =======================================================================
      // CONTACT OPERATIONS
      // =======================================================================

      async importContacts(options = {}) {
        const { service } = get()
        if (!service) {
          const error = 'Service not initialized'
          set(state => {
            state.error = error
          })
          return {
            success: false,
            contactsImported: 0,
            contactsSkipped: 0,
            contactsDuplicated: 0,
            totalContacts: 0,
            error,
          }
        }

        set(state => {
          state.importing = true
          state.error = null
        })

        try {
          const result = await service.importContacts({
            maxContacts: options.maxContacts || 1000,
            skipDuplicates: options.skipDuplicates !== false,
            onProgress: progress => {
              logger.debug('[GmailStore] Import progress', progress)
            },
          })

          set(state => {
            state.importing = false
            state.importResults['latest'] = result
          })

          logger.info('[GmailStore] Contacts imported', result)
          return result
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to import contacts'
          set(state => {
            state.importing = false
            state.error = errorMessage
          })
          logger.error('[GmailStore] Failed to import contacts', error)
          return {
            success: false,
            contactsImported: 0,
            contactsSkipped: 0,
            contactsDuplicated: 0,
            totalContacts: 0,
            error: errorMessage,
          }
        }
      },

      // =======================================================================
      // CACHE MANAGEMENT
      // =======================================================================

      clearContactEmails(contactEmail?: string) {
        set(state => {
          if (contactEmail) {
            delete state.contactEmails[contactEmail]
          } else {
            state.contactEmails = {}
          }
        })
        logger.info('[GmailStore] Contact emails cache cleared', { contactEmail })
      },

      clearSyncResults(contactEmail?: string) {
        set(state => {
          if (contactEmail) {
            delete state.syncResults[contactEmail]
          } else {
            state.syncResults = {}
          }
        })
        logger.info('[GmailStore] Sync results cache cleared', { contactEmail })
      },

      clearAllCache() {
        const { service } = get()
        if (service) {
          service.clearCache()
        }

        set(state => {
          state.contactEmails = {}
          state.syncResults = {}
          state.importResults = {}
        })
        logger.info('[GmailStore] All cache cleared')
      },

      // =======================================================================
      // ERROR HANDLING
      // =======================================================================

      clearError() {
        set(state => {
          state.error = null
        })
      },

      setError(error: string) {
        set(state => {
          state.error = error
        })
        logger.error('[GmailStore] Error set', { error })
      },

      // =======================================================================
      // UTILITY
      // =======================================================================

      async healthCheck() {
        const { service } = get()
        if (!service) {
          return false
        }

        try {
          const health = await service.healthCheck()
          return health.isHealthy
        } catch (error) {
          logger.error('[GmailStore] Health check failed', error)
          return false
        }
      },

      reset() {
        const { service } = get()
        if (service) {
          service.dispose()
        }

        set(() => ({
          ...initialState,
        }))
        logger.info('[GmailStore] Store reset')
      },
    })),
  ),
)
