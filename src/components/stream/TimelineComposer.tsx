import React, { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  CalendarDays,
  AlertCircle,
  Download,
  RefreshCw,
  Plus,
  Minus,
  Edit3,
  Clock,
  AtSign
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useParams } from "react-router-dom";
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import { useActivities } from '@/hooks/supabase/use-activities';
import { useGmailConnection } from '@/hooks/use-gmail-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useContactEmails } from '@/hooks/use-contact-emails-v2';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GmailConnectionModal } from '@/components/stream/GmailConnectionModal';
import { TiptapEditor, MarkdownToolbar } from '@/components/markdown';
import { Input } from '@/components/ui/input';
import { useGmailStore } from '@/stores/gmail/gmailStore';
import { toast } from '@/hooks/use-toast';
import { GmailPermissionsAlert, useGmailPermissionsAlert } from '@/components/integrations/gmail/GmailPermissionsAlert';
import { GmailEmail } from '@/services/google/gmailApi';

const ACTIVITY_TYPES = [
  { id: 'call', label: 'Call', icon: Phone },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'note', label: 'Note', icon: MessageCircle },
  { id: 'meeting', label: 'Meeting', icon: Calendar },
];

interface TimelineComposerProps {
  contactId?: string;
  isCompact?: boolean;
  onExpand?: () => void;
  onCreateActivity?: (activity: { type: string; content: string; timestamp: string }) => void;
  contactEmail?: string;
  onSyncEmailHistory?: () => Promise<void>;
  syncStatus?: 'idle' | 'syncing' | 'completed' | 'failed';
  emailsCount?: number;
  hasMoreEmails?: boolean;
  // ✅ NEW: Reply context props
  replyContext?: {
    isReply: true;
    originalEmail: GmailEmail;
    originalSubject: string;
  };
}

