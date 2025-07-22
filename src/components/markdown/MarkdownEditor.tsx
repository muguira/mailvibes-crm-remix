import React, { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Underline from '@tiptap/extension-underline'
import { createLowlight } from 'lowlight'
import { cn } from '@/lib/utils'
import MarkdownToolbar from './MarkdownToolbar'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  showToolbar?: boolean
  isCompact?: boolean
  disabled?: boolean
  autoFocus?: boolean
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type your message...',
  className,
  minHeight = '80px',
  showToolbar = true,
  isCompact = false,
  disabled = false,
  autoFocus = false,
}) => {
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())
  const [activeHeadingMode, setActiveHeadingMode] = useState<string | null>(null)

  const lowlight = createLowlight()

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable codeBlock from StarterKit to avoid conflicts with CodeBlockLowlight
        codeBlock: false,
        // Configure extensions to match current behavior
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: (level: number) => {
              const classes = {
                1: 'text-2xl font-bold mb-2 mt-4 text-gray-900',
                2: 'text-xl font-bold mb-2 mt-3 text-gray-900',
                3: 'text-lg font-bold mb-2 mt-3 text-gray-900',
              }
              return classes[level as keyof typeof classes] || ''
            },
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc list-outside my-3 pl-6',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal list-outside my-3 pl-6',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'mb-1',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-teal-500 pl-4 py-2 my-2 bg-teal-50 text-gray-700 italic',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono',
          },
        },
        horizontalRule: {
          HTMLAttributes: {
            class: 'border-t border-gray-300 my-4',
          },
        },
      }),
      Underline,
      Link.configure({
        HTMLAttributes: {
          class: 'text-teal-600 underline hover:text-teal-800 transition-colors',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto my-2',
        },
      }),
    ],
    content: value,
    editable: !disabled,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: cn(
          'w-full focus:outline-none text-sm text-gray-900 prose prose-sm max-w-none rich-text-editor transition-all duration-300 ease-in-out',
          disabled && 'opacity-50 cursor-not-allowed',
        ),
        style: `border: none; outline: none; box-shadow: none; resize: none; min-height: ${minHeight}`,
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
    },
    onSelectionUpdate: ({ editor }) => {
      updateActiveFormats(editor)
    },
    onCreate: ({ editor }) => {
      updateActiveFormats(editor)
    },
  })

  // Update active formats based on current selection
  const updateActiveFormats = (editor: any) => {
    const formats = new Set<string>()

    if (editor.isActive('bold')) formats.add('bold')
    if (editor.isActive('italic')) formats.add('italic')
    if (editor.isActive('underline')) formats.add('underline')
    if (editor.isActive('strike')) formats.add('strikethrough')
    if (editor.isActive('code')) formats.add('code')
    if (editor.isActive('link')) formats.add('link')
    if (editor.isActive('heading', { level: 1 })) formats.add('heading1')
    if (editor.isActive('heading', { level: 2 })) formats.add('heading2')
    if (editor.isActive('heading', { level: 3 })) formats.add('heading3')
    if (editor.isActive('blockquote')) formats.add('quote')
    if (editor.isActive('bulletList')) formats.add('bulletList')
    if (editor.isActive('orderedList')) formats.add('numberedList')

    setActiveFormats(formats)
  }

  // Handle formatting commands
  const handleFormat = (format: string) => {
    if (!editor) return

    // Handle heading mode activation/deactivation
    if (format === 'heading1' || format === 'heading2' || format === 'heading3') {
      const level = parseInt(format.charAt(format.length - 1)) as 1 | 2 | 3
      const selection = editor.state.selection

      if (selection.empty) {
        // No text selected - toggle heading mode
        if (activeHeadingMode === format) {
          // Deactivate current heading mode
          console.log('Deactivating heading mode:', format)
          setActiveHeadingMode(null)
        } else {
          // Activate new heading mode
          console.log('Activating heading mode:', format)
          setActiveHeadingMode(format)
          // Apply heading to current line
          editor.chain().focus().toggleHeading({ level }).run()
        }
        return
      } else {
        // Text selected - apply heading normally
        editor.chain().focus().toggleHeading({ level }).run()
      }
      return
    }

    // Handle other formats
    switch (format) {
      case 'bold':
        editor.chain().focus().toggleBold().run()
        break
      case 'italic':
        editor.chain().focus().toggleItalic().run()
        break
      case 'underline':
        editor.chain().focus().toggleUnderline().run()
        break
      case 'strikethrough':
        editor.chain().focus().toggleStrike().run()
        break
      case 'code':
        editor.chain().focus().toggleCode().run()
        break
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run()
        break
      case 'numberedList':
        editor.chain().focus().toggleOrderedList().run()
        break
      case 'quote':
        editor.chain().focus().toggleBlockquote().run()
        break
      case 'divider':
        editor.chain().focus().setHorizontalRule().run()
        break
    }
  }

  // Handle link requests
  const handleLinkRequest = (url: string, linkText: string) => {
    if (!editor) return

    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  // Handle code block requests
  const handleCodeBlockRequest = (code: string, range: Range) => {
    if (!editor) return

    editor.chain().focus().setCodeBlock().run()
    // Insert the code content
    editor.commands.insertContent(code)
  }

  // Handle heading mode application on typing
  useEffect(() => {
    if (!editor || !activeHeadingMode) return

    const handleUpdate = () => {
      const level = parseInt(activeHeadingMode.charAt(activeHeadingMode.length - 1)) as 1 | 2 | 3
      const { from, to } = editor.state.selection

      // If we're typing and not in a heading, apply heading
      if (from === to && !editor.isActive('heading', { level })) {
        editor.chain().focus().toggleHeading({ level }).run()
      }
    }

    editor.on('update', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor, activeHeadingMode])

  // Handle Shift+Enter to deactivate heading mode
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (event: KeyboardEvent) => {
      console.log('Key pressed:', event.key, 'Shift:', event.shiftKey, 'Active heading mode:', activeHeadingMode)

      if (event.key === 'Enter' && event.shiftKey && activeHeadingMode) {
        event.preventDefault()
        event.stopPropagation()

        console.log('Deactivating heading mode and creating normal paragraph')
        setActiveHeadingMode(null)

        // Create a new paragraph and move cursor there
        editor.chain().focus().splitBlock().run()

        // Ensure the new block is not a heading
        setTimeout(() => {
          if (editor.isActive('heading')) {
            editor.chain().focus().setParagraph().run()
          }
        }, 0)
      }
    }

    const editorElement = editor.view.dom
    editorElement.addEventListener('keydown', handleKeyDown, true) // Use capture phase

    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [editor, activeHeadingMode])

  // Sync content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false)
    }
  }, [value, editor])

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
      {/* Rich Text Editor */}
      <div className={cn('outline-none transition-all duration-300 ease-in-out', isCompact ? 'p-2' : 'p-4')}>
        {/* Debug indicator */}
        <div className="text-xs text-green-600 mb-1">
          Using TiptapEditor {activeHeadingMode && `(${activeHeadingMode} mode active)`}
        </div>
        <EditorContent editor={editor} />

        {/* Preserve exact same styling */}
        <style
          dangerouslySetInnerHTML={{
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
            /* Tiptap specific styles to match design */
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
          `,
          }}
        />
      </div>

      {/* Scrollbar styles for toolbar */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `,
        }}
      />

      {/* Internal Formatting Toolbar */}
      {showToolbar && (
        <div className="relative overflow-x-auto scrollbar-hide">
          <MarkdownToolbar
            editor={editor}
            onFormat={handleFormat}
            onLinkRequest={handleLinkRequest}
            onCodeBlockRequest={handleCodeBlockRequest}
            isCompact={isCompact}
            className={cn('min-w-max', isCompact ? 'p-2' : 'p-3')}
          />
        </div>
      )}
    </div>
  )
}

export default MarkdownEditor
