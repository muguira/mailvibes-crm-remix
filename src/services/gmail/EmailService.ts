import { supabase } from '@/integrations/supabase/client'
import {
  createDraft,
  getRecentContactEmails,
  GmailEmail,
  searchContactEmails,
  sendEmail,
  SendEmailData,
  SendEmailResponse,
} from '@/services/google/gmailApi'
import { logger } from '@/utils/logger'
import { triggerContactSync } from '@/workers/emailSyncWorker'
import type { AuthService } from './AuthService'
import type {
  EmailCache,
  GetEmailsOptions,
  GmailError,
  GmailServiceConfig,
  SearchOptions,
  ServiceState,
  SyncOptions,
  SyncResult,
} from './types'
import { GmailErrorCode } from './types'

interface DatabaseEmail {
  id: string
  gmail_id: string
  gmail_thread_id?: string | null
  message_id?: string | null // ✅ ADD: RFC 2822 Message-ID
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
  email_attachments?: {
    id: string
    gmail_attachment_id: string
    filename: string
    mime_type: string
    size_bytes: number
    inline: boolean
    content_id: string
  }[]
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

    const { maxEmails = Infinity, forceFullSync = false, onProgress } = options // No limit for full contact sync

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

      // Fetch emails from Gmail API (enable full sync for complete contact history)
      const response = await getRecentContactEmails(token, contactEmail, maxEmails, maxEmails === Infinity)

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
   * Get display name for contact
   */
  private getContactDisplayName(contactEmail: string): string {
    if (!contactEmail || contactEmail === 'Unknown Contact') {
      return 'unknown contact'
    }

    // If it's an email, show just the name part
    if (contactEmail.includes('@')) {
      const namePart = contactEmail.split('@')[0]
      return namePart.charAt(0).toUpperCase() + namePart.slice(1)
    }

    return contactEmail
  }

  /**
   * Log sync start to email_sync_log table
   */
  private async logSyncStart(syncType: string, contactEmail: string, metadata: any = {}) {
    try {
      const accounts = await this.authService.getConnectedAccounts()
      if (accounts.length === 0) return

      const { error } = await supabase.from('email_sync_log').insert({
        email_account_id: accounts[0].id,
        sync_type: syncType,
        status: 'started',
        metadata: JSON.stringify({
          contactEmail,
          targetContact: contactEmail,
          description: `Sync emails with ${this.getContactDisplayName(contactEmail)}`,
          ...metadata,
        }),
        started_at: new Date().toISOString(),
      })

      if (error) {
        logger.error('[EmailService] Error logging sync start:', error)
      } else {
        logger.info(`[EmailService] Sync started for ${contactEmail}`, { syncType, metadata })
      }
    } catch (error) {
      logger.error('[EmailService] Failed to log sync start:', error)
    }
  }

  /**
   * Log sync completion to email_sync_log table
   */
  private async logSyncComplete(syncType: string, contactEmail: string, emailsCount: number, metadata: any = {}) {
    try {
      const accounts = await this.authService.getConnectedAccounts()
      if (accounts.length === 0) return

      const { error } = await supabase.from('email_sync_log').insert({
        email_account_id: accounts[0].id,
        sync_type: syncType,
        status: 'completed',
        emails_synced: emailsCount,
        emails_created: metadata.emailsCreated || 0,
        emails_updated: metadata.emailsUpdated || 0,
        completed_at: new Date().toISOString(),
        metadata: JSON.stringify({
          contactEmail,
          targetContact: contactEmail,
          description: `Sync emails with ${this.getContactDisplayName(contactEmail)}`,
          ...metadata,
        }),
      })

      if (error) {
        logger.error('[EmailService] Error logging sync completion:', error)
      } else {
        logger.info(`[EmailService] Sync completed for ${contactEmail}`, {
          syncType,
          emailsCount,
          metadata,
        })
      }
    } catch (error) {
      logger.error('[EmailService] Failed to log sync completion:', error)
    }
  }

  /**
   * Log sync error to email_sync_log table
   */
  private async logSyncError(syncType: string, contactEmail: string, errorMessage: string, metadata: any = {}) {
    try {
      const accounts = await this.authService.getConnectedAccounts()
      if (accounts.length === 0) return

      const { error } = await supabase.from('email_sync_log').insert({
        email_account_id: accounts[0].id,
        sync_type: syncType,
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
        metadata: JSON.stringify({ contactEmail, ...metadata }),
      })

      if (error) {
        logger.error('[EmailService] Error logging sync error:', error)
      } else {
        logger.error(`[EmailService] Sync failed for ${contactEmail}`, {
          syncType,
          errorMessage,
          metadata,
        })
      }
    } catch (error) {
      logger.error('[EmailService] Failed to log sync error:', error)
    }
  }

