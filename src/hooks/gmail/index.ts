// Main Gmail hooks
export { useGmail } from './useGmail'
export { useGmailAccounts } from './useGmailAccounts'
export { useGmailScopeDetection } from './useGmailScopeDetection'

// Re-export selectors from store for convenience
export * from '@/stores/gmail/selectors'

// Re-export types
export type {
  GmailAccount,
  SyncResult,
  ImportResult,
  ConnectionResult,
  TokenStatus,
  HealthStatus,
  GmailServiceConfig,
} from '@/services/gmail'

export type { GmailEmail } from '@/services/google/gmailApi'
