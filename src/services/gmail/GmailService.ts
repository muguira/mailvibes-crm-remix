import { logger } from '@/utils/logger'
import { AuthService } from './AuthService'
import { EmailService } from './EmailService'
import { ContactsService } from './ContactsService'
import type { GmailEmail } from '@/services/google/gmailApi'
import type { GoogleContact } from '@/services/google/peopleApi'
import type {
  GmailServiceConfig,
  ConnectionResult,
  SyncResult,
  ImportResult,
  TokenStatus,
  HealthStatus,
  ServiceHealth,
  SyncOptions,
  GetEmailsOptions,
  SearchOptions,
  ImportOptions,
  GmailAccount,
  GmailError,
  ServiceState,
} from './types'
import { GmailErrorCode } from './types'

/**
 * GmailService - Main coordinator for all Gmail operations
 * This is the primary interface that applications should use
 */
export class GmailService {
  private authService: AuthService
  private emailService: EmailService
  private contactsService: ContactsService
  private config: GmailServiceConfig
  private state: ServiceState

  constructor(config: GmailServiceConfig) {
    this.config = {
      maxRetries: 3,
      cacheTTL: 15 * 60 * 1000, // 15 minutes
      enableLogging: false,
      apiTimeout: 30000, // 30 seconds
      ...config,
    }

    this.state = {
      isInitialized: false,
      isDisposed: false,
      lastActivity: new Date(),
      errorCount: 0,
    }

    // Initialize services
    this.authService = new AuthService(config.userId, this.config)
    this.emailService = new EmailService(config.userId, this.authService, this.config)
    this.contactsService = new ContactsService(config.userId, this.authService, this.config)

    this.state.isInitialized = true

    if (this.config.enableLogging) {
      logger.info(`[GmailService] Initialized for user: ${config.userId}`)
    }
  }

  // =============================================================================
  // AUTH METHODS
  // =============================================================================