  /**
   * Get emails for a contact from multiple accounts in parallel
   */
  private async getEmailsFromMultipleAccounts(
    contactEmail: string,
    accounts: any[],
    maxResults: number,
    maxAge: number,
  ): Promise<{ emails: GmailEmail[]; source: string; accountsProcessed: number }> {
    const startTime = Date.now()

    // Filter accounts that are enabled and not recently failed
    const eligibleAccounts = accounts.filter(account => {
      if (!account.sync_enabled) return false

      // Skip accounts that failed recently (within last 5 minutes)
      if (account.last_sync_status === 'failed' && account.last_sync_at) {
        const lastSync = new Date(account.last_sync_at)
        const timeSinceLastSync = Date.now() - lastSync.getTime()
        if (timeSinceLastSync < 5 * 60 * 1000) {
          logger.warn(`[EmailService] Skipping account ${account.email} - recently failed`)
          return false
        }
      }

      return true
    })

    if (eligibleAccounts.length === 0) {
      return { emails: [], source: 'none', accountsProcessed: 0 }
    }

    logger.info(`[EmailService] Processing ${eligibleAccounts.length} accounts in parallel for ${contactEmail}`)

    // Process accounts in parallel with rate limiting
    const accountPromises = eligibleAccounts.map(async (account, index) => {
      try {
        // Stagger requests to respect rate limits (250ms between accounts)
        await new Promise(resolve => setTimeout(resolve, index * 250))

        const accountStartTime = Date.now()

        // Try database first for this account
        const dbResult = await this.getEmailsFromDatabase(contactEmail, account.id, maxResults)

        if (dbResult.emails.length > 0 && this.isDatabaseFresh(dbResult.lastSync, maxAge)) {
          logger.info(`[EmailService] Account ${account.email}: Using fresh DB data (${dbResult.emails.length} emails)`)
          return {
            emails: dbResult.emails,
            source: 'database',
            account: account.email,
            duration: Date.now() - accountStartTime,
          }
        }

        // Fall back to API for this account
        const token = await this.authService.getValidToken(account.email)
        if (!token) {
          logger.warn(`[EmailService] Account ${account.email}: No valid token available`)
          return { emails: [], source: 'failed', account: account.email, duration: Date.now() - accountStartTime }
        }

        const response = await getRecentContactEmails(
          token,
          contactEmail,
          Math.floor(maxResults / eligibleAccounts.length),
        )

        logger.info(`[EmailService] Account ${account.email}: API returned ${response.emails.length} emails`)

        return {
          emails: response.emails,
          source: 'api',
          account: account.email,
          duration: Date.now() - accountStartTime,
        }
      } catch (error) {
        logger.error(`[EmailService] Account ${account.email}: Error fetching emails:`, error)
        return {
          emails: [],
          source: 'error',
          account: account.email,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - Date.now(),
        }
      }
    })

    // Wait for all accounts to complete
    const results = await Promise.all(accountPromises)

    // Combine and deduplicate emails from all accounts
    const allEmails: GmailEmail[] = []
    const seenEmails = new Set<string>()
    const sourceStats = { database: 0, api: 0, failed: 0, error: 0 }

    for (const result of results) {
      sourceStats[result.source as keyof typeof sourceStats]++

      for (const email of result.emails) {
        // Deduplicate by gmail_id
        if (!seenEmails.has(email.id)) {
          seenEmails.add(email.id)
          allEmails.push(email)
        }
      }
    }

    // Sort by date (newest first)
    allEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const totalDuration = Date.now() - startTime
    logger.info(`[EmailService] Multi-account processing completed for ${contactEmail}`, {
      accountsProcessed: results.length,
      totalEmails: allEmails.length,
      uniqueEmails: seenEmails.size,
      sourceStats,
      duration: totalDuration,
    })

    // Determine primary source
    const primarySource =
      sourceStats.api > 0 ? 'api-multi' : sourceStats.database > 0 ? 'database-multi' : 'failed-multi'

    return {
      emails: allEmails.slice(0, maxResults), // Respect final limit
      source: primarySource,
      accountsProcessed: results.length,
    }
  }

