export interface GmailAccount {
  id: string
  email: string
  sync_enabled: boolean
  last_sync_at?: string
  last_sync_status?: string
  last_sync_error?: string
  created_at: string
  user_info?: {
    name?: string
    picture?: string
  }
}

export interface IGmailAuthState {
  // State
  connectedAccounts: GmailAccount[]
  isConnecting: boolean
  isLoading: boolean
  authError: string | null
  lastSync: Date | null
  isInitialized: boolean
}

export interface IGmailAuthActions {
  // Actions
  // Note: initializeGmailAuth has been moved to the new Gmail service store
  // Use useGmailStore().initializeService(userId) instead
  connectAccount: (userId: string) => Promise<void>
  disconnectAccount: (userId: string, email: string) => Promise<void>
  refreshConnection: (userId: string) => Promise<void>
  setAuthError: (error: string | null) => void
  loadAccounts: (userId: string) => Promise<void>
  handleOAuthCallback: (userId: string) => Promise<void>
  getAccessToken: (userId: string, email: string) => Promise<string | null>
  clearState: () => void
  reset: () => void
}

export interface IGmailAuthErrorState {
  connect: string | null
  disconnect: string | null
  load: string | null
  callback: string | null
}

export interface IGmailAuthLoadingState {
  connecting: boolean
  disconnecting: boolean
  loading: boolean
  initializing: boolean
}

export type TGmailAuthStore = IGmailAuthState & IGmailAuthActions
