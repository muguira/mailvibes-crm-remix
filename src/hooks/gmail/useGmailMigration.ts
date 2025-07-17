import { useEffect, useCallback } from 'react'
import { useGmailStore } from '@/stores/gmail'
import { useStore } from '@/stores'
import { logger } from '@/utils/logger'
import type { GmailAccount, SyncResult, ImportResult, ConnectionResult } from '@/services/gmail'
import type { GmailEmail } from '@/services/google/gmailApi'

/**
 * Hook de migración que permite cambiar gradualmente del store legacy al nuevo
 *
 * Este hook proporciona una interfaz compatible que puede usar el store legacy
 * o el nuevo store dependiendo de la configuración, facilitando la migración gradual.
 *
 * @param options Opciones de configuración para la migración
 */
interface MigrationOptions {
  useNewStore?: boolean // Si usar el nuevo store o el legacy
  userId?: string // ID del usuario para inicializar el service
  autoInitialize?: boolean // Si auto-inicializar el servicio
  logMigration?: boolean // Si loggear las operaciones de migración
}

interface GmailMigrationHook {
  // Estado
  accounts: GmailAccount[]
  isLoading: boolean
  isConnecting: boolean
  isSyncing: boolean
  isImporting: boolean
  error: string | null
  lastSync: Date | null
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'

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
    options?: { maxEmails?: number; forceFullSync?: boolean },
  ) => Promise<SyncResult>
  getContactEmails: (
    contactEmail: string,
    options?: { preferDatabase?: boolean; maxResults?: number },
  ) => Promise<GmailEmail[]>
  searchEmails: (query: string, options?: { maxResults?: number }) => Promise<GmailEmail[]>
  markEmailAsRead: (gmailId: string) => Promise<void>
  deleteEmail: (gmailId: string) => Promise<void>

  // Acciones de contactos
  importContacts: (options?: { maxContacts?: number; skipDuplicates?: boolean }) => Promise<ImportResult>

  // Gestión de cache
  clearContactEmails: (contactEmail?: string) => void
  clearCache: () => void

  // Gestión de errores
  clearError: () => void

  // Utilidades
  healthCheck: () => Promise<boolean>
  reset: () => void

  // Info de migración
  migrationInfo: {
    usingNewStore: boolean
    isInitialized: boolean
    serviceReady: boolean
  }
}

