import { StateCreator } from 'zustand'
import { TStore } from '@/types/store/store'
import { logger } from '@/utils/logger'
import { createGmailService, createDefaultConfig } from '@/services/gmail'
import type { GmailService, GmailAccount, ConnectionResult, SyncResult, ImportResult } from '@/services/gmail'
import type { GmailEmail } from '@/services/google/gmailApi'

// =============================================================================
// TYPES FOR COMPATIBILITY
// =============================================================================

interface GmailState {
  // Service instance
  gmailService: GmailService | null

  // Gmail Auth state (compatible with existing interface)
  accounts: GmailAccount[]
  isLoading: boolean
  isConnecting: boolean
  isSyncing: boolean
  isImporting: boolean
  error: string | null
  lastSync: Date | null

  // Cache state
  contactEmails: Record<string, GmailEmail[]>
  syncResults: Record<string, SyncResult>
  importResults: Record<string, ImportResult>

  // Connection state
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
}

interface GmailActions {
  // Service management
  initializeGmailService: (userId: string) => Promise<void>
  disposeGmailService: () => void

  // Auth actions (compatible with existing interface)
  loadGmailAccounts: () => Promise<void>
  connectGmailAccount: (scopes?: string[]) => Promise<ConnectionResult>
  handleGmailOAuthCallback: (code: string, state: string) => Promise<ConnectionResult>
  disconnectGmailAccount: (email: string) => Promise<void>
  refreshGmailAccounts: () => Promise<void>
  refreshGmailConnection: (email: string) => Promise<boolean>

  // Email actions
  syncContactEmails: (
    contactEmail: string,
    options?: { maxEmails?: number; forceFullSync?: boolean },
  ) => Promise<SyncResult>
  getContactEmails: (
    contactEmail: string,
    options?: { preferDatabase?: boolean; maxResults?: number },
  ) => Promise<GmailEmail[]>
  searchGmailEmails: (query: string, options?: { maxResults?: number }) => Promise<GmailEmail[]>
  markGmailEmailAsRead: (gmailId: string) => Promise<void>
  deleteGmailEmail: (gmailId: string) => Promise<void>

  // Contact actions
  importGmailContacts: (options?: { maxContacts?: number; skipDuplicates?: boolean }) => Promise<ImportResult>

  // Cache management
  clearGmailContactEmails: (contactEmail?: string) => void
  clearGmailSyncResults: (contactEmail?: string) => void
  clearAllGmailCache: () => void

  // Error handling
  clearGmailError: () => void
  setGmailError: (error: string) => void

  // Utility
  gmailHealthCheck: () => Promise<boolean>
  resetGmailState: () => void
}

export type TGmailSlice = GmailState & GmailActions

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialGmailState: GmailState = {
  gmailService: null,
  accounts: [],
  isLoading: false,
  isConnecting: false,
  isSyncing: false,
  isImporting: false,
  error: null,
  lastSync: null,
  contactEmails: {},
  syncResults: {},
  importResults: {},
  connectionStatus: 'disconnected',
}

// =============================================================================
// SLICE IMPLEMENTATION
// =============================================================================

export const useGmailSlice: StateCreator<
  TStore,
  [['zustand/immer', never], ['zustand/subscribeWithSelector', never]],
  [],
  TGmailSlice
> = (set, get) => ({
  ...initialGmailState,

  // ===========================================================================
  // SERVICE MANAGEMENT
  // ===========================================================================

  async initializeGmailService(userId: string) {
    set(state => {
      state.isLoading = true
      state.error = null
    })

    try {
      const config = createDefaultConfig(userId)
      config.enableLogging = process.env.NODE_ENV === 'development'

      const service = createGmailService(config)

      set(state => {
        state.gmailService = service
        state.isLoading = false
        state.connectionStatus = 'connected'
      })

      // Auto-load accounts after service initialization
      await get().loadGmailAccounts()

      logger.info('[GmailSlice] Service initialized successfully', { userId })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Gmail service'
      set(state => {
        state.isLoading = false
        state.error = errorMessage
        state.connectionStatus = 'error'
      })
      logger.error('[GmailSlice] Service initialization failed', error)
    }
  },

  disposeGmailService() {
    const { gmailService } = get()
    if (gmailService) {
      gmailService.dispose()
    }

    set(state => {
      state.gmailService = null
      state.accounts = []
      state.contactEmails = {}
      state.syncResults = {}
      state.importResults = {}
      state.connectionStatus = 'disconnected'
      state.error = null
    })

    logger.info('[GmailSlice] Service disposed')
  },

  // ===========================================================================
  // AUTH ACTIONS (Compatible with existing interface)
  // ===========================================================================

  async loadGmailAccounts() {
    const { gmailService } = get()
    if (!gmailService) {
      set(state => {
        state.error = 'Gmail service not initialized'
      })
      return
    }

    set(state => {
      state.isLoading = true
      state.error = null
    })

    try {
      const accounts = await gmailService.getConnectedAccounts()

      set(state => {
        state.accounts = accounts
        state.isLoading = false
        state.connectionStatus = accounts.length > 0 ? 'connected' : 'disconnected'
      })

      logger.info('[GmailSlice] Accounts loaded', { count: accounts.length })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load Gmail accounts'
      set(state => {
        state.isLoading = false
        state.error = errorMessage
        state.connectionStatus = 'error'
      })
      logger.error('[GmailSlice] Failed to load accounts', error)
    }
  },

  async connectGmailAccount(scopes?: string[]) {
    const { gmailService } = get()
    if (!gmailService) {
      const error = 'Gmail service not initialized'
      set(state => {
        state.error = error
      })
      return { success: false, error }
    }

    set(state => {
      state.isConnecting = true
      state.error = null
      state.connectionStatus = 'connecting'
    })

    try {
      const result = await gmailService.connectAccount(scopes)

      set(state => {
        state.isConnecting = false
      })

      if (result.success) {
        logger.info('[GmailSlice] Account connection initiated', { redirectUrl: result.redirectUrl })
      } else {
        set(state => {
          state.error = result.error || 'Failed to connect Gmail account'
          state.connectionStatus = 'error'
        })
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect Gmail account'
      set(state => {
        state.isConnecting = false
        state.error = errorMessage
        state.connectionStatus = 'error'
      })
      logger.error('[GmailSlice] Account connection failed', error)
      return { success: false, error: errorMessage }
    }
  },

  async handleGmailOAuthCallback(code: string, state: string) {
    const { gmailService } = get()
    if (!gmailService) {
      const error = 'Gmail service not initialized'
      set(store => {
        store.error = error
      })
      return { success: false, error }
    }

    set(store => {
      store.isConnecting = true
      store.error = null
    })

    try {
      const result = await gmailService.handleOAuthCallback(code, state)

      set(store => {
        store.isConnecting = false
      })

      if (result.success) {
        // Reload accounts to reflect the new connection
        await get().loadGmailAccounts()
        logger.info('[GmailSlice] OAuth callback handled successfully')
      } else {
        set(store => {
          store.error = result.error || 'Failed to handle OAuth callback'
          store.connectionStatus = 'error'
        })
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to handle OAuth callback'
      set(store => {
        store.isConnecting = false
        store.error = errorMessage
        store.connectionStatus = 'error'
      })
      logger.error('[GmailSlice] OAuth callback failed', error)
      return { success: false, error: errorMessage }
    }
  },

  async disconnectGmailAccount(email: string) {
    const { gmailService } = get()
    if (!gmailService) {
      set(state => {
        state.error = 'Gmail service not initialized'
      })
      return
    }

    set(state => {
      state.isLoading = true
      state.error = null
    })

    try {
      await gmailService.disconnectAccount(email)

      // Remove account from state and clear related cache
      set(state => {
        state.accounts = state.accounts.filter(account => account.email !== email)
        state.isLoading = false

        // Clear cached data for this account
        Object.keys(state.contactEmails).forEach(contactEmail => {
          if (state.contactEmails[contactEmail].some(e => e.from.email === email)) {
            delete state.contactEmails[contactEmail]
          }
        })
      })

      logger.info('[GmailSlice] Account disconnected', { email })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect Gmail account'
      set(state => {
        state.isLoading = false
        state.error = errorMessage
      })
      logger.error('[GmailSlice] Failed to disconnect account', error)
    }
  },

  async refreshGmailAccounts() {
    await get().loadGmailAccounts()
  },

  async refreshGmailConnection(email: string) {
    const { gmailService } = get()
    if (!gmailService) {
      set(state => {
        state.error = 'Gmail service not initialized'
      })
      return false
    }

    try {
      const success = await gmailService.refreshConnection(email)

      if (success) {
        // Reload accounts to reflect updated token status
        await get().loadGmailAccounts()
        logger.info('[GmailSlice] Connection refreshed', { email })
      }

      return success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh Gmail connection'
      set(state => {
        state.error = errorMessage
      })
      logger.error('[GmailSlice] Failed to refresh connection', error)
      return false
    }
  },

  // ===========================================================================
  // EMAIL ACTIONS
  // ===========================================================================

  async syncContactEmails(contactEmail: string, options = {}) {
    const { gmailService } = get()
    if (!gmailService) {
      const error = 'Gmail service not initialized'
      set(state => {
        state.error = error
      })
      return { success: false, emailsSynced: 0, emailsCreated: 0, emailsUpdated: 0, contactEmail, error }
    }

    set(state => {
      state.isSyncing = true
      state.error = null
    })

    try {
      const result = await gmailService.syncEmails(contactEmail, {
        maxEmails: options.maxEmails || 50,
        forceFullSync: options.forceFullSync || false,
        onProgress: progress => {
          logger.debug('[GmailSlice] Sync progress', progress)
        },
      })

      set(state => {
        state.isSyncing = false
        state.syncResults[contactEmail] = result
        state.lastSync = new Date()

        // Clear cached emails to force refresh
        delete state.contactEmails[contactEmail]
      })

      logger.info('[GmailSlice] Contact emails synced', result)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync emails'
      set(state => {
        state.isSyncing = false
        state.error = errorMessage
      })
      logger.error('[GmailSlice] Failed to sync contact emails', error)
      return { success: false, emailsSynced: 0, emailsCreated: 0, emailsUpdated: 0, contactEmail, error: errorMessage }
    }
  },

  async getContactEmails(contactEmail: string, options = {}) {
    const { gmailService } = get()
    if (!gmailService) {
      set(state => {
        state.error = 'Gmail service not initialized'
      })
      return []
    }

    // Check cache first
    const cached = get().contactEmails[contactEmail]
    if (cached && !options.preferDatabase) {
      return cached
    }

    set(state => {
      state.isLoading = true
      state.error = null
    })

    try {
      const emails = await gmailService.getContactEmails(contactEmail, {
        maxResults: options.maxResults || 50,
        preferDatabase: options.preferDatabase !== false,
      })

      set(state => {
        state.isLoading = false
        state.contactEmails[contactEmail] = emails
      })

      logger.info('[GmailSlice] Contact emails retrieved', { contactEmail, count: emails.length })
      return emails
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get contact emails'
      set(state => {
        state.isLoading = false
        state.error = errorMessage
      })
      logger.error('[GmailSlice] Failed to get contact emails', error)
      return []
    }
  },

  async searchGmailEmails(query: string, options = {}) {
    const { gmailService } = get()
    if (!gmailService) {
      set(state => {
        state.error = 'Gmail service not initialized'
      })
      return []
    }

    set(state => {
      state.isLoading = true
      state.error = null
    })

    try {
      const emails = await gmailService.searchEmails(query, {
        maxResults: options.maxResults || 50,
      })

      set(state => {
        state.isLoading = false
      })

      logger.info('[GmailSlice] Email search completed', { query, count: emails.length })
      return emails
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search emails'
      set(state => {
        state.isLoading = false
        state.error = errorMessage
      })
      logger.error('[GmailSlice] Failed to search emails', error)
      return []
    }
  },

  async markGmailEmailAsRead(gmailId: string) {
    const { gmailService } = get()
    if (!gmailService) {
      set(state => {
        state.error = 'Gmail service not initialized'
      })
      return
    }

    try {
      await gmailService.markEmailAsRead(gmailId)

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

      logger.info('[GmailSlice] Email marked as read', { gmailId })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark email as read'
      set(state => {
        state.error = errorMessage
      })
      logger.error('[GmailSlice] Failed to mark email as read', error)
    }
  },

  async deleteGmailEmail(gmailId: string) {
    const { gmailService } = get()
    if (!gmailService) {
      set(state => {
        state.error = 'Gmail service not initialized'
      })
      return
    }

    try {
      await gmailService.deleteEmail(gmailId)

      // Remove from cache
      set(state => {
        Object.keys(state.contactEmails).forEach(contactEmail => {
          state.contactEmails[contactEmail] = state.contactEmails[contactEmail].filter(e => e.id !== gmailId)
        })
      })

      logger.info('[GmailSlice] Email deleted', { gmailId })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete email'
      set(state => {
        state.error = errorMessage
      })
      logger.error('[GmailSlice] Failed to delete email', error)
    }
  },

  // ===========================================================================
  // CONTACT ACTIONS
  // ===========================================================================

  async importGmailContacts(options = {}) {
    const { gmailService } = get()
    if (!gmailService) {
      const error = 'Gmail service not initialized'
      set(state => {
        state.error = error
      })
      return { success: false, contactsImported: 0, contactsSkipped: 0, contactsDuplicated: 0, totalContacts: 0, error }
    }

    set(state => {
      state.isImporting = true
      state.error = null
    })

    try {
      const result = await gmailService.importContacts({
        maxContacts: options.maxContacts || 1000,
        skipDuplicates: options.skipDuplicates !== false,
        onProgress: progress => {
          logger.debug('[GmailSlice] Import progress', progress)
        },
      })

      set(state => {
        state.isImporting = false
        state.importResults['latest'] = result
      })

      logger.info('[GmailSlice] Contacts imported', result)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import contacts'
      set(state => {
        state.isImporting = false
        state.error = errorMessage
      })
      logger.error('[GmailSlice] Failed to import contacts', error)
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

  // ===========================================================================
  // CACHE MANAGEMENT
  // ===========================================================================

  clearGmailContactEmails(contactEmail?: string) {
    set(state => {
      if (contactEmail) {
        delete state.contactEmails[contactEmail]
      } else {
        state.contactEmails = {}
      }
    })
    logger.info('[GmailSlice] Contact emails cache cleared', { contactEmail })
  },

  clearGmailSyncResults(contactEmail?: string) {
    set(state => {
      if (contactEmail) {
        delete state.syncResults[contactEmail]
      } else {
        state.syncResults = {}
      }
    })
    logger.info('[GmailSlice] Sync results cache cleared', { contactEmail })
  },

  clearAllGmailCache() {
    const { gmailService } = get()
    if (gmailService) {
      gmailService.clearCache()
    }

    set(state => {
      state.contactEmails = {}
      state.syncResults = {}
      state.importResults = {}
    })
    logger.info('[GmailSlice] All cache cleared')
  },

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  clearGmailError() {
    set(state => {
      state.error = null
    })
  },

  setGmailError(error: string) {
    set(state => {
      state.error = error
    })
    logger.error('[GmailSlice] Error set', { error })
  },

  // ===========================================================================
  // UTILITY
  // ===========================================================================

  async gmailHealthCheck() {
    const { gmailService } = get()
    if (!gmailService) {
      return false
    }

    try {
      const health = await gmailService.healthCheck()
      return health.isHealthy
    } catch (error) {
      logger.error('[GmailSlice] Health check failed', error)
      return false
    }
  },

  resetGmailState() {
    const { gmailService } = get()
    if (gmailService) {
      gmailService.dispose()
    }

    set(state => {
      Object.assign(state, initialGmailState)
    })
    logger.info('[GmailSlice] State reset')
  },
})
