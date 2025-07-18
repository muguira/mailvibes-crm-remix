import { supabase } from '@/integrations/supabase/client'
import { getRecentContactEmails, searchContactEmails, GmailEmail } from './gmailApi'
import { getValidToken } from './tokenService'
import { logger } from '@/utils/logger'

export interface SyncResult {
  success: boolean
  emailsSynced: number
  emailsCreated: number
  emailsUpdated: number
  error?: string
}

export interface SyncOptions {
  maxEmails?: number
  forceFullSync?: boolean
  contactEmails?: string[]
}

/**
 * Email Synchronization Service
 * Handles syncing emails from Gmail API to Supabase database
 */
export class EmailSyncService {
  private userId: string
  private emailAccountId: string
  private accessToken: string

  constructor(userId: string, emailAccountId: string, accessToken: string) {
    this.userId = userId
    this.emailAccountId = emailAccountId
    this.accessToken = accessToken
  }

  /**
   * Get stored history ID for incremental sync
   */
  private async getStoredHistoryId(): Promise<string | null> {
    try {
      const { data: emails, error } = await supabase
        .from('emails')
        .select('gmail_history_id')
        .eq('user_id', this.userId)
        .eq('email_account_id', this.emailAccountId)
        .not('gmail_history_id', 'is', null)
        .order('gmail_history_id', { ascending: false })
        .limit(1)

      if (error) {
        logger.error('[EmailSyncService] Error getting stored history ID:', error)
        return null
      }

      const historyId = emails?.[0]?.gmail_history_id
      logger.info(`[EmailSyncService] Stored history ID: ${historyId}`)
      return historyId ? historyId.toString() : null
    } catch (error) {
      logger.error('[EmailSyncService] Failed to get stored history ID:', error)
      return null
    }
  }

  /**
   * Update history ID for next incremental sync
   */
  private async updateHistoryId(newHistoryId: string): Promise<void> {
    try {
      // Update email_accounts with latest history ID for next sync
      const { error } = await supabase
        .from('email_accounts')
        .update({
          last_sync_at: new Date().toISOString(),
          settings: { last_history_id: newHistoryId },
        })
        .eq('id', this.emailAccountId)

      if (error) {
        logger.error('[EmailSyncService] Error updating history ID:', error)
      } else {
        logger.info(`[EmailSyncService] Updated history ID to: ${newHistoryId}`)
      }
    } catch (error) {
      logger.error('[EmailSyncService] Failed to update history ID:', error)
    }
  }

