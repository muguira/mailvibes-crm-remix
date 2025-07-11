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
  const [activeHeadingMode, setActiveHeadingMode] = useState<string | null>(null);

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

  // Apply heading mode to current line
  const applyHeadingModeToCurrentLine = () => {
    if (!activeHeadingMode || !editableRef.current) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    let currentElement = range.startContainer;
    
    // Find the current line/element
    if (currentElement.nodeType === Node.TEXT_NODE) {
      currentElement = currentElement.parentNode;
    }

    // Find the container element (div, p, or heading)
    const container = (currentElement as Element)?.closest("div, p, h1, h2, h3, h4, h5, h6");
    if (!container) return;

    const headingLevel = activeHeadingMode.charAt(activeHeadingMode.length - 1);
    const headingTag = `h${headingLevel}`;
    const headingClasses = {
      h1: "text-2xl font-bold mb-2 mt-4 text-gray-900",
      h2: "text-xl font-bold mb-2 mt-3 text-gray-900",
      h3: "text-lg font-bold mb-2 mt-3 text-gray-900",
    };

    // If already the correct heading, do nothing
    if (container.tagName.toLowerCase() === headingTag) {
      return;
    }

    // Create new heading element
    const newHeading = document.createElement(headingTag);
    newHeading.className = headingClasses[headingTag as keyof typeof headingClasses];
    newHeading.textContent = container.textContent || "";

    // Store cursor position relative to text content
    const textContent = container.textContent || "";
    const cursorOffset = range.startOffset;
    
    // Replace the container with heading
    container.replaceWith(newHeading);
    
    // Restore cursor position
    const newRange = document.createRange();
    const textNode = newHeading.firstChild;
    if (textNode) {
      const offset = Math.min(cursorOffset, textNode.textContent?.length || 0);
      newRange.setStart(textNode, offset);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  };

  // Handle input changes
  const handleInput = () => {
    // Apply heading mode if active
    if (activeHeadingMode && editableRef.current) {
      applyHeadingModeToCurrentLine();
    }

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
    // Handle heading mode activation/deactivation
    if (format === 'heading1' || format === 'heading2' || format === 'heading3') {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() || '';
      
      if (selectedText === '') {
        // No text selected - toggle heading mode
        if (activeHeadingMode === format) {
          // Deactivate current heading mode
          setActiveHeadingMode(null);
        } else {
          // Activate new heading mode
          setActiveHeadingMode(format);
        }
        return;
      }
    }

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
    // Handle Shift+Enter to deactivate heading mode and create normal paragraph
    if (e.key === 'Enter' && e.shiftKey && activeHeadingMode) {
      e.preventDefault();
      setActiveHeadingMode(null);
      
      // Create a new normal paragraph
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        const newParagraph = document.createElement("div");
        newParagraph.className = "normal-paragraph";
        newParagraph.style.cssText =
          "margin: 0 !important; padding: 0 !important; margin-left: 0 !important; padding-left: 0 !important; list-style: none !important; text-indent: 0 !important; position: static !important; left: auto !important; transform: none !important; display: block !important;";
        newParagraph.innerHTML = "<br>";
        
        range.insertNode(newParagraph);
        
        // Position cursor in the new paragraph
        const newRange = document.createRange();
        newRange.setStart(newParagraph, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        // Update content
        setTimeout(() => {
          const plainText = getPlainText();
          onChange(plainText);
        }, 0);
      }
      return;
    }

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
          activeFormats={activeHeadingMode ? new Set([...activeFormats, activeHeadingMode]) : activeFormats}
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