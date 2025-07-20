import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { render } from '@react-email/render';
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
  // For emails sent from CRM (stored in activity details)
  activityDetails?: {
    email_content?: {
      bodyHtml?: string;
      bodyText?: string;
      subject?: string;
      to?: Array<{ email: string; name?: string }>;
      cc?: Array<{ email: string; name?: string }>;
      bcc?: Array<{ email: string; name?: string }>;
      from?: { email: string; name?: string };
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Debug log for specific test email
  console.log('📧 [EmailRenderer] Component called:', {
    emailId,
    subject,
    hasBodyHtml: !!bodyHtml,
    hasBodyText: !!bodyText,
    attachmentsCount: attachments.length,
    isTestEmail: subject?.includes('crm email test just test') || subject?.includes('test'),
    attachmentFilenames: attachments.map(a => a.filename)
  });

  // SPECIFIC DEBUG for emails with attachments
  if (attachments.length > 0) {
    console.log('🔍 [EmailRenderer] DETAILED attachment debug for', emailId, ':', {
      emailId,
      subject,
      attachmentDetails: attachments.map(att => ({
        id: att.id,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
        inline: att.inline,
        contentId: att.contentId,
        storage_path: (att as any).storage_path,
        storagePath: (att as any).storagePath,
        hasStorageField: !!(att as any).storage_path || !!(att as any).storagePath,
        fullAttachmentObject: att
      }))
    });
  }

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
        let html = htmlContent;
      
      // Handle CID references for inline attachments
      if (processedAttachments.length > 0) {
        const cidMap = new Map<string, any>();
        processedAttachments.forEach(attachment => {
          if (attachment.contentId && attachment.inline) {
            const normalizedCid = attachment.contentId.replace(/[<>]/g, '');
            cidMap.set(normalizedCid, attachment);
          }
        });

        html = html.replace(/src=["']cid:([^"']+)["']/gi, (match, contentId) => {
          const attachment = cidMap.get(contentId);
          if (attachment) {
            const isGif = /\.gif$/i.test(attachment.filename);
            const icon = isGif ? '🎬' : '🖼️';
            
            const svgPlaceholder = `
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
                <rect width="120" height="80" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="4"/>
                <text x="60" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">${icon}</text>
                <text x="60" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#9ca3af">${attachment.filename}</text>
                <text x="60" y="65" text-anchor="middle" font-family="Arial, sans-serif" font-size="6" fill="#d1d5db">${attachment.mimeType}</text>
              </svg>
            `;
            
            return `src="data:image/svg+xml;base64,${btoa(svgPlaceholder)}"`;
          }
          
          const fallbackSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
              <rect width="120" height="80" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="4"/>
              <text x="60" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af">📎 Attachment</text>
              <text x="60" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="6" fill="#d1d5db">${contentId}</text>
            </svg>
          `;
          
          return `src="data:image/svg+xml;base64,${btoa(fallbackSvg)}"`;
        });
      }

      // Enhanced Google Drive URL handling with better error recovery
      html = html.replace(/src=["']([^"']*(?:drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com)[^"']*)["']/gi, (match, url) => {
        console.log('🔍 Google Drive URL detected:', url);
        
        let fileId: string | null = null;
        
        // More robust file ID extraction
        const patterns = [
          /[?&]id=([a-zA-Z0-9_-]+)/,
          /\/file\/d\/([a-zA-Z0-9_-]+)/,
          /\/document\/d\/([a-zA-Z0-9_-]+)/
        ];
        
        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match && match[1]) {
            fileId = match[1];
            break;
          }
        }
        
        if (fileId) {
          const placeholderSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
              <rect width="300" height="200" fill="#f8f9fa" stroke="#e9ecef" stroke-width="2" rx="8"/>
              <g transform="translate(150,100)">
                <path d="M-15,-10 L-5,-10 L5,5 L-5,20 L-25,20 L-15,5 Z" fill="#4285f4"/>
                <path d="M-5,-10 L15,-10 L25,5 L15,20 L-5,5 Z" fill="#34a853"/>  
                <path d="M-15,5 L5,5 L15,20 L-25,20 Z" fill="#fbbc04"/>
              </g>
              <text x="150" y="130" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#5f6368">Google Drive Image</text>
              <text x="150" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#80868b">Authentication required</text>
              <text x="150" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#9aa0a6">ID: ${fileId.substring(0, 12)}...</text>
            </svg>
          `;
          return `src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(placeholderSvg)}"`;
        }
        
        return match;
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
          // Styling
          'style', 'color', 'bgcolor', 'background',
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
        FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'iframe', 'frame', 'frameset'],
        FORBID_ATTR: [
          'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur',
          'onsubmit', 'onchange', 'onkeydown', 'onkeyup', 'onkeypress'
        ],
        // Enhanced security options
        KEEP_CONTENT: true,
        SANITIZE_DOM: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_DOM_IMPORT: false,
        FORCE_BODY: false,
        WHOLE_DOCUMENT: false
      };

      const sanitizedHtml = DOMPurify.sanitize(html, sanitizeConfig);
      
      // Validate that we still have meaningful content after sanitization
      if (!sanitizedHtml || sanitizedHtml.trim().length < 10) {
        console.warn('HTML content was heavily sanitized or empty');
        return null;
      }
      
      return sanitizedHtml;
    } catch (error) {
      console.error('Error processing email HTML:', error);
      setHasError(true);
      return null;
    }
  }, [bodyHtml, activityDetails?.email_content?.bodyHtml, processedAttachments]);

  // Create enhanced email document with better error handling
  const emailDocument = useMemo(() => {
    // Check for direct bodyText first, then fallback to activity details
    const textContent = bodyText || activityDetails?.email_content?.bodyText;
    let content = processedHtml || (textContent ? textContent.replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>') : '');
    
    // Check if we have images when no text content exists
    // Include any images (with content_id or inline=true) or if email has only image attachments
    const hasInlineImages = processedAttachments.some(att => 
      (att.contentId || att.inline) && 
      (att.mimeType?.startsWith('image/') || /\.(gif|png|jpe?g|webp|svg)$/i.test(att.filename))
    );
    
    // Also check if email has only image attachments (likely the main content)
    const hasOnlyImageAttachments = processedAttachments.length > 0 && 
      processedAttachments.every(att => 
        att.mimeType?.startsWith('image/') || /\.(gif|png|jpe?g|webp|svg)$/i.test(att.filename)
      );
    
    // Debug logging for troubleshooting
    if (!content.trim() && processedAttachments.length > 0) {
      console.log('🔍 [EmailRenderer] Debug - Email with no content but has attachments:', {
        hasContent: !!content.trim(),
        attachmentsCount: processedAttachments.length,
        hasInlineImages,
        hasOnlyImageAttachments,
        attachments: processedAttachments.map(att => ({
          filename: att.filename,
          mimeType: att.mimeType,
          contentId: att.contentId,
          inline: att.inline,
          size: att.size
        }))
      });
    }
    
    // If no text content but we have images, create content from images
    if (!content.trim() && (hasInlineImages || hasOnlyImageAttachments)) {
      const imagesToShow = processedAttachments.filter(att => 
        (att.mimeType?.startsWith('image/') || /\.(gif|png|jpe?g|webp|svg)$/i.test(att.filename)) &&
        (att.contentId || att.inline || hasOnlyImageAttachments)
      );
      
      console.log('🖼️ [EmailRenderer] Creating content from images:', imagesToShow.length);
      
      // Create content with real images from Supabase Storage or fallback to placeholder
      content = imagesToShow.map(att => {
        const isJpegOrPng = /\.(jpe?g|png)$/i.test(att.filename) || att.mimeType?.includes('jpeg') || att.mimeType?.includes('png');
        const imageIcon = isJpegOrPng ? '📸' : '🖼️';
        const sizeText = att.size > 0 ? `${Math.round(att.size / 1024)}KB` : '';
        
        // Check if we have a stored image in Supabase Storage
        const hasStoredImage = (att as any).storage_path || (att as any).storagePath;
        
        console.log('🖼️ [EmailRenderer] Attachment storage check:', {
          filename: att.filename,
          storage_path: (att as any).storage_path,
          storagePath: (att as any).storagePath,
          hasStoredImage,
          attachmentObject: att
        })
        
        if (hasStoredImage) {
          const storagePath = (att as any).storage_path || (att as any).storagePath;
          // Use Supabase Storage public URL directly
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
          const imageUrl = `${supabaseUrl}/storage/v1/object/public/email-attachments/${storagePath}`;
          
          return `<div style="text-align: center; margin: 20px 0;">
            <div style="display: inline-block; max-width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
              <img 
                src="${imageUrl}" 
                alt="${att.filename}" 
                style="max-width: 100%; max-height: 500px; width: auto; height: auto; display: block;"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
              />
              <div style="display: none; padding: 20px; background: #f8fafc; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 8px;">❌</div>
                <div style="font-size: 14px; color: #374151; margin-bottom: 4px;">Failed to load image</div>
                <div style="font-size: 12px; color: #6b7280;">${att.filename}</div>
              </div>
            </div>
            <div style="padding: 8px; background: rgba(255,255,255,0.9); margin-top: 8px; border-radius: 6px; font-size: 12px; color: #6b7280;">
              ${att.filename} • ${sizeText}
            </div>
          </div>`;
        } else {
          // Fallback to enhanced placeholder for images not yet downloaded
          return `<div style="text-align: center; margin: 20px 0;">
            <div style="display: inline-block; max-width: 400px; width: 100%; border: 2px dashed #d1d5db; border-radius: 12px; padding: 24px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); transition: all 0.3s ease;">
              <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.7;">${imageIcon}</div>
              <div style="font-size: 16px; color: #1f2937; font-weight: 600; margin-bottom: 8px; word-break: break-word;">${att.filename}</div>
              <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">${att.mimeType}</div>
              <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">${sizeText}</div>
              <div style="font-size: 11px; color: #f59e0b; margin-bottom: 8px;">📥 Image will be downloaded on next sync</div>
              <div style="margin-top: 16px; padding: 8px 16px; background: #3b82f6; color: white; border-radius: 6px; font-size: 12px; cursor: pointer; display: inline-block;" onclick="window.open('https://mail.google.com', '_blank')">
                📧 View in Gmail
              </div>
            </div>
          </div>`;
        }
      }).join('');
    }
    
    if (!content.trim()) {
      return `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;">
            <title>Email Content</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 16px;
                background: #fff;
              }
              .no-content {
                color: #6b7280;
                font-style: italic;
                text-align: center;
                padding: 20px;
              }
            </style>
          </head>
          <body>
            <div class="no-content" role="alert">No email content available</div>
          </body>
        </html>
      `;
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;">
          <title>${subject ? `Email: ${subject}` : 'Email Content'}</title>
          <style>
            /* Reset and base styles */
            * {
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 16px;
              background: #fff;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }

            /* Email content container */
            .email-content {
              max-width: 100%;
              overflow: hidden;
              position: relative;
            }

            /* Enhanced table support for email layouts */
            table {
              border-collapse: collapse;
              width: 100%;
              max-width: 100%;
              margin: 8px 0;
            }

            td, th {
              padding: 8px;
              vertical-align: top;
              word-wrap: break-word;
              border: none;
            }

            /* Image handling with error recovery */
            img {
              max-width: 100%;
              height: auto;
              display: block;
              border: none;
              margin: 4px 0;
            }

            img:not([alt]) {
              position: relative;
            }

            img:not([alt])::after {
              content: "📷 Image";
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: #f3f4f6;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              color: #6b7280;
            }

            /* Link styles */
            a {
              color: #1a73e8;
              text-decoration: none;
              word-break: break-all;
            }

            a:hover {
              text-decoration: underline;
            }

            a:focus {
              outline: 2px solid #3b82f6;
              outline-offset: 2px;
            }

            /* Hide tracking pixels and very small images */
            img[width="1"], img[height="1"],
            img[style*="width:1px"], img[style*="height:1px"],
            img[style*="width: 1px"], img[style*="height: 1px"] {
              display: none !important;
            }

            /* Gmail signature and common email elements */
            .gmail_signature, .signature, [class*="signature"] {
              margin-top: 16px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
            }

            /* Text formatting */
            p, div {
              margin: 0 0 1em 0;
            }

            p:last-child, div:last-child {
              margin-bottom: 0;
            }

            /* List styling */
            ul, ol {
              margin: 1em 0;
              padding-left: 2em;
            }

            li {
              margin: 0.25em 0;
            }

            /* Blockquote styling */
            blockquote {
              margin: 1em 0;
              padding: 0.5em 1em;
              border-left: 3px solid #e5e7eb;
              background: #f9fafb;
              font-style: italic;
            }

            /* Code styling */
            code, pre {
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
              background: #f3f4f6;
              padding: 2px 4px;
              border-radius: 3px;
              font-size: 0.9em;
            }

            pre {
              padding: 12px;
              overflow-x: auto;
              white-space: pre-wrap;
            }

            /* Responsive adjustments */
            @media (max-width: 600px) {
              body {
                padding: 12px;
                font-size: 13px;
              }
              
              table {
                font-size: 13px;
              }

              img {
                max-width: 100% !important;
                height: auto !important;
              }
            }

            /* Print styles */
            @media print {
              body {
                background: white !important;
                color: black !important;
              }
              
              a {
                color: blue !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="email-content" role="main">
            ${content}
          </div>
        </body>
      </html>
    `;
  }, [processedHtml, bodyText, activityDetails?.email_content?.bodyText, subject]);

  // Enhanced iframe loading with better error handling and performance
  const loadEmailIntoIframe = useCallback(() => {
    if (!iframeRef.current || !emailDocument) return;
    
    const iframe = iframeRef.current;
    setIsLoading(true);
    setHasError(false);
    setIsLoaded(false);
    
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        throw new Error('Cannot access iframe document');
      }
      
      doc.open();
      doc.write(emailDocument);
      doc.close();
      
      // Set up load event listener
      const handleLoad = () => {
        setIsLoading(false);
        setIsLoaded(true);
        
        // Auto-resize iframe to content
        setTimeout(() => {
          try {
            if (doc.body) {
              const height = Math.max(
                doc.body.scrollHeight,
                doc.body.offsetHeight,
                doc.documentElement.clientHeight,
                doc.documentElement.scrollHeight,
                doc.documentElement.offsetHeight
              );
              
              // Reasonable height limits
              const minHeight = 100;
              const maxHeight = 1000;
              const finalHeight = Math.min(Math.max(height + 20, minHeight), maxHeight);
              
              iframe.style.height = `${finalHeight}px`;
            }
          } catch (resizeError) {
            console.warn('Error resizing iframe:', resizeError);
          }
        }, 150);
      };

      const handleError = (error: any) => {
        console.error('Error loading email content:', error);
        setIsLoading(false);
        setHasError(true);
      };

      // Set up event listeners
      iframe.addEventListener('load', handleLoad);
      iframe.addEventListener('error', handleError);
      
      // Cleanup function
      return () => {
        iframe.removeEventListener('load', handleLoad);
        iframe.removeEventListener('error', handleError);
      };
      
    } catch (error) {
      console.error('Error setting up iframe:', error);
      setIsLoading(false);
      setHasError(true);
    }
  }, [emailDocument]);

  // Load content when emailDocument changes
  useEffect(() => {
    const cleanup = loadEmailIntoIframe();
    return cleanup;
  }, [loadEmailIntoIframe]);

  return (
    <div className="email-renderer">
      {subject && (
        <div className="email-subject">
          <strong>{subject}</strong>
        </div>
      )}
      
      <div className="email-body">
        <iframe
          ref={iframeRef}
          className="email-iframe"
          style={{
            width: '100%',
            minHeight: '200px',
            border: 'none',
            background: '#fff',
            borderRadius: '4px'
          }}
          sandbox="allow-same-origin"
          title={`Email content: ${subject || 'Email'}`}
          data-loading={isLoading}
          data-error={hasError}
          data-loaded={isLoaded}
          aria-label={`Email content${subject ? ` for ${subject}` : ''}`}
        />
        
        {hasError && (
          <div className="email-error-fallback" style={{
            padding: '20px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#dc2626',
            textAlign: 'center',
            marginTop: '8px'
          }}>
            <p>⚠️ Error loading email content</p>
            <button
              onClick={loadEmailIntoIframe}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#b91c1c'}
              onMouseOut={(e) => e.currentTarget.style.background = '#dc2626'}
            >
              Retry loading
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailRenderer; 