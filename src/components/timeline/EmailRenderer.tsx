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

// ✅ PERFORMANCE: Global cache for processed HTML to avoid re-processing same content
const htmlProcessCache = new Map<string, string>();
const textProcessCache = new Map<string, string>();
const attachmentCache = new Map<string, any[]>();

// Cache cleanup to prevent memory leaks
const MAX_CACHE_SIZE = 500;
const cleanupCache = (cache: Map<string, any>) => {
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries());
    // Keep only the most recent half
    const toKeep = entries.slice(-Math.floor(MAX_CACHE_SIZE / 2));
    cache.clear();
    toKeep.forEach(([key, value]) => cache.set(key, value));
  }
};

// ✅ PERFORMANCE: Move DOMPurify config outside component to avoid recreation
const DOMPURIFY_CONFIG = {
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

// ✅ PERFORMANCE: Optimized HTML processing function with caching
const processHtmlContent = (htmlContent: string, emailId?: string): string | null => {
  if (!htmlContent || !htmlContent.trim()) return null;

  // Create cache key based on content hash and length for uniqueness
  const contentHash = htmlContent.length + '_' + htmlContent.substring(0, 50).replace(/\s/g, '');
  const cacheKey = emailId ? `${emailId}_${contentHash}` : contentHash;

  // Check cache first
  if (htmlProcessCache.has(cacheKey)) {
    return htmlProcessCache.get(cacheKey);
  }

  try {
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

    const sanitizedHtml = DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
    
    // Validate that we still have meaningful content after sanitization
    if (!sanitizedHtml || sanitizedHtml.trim().length < 10) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('[EmailRenderer] HTML content was heavily sanitized or empty');
      }
      return null;
    }
    
    // Cache the result
    htmlProcessCache.set(cacheKey, sanitizedHtml);
    cleanupCache(htmlProcessCache);
    
    return sanitizedHtml;
  } catch (error) {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error processing email HTML:', error);
    }
    return null;
  }
};

// ✅ PERFORMANCE: Optimized text processing with caching
const processTextContent = (textContent: string): string => {
  if (!textContent || !textContent.trim()) return '';

  const cacheKey = textContent.length + '_' + textContent.substring(0, 50);
  
  if (textProcessCache.has(cacheKey)) {
    return textProcessCache.get(cacheKey);
  }

  // Convert plain text to HTML with basic formatting
  const formattedText = textContent
    .replace(/\n/g, '<br>')
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

  textProcessCache.set(cacheKey, formattedText);
  cleanupCache(textProcessCache);
  
  return formattedText;
};

// ✅ PERFORMANCE: Optimized attachment processing with caching
const processAttachments = (attachments: EmailRendererProps['attachments'] = []): any[] => {
  if (attachments.length === 0) return [];

  const cacheKey = attachments.length + '_' + JSON.stringify(attachments.map(a => a.filename + a.size));
  
  if (attachmentCache.has(cacheKey)) {
    return attachmentCache.get(cacheKey);
  }

  const processed = attachments.map(att => ({
    ...att,
    // Normalize filename and ensure it's safe
    filename: att.filename?.replace(/[<>:"/\\|?*]/g, '_') || 'attachment',
    // Validate MIME type
    mimeType: att.mimeType || 'application/octet-stream',
    // Ensure size is a number
    size: typeof att.size === 'number' ? att.size : 0
  }));

  attachmentCache.set(cacheKey, processed);
  cleanupCache(attachmentCache);
  
  return processed;
};

const EmailRenderer: React.FC<EmailRendererProps> = ({ 
  bodyHtml, 
  bodyText, 
  subject, 
  emailId, 
  attachments = [],
  activityDetails 
}) => {
  const [hasError, setHasError] = useState(false);

  // ✅ PERFORMANCE: Only log in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 [EmailRenderer] Component called:', {
      emailId,
      subject,
      hasBodyHtml: !!bodyHtml,
      hasBodyText: !!bodyText,
      attachmentsCount: attachments.length,
      activityDetails: !!activityDetails
    });
  }

  // ✅ PERFORMANCE: Enhanced attachment processing with caching
  const processedAttachments = useMemo(() => {
    return processAttachments(attachments);
  }, [attachments]);

  // ✅ PERFORMANCE: Optimized HTML processing with aggressive caching
  const processedHtml = useMemo(() => {
    // Check for direct bodyHtml first, then fallback to activity details
    const htmlContent = bodyHtml || activityDetails?.email_content?.bodyHtml;
    return processHtmlContent(htmlContent, emailId);
  }, [bodyHtml, activityDetails?.email_content?.bodyHtml, emailId]); // Removed processedAttachments dependency

  // ✅ PERFORMANCE: Optimized text processing with caching
  const processedText = useMemo(() => {
    const textContent = bodyText || activityDetails?.email_content?.bodyText;
    return textContent ? processTextContent(textContent) : '';
  }, [bodyText, activityDetails?.email_content?.bodyText]);

  // Simple error reset function
  const resetError = useCallback(() => {
    setHasError(false);
  }, []);

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
            overflowWrap: 'break-word'
          }}
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      );
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
            whiteSpace: 'pre-wrap'
          }}
          dangerouslySetInnerHTML={{ __html: processedText }}
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
  }, [processedHtml, processedText]);

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

// ✅ PERFORMANCE: React.memo with optimized comparison function
export default React.memo(EmailRenderer, (prevProps, nextProps) => {
  // Quick reference equality checks first
  if (prevProps.emailId !== nextProps.emailId) return false;
  if (prevProps.subject !== nextProps.subject) return false;
  if (prevProps.bodyHtml !== nextProps.bodyHtml) return false;
  if (prevProps.bodyText !== nextProps.bodyText) return false;

  // Check activity details
  const prevBodyHtml = prevProps.activityDetails?.email_content?.bodyHtml;
  const nextBodyHtml = nextProps.activityDetails?.email_content?.bodyHtml;
  const prevBodyText = prevProps.activityDetails?.email_content?.bodyText;
  const nextBodyText = nextProps.activityDetails?.email_content?.bodyText;
  
  if (prevBodyHtml !== nextBodyHtml || prevBodyText !== nextBodyText) return false;

  // Check attachments length (deep comparison too expensive)
  if (prevProps.attachments?.length !== nextProps.attachments?.length) return false;

  // Props are equal, skip re-render
  return true;
}); 