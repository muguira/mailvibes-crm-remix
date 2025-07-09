import React from 'react';
import DOMPurify from 'dompurify';
import './email-renderer.css';

interface EmailRendererProps {
  bodyHtml?: string;
  bodyText?: string;
  subject?: string;
}

const EmailRenderer: React.FC<EmailRendererProps> = ({ bodyHtml, bodyText, subject }) => {
  // Configure DOMPurify for safe HTML rendering
  const sanitizeConfig = {
    ALLOWED_TAGS: [
      'p', 'div', 'span', 'br', 'strong', 'b', 'em', 'i', 'u', 
      'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'class', 'style', 'id', 'title', 'alt'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  };

  const renderContent = () => {
    // Try to render HTML first if available
    if (bodyHtml && bodyHtml.trim()) {
      try {
        const sanitizedHtml = DOMPurify.sanitize(bodyHtml, sanitizeConfig);
        
        // Check if sanitized HTML has meaningful content
        if (sanitizedHtml && sanitizedHtml.trim() !== '') {
          return (
            <div 
              className="email-html-content"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          );
        }
      } catch (error) {
        console.warn('Error sanitizing email HTML:', error);
      }
    }

    // Fallback to plain text
    if (bodyText && bodyText.trim()) {
      return (
        <div className="email-text-content">
          {bodyText.split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < bodyText.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      );
    }

    // No content available
    return (
      <div className="email-no-content">
        <em>No content available</em>
      </div>
    );
  };

  return (
    <div className="email-renderer">
      {subject && (
        <div className="email-subject">
          <strong>{subject}</strong>
        </div>
      )}
      <div className="email-body">
        {renderContent()}
      </div>
    </div>
  );
};

export default EmailRenderer; 