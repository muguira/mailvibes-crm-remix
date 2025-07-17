import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/utils/logger'
import { getRecentContactEmails, searchContactEmails, GmailEmail, GmailApiResponse } from '@/services/google/gmailApi'
import { triggerContactSync } from '@/workers/emailSyncWorker'
import type { AuthService } from './AuthService'
import type {
  GmailServiceConfig,
  SyncResult,
  SyncOptions,
  GetEmailsOptions,
  SearchOptions,
  GmailError,
  GmailErrorCode,
  ServiceState,
  EmailCache,
  CacheEntry,
} from './types'
import { GmailErrorCode } from './types'

interface DatabaseEmail {
  id: string
  gmail_id: string
  subject: string
  snippet: string
  body_text?: string | null
  body_html?: string | null
  from_email: string
  from_name?: string | null
  to_emails: any
  cc_emails?: any
  bcc_emails?: any
  date: string
  is_read: boolean
  is_important: boolean
  labels: any
  has_attachments: boolean
  attachment_count: number
  created_at: string
  updated_at: string
}

/**
 * EmailService handles all Gmail email operations
 * Integrates with AuthService for token management
 */
export class EmailService {
  private userId: string
  private authService: AuthService
  private config: GmailServiceConfig
  private state: ServiceState
  private cache: EmailCache = {}

  constructor(userId: string, authService: AuthService, config: GmailServiceConfig) {
    this.userId = userId
    this.authService = authService
    this.config = config
    this.state = {
      isInitialized: true,
      isDisposed: false,
      lastActivity: new Date(),
      errorCount: 0,
    }

    if (config.enableLogging) {
      logger.info(`[EmailService] Initialized for user: ${userId}`)
    }
  }

