import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { logger } from '@/utils/logger'
import {
  GmailService,
  createGmailService,
  createDefaultConfig,
  type GmailAccount,
  type SyncResult,
  type ImportResult,
  type GmailServiceConfig,
  type ConnectionResult,
} from '@/services/gmail'
import type { GmailEmail } from '@/services/google/gmailApi'

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
          logger.warn('[GmailStore] Service already initialized, skipping...')
          return
        }

        if (get().loading) {
          logger.warn('[GmailStore] Service initialization already in progress, skipping...')
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

        set(state => {
          state.loading = true
          state.error = null
        })

        try {
          const emails = await service.getContactEmails(contactEmail, {
            maxResults: options.maxResults || 50,
            preferDatabase: options.preferDatabase !== false,
          })

          set(state => {
            state.loading = false
            state.contactEmails[contactEmail] = emails
          })

          logger.info('[GmailStore] Contact emails retrieved', { contactEmail, count: emails.length })
          return emails
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to get contact emails'
          set(state => {
            state.loading = false
            state.error = errorMessage
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
            maxResults: options.maxResults || 50,
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
