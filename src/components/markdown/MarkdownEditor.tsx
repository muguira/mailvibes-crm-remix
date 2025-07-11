import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import MarkdownToolbar from './MarkdownToolbar';
import { htmlToMarkdown, markdownToHtml } from './utils/markdownConverter';
import { detectActiveFormats, cleanupMarginsAndFormatting } from './utils/formatDetection';
import { handleFormatting, handleKeyDown } from './utils/markdownUtils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  showToolbar?: boolean;
  isCompact?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Type your message...",
  className,
  minHeight = "80px",
  showToolbar = true,
  isCompact = false,
  disabled = false,
  autoFocus = false
}) => {
  const editableRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  // Convert markdown to HTML for display
  useEffect(() => {
    if (editableRef.current && value !== getPlainText()) {
      const htmlContent = markdownToHtml(value);
      editableRef.current.innerHTML = htmlContent;
      cleanupMarginsAndFormatting(editableRef.current);
    }
  }, [value]);

  // Auto focus if requested
  useEffect(() => {
    if (autoFocus && editableRef.current) {
      editableRef.current.focus();
    }
  }, [autoFocus]);

  // Get plain text (markdown) from HTML content
  const getPlainText = (): string => {
    if (!editableRef.current) return '';
    return htmlToMarkdown(editableRef.current.innerHTML);
  };

  // Handle input changes
  const handleInput = () => {
    const plainText = getPlainText();
    onChange(plainText);
    
    // Detect active formats after input
    setTimeout(() => {
      cleanupMarginsAndFormatting(editableRef.current);
      setActiveFormats(detectActiveFormats(editableRef.current));
    }, 0);
  };

  // Handle selection changes
  const handleSelectionChange = () => {
    setActiveFormats(detectActiveFormats(editableRef.current));
    cleanupMarginsAndFormatting(editableRef.current);
  };

  // Handle formatting commands
  const handleFormat = (format: string) => {
    handleFormatting(
      format,
      editableRef.current,
      handleLinkRequest,
      handleCodeBlockRequest
    );
    
    // Update the text state and detect active formats
    setTimeout(() => {
      const plainText = getPlainText();
      onChange(plainText);
      setActiveFormats(detectActiveFormats(editableRef.current));
    }, 0);
  };

  // Handle link requests
  const handleLinkRequest = (linkText: string, range: Range) => {
    if (editableRef.current) {
      editableRef.current.focus();
      
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Create link element
        const linkElement = document.createElement('a');
        linkElement.href = linkText; // In this case, linkText contains the URL
        linkElement.textContent = linkText;
        linkElement.className = 'text-teal-600 underline hover:text-teal-800 transition-colors';
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';
        
        // Replace selection with link
        range.deleteContents();
        range.insertNode(linkElement);
        
        // Move cursor after the link
        range.setStartAfter(linkElement);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Update the text state
      setTimeout(() => {
        const plainText = getPlainText();
        onChange(plainText);
      }, 0);
    }
  };

  // Handle code block requests
  const handleCodeBlockRequest = (code: string, range: Range) => {
    if (!editableRef.current) return;
    
    editableRef.current.focus();
    
    // Create the code block elements
    const preElement = document.createElement('pre');
    preElement.className = 'bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto my-2';
    
    const codeElement = document.createElement('code');
    codeElement.className = 'text-sm font-mono';
    codeElement.textContent = code;
    
    preElement.appendChild(codeElement);
    
    // Insert the code block
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      range.deleteContents();
      range.insertNode(preElement);
      
      // Position cursor after the code block
      const newRange = document.createRange();
      newRange.setStartAfter(preElement);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    // Update the text state
    setTimeout(() => {
      const plainText = getPlainText();
      onChange(plainText);
      setActiveFormats(detectActiveFormats(editableRef.current));
    }, 0);
  };

  // Handle paste events
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    
    // Convert pasted markdown to HTML for visual preview
    const htmlContent = markdownToHtml(pastedText);
    
    // Insert the processed content
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      // Insert each child node
      while (tempDiv.firstChild) {
        range.insertNode(tempDiv.firstChild);
        range.collapse(false);
      }
    }
    
    // Update the text state
    setTimeout(() => {
      const plainText = getPlainText();
      onChange(plainText);
      cleanupMarginsAndFormatting(editableRef.current);
    }, 0);
  };

  // Handle key events
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    handleKeyDown(e, editableRef.current, onChange, getPlainText);
  };

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 shadow-sm", className)}>
      {/* Rich Text Editor */}
      <div className={cn("outline-none transition-all duration-300 ease-in-out", isCompact ? 'p-2' : 'p-4')}>
        <div
          ref={editableRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyPress}
          onPaste={handlePaste}
          onMouseUp={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          className={cn(
            "w-full focus:outline-none text-sm text-gray-900 prose prose-sm max-w-none rich-text-editor transition-all duration-300 ease-in-out",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{ 
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            resize: 'none',
            minHeight: minHeight
          }}
          data-placeholder={placeholder}
          suppressContentEditableWarning={true}
        />
        
        {/* Placeholder styling and rich text editor styles */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .rich-text-editor:empty:before {
              content: attr(data-placeholder);
              color: #9ca3af;
              pointer-events: none;
            }
            .rich-text-editor ul {
              list-style-type: disc;
              list-style-position: outside;
              margin: 12px 0;
              padding-left: 24px;
            }
            .rich-text-editor ol {
              list-style-type: decimal;
              list-style-position: outside;
              margin: 12px 0;
              padding-left: 24px;
            }
            .rich-text-editor li {
              margin-bottom: 4px;
              line-height: 1.5;
            }
            .rich-text-editor ul ul {
              list-style-type: circle;
              margin: 4px 0;
            }
            .rich-text-editor ol ol {
              list-style-type: lower-alpha;
              margin: 4px 0;
            }
            .rich-text-editor h1, .rich-text-editor h2, .rich-text-editor h3 {
              margin-top: 16px;
              margin-bottom: 8px;
            }
            .rich-text-editor blockquote {
              margin: 12px 0;
              padding: 8px 16px;
            }
            .rich-text-editor pre {
              margin: 12px 0;
              padding: 16px;
            }
            .rich-text-editor code {
              padding: 2px 6px;
            }
            .rich-text-editor hr {
              margin: 16px 0;
            }
            .rich-text-editor div:not(:has(ul)):not(:has(ol)):not(:has(h1)):not(:has(h2)):not(:has(h3)):not(:has(blockquote)):not(:has(pre)):not(:has(hr)) {
              margin: 0;
              padding: 0;
            }
            .rich-text-editor .normal-paragraph {
              margin: 0 !important;
              padding: 0 !important;
              margin-left: 0 !important;
              padding-left: 0 !important;
              list-style: none !important;
              text-indent: 0 !important;
              position: relative !important;
              left: 0 !important;
              transform: none !important;
              display: block !important;
            }
            .rich-text-editor .normal-paragraph * {
              margin: 0 !important;
              padding: 0 !important;
              margin-left: 0 !important;
              padding-left: 0 !important;
              list-style: none !important;
              text-indent: 0 !important;
              position: static !important;
              left: auto !important;
              transform: none !important;
            }
            .rich-text-editor ul + div,
            .rich-text-editor ol + div,
            .rich-text-editor ul + .normal-paragraph,
            .rich-text-editor ol + .normal-paragraph {
              margin: 0 !important;
              padding: 0 !important;
              margin-left: 0 !important;
              padding-left: 0 !important;
              text-indent: 0 !important;
              list-style: none !important;
              position: static !important;
              left: auto !important;
              transform: none !important;
            }
            .rich-text-editor:focus {
              outline: none !important;
              border: none !important;
              box-shadow: none !important;
            }
            .rich-text-editor {
              outline: none !important;
              border: none !important;
              box-shadow: none !important;
            }
          `
        }} />
      </div>

      {/* Formatting Toolbar */}
      {showToolbar && (
        <MarkdownToolbar
          activeFormats={activeFormats}
          onFormat={handleFormat}
          onLinkRequest={handleLinkRequest}
          onCodeBlockRequest={handleCodeBlockRequest}
          isCompact={isCompact}
          className={isCompact ? 'p-2' : 'p-3'}
        />
      )}
    </div>
  );
};

export default MarkdownEditor; 