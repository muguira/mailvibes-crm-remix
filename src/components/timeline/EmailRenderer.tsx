import React, { useMemo, useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import './email-renderer.css';

interface EmailRendererProps {
  bodyHtml?: string;
  bodyText?: string;
  subject?: string;
  emailId?: string; // Gmail ID for fetching attachments
}

interface EmailAttachment {
  id: string;
  content_id: string | null;
  filename: string;
  mime_type: string | null;
  inline: boolean | null;
  gmail_attachment_id: string | null;
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

const EmailRenderer: React.FC<EmailRendererProps> = ({ bodyHtml, bodyText, subject, emailId }) => {
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [attachmentsLoaded, setAttachmentsLoaded] = useState(false);

  // Fetch email attachments for CID resolution
  useEffect(() => {
    if (!emailId) {
      setAttachmentsLoaded(true);
      return;
    }

    const fetchAttachments = async () => {
      try {
        // First, find the email in our database using the Gmail ID
        const { data: emailData, error: emailError } = await supabase
          .from('emails')
          .select('id')
          .eq('gmail_id', emailId)
          .single();

        if (emailError || !emailData) {
          console.warn('Email not found for ID:', emailId);
          setAttachmentsLoaded(true);
          return;
        }

        // Now fetch the attachments for this email
        const { data: attachmentData, error: attachmentError } = await supabase
          .from('email_attachments')
          .select('id, content_id, filename, mime_type, inline, gmail_attachment_id')
          .eq('email_id', emailData.id);

        if (attachmentError) {
          console.error('Error fetching attachments:', attachmentError);
          setAttachmentsLoaded(true);
          return;
        }

        setAttachments(attachmentData || []);
        setAttachmentsLoaded(true);
      } catch (error) {
        console.error('Error fetching email attachments:', error);
        setAttachmentsLoaded(true);
      }
    };

    fetchAttachments();
  }, [emailId]);

  const processedContent = useMemo(() => {
    // Wait for attachments to load before processing
    if (!attachmentsLoaded) {
      return null;
    }

    // Try to render HTML first if available
    if (bodyHtml && bodyHtml.trim()) {
      try {
        // Minimal processing - just sanitize and make safe
        let sanitizedHtml = DOMPurify.sanitize(bodyHtml, sanitizeConfig);
        
        // Resolve CID references to placeholder images or broken image handling
        if (attachments.length > 0) {
          // Create a map of content-id to attachment info
          const cidMap = new Map<string, EmailAttachment>();
          attachments.forEach(attachment => {
            if (attachment.content_id && attachment.inline) {
              // Gmail content-ids sometimes have < > brackets, normalize them
              const normalizedCid = attachment.content_id.replace(/[<>]/g, '');
              cidMap.set(normalizedCid, attachment);
            }
          });

          // Replace cid: references with placeholder or broken image handling
          sanitizedHtml = sanitizedHtml.replace(
            /src="cid:([^"]+)"/gi,
            (match, contentId) => {
              const attachment = cidMap.get(contentId);
              
              if (attachment) {
                // For now, we'll use a placeholder since we don't have Gmail attachment fetching implemented
                // In a full implementation, you'd fetch the actual attachment data from Gmail API
                return `src="data:image/svg+xml;base64,${btoa(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
                    <rect width="200" height="100" fill="#f3f4f6" stroke="#d1d5db"/>
                    <text x="100" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">
                      📎 ${attachment.filename}
                    </text>
                    <text x="100" y="65" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af">
                      (Inline Image)
                    </text>
                  </svg>
                `)}" title="${attachment.filename}" alt="${attachment.filename}"`;
              } else {
                // CID not found in attachments - show broken image placeholder
                return `src="data:image/svg+xml;base64,${btoa(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
                    <rect width="200" height="100" fill="#fef2f2" stroke="#fecaca"/>
                    <text x="100" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#dc2626">
                      🖼️ Image not available
                    </text>
                    <text x="100" y="65" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#ef4444">
                      (cid:${contentId})
                    </text>
                  </svg>
                `)}" title="Missing inline image" alt="Missing inline image"`;
              }
            }
          );
        }
        
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
  }, [bodyHtml, bodyText, attachments, attachmentsLoaded]);

  // Show loading state while fetching attachments
  if (!attachmentsLoaded) {
    return (
      <div className="email-renderer">
        <div className="email-no-content">
          <em>Loading email content...</em>
        </div>
      </div>
    );
  }

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