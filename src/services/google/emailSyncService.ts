import { supabase } from "@/integrations/supabase/client";
import {
  getRecentContactEmails,
  searchContactEmails,
  GmailEmail,
} from "./gmailApi";
import { getValidToken } from "./tokenService";
import { logger } from "@/utils/logger";

export interface SyncResult {
  success: boolean;
  emailsSynced: number;
  emailsCreated: number;
  emailsUpdated: number;
  error?: string;
}

export interface SyncOptions {
  maxEmails?: number;
  forceFullSync?: boolean;
  contactEmails?: string[];
}

/**
 * Email Synchronization Service
 * Handles syncing emails from Gmail API to Supabase database
 */
export class EmailSyncService {
  private userId: string;
  private emailAccountId: string;
  private accessToken: string;

  constructor(userId: string, emailAccountId: string, accessToken: string) {
    this.userId = userId;
    this.emailAccountId = emailAccountId;
    this.accessToken = accessToken;
  }

  /**
   * Sync emails for a specific contact
   */
  async syncContactEmails(
    contactEmail: string,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const { maxEmails = 50, forceFullSync = false } = options;

    try {
      await this.logSyncStart("contact", { contactEmail, maxEmails });

      // Get existing emails for this contact to avoid duplicates
      const existingEmails = await this.getExistingEmails(contactEmail);
      const existingGmailIds = new Set(existingEmails.map((e) => e.gmail_id));

      // Fetch emails from Gmail API
      const response = await getRecentContactEmails(
        this.accessToken,
        contactEmail,
        maxEmails
      );

      // Filter out emails we already have (unless force full sync)
      const newEmails = forceFullSync
        ? response.emails
        : response.emails.filter((email) => !existingGmailIds.has(email.id));

      // Save new emails to database
      const result = await this.saveEmailsToDatabase(newEmails, contactEmail);

      await this.logSyncComplete("contact", {
        contactEmail,
        emailsSynced: response.emails.length,
        emailsCreated: result.created,
        emailsUpdated: result.updated,
      });

      return {
        success: true,
        emailsSynced: response.emails.length,
        emailsCreated: result.created,
        emailsUpdated: result.updated,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await this.logSyncError("contact", errorMessage, { contactEmail });

      return {
        success: false,
        emailsSynced: 0,
        emailsCreated: 0,
        emailsUpdated: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync emails for multiple contacts
   */
  async syncMultipleContacts(
    contactEmails: string[],
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const { maxEmails = 20 } = options;

    try {
      await this.logSyncStart("batch", { contactEmails, maxEmails });

      let totalSynced = 0;
      let totalCreated = 0;
      let totalUpdated = 0;

      // Process contacts in batches to avoid API limits
      const batchSize = 5;
      for (let i = 0; i < contactEmails.length; i += batchSize) {
        const batch = contactEmails.slice(i, i + batchSize);

        const batchPromises = batch.map(async (contactEmail) => {
          try {
            const result = await this.syncContactEmails(contactEmail, {
              maxEmails,
            });
            return result;
          } catch (error) {
            logger.error(`Error syncing contact ${contactEmail}:`, error);
            return {
              success: false,
              emailsSynced: 0,
              emailsCreated: 0,
              emailsUpdated: 0,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);

        batchResults.forEach((result) => {
          totalSynced += result.emailsSynced;
          totalCreated += result.emailsCreated;
          totalUpdated += result.emailsUpdated;
        });

        // Add small delay between batches to respect API limits
        if (i + batchSize < contactEmails.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      await this.logSyncComplete("batch", {
        contactEmails,
        emailsSynced: totalSynced,
        emailsCreated: totalCreated,
        emailsUpdated: totalUpdated,
      });

      return {
        success: true,
        emailsSynced: totalSynced,
        emailsCreated: totalCreated,
        emailsUpdated: totalUpdated,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await this.logSyncError("batch", errorMessage, { contactEmails });

      return {
        success: false,
        emailsSynced: 0,
        emailsCreated: 0,
        emailsUpdated: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Full account sync - sync all emails for all contacts
   */
  async syncFullAccount(options: SyncOptions = {}): Promise<SyncResult> {
    const { maxEmails = 100 } = options;

    try {
      await this.logSyncStart("full", { maxEmails });

      // Get all contacts for this user
      const { data: contacts, error: contactsError } = await supabase
        .from("contacts")
        .select("email")
        .eq("user_id", this.userId)
        .not("email", "is", null);

      if (contactsError) {
        throw new Error(`Failed to get contacts: ${contactsError.message}`);
      }

      const contactEmails = contacts
        .map((c) => c.email)
        .filter(Boolean) as string[];

      if (contactEmails.length === 0) {
        return {
          success: true,
          emailsSynced: 0,
          emailsCreated: 0,
          emailsUpdated: 0,
        };
      }

      // Sync all contacts
      const result = await this.syncMultipleContacts(contactEmails, {
        maxEmails,
      });

      await this.logSyncComplete("full", {
        contactCount: contactEmails.length,
        emailsSynced: result.emailsSynced,
        emailsCreated: result.emailsCreated,
        emailsUpdated: result.emailsUpdated,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await this.logSyncError("full", errorMessage);

      return {
        success: false,
        emailsSynced: 0,
        emailsCreated: 0,
        emailsUpdated: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Get existing emails from database
   */
  private async getExistingEmails(contactEmail?: string) {
    const query = supabase
      .from("emails")
      .select("gmail_id, id, updated_at")
      .eq("user_id", this.userId)
      .eq("email_account_id", this.emailAccountId);

    if (contactEmail) {
      query.or(`from_email.eq.${contactEmail},to_emails.cs."${contactEmail}"`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error getting existing emails:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Save emails to database
   */
  private async saveEmailsToDatabase(
    emails: GmailEmail[],
    contactEmail?: string
  ) {
    let created = 0;
    let updated = 0;

    for (const email of emails) {
      try {
        // Find associated contact ID if we have one
        let contactId = null;
        if (contactEmail) {
          const { data: contact } = await supabase
            .from("contacts")
            .select("id")
            .eq("user_id", this.userId)
            .eq("email", contactEmail)
            .single();

          contactId = contact?.id || null;
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
        };

        // Try to insert, if conflict then update
        const { data, error } = await supabase
          .from("emails")
          .upsert(emailData, {
            onConflict: "gmail_id",
            ignoreDuplicates: false,
          })
          .select("id")
          .single();

        if (error) {
          logger.error(`Error saving email ${email.id}:`, error);
          continue;
        }

        // Check if this was an insert or update
        const { data: existingEmail } = await supabase
          .from("emails")
          .select("created_at, updated_at")
          .eq("id", data.id)
          .single();

        if (existingEmail) {
          const createdAt = new Date(existingEmail.created_at);
          const updatedAt = new Date(existingEmail.updated_at);

          if (Math.abs(createdAt.getTime() - updatedAt.getTime()) < 1000) {
            created++;
          } else {
            updated++;
          }
        }

        // Save attachments if any
        if (email.attachments && email.attachments.length > 0) {
          await this.saveAttachments(data.id, email.attachments);
        }
      } catch (error) {
        logger.error(`Error processing email ${email.id}:`, error);
      }
    }

    return { created, updated };
  }

  /**
   * Save email attachments
   */
  private async saveAttachments(emailId: string, attachments: any[]) {
    const attachmentData = attachments.map((attachment) => ({
      email_id: emailId,
      gmail_attachment_id: attachment.id,
      filename: attachment.filename,
      mime_type: attachment.mimeType,
      size_bytes: attachment.size,
      inline: attachment.inline || false,
      content_id: attachment.contentId,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("email_attachments")
      .upsert(attachmentData, { onConflict: "gmail_attachment_id" });

    if (error) {
      logger.error("Error saving attachments:", error);
    }
  }

  /**
   * Log sync start
   */
  private async logSyncStart(syncType: string, metadata: any = {}) {
    const { error } = await supabase.from("email_sync_log").insert({
      email_account_id: this.emailAccountId,
      sync_type: syncType,
      status: "started",
      metadata: JSON.stringify(metadata),
      started_at: new Date().toISOString(),
    });

    if (error) {
      logger.error("Error logging sync start:", error);
    }
  }

  /**
   * Log sync completion
   */
  private async logSyncComplete(syncType: string, metadata: any = {}) {
    const { error } = await supabase.from("email_sync_log").insert({
      email_account_id: this.emailAccountId,
      sync_type: syncType,
      status: "completed",
      emails_synced: metadata.emailsSynced || 0,
      emails_created: metadata.emailsCreated || 0,
      emails_updated: metadata.emailsUpdated || 0,
      completed_at: new Date().toISOString(),
      metadata: JSON.stringify(metadata),
    });

    if (error) {
      logger.error("Error logging sync completion:", error);
    }
  }

  /**
   * Log sync error
   */
  private async logSyncError(
    syncType: string,
    errorMessage: string,
    metadata: any = {}
  ) {
    const { error } = await supabase.from("email_sync_log").insert({
      email_account_id: this.emailAccountId,
      sync_type: syncType,
      status: "failed",
      error_message: errorMessage,
      metadata: JSON.stringify(metadata),
      completed_at: new Date().toISOString(),
    });

    if (error) {
      logger.error("Error logging sync error:", error);
    }
  }
}

/**
 * Factory function to create EmailSyncService instance
 */
export async function createEmailSyncService(
  userId: string,
  emailAccountEmail: string
): Promise<EmailSyncService | null> {
  try {
    // Get email account
    const { data: emailAccount, error: accountError } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("email", emailAccountEmail)
      .single();

    if (accountError || !emailAccount) {
      logger.error("Email account not found:", accountError);
      return null;
    }

    // Get valid access token
    const accessToken = await getValidToken(userId, emailAccountEmail);
    if (!accessToken) {
      logger.error("No valid access token available");
      return null;
    }

    return new EmailSyncService(userId, emailAccount.id, accessToken);
  } catch (error) {
    logger.error("Error creating EmailSyncService:", error);
    return null;
  }
}

/**
 * Convenience function to sync emails for a contact
 */
export async function syncContactEmails(
  userId: string,
  emailAccountEmail: string,
  contactEmail: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const syncService = await createEmailSyncService(userId, emailAccountEmail);

  if (!syncService) {
    return {
      success: false,
      emailsSynced: 0,
      emailsCreated: 0,
      emailsUpdated: 0,
      error: "Failed to create sync service",
    };
  }

  return syncService.syncContactEmails(contactEmail, options);
}

/**
 * Convenience function to sync all emails for a user
 */
export async function syncAllEmails(
  userId: string,
  emailAccountEmail: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const syncService = await createEmailSyncService(userId, emailAccountEmail);

  if (!syncService) {
    return {
      success: false,
      emailsSynced: 0,
      emailsCreated: 0,
      emailsUpdated: 0,
      error: "Failed to create sync service",
    };
  }

  return syncService.syncFullAccount(options);
}
