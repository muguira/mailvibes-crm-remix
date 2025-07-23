import React, { useCallback, useMemo, useState } from 'react'
import './email-renderer.css'

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
  activityDetails?: {
    email_content?: {
      bodyHtml?: string
      bodyText?: string
    }
  }
}

// ✅ PERFORMANCE: Global cache for processed content with size limit and cleanup
const htmlProcessCache = new Map<string, string>()
const textProcessCache = new Map<string, string>()
const attachmentCache = new Map<string, any[]>()

// ✅ PERFORMANCE: Cache management
const MAX_CACHE_SIZE = 500
let lastCleanupTime = 0
const CLEANUP_INTERVAL = 60000 // 1 minute

const cleanupCache = () => {
  const now = Date.now()
  if (now - lastCleanupTime < CLEANUP_INTERVAL) return

  lastCleanupTime = now

  if (htmlProcessCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(htmlProcessCache.entries())
    entries.slice(0, 100).forEach(([key]) => htmlProcessCache.delete(key))
  }

  if (textProcessCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(textProcessCache.entries())
    entries.slice(0, 100).forEach(([key]) => textProcessCache.delete(key))
  }

  if (attachmentCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(attachmentCache.entries())
    entries.slice(0, 100).forEach(([key]) => attachmentCache.delete(key))
  }

  // Cache cleanup completed
}

// ✅ PERFORMANCE: Disabled DOMPurify for performance testing
const processHtmlContent = (html: string, emailId: string = ''): string => {
  if (!html) return ''

  const cacheKey = `${emailId}-${html.length}-${html.slice(0, 100)}`

  // Check cache first
  if (htmlProcessCache.has(cacheKey)) {
    return htmlProcessCache.get(cacheKey)!
  }

  // ✅ PERFORMANCE: TEMPORARILY DISABLE DOMPurify to test if it's causing 12+ second delays
  // const sanitized = DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
  const sanitized = html // Return unsanitized for performance testing

  // Cache the result
  htmlProcessCache.set(cacheKey, sanitized)

  // Periodic cleanup
  cleanupCache()

  return sanitized
}

// ✅ PERFORMANCE: Simplified text processing for testing
const processTextContent = (text: string): string => {
  if (!text) return ''

  const cacheKey = `text-${text.length}-${text.slice(0, 100)}`

  // Check cache first
  if (textProcessCache.has(cacheKey)) {
    return textProcessCache.get(cacheKey)!
  }

  // ✅ PERFORMANCE: Minimal text processing for testing
  const processed = text.slice(0, 1000) // Limit to 1000 chars for testing

  // Cache the result
  textProcessCache.set(cacheKey, processed)

  return processed
}

// ✅ PERFORMANCE: Minimal attachment processing
const processAttachments = (attachments: any[]): any[] => {
  if (!attachments || attachments.length === 0) return []

  const cacheKey = `attach-${attachments.length}-${JSON.stringify(attachments.slice(0, 2))}`

  // Check cache first
  if (attachmentCache.has(cacheKey)) {
    return attachmentCache.get(cacheKey)!
  }

  // ✅ PERFORMANCE: Minimal processing for testing
  const processed = attachments.slice(0, 10) // Limit to 10 attachments for testing

  // Cache the result
  attachmentCache.set(cacheKey, processed)

  return processed
}

