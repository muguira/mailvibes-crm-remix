import React, { useMemo } from 'react';
import { Letter } from 'react-letter';
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

const EmailRenderer: React.FC<EmailRendererProps> = ({ 
  bodyHtml, 
  bodyText, 
  subject, 
  emailId, 
  attachments = [] 
}) => {
  // Generate attachment gallery (preserve existing functionality)
  const attachmentGallery = useMemo(() => {
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
    
    if (imageAttachments.length === 0) return null;
    
    const galleryItems = imageAttachments.map(att => {
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
    
    return `
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">📎 Email Images (${imageAttachments.length}):</div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          ${galleryItems}
        </div>
      </div>
    `;
  }, [attachments]);

  // Handle CID references for inline attachments  
  const processedHtml = useMemo(() => {
    if (!bodyHtml || !bodyHtml.trim()) return bodyHtml;
    
    if (attachments.length === 0) return bodyHtml;
    
    // Create CID map for inline attachments
    const cidMap = new Map<string, any>();
    attachments.forEach(attachment => {
      if (attachment.contentId && attachment.inline) {
        const normalizedCid = attachment.contentId.replace(/[<>]/g, '');
        cidMap.set(normalizedCid, attachment);
      }
    });

    // Replace CID references with placeholders (same logic as before)
    return bodyHtml.replace(/src="cid:([^"]+)"/gi, (match, contentId) => {
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
  }, [bodyHtml, attachments]);

  // Fallback content if no HTML or text
  if (!processedHtml?.trim() && !bodyText?.trim()) {
    return (
      <div className="email-renderer">
        <div className="email-no-content">
          <em>No content available</em>
        </div>
      </div>
    );
  }

  // Helper function to handle Google Drive URLs (only problematic ones)
  const handleGoogleDriveUrl = (url: string): string => {
    // Debug: Log the URL to see what we're getting
    if (url.includes('drive.google.com') || url.includes('usercontent.google.com')) {
      console.log('🔍 Google Drive URL detected:', url);
    }
    
    // Only handle URLs that are actually problematic (force download)
    let fileId: string | null = null;
    
    // Pattern 1: docs.google.com/uc?export=download&id=... (PROBLEMATIC)
    if (url.includes('docs.google.com/uc?export=download') || url.includes('drive.google.com/uc?export=download')) {
      const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    }
    
    // Pattern 2: drive.usercontent.google.com/download?id=... (PROBLEMATIC)
    else if (url.includes('drive.usercontent.google.com/download')) {
      const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    }
    
    // Pattern 3: drive.google.com/file/d/.../view (REDIRECT TO VIEWER)
    else if (url.includes('drive.google.com/file/d/') && url.includes('/view')) {
      const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    }
    
    // DO NOT intercept: drive.google.com/uc?id=... (these work as direct images)
    
    // If we found a Google Drive file ID, create a placeholder since direct access is blocked
    if (fileId) {
      // Google Drive images require authentication, so we'll show an informative placeholder
      // Using encodeURIComponent instead of btoa to avoid emoji encoding issues
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
          <rect width="300" height="200" fill="#f8f9fa" stroke="#e9ecef" stroke-width="2" rx="8"/>
          <g transform="translate(150,100)">
            <!-- Google Drive icon -->
            <path d="M-15,-10 L-5,-10 L5,5 L-5,20 L-25,20 L-15,5 Z" fill="#4285f4"/>
            <path d="M-5,-10 L15,-10 L25,5 L15,20 L-5,5 Z" fill="#34a853"/>  
            <path d="M-15,5 L5,5 L15,20 L-25,20 Z" fill="#fbbc04"/>
          </g>
          <text x="150" y="130" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#5f6368">Google Drive Image</text>
          <text x="150" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#80868b">Authentication required</text>
          <text x="150" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#9aa0a6">ID: ${fileId.substring(0, 12)}...</text>
        </svg>
      `;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
    }
    
    return url;
  };

  return (
    <div className="email-renderer">
      {/* Preserve exact subject rendering */}
      {subject && (
        <div className="email-subject">
          <strong>{subject}</strong>
        </div>
      )}
      
      <div className="email-body">
        {processedHtml?.trim() ? (
          // Use react-letter for HTML content - this replaces all our manual sanitization
          <Letter
            html={processedHtml}
            text={bodyText}
            className="email-html-content"
            preserveCssPriority={true}
            rewriteExternalResources={(url: string) => {
              // Handle Google Drive URLs (which require authentication)
              const convertedUrl = handleGoogleDriveUrl(url);
              
              // Allow Gmail and Google services URLs (same as our previous logic)
              if (convertedUrl.includes('googleusercontent.com') || 
                  convertedUrl.includes('usercontent.google.com') ||
                  convertedUrl.includes('drive.google.com') || 
                  convertedUrl.includes('docs.google.com') ||
                  convertedUrl.includes('gmail.com') ||
                  convertedUrl.includes('gstatic.com')) {
                return convertedUrl;
              }
              return convertedUrl;
            }}
            rewriteExternalLinks={(url: string) => url}
            allowedSchemas={['http', 'https', 'mailto', 'tel', 'data']}
          />
        ) : bodyText?.trim() ? (
          // Fallback to plain text with simple formatting (preserve existing logic)
          <div 
            className="email-text-content"
            dangerouslySetInnerHTML={{ 
              __html: bodyText
                .replace(/\n/g, '<br>')
                .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
            }}
          />
        ) : null}
        
        {/* Preserve attachment gallery exactly as before */}
        {attachmentGallery && (
          <div dangerouslySetInnerHTML={{ __html: attachmentGallery }} />
        )}
      </div>
    </div>
  );
};

export default EmailRenderer; 