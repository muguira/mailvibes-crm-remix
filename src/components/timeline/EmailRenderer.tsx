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
                onClick={() => {
                  console.log('Download attachment:', attachment.filename)
                  // TODO: Implement download functionality
                }}
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