  /**
   * Sync emails for a specific contact
   */
  async syncContactEmails(contactEmail: string, options: SyncOptions = {}): Promise<SyncResult> {
    this.ensureNotDisposed()
    this.updateActivity()

    const { maxEmails = 50, forceFullSync = false, onProgress } = options

    try {
      onProgress?.({
        current: 0,
        total: maxEmails,
        contactEmail,
        phase: 'fetching',
      })

      if (this.config.enableLogging) {
        logger.info(`[EmailService] Starting sync for contact: ${contactEmail}`)
      }

      // Get valid access token
      const accounts = await this.authService.getConnectedAccounts()
      if (accounts.length === 0) {
        throw this.createError(GmailErrorCode.AUTH_NO_ACCOUNT, 'No connected Gmail accounts found')
      }

      const token = await this.authService.getValidToken(accounts[0].email)
      if (!token) {
        throw this.createError(GmailErrorCode.AUTH_INVALID_TOKEN, 'Unable to get valid access token')
      }

      // Get existing emails to avoid duplicates
      onProgress?.({
        current: 1,
        total: maxEmails,
        contactEmail,
        phase: 'processing',
      })

      const existingEmails = await this.getExistingEmailsFromDatabase(contactEmail)
      const existingGmailIds = new Set(existingEmails.map(e => e.gmail_id))

      // Fetch emails from Gmail API
      const response = await getRecentContactEmails(token, contactEmail, maxEmails)

      // Filter out emails we already have (unless force full sync)
      const newEmails = forceFullSync
        ? response.emails
        : response.emails.filter(email => !existingGmailIds.has(email.id))

      onProgress?.({
        current: response.emails.length,
        total: maxEmails,
        contactEmail,
        phase: 'saving',
      })

      // Save new emails to database
      const result = await this.saveEmailsToDatabase(newEmails, contactEmail, accounts[0].id)

      // Update cache
      this.updateCache(contactEmail, response.emails)

      if (this.config.enableLogging) {
        logger.info(
          `[EmailService] Sync completed for ${contactEmail}: ${result.created} created, ${result.updated} updated`,
        )
      }

      return {
        success: true,
        emailsSynced: response.emails.length,
        emailsCreated: result.created,
        emailsUpdated: result.updated,
        contactEmail,
        lastSyncAt: new Date(),
      }
    } catch (error) {
      this.handleError('Failed to sync contact emails', error)

      return {
        success: false,
        emailsSynced: 0,
        emailsCreated: 0,
        emailsUpdated: 0,
        contactEmail,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get emails for a contact (hybrid database + API approach)
   */
  async getContactEmails(contactEmail: string, options: GetEmailsOptions = {}): Promise<GmailEmail[]> {
    this.ensureNotDisposed()
    this.updateActivity()

    const {
      maxResults = 50,
      preferDatabase = true,
      maxAge = this.config.cacheTTL || 15 * 60 * 1000, // 15 minutes default
      includeAttachments = false,
    } = options

    try {
      // Check cache first
      if (!options.skipCache && this.cache[contactEmail]) {
        const cacheEntry = this.cache[contactEmail]
        const now = Date.now()

        if (now - cacheEntry.timestamp.getTime() < cacheEntry.ttl) {
          if (this.config.enableLogging) {
            logger.debug(`[EmailService] Returning cached emails for: ${contactEmail}`)
          }
          return cacheEntry.data.slice(0, maxResults)
        }
      }

      // Get connected accounts
      const accounts = await this.authService.getConnectedAccounts()
      if (accounts.length === 0) {
        return []
      }

      if (preferDatabase) {
        // Try database first
        const dbResult = await this.getEmailsFromDatabase(contactEmail, accounts[0].id, maxResults)

        // Check if database results are fresh enough
        if (dbResult.emails.length > 0 && this.isDatabaseFresh(dbResult.lastSync, maxAge)) {
          this.updateCache(contactEmail, dbResult.emails)
          return dbResult.emails
        }
      }

      // Fall back to API
      const token = await this.authService.getValidToken(accounts[0].email)
      if (!token) {
        // If no token and we have database results, return them even if stale
        if (preferDatabase) {
          const dbResult = await this.getEmailsFromDatabase(contactEmail, accounts[0].id, maxResults)
          if (dbResult.emails.length > 0) {
            return dbResult.emails
          }
        }
        return []
      }

      const response = await getRecentContactEmails(token, contactEmail, maxResults)

      // Update cache and trigger background sync
      this.updateCache(contactEmail, response.emails)
      this.triggerBackgroundSync(contactEmail)

      return response.emails
    } catch (error) {
      this.handleError('Failed to get contact emails', error)

      // Try database as fallback
      if (preferDatabase) {
        try {
          const accounts = await this.authService.getConnectedAccounts()
          if (accounts.length > 0) {
            const dbResult = await this.getEmailsFromDatabase(contactEmail, accounts[0].id, maxResults)
            return dbResult.emails
          }
        } catch (dbError) {
          // Ignore database errors in fallback
        }
      }

      return []
    }
  }

  /**
   * Search emails across all contacts
   */
  async searchEmails(query: string, options: SearchOptions = {}): Promise<GmailEmail[]> {
    this.ensureNotDisposed()
    this.updateActivity()

    const { maxResults = 50 } = options

    try {
      // Get connected accounts
      const accounts = await this.authService.getConnectedAccounts()
      if (accounts.length === 0) {
        return []
      }

      const token = await this.authService.getValidToken(accounts[0].email)
      if (!token) {
        return []
      }

      // Use the existing searchContactEmails but with a general query
      const response = await searchContactEmails(token, query, maxResults)

      return response.emails
    } catch (error) {
      this.handleError('Failed to search emails', error)
      return []
    }
  }

  /**
   * Mark an email as read
   */
  async markAsRead(gmailId: string): Promise<void> {
    this.ensureNotDisposed()
    this.updateActivity()

    try {
      // Update in database
      await supabase
        .from('emails')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', this.userId)
        .eq('gmail_id', gmailId)

      // TODO: Also update in Gmail API if needed

      if (this.config.enableLogging) {
        logger.debug(`[EmailService] Marked email as read: ${gmailId}`)
      }
    } catch (error) {
      this.handleError('Failed to mark email as read', error)
      throw this.createError(GmailErrorCode.DB_QUERY_FAILED, 'Failed to mark email as read', error)
    }
  }

  /**
   * Delete an email
   */
  async deleteEmail(gmailId: string): Promise<void> {
    this.ensureNotDisposed()
    this.updateActivity()

    try {
      // Delete from database
      await supabase.from('emails').delete().eq('user_id', this.userId).eq('gmail_id', gmailId)

      // TODO: Also delete from Gmail API if needed

      if (this.config.enableLogging) {
        logger.debug(`[EmailService] Deleted email: ${gmailId}`)
      }
    } catch (error) {
      this.handleError('Failed to delete email', error)
      throw this.createError(GmailErrorCode.DB_QUERY_FAILED, 'Failed to delete email', error)
    }
  }

  /**
   * Clear cache for a specific contact or all cache
   */
  clearCache(contactEmail?: string): void {
    if (contactEmail) {
      delete this.cache[contactEmail]
    } else {
      this.cache = {}
    }

    if (this.config.enableLogging) {
      logger.debug(`[EmailService] Cache cleared for: ${contactEmail || 'all contacts'}`)
    }
  }

  /**
   * Dispose the service and cleanup resources
   */
  dispose(): void {
    this.state.isDisposed = true
    this.cache = {}

    if (this.config.enableLogging) {
      logger.info(`[EmailService] Disposed for user: ${this.userId}`)
    }
  }

  // Private methods

  private async getExistingEmailsFromDatabase(contactEmail: string): Promise<DatabaseEmail[]> {
    try {
      // Get the email account
      const accounts = await this.authService.getConnectedAccounts()
      if (accounts.length === 0) {
        return []
      }

      // Get all emails and filter locally
      const { data: allEmails, error } = await supabase
        .from('emails')
        .select('gmail_id, id, updated_at, from_email, to_emails')
        .eq('user_id', this.userId)
        .eq('email_account_id', accounts[0].id)

      if (error) {
        logger.error('[EmailService] Error getting existing emails:', error)
        return []
      }

      // Filter emails locally to find those related to the contact
      return (allEmails || []).filter(email => {
        if (email.from_email === contactEmail) {
          return true
        }

        if (email.to_emails) {
          const toEmailsStr = typeof email.to_emails === 'string' ? email.to_emails : JSON.stringify(email.to_emails)
          return toEmailsStr.includes(contactEmail)
        }

        return false
      })
    } catch (error) {
      logger.error('[EmailService] Error in getExistingEmailsFromDatabase:', error)
      return []
    }
  }

  private async getEmailsFromDatabase(
    contactEmail: string,
    emailAccountId: string,
    maxResults: number,
  ): Promise<{
    emails: GmailEmail[]
    lastSync?: Date
  }> {
    try {
      // Get the email account to check sync status
      const { data: emailAccount } = await supabase
        .from('email_accounts')
        .select('id, last_sync_at, last_sync_status')
        .eq('id', emailAccountId)
        .single()

      let lastSync: Date | undefined
      if (emailAccount?.last_sync_at) {
        lastSync = new Date(emailAccount.last_sync_at)
      }

      // Query emails from database
      const { data: allDbEmails, error } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', this.userId)
        .eq('email_account_id', emailAccountId)
        .order('date', { ascending: false })
        .limit(maxResults * 2) // Get more to filter locally

      if (error) {
        logger.error('[EmailService] Error fetching emails from database:', error)
        return { emails: [] }
      }

      // Filter emails locally
      const dbEmails = (allDbEmails || [])
        .filter(email => {
          if (email.from_email === contactEmail) {
            return true
          }

          if (email.to_emails) {
            const toEmailsStr = typeof email.to_emails === 'string' ? email.to_emails : JSON.stringify(email.to_emails)
            return toEmailsStr.includes(contactEmail)
          }

          return false
        })
        .slice(0, maxResults)

      const emails = dbEmails.map(this.convertDatabaseEmail)

      return { emails, lastSync }
    } catch (error) {
      logger.error('[EmailService] Error in getEmailsFromDatabase:', error)
      return { emails: [] }
    }
  }

  private convertDatabaseEmail(dbEmail: DatabaseEmail): GmailEmail {
    return {
      id: dbEmail.gmail_id,
      threadId: '', // Not stored in current schema
      snippet: dbEmail.snippet,
      subject: dbEmail.subject,
      from: {
        name: dbEmail.from_name || undefined,
        email: dbEmail.from_email,
      },
      to: this.parseEmailAddresses(dbEmail.to_emails),
      cc: this.parseEmailAddresses(dbEmail.cc_emails),
      bcc: this.parseEmailAddresses(dbEmail.bcc_emails),
      date: dbEmail.date,
      bodyText: dbEmail.body_text || undefined,
      bodyHtml: dbEmail.body_html || undefined,
      isRead: dbEmail.is_read,
      isImportant: dbEmail.is_important,
      labels: this.parseLabels(dbEmail.labels),
      attachments: [], // TODO: Load attachments if needed
    }
  }

  private parseEmailAddresses(emails: any): Array<{ name?: string; email: string }> {
    if (!emails) return []

    try {
      const parsed = typeof emails === 'string' ? JSON.parse(emails) : emails
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private parseLabels(labels: any): string[] {
    if (!labels) return []

    try {
      const parsed = typeof labels === 'string' ? JSON.parse(labels) : labels
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private async saveEmailsToDatabase(
    emails: GmailEmail[],
    contactEmail: string,
    emailAccountId: string,
  ): Promise<{
    created: number
    updated: number
  }> {
    let created = 0
    let updated = 0

    for (const email of emails) {
      try {
        // Find associated contact ID if we have one
        let contactId = null
        const { data: contact } = await supabase
          .from('contacts')
          .select('id')
          .eq('user_id', this.userId)
          .eq('email', contactEmail)
          .single()

        contactId = contact?.id || null

        // Prepare email data for database
        const emailData = {
          user_id: this.userId,
          email_account_id: emailAccountId,
          contact_id: contactId,
          gmail_id: email.id,
          gmail_thread_id: email.threadId,
          subject: email.subject,
          snippet: email.snippet,
          body_text: email.bodyText,
          body_html: email.bodyHtml,
          from_email: email.from.email,
          from_name: email.from.name,
          to_emails: JSON.stringify(email.to),
          cc_emails: JSON.stringify(email.cc || []),
          bcc_emails: JSON.stringify(email.bcc || []),
          date: new Date(email.date).toISOString(),
          is_read: email.isRead,
          is_important: email.isImportant,
          labels: JSON.stringify(email.labels || []),
          has_attachments: (email.attachments?.length || 0) > 0,
          attachment_count: email.attachments?.length || 0,
          updated_at: new Date().toISOString(),
        }

        // Try to insert, if conflict then update
        const { data, error } = await supabase
          .from('emails')
          .upsert(emailData, {
            onConflict: 'gmail_id',
            ignoreDuplicates: false,
          })
          .select('id')
          .single()

        if (error) {
          logger.error(`[EmailService] Error saving email ${email.id}:`, error)
          continue
        }

        // Check if this was an insert or update
        const { data: existingEmail } = await supabase
          .from('emails')
          .select('created_at, updated_at')
          .eq('id', data.id)
          .single()

        if (existingEmail) {
          const createdAt = new Date(existingEmail.created_at)
          const updatedAt = new Date(existingEmail.updated_at)

          if (Math.abs(createdAt.getTime() - updatedAt.getTime()) < 1000) {
            created++
          } else {
            updated++
          }
        }
      } catch (error) {
        logger.error(`[EmailService] Error processing email ${email.id}:`, error)
      }
    }

    return { created, updated }
  }

  private isDatabaseFresh(lastSync?: Date, maxAge: number = this.config.cacheTTL || 15 * 60 * 1000): boolean {
    if (!lastSync) return false

    const now = new Date()
    const ageInMs = now.getTime() - lastSync.getTime()

    return ageInMs < maxAge
  }

  private updateCache(contactEmail: string, emails: GmailEmail[]): void {
    this.cache[contactEmail] = {
      data: emails,
      timestamp: new Date(),
      ttl: this.config.cacheTTL || 15 * 60 * 1000,
      key: contactEmail,
    }
  }

  private triggerBackgroundSync(contactEmail: string): void {
    try {
      // Use existing worker to trigger sync
      triggerContactSync(this.userId, '', contactEmail)
    } catch (error) {
      // Don't fail if background sync fails
      if (this.config.enableLogging) {
        logger.warn(`[EmailService] Failed to trigger background sync for: ${contactEmail}`, error)
      }
    }
  }

  private ensureNotDisposed(): void {
    if (this.state.isDisposed) {
      throw this.createError(GmailErrorCode.SERVICE_UNAVAILABLE, 'EmailService has been disposed')
    }
  }

  private updateActivity(): void {
    this.state.lastActivity = new Date()
  }

  private handleError(message: string, error: unknown): void {
    this.state.errorCount++

    if (this.config.enableLogging) {
      logger.error(`[EmailService] ${message}`, error)
    }
  }

  private createError(code: GmailErrorCode, message: string, originalError?: unknown): GmailError {
    const error = new Error(message) as GmailError
    error.code = code
    error.context = 'EmailService'
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