export function useGmailMigration(options: MigrationOptions = {}): GmailMigrationHook {
  const {
    useNewStore = true, // Por defecto usar el nuevo store
    userId,
    autoInitialize = true,
    logMigration = process.env.NODE_ENV === 'development',
  } = options

  // Hooks del store nuevo
  const newStore = useGmailStore()

  // Hooks del store legacy
  const legacyStore = useStore()

  // Log de migración
  const logMigrationAction = useCallback(
    (action: string, usingNew: boolean) => {
      if (logMigration) {
        logger.info(`[GmailMigration] ${action} using ${usingNew ? 'NEW' : 'LEGACY'} store`)
      }
    },
    [logMigration],
  )

  // Auto-inicialización del servicio
  useEffect(() => {
    if (useNewStore && autoInitialize && userId && !newStore.service) {
      logMigrationAction('Auto-initializing service', true)
      newStore.initializeService(userId)
    }
  }, [useNewStore, autoInitialize, userId, newStore, logMigrationAction])

  // =============================================================================
  // ESTADO - Usar el store correspondiente
  // =============================================================================

  const accounts = useNewStore ? newStore.accounts : legacyStore.accounts || []

  const isLoading = useNewStore ? newStore.loading : legacyStore.isLoading || false

  const isConnecting = useNewStore ? newStore.connecting : legacyStore.isConnecting || false

  const isSyncing = useNewStore ? newStore.syncing : legacyStore.isSyncing || false

  const isImporting = useNewStore ? newStore.importing : legacyStore.isImporting || false

  const error = useNewStore ? newStore.error : legacyStore.error || null

  const lastSync = useNewStore ? newStore.lastSync : legacyStore.lastSync || null

  const connectionStatus = useNewStore
    ? newStore.connectionStatus
    : legacyStore.accounts?.length > 0
      ? 'connected'
      : 'disconnected'

  // =============================================================================
  // ACCIONES - Delegadas al store correspondiente
  // =============================================================================

  const loadAccounts = useCallback(async () => {
    logMigrationAction('loadAccounts', useNewStore)

    if (useNewStore) {
      return await newStore.loadAccounts()
    } else {
      return await legacyStore.loadGmailAccounts?.()
    }
  }, [useNewStore, newStore, legacyStore, logMigrationAction])

  const connectAccount = useCallback(
    async (scopes?: string[]) => {
      logMigrationAction('connectAccount', useNewStore)

      if (useNewStore) {
        return await newStore.connectAccount(scopes)
      } else {
        // Adaptador para el store legacy
        const result = await legacyStore.connectGmailAccount?.(scopes)
        return result || { success: false, error: 'Legacy store method not available' }
      }
    },
    [useNewStore, newStore, legacyStore, logMigrationAction],
  )

  const handleOAuthCallback = useCallback(
    async (code: string, state: string) => {
      logMigrationAction('handleOAuthCallback', useNewStore)

      if (useNewStore) {
        return await newStore.handleOAuthCallback(code, state)
      } else {
        const result = await legacyStore.handleGmailOAuthCallback?.(code, state)
        return result || { success: false, error: 'Legacy store method not available' }
      }
    },
    [useNewStore, newStore, legacyStore, logMigrationAction],
  )

  const disconnectAccount = useCallback(
    async (email: string) => {
      logMigrationAction('disconnectAccount', useNewStore)

      if (useNewStore) {
        return await newStore.disconnectAccount(email)
      } else {
        return await legacyStore.disconnectGmailAccount?.(email)
      }
    },
    [useNewStore, newStore, legacyStore, logMigrationAction],
  )

  const refreshAccounts = useCallback(async () => {
    logMigrationAction('refreshAccounts', useNewStore)

    if (useNewStore) {
      return await newStore.refreshAccounts()
    } else {
      return await legacyStore.loadGmailAccounts?.()
    }
  }, [useNewStore, newStore, legacyStore, logMigrationAction])

  const refreshConnection = useCallback(
    async (email: string) => {
      logMigrationAction('refreshConnection', useNewStore)

      if (useNewStore) {
        return await newStore.refreshConnection(email)
      } else {
        // Legacy store no tiene esta función, simular
        await legacyStore.loadGmailAccounts?.()
        return true
      }
    },
    [useNewStore, newStore, legacyStore, logMigrationAction],
  )

  const syncContactEmails = useCallback(
    async (contactEmail: string, options?: { maxEmails?: number; forceFullSync?: boolean }) => {
      logMigrationAction('syncContactEmails', useNewStore)

      if (useNewStore) {
        return await newStore.syncContactEmails(contactEmail, options)
      } else {
        // Legacy store no tiene esta función exacta, crear un resultado simulado
        return {
          success: false,
          emailsSynced: 0,
          emailsCreated: 0,
          emailsUpdated: 0,
          contactEmail,
          error: 'Legacy store does not support contact email sync',
        }
      }
    },
    [useNewStore, newStore, legacyStore, logMigrationAction],
  )

  const getContactEmails = useCallback(
    async (contactEmail: string, options?: { preferDatabase?: boolean; maxResults?: number }) => {
      logMigrationAction('getContactEmails', useNewStore)

      if (useNewStore) {
        return await newStore.getContactEmails(contactEmail, options)
      } else {
        // Legacy store no tiene esta función, retornar array vacío
        return []
      }
    },
    [useNewStore, newStore, logMigrationAction],
  )

  const searchEmails = useCallback(
    async (query: string, options?: { maxResults?: number }) => {
      logMigrationAction('searchEmails', useNewStore)

      if (useNewStore) {
        return await newStore.searchEmails(query, options)
      } else {
        // Legacy store no tiene esta función
        return []
      }
    },
    [useNewStore, newStore, logMigrationAction],
  )

  const markEmailAsRead = useCallback(
    async (gmailId: string) => {
      logMigrationAction('markEmailAsRead', useNewStore)

      if (useNewStore) {
        return await newStore.markEmailAsRead(gmailId)
      } else {
        // Legacy store no tiene esta función
        logger.warn('[GmailMigration] markEmailAsRead not supported in legacy store')
      }
    },
    [useNewStore, newStore, logMigrationAction],
  )

  const deleteEmail = useCallback(
    async (gmailId: string) => {
      logMigrationAction('deleteEmail', useNewStore)

      if (useNewStore) {
        return await newStore.deleteEmail(gmailId)
      } else {
        // Legacy store no tiene esta función
        logger.warn('[GmailMigration] deleteEmail not supported in legacy store')
      }
    },
    [useNewStore, newStore, logMigrationAction],
  )

  const importContacts = useCallback(
    async (options?: { maxContacts?: number; skipDuplicates?: boolean }) => {
      logMigrationAction('importContacts', useNewStore)

      if (useNewStore) {
        return await newStore.importContacts(options)
      } else {
        // Legacy store no tiene esta función exacta
        return {
          success: false,
          contactsImported: 0,
          contactsSkipped: 0,
          contactsDuplicated: 0,
          totalContacts: 0,
          error: 'Legacy store does not support contact import',
        }
      }
    },
    [useNewStore, newStore, logMigrationAction],
  )

  const clearContactEmails = useCallback(
    (contactEmail?: string) => {
      logMigrationAction('clearContactEmails', useNewStore)

      if (useNewStore) {
        newStore.clearContactEmails(contactEmail)
      } else {
        // Legacy store no tiene esta función
        logger.warn('[GmailMigration] clearContactEmails not supported in legacy store')
      }
    },
    [useNewStore, newStore, logMigrationAction],
  )

  const clearCache = useCallback(() => {
    logMigrationAction('clearCache', useNewStore)

    if (useNewStore) {
      newStore.clearAllCache()
    } else {
      // Legacy store no tiene función de cache
      logger.warn('[GmailMigration] clearCache not supported in legacy store')
    }
  }, [useNewStore, newStore, logMigrationAction])

  const clearError = useCallback(() => {
    logMigrationAction('clearError', useNewStore)

    if (useNewStore) {
      newStore.clearError()
    } else {
      legacyStore.clearGmailError?.()
    }
  }, [useNewStore, newStore, legacyStore, logMigrationAction])

  const healthCheck = useCallback(async () => {
    logMigrationAction('healthCheck', useNewStore)

    if (useNewStore) {
      return await newStore.healthCheck()
    } else {
      // Legacy store no tiene health check, simular
      return legacyStore.accounts?.length > 0 || false
    }
  }, [useNewStore, newStore, legacyStore, logMigrationAction])

  const reset = useCallback(() => {
    logMigrationAction('reset', useNewStore)

    if (useNewStore) {
      newStore.reset()
    } else {
      legacyStore.resetGmailState?.()
    }
  }, [useNewStore, newStore, legacyStore, logMigrationAction])

  // =============================================================================
  // INFO DE MIGRACIÓN
  // =============================================================================

  const migrationInfo = {
    usingNewStore: useNewStore,
    isInitialized: useNewStore ? newStore.service !== null : true,
    serviceReady: useNewStore ? newStore.service !== null && !newStore.loading : true,
  }

  return {
    // Estado
    accounts,
    isLoading,
    isConnecting,
    isSyncing,
    isImporting,
    error,
    lastSync,
    connectionStatus,

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

    // Gestión de cache
    clearContactEmails,
    clearCache,

    // Gestión de errores
    clearError,

    // Utilidades
    healthCheck,
    reset,

    // Info de migración
    migrationInfo,
  }
}
