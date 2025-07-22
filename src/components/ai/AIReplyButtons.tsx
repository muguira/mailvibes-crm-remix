import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TimelineActivity } from '@/hooks/use-timeline-activities-v2'
import { toast } from '@/hooks/use-toast'
import { useEmailAI } from '@/hooks/useEmailAI'
import { cn } from '@/lib/utils'
import { ContactInfo } from '@/services/ai'
import { Loader2, MessageSquare, Send, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import React, { useState } from 'react'

/**
 * Props for the AIReplyButtons component
 */
interface AIReplyButtonsProps {
  /** The original email activity that needs a reply */
  originalEmail: TimelineActivity
  /** Optional conversation history for better context-aware replies */
  conversationHistory?: TimelineActivity[]
  /** Contact information to personalize the AI-generated reply */
  contactInfo: ContactInfo
  /** Callback fired when AI generates a reply successfully */
  onReplyGenerated: (replyContent: string) => void
  /** Additional CSS classes to apply to the component */
  className?: string
  /** Whether the reply buttons should be disabled */
  disabled?: boolean
}

/**
 * A React component that provides AI-powered email reply generation with multiple response types.
 *
 * Features:
 * - Three types of replies: Positive, Negative, and Custom
 * - Context-aware generation using conversation history and contact info
 * - Loading states and error handling
 * - Customizable prompts through dialog interface
 * - Toast notifications for user feedback
 * - Accessibility features and keyboard navigation
 *
 * @example
 * ```tsx
 * <AIReplyButtons
 *   originalEmail={emailActivity}
 *   conversationHistory={previousEmails}
 *   contactInfo={contact}
 *   onReplyGenerated={(reply) => setReplyContent(reply)}
 *   disabled={false}
 * />
 * ```
 */
export const AIReplyButtons: React.FC<AIReplyButtonsProps> = ({
  originalEmail,
  conversationHistory = [],
  contactInfo,
  onReplyGenerated,
  className,
  disabled = false,
}) => {
  /** State to track which type of reply is currently being generated */
  const [generatingType, setGeneratingType] = useState<'positive' | 'negative' | 'custom' | null>(null)
  /** State to control the visibility of the custom prompt modal */
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false)
  /** State to store the user's custom prompt input */
  const [customPrompt, setCustomPrompt] = useState('')

  // ✅ RE-ENABLED: Using optimized useEmailAI hook
  const { generatePositiveReply, generateNegativeReply, generateCustomReply, isConfigured, initializationError } =
    useEmailAI({
      showToasts: false, // We'll handle toasts manually for better control
    })

  /**
   * Determines if the reply buttons should be disabled and provides a reason
   * @returns String with disabled reason or null if buttons should be enabled
   */
  const getDisabledReason = (): string | null => {
    if (!originalEmail) return 'No email selected'
    if (initializationError) return `AI initialization failed: ${initializationError.message}`
    if (!isConfigured) return 'AI not configured'
    if (disabled) return 'Feature temporarily disabled'
    if (generatingType) return `Generating ${generatingType} reply...`
    return null
  }

  /**
   * Handles generation of a positive/agreeable email reply
   * Uses AI to create an affirmative response based on the original email context
   */
  const handlePositiveReply = async () => {
    const disabledReason = getDisabledReason()
    if (disabledReason) {
      toast({
        title: 'Cannot generate reply',
        description: disabledReason,
        variant: 'destructive',
      })
      return
    }

    setGeneratingType('positive')
    try {
      const result = await generatePositiveReply(originalEmail, conversationHistory, contactInfo)
      if (result) {
        onReplyGenerated(result)
        toast({
          title: 'Positive reply generated!',
          description: 'AI has generated a positive response.',
        })
      } else {
        toast({
          title: 'Reply generation failed',
          description: 'Could not generate positive reply. Please try again.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to generate positive reply:', error)
      toast({
        title: 'Reply generation failed',
        description: 'An error occurred while generating the reply.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingType(null)
    }
  }

  /**
   * Handles generation of a negative/declining email reply
   * Uses AI to create a polite but declining response based on the original email context
   */
  const handleNegativeReply = async () => {
    const disabledReason = getDisabledReason()
    if (disabledReason) {
      toast({
        title: 'Cannot generate reply',
        description: disabledReason,
        variant: 'destructive',
      })
      return
    }

    setGeneratingType('negative')
    try {
      const result = await generateNegativeReply(originalEmail, conversationHistory, contactInfo)
      if (result) {
        onReplyGenerated(result)
        toast({
          title: 'Negative reply generated!',
          description: 'AI has generated a polite negative response.',
        })
      } else {
        toast({
          title: 'Reply generation failed',
          description: 'Could not generate negative reply. Please try again.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to generate negative reply:', error)
      toast({
        title: 'Reply generation failed',
        description: 'An error occurred while generating the reply.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingType(null)
    }
  }

  /**
   * Handles generation of a custom email reply based on user's specific prompt
   * Validates prompt input and uses AI to create a response following the custom instructions
   */
  const handleCustomReply = async () => {
    if (!customPrompt.trim()) {
      toast({
        title: 'Prompt required',
        description: 'Please enter a custom prompt for the AI to follow.',
        variant: 'destructive',
      })
      return
    }

    const disabledReason = getDisabledReason()
    if (disabledReason) {
      toast({
        title: 'Cannot generate reply',
        description: disabledReason,
        variant: 'destructive',
      })
      return
    }

    setGeneratingType('custom')
    try {
      const result = await generateCustomReply(originalEmail, conversationHistory, contactInfo, customPrompt)
      if (result) {
        onReplyGenerated(result)
        setIsCustomModalOpen(false)
        setCustomPrompt('')
        toast({
          title: 'Custom reply generated!',
          description: 'AI has generated a response based on your prompt.',
        })
      } else {
        toast({
          title: 'Reply generation failed',
          description: 'Could not generate custom reply. Please try again.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to generate custom reply:', error)
      toast({
        title: 'Reply generation failed',
        description: 'An error occurred while generating the reply.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingType(null)
    }
  }

  /** Computed state indicating if any reply type is currently being generated */
  const isGenerating = generatingType !== null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Positive Reply Button - Generates agreeable/affirmative responses */}
      <button
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'cursor-pointer',
          'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isGenerating && 'animate-pulse',
        )}
        onClick={handlePositiveReply}
        disabled={disabled || isGenerating || !isConfigured}
      >
        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
        <span className="ml-1 text-xs">Positive</span>
      </button>

      {/* Negative Reply Button - Generates polite declining responses */}
      <button
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'cursor-pointer',
          'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isGenerating && 'animate-pulse',
        )}
        onClick={handleNegativeReply}
        disabled={disabled || isGenerating || !isConfigured}
      >
        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsDown className="w-3 h-3" />}
        <span className="ml-1 text-xs">Negative</span>
      </button>

      {/* Custom Prompt Button - Opens dialog for user-defined reply instructions */}
      <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            onClick={() => setIsCustomModalOpen(true)}
            disabled={disabled || isGenerating || !isConfigured}
          >
            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
            <span className="ml-1 text-xs">Custom</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Custom AI Reply
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="custom-prompt" className="text-sm font-medium">
                Describe the type of response you want:
              </Label>
              <Textarea
                id="custom-prompt"
                placeholder="e.g., Write a professional response asking for more time to review the proposal..."
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                className="mt-1 min-h-[100px]"
                disabled={isGenerating}
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Context:</span> AI will consider the original email "
                {originalEmail.subject}" and conversation history to generate an appropriate response.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCustomModalOpen(false)
                  setCustomPrompt('')
                }}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCustomReply}
                disabled={!customPrompt.trim() || isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Generate Reply
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status indicator - Shows when AI is not properly configured */}
      {!isConfigured && (
        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-yellow-50 text-yellow-700 border-yellow-200">
          <span className="text-xs">AI Not Configured</span>
        </div>
      )}
    </div>
  )
}
