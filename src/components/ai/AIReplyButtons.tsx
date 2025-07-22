import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ThumbsUp, ThumbsDown, MessageSquare, Send, Sparkles } from 'lucide-react';
import { useEmailAI } from '@/hooks/useEmailAI';
import { TimelineActivity } from '@/hooks/use-timeline-activities-v2';
import { ContactInfo } from '@/services/ai';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface AIReplyButtonsProps {
  originalEmail: TimelineActivity;
  conversationHistory?: TimelineActivity[];
  contactInfo: ContactInfo;
  onReplyGenerated: (replyContent: string) => void;
  className?: string;
  disabled?: boolean;
}

export const AIReplyButtons: React.FC<AIReplyButtonsProps> = ({
  originalEmail,
  conversationHistory = [],
  contactInfo,
  onReplyGenerated,
  className,
  disabled = false
}) => {
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  
  const { 
    generatePositiveReply, 
    generateNegativeReply, 
    generateCustomReply,
    reply,
    isConfigured 
  } = useEmailAI({
    showToasts: false // We'll handle toasts manually
  });

  const handlePositiveReply = async () => {
    if (!isConfigured) {
      toast({
        title: "AI not configured",
        description: "Please configure your AI provider to use this feature.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await generatePositiveReply(originalEmail, conversationHistory, contactInfo);
      if (result) {
        onReplyGenerated(result);
        toast({
          title: "Positive reply generated!",
          description: "AI has generated a positive response.",
        });
      }
    } catch (error) {
      console.error('Failed to generate positive reply:', error);
    }
  };

  const handleNegativeReply = async () => {
    if (!isConfigured) {
      toast({
        title: "AI not configured",
        description: "Please configure your AI provider to use this feature.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await generateNegativeReply(originalEmail, conversationHistory, contactInfo);
      if (result) {
        onReplyGenerated(result);
        toast({
          title: "Negative reply generated!",
          description: "AI has generated a polite negative response.",
        });
      }
    } catch (error) {
      console.error('Failed to generate negative reply:', error);
    }
  };

  const handleCustomReply = async () => {
    if (!customPrompt.trim()) {
      toast({
        title: "Please enter a prompt",
        description: "You need to provide instructions for the AI.",
        variant: "destructive",
      });
      return;
    }

    if (!isConfigured) {
      toast({
        title: "AI not configured",
        description: "Please configure your AI provider to use this feature.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await generateCustomReply(originalEmail, conversationHistory, contactInfo, customPrompt);
      if (result) {
        onReplyGenerated(result);
        setIsCustomModalOpen(false);
        setCustomPrompt('');
        toast({
          title: "Custom reply generated!",
          description: "AI has generated a response based on your prompt.",
        });
      }
    } catch (error) {
      console.error('Failed to generate custom reply:', error);
    }
  };

  const isGenerating = reply.loading;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Positive Reply Button */}
      <button
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "cursor-pointer",
          "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isGenerating && "animate-pulse"
        )}
        onClick={handlePositiveReply}
        disabled={disabled || isGenerating || !isConfigured}
      >
        {isGenerating ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <ThumbsUp className="w-3 h-3" />
        )}
        <span className="ml-1 text-xs">Positive</span>
      </button>

      {/* Negative Reply Button */}
      <button
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "cursor-pointer",
          "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isGenerating && "animate-pulse"
        )}
        onClick={handleNegativeReply}
        disabled={disabled || isGenerating || !isConfigured}
      >
        {isGenerating ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <ThumbsDown className="w-3 h-3" />
        )}
        <span className="ml-1 text-xs">Negative</span>
      </button>

      {/* Custom Prompt Button */}
      <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
        <DialogTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "cursor-pointer",
              "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isGenerating && "animate-pulse"
            )}
            disabled={disabled || isGenerating || !isConfigured}
          >
            {isGenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <MessageSquare className="w-3 h-3" />
            )}
            <span className="ml-1 text-xs">Custom</span>
          </button>
        </DialogTrigger>
        
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
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
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="mt-1 min-h-[100px]"
                disabled={isGenerating}
              />
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Context:</span> AI will consider the original email "{originalEmail.subject}" 
                and conversation history to generate an appropriate response.
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCustomModalOpen(false);
                  setCustomPrompt('');
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
  );
}; 