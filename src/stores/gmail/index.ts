// Gmail store exports
export { useGmailStore } from './gmailStore'

// All selectors
export * from './selectors'

// Re-export commonly used types
export type {
  GmailAccount,
  SyncResult,
  ImportResult,
  GmailServiceConfig,
  ConnectionResult,
  TokenStatus,
  HealthStatus,
} from '@/services/gmail'

export type { GmailEmail } from '@/services/google/gmailApi'