// Custom DateTime picker component
const DateTimePicker = ({ 
  date, 
  onDateChange, 
  time, 
  onTimeChange, 
  isCompact = false 
}: {
  date: Date;
  onDateChange: (date: Date) => void;
  time: string;
  onTimeChange: (time: string) => void;
  isCompact?: boolean;
}) => {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Generate time options (every 30 minutes)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const label = formatTime(timeValue);
      timeOptions.push({ value: timeValue, label });
    }
  }

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className={`text-gray-500 transition-all duration-300 ease-in-out ${
        isCompact ? 'w-3 h-3' : 'w-4 h-4'
      }`} />
      
      {/* Date Picker */}
      <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`justify-start text-left font-normal transition-all duration-300 ease-in-out ${
              isCompact ? 'text-xs h-7 px-2' : 'text-sm h-8 px-3'
            }`}
          >
            {formatDate(date)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[10000]" align="start">
          <CalendarComponent
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              if (newDate) {
                onDateChange(newDate);
                setIsDateOpen(false);
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Time Picker */}
      <Popover open={isTimeOpen} onOpenChange={setIsTimeOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`justify-start text-left font-normal transition-all duration-300 ease-in-out ${
              isCompact ? 'text-xs h-7 px-2' : 'text-sm h-8 px-3'
            }`}
          >
            {formatTime(time)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[10000]" align="start">
          <div className="max-h-48 overflow-y-auto">
            {timeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onTimeChange(option.value);
                  setIsTimeOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                  option.value === time ? 'bg-gray-100' : ''
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default function TimelineComposer({ 
  contactId, 
  isCompact = false, 
  onExpand, 
  onCreateActivity, 
  contactEmail,
  onSyncEmailHistory,
  syncStatus = 'idle',
  emailsCount = 0,
  hasMoreEmails = false,
  replyContext
}: TimelineComposerProps) {
  const [text, setText] = useState("");
  const [selectedActivityType, setSelectedActivityType] = useState('note');
  const [activityDate, setActivityDate] = useState(new Date());
  const [activityTime, setActivityTime] = useState(() => {
    // Default to current time in HH:MM format
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  });
  const [isDateTimeManuallySet, setIsDateTimeManuallySet] = useState(false);
  const [editor, setEditor] = useState<any>(null);
  
  // Email-specific states
  const [emailFields, setEmailFields] = useState({
    to: contactEmail || '',
    cc: '',
    bcc: '',
    subject: replyContext ? `Re: ${replyContext.originalSubject}` : ''
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showPermissionsAlert, setShowPermissionsAlert] = useState(false);
  const [showAdvancedEmailFields, setShowAdvancedEmailFields] = useState(false);
  const [showDateTime, setShowDateTime] = useState(false);
  
  // Click-to-edit states for email fields
  const [editingField, setEditingField] = useState<'subject' | 'cc' | 'bcc' | null>(null);
  const { recordId } = useParams();
  const effectiveContactId = contactId || recordId;
  const { createActivity } = useActivities(effectiveContactId);
  const { isConnected: isGmailConnected } = useGmailConnection();
  const isMobile = useIsMobile();
  const gmailStore = useGmailStore();
  const { triggerPermissionsAlert } = useGmailPermissionsAlert();
  
  // Update email "to" field when contactEmail changes
  useEffect(() => {
    if (contactEmail) {
      setEmailFields(prev => ({
        ...prev,
        to: contactEmail
      }));
    }
  }, [contactEmail]);

  // Reset advanced fields when switching away from email type
  useEffect(() => {
    if (selectedActivityType !== 'email') {
      setShowAdvancedEmailFields(false);
      setEditingField(null); // Exit edit mode when switching activity types
    }
  }, [selectedActivityType]);

  // Handle click-to-edit functionality
  const handleFieldClick = (fieldName: 'subject' | 'cc' | 'bcc') => {
    if (!isSendingEmail) {
      setEditingField(fieldName);
    }
  };

  const handleFieldBlur = (fieldName: 'subject' | 'cc' | 'bcc') => {
    setEditingField(null);
  };

  const handleFieldKeyDown = (e: React.KeyboardEvent, fieldName: 'subject' | 'cc' | 'bcc') => {
    if (e.key === 'Enter') {
      setEditingField(null);
    }
    if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  // Component for click-to-edit fields
  const ClickToEditField = ({ 
    fieldName, 
    label, 
    value, 
    onChange, 
    placeholder,
    type = "text",
    required = false 
  }: {
    fieldName: 'subject' | 'cc' | 'bcc';
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    type?: string;
    required?: boolean;
  }) => {
    const isEditing = editingField === fieldName;
    const isEmpty = !value || value.trim() === '';

    if (isEditing) {
      return (
        <div>
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => handleFieldBlur(fieldName)}
            onKeyDown={(e) => handleFieldKeyDown(e, fieldName)}
            placeholder={
              fieldName === 'subject' ? 'Email subject' : 
              fieldName === 'cc' ? 'CC email' :
              'BCC email'
            }
            className="h-8 w-full text-sm leading-none border-none bg-gray-50 rounded-md px-3 py-2 focus:outline-none transition-colors"
            disabled={isSendingEmail}
            required={required}
            autoFocus
          />
        </div>
      );
    }

        return (
      <div 
        className="cursor-pointer group"
        onClick={() => handleFieldClick(fieldName)}
        title={`Click to edit ${label.toLowerCase()}`}
      >
        <div className={cn(
          "h-8 px-3 py-2 text-sm leading-none transition-all duration-200 relative flex items-center justify-between",
          "hover:bg-gray-50 rounded-md", // All fields: no borders, subtle hover
          isEmpty ? "text-muted-foreground" : "text-foreground",
          isSendingEmail ? "opacity-50 cursor-not-allowed" : "cursor-text"
        )}>
          <span className="flex-1 truncate">
            {isEmpty ? (
              fieldName === 'subject' ? 'Subject' : 
              fieldName === 'cc' ? 'CC' :
              'BCC'
            ) : value}
          </span>
          <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
        </div>
      </div>
    );
  };
  
  // Use provided contactEmail (we'll assume it's passed from parent)
  const effectiveContactEmail = contactEmail;
  
  // Use modern emails hook to get email info and sync capabilities
  const {
    emails,
    hasMore,
    syncStatus: internalSyncStatus,
    syncEmailHistory,
    addOptimisticEmail
  } = useContactEmails({
    contactEmail: effectiveContactEmail,
    autoFetch: true,
  });
  
  // Show sync button if we have emails but there are more available (incomplete history)
  const shouldShowSyncButton = isGmailConnected && 
                               effectiveContactEmail && 
                               emails && 
                               emails.length > 0 && 
                               (hasMore || emails.length < 200);

  const handleSendEmail = async () => {
    if (!text.trim()) {
      toast({
        title: "Error",
        description: "Please enter email content",
        variant: "destructive",
      });
      return;
    }

    if (!emailFields.to || !emailFields.subject) {
      toast({
        title: "Error", 
        description: !emailFields.to 
          ? "No recipient email found for this contact" 
          : "Please enter an email subject",
        variant: "destructive",
      });
      return;
    }

    if (!isGmailConnected) {
      toast({
        title: "Error",
        description: "No Gmail account connected. Please connect Gmail to send emails.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);

    try {
      // Get Gmail service from store
      const gmailService = gmailStore.service;
      if (!gmailService) {
        throw new Error('Gmail service not initialized');
      }

      // ✅ ENHANCED: Use reply context for accurate threading detection
      let inReplyTo: string | undefined;
      let references: string | undefined;
      let threadId: string | undefined;
      
      if (replyContext) {
        // ✅ ACCURATE: This is a confirmed reply from reply button
        const originalEmail = replyContext.originalEmail;
        
        // ✅ CRITICAL: Only use real Gmail threadId (not artificial ones)
        if (originalEmail.threadId && 
            !originalEmail.threadId.includes('optimistic-') &&
            !originalEmail.threadId.includes('subject-') &&
            !originalEmail.threadId.includes('new-conversation-') &&
            originalEmail.threadId !== 'reply-thread') {
          
          threadId = originalEmail.threadId;
          
          // ✅ CRITICAL: Use REAL RFC 2822 Message-ID for threading
          let messageId: string;
          if (originalEmail.messageId) {
            // Use the actual Message-ID from the email headers
            messageId = originalEmail.messageId;
          } else {
            // Fallback: Convert Gmail ID to proper Message-ID format
            messageId = `<${originalEmail.id}@gmail.googleapis.com>`;
          }
          inReplyTo = messageId;
          
          // ✅ CRITICAL: Build References chain per RFC 2822 (following guide requirements)
          // Guide: "Se debe recuperar la cabecera References del correo electrónico original"
          // Guide: "Se debe añadir el Message-ID del correo electrónico original a esta lista"
          let originalReferences = '';
          if (originalEmail.references && typeof originalEmail.references === 'string') {
            originalReferences = originalEmail.references.trim();
          }
          
          // Build the complete References chain: original references + current email's Message-ID
          if (originalReferences) {
            references = `${originalReferences} ${messageId}`;
          } else {
            // First reply - start the References chain with the original Message-ID
            references = messageId;
          }
          
          logger.log("🔗 Setting up email threading for confirmed reply:", {
            originalEmailId: originalEmail.id,
            originalSubject: replyContext.originalSubject,
            threadId,
            inReplyTo,
            references,
            originalReferences,
            hasOriginalReferences: !!originalReferences,
            referencesCount: references?.split(' ').length || 0,
            isRealGmailThread: true
          });
        } else {
          logger.log("⚠️ Original email has artificial threadId, not using threading:", {
            threadId: originalEmail.threadId,
            reasoning: "Artificial threadId detected"
          });
        }
      } else {
        // ✅ NEW EMAILS: No threading for emails from main composer
        logger.log("📧 Creating new email (no threading):", {
          subject: emailFields.subject,
          reasoning: "Email from main composer, not a reply"
        });
      }

      // Send email via Gmail API with threading support
      const result = await gmailService.sendEmail({
        to: [emailFields.to],
        cc: emailFields.cc ? [emailFields.cc] : undefined,
        bcc: emailFields.bcc ? [emailFields.bcc] : undefined,
        subject: emailFields.subject,
        bodyHtml: text,
        contactId: effectiveContactId,
        inReplyTo,
        references,
        threadId // ✅ CRITICAL: Pass threadId for Gmail API threading
      });

      // ✅ NEW: Create optimistic email for immediate UI feedback
      if (effectiveContactEmail && addOptimisticEmail) {
        // ✅ ENHANCED: Use appropriate threadId based on context
        let detectedThreadId: string;
        
        if (replyContext && threadId) {
          // ✅ REPLY: Use the real Gmail threadId we detected
          detectedThreadId = result.threadId || threadId;
          logger.log("🔗 Using threadId for confirmed reply:", {
            threadId: detectedThreadId,
            gmailResponseThreadId: result.threadId,
            originalThreadId: threadId
          });
        } else {
          // ✅ NEW EMAIL: Always create unique threadId to prevent artificial grouping
          detectedThreadId = result.threadId || `new-conversation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          logger.log("📧 Creating unique thread for new email:", {
            subject: emailFields.subject,
            newThreadId: detectedThreadId,
            reasoning: "New email from main composer should be independent"
          });
        }

        const optimisticEmail: GmailEmail = {
          id: `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique temporary ID
          threadId: detectedThreadId,
          subject: emailFields.subject,
          snippet: text.replace(/<[^>]*>/g, '').substring(0, 150) + '...',
          bodyText: text.replace(/<[^>]*>/g, ''),
          bodyHtml: text,
          from: {
            email: gmailStore.accounts[0]?.email || '',
            name: gmailStore.accounts[0]?.email?.split('@')[0] || 'You'
          },
          to: [{ email: emailFields.to }],
          cc: emailFields.cc ? [{ email: emailFields.cc }] : undefined,
          bcc: emailFields.bcc ? [{ email: emailFields.bcc }] : undefined,
          date: new Date().toISOString(),
          isRead: true, // Sent emails are considered "read"
          isImportant: false,
          labels: ['SENT'],
          attachments: []
        };
        
        // Add immediately to the timeline for instant feedback
        addOptimisticEmail(optimisticEmail);
        
        logger.log("✨ Created optimistic email for instant feedback:", {
          optimisticId: optimisticEmail.id,
          subject: optimisticEmail.subject,
          to: emailFields.to,
          snippet: optimisticEmail.snippet.substring(0, 50) + '...'
        });
      }
      
      // Clear form immediately for better UX
      setText("");
      setEmailFields({
        to: contactEmail || '',
        cc: '',
        bcc: '',
        subject: ''
      });
      setShowAdvancedEmailFields(false);
      setEditingField(null);
      
      if (editor) {
        editor.commands.setContent('', false);
      }

      // Show success toast - email already appears optimistically
      toast({
        title: "Email sent successfully!",
        description: `Email sent to ${emailFields.to}. Syncing with Gmail in the background.`,
      });

      logger.log("Email sent successfully:", {
        messageId: result.messageId,
        to: emailFields.to,
        subject: emailFields.subject
      });

      // ✅ CRITICAL: Auto-sync to get the real sent email from Gmail
      // This replaces the immediate activity creation and prevents duplicates
      if (effectiveContactEmail && syncEmailHistory) {
        // Use a more robust approach with retries
        const autoSync = async () => {
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts) {
            try {
              // Progressive delay to ensure Gmail processes the email
              await new Promise(resolve => setTimeout(resolve, 3000 + (attempts * 1500))); 
              
              // Trigger the sync (which now includes auto-refresh) with email send flag
              await syncEmailHistory({ isAfterEmailSend: true });
              
              logger.log("Auto-sync after email send successful");
              break; // Success, exit loop
              
            } catch (syncError) {
              attempts++;
              logger.warn(`Auto-sync attempt ${attempts} failed:`, syncError);
              
              if (attempts >= maxAttempts) {
                logger.error("Auto-sync after email send failed after all attempts:", syncError);
                // Don't show error to user as the email was sent successfully
                // User can manually sync if needed
              }
            }
          }
        };
        
        // Execute auto-sync in background
        autoSync();
      }

    } catch (error) {
      logger.error("Failed to send email:", error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if error is due to insufficient scopes
      if (errorMessage.includes('insufficient authentication scopes') || 
          errorMessage.includes('insufficient scope') ||
          errorMessage.includes('The required scopes are not present')) {
        
        setShowPermissionsAlert(true);
        triggerPermissionsAlert();
        
        toast({
          title: "Gmail Permissions Required",
          description: "Please reconnect Gmail with email sending permissions.",
          variant: "destructive",
          action: (
            <button 
              onClick={() => setShowPermissionsAlert(true)}
              className="text-white underline hover:no-underline"
            >
              Update Permissions
            </button>
          )
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to send email: ${errorMessage}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSend = () => {
    if (!text.trim()) return;

    if (selectedActivityType === 'email') {
      handleSendEmail();
      return;
    }

    if (effectiveContactId) {
      // Use current date/time if not manually set, otherwise use the selected date/time
      let finalDate = activityDate;
      let finalTime = activityTime;
      
      if (!isDateTimeManuallySet) {
        // Update to current date/time for most recent timestamp
        const now = new Date();
        finalDate = now;
        finalTime = now.toTimeString().slice(0, 5);
      }
      
      // Combine date and time into a proper timestamp
      const year = finalDate.getFullYear();
      const month = finalDate.getMonth();
      const day = finalDate.getDate();
      const [hours, minutes] = finalTime.split(':');
      
      const activityDateTime = new Date(year, month, day, parseInt(hours), parseInt(minutes));
      const activityTimestamp = activityDateTime.toISOString();
      
      logger.log("Activity:", { 
        type: selectedActivityType, 
        content: text, 
        contactId: effectiveContactId,
        timestamp: activityTimestamp,
        wasManuallySet: isDateTimeManuallySet
      });
      
      // Use the provided onCreateActivity prop or fall back to internal createActivity
      if (onCreateActivity) {
        onCreateActivity({
          type: selectedActivityType,
          content: text,
          timestamp: activityTimestamp
        });
      } else {
        // Create activity in Supabase with custom timestamp
        createActivity({
          type: selectedActivityType,
          content: text,
          timestamp: activityTimestamp
        });
      }
      
      // Clear the text after sending
      setText("");
      
      // Also clear the editor directly to ensure it's empty
      if (editor) {
        editor.commands.setContent('', false);
      }
      
      // Reset to current date/time for next activity
      setActivityDate(new Date());
      const now = new Date();
      setActivityTime(now.toTimeString().slice(0, 5));
      setIsDateTimeManuallySet(false);
    }
  };

  const handleFocus = () => {
    // If editor is in compact mode and user clicks to focus, expand it
    if (isCompact && onExpand) {
      onExpand();
    }
  };

  const handleEditorClick = () => {
    // Also expand when clicking anywhere in the editor area
    if (isCompact && onExpand) {
      onExpand();
    }
  };

  const clearContent = () => {
    setText("");
    setShowAdvancedEmailFields(false); // Reset advanced fields when clearing
    setEditingField(null); // Exit edit mode when clearing
    // Also clear the editor directly to ensure it's empty
    if (editor) {
      editor.commands.setContent('', false);
    }
  };

  // Handle manual date/time changes
  const handleDateChange = (newDate: Date) => {
    setActivityDate(newDate);
    setIsDateTimeManuallySet(true);
  };

  const handleTimeChange = (newTime: string) => {
    setActivityTime(newTime);
    setIsDateTimeManuallySet(true);
  };

  // Handle sync historical emails
  const handleSyncHistoricalEmails = async () => {
    // Use prop function if provided (from StreamTimeline), otherwise use hook function
    if (onSyncEmailHistory) {
      await onSyncEmailHistory();
    } else if (syncEmailHistory) {
      await syncEmailHistory();
    }
  };

  // Handle formatting commands for the editor
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

    const selection = window.getSelection();
    if (selection && range) {
      selection.removeAllRanges();
      selection.addRange(range);
      
      const codeBlock = `\`\`\`\n${selectedText}\n\`\`\``;
      editor.chain().focus().insertContent(codeBlock).run();
    }
  }, [editor]);

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-300 ease-in-out"
      onClick={handleEditorClick}
    >
      {/* Activity Type Selector */}
      <div className={`flex items-center gap-1 border-b border-gray-100 transition-all duration-300 ease-in-out ${
        isCompact ? 'p-2' : 'p-3'
      }`}>
        {ACTIVITY_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedActivityType(type.id)}
              className={cn(
                "flex items-center gap-2 rounded-md font-medium transition-all duration-300 ease-in-out",
                selectedActivityType === type.id
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                isCompact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
              )}
            >
              <Icon className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
              {!isCompact && type.label}
            </button>
          );
        })}
      </div>

      {/* Minimalist Controls Row */}
      <div className={`flex items-center gap-2 border-b border-gray-100 transition-all duration-300 ease-in-out ${
        isCompact ? 'p-2' : 'p-3'
      }`}>
        {/* Date/Time Toggle Button - Always visible */}
        <button
          type="button"
          onClick={() => setShowDateTime(!showDateTime)}
          className={`flex items-center gap-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors ${
            showDateTime ? 'bg-gray-100 text-gray-900' : ''
          } ${isCompact ? 'px-2 py-1 text-xs' : 'px-2 py-1.5 text-xs'}`}
          title="Date & Time"
        >
          <Clock className="w-3 h-3" />
          {!isCompact && <span className="text-xs">Time</span>}
        </button>

        {/* CC/BCC Toggle Button - Only when email is selected */}
        {selectedActivityType === 'email' && (
          <button
            type="button"
            onClick={() => setShowAdvancedEmailFields(!showAdvancedEmailFields)}
            className={`flex items-center gap-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors ${
              showAdvancedEmailFields ? 'bg-gray-100 text-gray-900' : ''
            } ${isCompact ? 'px-2 py-1 text-xs' : 'px-2 py-1.5 text-xs'}`}
            disabled={isSendingEmail}
            title="CC & BCC"
          >
            <AtSign className="w-3 h-3" />
            {!isCompact && <span className="text-xs">CC</span>}
          </button>
        )}
      </div>

      {/* Date and Time Selector - Collapsible */}
      {showDateTime && (
        <div className={`flex items-center gap-3 border-b border-gray-100 transition-all duration-300 ease-in-out animate-in slide-in-from-top-2 duration-200 ${
          isCompact ? 'p-2' : 'p-3'
        }`}>
          <DateTimePicker
            date={activityDate}
            onDateChange={handleDateChange}
            time={activityTime}
            onTimeChange={handleTimeChange}
            isCompact={isCompact}
          />
        </div>
      )}

      {/* Email Fields - only show when email type is selected */}
      {selectedActivityType === 'email' && (
        <div className={`space-y-3 border-b border-gray-100 transition-all duration-300 ease-in-out ${
          isCompact ? 'p-2' : 'p-3'
        }`}>
          {/* Subject Field - Always visible with click-to-edit */}
          <ClickToEditField
            fieldName="subject"
            label="Subject"
            value={emailFields.subject}
            onChange={(value) => setEmailFields(prev => ({ ...prev, subject: value }))}
            placeholder="Click to add email subject"
            required
          />
          
          {/* CC/BCC Fields - Collapsible with click-to-edit */}
          {showAdvancedEmailFields && (
            <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-200">
              <ClickToEditField
                fieldName="cc"
                label="CC"
                value={emailFields.cc}
                onChange={(value) => setEmailFields(prev => ({ ...prev, cc: value }))}
                placeholder="Click to add CC"
                type="email"
              />
              <ClickToEditField
                fieldName="bcc"
                label="BCC"
                value={emailFields.bcc}
                onChange={(value) => setEmailFields(prev => ({ ...prev, bcc: value }))}
                placeholder="Click to add BCC"
                type="email"
              />
            </div>
          )}
        </div>
      )}

      {/* Gmail Permissions Alert */}
      {showPermissionsAlert && (
        <div className="p-3 border-b border-gray-100">
          <GmailPermissionsAlert 
            onReconnectStart={() => {
              logger.info('Gmail reconnection started from TimelineComposer');
            }}
            onReconnectSuccess={() => {
              setShowPermissionsAlert(false);
              toast({
                title: "Success",
                description: "Gmail permissions updated. You can now send emails!",
              });
            }}
          />
        </div>
      )}

      {/* Rich Text Editor */}
      <div className={`outline-none transition-all duration-300 ease-in-out ${
        isCompact ? 'p-0' : 'p-0'
      }`}>
        <TiptapEditor
          value={text}
          onChange={setText}
          placeholder="Type a message..."
          minHeight={isCompact ? "40px" : "80px"}
          showToolbar={false}
          externalToolbar={true}
          isCompact={isCompact}
          autoFocus={false}
          onEditorReady={(editor) => setEditor(editor)}
        />
      </div>

      {/* Horizontal layout: Toolbar + Action Buttons */}
      <div className={`flex items-center border-t border-gray-100 transition-all duration-300 ease-in-out gap-3 ${
        isCompact ? 'p-2' : 'p-3'
      }`}>
        {/* Gmail not connected indicator */}
        {!isGmailConnected && (
          <Tooltip>
            <TooltipTrigger asChild>
              <GmailConnectionModal onRefresh={() => window.location.reload()}>
                <button
                  className={`rounded hover:bg-gray-100 text-amber-500 hover:text-amber-600 transition-all duration-300 ease-in-out flex-shrink-0 ${
                    isCompact ? 'p-1' : 'p-2'
                  }`}
                  title="Gmail not connected"
                >
                  <AlertCircle className={`transition-all duration-300 ease-in-out ${
                    isCompact ? 'w-3 h-3' : 'w-4 h-4'
                  }`} />
                </button>
              </GmailConnectionModal>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">Gmail not connected - Click to connect</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Toolbar - flexible with scroll */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
          <MarkdownToolbar
            editor={editor}
            onFormat={handleFormat}
            onLinkRequest={handleLinkRequest}
            onCodeBlockRequest={handleCodeBlockRequest}
            isCompact={isCompact}
            className={cn(
              "transition-all duration-300 ease-in-out min-w-max",
              isCompact ? "p-1" : "p-0"
            )}
          />
        </div>

        {/* Action Buttons - always visible */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={clearContent}
            disabled={!text.trim()}
            className={`transition-all duration-300 ease-in-out ${
              isCompact ? "text-xs px-2 py-1 h-7" : "h-8"
            }`}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!text.trim() || isSendingEmail}
            onClick={handleSend}
            className={`bg-teal-600 hover:bg-teal-700 transition-all duration-300 ease-in-out ${
              isCompact ? "text-xs px-2 py-1 h-7" : "h-8"
            }`}
          >
            {isSendingEmail ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Sending...
              </>
            ) : selectedActivityType === 'email' ? (
              'Send Email'
            ) : (
              'Ok'
            )}
          </Button>
        </div>
      </div>

      {/* Add scrollbar styles for horizontal scroll */}
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
}