  /**
   * Connect a Gmail account using OAuth2 flow
   */
  async connectAccount(scopes?: string[]): Promise<ConnectionResult> {
    this.ensureNotDisposed()
    this.updateActivity()

    try {
      const authUrl = await this.authService.initiateOAuth(scopes)

      return {
        success: true,
        redirectUrl: authUrl,
      }
    } catch (error) {
      this.handleError('Failed to connect account', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Handle OAuth callback (call this after user returns from Google)
   */
  async handleOAuthCallback(code: string, state: string): Promise<ConnectionResult> {
    this.ensureNotDisposed()
    this.updateActivity()

    if (this.config.enableLogging) {
      logger.info('[GmailService] 🔄 Starting OAuth callback handling', {
        userId: this.config.userId,
        hasCode: !!code,
        hasState: !!state,
      })
    }

    try {
      if (this.config.enableLogging) {
        logger.info('[GmailService] 🔄 Calling authService.handleCallback')
      }

      const tokenData = await this.authService.handleCallback(code, state)

      if (this.config.enableLogging) {
        logger.info('[GmailService] ✅ authService.handleCallback successful', {
          hasEmail: !!tokenData.email,
          email: tokenData.email,
          hasTokens: !!tokenData.access_token,
        })
      }

      return {
        success: true,
        account: {
          id: '', // Will be filled by database
          user_id: this.config.userId,
          email: tokenData.email || 'unknown@gmail.com',
          provider: 'gmail' as const,
          sync_enabled: true,
          created_at: new Date(),
          updated_at: new Date(),
          is_connected: true,
        },
      }
    } catch (error) {
      if (this.config.enableLogging) {
        logger.error('[GmailService] ❌ OAuth callback failed:', error)
      }
      this.handleError('Failed to handle OAuth callback', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Disconnect a Gmail account
   */
  async disconnectAccount(email: string): Promise<void> {
    this.ensureNotDisposed()
    this.updateActivity()

    await this.authService.disconnectAccount(email)
  }

  /**
   * Get all connected Gmail accounts
   */
  async getConnectedAccounts(): Promise<GmailAccount[]> {
    this.ensureNotDisposed()
    this.updateActivity()

    return await this.authService.getConnectedAccounts()
  }

  /**
   * Get token status for a specific email
   */
  async getTokenStatus(email: string): Promise<TokenStatus> {
    this.ensureNotDisposed()
    this.updateActivity()

    return await this.authService.getTokenStatus(email)
  }

  /**
   * Refresh connection for a specific email
   */
  async refreshConnection(email: string): Promise<boolean> {
    this.ensureNotDisposed()
    this.updateActivity()

    try {
      const token = await this.authService.refreshToken(email)
      return token !== null
    } catch (error) {
      this.handleError('Failed to refresh connection', error)
      return false
    }
  }

  // =============================================================================
  // EMAIL METHODS
  // =============================================================================

  /**
   * Sync emails for a specific contact
   */
  async syncEmails(contactEmail: string, options?: SyncOptions): Promise<SyncResult> {
    this.ensureNotDisposed()
    this.updateActivity()

    return await this.emailService.syncContactEmails(contactEmail, options)
  }

  /**
   * Get emails for a specific contact (hybrid database + API approach)
   */
  async getContactEmails(contactEmail: string, options?: GetEmailsOptions): Promise<GmailEmail[]> {
    this.ensureNotDisposed()
    this.updateActivity()

    return await this.emailService.getContactEmails(contactEmail, options)
  }

  /**
   * Search emails across all contacts
   */
  async searchEmails(query: string, options?: SearchOptions): Promise<GmailEmail[]> {
    this.ensureNotDisposed()
    this.updateActivity()

    return await this.emailService.searchEmails(query, options)
  }

  /**
   * Mark an email as read
   */
  async markEmailAsRead(gmailId: string): Promise<void> {
    this.ensureNotDisposed()
    this.updateActivity()

    await this.emailService.markAsRead(gmailId)
  }

  /**
   * Delete an email
   */
  async deleteEmail(gmailId: string): Promise<void> {
    this.ensureNotDisposed()
    this.updateActivity()

    await this.emailService.deleteEmail(gmailId)
  }

  /**
   * Send email via Gmail API
   */
  async sendEmail(emailData: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    bodyHtml: string
    contactId?: string
  }): Promise<{ messageId: string; threadId?: string }> {
    this.ensureNotDisposed()
    this.updateActivity()

    return await this.emailService.sendEmail(emailData)
  }

  /**
   * Create draft email via Gmail API
   */
  async createDraft(emailData: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    bodyHtml: string
    contactId?: string
  }): Promise<{ draftId: string }> {
    this.ensureNotDisposed()
    this.updateActivity()

    return await this.emailService.createDraft(emailData)
  }

  /**
   * Reply to an email with proper threading
   */
  async replyToEmail(
    originalEmail: {
      gmailId: string
      subject: string
      from: string
      references?: string
    },
    replyData: {
      to: string[]
      cc?: string[]
      subject?: string
      bodyHtml: string
      contactId?: string
    },
  ): Promise<{ messageId: string; threadId?: string }> {
    this.ensureNotDisposed()
    this.updateActivity()

    return await this.emailService.replyToEmail(originalEmail, replyData)
  }

  // =============================================================================
  // CONTACT METHODS
  // =============================================================================

  /**
   * Import contacts from Google People API
   */
  async importContacts(options?: ImportOptions): Promise<ImportResult> {
    this.ensureNotDisposed()
    this.updateActivity()

    return await this.contactsService.importContacts(options)
  }

  /**
   * Get Google contacts (raw data)
   */
  async getGoogleContacts(): Promise<GoogleContact[]> {
    this.ensureNotDisposed()
    this.updateActivity()

    const result = await this.contactsService.getGoogleContacts()
    return result.contacts
  }

  /**
   * Sync a single contact from Google to local database
   */
  async syncContact(googleContact: GoogleContact): Promise<any> {
    this.ensureNotDisposed()
    this.updateActivity()

    return await this.contactsService.syncContact(googleContact)
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Perform a health check on all services
   */
  async healthCheck(): Promise<HealthStatus> {
    this.ensureNotDisposed()
    this.updateActivity()

    const checkStart = Date.now()

    try {
      // Check auth service
      const authStart = Date.now()
      const accounts = await this.authService.getConnectedAccounts()
      const authTime = Date.now() - authStart

      const authHealth: ServiceHealth = {
        status: accounts.length > 0 ? 'healthy' : 'degraded',
        message: accounts.length > 0 ? 'Connected accounts found' : 'No connected accounts',
        responseTime: authTime,
      }

      // Check email service (simple operation)
      const emailStart = Date.now()
      // Just check if service is responsive (clear cache is fast)
      this.emailService.clearCache()
      const emailTime = Date.now() - emailStart

      const emailHealth: ServiceHealth = {
        status: emailTime < 1000 ? 'healthy' : 'degraded',
        message: emailTime < 1000 ? 'Service responsive' : 'Service slow',
        responseTime: emailTime,
      }

      // Check contacts service (simple operation)
      const contactsStart = Date.now()
      // Test if service is responsive (no actual API call)
      const contactsTime = Date.now() - contactsStart

      const contactsHealth: ServiceHealth = {
        status: 'healthy',
        message: 'Service responsive',
        responseTime: contactsTime,
      }

      const totalTime = Date.now() - checkStart
      const isHealthy =
        authHealth.status === 'healthy' && emailHealth.status === 'healthy' && contactsHealth.status === 'healthy'

      return {
        isHealthy,
        services: {
          auth: authHealth,
          email: emailHealth,
          contacts: contactsHealth,
        },
        lastCheck: new Date(),
      }
    } catch (error) {
      this.handleError('Health check failed', error)

      return {
        isHealthy: false,
        services: {
          auth: { status: 'unhealthy', message: 'Health check failed' },
          email: { status: 'unhealthy', message: 'Health check failed' },
          contacts: { status: 'unhealthy', message: 'Health check failed' },
        },
        lastCheck: new Date(),
      }
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    this.ensureNotDisposed()
    this.updateActivity()

    this.emailService.clearCache()

    if (this.config.enableLogging) {
      logger.info(`[GmailService] All caches cleared for user: ${this.config.userId}`)
    }
  }

  /**
   * Get service configuration
   */
  getConfig(): GmailServiceConfig {
    return { ...this.config }
  }

  /**
   * Get service state information
   */
  getState(): ServiceState {
    return { ...this.state }
  }

  /**
   * Dispose the service and cleanup all resources
   */
  dispose(): void {
    if (this.state.isDisposed) {
      return
    }

    this.state.isDisposed = true

    // Dispose all sub-services
    this.authService.dispose()
    this.emailService.dispose()
    this.contactsService.dispose()

    if (this.config.enableLogging) {
      logger.info(`[GmailService] Disposed for user: ${this.config.userId}`)
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private ensureNotDisposed(): void {
    if (this.state.isDisposed) {
      throw this.createError(GmailErrorCode.SERVICE_UNAVAILABLE, 'GmailService has been disposed')
    }

    if (!this.state.isInitialized) {
      throw this.createError(GmailErrorCode.SERVICE_CONFIGURATION_ERROR, 'GmailService is not properly initialized')
    }
  }

  private updateActivity(): void {
    this.state.lastActivity = new Date()
  }

  private handleError(message: string, error: unknown): void {
    this.state.errorCount++

    if (this.config.enableLogging) {
      logger.error(`[GmailService] ${message}`, error)
    }
  }

  private createError(code: GmailErrorCode, message: string, originalError?: unknown): GmailError {
    const error = new Error(message) as GmailError
    error.code = code
    error.context = 'GmailService'
    error.retryable = this.isRetryableError(code)
    error.originalError = originalError
    return error
  }

  private isRetryableError(code: GmailErrorCode): boolean {
    const retryableCodes = [
      GmailErrorCode.API_NETWORK_ERROR,
      GmailErrorCode.API_TIMEOUT,
      GmailErrorCode.DB_CONNECTION_ERROR,
      GmailErrorCode.SERVICE_UNAVAILABLE,
    ]
    return retryableCodes.includes(code)
  }
}
