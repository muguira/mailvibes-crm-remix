import React, { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link,
  MoreHorizontal,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Code2,
  Quote,
  Strikethrough,
  Minus,
  Smile
} from "lucide-react";
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import LinkModal from './modals/LinkModal';
import CodeBlockModal from './modals/CodeBlockModal';

interface MarkdownToolbarProps {
  activeFormats: Set<string>;
  onFormat: (format: string) => void;
  onLinkRequest: (selectedText: string, range: Range) => void;
  onCodeBlockRequest: (selectedText: string, range: Range) => void;
  isCompact?: boolean;
  className?: string;
}

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  activeFormats,
  onFormat,
  onLinkRequest,
  onCodeBlockRequest,
  isCompact = false,
  className
}) => {
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('markdown-toolbar-expanded') === 'true';
    }
    return false;
  });
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedTextForLink, setSelectedTextForLink] = useState('');
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  const [isCodeBlockModalOpen, setIsCodeBlockModalOpen] = useState(false);
  const [selectedTextForCode, setSelectedTextForCode] = useState('');
  const [currentCodeRange, setCurrentCodeRange] = useState<Range | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  
  const isMobile = useIsMobile();

  // Common emojis for quick access
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
    '👍', '👎', '👏', '🙌', '👌', '🤝', '🙏', '💪', '🤔', '🤷',
    '❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '🤎', '💯',
    '✅', '❌', '⭐', '🔥', '💡', '🎉', '🎊', '🚀', '💰', '📈'
  ];

  const toggleToolbarExpanded = () => {
    const newExpanded = !isToolbarExpanded;
    setIsToolbarExpanded(newExpanded);
    if (typeof window !== 'undefined') {
      localStorage.setItem('markdown-toolbar-expanded', newExpanded.toString());
    }
  };

  const handleLinkClick = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();
      
      setSelectedTextForLink(selectedText);
      setCurrentRange(range);
      setIsLinkModalOpen(true);
    }
  };

  const handleCodeBlockClick = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();
      
      setSelectedTextForCode(selectedText);
      setCurrentCodeRange(range);
      setIsCodeBlockModalOpen(true);
    }
  };

  const handleLinkConfirm = (url: string, linkText: string) => {
    if (currentRange) {
      onLinkRequest(linkText, currentRange);
    }
    setCurrentRange(null);
    setSelectedTextForLink('');
    setIsLinkModalOpen(false);
  };

  const handleLinkCancel = () => {
    setCurrentRange(null);
    setSelectedTextForLink('');
    setIsLinkModalOpen(false);
  };

  const handleCodeBlockConfirm = (code: string, language: string) => {
    if (currentCodeRange) {
      onCodeBlockRequest(code, currentCodeRange);
    }
    setIsCodeBlockModalOpen(false);
    setSelectedTextForCode('');
    setCurrentCodeRange(null);
  };

  const handleCodeBlockCancel = () => {
    setIsCodeBlockModalOpen(false);
    setSelectedTextForCode('');
    setCurrentCodeRange(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    // Insert emoji at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const emojiNode = document.createTextNode(emoji);
      
      range.deleteContents();
      range.insertNode(emojiNode);
      range.setStartAfter(emojiNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    setIsEmojiPickerOpen(false);
  };

  return (
    <div className={cn("flex items-center justify-between border-t border-gray-100 transition-all duration-300 ease-in-out", className)}>
      <div className="flex items-center gap-1 overflow-hidden">
        {/* Basic Tools - Always Visible */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onFormat('bold')}
            className={`rounded transition-all duration-300 ease-in-out ${
              activeFormats.has('bold') 
                ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            } ${isCompact ? 'p-1' : 'p-2'}`}
            title="Bold"
          >
            <Bold className={`transition-all duration-300 ease-in-out ${
              isCompact ? 'w-3 h-3' : 'w-4 h-4'
            }`} />
          </button>
          <button
            onClick={() => onFormat('italic')}
            className={`rounded transition-all duration-300 ease-in-out ${
              activeFormats.has('italic') 
                ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            } ${isCompact ? 'p-1' : 'p-2'}`}
            title="Italic"
          >
            <Italic className={`transition-all duration-300 ease-in-out ${
              isCompact ? 'w-3 h-3' : 'w-4 h-4'
            }`} />
          </button>
          
          {/* Show more tools on desktop */}
          {!isMobile && (
            <>
              <button
                onClick={() => onFormat('underline')}
                className={`rounded transition-all duration-300 ease-in-out ${
                  activeFormats.has('underline') 
                    ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                } ${isCompact ? 'p-1' : 'p-2'}`}
                title="Underline"
              >
                <Underline className={`transition-all duration-300 ease-in-out ${
                  isCompact ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              </button>
              <button
                onClick={() => onFormat('bulletList')}
                className={`rounded transition-all duration-300 ease-in-out ${
                  activeFormats.has('bulletList') 
                    ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                } ${isCompact ? 'p-1' : 'p-2'}`}
                title="Bullet List"
              >
                <List className={`transition-all duration-300 ease-in-out ${
                  isCompact ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              </button>
              <button
                onClick={() => onFormat('numberedList')}
                className={`rounded transition-all duration-300 ease-in-out ${
                  activeFormats.has('numberedList') 
                    ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                } ${isCompact ? 'p-1' : 'p-2'}`}
                title="Numbered List"
              >
                <ListOrdered className={`transition-all duration-300 ease-in-out ${
                  isCompact ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              </button>
            </>
          )}
          
          {/* Expandable Tools */}
          {(isToolbarExpanded || !isMobile) && (
            <>
              <button
                onClick={() => onFormat('strikethrough')}
                className={`rounded transition-all duration-300 ease-in-out ${
                  activeFormats.has('strikethrough') 
                    ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                } ${isCompact ? 'p-1' : 'p-2'}`}
                title="Strikethrough"
              >
                <Strikethrough className={`transition-all duration-300 ease-in-out ${
                  isCompact ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              </button>
              <button
                onClick={() => onFormat('heading1')}
                className={`rounded transition-all duration-300 ease-in-out ${
                  activeFormats.has('heading1') 
                    ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                } ${isCompact ? 'p-1' : 'p-2'}`}
                title="Heading 1"
              >
                <Heading1 className={`transition-all duration-300 ease-in-out ${
                  isCompact ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              </button>
              <button
                onClick={() => onFormat('heading2')}
                className={`rounded transition-all duration-300 ease-in-out ${
                  activeFormats.has('heading2') 
                    ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                } ${isCompact ? 'p-1' : 'p-2'}`}
                title="Heading 2"
              >
                <Heading2 className={`transition-all duration-300 ease-in-out ${
                  isCompact ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              </button>
              <button
                onClick={() => onFormat('heading3')}
                className={`rounded transition-all duration-300 ease-in-out ${
                  activeFormats.has('heading3') 
                    ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                } ${isCompact ? 'p-1' : 'p-2'}`}
                title="Heading 3"
              >
                <Heading3 className={`transition-all duration-300 ease-in-out ${
                  isCompact ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              </button>
              <button
                onClick={() => onFormat('code')}
                className={`rounded transition-all duration-300 ease-in-out ${
                  activeFormats.has('code') 
                    ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                } ${isCompact ? 'p-1' : 'p-2'}`}
                title="Inline Code"
              >
                <Code className={`transition-all duration-300 ease-in-out ${
                  isCompact ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              </button>
              <button
                onClick={handleCodeBlockClick}
                className={`rounded transition-all duration-300 ease-in-out hover:bg-gray-100 text-gray-600 hover:text-gray-900 ${
                  isCompact ? 'p-1' : 'p-2'
                }`}
                title="Code Block"
              >
                <Code2 className={`transition-all duration-300 ease-in-out ${
                  isCompact ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              </button>
              <button
                onClick={() => onFormat('quote')}
                className={`rounded transition-all duration-300 ease-in-out ${
                  activeFormats.has('quote') 
                    ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                } ${isCompact ? 'p-1' : 'p-2'}`}
                title="Quote"
              >
                <Quote className={`transition-all duration-300 ease-in-out ${
                  isCompact ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              </button>
              <button
                onClick={handleLinkClick}
                className={`rounded transition-all duration-300 ease-in-out ${
                  activeFormats.has('link') 
                    ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                } ${isCompact ? 'p-1' : 'p-2'}`}
                title="Add Link"
              >
                <Link className={`transition-all duration-300 ease-in-out ${
                  isCompact ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              </button>
              <button
                onClick={() => onFormat('divider')}
                className={`rounded transition-all duration-300 ease-in-out hover:bg-gray-100 text-gray-600 hover:text-gray-900 ${
                  isCompact ? 'p-1' : 'p-2'
                }`}
                title="Horizontal Rule"
              >
                <Minus className={`transition-all duration-300 ease-in-out ${
                  isCompact ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              </button>
              
              {/* Emoji Picker */}
              <div className="relative">
                <button
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                  className={`rounded transition-all duration-300 ease-in-out hover:bg-gray-100 text-gray-600 hover:text-gray-900 ${
                    isCompact ? 'p-1' : 'p-2'
                  }`}
                  title="Add Emoji"
                >
                  <Smile className={`transition-all duration-300 ease-in-out ${
                    isCompact ? 'w-3 h-3' : 'w-4 h-4'
                  }`} />
                </button>
                
                {isEmojiPickerOpen && (
                  <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 w-64">
                    <div className="grid grid-cols-8 gap-1">
                      {commonEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          onClick={() => handleEmojiSelect(emoji)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Expand/Collapse Button for Mobile */}
      {isMobile && (
        <button
          onClick={toggleToolbarExpanded}
          className={`rounded transition-all duration-300 ease-in-out hover:bg-gray-100 text-gray-600 hover:text-gray-900 ${
            isCompact ? 'p-1' : 'p-2'
          }`}
          title={isToolbarExpanded ? "Collapse toolbar" : "Expand toolbar"}
        >
          <MoreHorizontal className={`transition-all duration-300 ease-in-out ${
            isCompact ? 'w-3 h-3' : 'w-4 h-4'
          }`} />
        </button>
      )}
      
      {/* Modals */}
      <LinkModal
        isOpen={isLinkModalOpen}
        onClose={handleLinkCancel}
        onConfirm={handleLinkConfirm}
        selectedText={selectedTextForLink}
      />
      
      <CodeBlockModal
        isOpen={isCodeBlockModalOpen}
        onClose={handleCodeBlockCancel}
        onConfirm={handleCodeBlockConfirm}
        selectedText={selectedTextForCode}
      />
    </div>
  );
};

export default MarkdownToolbar; 