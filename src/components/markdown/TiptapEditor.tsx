import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Underline from '@tiptap/extension-underline';
import { createLowlight } from 'lowlight';
import { cn } from '@/lib/utils';
import MarkdownToolbar from './MarkdownToolbar';

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  showToolbar?: boolean;
  externalToolbar?: boolean;
  isCompact?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  onEditorReady?: (editor: any) => void;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  value,
  onChange,
  placeholder = "Type your message...",
  className,
  minHeight = "80px",
  showToolbar = true,
  externalToolbar = false,
  isCompact = false,
  disabled = false,
  autoFocus = false,
  onEditorReady
}) => {
  const lowlight = createLowlight();

  // Stable onChange callback to prevent unnecessary re-renders
  const handleUpdate = useCallback(({ editor }: { editor: any }) => {
    const html = editor.getHTML();
    onChange(html);
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Completely disable codeBlock from StarterKit to avoid conflicts with CodeBlockLowlight
        codeBlock: false,
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          HTMLAttributes: {
            class: "list-disc list-outside my-3 pl-6"
          }
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal list-outside my-3 pl-6"
          }
        },
        listItem: {
          HTMLAttributes: {
            class: "mb-1"
          }
        },
        blockquote: {
          HTMLAttributes: {
            class: "border-l-4 border-teal-500 pl-4 py-2 my-2 bg-teal-50 text-gray-700 italic"
          }
        },
        code: {
          HTMLAttributes: {
            class: "bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono"
          }
        },
        horizontalRule: {
          HTMLAttributes: {
            class: "border-t border-gray-300 my-4"
          }
        }
      }),
      Underline,
      Link.configure({
        HTMLAttributes: {
          class: "text-teal-600 underline hover:text-teal-800 transition-colors",
          target: "_blank",
          rel: "noopener noreferrer"
        }
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto my-2"
        }
      })
    ],
    content: value,
    editable: !disabled,
    autofocus: autoFocus,
    // Follow Tiptap performance recommendations
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none",
          "text-sm text-gray-900 transition-all duration-300 ease-in-out",
          disabled && "opacity-50 cursor-not-allowed"
        ),
        style: `min-height: ${minHeight}; padding: 12px;`,
        'data-placeholder': placeholder,
      },
    },
    onUpdate: handleUpdate,
    onCreate: ({ editor }) => {
      if (onEditorReady) {
        onEditorReady(editor);
      }
    },
  });

  // Sync external value changes with editor content
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  // Handle formatting commands using Tiptap's recommended command chaining
  const handleFormat = useCallback((format: string) => {
    if (!editor) return;

    switch (format) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        editor.chain().focus().toggleUnderline().run();
        break;
      case 'strikethrough':
        editor.chain().focus().toggleStrike().run();
        break;
      case 'code':
        editor.chain().focus().toggleCode().run();
        break;
      case 'heading1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'heading2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'heading3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'numberedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'quote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'divider':
        editor.chain().focus().setHorizontalRule().run();
        break;
    }
  }, [editor]);

  const handleLinkRequest = useCallback((url: string, linkText: string) => {
    if (!editor) return;

    if (url && linkText) {
      editor.chain().focus().setLink({ href: url }).insertContent(linkText).run();
    }
  }, [editor]);

  const handleCodeBlockRequest = useCallback((selectedText: string, range: Range) => {
    if (!editor) return;

    editor.chain().focus().setCodeBlock().run();
    if (selectedText) {
      editor.commands.insertContent(selectedText);
    }
  }, [editor]);

  return (
    <div className={cn("bg-white relative", className)}>
      {/* Rich Text Editor */}
      <div className={cn("outline-none transition-all duration-300 ease-in-out", isCompact ? 'p-2' : 'p-2')}>
        <EditorContent editor={editor} className=""/>
        
        {/* Tiptap-specific styling following their recommendations */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .ProseMirror {
              outline: none !important;
              border: none !important;
              box-shadow: none !important;
            }
            .ProseMirror:empty:before {
              content: attr(data-placeholder);
              color: #9ca3af;
              pointer-events: none;
              height: 0;
              float: left;
            }
            .ProseMirror ul {
              list-style-type: disc;
              list-style-position: outside;
              margin: 12px 0;
              padding-left: 24px;
            }
            .ProseMirror ol {
              list-style-type: decimal;
              list-style-position: outside;
              margin: 12px 0;
              padding-left: 24px;
            }
            .ProseMirror li {
              margin-bottom: 4px;
              line-height: 1.5;
            }
            .ProseMirror h1 {
              font-size: 1.5rem;
              font-weight: 700;
              margin-top: 16px;
              margin-bottom: 8px;
              color: #111827;
            }
            .ProseMirror h2 {
              font-size: 1.25rem;
              font-weight: 700;
              margin-top: 12px;
              margin-bottom: 8px;
              color: #111827;
            }
            .ProseMirror h3 {
              font-size: 1.125rem;
              font-weight: 700;
              margin-top: 12px;
              margin-bottom: 8px;
              color: #111827;
            }
            .ProseMirror blockquote {
              margin: 12px 0;
              padding: 8px 16px;
            }
            .ProseMirror pre {
              margin: 12px 0;
              padding: 16px;
            }
            .ProseMirror code {
              padding: 2px 6px;
            }
            .ProseMirror hr {
              margin: 16px 0;
            }
          `
        }} />
      </div>

      {/* Internal Formatting Toolbar - only show if not external */}
      {showToolbar && !externalToolbar && (
        <div className="relative overflow-x-auto scrollbar-hide">
          <MarkdownToolbar
            editor={editor}
            onFormat={handleFormat}
            onLinkRequest={handleLinkRequest}
            onCodeBlockRequest={handleCodeBlockRequest}
            isCompact={isCompact}
            className={cn(
              "min-w-max",
              isCompact ? 'p-2' : 'p-3'
            )}
          />
        </div>
      )}

      {/* Scrollbar styles for toolbar */}
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
    </div>
  );
};

export default TiptapEditor; 