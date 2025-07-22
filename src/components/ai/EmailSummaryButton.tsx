import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, FileText, Sparkles, Copy, Check } from 'lucide-react';
import { useEmailAI } from '@/hooks/useEmailAI'; // ✅ RE-ENABLED with optimized hook
import { TimelineActivity } from '@/hooks/use-timeline-activities-v2';
import { ContactInfo } from '@/services/ai';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { markdownToHtml } from '@/components/markdown/utils/markdownConverter';

interface EmailSummaryButtonProps {
  emails: TimelineActivity[];
  contactInfo: ContactInfo;
  className?: string;
  variant?: 'button' | 'link';
  disabled?: boolean;
}

export const EmailSummaryButton: React.FC<EmailSummaryButtonProps> = ({
  emails,
  contactInfo,
  className,
  variant = 'link',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [summaryData, setSummaryData] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // ✅ RE-ENABLED: Using optimized useEmailAI hook
  const { 
    summarizeThread, 
    isConfigured,
    initializationError
  } = useEmailAI({
    showToasts: false // We'll handle toasts manually for better control
  });

  const getDisabledReason = (): string | null => {
    if (emails.length === 0) return "No emails to summarize";
    if (initializationError) return `AI initialization failed: ${initializationError.message}`;
    if (!isConfigured) return "AI not configured - add VITE_GEMINI_API_KEY to your .env file";
    if (disabled) return "Feature temporarily disabled";
    if (isGenerating) return "Generating summary...";
    return null;
  };

  const handleSummarize = async () => {
    const disabledReason = getDisabledReason();
    if (disabledReason) {
      toast({
        title: 'Cannot generate summary',
        description: disabledReason,
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await summarizeThread(emails, contactInfo);
      
      if (result) {
        setSummaryData(result);
        toast({
          title: 'Summary generated!',
          description: 'AI has created a summary of the email thread.',
        });
        
        if (!isOpen) {
          setIsOpen(true);
        }
      } else {
        toast({
          title: 'Summary failed',
          description: 'Failed to generate email summary. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
      toast({
        title: 'Summary failed',
        description: 'Failed to generate email summary. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!summaryData) return;
    
    try {
      await navigator.clipboard.writeText(summaryData);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Summary copied to clipboard.',
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy summary to clipboard.',
        variant: 'destructive'
      });
    }
  };

  const disabledReason = getDisabledReason();
  const isDisabled = !!disabledReason;

  const triggerButton = variant === 'button' ? (
    <Button
      onClick={handleSummarize}
      disabled={isDisabled}
      size="sm"
      variant="outline"
      className={cn(
        "h-8 px-3 text-xs",
        className
      )}
      title={getDisabledReason() || "Generate AI summary of this conversation"}
    >
      {isGenerating ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Sparkles className="w-3 h-3" />
      )}
      <span className="ml-1">Summarize</span>
    </Button>
  ) : (
    <button
      onClick={handleSummarize}
      disabled={isDisabled}
      className={cn(
        "flex items-center gap-1 text-xs transition-all duration-300 ease-in-out hover:scale-105",
        "text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      title={getDisabledReason() || "Generate AI summary of this conversation"}
    >
      {isGenerating ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Sparkles className="w-3 h-3" />
      )}
      <span>Summarize</span>
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Email Conversation Summary
            {summaryData && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                Cached
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
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
            <div className="space-y-4">
                               {/* Summary content */}
                 <div className="prose prose-sm max-w-none">
                   <div 
                     className="text-gray-800 leading-relaxed"
                     dangerouslySetInnerHTML={{ 
                       __html: markdownToHtml(summaryData) 
                     }} 
                   />
                 </div>
              
              {/* Metadata */}
              <div className="border-t pt-4 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between items-center">
                  <span>
                    Based on {emails.length} email{emails.length !== 1 ? 's' : ''} with {contactInfo.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">
                      Generated by AI
                    </span>
                    {summaryData && (
                      <span className="bg-gray-100 px-2 py-1 rounded text-gray-600">
                        From cache
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end pt-2 border-t">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
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
            <div className="py-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto opacity-30 mb-4" />
              <p className="text-sm">Click "Summarize" to generate an AI summary of this conversation</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 