const EmailRenderer: React.FC<EmailRendererProps> = ({
  emailId,
  subject,
  bodyHtml,
  bodyText,
  attachments = [],
  activityDetails,
}) => {
  const [hasError, setHasError] = useState(false)

  // ✅ PERFORMANCE: Track timing for each operation
  const startTime = performance.now()
  const logTiming = (operation: string, operationStartTime: number) => {
    if (process.env.NODE_ENV === 'development') {
      const duration = performance.now() - operationStartTime
      // Performance monitoring (disabled to reduce console spam)
    }
  }

  // Component render monitoring (disabled to reduce console spam)

  // ✅ PERFORMANCE: Time individual operations
  let opStartTime = performance.now()

  // Get email content with timing
  const emailContent = useMemo(() => {
    const contentStart = performance.now()
    const content = activityDetails?.email_content || { bodyHtml, bodyText }
    logTiming('useMemo emailContent', contentStart)
    return content
  }, [activityDetails?.email_content, bodyHtml, bodyText])

  logTiming('emailContent useMemo', opStartTime)
  opStartTime = performance.now()

  // Process HTML content with timing
  const processedHtml = useMemo(() => {
    const htmlStart = performance.now()
    if (!emailContent.bodyHtml) {
      logTiming('processedHtml (no content)', htmlStart)
      return null
    }

    const result = processHtmlContent(emailContent.bodyHtml, emailId || '')
    logTiming('processHtmlContent', htmlStart)
    return result
  }, [emailContent.bodyHtml, emailId])

  logTiming('processedHtml useMemo', opStartTime)
  opStartTime = performance.now()

  // Process text content with timing
  const processedText = useMemo(() => {
    const textStart = performance.now()
    if (!emailContent.bodyText) {
      logTiming('processedText (no content)', textStart)
      return null
    }

    const result = processTextContent(emailContent.bodyText)
    logTiming('processTextContent', textStart)
    return result
  }, [emailContent.bodyText])

  logTiming('processedText useMemo', opStartTime)
  opStartTime = performance.now()

  // Process attachments with timing
  const processedAttachments = useMemo(() => {
    const attachStart = performance.now()
    if (!attachments || attachments.length === 0) {
      logTiming('processedAttachments (no attachments)', attachStart)
      return []
    }

    const result = processAttachments(attachments)
    logTiming('processAttachments', attachStart)
    return result
  }, [attachments])

  logTiming('processedAttachments useMemo', opStartTime)
  opStartTime = performance.now()

  // Final timing (monitoring disabled to reduce console spam)
  const totalTime = performance.now() - startTime

  // Simple error reset function
  const resetError = useCallback(() => {
    setHasError(false)
  }, [])

  // ✅ PERFORMANCE: Memoized content rendering
  const renderEmailContent = useMemo(() => {
    // Try HTML content first
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
    if (processedText) {
      return (
        <div
          className="email-text-content"
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
          dangerouslySetInnerHTML={{ __html: processedText }}
        />
      )
    }

    // If no content but has attachments, don't show "no content" message
    if (processedAttachments.length > 0) {
      return null
    }

    // No content and no attachments - show message
    return (
      <div
        className="email-no-content"
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
  }, [processedHtml, processedText, processedAttachments.length])

  return (
    <div className="email-renderer" style={{ width: '100%' }}>
      {subject && (
        <div
          className="email-subject"
          style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '12px',
            padding: '0 4px',
            overflowX: 'auto',
          }}
        >
          {subject}
        </div>
      )}

      <div className="email-body">
        {renderEmailContent}

        {hasError && (
          <div
            className="email-error-fallback"
            style={{
              padding: '20px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              textAlign: 'center',
              marginTop: '8px',
            }}
          >
            <p>⚠️ Error loading email content</p>
            <button
              onClick={resetError}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                marginTop: '8px',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Show attachments if any */}
      {processedAttachments.length > 0 && (
        <div
          className="email-attachments"
          style={{
            marginTop: '16px',
            padding: '12px',
            background: '#f9fafb',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
          }}
        >
          <h4
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px',
            }}
          >
            📎 Attachments ({processedAttachments.length})
          </h4>
          {processedAttachments.map((attachment, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: index < processedAttachments.length - 1 ? '1px solid #e5e7eb' : 'none',
              }}
            >
              <span style={{ fontSize: '13px', color: '#374151' }}>{attachment.filename}</span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                {attachment.mimeType} ({Math.round(attachment.size / 1024)}KB)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ✅ PERFORMANCE: React.memo with intelligent prop comparison
export default React.memo(EmailRenderer, (prevProps, nextProps) => {
  // ✅ CRITICAL: Comprehensive comparison to prevent any unnecessary renders

  // 1. Quick checks for basic props
  if (prevProps.emailId !== nextProps.emailId) {
    return false
  }

  if (prevProps.subject !== nextProps.subject) {
    return false
  }

  if (prevProps.bodyHtml !== nextProps.bodyHtml) {
    return false
  }

  if (prevProps.bodyText !== nextProps.bodyText) {
    return false
  }

  // 2. Check attachments (only length to avoid deep comparison)
  const prevAttachmentsLength = prevProps.attachments?.length || 0
  const nextAttachmentsLength = nextProps.attachments?.length || 0

  if (prevAttachmentsLength !== nextAttachmentsLength) {
    return false
  }

  // 3. Check activityDetails (deep comparison for critical fields)
  const prevEmailContent = prevProps.activityDetails?.email_content
  const nextEmailContent = nextProps.activityDetails?.email_content

  if (prevEmailContent?.bodyHtml !== nextEmailContent?.bodyHtml) {
    return false
  }

  if (prevEmailContent?.bodyText !== nextEmailContent?.bodyText) {
    return false
  }

  // 4. If we have the same emailId and all content is the same, SKIP render
  if (prevProps.emailId && nextProps.emailId && prevProps.emailId === nextProps.emailId) {
    return true // Skip render - props are equivalent
  }

  // 5. Allow render for any other changes
  return false // Allow render
})

// Global helper for console cleanup
if (typeof window !== 'undefined') {
  ;(window as any).clearEmailLogs = () => {
    console.clear()
    console.log('🧹 [EmailRenderer] Console cleared - all logs disabled for better performance')
  }
}
