import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ThumbsUp, ThumbsDown, MessageSquare, Send, Sparkles } from 'lucide-react'
import { useEmailAI } from '@/hooks/useEmailAI' // ✅ RE-ENABLED with optimized hook
import { TimelineActivity } from '@/hooks/use-timeline-activities-v2'
import { ContactInfo } from '@/services/ai'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface AIReplyButtonsProps {
  originalEmail: TimelineActivity
  conversationHistory?: TimelineActivity[]
  contactInfo: ContactInfo
  onReplyGenerated: (replyContent: string) => void
  className?: string
  disabled?: boolean
}

export const AIReplyButtons: React.FC<AIReplyButtonsProps> = ({
  originalEmail,
  conversationHistory = [],
  contactInfo,
  onReplyGenerated,
  className,
  disabled = false,
}) => {
  const [generatingType, setGeneratingType] = useState<'positive' | 'negative' | 'custom' | null>(null)
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')

  // ✅ RE-ENABLED: Using optimized useEmailAI hook
  const { generatePositiveReply, generateNegativeReply, generateCustomReply, isConfigured, initializationError } =
    useEmailAI({
      showToasts: false, // We'll handle toasts manually
    })

  const getDisabledReason = (): string | null => {
    if (!originalEmail) return 'No email selected'
    if (initializationError) return `AI initialization failed: ${initializationError.message}`
    if (!isConfigured) return 'AI not configured'
    if (disabled) return 'Feature temporarily disabled'
    if (generatingType) return `Generating ${generatingType} reply...`
    return null
  }

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

  const isGenerating = generatingType !== null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Positive Reply Button */}
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

      {/* Negative Reply Button */}
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

      {/* Custom Prompt Button */}
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

      {/* Status indicator for non-configured state */}
      {!isConfigured && (
        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-yellow-50 text-yellow-700 border-yellow-200">
          <span className="text-xs">AI Not Configured</span>
        </div>
      )}
    </div>
  )
}
