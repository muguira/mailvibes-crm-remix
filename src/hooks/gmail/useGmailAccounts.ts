import { useCallback } from 'react'
import {
  useGmailAccounts as useAccountsSelector,
  useGmailAccountActions,
  useGmailConnectionStatus,
  useGmailError,
  useGmailLoading,
  useConnectedGmailAccounts,
  usePrimaryGmailAccount,
  useHasGmailAccounts,
} from '@/stores/gmail'
import { logger } from '@/utils/logger'
import type { GmailAccount, ConnectionResult } from '@/services/gmail'

/**
 * Hook especializado para gestión de cuentas de Gmail
 *
 * Proporciona una interfaz simplificada para todas las operaciones
 * relacionadas con cuentas de Gmail.
 */
interface UseGmailAccountsOptions {
  enableLogging?: boolean
}

interface UseGmailAccountsReturn {
  // Estado de cuentas
  accounts: GmailAccount[]
  connectedAccounts: GmailAccount[]
  primaryAccount: GmailAccount | undefined
  hasAccounts: boolean

  // Estado de UI
  loading: {
    accounts: boolean
    connecting: boolean
  }
  error: string | null
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'

  // Acciones principales
  loadAccounts: () => Promise<void>
  connectAccount: (scopes?: string[]) => Promise<ConnectionResult>
  handleOAuthCallback: (code: string, state: string) => Promise<ConnectionResult>
  disconnectAccount: (email: string) => Promise<void>
  refreshAccounts: () => Promise<void>
  refreshConnection: (email: string) => Promise<boolean>

  // Utilidades
  clearError: () => void
  getAccountByEmail: (email: string) => GmailAccount | undefined
  isAccountConnected: (email: string) => boolean
  getAccountStatus: (email: string) => 'connected' | 'disconnected' | 'expired' | 'not_found'
}

