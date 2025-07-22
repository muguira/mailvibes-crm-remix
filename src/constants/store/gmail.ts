import { IGmailAuthState } from '@/types/store/gmail'

export const INITIAL_GMAIL_AUTH_STATE: IGmailAuthState = {
  connectedAccounts: [],
  isConnecting: false,
  isLoading: false,
  authError: null,
  lastSync: null,
  isInitialized: false,
}

export const RESET_GMAIL_AUTH_STATE: IGmailAuthState = {
  connectedAccounts: [],
  isConnecting: false,
  isLoading: false,
  authError: null,
  lastSync: null,
  isInitialized: false,
}
