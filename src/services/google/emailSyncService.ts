import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/utils/logger'
import { getRecentContactEmails, GmailEmail } from './gmailApi'
import { getValidToken } from './tokenService'

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
          forceFullSync ? undefined : existingGmailIds, // Don't pass existing IDs if force full sync
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

      // Process attachments for existing emails that don't have images downloaded
      if (emailsToProcess.length === 0) {
        logger.info(`[EmailSyncService] No new emails, checking existing emails for missing attachments...`)
        await this.processExistingEmailAttachments(contactEmail)
      }

      await this.logSyncComplete('contact', {
        contactEmail,
        syncMethod,
        apiCalls,
        emailsFromApi: emailsToProcess.length,
        emailsSynced: emailsToProcess.length,
        emailsCreated: result.created,
        emailsUpdated: result.updated,
      })

      const finalResult = {
        success: true,
        emailsSynced: emailsToProcess.length,
        emailsCreated: result.created,
        emailsUpdated: result.updated,
      }

      return finalResult
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

        // ✅ IMPROVED: Better upsert with conflict resolution for sent emails
        // This ensures we don't create duplicates when auto-syncing after sending from CRM
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

        // Save attachments if any (always process for image download)
        /* if (email.attachments && email.attachments.length > 0) {
          await this.saveAttachments(data.id, email.attachments, email.id)
        } */
      } catch (error) {
        logger.error(`Error processing email ${email.id}:`, error)
      }
    }

    return { created, updated }
  }

  /**
   * Save email attachments with image download and storage
   */
  private async saveAttachments(emailId: string, attachments: any[], gmailMessageId: string) {
    if (!attachments || attachments.length === 0) return

    // Log attachment details and check field lengths
    logger.info(`[EmailSyncService] Processing ${attachments.length} attachments for email ${emailId}`)

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
        logger.warn(`[EmailSyncService] Attachment ${index} filename too long: ${filename.length} chars`, {
          filename: filename.substring(0, 100) + '...',
          originalLength: filename.length,
        })
      }

      let storagePath = null

      // Download and store images
      if (this.isImageAttachment(attachment)) {
        logger.info(`[EmailSyncService] Attempting to download image: ${filename} (${mimeType})`)
        try {
          storagePath = await this.downloadAndStoreAttachment(gmailMessageId, gmailAttachmentId, filename, mimeType)
          logger.info(`[EmailSyncService] Successfully stored image: ${filename} at ${storagePath}`)
        } catch (error) {
          logger.error(`[EmailSyncService] Failed to download/store image ${filename}:`, error)
          logger.error(`[EmailSyncService] Error details:`, {
            gmailMessageId,
            gmailAttachmentId,
            filename,
            mimeType,
            error: error instanceof Error ? error.message : error,
          })
          // Continue with metadata only, don't fail the whole process
        }
      } else {
        logger.info(`[EmailSyncService] Skipping non-image attachment: ${filename} (${mimeType})`)
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

    // Log the data we're about to save
    logger.info(`[EmailSyncService] Saving attachment data:`, {
      count: attachmentData.length,
      imagesStored: attachmentData.filter(att => att.storage_path).length,
      emailId,
      gmailMessageId,
    })

    // FIXED: Use same strategy as EmailService - delete existing, then insert new
    // This prevents duplicates more reliably than upsert with complex onConflict
    const { error: deleteError } = await supabase.from('email_attachments').delete().eq('email_id', emailId)

    if (deleteError) {
      logger.error('[EmailSyncService] Error deleting existing attachments:', deleteError)
      return
    }

    // Insert new attachments
    const { error } = await supabase.from('email_attachments').insert(attachmentData)

    if (error) {
      logger.error('[EmailSyncService] Error saving attachments:', error)
      // Log the problematic data for debugging
      logger.error('[EmailSyncService] Problematic attachment data:', JSON.stringify(attachmentData, null, 2))
    } else {
      logger.info(`[EmailSyncService] Successfully saved ${attachmentData.length} attachments`)
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
   * Process existing emails to download missing image attachments
   */
  private async processExistingEmailAttachments(contactEmail?: string) {
    try {
      logger.info(`[EmailSyncService] Processing existing emails for missing image attachments...`)

      // Find emails with image attachments that don't have storage_path
      let query = supabase
        .from('email_attachments')
        .select(
          `
          id, email_id, gmail_attachment_id, filename, mime_type, 
          storage_path, content_id, inline, size_bytes,
          emails!inner(gmail_id, from_email, to_emails)
        `,
        )
        .eq('emails.user_id', this.userId)
        .eq('emails.email_account_id', this.emailAccountId)
        .or(
          'mime_type.like.image/%,filename.like.%.jpg,filename.like.%.jpeg,filename.like.%.png,filename.like.%.gif,filename.like.%.webp',
        )
        .is('storage_path', null)

      // Filter by contact if specified
      if (contactEmail) {
        // We'll filter locally since JSONB queries can be complex
      }

      const { data: attachmentsToProcess, error } = await query

      if (error) {
        logger.error('[EmailSyncService] Error fetching attachments to process:', error)
        return
      }

      if (!attachmentsToProcess || attachmentsToProcess.length === 0) {
        logger.info(`[EmailSyncService] No missing image attachments found`)
        return
      }

      // Filter by contact locally if needed
      let filteredAttachments = attachmentsToProcess
      if (contactEmail) {
        filteredAttachments = attachmentsToProcess.filter(att => {
          const email = (att as any).emails
          return (
            email.from_email === contactEmail ||
            (email.to_emails && typeof email.to_emails === 'string' && email.to_emails.includes(contactEmail))
          )
        })
      }

      logger.info(`[EmailSyncService] Found ${filteredAttachments.length} image attachments to download`)

      // Process each attachment
      for (const attachment of filteredAttachments) {
        const email = (attachment as any).emails
        try {
          logger.info(`[EmailSyncService] Processing missing image: ${attachment.filename}`)

          const storagePath = await this.downloadAndStoreAttachment(
            email.gmail_id, // Use gmail_id as the message ID
            attachment.gmail_attachment_id,
            attachment.filename,
            attachment.mime_type,
          )

          if (storagePath) {
            // Update the attachment record with storage path
            const { error: updateError } = await supabase
              .from('email_attachments')
              .update({ storage_path: storagePath })
              .eq('id', attachment.id)

            if (updateError) {
              logger.error(`[EmailSyncService] Error updating attachment ${attachment.filename}:`, updateError)
            } else {
              logger.info(`[EmailSyncService] Successfully updated attachment ${attachment.filename} with storage path`)
            }
          }
        } catch (error) {
          logger.error(`[EmailSyncService] Failed to process attachment ${attachment.filename}:`, error)
          // Continue with next attachment
        }
      }

      logger.info(`[EmailSyncService] Completed processing existing email attachments`)
    } catch (error) {
      logger.error('[EmailSyncService] Error processing existing email attachments:', error)
    }
  }

  /**
   * Download attachment from Gmail API and store in Supabase Storage
   */
  private async downloadAndStoreAttachment(
    messageId: string,
    attachmentId: string,
    filename: string,
    mimeType: string,
  ): Promise<string | null> {
    logger.info(`[EmailSyncService] Starting download for attachment: ${filename}`, {
      messageId,
      attachmentId,
      mimeType,
    })

    try {
      // Download attachment from Gmail API
      logger.info(`[EmailSyncService] Fetching attachment from Gmail API...`)
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      )

      logger.info(`[EmailSyncService] Gmail API response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        logger.error(`[EmailSyncService] Gmail API error response:`, errorText)
        throw new Error(`Gmail API error: ${response.statusText} - ${errorText}`)
      }

      const attachmentData = await response.json()
      logger.info(`[EmailSyncService] Received attachment data:`, {
        hasData: !!attachmentData.data,
        dataLength: attachmentData.data ? attachmentData.data.length : 0,
        size: attachmentData.size,
      })

      if (!attachmentData.data) {
        throw new Error('No attachment data received from Gmail API')
      }

      // Decode base64url data to binary
      logger.info(`[EmailSyncService] Decoding base64url data...`)
      const base64Data = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/')
      const paddedBase64 = base64Data + '='.repeat((4 - (base64Data.length % 4)) % 4)

      // Convert to binary
      const binaryString = atob(paddedBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      logger.info(`[EmailSyncService] Converted to binary:`, {
        originalLength: base64Data.length,
        binaryLength: bytes.length,
      })

      // Generate unique filename with timestamp and user ID for RLS
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileExtension = filename.split('.').pop() || 'bin'
      const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
      const uniqueFilename = `${this.userId}/emails/${messageId}/${timestamp}-${cleanFilename}`

      logger.info(`[EmailSyncService] Uploading to Supabase Storage:`, {
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
        logger.error(`[EmailSyncService] Supabase Storage error:`, {
          error: error.message,
          filename: uniqueFilename,
          userId: this.userId,
        })
        throw new Error(`Supabase Storage error: ${error.message}`)
      }

      logger.info(`[EmailSyncService] Successfully uploaded to storage:`, {
        path: data.path,
        filename,
      })

      // Return the storage path
      return data.path
    } catch (error) {
      logger.error(`[EmailSyncService] Error downloading/storing attachment ${filename}:`, error)
      throw error
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
