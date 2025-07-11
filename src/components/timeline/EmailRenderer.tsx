import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import './email-renderer.css';

interface EmailRendererProps {
  bodyHtml?: string;
  bodyText?: string;
  subject?: string;
}

// Simplified sanitization config - less aggressive processing
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
    'bgcolor', 'color', 'size', 'face'
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'iframe'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur']
};

const EmailRenderer: React.FC<EmailRendererProps> = ({ bodyHtml, bodyText, subject }) => {
  const processedContent = useMemo(() => {
    // Try to render HTML first if available
    if (bodyHtml && bodyHtml.trim()) {
      try {
        // Minimal processing - just sanitize and make safe
        let sanitizedHtml = DOMPurify.sanitize(bodyHtml, sanitizeConfig);
        
        // Only do essential fixes - don't be aggressive
        sanitizedHtml = sanitizedHtml
          // Make images responsive (but don't override existing styles)
          .replace(/<img(?![^>]*style=)([^>]*)>/gi, '<img$1 style="max-width: 100%; height: auto;">')
          // Ensure links open in new tab
          .replace(/<a(?![^>]*target=)([^>]*?)href=/gi, '<a$1target="_blank" rel="noopener noreferrer" href=');
        
        if (sanitizedHtml && sanitizedHtml.trim() !== '') {
          return { content: sanitizedHtml, isPlainText: false };
        }
      } catch (error) {
        console.warn('Error sanitizing email HTML:', error);
      }
    }

    // Fallback to plain text with minimal formatting
    if (bodyText && bodyText.trim()) {
      // Simple text processing - just convert line breaks
      const formattedText = bodyText.replace(/\n/g, '<br>');
      return { content: formattedText, isPlainText: true };
    }

    return null;
  }, [bodyHtml, bodyText]);

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