export function useGmailAccounts(options: UseGmailAccountsOptions = {}): UseGmailAccountsReturn {
  const { enableLogging = process.env.NODE_ENV === 'development' } = options

  // Estado
  const accounts = useAccountsSelector()
  const connectedAccounts = useConnectedGmailAccounts()
  const primaryAccount = usePrimaryGmailAccount()
  const hasAccounts = useHasGmailAccounts()
  const { loading, connecting } = useGmailLoading()
  const error = useGmailError()
  const connectionStatus = useGmailConnectionStatus()

  // Acciones
  const {
    loadAccounts: loadAccountsAction,
    connectAccount: connectAccountAction,
    handleOAuthCallback: handleOAuthCallbackAction,
    disconnectAccount: disconnectAccountAction,
    refreshAccounts: refreshAccountsAction,
    refreshConnection: refreshConnectionAction,
  } = useGmailAccountActions()

  // =============================================================================
  // ACCIONES CON LOGGING
  // =============================================================================

  const loadAccounts = useCallback(async () => {
    if (enableLogging) {
      logger.info('[useGmailAccounts] Loading accounts')
    }
    try {
      await loadAccountsAction()
      if (enableLogging) {
        logger.info('[useGmailAccounts] Accounts loaded successfully')
      }
    } catch (error) {
      if (enableLogging) {
        logger.error('[useGmailAccounts] Failed to load accounts', error)
      }
      throw error
    }
  }, [loadAccountsAction, enableLogging])

  const connectAccount = useCallback(
    async (scopes?: string[]) => {
      if (enableLogging) {
        logger.info('[useGmailAccounts] Connecting account', { scopes })
      }
      try {
        const result = await connectAccountAction(scopes)
        if (enableLogging) {
          logger.info('[useGmailAccounts] Account connection result', { success: result.success })
        }
        return result
      } catch (error) {
        if (enableLogging) {
          logger.error('[useGmailAccounts] Failed to connect account', error)
        }
        throw error
      }
    },
    [connectAccountAction, enableLogging],
  )

  const handleOAuthCallback = useCallback(
    async (code: string, state: string) => {
      if (enableLogging) {
        logger.info('[useGmailAccounts] Handling OAuth callback')
      }
      try {
        const result = await handleOAuthCallbackAction(code, state)
        if (enableLogging) {
          logger.info('[useGmailAccounts] OAuth callback result', { success: result.success })
        }
        return result
      } catch (error) {
        if (enableLogging) {
          logger.error('[useGmailAccounts] Failed to handle OAuth callback', error)
        }
        throw error
      }
    },
    [handleOAuthCallbackAction, enableLogging],
  )

  const disconnectAccount = useCallback(
    async (email: string) => {
      if (enableLogging) {
        logger.info('[useGmailAccounts] Disconnecting account', { email })
      }
      try {
        await disconnectAccountAction(email)
        if (enableLogging) {
          logger.info('[useGmailAccounts] Account disconnected successfully', { email })
        }
      } catch (error) {
        if (enableLogging) {
          logger.error('[useGmailAccounts] Failed to disconnect account', error)
        }
        throw error
      }
    },
    [disconnectAccountAction, enableLogging],
  )

  const refreshAccounts = useCallback(async () => {
    if (enableLogging) {
      logger.info('[useGmailAccounts] Refreshing accounts')
    }
    try {
      await refreshAccountsAction()
      if (enableLogging) {
        logger.info('[useGmailAccounts] Accounts refreshed successfully')
      }
    } catch (error) {
      if (enableLogging) {
        logger.error('[useGmailAccounts] Failed to refresh accounts', error)
      }
      throw error
    }
  }, [refreshAccountsAction, enableLogging])

  const refreshConnection = useCallback(
    async (email: string) => {
      if (enableLogging) {
        logger.info('[useGmailAccounts] Refreshing connection', { email })
      }
      try {
        const success = await refreshConnectionAction(email)
        if (enableLogging) {
          logger.info('[useGmailAccounts] Connection refresh result', { email, success })
        }
        return success
      } catch (error) {
        if (enableLogging) {
          logger.error('[useGmailAccounts] Failed to refresh connection', error)
        }
        throw error
      }
    },
    [refreshConnectionAction, enableLogging],
  )

  // =============================================================================
  // UTILIDADES
  // =============================================================================

  const clearError = useCallback(() => {
    if (enableLogging) {
      logger.info('[useGmailAccounts] Clearing error')
    }
    // Esta función debería estar disponible en los account actions
    // Por ahora no está implementada en el selector, pero la agregaremos
  }, [enableLogging])

  const getAccountByEmail = useCallback(
    (email: string) => {
      return accounts.find(account => account.email === email)
    },
    [accounts],
  )

  const isAccountConnected = useCallback(
    (email: string) => {
      const account = getAccountByEmail(email)
      return account?.is_connected || false
    },
    [getAccountByEmail],
  )

  const getAccountStatus = useCallback(
    (email: string): 'connected' | 'disconnected' | 'expired' | 'not_found' => {
      const account = getAccountByEmail(email)

      if (!account) {
        return 'not_found'
      }

      if (!account.is_connected) {
        return 'disconnected'
      }

      // Verificar si el token ha expirado
      if (account.token_expires_at) {
        const now = new Date()
        const expiresAt = new Date(account.token_expires_at)
        if (expiresAt.getTime() <= now.getTime()) {
          return 'expired'
        }
      }

      return 'connected'
    },
    [getAccountByEmail],
  )

  return {
    // Estado de cuentas
    accounts,
    connectedAccounts,
    primaryAccount,
    hasAccounts,

    // Estado de UI
    loading: {
      accounts: loading,
      connecting,
    },
    error,
    connectionStatus,

    // Acciones principales
    loadAccounts,
    connectAccount,
    handleOAuthCallback,
    disconnectAccount,
    refreshAccounts,
    refreshConnection,

    // Utilidades
    clearError,
    getAccountByEmail,
    isAccountConnected,
    getAccountStatus,
  }
}
