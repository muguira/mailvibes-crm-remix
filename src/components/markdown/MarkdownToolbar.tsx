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
  editor: any;
  onFormat: (format: string) => void;
  onLinkRequest: (url: string, linkText: string) => void;
  onCodeBlockRequest: (selectedText: string, range: Range) => void;
  isCompact?: boolean;
  className?: string;
}

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  editor,
  onFormat,
  onLinkRequest,
  onCodeBlockRequest,
  isCompact = false,
  className
}) => {
  // Get active formats from editor following Tiptap best practices
  const isFormatActive = (format: string): boolean => {
    if (!editor) return false;
    
    switch (format) {
      case 'bold':
        return editor.isActive('bold');
      case 'italic':
        return editor.isActive('italic');
      case 'underline':
        return editor.isActive('underline');
      case 'strikethrough':
        return editor.isActive('strike');
      case 'code':
        return editor.isActive('code');
      case 'link':
        return editor.isActive('link');
      case 'heading1':
        return editor.isActive('heading', { level: 1 });
      case 'heading2':
        return editor.isActive('heading', { level: 2 });
      case 'heading3':
        return editor.isActive('heading', { level: 3 });
      case 'quote':
        return editor.isActive('blockquote');
      case 'bulletList':
        return editor.isActive('bulletList');
      case 'numberedList':
        return editor.isActive('orderedList');
      default:
        return false;
    }
  };

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
  const [emojiButtonRef, setEmojiButtonRef] = useState<HTMLButtonElement | null>(null);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 });
  
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
    onLinkRequest(url, linkText);
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
    if (editor) {
      editor.chain().focus().insertContent(emoji).run();
    }
    setIsEmojiPickerOpen(false);
  };

  const handleEmojiButtonClick = () => {
    if (emojiButtonRef) {
      const rect = emojiButtonRef.getBoundingClientRect();
      setEmojiPickerPosition({
        top: rect.top - 250, // 250px above the button
        left: rect.left - 160 + (rect.width / 2) // Center the picker on the button
      });
    }
    setIsEmojiPickerOpen(!isEmojiPickerOpen);
  };

  // Close emoji picker when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEmojiPickerOpen && !(event.target as Element).closest('.emoji-picker')) {
        setIsEmojiPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEmojiPickerOpen]);

  return (
    <div className={cn("flex items-center transition-all duration-300 ease-in-out", className)}>
      <div className={cn(
        "flex items-center gap-1 w-full",
        // In mobile, allow horizontal scroll when expanded
        isMobile && isToolbarExpanded ? "overflow-x-auto scrollbar-hide" : "overflow-hidden"
      )}>
        {/* Basic Tools - Always Visible */}
        <div className={cn(
          "flex items-center gap-1",
          // In mobile, make tools flex-shrink-0 to prevent squishing
          isMobile && "flex-shrink-0"
        )}>
          <button
            onClick={() => onFormat('bold')}
            className={`rounded transition-all duration-300 ease-in-out ${
              isFormatActive('bold') 
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
              isFormatActive('italic') 
                ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            } ${isCompact ? 'p-1' : 'p-2'}`}
            title="Italic"
          >
            <Italic className={`transition-all duration-300 ease-in-out ${
              isCompact ? 'w-3 h-3' : 'w-4 h-4'
            }`} />
          </button>
          
          {/* Show more tools on desktop OR when expanded on mobile */}
          {(!isMobile || isToolbarExpanded) && (
            <>
              <button
                onClick={() => onFormat('underline')}
                className={`rounded transition-all duration-300 ease-in-out ${
                  isFormatActive('underline') 
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
                  isFormatActive('bulletList') 
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
                  isFormatActive('numberedList') 
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
          
          {/* Emoji Picker - Always visible */}
          <div className="relative emoji-picker">
            <button
              ref={setEmojiButtonRef}
              onClick={handleEmojiButtonClick}
              className={`rounded transition-all duration-300 ease-in-out hover:bg-gray-100 text-gray-600 hover:text-gray-900 ${
                isCompact ? 'p-1' : 'p-2'
              }`}
              title="Insert Emoji"
            >
              <Smile className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
            </button>
            
            {isEmojiPickerOpen && (
              <div 
                className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] w-[320px] max-h-[240px] overflow-hidden"
                style={{
                  top: `${emojiPickerPosition.top}px`,
                  left: `${emojiPickerPosition.left}px`,
                }}
              >
                <div className="p-3 max-h-[240px] overflow-y-auto emoji-scroll">
                  <div className="grid grid-cols-8 gap-1">
                    {commonEmojis.map((emoji, index) => (
                      <button
                        key={index}
                        onClick={() => handleEmojiSelect(emoji)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-base transition-colors flex-shrink-0"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Custom scrollbar styles */}
                <style dangerouslySetInnerHTML={{
                  __html: `
                    .emoji-scroll::-webkit-scrollbar {
                      width: 6px;
                    }
                    .emoji-scroll::-webkit-scrollbar-track {
                      background: #f1f1f1;
                      border-radius: 3px;
                    }
                    .emoji-scroll::-webkit-scrollbar-thumb {
                      background: #c1c1c1;
                      border-radius: 3px;
                    }
                    .emoji-scroll::-webkit-scrollbar-thumb:hover {
                      background: #a1a1a1;
                    }
                  `
                }} />
              </div>
            )}
          </div>

          {/* Expand/Collapse Button - Always visible */}
          <button
            onClick={toggleToolbarExpanded}
            className={`rounded transition-all duration-300 ease-in-out hover:bg-gray-100 text-gray-600 hover:text-gray-900 ${
              isCompact ? 'p-1' : 'p-2'
            }`}
            title={isToolbarExpanded ? "Collapse tools" : "Expand tools"}
          >
            <MoreHorizontal className={`transition-all duration-300 ease-in-out ${
              isCompact ? 'w-3 h-3' : 'w-4 h-4'
            } ${isToolbarExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Expandable tools */}
        <div className={cn(
          "flex items-center gap-1 transition-all duration-300 ease-in-out",
          // On desktop: standard expand/collapse behavior
          !isMobile && (isToolbarExpanded ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0 overflow-hidden'),
          // On mobile: always show when expanded, with flex-shrink-0
          isMobile && (isToolbarExpanded ? 'opacity-100 flex-shrink-0' : 'hidden'),
        )}>
          <button
            onClick={() => onFormat('strikethrough')}
            className={`rounded transition-all duration-300 ease-in-out ${
              isFormatActive('strikethrough') 
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
            onClick={() => onFormat('code')}
            className={`rounded transition-all duration-300 ease-in-out ${
              isFormatActive('code') 
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
            onClick={() => onFormat('heading1')}
            className={`rounded transition-all duration-300 ease-in-out ${
              isFormatActive('heading1') 
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
              isFormatActive('heading2') 
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
              isFormatActive('heading3') 
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
            onClick={() => onFormat('quote')}
            className={`rounded transition-all duration-300 ease-in-out ${
              isFormatActive('quote') 
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
              isFormatActive('link') 
                ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            } ${isCompact ? 'p-1' : 'p-2'}`}
            title="Insert Link"
          >
            <Link className={`transition-all duration-300 ease-in-out ${
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
        </div>
      </div>

      {/* Add scrollbar styles for mobile */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `
      }} />

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