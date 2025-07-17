import { useEffect, useCallback, useMemo } from 'react'
import {
  useGmailStore,
  useGmailAccountsView,
  useGmailEmailsView,
  useGmailImportView,
  useGmailServiceActions,
} from '@/stores/gmail'
import { logger } from '@/utils/logger'
import type { GmailAccount, SyncResult, ImportResult, ConnectionResult } from '@/services/gmail'
import type { GmailEmail } from '@/services/google/gmailApi'

/**
 * Hook principal para usar el sistema de Gmail refactorizado
 *
 * Este hook proporciona una interfaz completa y optimizada para trabajar
 * con Gmail usando el nuevo service layer y store.
 *
 * @param options Opciones de configuración
 */
interface UseGmailOptions {
  userId?: string // ID del usuario para inicializar el service
  autoInitialize?: boolean // Si auto-inicializar el servicio
  enableLogging?: boolean // Si habilitar logging detallado
}

interface UseGmailReturn {
  // Estado consolidado
  accounts: GmailAccount[]
  loading: {
    accounts: boolean
    connecting: boolean
    syncing: boolean
    importing: boolean
  }
  error: string | null
  lastSync: Date | null
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  isReady: boolean

  // Acciones de cuenta
  loadAccounts: () => Promise<void>
  connectAccount: (scopes?: string[]) => Promise<ConnectionResult>
  handleOAuthCallback: (code: string, state: string) => Promise<ConnectionResult>
  disconnectAccount: (email: string) => Promise<void>
  refreshAccounts: () => Promise<void>
  refreshConnection: (email: string) => Promise<boolean>

  // Acciones de email
  syncContactEmails: (
    contactEmail: string,
    options?: {
      maxEmails?: number
      forceFullSync?: boolean
    },
  ) => Promise<SyncResult>
  getContactEmails: (
    contactEmail: string,
    options?: {
      preferDatabase?: boolean
      maxResults?: number
    },
  ) => Promise<GmailEmail[]>
  searchEmails: (query: string, options?: { maxResults?: number }) => Promise<GmailEmail[]>
  markEmailAsRead: (gmailId: string) => Promise<void>
  deleteEmail: (gmailId: string) => Promise<void>

  // Acciones de contactos
  importContacts: (options?: { maxContacts?: number; skipDuplicates?: boolean }) => Promise<ImportResult>

  // Gestión de cache y errores
  clearContactEmails: (contactEmail?: string) => void
  clearAllCache: () => void
  clearError: () => void

  // Utilidades
  healthCheck: () => Promise<boolean>
  reset: () => void
  dispose: () => void

  // Helpers
  hasConnectedAccounts: boolean
  primaryAccount: GmailAccount | undefined
  isBusy: boolean
}