  /**
   * Get emails for a contact (hybrid database + API approach)
   */
  async getContactEmails(contactEmail: string, options: GetEmailsOptions = {}): Promise<GmailEmail[]> {
    this.ensureNotDisposed()
    this.updateActivity()

    const {
      maxResults = 500,
      preferDatabase = true,
      maxAge = this.config.cacheTTL || 15 * 60 * 1000, // 15 minutes default
      includeAttachments = false,
    } = options

    const startTime = Date.now()

    // Log sync start
    await this.logSyncStart('contact_emails', contactEmail, {
      maxResults,
      preferDatabase,
      includeAttachments,
    })

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

      // NEW: Use multi-account parallel processing
      const multiAccountResult = await this.getEmailsFromMultipleAccounts(contactEmail, accounts, maxResults, maxAge)

      if (multiAccountResult.emails.length > 0) {
        // Update cache (background sync disabled to prevent duplicate attachments)
        this.updateCache(contactEmail, multiAccountResult.emails)
        // this.triggerBackgroundSync(contactEmail) // DISABLED: Prevents attachment duplicates

        // Log successful completion with multi-account stats
        const duration = Date.now() - startTime
        await this.logSyncComplete('contact_emails', contactEmail, multiAccountResult.emails.length, {
          duration,
          source: multiAccountResult.source,
          accountsProcessed: multiAccountResult.accountsProcessed,
          totalAccounts: accounts.length,
        })

        return multiAccountResult.emails
      }

      // FALLBACK: Single account logic (if multi-account completely failed)
      logger.warn(
        `[EmailService] Multi-account processing returned no results, trying single account fallback for ${contactEmail}`,
      )

      const firstEnabledAccount = accounts.find(acc => acc.sync_enabled) || accounts[0]

      if (preferDatabase) {
        // Try database first
        const dbResult = await this.getEmailsFromDatabase(contactEmail, firstEnabledAccount.id, maxResults)

        // Check if database results are fresh enough
        if (dbResult.emails.length > 0 && this.isDatabaseFresh(dbResult.lastSync, maxAge)) {
          this.updateCache(contactEmail, dbResult.emails)

          // Log successful completion from database fallback
          const duration = Date.now() - startTime
          await this.logSyncComplete('contact_emails', contactEmail, dbResult.emails.length, {
            duration,
            source: 'database-fallback',
            lastSync: dbResult.lastSync,
          })

          return dbResult.emails
        }
      }

      // Fall back to API for single account
      const token = await this.authService.getValidToken(firstEnabledAccount.email)
      if (!token) {
        // If no token and we have database results, return them even if stale
        if (preferDatabase) {
          const dbResult = await this.getEmailsFromDatabase(contactEmail, firstEnabledAccount.id, maxResults)
          if (dbResult.emails.length > 0) {
            return dbResult.emails
          }
        }
        return []
      }

      const response = await getRecentContactEmails(token, contactEmail, maxResults, false) // Limited sync for hybrid calls

      // Update cache (background sync disabled to prevent duplicate attachments)
      this.updateCache(contactEmail, response.emails)
      // this.triggerBackgroundSync(contactEmail) // Disabled to prevent attachment duplicates

      // Log successful completion from single account fallback
      const duration = Date.now() - startTime
      await this.logSyncComplete('contact_emails', contactEmail, response.emails.length, {
        duration,
        source: 'api-fallback',
        resultSizeEstimate: response.resultSizeEstimate || 0,
      })

      return response.emails
    } catch (error) {
      this.handleError('Failed to get contact emails', error)

      // Log sync error
      const duration = Date.now() - startTime
      await this.logSyncError(
        'contact_emails',
        contactEmail,
        error instanceof Error ? error.message : 'Unknown error',
        {
          duration,
          preferDatabase,
          maxResults,
        },
      )

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

    const { maxResults = 500 } = options

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
        .select(
          `
          id, gmail_id, gmail_thread_id, message_id, subject, snippet, body_text, body_html,
          from_email, from_name, to_emails, cc_emails, bcc_emails,
          date, is_read, is_important, labels, has_attachments,
          attachment_count, created_at, updated_at,
          email_attachments (
            id, gmail_attachment_id, filename, mime_type, 
            size_bytes, inline, content_id
          )
        `,
        )
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
        .select(
          `
          *,
          email_attachments (
            id, gmail_attachment_id, filename, mime_type, 
            size_bytes, inline, content_id
          )
        `,
        )
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
      threadId: dbEmail.gmail_thread_id || '', // ✅ FIX: Use real threadId from database
      messageId: dbEmail.message_id || undefined, // ✅ ADD: Include RFC 2822 Message-ID
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
      attachments:
        dbEmail.email_attachments?.map(att => ({
          id: att.gmail_attachment_id || att.id,
          filename: att.filename,
          mimeType: att.mime_type || '',
          size: att.size_bytes || 0,
          inline: att.inline || false,
          contentId: att.content_id,
        })) || undefined,
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
          message_id: email.messageId, // ✅ ADD: Save RFC 2822 Message-ID for threading
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

        // Try to insert, if conflict then update using the gmail_id unique constraint
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

        // ✅ FIX: Save attachments if any (just like EmailSyncService does)
        if (email.attachments && email.attachments.length > 0) {
          await this.saveAttachments(data.id, email.attachments, email.id)
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

  // =============================================================================
  // EMAIL SENDING METHODS
  // =============================================================================

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
    inReplyTo?: string
    references?: string
    threadId?: string // ✅ ADD: For Gmail API threading
  }): Promise<SendEmailResponse> {
    this.ensureNotDisposed()
    this.updateActivity()

    try {
      if (this.config.enableLogging) {
        logger.info(`[EmailService] Sending email to: ${emailData.to.join(', ')}`)
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

      // Prepare email data for Gmail API
      const gmailEmailData: SendEmailData = {
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        bodyHtml: emailData.bodyHtml,
        inReplyTo: emailData.inReplyTo,
        references: emailData.references,
        threadId: emailData.threadId, // ✅ ADD: Pass threadId for threading
      }

      // Send email via Gmail API
      const result = await sendEmail(token, gmailEmailData)

      if (this.config.enableLogging) {
        logger.info(`[EmailService] Email sent successfully: ${result.messageId}`)
      }

      return result
    } catch (error) {
      this.handleError('Failed to send email', error)
      throw error
    }
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

    try {
      if (this.config.enableLogging) {
        logger.info(`[EmailService] Creating draft for: ${emailData.to.join(', ')}`)
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

      // Prepare email data for Gmail API
      const gmailEmailData: SendEmailData = {
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        bodyHtml: emailData.bodyHtml,
      }

      // Create draft via Gmail API
      const result = await createDraft(token, gmailEmailData)

      if (this.config.enableLogging) {
        logger.info(`[EmailService] Draft created successfully: ${result.draftId}`)
      }

      return result
    } catch (error) {
      this.handleError('Failed to create draft', error)
      throw error
    }
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
  ): Promise<SendEmailResponse> {
    this.ensureNotDisposed()
    this.updateActivity()

    // Prepare reply subject
    const replySubject =
      replyData.subject ||
      (originalEmail.subject.startsWith('Re:') ? originalEmail.subject : `Re: ${originalEmail.subject}`)

    // Prepare threading headers
    const references = originalEmail.references
      ? `${originalEmail.references} ${originalEmail.gmailId}`
      : originalEmail.gmailId

    return await this.sendEmail({
      to: replyData.to,
      cc: replyData.cc,
      subject: replySubject,
      bodyHtml: replyData.bodyHtml,
      contactId: replyData.contactId,
      inReplyTo: originalEmail.gmailId,
      references: references,
    })
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

  /**
   * Save email attachments with image download and storage
   * (Copied from EmailSyncService to fix attachment saving issue)
   */
  private async saveAttachments(emailId: string, attachments: any[], gmailMessageId: string) {
    if (!attachments || attachments.length === 0) return

    // Temporarily disable logs to prevent spam
    // logger.info(`[EmailService] Processing ${attachments.length} attachments for email ${emailId}`)

    const attachmentData = []

    for (let index = 0; index < attachments.length; index++) {
      const attachment = attachments[index]

      // Check and log field lengths
      const filename = attachment.filename || ''
      const mimeType = attachment.mimeType || ''
      const contentId = attachment.contentId || ''
      const gmailAttachmentId = attachment.id || ''

      // Log if any field is too long
      if (filename.length > 1000) {
        logger.warn(`[EmailService] Attachment ${index} filename too long: ${filename.length} chars`, {
          filename: filename.substring(0, 100) + '...',
          originalLength: filename.length,
        })
      }

      let storagePath = null

      // Download and store images
      if (this.isImageAttachment(attachment)) {
        logger.info(`[EmailService] Attempting to download image: ${filename} (${mimeType})`)
        try {
          storagePath = await this.downloadAndStoreAttachment(gmailMessageId, gmailAttachmentId, filename, mimeType)
          logger.info(`[EmailService] Successfully stored image: ${filename} at ${storagePath}`)
        } catch (error) {
          logger.error(`[EmailService] Failed to download/store image ${filename}:`, error)
          logger.error(`[EmailService] Error details:`, {
            gmailMessageId,
            gmailAttachmentId,
            filename,
            mimeType,
            error: error instanceof Error ? error.message : error,
          })
          // Continue with metadata only, don't fail the whole process
        }
      } else {
        logger.info(`[EmailService] Skipping non-image attachment: ${filename} (${mimeType})`)
      }

      attachmentData.push({
        email_id: emailId,
        gmail_attachment_id: gmailAttachmentId.substring(0, 500), // Truncate to avoid errors
        filename: filename.substring(0, 1000), // Truncate to avoid errors
        mime_type: mimeType.substring(0, 500), // Truncate to avoid errors
        size_bytes: attachment.size || 0,
        inline: attachment.inline || false,
        content_id: contentId.substring(0, 500), // Truncate to avoid errors
        storage_path: storagePath, // Store the Supabase Storage path
        created_at: new Date().toISOString(),
      })
    }

    // Strategy: Delete existing attachments for this email, then insert new ones
    // This prevents duplicates more reliably than upsert with onConflict
    const { error: deleteError } = await supabase.from('email_attachments').delete().eq('email_id', emailId)

    if (deleteError) {
      logger.error('[EmailService] Error deleting existing attachments:', deleteError)
      return
    }

    // Insert new attachments
    const { error } = await supabase.from('email_attachments').insert(attachmentData)

    if (error) {
      logger.error('[EmailService] Error saving attachments:', error)
      // Log the problematic data for debugging
      logger.error('[EmailService] Problematic attachment data:', JSON.stringify(attachmentData, null, 2))
    } else {
      // Temporarily disable success logs to prevent spam
      // logger.info(`[EmailService] Successfully saved ${attachmentData.length} attachments`)
    }
  }

  /**
   * Check if attachment is an image
   */
  private isImageAttachment(attachment: any): boolean {
    const mimeType = attachment.mimeType || ''
    const filename = attachment.filename || ''

    return mimeType.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp|tiff?)$/i.test(filename)
  }

  /**
   * Download attachment from Gmail and store in Supabase Storage
   */
  private async downloadAndStoreAttachment(
    messageId: string,
    attachmentId: string,
    filename: string,
    mimeType: string,
  ): Promise<string | null> {
    logger.info(`[EmailService] Starting download for attachment: ${filename}`, {
      messageId,
      attachmentId,
      mimeType,
    })

    try {
      // Get valid access token first
      const accounts = await this.authService.getConnectedAccounts()
      if (accounts.length === 0) {
        throw new Error('No connected Gmail accounts found')
      }

      const token = await this.authService.getValidToken(accounts[0].email)
      if (!token) {
        throw new Error('Unable to get valid access token')
      }

      // Download attachment from Gmail API
      logger.info(`[EmailService] Fetching attachment from Gmail API...`)
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      )

      logger.info(`[EmailService] Gmail API response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        logger.error(`[EmailService] Gmail API error response:`, errorText)
        throw new Error(`Gmail API error: ${response.statusText} - ${errorText}`)
      }

      const attachmentData = await response.json()
      logger.info(`[EmailService] Received attachment data:`, {
        hasData: !!attachmentData.data,
        dataLength: attachmentData.data ? attachmentData.data.length : 0,
        size: attachmentData.size,
      })

      if (!attachmentData.data) {
        throw new Error('No attachment data received from Gmail API')
      }

      // Decode base64url data to binary
      logger.info(`[EmailService] Decoding base64url data...`)
      const base64Data = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/')
      const paddedBase64 = base64Data + '='.repeat((4 - (base64Data.length % 4)) % 4)

      // Convert to binary
      const binaryString = atob(paddedBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      logger.info(`[EmailService] Converted to binary:`, {
        originalLength: base64Data.length,
        binaryLength: bytes.length,
      })

      // Generate unique filename with timestamp and user ID for RLS
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileExtension = filename.split('.').pop() || 'bin'
      const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
      const uniqueFilename = `${this.userId}/emails/${messageId}/${timestamp}-${cleanFilename}`

      logger.info(`[EmailService] Uploading to Supabase Storage:`, {
        filename: uniqueFilename,
        userId: this.userId,
        size: bytes.length,
        mimeType,
      })

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage.from('email-attachments').upload(uniqueFilename, bytes, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      })

      if (error) {
        logger.error(`[EmailService] Supabase Storage error:`, {
          error: error.message,
          filename: uniqueFilename,
          userId: this.userId,
        })
        throw new Error(`Supabase Storage error: ${error.message}`)
      }

      logger.info(`[EmailService] Successfully uploaded to storage:`, {
        path: data.path,
        filename,
      })

      // Return the storage path
      return data.path
    } catch (error) {
      logger.error(`[EmailService] Error downloading/storing attachment ${filename}:`, error)
      throw error
    }
  }
}
