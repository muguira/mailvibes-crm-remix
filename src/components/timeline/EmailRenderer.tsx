import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { downloadGmailAttachment } from '@/services/google/gmailApi'
import { logger } from '@/utils/logger'
import DOMPurify from 'dompurify'
import React, { useEffect, useMemo, useRef, useState } from 'react'

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
    id?: string
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
  const [processedHtml, setProcessedHtml] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const processedBlobUrls = useRef<string[]>([]) // Track blob URLs for cleanup
  const processedContentCache = useRef<Map<string, string>>(new Map()) // Cache processed content

  // Helper function to safely encode UTF-8 strings to base64
  const utf8ToBase64 = (str: string): string => {
    try {
      // Convert string to UTF-8 bytes, then to base64
      return btoa(unescape(encodeURIComponent(str)))
    } catch (error) {
      // Fallback: remove non-Latin1 characters and try again
      const latin1Safe = str.replace(/[^\x00-\xFF]/g, '')
      return btoa(latin1Safe)
    }
  }

  // Configure DOMPurify for safe HTML rendering
  const sanitizeConfig = useMemo(
    () => ({
      ALLOWED_TAGS: [
        'p',
        'div',
        'span',
        'br',
        'strong',
        'b',
        'em',
        'i',
        'u',
        'a',
        'ul',
        'ol',
        'li',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'blockquote',
        'pre',
        'code',
        'table',
        'thead',
        'tbody',
        'tr',
        'td',
        'th',
        'img',
        'hr',
      ],
      ALLOWED_ATTR: [
        'href',
        'target',
        'rel',
        'class',
        'style',
        'id',
        'title',
        'alt',
        'src',
        'width',
        'height',
        'border',
        'cellpadding',
        'cellspacing',
      ],
      ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|data|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      ADD_ATTR: ['target'],
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
    }),
    [],
  )

  // Process CID references in HTML content
  useEffect(() => {
    const processCidReferences = async () => {
      if (!bodyHtml || !bodyHtml.trim()) {
        setProcessedHtml(null)
        return
      }

      // Create cache key from body HTML and attachments
      const cacheKey = `${emailId}-${bodyHtml.length}-${JSON.stringify(attachments?.map(a => ({ id: a.id, contentId: a.contentId })))}`

      // Check if we already processed this exact content
      if (processedContentCache.current.has(cacheKey)) {
        const cachedResult = processedContentCache.current.get(cacheKey)!
        setProcessedHtml(cachedResult)
        return
      }

      logger.info(`[EmailRenderer] Starting CID processing for "${subject}"`)
      logger.info(`[EmailRenderer] EmailId: ${emailId}`)
      logger.info(`[EmailRenderer] BodyHtml preview:`, bodyHtml.substring(0, 500) + '...')

      setIsProcessing(true)
      let processedContent = bodyHtml

      // Check for any CID references in the HTML
      const cidReferences = bodyHtml.match(/src=["']?cid:[^"'\s>]+["']?/gi) || []
      logger.info(`[EmailRenderer] Found ${cidReferences.length} CID references in HTML:`, cidReferences)

      // Process inline images with cid: references
      if (attachments && attachments.length > 0) {
        // Debug all attachments first
        logger.info(`[EmailRenderer] All ${attachments.length} attachments for "${subject}":`)
        attachments.forEach((att, index) => {
          logger.info(`[EmailRenderer] Attachment ${index}:`, {
            filename: att.filename,
            mimeType: att.mimeType,
            size: att.size,
            inline: att.inline,
            contentId: att.contentId,
            id: att.id,
            storage_path: att.storage_path,
            storagePath: att.storagePath,
          })
        })

        const inlineAttachments = attachments.filter(att => att.inline && att.contentId)
        const attachmentsWithContentId = attachments.filter(att => att.contentId)

        logger.info(`[EmailRenderer] Processing ${inlineAttachments.length} inline attachments for "${subject}"`)
        logger.info(`[EmailRenderer] ${attachmentsWithContentId.length} attachments have contentId`)

        if (inlineAttachments.length === 0 && attachmentsWithContentId.length > 0) {
          logger.warn(`[EmailRenderer] Found attachments with contentId but not marked as inline - trying them anyway`)
        }

        // Process both inline attachments AND attachments with contentId (some emails don't mark them as inline properly)
        const attachmentsToProcess = inlineAttachments.length > 0 ? inlineAttachments : attachmentsWithContentId

        for (const attachment of attachmentsToProcess) {
          const contentId = attachment.contentId
          if (!contentId) continue

          // Find cid: references in various formats
          const cidPatterns = [
            new RegExp(`src=["']cid:${contentId}["']`, 'gi'),
            new RegExp(`src=["']cid:${contentId.replace(/[<>]/g, '')}["']`, 'gi'),
            new RegExp(`src=cid:${contentId}`, 'gi'),
            new RegExp(`src=cid:${contentId.replace(/[<>]/g, '')}`, 'gi'),
          ]

          for (const pattern of cidPatterns) {
            if (pattern.test(processedContent)) {
              logger.info(`[EmailRenderer] Found CID reference for: ${contentId}`)

              // Check if we have a storage path for this attachment
              const storagePath = attachment.storage_path || attachment.storagePath

              logger.info(`[EmailRenderer] Attachment details for ${contentId}:`, {
                contentId,
                storagePath,
                attachment,
              })

              if (storagePath) {
                try {
                  // Create Supabase Storage signed URL (valid for 1 hour)
                  const { data, error } = await supabase.storage
                    .from('email-attachments')
                    .createSignedUrl(storagePath, 3600) // 1 hour expiry

                  if (error) {
                    logger.error(`[EmailRenderer] Error creating signed URL for ${storagePath}:`, error)
                    // Fallback to placeholder
                    const svgContent = `<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
                        <rect width="200" height="100" fill="#fef3c7" stroke="#f59e0b" stroke-width="1"/>
                        <text x="100" y="45" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#92400e">Storage Error</text>
                        <text x="100" y="65" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="#b45309">${attachment.filename || 'Image not available'}</text>
                      </svg>`
                    const placeholderSvg = `data:image/svg+xml;base64,${utf8ToBase64(svgContent)}`
                    processedContent = processedContent.replace(pattern, `src="${placeholderSvg}"`)
                  } else {
                    const imageUrl = data.signedUrl
                    logger.info(`[EmailRenderer] Replacing CID with Supabase signed URL: ${imageUrl}`)
                    processedContent = processedContent.replace(pattern, `src="${imageUrl}"`)
                  }
                } catch (error) {
                  logger.error(`[EmailRenderer] Exception creating signed URL:`, error)
                  const svgContent = `<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
                      <rect width="200" height="100" fill="#fef3c7" stroke="#f59e0b" stroke-width="1"/>
                      <text x="100" y="45" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#92400e">Storage Error</text>
                      <text x="100" y="65" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="#b45309">${attachment.filename || 'Image not available'}</text>
                    </svg>`
                  const placeholderSvg = `data:image/svg+xml;base64,${utf8ToBase64(svgContent)}`
                  processedContent = processedContent.replace(pattern, `src="${placeholderSvg}"`)
                }
              } else if (emailId && attachment.id) {
                // Try to download inline image directly from Gmail API
                try {
                  logger.info(`[EmailRenderer] Attempting direct Gmail download for inline image: ${contentId}`)

                  // Get email data with gmail_id from database
                  const { data: emailData, error: emailError } = await supabase
                    .from('emails')
                    .select('gmail_id, user_id, email_account_id')
                    .eq('gmail_id', emailId)
                    .single()

                  if (emailError || !emailData?.gmail_id) {
                    throw new Error('Gmail message ID not found')
                  }

                  // Get access token for Gmail API
                  const { data: tokenData, error: tokenError } = await supabase
                    .from('oauth_tokens')
                    .select('access_token')
                    .eq('email_account_id', emailData.email_account_id)
                    .single()

                  if (tokenError || !tokenData?.access_token) {
                    throw new Error('Unable to authenticate with Gmail')
                  }

                  // Download attachment from Gmail API
                  const gmailResponse = await fetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailData.gmail_id}/attachments/${attachment.id}`,
                    {
                      headers: {
                        Authorization: `Bearer ${tokenData.access_token}`,
                        'Content-Type': 'application/json',
                      },
                    },
                  )

                  if (gmailResponse.ok) {
                    const attachmentData = await gmailResponse.json()

                    if (attachmentData.data) {
                      // Decode base64url data to binary
                      const base64Data = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/')
                      const paddedBase64 = base64Data + '='.repeat((4 - (base64Data.length % 4)) % 4)

                      // Create blob URL for inline image
                      const binaryString = atob(paddedBase64)
                      const bytes = new Uint8Array(binaryString.length)
                      for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i)
                      }

                      const blob = new Blob([bytes], { type: attachment.mimeType || 'image/jpeg' })
                      const imageUrl = URL.createObjectURL(blob)

                      // Track blob URL for cleanup
                      processedBlobUrls.current.push(imageUrl)

                      logger.info(`[EmailRenderer] Successfully created blob URL for inline image: ${contentId}`)
                      processedContent = processedContent.replace(pattern, `src="${imageUrl}"`)

                      continue
                    }
                  }

                  throw new Error('Failed to download from Gmail API')
                } catch (downloadError) {
                  logger.warn(`[EmailRenderer] Failed to download inline image directly: ${downloadError}`)

                  // Fallback to placeholder
                  const svgContent = `<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
                      <rect width="200" height="100" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>
                      <text x="100" y="45" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#6b7280">Inline Image</text>
                      <text x="100" y="65" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="#9ca3af">${attachment.filename || 'Image not available'}</text>
                    </svg>`
                  const placeholderSvg = `data:image/svg+xml;base64,${utf8ToBase64(svgContent)}`

                  logger.info(`[EmailRenderer] Replacing CID with placeholder for: ${contentId}`)
                  processedContent = processedContent.replace(pattern, `src="${placeholderSvg}"`)
                }
              } else {
                // Replace with placeholder for broken inline images (using safe UTF-8 encoding)
                const svgContent = `<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="100" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>
                    <text x="100" y="45" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#6b7280">Inline Image</text>
                    <text x="100" y="65" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="#9ca3af">${attachment.filename || 'Image not available'}</text>
                  </svg>`
                const placeholderSvg = `data:image/svg+xml;base64,${utf8ToBase64(svgContent)}`

                logger.info(`[EmailRenderer] Replacing CID with placeholder for: ${contentId}`)
                processedContent = processedContent.replace(pattern, `src="${placeholderSvg}"`)
              }
            }
          }
        }
      }

      // Replace any remaining unprocessed cid: references with generic placeholder
      const remainingCidPattern = /src=["']?cid:[^"'\s>]+["']?/gi
      if (remainingCidPattern.test(processedContent)) {
        logger.warn(`[EmailRenderer] Found unprocessed CID references in "${subject}"`)

        const genericSvgContent = `<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="100" fill="#fef3c7" stroke="#f59e0b" stroke-width="1"/>
            <text x="100" y="45" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#92400e">Image</text>
            <text x="100" y="65" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="#b45309">Content not loaded</text>
          </svg>`
        const genericPlaceholder = `data:image/svg+xml;base64,${utf8ToBase64(genericSvgContent)}`

        processedContent = processedContent.replace(remainingCidPattern, `src="${genericPlaceholder}"`)
      }

      // Sanitize the processed HTML
      try {
        const sanitizedHtml = DOMPurify.sanitize(processedContent, sanitizeConfig)

        // Check if sanitized HTML has meaningful content
        if (sanitizedHtml && sanitizedHtml.trim() !== '') {
          setProcessedHtml(sanitizedHtml)
          // Cache the result
          processedContentCache.current.set(cacheKey, sanitizedHtml)
        } else {
          setProcessedHtml(null)
          processedContentCache.current.set(cacheKey, '')
        }
      } catch (error) {
        logger.error(`[EmailRenderer] Error sanitizing HTML for "${subject}":`, error)
        setProcessedHtml(null)
        processedContentCache.current.set(cacheKey, '')
      }

      setIsProcessing(false)
    }

    processCidReferences()
  }, [bodyHtml, attachments, subject, sanitizeConfig, utf8ToBase64, emailId])

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      processedBlobUrls.current.forEach(url => {
        URL.revokeObjectURL(url)
      })
      processedBlobUrls.current = []
    }
  }, [])

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
          .eq('gmail_id', emailId)
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
          attachment.id,
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

  const hasAttachments = attachments && attachments.length > 0

  const renderContent = () => {
    // Try to render processed HTML first if available
    if (processedHtml) {
      return (
        <div
          className="email-html-content"
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
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      )
    }

    // Fallback to plain text
    if (bodyText && bodyText.trim()) {
      return (
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
      )
    }

    // No content available
    return (
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
    )
  }

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
      <div style={{ marginBottom: '16px' }}>{renderContent()}</div>

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