export function useGmail(options: UseGmailOptions = {}): UseGmailReturn {
  const { userId, autoInitialize = true, enableLogging = process.env.NODE_ENV === 'development' } = options

  // Store principal
  const store = useGmailStore()

  // Use primitive selectors instead of composite ones to avoid loops
  const accounts = store.accounts
  const loading = {
    accounts: store.loading,
    connecting: store.connecting,
    syncing: store.syncing,
    importing: store.importing,
  }
  const error = store.error
  const lastSync = store.lastSync
  const connectionStatus = store.connectionStatus
  const isReady = store.service !== null && !store.loading

  // Auto-inicialización del servicio
  useEffect(() => {
    if (autoInitialize && userId && !store.service) {
      if (enableLogging) {
        logger.info(`[useGmail] Auto-initializing Gmail service for user: ${userId}`)
      }
      store.initializeService(userId, { enableLogging })
    }
  }, [autoInitialize, userId, enableLogging]) // Include all used variables

  // =============================================================================
  // ESTADO CONSOLIDADO - Removed redundant assignments
  // =============================================================================

  // =============================================================================
  // ACCIONES DE CUENTA - Remove store from dependencies to prevent recreations
  // =============================================================================

  const loadAccounts = useCallback(async () => {
    if (enableLogging) {
      logger.info('[useGmail] Loading Gmail accounts')
    }
    return await store.loadAccounts()
  }, [enableLogging]) // Remove store dependency

  const connectAccount = useCallback(
    async (scopes?: string[]) => {
      if (enableLogging) {
        logger.info('[useGmail] Connecting Gmail account', { scopes })
      }
      return await store.connectAccount(scopes)
    },
    [enableLogging], // Remove store dependency
  )

  const handleOAuthCallback = useCallback(
    async (code: string, state: string) => {
      if (enableLogging) {
        logger.info('[useGmail] Handling OAuth callback')
      }
      return await store.handleOAuthCallback(code, state)
    },
    [enableLogging], // Remove store dependency
  )

  const disconnectAccount = useCallback(
    async (email: string) => {
      if (enableLogging) {
        logger.info('[useGmail] Disconnecting Gmail account', { email })
      }
      return await store.disconnectAccount(email)
    },
    [enableLogging], // Remove store dependency
  )

  const refreshAccounts = useCallback(async () => {
    if (enableLogging) {
      logger.info('[useGmail] Refreshing Gmail accounts')
    }
    return await store.refreshAccounts()
  }, [enableLogging]) // Remove store dependency

  const refreshConnection = useCallback(
    async (email: string) => {
      if (enableLogging) {
        logger.info('[useGmail] Refreshing connection', { email })
      }
      return await store.refreshConnection(email)
    },
    [enableLogging], // Remove store dependency
  )

  // =============================================================================
  // ACCIONES DE EMAIL
  // =============================================================================

  const syncContactEmails = useCallback(
    async (contactEmail: string, options?: { maxEmails?: number; forceFullSync?: boolean }) => {
      if (enableLogging) {
        logger.info('[useGmail] Syncing contact emails', { contactEmail, options })
      }
      return await store.syncContactEmails(contactEmail, options)
    },
    [enableLogging], // Remove store dependency
  )

  const getContactEmails = useCallback(
    async (contactEmail: string, options?: { preferDatabase?: boolean; maxResults?: number }) => {
      if (enableLogging) {
        logger.info('[useGmail] Getting contact emails', { contactEmail, options })
      }
      return await store.getContactEmails(contactEmail, options)
    },
    [enableLogging], // Remove store dependency
  )

  const searchEmails = useCallback(
    async (query: string, options?: { maxResults?: number }) => {
      if (enableLogging) {
        logger.info('[useGmail] Searching emails', { query, options })
      }
      return await store.searchEmails(query, options)
    },
    [enableLogging], // Remove store dependency
  )

  const markEmailAsRead = useCallback(
    async (gmailId: string) => {
      if (enableLogging) {
        logger.info('[useGmail] Marking email as read', { gmailId })
      }
      return await store.markEmailAsRead(gmailId)
    },
    [enableLogging], // Remove store dependency
  )

  const deleteEmail = useCallback(
    async (gmailId: string) => {
      if (enableLogging) {
        logger.info('[useGmail] Deleting email', { gmailId })
      }
      return await store.deleteEmail(gmailId)
    },
    [enableLogging], // Remove store dependency
  )

  // =============================================================================
  // ACCIONES DE CONTACTOS
  // =============================================================================

  const importContacts = useCallback(
    async (options?: { maxContacts?: number; skipDuplicates?: boolean }) => {
      if (enableLogging) {
        logger.info('[useGmail] Importing contacts', { options })
      }
      return await store.importContacts(options)
    },
    [enableLogging], // Remove store dependency
  )

  // =============================================================================
  // GESTIÓN DE CACHE Y ERRORES
  // =============================================================================

  const clearContactEmails = useCallback(
    (contactEmail?: string) => {
      if (enableLogging) {
        logger.info('[useGmail] Clearing contact emails cache', { contactEmail })
      }
      store.clearContactEmails(contactEmail)
    },
    [enableLogging], // Remove store dependency
  )

  const clearAllCache = useCallback(() => {
    if (enableLogging) {
      logger.info('[useGmail] Clearing all cache')
    }
    store.clearAllCache()
  }, [enableLogging]) // Remove store dependency

  const clearError = useCallback(() => {
    if (enableLogging) {
      logger.info('[useGmail] Clearing error')
    }
    store.clearError()
  }, [enableLogging]) // Remove store dependency

  // =============================================================================
  // UTILIDADES
  // =============================================================================

  const healthCheck = useCallback(async () => {
    if (enableLogging) {
      logger.info('[useGmail] Performing health check')
    }
    return await store.healthCheck()
  }, [enableLogging]) // Remove store dependency

  const reset = useCallback(() => {
    if (enableLogging) {
      logger.info('[useGmail] Resetting Gmail state')
    }
    store.reset()
  }, [enableLogging]) // Remove store dependency

  const dispose = useCallback(() => {
    if (enableLogging) {
      logger.info('[useGmail] Disposing Gmail service')
    }
    store.disposeService()
  }, [enableLogging]) // Remove store dependency

  // =============================================================================
  // HELPERS COMPUTADOS
  // =============================================================================

  const hasConnectedAccounts = accounts.length > 0
  const primaryAccount = accounts.find(account => account.is_connected)
  const isBusy = loading.accounts || loading.connecting || loading.syncing || loading.importing

  return useMemo(
    () => ({
      // Estado
      accounts,
      loading,
      error,
      lastSync,
      connectionStatus,
      isReady,

      // Acciones de cuenta
      loadAccounts,
      connectAccount,
      handleOAuthCallback,
      disconnectAccount,
      refreshAccounts,
      refreshConnection,

      // Acciones de email
      syncContactEmails,
      getContactEmails,
      searchEmails,
      markEmailAsRead,
      deleteEmail,

      // Acciones de contactos
      importContacts,

      // Gestión de cache y errores
      clearContactEmails,
      clearAllCache,
      clearError,

      // Utilidades
      healthCheck,
      reset,
      dispose,

      // Helpers
      hasConnectedAccounts,
      primaryAccount,
      isBusy,
    }),
    [
      accounts,
      loading,
      error,
      lastSync,
      connectionStatus,
      isReady,
      loadAccounts,
      connectAccount,
      handleOAuthCallback,
      disconnectAccount,
      refreshAccounts,
      refreshConnection,
      syncContactEmails,
      getContactEmails,
      searchEmails,
      markEmailAsRead,
      deleteEmail,
      importContacts,
      clearContactEmails,
      clearAllCache,
      clearError,
      healthCheck,
      reset,
      dispose,
      hasConnectedAccounts,
      primaryAccount,
      isBusy,
    ],
  )
}
