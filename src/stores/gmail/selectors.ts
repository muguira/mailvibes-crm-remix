import { useGmailStore } from './gmailStore'
import type { GmailAccount, SyncResult, ImportResult } from '@/services/gmail'
import type { GmailEmail } from '@/services/google/gmailApi'
import { useMemo, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'

// =============================================================================
// BASIC SELECTORS (commonly used state) - Use primitives to avoid loops
// =============================================================================

/**
 * Get all Gmail accounts
 */
export const useGmailAccounts = () => useGmailStore(state => state.accounts)

/**
 * Get individual loading states
 */
export const useGmailMainLoading = () => useGmailStore(state => state.loading)
export const useGmailConnecting = () => useGmailStore(state => state.connecting)
export const useGmailSyncing = () => useGmailStore(state => state.syncing)
export const useGmailImporting = () => useGmailStore(state => state.importing)

/**
 * Get loading states (backward compatibility)
 * Use individual selectors above for better performance
 */
export const useGmailLoading = () => {
  return useGmailStore(
    useShallow(state => ({
      loading: state.loading,
      connecting: state.connecting,
      syncing: state.syncing,
      importing: state.importing,
    })),
  )
}

/**
 * Get error state
 */
export const useGmailError = () => useGmailStore(state => state.error)

/**
 * Get connection status
 */
export const useGmailConnectionStatus = () => useGmailStore(state => state.connectionStatus)

/**
 * Get last sync time
 */
export const useGmailLastSync = () => useGmailStore(state => state.lastSync)

// =============================================================================
// COMPUTED SELECTORS (derived state)
// =============================================================================

/**
 * Check if any Gmail account is connected
 */
export const useHasGmailAccounts = () => useGmailStore(state => state.accounts.length > 0)

/**
 * Get connected accounts only
 */
export const useConnectedGmailAccounts = () =>
  useGmailStore(state => state.accounts.filter(account => account.is_connected))

/**
 * Get the primary Gmail account (first connected account)
 */
export const usePrimaryGmailAccount = () => useGmailStore(state => state.accounts.find(account => account.is_connected))

/**
 * Check if service is ready to use
 */
export const useGmailServiceReady = () => useGmailStore(state => state.service !== null && !state.loading)

/**
 * Check if currently performing any operation
 */
export const useGmailIsBusy = () =>
  useGmailStore(state => state.loading || state.connecting || state.syncing || state.importing)

// =============================================================================
// CONTACT EMAIL SELECTORS
// =============================================================================

/**
 * Get emails for a specific contact
 */
export const useContactEmails = (contactEmail: string) =>
  useGmailStore(state => state.contactEmails[contactEmail] || [])

/**
 * Get sync result for a specific contact
 */
export const useContactSyncResult = (contactEmail: string) => useGmailStore(state => state.syncResults[contactEmail])

/**
 * Get latest import result
 */
export const useLatestImportResult = () => useGmailStore(state => state.importResults['latest'])

/**
 * Check if contact has cached emails
 */
export const useHasContactEmails = (contactEmail: string) =>
  useGmailStore(state => Boolean(state.contactEmails[contactEmail]?.length))

/**
 * Get contact email count
 */
export const useContactEmailCount = (contactEmail: string) =>
  useGmailStore(state => state.contactEmails[contactEmail]?.length || 0)

// =============================================================================
// ACTION SELECTORS (for accessing actions)
// =============================================================================

/**
 * Get service management actions
 */
export const useGmailServiceActions = () => {
  return useGmailStore(
    useShallow(state => ({
      initializeService: state.initializeService,
      disposeService: state.disposeService,
      healthCheck: state.healthCheck,
      reset: state.reset,
    })),
  )
}

/**
 * Get account management actions (granular selectors to avoid infinite loops)
 */
export const useGmailLoadAccounts = () => useGmailStore(state => state.loadAccounts)
export const useGmailConnectAccount = () => useGmailStore(state => state.connectAccount)
export const useGmailHandleOAuthCallback = () => useGmailStore(state => state.handleOAuthCallback)
export const useGmailDisconnectAccount = () => useGmailStore(state => state.disconnectAccount)
export const useGmailRefreshAccounts = () => useGmailStore(state => state.refreshAccounts)
export const useGmailRefreshConnection = () => useGmailStore(state => state.refreshConnection)
export const useGmailHealthCheck = () => useGmailStore(state => state.healthCheck)
export const useGmailInitializeService = () => useGmailStore(state => state.initializeService)

/**
 * Get account management actions (DEPRECATED - use individual selectors above)
 * @deprecated Use individual action selectors to avoid infinite loops
 */
export const useGmailAccountActions = () => {
  return useGmailStore(
    useShallow(state => ({
      loadAccounts: state.loadAccounts,
      connectAccount: state.connectAccount,
      handleOAuthCallback: state.handleOAuthCallback,
      disconnectAccount: state.disconnectAccount,
      refreshAccounts: state.refreshAccounts,
      refreshConnection: state.refreshConnection,
    })),
  )
}

/**
 * Get email operation actions
 */
export const useGmailEmailActions = () => {
  return useGmailStore(
    useShallow(state => ({
      syncContactEmails: state.syncContactEmails,
      getContactEmails: state.getContactEmails,
      searchEmails: state.searchEmails,
      markEmailAsRead: state.markEmailAsRead,
      deleteEmail: state.deleteEmail,
    })),
  )
}

/**
 * Get contact operation actions
 */
export const useGmailContactActions = () => {
  return useGmailStore(
    useShallow(state => ({
      importContacts: state.importContacts,
    })),
  )
}

/**
 * Get cache management actions
 */
export const useGmailCacheActions = () => {
  return useGmailStore(
    useShallow(state => ({
      clearContactEmails: state.clearContactEmails,
      clearSyncResults: state.clearSyncResults,
      clearAllCache: state.clearAllCache,
    })),
  )
}

/**
 * Get error handling actions
 */
export const useGmailErrorActions = () => {
  return useGmailStore(
    useShallow(state => ({
      clearError: state.clearError,
      setError: state.setError,
    })),
  )
}

// =============================================================================
// COMPOSITE SELECTORS (for complex UI needs)
// =============================================================================

/**
 * Get everything needed for account management UI
 */
export const useGmailAccountsView = () => {
  return useGmailStore(
    useShallow(state => ({
      accounts: state.accounts,
      loading: state.loading,
      connecting: state.connecting,
      error: state.error,
      connectionStatus: state.connectionStatus,
      // Actions
      loadAccounts: state.loadAccounts,
      connectAccount: state.connectAccount,
      disconnectAccount: state.disconnectAccount,
      refreshAccounts: state.refreshAccounts,
      clearError: state.clearError,
    })),
  )
}

/**
 * Get everything needed for email sync UI
 */
export const useGmailEmailsView = () => {
  return useGmailStore(
    useShallow(state => ({
      syncing: state.syncing,
      loading: state.loading,
      error: state.error,
      lastSync: state.lastSync,
      contactEmails: state.contactEmails,
      syncResults: state.syncResults,
      // Actions
      syncContactEmails: state.syncContactEmails,
      getContactEmails: state.getContactEmails,
      searchEmails: state.searchEmails,
      clearContactEmails: state.clearContactEmails,
      clearError: state.clearError,
    })),
  )
}

/**
 * Get everything needed for contact import UI
 */
export const useGmailImportView = () => {
  return useGmailStore(
    useShallow(state => ({
      importing: state.importing,
      loading: state.loading,
      error: state.error,
      importResults: state.importResults,
      accounts: state.accounts,
      // Actions
      importContacts: state.importContacts,
      clearError: state.clearError,
    })),
  )
}

// =============================================================================
// CONDITIONAL SELECTORS (with filters)
// =============================================================================

/**
 * Get emails for contact with filters
 */
export const useFilteredContactEmails = (
  contactEmail: string,
  filter?: {
    isRead?: boolean
    isImportant?: boolean
    hasAttachments?: boolean
    searchQuery?: string
  },
) =>
  useGmailStore(state => {
    const emails = state.contactEmails[contactEmail] || []

    if (!filter) return emails

    return emails.filter(email => {
      if (filter.isRead !== undefined && email.isRead !== filter.isRead) {
        return false
      }

      if (filter.isImportant !== undefined && email.isImportant !== filter.isImportant) {
        return false
      }

      if (filter.hasAttachments !== undefined) {
        const hasAttachments = Boolean(email.attachments?.length)
        if (hasAttachments !== filter.hasAttachments) {
          return false
        }
      }

      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase()
        const searchableText =
          `${email.subject} ${email.snippet} ${email.from.email} ${email.from.name || ''}`.toLowerCase()
        if (!searchableText.includes(query)) {
          return false
        }
      }

      return true
    })
  })

/**
 * Get recent emails across all contacts
 */
export const useRecentEmails = (limit: number = 20) =>
  useGmailStore(state => {
    const allEmails: (GmailEmail & { contactEmail: string })[] = []

    Object.entries(state.contactEmails).forEach(([contactEmail, emails]) => {
      emails.forEach(email => {
        allEmails.push({ ...email, contactEmail })
      })
    })

    // Sort by date (newest first) and limit
    return allEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit)
  })

// =============================================================================
// SUBSCRIPTION HELPERS (for advanced use cases)
// =============================================================================

/**
 * Subscribe to account changes
 */
export const subscribeToAccountChanges = (callback: (accounts: GmailAccount[]) => void) => {
  return useGmailStore.subscribe(state => state.accounts, callback, {
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  })
}

/**
 * Subscribe to connection status changes
 */
export const subscribeToConnectionStatus = (callback: (status: string) => void) => {
  return useGmailStore.subscribe(state => state.connectionStatus, callback)
}

/**
 * Subscribe to sync completion
 */
export const subscribeToSyncCompletion = (callback: (results: Record<string, SyncResult>) => void) => {
  return useGmailStore.subscribe(state => state.syncResults, callback, {
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  })
}