  /**
   * Perform incremental sync using Gmail History API
   */
  private async performIncrementalSync(
    contactEmail: string,
    startHistoryId: string,
    maxEmails: number,
  ): Promise<{ emails: GmailEmail[]; newHistoryId?: string } | null> {
    try {
      logger.info(`[EmailSyncService] Attempting incremental sync from history ID: ${startHistoryId}`)

      // Call Gmail History API (simplified - would need actual implementation)
      const historyUrl = `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}&maxResults=${maxEmails}`

      const response = await fetch(historyUrl, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          // History ID too old - need full sync
          logger.warn('[EmailSyncService] History ID too old, falling back to full sync')
          return null
        }
        throw new Error(`History API error: ${response.statusText}`)
      }

      const historyData = await response.json()

      if (!historyData.history || historyData.history.length === 0) {
        logger.info('[EmailSyncService] No changes since last sync')
        return { emails: [], newHistoryId: historyData.historyId }
      }

      // Extract message IDs from history
      const messageIds = new Set<string>()
      historyData.history.forEach((historyRecord: any) => {
        // Process different types of history changes
        if (historyRecord.messages) {
          historyRecord.messages.forEach((msg: any) => messageIds.add(msg.id))
        }
        if (historyRecord.messagesAdded) {
          historyRecord.messagesAdded.forEach((msg: any) => messageIds.add(msg.message.id))
        }
        if (historyRecord.messagesDeleted) {
          historyRecord.messagesDeleted.forEach((msg: any) => messageIds.add(msg.message.id))
        }
      })

      // TODO: Fetch full email details for changed messages and filter by contact
      // For now, fallback to regular API call but log the incremental attempt
      logger.info(`[EmailSyncService] Incremental sync found ${messageIds.size} changed messages`)

      // Return null to trigger fallback for now - this is where full implementation would go
      return null
    } catch (error) {
      logger.error('[EmailSyncService] Incremental sync failed:', error)
      return null
    }
  }

  /**
   * Sync emails for a specific contact with intelligent incremental sync
   */
  async syncContactEmails(contactEmail: string, options: SyncOptions = {}): Promise<SyncResult> {
    const { maxEmails = Infinity, forceFullSync = false } = options // No limits - sync ALL contact history

    try {
      await this.logSyncStart('contact', { contactEmail, maxEmails, forceFullSync })

      let emailsToProcess: GmailEmail[] = []
      let syncMethod = 'full'
      let apiCalls = 0

      // Try incremental sync first (unless force full sync)
      if (!forceFullSync) {
        const storedHistoryId = await this.getStoredHistoryId()

        if (storedHistoryId) {
          logger.info(
            `[EmailSyncService] Attempting incremental sync for ${contactEmail} from history ${storedHistoryId}`,
          )

          const incrementalResult = await this.performIncrementalSync(contactEmail, storedHistoryId, maxEmails)
          apiCalls++ // History API call

          if (incrementalResult) {
            emailsToProcess = incrementalResult.emails
            syncMethod = 'incremental'

            // Update history ID for next sync
            if (incrementalResult.newHistoryId) {
              await this.updateHistoryId(incrementalResult.newHistoryId)
            }

            logger.info(`[EmailSyncService] Incremental sync successful: ${emailsToProcess.length} emails`)
          } else {
            logger.info(`[EmailSyncService] Incremental sync failed/unavailable, falling back to full sync`)
          }
        } else {
          logger.info(`[EmailSyncService] No stored history ID found, performing full sync`)
        }
      }

      // If incremental sync didn't work or was forced off, do full sync
      if (emailsToProcess.length === 0 && syncMethod === 'full') {
        logger.info(`[EmailSyncService] Performing full sync for ${contactEmail}`)

        // Get existing emails to avoid duplicates
        const existingEmails = await this.getExistingEmails(contactEmail)
        const existingGmailIds = new Set(existingEmails.map(e => e.gmail_id))

        // Fetch emails from Gmail API (enable full sync for complete contact history)
        // Pass existing Gmail IDs to avoid fetching emails we already have
        const response = await getRecentContactEmails(
          this.accessToken,
          contactEmail,
          maxEmails,
          maxEmails === Infinity,
          existingGmailIds,
        )
        apiCalls++ // Regular API call

        // Filter out emails we already have (unless force full sync)
        emailsToProcess = forceFullSync
          ? response.emails
          : response.emails.filter(email => !existingGmailIds.has(email.id))

        // Store history ID from this sync for next incremental sync
        if (response.emails.length > 0) {
          // Use a simple approach: get the latest email's timestamp as reference point
          const latestEmailDate = new Date(Math.max(...response.emails.map(e => new Date(e.date).getTime())))
          const syntheticHistoryId = latestEmailDate.getTime().toString()
          await this.updateHistoryId(syntheticHistoryId)
        }

        syncMethod = 'full'
      }

      // Save emails to database
      const result = await this.saveEmailsToDatabase(emailsToProcess, contactEmail)

      await this.logSyncComplete('contact', {
        contactEmail,
        syncMethod,
        apiCalls,
        emailsFromApi: emailsToProcess.length,
        emailsSynced: emailsToProcess.length,
        emailsCreated: result.created,
        emailsUpdated: result.updated,
      })

      return {
        success: true,
        emailsSynced: emailsToProcess.length,
        emailsCreated: result.created,
        emailsUpdated: result.updated,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logSyncError('contact', errorMessage, { contactEmail })

      return {
        success: false,
        emailsSynced: 0,
        emailsCreated: 0,
        emailsUpdated: 0,
        error: errorMessage,
      }
    }
  }

  /**
   * Sync emails for multiple contacts
   */
  async syncMultipleContacts(contactEmails: string[], options: SyncOptions = {}): Promise<SyncResult> {
    const { maxEmails = 20 } = options

    try {
      await this.logSyncStart('batch', { contactEmails, maxEmails })

      let totalSynced = 0
      let totalCreated = 0
      let totalUpdated = 0

      // Process contacts in batches to avoid API limits
      const batchSize = 5
      for (let i = 0; i < contactEmails.length; i += batchSize) {
        const batch = contactEmails.slice(i, i + batchSize)

        const batchPromises = batch.map(async contactEmail => {
          try {
            const result = await this.syncContactEmails(contactEmail, {
              maxEmails,
            })
            return result
          } catch (error) {
            logger.error(`Error syncing contact ${contactEmail}:`, error)
            return {
              success: false,
              emailsSynced: 0,
              emailsCreated: 0,
              emailsUpdated: 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        })

        const batchResults = await Promise.all(batchPromises)

        batchResults.forEach(result => {
          totalSynced += result.emailsSynced
          totalCreated += result.emailsCreated
          totalUpdated += result.emailsUpdated
        })

        // Add small delay between batches to respect API limits
        if (i + batchSize < contactEmails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      await this.logSyncComplete('batch', {
        contactEmails,
        emailsSynced: totalSynced,
        emailsCreated: totalCreated,
        emailsUpdated: totalUpdated,
      })

      return {
        success: true,
        emailsSynced: totalSynced,
        emailsCreated: totalCreated,
        emailsUpdated: totalUpdated,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logSyncError('batch', errorMessage, { contactEmails })

      return {
        success: false,
        emailsSynced: 0,
        emailsCreated: 0,
        emailsUpdated: 0,
        error: errorMessage,
      }
    }
  }

  /**
   * Full account sync - sync all emails for all contacts
   */
  async syncFullAccount(options: SyncOptions = {}): Promise<SyncResult> {
    const { maxEmails = 100 } = options

    try {
      await this.logSyncStart('full', { maxEmails })

      // Get all contacts for this user
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('email')
        .eq('user_id', this.userId)
        .not('email', 'is', null)

      if (contactsError) {
        throw new Error(`Failed to get contacts: ${contactsError.message}`)
      }

      const contactEmails = contacts.map(c => c.email).filter(Boolean) as string[]

      if (contactEmails.length === 0) {
        return {
          success: true,
          emailsSynced: 0,
          emailsCreated: 0,
          emailsUpdated: 0,
        }
      }

      // Sync all contacts
      const result = await this.syncMultipleContacts(contactEmails, {
        maxEmails,
      })

      await this.logSyncComplete('full', {
        contactCount: contactEmails.length,
        emailsSynced: result.emailsSynced,
        emailsCreated: result.emailsCreated,
        emailsUpdated: result.emailsUpdated,
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logSyncError('full', errorMessage)

      return {
        success: false,
        emailsSynced: 0,
        emailsCreated: 0,
        emailsUpdated: 0,
        error: errorMessage,
      }
    }
  }

  /**
   * Get existing emails from database
   */
  private async getExistingEmails(contactEmail?: string) {
    if (!contactEmail) {
      // If no contact email specified, get all emails
      const { data, error } = await supabase
        .from('emails')
        .select('gmail_id, id, updated_at')
        .eq('user_id', this.userId)
        .eq('email_account_id', this.emailAccountId)

      if (error) {
        logger.error('Error getting existing emails:', error)
        return []
      }

      return data || []
    }

    // Query all emails and filter locally to avoid JSONB operator issues
    const { data: allEmails, error } = await supabase
      .from('emails')
      .select('gmail_id, id, updated_at, from_email, to_emails')
      .eq('user_id', this.userId)
      .eq('email_account_id', this.emailAccountId)

    if (error) {
      logger.error('Error getting existing emails:', error)
      return []
    }

    // Filter emails locally to find those related to the contact
    const filteredEmails = (allEmails || []).filter(email => {
      // Check if contact is in from_email
      if (email.from_email === contactEmail) {
        return true
      }

      // Check if contact is in to_emails (JSON string)
      if (email.to_emails) {
        const toEmailsStr = typeof email.to_emails === 'string' ? email.to_emails : JSON.stringify(email.to_emails)
        return toEmailsStr.includes(contactEmail)
      }

      return false
    })

    return filteredEmails
  }

  /**
   * Save emails to database
   */
  private async saveEmailsToDatabase(emails: GmailEmail[], contactEmail?: string) {
    let created = 0
    let updated = 0

    for (const email of emails) {
      try {
        // Find associated contact ID if we have one
        let contactId = null
        if (contactEmail) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('id')
            .eq('user_id', this.userId)
            .eq('email', contactEmail)
            .single()

          contactId = contact?.id || null
        }

        // Prepare email data for database
        const emailData = {
          user_id: this.userId,
          email_account_id: this.emailAccountId,
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
          logger.error(`Error saving email ${email.id}:`, error)
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

        // Save attachments if any
        if (email.attachments && email.attachments.length > 0) {
          await this.saveAttachments(data.id, email.attachments)
        }
      } catch (error) {
        logger.error(`Error processing email ${email.id}:`, error)
      }
    }

    return { created, updated }
  }

  /**
   * Save email attachments
   */
  private async saveAttachments(emailId: string, attachments: any[]) {
    if (!attachments || attachments.length === 0) return

    // Log attachment details and check field lengths
    logger.info(`[EmailSyncService] Processing ${attachments.length} attachments for email ${emailId}`)

    const attachmentData = attachments.map((attachment, index) => {
      // Check and log field lengths
      const filename = attachment.filename || ''
      const mimeType = attachment.mimeType || ''
      const contentId = attachment.contentId || ''
      const gmailAttachmentId = attachment.id || ''

      // Log if any field is too long
      if (filename.length > 1000) {
        logger.warn(`[EmailSyncService] Attachment ${index} filename too long: ${filename.length} chars`, {
          filename: filename.substring(0, 100) + '...',
          originalLength: filename.length,
        })
      }
      if (mimeType.length > 500) {
        logger.warn(`[EmailSyncService] Attachment ${index} mimeType too long: ${mimeType.length} chars`, {
          mimeType,
          originalLength: mimeType.length,
        })
      }
      if (contentId.length > 500) {
        logger.warn(`[EmailSyncService] Attachment ${index} contentId too long: ${contentId.length} chars`, {
          contentId: contentId.substring(0, 100) + '...',
          originalLength: contentId.length,
        })
      }
      if (gmailAttachmentId.length > 500) {
        logger.warn(
          `[EmailSyncService] Attachment ${index} gmail_attachment_id too long: ${gmailAttachmentId.length} chars`,
          {
            gmailAttachmentId: gmailAttachmentId.substring(0, 100) + '...',
            originalLength: gmailAttachmentId.length,
          },
        )
      }

      return {
        email_id: emailId,
        gmail_attachment_id: gmailAttachmentId.substring(0, 500), // Truncate to avoid errors
        filename: filename.substring(0, 1000), // Truncate to avoid errors
        mime_type: mimeType.substring(0, 500), // Truncate to avoid errors
        size_bytes: attachment.size || 0,
        inline: attachment.inline || false,
        content_id: contentId.substring(0, 500), // Truncate to avoid errors
        created_at: new Date().toISOString(),
      }
    })

    // Log the data we're about to save
    logger.info(`[EmailSyncService] Saving attachment data:`, {
      count: attachmentData.length,
      sample: attachmentData[0]
        ? {
            filename_length: attachmentData[0].filename?.length || 0,
            mime_type_length: attachmentData[0].mime_type?.length || 0,
            content_id_length: attachmentData[0].content_id?.length || 0,
            gmail_attachment_id_length: attachmentData[0].gmail_attachment_id?.length || 0,
          }
        : null,
    })

    // Use upsert without specifying onConflict - let Supabase handle unique constraints automatically
    const { error } = await supabase.from('email_attachments').upsert(attachmentData, {
      ignoreDuplicates: false,
    })

    if (error) {
      logger.error('Error saving attachments:', error)
      // Log the problematic data for debugging
      logger.error('Problematic attachment data:', JSON.stringify(attachmentData, null, 2))
    } else {
      logger.info(`[EmailSyncService] Successfully saved ${attachmentData.length} attachments`)
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
   * Log sync start
   */
  private async logSyncStart(syncType: string, metadata: any = {}) {
    const enhancedMetadata = {
      ...metadata,
      targetContact: metadata.contactEmail || metadata.targetContact,
      description: metadata.contactEmail
        ? `Sync emails with ${this.getContactDisplayName(metadata.contactEmail)}`
        : metadata.description || syncType,
    }

    const { error } = await supabase.from('email_sync_log').insert({
      email_account_id: this.emailAccountId,
      sync_type: syncType,
      status: 'started',
      metadata: JSON.stringify(enhancedMetadata),
      started_at: new Date().toISOString(),
    })

    if (error) {
      logger.error('Error logging sync start:', error)
    }
  }

  /**
   * Log sync completion
   */
  private async logSyncComplete(syncType: string, metadata: any = {}) {
    const enhancedMetadata = {
      ...metadata,
      targetContact: metadata.contactEmail || metadata.targetContact,
      description: metadata.contactEmail
        ? `Sync emails with ${this.getContactDisplayName(metadata.contactEmail)}`
        : metadata.description || syncType,
    }

    const { error } = await supabase.from('email_sync_log').insert({
      email_account_id: this.emailAccountId,
      sync_type: syncType,
      status: 'completed',
      emails_synced: metadata.emailsSynced || 0,
      emails_created: metadata.emailsCreated || 0,
      emails_updated: metadata.emailsUpdated || 0,
      completed_at: new Date().toISOString(),
      metadata: JSON.stringify(enhancedMetadata),
    })

    if (error) {
      logger.error('Error logging sync completion:', error)
    }
  }

  /**
   * Log sync error
   */
  private async logSyncError(syncType: string, errorMessage: string, metadata: any = {}) {
    const enhancedMetadata = {
      ...metadata,
      targetContact: metadata.contactEmail || metadata.targetContact,
      description: metadata.contactEmail
        ? `Sync emails with ${this.getContactDisplayName(metadata.contactEmail)}`
        : metadata.description || syncType,
    }

    const { error } = await supabase.from('email_sync_log').insert({
      email_account_id: this.emailAccountId,
      sync_type: syncType,
      status: 'failed',
      error_message: errorMessage,
      metadata: JSON.stringify(enhancedMetadata),
      completed_at: new Date().toISOString(),
    })

    if (error) {
      logger.error('Error logging sync error:', error)
    }
  }
}

/**
 * Factory function to create EmailSyncService instance
 */
export async function createEmailSyncService(
  userId: string,
  emailAccountEmail: string,
): Promise<EmailSyncService | null> {
  try {
    // Get email account
    const { data: emailAccount, error: accountError } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('email', emailAccountEmail)
      .single()

    if (accountError || !emailAccount) {
      logger.error('Email account not found:', accountError)
      return null
    }

    // Get valid access token
    const accessToken = await getValidToken(userId, emailAccountEmail)
    if (!accessToken) {
      logger.error('No valid access token available')
      return null
    }

    return new EmailSyncService(userId, emailAccount.id, accessToken)
  } catch (error) {
    logger.error('Error creating EmailSyncService:', error)
    return null
  }
}

/**
 * Convenience function to sync emails for a contact
 */
export async function syncContactEmails(
  userId: string,
  emailAccountEmail: string,
  contactEmail: string,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const syncService = await createEmailSyncService(userId, emailAccountEmail)

  if (!syncService) {
    return {
      success: false,
      emailsSynced: 0,
      emailsCreated: 0,
      emailsUpdated: 0,
      error: 'Failed to create sync service',
    }
  }

  return syncService.syncContactEmails(contactEmail, options)
}

/**
 * Convenience function to sync all emails for a user
 */
export async function syncAllEmails(
  userId: string,
  emailAccountEmail: string,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const syncService = await createEmailSyncService(userId, emailAccountEmail)

  if (!syncService) {
    return {
      success: false,
      emailsSynced: 0,
      emailsCreated: 0,
      emailsUpdated: 0,
      error: 'Failed to create sync service',
    }
  }

  return syncService.syncFullAccount(options)
}
