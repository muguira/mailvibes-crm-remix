import React, { useMemo, useEffect, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import './email-renderer.css';

interface EmailRendererProps {
  bodyHtml?: string;
  bodyText?: string;
  subject?: string;
  emailId?: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    inline?: boolean;
    contentId?: string;
    storage_path?: string;
    storagePath?: string;
  }>;
  activityDetails?: {
    email_content?: {
      bodyHtml?: string;
      bodyText?: string;
    };
  };
}

const EmailRenderer: React.FC<EmailRendererProps> = ({ 
  bodyHtml, 
  bodyText, 
  subject, 
  emailId, 
  attachments = [],
  activityDetails 
}) => {
  const [hasError, setHasError] = useState(false);

  // Debug log for specific test email
  console.log('📧 [EmailRenderer] Component called:', {
    emailId,
    subject,
    hasBodyHtml: !!bodyHtml,
    hasBodyText: !!bodyText,
    attachmentsCount: attachments.length,
    activityDetails: !!activityDetails
  });

  // Enhanced attachment processing with better error handling
  const processedAttachments = useMemo(() => {
    return attachments.map(att => ({
      ...att,
      // Normalize filename and ensure it's safe
      filename: att.filename?.replace(/[<>:"/\\|?*]/g, '_') || 'attachment',
      // Validate MIME type
      mimeType: att.mimeType || 'application/octet-stream',
      // Ensure size is a number
      size: typeof att.size === 'number' ? att.size : 0
    }));
  }, [attachments]);

  // Enhanced HTML processing with better security and error handling
  const processedHtml = useMemo(() => {
    // Check for direct bodyHtml first, then fallback to activity details
    const htmlContent = bodyHtml || activityDetails?.email_content?.bodyHtml;
    if (!htmlContent || !htmlContent.trim()) return null;

    try {
      console.log('🔧 [EmailRenderer] Processing HTML content for email:', emailId);
      
      // First pass: Clean up problematic elements before DOMPurify
      let html = htmlContent
        // Remove all script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove all style tags with potentially dangerous content
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        // Remove all on* event handlers
        .replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '')
        // Replace cid: images with placeholders
        .replace(/src\s*=\s*["']cid:([^"']+)["']/gi, (match, fileId) => {
          const placeholderSvg = `
            <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2"/>
              <text x="150" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">📎 Image Attachment</text>
              <text x="150" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#9aa0a6">${fileId}</text>
              <text x="150" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#9aa0a6">ID: ${fileId.substring(0, 12)}...</text>
            </svg>
          `;
          return `src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(placeholderSvg)}"`;
        });

      // Enhanced DOMPurify configuration with better security
      const sanitizeConfig = {
        ALLOWED_TAGS: [
          // Text formatting
          'p', 'div', 'span', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins',
          // Lists
          'ul', 'ol', 'li', 'dl', 'dt', 'dd',
          // Headings
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          // Links and media
          'a', 'img',
          // Tables (essential for email layouts)
          'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption',
          // Layout
          'blockquote', 'pre', 'code', 'hr', 'address',
          // Email-specific
          'center', 'font'
        ],
        ALLOWED_ATTR: [
          // Standard attributes
          'href', 'target', 'rel', 'class', 'id', 'title', 'alt', 'lang', 'dir',
          // Styling (but not style to prevent script injection)
          'color', 'bgcolor', 'background',
          // Layout attributes
          'width', 'height', 'align', 'valign', 'cellpadding', 'cellspacing', 'border',
          // Image attributes
          'src', 'loading', 'crossorigin',
          // Table attributes
          'colspan', 'rowspan', 'scope',
          // Email-specific
          'size', 'face'
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        ADD_ATTR: ['target'],
        FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'iframe', 'frame', 'frameset', 'meta', 'link', 'base'],
        FORBID_ATTR: [
          'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur',
          'onsubmit', 'onchange', 'onkeydown', 'onkeyup', 'onkeypress', 'style',
          'sandbox', 'srcdoc', 'contenteditable', 'designmode', 'formaction'
        ],
        // Enhanced security options
        KEEP_CONTENT: true,
        SANITIZE_DOM: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_DOM_IMPORT: false,
        FORCE_BODY: false,
        WHOLE_DOCUMENT: false,
        // Additional security measures
        SAFE_FOR_TEMPLATES: true,
        SAFE_FOR_XML: true
      };

      // Add hooks to detect and log problematic content
      DOMPurify.addHook('uponSanitizeElement', (node, data) => {
        if (data.tagName === 'script' || data.tagName === 'iframe') {
          console.warn('[EmailRenderer] Removed potentially dangerous element:', data.tagName);
        }
      });

      DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
        if (data.attrName && data.attrName.startsWith('on')) {
          console.warn('[EmailRenderer] Removed event handler:', data.attrName);
        }
      });

      const sanitizedHtml = DOMPurify.sanitize(html, sanitizeConfig);
      
      // Clean up hooks after use
      DOMPurify.removeAllHooks();
      
      // Validate that we still have meaningful content after sanitization
      if (!sanitizedHtml || sanitizedHtml.trim().length < 10) {
        console.warn('[EmailRenderer] HTML content was heavily sanitized or empty');
        return null;
      }
      
      return sanitizedHtml;
    } catch (error) {
      console.error('Error processing email HTML:', error);
      setHasError(true);
      return null;
    }
  }, [bodyHtml, activityDetails?.email_content?.bodyHtml, processedAttachments, emailId]);

  // Simple error reset function
  const resetError = useCallback(() => {
    setHasError(false);
  }, []);

  // Render email content directly as HTML (no iframe)
  const renderEmailContent = () => {
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
            overflowWrap: 'break-word'
          }}
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      );
    }

    // Fallback to plain text
    const textContent = bodyText || activityDetails?.email_content?.bodyText;
    if (textContent && textContent.trim()) {
      // Convert plain text to HTML with basic formatting
      const formattedText = textContent
        .replace(/\n/g, '<br>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

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
           fontFamily: '-apple-system, BlinkMacSystemFont, "Segue UI", Roboto, sans-serif',
           whiteSpace: 'pre-wrap'
         }}
          dangerouslySetInnerHTML={{ __html: formattedText }}
        />
      );
    }

    // No content available
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
          fontStyle: 'italic'
        }}
      >
        No email content available
      </div>
    );
  };

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
            padding: '0 4px'
          }}
        >
          {subject}
        </div>
      )}
      
      <div className="email-body">
        {renderEmailContent()}
        
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
              marginTop: '8px'
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
                cursor: 'pointer'
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
            border: '1px solid #e5e7eb'
          }}
        >
          <h4 style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#374151', 
            marginBottom: '8px' 
          }}>
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
                borderBottom: index < processedAttachments.length - 1 ? '1px solid #e5e7eb' : 'none'
              }}
            >
              <span style={{ fontSize: '13px', color: '#374151' }}>
                {attachment.filename}
              </span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                {attachment.mimeType} ({Math.round(attachment.size / 1024)}KB)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmailRenderer; 