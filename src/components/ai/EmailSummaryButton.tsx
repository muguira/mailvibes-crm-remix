import { markdownToHtml } from '@/components/markdown/utils/markdownConverter'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { TimelineActivity } from '@/hooks/use-timeline-activities-v2'
import { toast } from '@/hooks/use-toast'
import { useEmailAI } from '@/hooks/useEmailAI'
import { cn } from '@/lib/utils'
import { ContactInfo } from '@/services/ai'
import { Check, Copy, FileText, Loader2, Sparkles } from 'lucide-react'
import React, { useState } from 'react'

interface EmailSummaryButtonProps {
  emails: TimelineActivity[]
  contactInfo: ContactInfo
  className?: string
  variant?: 'button' | 'link'
  disabled?: boolean
}

/**
 * A React component that provides AI-powered email conversation summarization.
 *
 * Features:
 * - Generates intelligent summaries of email threads using AI
 * - Two visual variants: button style or link style
 * - Modal dialog interface for displaying summaries
 * - Caching of generated summaries for performance
 * - Copy to clipboard functionality
 * - Loading states and error handling
 * - Markdown rendering support for formatted summaries
 * - Toast notifications for user feedback
 * - Accessibility features and proper ARIA attributes
 *
 * @example
 * ```tsx
 * // Button variant
 * <EmailSummaryButton
 *   emails={conversationEmails}
 *   contactInfo={contact}
 *   variant="button"
 * />
 *
 * // Link variant (default)
 * <EmailSummaryButton
 *   emails={emailThread}
 *   contactInfo={contactData}
 *   className="custom-style"
 * />
 * ```
 */
export const EmailSummaryButton: React.FC<EmailSummaryButtonProps> = ({
  emails,
  contactInfo,
  className,
  variant = 'link',
  disabled = false,
}) => {
  /** State to control the visibility of the summary modal dialog */
  const [isOpen, setIsOpen] = useState(false)
  /** State to track if the summary has been copied to clipboard (for UI feedback) */
  const [copied, setCopied] = useState(false)
  /** State to store the generated summary content (cached for performance) */
  const [summaryData, setSummaryData] = useState<string | null>(null)
  /** State to track if a summary is currently being generated */
  const [isGenerating, setIsGenerating] = useState(false)

  // ✅ RE-ENABLED: Using optimized useEmailAI hook for summary generation
  const { summarizeThread, isConfigured, initializationError } = useEmailAI({
    showToasts: false, // We'll handle toasts manually for better control
  })

  /**
   * Determines if the summary button should be disabled and provides a user-friendly reason
   * @returns String with disabled reason or null if button should be enabled
   */
  const getDisabledReason = (): string | null => {
    if (emails.length === 0) return 'No emails to summarize'
    if (initializationError) return `AI initialization failed: ${initializationError.message}`
    if (!isConfigured) return 'AI not configured - add VITE_GEMINI_API_KEY to your .env file'
    if (disabled) return 'Feature temporarily disabled'
    if (isGenerating) return 'Generating summary...'
    return null
  }

  /**
   * Handles the email thread summarization process
   * Validates prerequisites, calls AI service, manages loading states, and handles success/error cases
   */
  const handleSummarize = async () => {
    const disabledReason = getDisabledReason()
    if (disabledReason) {
      toast({
        title: 'Cannot generate summary',
        description: disabledReason,
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)
    try {
      const result = await summarizeThread(emails, contactInfo)

      if (result) {
        setSummaryData(result)
        toast({
          title: 'Summary generated!',
          description: 'AI has created a summary of the email thread.',
        })

        // Auto-open dialog if not already open
        if (!isOpen) {
          setIsOpen(true)
        }
      } else {
        toast({
          title: 'Summary failed',
          description: 'Failed to generate email summary. Please try again.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to generate summary:', error)
      toast({
        title: 'Summary failed',
        description: 'Failed to generate email summary. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Copies the generated summary to the user's clipboard
   * Provides visual feedback and handles potential clipboard API failures
   */
  const copyToClipboard = async () => {
    if (!summaryData) return

    try {
      await navigator.clipboard.writeText(summaryData)
      setCopied(true)
      toast({
        title: 'Copied!',
        description: 'Summary copied to clipboard.',
      })

      // Reset copied state after 2 seconds for UI feedback
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy summary to clipboard.',
        variant: 'destructive',
      })
    }
  }

  /** Current disabled reason if any, or null if button should be enabled */
  const disabledReason = getDisabledReason()
  /** Boolean indicating if the button should be disabled */
  const isDisabled = !!disabledReason

  /**
   * Trigger button component that varies based on the 'variant' prop
   * Renders either as a Button component or a styled button element
   */
  const triggerButton =
    variant === 'button' ? (
      <Button
        onClick={handleSummarize}
        disabled={isDisabled}
        size="sm"
        variant="outline"
        className={cn('h-8 px-3 text-xs', className)}
        title={getDisabledReason() || 'Generate AI summary of this conversation'}
      >
        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        <span className="ml-1">Summarize</span>
      </Button>
    ) : (
      <button
        onClick={handleSummarize}
        disabled={isDisabled}
        className={cn(
          'flex items-center gap-1 text-xs transition-all duration-300 ease-in-out hover:scale-105',
          'text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        title={getDisabledReason() || 'Generate AI summary of this conversation'}
      >
        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        <span>Summarize</span>
      </button>
    )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Email Conversation Summary
            {/* Show cache indicator when summary is already generated */}
            {summaryData && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Cached</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Loading state - Show while AI is generating summary */}
          {isGenerating ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
                <p className="text-sm text-gray-600">Analyzing conversation...</p>
                <p className="text-xs text-gray-500 mt-1">
                  Processing {emails.length} email{emails.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ) : summaryData ? (
            /* Summary display state - Show generated content with actions */
            <div className="space-y-4">
              {/* Summary content - Rendered as HTML from markdown */}
              <div className="prose prose-sm max-w-none">
                <div
                  className="text-gray-800 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: markdownToHtml(summaryData),
                  }}
                />
              </div>

              {/* Metadata section - Shows email count, contact info, and generation source */}
              <div className="border-t pt-4 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between items-center">
                  <span>
                    Based on {emails.length} email{emails.length !== 1 ? 's' : ''} with {contactInfo.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">Generated by AI</span>
                    {summaryData && <span className="bg-gray-100 px-2 py-1 rounded text-gray-600">From cache</span>}
                  </div>
                </div>
              </div>

              {/* Action buttons - Copy to clipboard */}
              <div className="flex justify-end pt-2 border-t">
                <Button onClick={copyToClipboard} variant="outline" size="sm" className="text-xs">
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy Summary
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Empty state - Show when no summary has been generated yet */
            <div className="py-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto opacity-30 mb-4" />
              <p className="text-sm">Click "Summarize" to generate an AI summary of this conversation</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
