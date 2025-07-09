import { useMemo } from "react";
import { useActivities, Activity } from "@/hooks/supabase/use-activities";
import { useHybridContactEmails } from "@/hooks/use-hybrid-contact-emails";
import { useStore } from "@/stores";
import { GmailEmail } from "@/services/google/gmailApi";
import { logger } from "@/utils/logger";

export interface TimelineActivity {
  id: string;
  type: "note" | "email" | "call" | "meeting" | "task" | "system";
  content?: string | null;
  timestamp: string;
  source: "internal" | "gmail";

  // Email-specific fields
  subject?: string;
  from?: {
    name?: string;
    email: string;
  };
  to?: Array<{
    name?: string;
    email: string;
  }>;
  snippet?: string;
  isRead?: boolean;
  isImportant?: boolean;
  bodyText?: string;
  bodyHtml?: string;
  labels?: string[];
  attachments?: any[];
}

interface UseTimelineActivitiesOptions {
  contactId?: string;
  contactEmail?: string;
  includeEmails?: boolean;
  maxEmails?: number;
}

interface UseTimelineActivitiesReturn {
  activities: TimelineActivity[];
  loading: boolean;
  error: string | null;
  emailsCount: number;
  internalCount: number;
  hasGmailAccounts: boolean;
  emailSource: "database" | "api" | "hybrid";
  lastSyncAt?: Date;
  syncStatus: "idle" | "syncing" | "completed" | "failed";
  refreshEmails: () => Promise<void>;
  triggerSync: () => Promise<void>;
}

export function useTimelineActivities(
  options: UseTimelineActivitiesOptions = {}
): UseTimelineActivitiesReturn {
  const {
    contactId,
    contactEmail,
    includeEmails = true,
    maxEmails = 20,
  } = options;

  const {
    connectedAccounts,
    isLoading: gmailLoading,
    authError: gmailError,
  } = useStore();
  const hasGmailAccounts = connectedAccounts.length > 0;

  // Debug logging for Gmail store state
  console.log("useTimelineActivities - Gmail store state:", {
    connectedAccounts,
    hasGmailAccounts,
    gmailLoading,
    gmailError,
    accountsCount: connectedAccounts.length,
  });

  // Get internal activities
  const {
    activities: internalActivities,
    isLoading: internalLoading,
    isError: internalError,
  } = useActivities(contactId);

  // Debug logging for internal activities
  console.log("useTimelineActivities - Internal activities:", {
    contactId,
    internalActivities,
    internalLoading,
    internalError,
  });

  // Get emails using hybrid approach
  const {
    emails,
    loading: emailsLoading,
    error: emailsError,
    source: emailSource,
    lastSyncAt,
    syncStatus,
    refresh: refreshEmails,
    triggerSync,
  } = useHybridContactEmails({
    contactEmail,
    maxResults: maxEmails,
    autoFetch: includeEmails && hasGmailAccounts,
  });

  // Debug logging for emails
  console.log("useTimelineActivities - Emails:", {
    contactEmail,
    emails,
    emailsLoading,
    emailsError,
    hasGmailAccounts,
    includeEmails,
    connectedAccounts,
  });

  // Convert internal activities to timeline format
  const timelineInternalActivities: TimelineActivity[] = useMemo(() => {
    return (internalActivities || []).map((activity: Activity) => ({
      id: activity.id,
      type: activity.type as TimelineActivity["type"],
      content: activity.content,
      timestamp: activity.timestamp,
      source: "internal" as const,
    }));
  }, [internalActivities]);

  // Convert emails to timeline format
  const timelineEmailActivities: TimelineActivity[] = useMemo(() => {
    if (!includeEmails || !hasGmailAccounts) {
      console.log("useTimelineActivities - Skipping emails:", {
        includeEmails,
        hasGmailAccounts,
        reason: !includeEmails ? "emails not included" : "no gmail accounts",
      });
      return [];
    }

    console.log(
      "useTimelineActivities - Converting emails to timeline format:",
      {
        emailsCount: emails.length,
        emails: emails.map((email) => ({
          id: email.id,
          subject: email.subject,
          from: email.from,
          date: email.date,
          dateType: typeof email.date,
        })),
      }
    );

    const converted = emails.map((email: GmailEmail) => ({
      id: `email-${email.id}`,
      type: "email" as const,
      content: email.snippet,
      timestamp: email.date,
      source: "gmail" as const,
      subject: email.subject,
      from: email.from,
      to: email.to,
      snippet: email.snippet,
      isRead: email.isRead,
      isImportant: email.isImportant,
      bodyText: email.bodyText,
      bodyHtml: email.bodyHtml,
      labels: email.labels,
      attachments: email.attachments,
    }));

    console.log(
      "useTimelineActivities - Converted email activities:",
      converted
    );
    return converted;
  }, [emails, includeEmails, hasGmailAccounts]);

  // Combine and sort activities chronologically
  const allActivities: TimelineActivity[] = useMemo(() => {
    console.log("useTimelineActivities - Combining activities:", {
      internalCount: timelineInternalActivities.length,
      emailCount: timelineEmailActivities.length,
      internalActivities: timelineInternalActivities,
      emailActivities: timelineEmailActivities,
    });

    const combined = [
      ...timelineInternalActivities,
      ...timelineEmailActivities,
    ];

    const sorted = combined.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });

    console.log("useTimelineActivities - Final sorted activities:", {
      totalCount: sorted.length,
      activities: sorted.map((activity) => ({
        id: activity.id,
        type: activity.type,
        source: activity.source,
        timestamp: activity.timestamp,
        subject: activity.subject,
        content: activity.content?.substring(0, 50) + "...",
      })),
    });

    return sorted;
  }, [timelineInternalActivities, timelineEmailActivities]);

  // Calculate loading state
  const loading =
    internalLoading || (includeEmails && hasGmailAccounts && emailsLoading);

  // Calculate error state
  const error =
    (internalError ? "Failed to load activities" : null) ||
    (includeEmails && hasGmailAccounts ? emailsError : null);

  // Log activity counts for debugging
  const emailsCount = timelineEmailActivities.length;
  const internalCount = timelineInternalActivities.length;

  logger.debug("Timeline activities summary:", {
    contactId,
    contactEmail,
    internalCount,
    emailsCount,
    totalActivities: allActivities.length,
    hasGmailAccounts,
    emailSource,
    includeEmails,
  });

  return {
    activities: allActivities,
    loading,
    error,
    emailsCount,
    internalCount,
    hasGmailAccounts,
    emailSource,
    lastSyncAt,
    syncStatus,
    refreshEmails,
    triggerSync,
  };
}

// Helper functions for UI components
export const getActivityIcon = (activity: TimelineActivity): string => {
  switch (activity.type) {
    case "email":
      return activity.isImportant ? "mail-priority" : "mail";
    case "call":
      return "phone";
    case "meeting":
      return "calendar";
    case "task":
      return "check-square";
    case "note":
      return "file-text";
    case "system":
      return "settings";
    default:
      return "circle";
  }
};

export const getActivityColor = (activity: TimelineActivity): string => {
  if (activity.source === "gmail") {
    return activity.isImportant ? "text-red-600" : "text-blue-600";
  }

  switch (activity.type) {
    case "call":
      return "text-green-600";
    case "meeting":
      return "text-purple-600";
    case "task":
      return "text-orange-600";
    case "note":
      return "text-gray-600";
    case "system":
      return "text-gray-500";
    default:
      return "text-gray-600";
  }
};

export const formatActivityTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) {
    return "Just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
};
