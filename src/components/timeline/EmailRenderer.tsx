import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { downloadGmailAttachment } from '@/services/google/gmailApi'
import { logger } from '@/utils/logger'
import React from 'react'

interface EmailRendererProps {
  bodyHtml?: string
  bodyText?: string
  subject?: string
  emailId?: string
  attachments?: Array<{
    filename: string
    mimeType: string
    size: number
    inline?: boolean
    contentId?: string
    storage_path?: string
    storagePath?: string
  }>
  activityDetails?: any
}

const EmailRenderer: React.FC<EmailRendererProps> = ({
  emailId,
  subject,
  bodyHtml,
  bodyText,
  attachments,
  activityDetails,
}) => {
  const { toast } = useToast()

  // Function to download attachment
  const downloadAttachment = async (attachment: any) => {
    try {
      logger.info(`[EmailRenderer] Starting download for: ${attachment.filename}`)
      logger.info(`[EmailRenderer] Attachment data:`, {
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        id: attachment.id,
        storage_path: attachment.storage_path,
        storagePath: attachment.storagePath,
        emailId: emailId,
      })

      // Check if we have a storage path (image stored in Supabase)
      const storagePath = attachment.storage_path || attachment.storagePath

      if (storagePath) {
        logger.info(`[EmailRenderer] Using Supabase Storage path: ${storagePath}`)
        // Download from Supabase Storage
        const { data, error } = await supabase.storage.from('email-attachments').download(storagePath)

        if (error) {
          logger.error(`[EmailRenderer] Supabase download error:`, error)
          throw error
        }

        if (data) {
          // Create blob URL and trigger download
          const url = window.URL.createObjectURL(data)
          const link = document.createElement('a')
          link.href = url
          link.download = attachment.filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)

          toast({
            title: '✅ Download started',
            description: `${attachment.filename} is being downloaded`,
            duration: 3000,
          })

          logger.info(`[EmailRenderer] Successfully downloaded from Supabase: ${attachment.filename}`)
          return
        }
      } else {
        logger.info(`[EmailRenderer] No storage path found, attempting Gmail API download`)
      }

      // Fallback: Download from Gmail API using attachment and message IDs
      if (emailId && attachment.id) {
        logger.info(`[EmailRenderer] Attempting Gmail API download for: ${attachment.filename}`)
        logger.info(`[EmailRenderer] Using emailId: ${emailId}, attachmentId: ${attachment.id}`)

        // Get email data with gmail_id from database
        const { data: emailData, error: emailError } = await supabase
          .from('emails')
          .select('gmail_id, user_id, email_account_id')
          .eq('gmail_id', emailId) // FIX: emailId is actually the Gmail message ID, not the table ID
          .single()

        logger.info(`[EmailRenderer] Database query result:`, { emailData, emailError })

        if (emailError) {
          logger.error(`[EmailRenderer] Error fetching email data:`, emailError)
          throw new Error('Unable to find email information')
        }

        if (!emailData?.gmail_id) {
          throw new Error('Gmail message ID not found')
        }

        // Get access token for Gmail API using email_account_id
        const { data: tokenData, error: tokenError } = await supabase
          .from('oauth_tokens')
          .select('access_token')
          .eq('email_account_id', emailData.email_account_id)
          .single()

        logger.info(`[EmailRenderer] Token query result:`, {
          hasToken: !!tokenData?.access_token,
          tokenError,
          userId: emailData.user_id,
        })

        if (tokenError || !tokenData?.access_token) {
          logger.error(`[EmailRenderer] Error getting access token:`, tokenError)
          throw new Error('Unable to authenticate with Gmail')
        }

        // Download attachment from Gmail API
        logger.info(`[EmailRenderer] Calling downloadGmailAttachment with:`, {
          messageId: emailData.gmail_id,
          attachmentId: attachment.id,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
        })

        const blob = await downloadGmailAttachment(
          tokenData.access_token,
          emailData.gmail_id,
          attachment.id, // This should be the gmail_attachment_id
          attachment.filename,
          attachment.mimeType,
        )

        logger.info(`[EmailRenderer] Gmail API download successful, blob size: ${blob.size}`)

        // Create download link
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = attachment.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast({
          title: '✅ Download completed',
          description: `${attachment.filename} has been downloaded`,
          duration: 3000,
        })

        logger.info(`[EmailRenderer] Successfully downloaded from Gmail API: ${attachment.filename}`)
        return
      } else {
        logger.warn(`[EmailRenderer] Missing required data:`, {
          hasEmailId: !!emailId,
          hasAttachmentId: !!attachment.id,
          emailId,
          attachmentId: attachment.id,
        })
      }

      // If we reach here, we don't have enough information
      toast({
        title: '📎 Attachment info',
        description: `${attachment.filename} (${Math.round(attachment.size / 1024)}KB) - Unable to download: missing attachment ID`,
        duration: 4000,
      })

      logger.warn(`[EmailRenderer] Cannot download - missing emailId or attachment.id:`, {
        emailId,
        attachmentId: attachment.id,
        filename: attachment.filename,
      })
    } catch (error) {
      logger.error(`[EmailRenderer] Download failed for ${attachment.filename}:`, error)

      toast({
        title: '❌ Download failed',
        description: `Unable to download ${attachment.filename}. ${error instanceof Error ? error.message : 'Please try again.'}`,
        variant: 'destructive',
        duration: 4000,
      })
    }
  }

  // Debug: Log when we receive attachments (DISABLED to prevent spam)
  // if (attachments && attachments.length > 0) {
  //   console.log(`✅ [EmailRenderer] Found ${attachments.length} attachments for "${subject}"`)
  // }

  const hasAttachments = attachments && attachments.length > 0

  // Debug: Log hasAttachments calculation (DISABLED to prevent spam)
  // if (attachments) {
  //   console.log(`🔍 [EmailRenderer] hasAttachments calculation for "${subject}":`)
  // }

  return (
    <div style={{ width: '100%' }}>
      {/* Email Subject */}
      {subject && (
        <div
          style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '12px',
            padding: '0 4px',
          }}
        >
          {subject}
        </div>
      )}

      {/* Email Body */}
      <div style={{ marginBottom: '16px' }}>
        {bodyHtml ? (
          <div
            style={{
              width: '100%',
              minHeight: '160px',
              background: '#fff',
              borderRadius: '4px',
              padding: '16px',
              lineHeight: '1.6',
              fontSize: '14px',
              color: '#374151',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
            }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : bodyText ? (
          <div
            style={{
              width: '100%',
              minHeight: '160px',
              background: '#fff',
              borderRadius: '4px',
              padding: '16px',
              lineHeight: '1.6',
              fontSize: '14px',
              color: '#374151',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              whiteSpace: 'pre-wrap',
            }}
          >
            {bodyText}
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              minHeight: '100px',
              background: '#f9fafb',
              borderRadius: '4px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              fontStyle: 'italic',
            }}
          >
            No email content available
          </div>
        )}
      </div>

      {/* Email Attachments */}
      {hasAttachments && (
        <div
          style={{
            borderTop: '1px solid #e5e7eb',
            paddingTop: '12px',
            marginTop: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                color: '#6b7280',
                fontWeight: 'normal',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              📎 {attachments.length} {attachments.length > 1 ? 'files' : 'file'}:
            </span>
            {attachments.map((attachment, index) => (
              <button
                key={index}
                onClick={() => downloadAttachment(attachment)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  textDecoration: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#0891b2'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#6b7280'
                }}
                title={`Download ${attachment.filename} (${Math.round(attachment.size / 1024)}KB)`}
              >
                {attachment.filename}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailRenderer
