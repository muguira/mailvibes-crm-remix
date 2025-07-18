import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import './email-renderer.css';

interface EmailRendererProps {
  bodyHtml?: string;
  bodyText?: string;
  subject?: string;
  emailId?: string;
  attachments?: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    inline?: boolean;
    contentId?: string;
  }>;
}

// Simple and permissive sanitization config - optimized for email signatures
const sanitizeConfig = {
  ALLOWED_TAGS: [
    'p', 'div', 'span', 'br', 'strong', 'b', 'em', 'i', 'u', 
    'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'img', 'hr', 'center', 'font', 'small', 'big', 'sub', 'sup'
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'class', 'style', 'id', 'title', 'alt', 'src',
    'width', 'height', 'border', 'cellpadding', 'cellspacing', 'align', 'valign',
    'bgcolor', 'color', 'size', 'face', 'hspace', 'vspace', 'loading', 'crossorigin'
  ],
  // More permissive URL regex that allows most external images including Google services
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  ALLOW_UNKNOWN_PROTOCOLS: true,
  ALLOW_DATA_ATTR: true,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'iframe'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
  // Don't be too strict about URIs
  SANITIZE_DOM: false,
  KEEP_CONTENT: true
};

// Clean up HTML to remove excessive spacing (conservative approach)
const cleanupEmailHtml = (html: string): string => {
  return html
    // Only remove clearly empty elements - be very conservative
    .replace(/<div[^>]*>\s*<\/div>/gi, '')
    .replace(/<p[^>]*>\s*<\/p>/gi, '')
    
    // Replace multiple consecutive <br> tags with maximum of 2
    .replace(/(<br[^>]*>\s*){4,}/gi, '<br><br>')
    
    // Remove only obviously problematic inline styles for spacing
    .replace(/style="[^"]*margin-top:\s*[0-9]+px[^"]*"/gi, '')
    .replace(/style="[^"]*margin-bottom:\s*[0-9]+px[^"]*"/gi, '')
    
    // Keep all other content as-is to preserve encoding
    .trim();
};

const EmailRenderer: React.FC<EmailRendererProps> = ({ 
  bodyHtml, 
  bodyText, 
  subject, 
  emailId, 
  attachments = [] 
}) => {
  const processedContent = useMemo(() => {
    // Try to render HTML first if available
    if (bodyHtml && bodyHtml.trim()) {
      try {
        // First clean up the HTML to remove spacing issues
        let cleanedHtml = cleanupEmailHtml(bodyHtml);
        
        // Simple sanitization without aggressive transformations
        let sanitizedHtml = DOMPurify.sanitize(cleanedHtml, sanitizeConfig);
        
        // Only handle CID references for inline attachments (minimal processing)
        if (attachments.length > 0) {
          const cidMap = new Map<string, any>();
          attachments.forEach(attachment => {
            if (attachment.contentId && attachment.inline) {
              const normalizedCid = attachment.contentId.replace(/[<>]/g, '');
              cidMap.set(normalizedCid, attachment);
            }
          });

          // Replace CID references with simple placeholders
          sanitizedHtml = sanitizedHtml.replace(/src="cid:([^"]+)"/gi, (match, contentId) => {
            const attachment = cidMap.get(contentId);
            if (attachment) {
              const isGif = attachment.filename.toLowerCase().endsWith('.gif');
              const icon = isGif ? '🎬' : '🖼️';
              
              return `src="data:image/svg+xml;base64,${btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
                  <rect width="120" height="80" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="4"/>
                  <text x="60" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">${icon}</text>
                  <text x="60" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#9ca3af">${attachment.filename}</text>
                  <text x="60" y="65" text-anchor="middle" font-family="Arial, sans-serif" font-size="6" fill="#d1d5db">${attachment.mimeType || 'image'}</text>
                </svg>
              `)}"`;
            }
            
            // Generic placeholder for unknown CID
            return `src="data:image/svg+xml;base64,${btoa(`
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
                <rect width="120" height="80" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="4"/>
                <text x="60" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af">📎 Attachment</text>
                <text x="60" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="6" fill="#d1d5db">Content ID: ${contentId}</text>
              </svg>
            `)}"`;
          });

          // Add simple attachment gallery if we have image attachments
          const imageAttachments = attachments.filter(att => 
            att.filename && (
              att.filename.toLowerCase().includes('.gif') ||
              att.filename.toLowerCase().includes('.png') ||
              att.filename.toLowerCase().includes('.jpg') ||
              att.filename.toLowerCase().includes('.jpeg') ||
              att.filename.toLowerCase().includes('.webp') ||
              (att.mimeType && att.mimeType.startsWith('image/'))
            )
          );
          
          if (imageAttachments.length > 0) {
            const simpleGallery = imageAttachments.map(att => {
              const isGif = att.filename.toLowerCase().endsWith('.gif');
              const icon = isGif ? '🎬' : '🖼️';
              const sizeText = att.size ? `${Math.round(att.size / 1024)}KB` : '';
              
              return `
                <div style="display: inline-block; margin: 8px; padding: 12px; border: 1px dashed #d1d5db; border-radius: 6px; background: #f9fafb; text-align: center; min-width: 120px;">
                  <div style="font-size: 24px; margin-bottom: 4px;">${icon}</div>
                  <div style="font-size: 11px; color: #374151; word-break: break-word; margin-bottom: 2px;">${att.filename}</div>
                  <div style="font-size: 9px; color: #6b7280;">${att.mimeType || 'image'} ${sizeText}</div>
                  <div style="font-size: 8px; color: #9ca3af; margin-top: 2px;">${att.inline ? 'Inline' : 'Attachment'}</div>
                </div>
              `;
            }).join('');
            
            sanitizedHtml += `
              <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">📎 Email Images (${imageAttachments.length}):</div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                  ${simpleGallery}
                </div>
              </div>
            `;
          }
        }

        return { content: sanitizedHtml, isPlainText: false };
      } catch (error) {
        console.warn('Error sanitizing email HTML:', error);
      }
    }

    // Fallback to plain text with simple formatting
    if (bodyText && bodyText.trim()) {
      const formattedText = bodyText
        .replace(/\n/g, '<br>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
      
      return { content: formattedText, isPlainText: true };
    }

    return null;
  }, [bodyHtml, bodyText, attachments]);

  if (!processedContent) {
    return (
      <div className="email-renderer">
        <div className="email-no-content">
          <em>No content available</em>
        </div>
      </div>
    );
  }

  return (
    <div className="email-renderer">
      {subject && (
        <div className="email-subject">
          <strong>{subject}</strong>
        </div>
      )}
      <div className="email-body">
        <div 
          className={processedContent.isPlainText ? "email-text-content" : "email-html-content"}
          dangerouslySetInnerHTML={{ __html: processedContent.content }}
        />
      </div>
    </div>
  );
};

export default EmailRenderer; 