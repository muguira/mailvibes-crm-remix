// Main service layer exports for Gmail integration
export { GmailService } from './GmailService'
export { AuthService } from './AuthService'
export { EmailService } from './EmailService'
export { ContactsService } from './ContactsService'

// Export all types for consumers
export type * from './types'

// Export commonly used types directly
export type {
  GmailServiceConfig,
  ConnectionResult,
  SyncResult,
  ImportResult,
  TokenStatus,
  HealthStatus,
  SyncOptions,
  GetEmailsOptions,
  SearchOptions,
  ImportOptions,
  GmailAccount,
  GmailError,
} from './types'

// Export error codes enum
export { GmailErrorCode } from './types'

// Convenience factory function
export async function createGmailService(
  config: import('./types').GmailServiceConfig,
): Promise<import('./GmailService').GmailService> {
  // Use dynamic import instead of require for browser compatibility
  const { GmailService } = await import('./GmailService')
  return new GmailService(config)
}

// Default configuration factory
export function createDefaultConfig(userId: string): import('./types').GmailServiceConfig {
  return {
    userId,
    maxRetries: 3,
    cacheTTL: 15 * 60 * 1000, // 15 minutes
    enableLogging: false,
    apiTimeout: 30000, // 30 seconds
  }
}
