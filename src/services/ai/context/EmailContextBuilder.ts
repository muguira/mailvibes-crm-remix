import { EmailThreadContext, EmailReplyContext, AutocompleteContext, ContactInfo } from '../providers/base/types'
import { TimelineActivity } from '@/hooks/use-timeline-activities-v2'
import { logger } from '@/utils/logger'

export class EmailContextBuilder {
  /**
   * Build context for email thread summarization
   */
  buildThreadContext(emails: TimelineActivity[], contactInfo: ContactInfo): EmailThreadContext {
    // Filter and sort emails by timestamp
    const emailActivities = emails
      .filter(
        activity =>
          activity.source === 'gmail' &&
          (activity.type === 'email' || activity.type === 'email_thread' || activity.type === 'email_sent'),
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Convert timeline activities to email format
    const processedEmails = emailActivities.map(activity => ({
      id: activity.id,
      subject: activity.subject || 'No Subject',
      from: activity.from || { email: 'unknown', name: 'Unknown' },
      to: activity.to || [{ email: contactInfo.email, name: contactInfo.name }],
      date: activity.timestamp,
      bodyText: activity.bodyText,
      bodyHtml: activity.bodyHtml,
      snippet: activity.snippet || this.extractSnippet(activity.bodyText || activity.bodyHtml || ''),
    }))

    // Get thread ID from the first email or create one
    const threadId = emailActivities[0]?.threadId || emailActivities[0]?.id || `thread-${contactInfo.email}`

    logger.log('[EmailContextBuilder] Built thread context:', {
      emailCount: processedEmails.length,
      threadId,
      contactEmail: contactInfo.email,
      dateRange:
        processedEmails.length > 0
          ? {
              from: processedEmails[0].date,
              to: processedEmails[processedEmails.length - 1].date,
            }
          : null,
    })

    return {
      emails: processedEmails,
      contact: contactInfo,
      threadId,
      totalEmailsCount: processedEmails.length,
    }
  }

  /**
   * Build context for email reply generation
   */
  buildReplyContext(
    originalEmail: TimelineActivity,
    conversationHistory: TimelineActivity[],
    contactInfo: ContactInfo,
    replyType: 'positive' | 'negative' | 'custom',
  ): EmailReplyContext {
    // Process the original email
    const processedOriginalEmail = {
      id: originalEmail.id,
      subject: originalEmail.subject || 'No Subject',
      from: originalEmail.from || { email: contactInfo.email, name: contactInfo.name },
      to: originalEmail.to || [{ email: 'user@example.com', name: 'User' }],
      date: originalEmail.timestamp,
      bodyText: originalEmail.bodyText,
      bodyHtml: originalEmail.bodyHtml,
      snippet: originalEmail.snippet || this.extractSnippet(originalEmail.bodyText || originalEmail.bodyHtml || ''),
    }

    // Process conversation history (recent emails for context)
    const recentHistory = conversationHistory
      .filter(
        activity =>
          activity.source === 'gmail' &&
          (activity.type === 'email' || activity.type === 'email_thread' || activity.type === 'email_sent'),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5) // Last 5 emails for context
      .map(activity => ({
        id: activity.id,
        subject: activity.subject || 'No Subject',
        from: activity.from || { email: 'unknown', name: 'Unknown' },
        date: activity.timestamp,
        snippet: activity.snippet || this.extractSnippet(activity.bodyText || activity.bodyHtml || ''),
      }))

    logger.log('[EmailContextBuilder] Built reply context:', {
      originalEmailId: originalEmail.id,
      replyType,
      historyCount: recentHistory.length,
      contactEmail: contactInfo.email,
    })

    return {
      originalEmail: processedOriginalEmail,
      contact: contactInfo,
      conversationHistory: recentHistory,
      replyType,
    }
  }

  /**
   * Build context for autocompletion
   */
  buildAutocompleteContext(
    partialText: string,
    cursorPosition: number,
    emailBeingReplied: TimelineActivity | undefined,
    conversationHistory: TimelineActivity[],
    contactInfo: ContactInfo,
  ): AutocompleteContext {
    // Process the email being replied to (if any)
    const processedEmailBeingReplied = emailBeingReplied
      ? {
          subject: emailBeingReplied.subject || 'No Subject',
          from: emailBeingReplied.from || { email: contactInfo.email, name: contactInfo.name },
          snippet:
            emailBeingReplied.snippet ||
            this.extractSnippet(emailBeingReplied.bodyText || emailBeingReplied.bodyHtml || ''),
        }
      : undefined

    // Process recent conversation history for context
    const recentHistory = conversationHistory
      .filter(
        activity =>
          activity.source === 'gmail' &&
          (activity.type === 'email' || activity.type === 'email_thread' || activity.type === 'email_sent'),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3) // Last 3 emails for context
      .map(activity => ({
        subject: activity.subject || 'No Subject',
        from: activity.from || { email: 'unknown', name: 'Unknown' },
        snippet: activity.snippet || this.extractSnippet(activity.bodyText || activity.bodyHtml || ''),
      }))

    logger.log('[EmailContextBuilder] Built autocomplete context:', {
      partialTextLength: partialText.length,
      cursorPosition,
      hasEmailBeingReplied: !!emailBeingReplied,
      historyCount: recentHistory.length,
      contactEmail: contactInfo.email,
    })

    return {
      partialText,
      cursorPosition,
      emailBeingReplied: processedEmailBeingReplied,
      conversationHistory: recentHistory,
      contact: contactInfo,
    }
  }

  /**
   * Convert timeline activity to contact info
   */
  extractContactInfo(activity: TimelineActivity, fallbackEmail?: string): ContactInfo {
    const email = activity.from?.email || fallbackEmail || 'unknown@example.com'
    const name = activity.from?.name || this.extractNameFromEmail(email)

    return {
      id: activity.id,
      name,
      email,
      // Note: company and phone would need to come from contact data if available
    }
  }

  /**
   * Extract contact info from multiple activities (find most complete info)
   */
  extractBestContactInfo(activities: TimelineActivity[], contactEmail: string): ContactInfo {
    // Find the most recent activity with complete contact info
    const contactActivity = activities
      .filter(
        activity =>
          activity.from?.email === contactEmail || activity.to?.some(recipient => recipient.email === contactEmail),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .find(activity => activity.from?.name && activity.from?.name.trim().length > 0)

    if (contactActivity?.from?.email === contactEmail) {
      return {
        id: contactActivity.id,
        name: contactActivity.from.name || this.extractNameFromEmail(contactEmail),
        email: contactEmail,
      }
    }

    // Find in recipients
    const recipientInfo = activities
      .flatMap(activity => activity.to || [])
      .find(recipient => recipient.email === contactEmail)

    return {
      id: activities[0]?.id || 'unknown',
      name: recipientInfo?.name || this.extractNameFromEmail(contactEmail),
      email: contactEmail,
    }
  }

  /**
   * Extract text snippet from HTML or text content
   */
  private extractSnippet(content: string, maxLength: number = 200): string {
    if (!content) return ''

    // Remove HTML tags if present
    const textContent = content.replace(/<[^>]*>/g, ' ')

    // Clean up whitespace
    const cleanText = textContent.replace(/\s+/g, ' ').trim()

    // Truncate if needed
    if (cleanText.length <= maxLength) {
      return cleanText
    }

    return cleanText.substring(0, maxLength - 3) + '...'
  }

  /**
   * Extract a readable name from email address
   */
  private extractNameFromEmail(email: string): string {
    const localPart = email.split('@')[0]

    // Convert dots, underscores, and hyphens to spaces
    const cleanName = localPart
      .replace(/[._-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')

    return cleanName || email
  }

  /**
   * Validate that we have enough context for AI operations
   */
  validateThreadContext(context: EmailThreadContext): boolean {
    if (!context.contact?.email) {
      logger.warn('[EmailContextBuilder] Missing contact email in thread context')
      return false
    }

    if (context.emails.length === 0) {
      logger.warn('[EmailContextBuilder] No emails in thread context')
      return false
    }

    return true
  }

  validateReplyContext(context: EmailReplyContext): boolean {
    if (!context.contact?.email) {
      logger.warn('[EmailContextBuilder] Missing contact email in reply context')
      return false
    }

    if (!context.originalEmail?.subject && !context.originalEmail?.snippet) {
      logger.warn('[EmailContextBuilder] Original email has no content to reply to')
      return false
    }

    return true
  }

  validateAutocompleteContext(context: AutocompleteContext): boolean {
    if (!context.contact?.email) {
      logger.warn('[EmailContextBuilder] Missing contact email in autocomplete context')
      return false
    }

    if (!context.partialText || context.partialText.trim().length === 0) {
      logger.warn('[EmailContextBuilder] No partial text for autocompletion')
      return false
    }

    return true
  }
}
