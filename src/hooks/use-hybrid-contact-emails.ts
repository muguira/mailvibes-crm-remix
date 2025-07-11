import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/stores";
import { supabase } from "@/integrations/supabase/client";
import {
  getRecentContactEmails,
  GmailEmail,
  GmailApiResponse,
} from "@/services/google/gmailApi";
import { triggerContactSync } from "@/workers/emailSyncWorker";
import { logger } from "@/utils/logger";

export interface DatabaseEmail {
  id: string;
  gmail_id: string;
  subject: string;
  snippet: string;
  body_text?: string | null;
  body_html?: string | null;
  from_email: string;
  from_name?: string | null;
  to_emails: any; // JSON type from Supabase
  cc_emails?: any; // JSON type from Supabase
  bcc_emails?: any; // JSON type from Supabase
  date: string;
  is_read: boolean;
  is_important: boolean;
  labels: any; // JSON type from Supabase
  has_attachments: boolean;
  attachment_count: number;
  created_at: string;
  updated_at: string;
}

interface UseHybridContactEmailsOptions {
  contactEmail?: string;
  maxResults?: number;
  autoFetch?: boolean;
  preferDatabase?: boolean;
  maxAge?: number; // Max age in minutes for database emails
}

interface UseHybridContactEmailsReturn {
  emails: GmailEmail[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  source: "database" | "api" | "hybrid";
  lastSyncAt?: Date;
  syncStatus: "idle" | "syncing" | "completed" | "failed";
  fetchEmails: () => Promise<void>;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  triggerSync: () => Promise<void>;
}

export function useHybridContactEmails(
  options: UseHybridContactEmailsOptions = {}
): UseHybridContactEmailsReturn {
  const {
    contactEmail,
    maxResults = 20,
    autoFetch = true,
    preferDatabase = true,
    maxAge = 2, // 2 minutes for faster refresh of recent emails
  } = options;

  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [source, setSource] = useState<"database" | "api" | "hybrid">(
    "database"
  );
  const [lastSyncAt, setLastSyncAt] = useState<Date | undefined>();
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "completed" | "failed"
  >("idle");
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  const { connectedAccounts, authUser, getAccessToken } = useStore();

  const hasGmailAccounts = connectedAccounts.length > 0;
  const isUserAuthenticated = !!authUser?.id;

  const shouldFetchEmails =
    contactEmail && hasGmailAccounts && isUserAuthenticated;

  /**
   * Convert database email to GmailEmail format
   */
  const convertDatabaseEmail = (dbEmail: any): GmailEmail => {
    // Parse JSON fields safely
    const parseJsonField = (field: any): any[] => {
      if (Array.isArray(field)) return field;
      if (typeof field === "string") {
        try {
          const parsed = JSON.parse(field);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    const toEmails = parseJsonField(dbEmail.to_emails);
    const ccEmails = parseJsonField(dbEmail.cc_emails);
    const bccEmails = parseJsonField(dbEmail.bcc_emails);
    const labels = parseJsonField(dbEmail.labels);

    return {
      id: dbEmail.gmail_id,
      threadId: "", // We don't store thread ID separately yet
      snippet: dbEmail.snippet,
      subject: dbEmail.subject,
      from: {
        name: dbEmail.from_name || undefined,
        email: dbEmail.from_email,
      },
      to: toEmails,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      bcc: bccEmails.length > 0 ? bccEmails : undefined,
      date: dbEmail.date,
      bodyText: dbEmail.body_text || undefined,
      bodyHtml: dbEmail.body_html || undefined,
      isRead: dbEmail.is_read,
      isImportant: dbEmail.is_important,
      labels: labels,
      attachments: dbEmail.has_attachments ? [] : undefined, // We'll need to fetch attachments separately
    };
  };

  /**
   * Fetch emails from database
   */
  const fetchFromDatabase = useCallback(async (): Promise<{
    emails: GmailEmail[];
    hasMore: boolean;
    lastSync?: Date;
  }> => {
    if (!shouldFetchEmails || !authUser?.id) {
      return { emails: [], hasMore: false };
    }

    try {
      // Get the email account to check sync status
      const { data: emailAccount } = await supabase
        .from("email_accounts")
        .select("id, last_sync_at, last_sync_status")
        .eq("user_id", authUser.id)
        .eq("email", connectedAccounts[0].email)
        .single();

      let lastSync: Date | undefined;
      if (emailAccount?.last_sync_at) {
        lastSync = new Date(emailAccount.last_sync_at);
      }

      // Query emails from database using filter function to handle JSONB properly
      const { data: allDbEmails, error } = await supabase
        .from("emails")
        .select("*")
        .eq("user_id", authUser.id)
        .eq("email_account_id", emailAccount?.id)
        .order("date", { ascending: false })
        .limit(maxResults * 2); // Get more to filter locally

      if (error) {
        logger.error("Error fetching emails from database:", error);
        return { emails: [], hasMore: false };
      }

      // Filter emails locally to find those related to the contact
      const dbEmails = (allDbEmails || [])
        .filter((email) => {
          // Check if contact is in from_email
          if (email.from_email === contactEmail) {
            return true;
          }

          // Check if contact is in to_emails (JSON string)
          if (email.to_emails) {
            const toEmailsStr =
              typeof email.to_emails === "string"
                ? email.to_emails
                : JSON.stringify(email.to_emails);
            return toEmailsStr.includes(contactEmail);
          }

          return false;
        })
        .slice(0, maxResults);

      const emails = (dbEmails || []).map(convertDatabaseEmail);

      return {
        emails,
        hasMore: emails.length === maxResults,
        lastSync,
      };
    } catch (error) {
      logger.error("Error in fetchFromDatabase:", error);
      return { emails: [], hasMore: false };
    }
  }, [
    shouldFetchEmails,
    authUser?.id,
    contactEmail,
    maxResults,
    connectedAccounts,
  ]);

  /**
   * Fetch emails from Gmail API
   */
  const fetchFromApi = useCallback(async (): Promise<{
    emails: GmailEmail[];
    hasMore: boolean;
    nextPageToken?: string;
  }> => {
    if (!shouldFetchEmails || !authUser?.id) {
      return { emails: [], hasMore: false };
    }

    try {
      const token = await getAccessToken(
        authUser.id,
        connectedAccounts[0].email
      );

      if (!token) {
        throw new Error("Unable to get valid Gmail token");
      }

      const response: GmailApiResponse = await getRecentContactEmails(
        token,
        contactEmail!,
        maxResults
      );

      return {
        emails: response.emails,
        hasMore: !!response.nextPageToken,
        nextPageToken: response.nextPageToken,
      };
    } catch (error) {
      logger.error("Error fetching from API:", error);
      throw error;
    }
  }, [
    shouldFetchEmails,
    authUser?.id,
    contactEmail,
    maxResults,
    connectedAccounts,
    getAccessToken,
  ]);

  /**
   * Determine if database emails are fresh enough
   */
  const isDatabaseFresh = (lastSync?: Date): boolean => {
    if (!lastSync) return false;

    const now = new Date();
    const ageInMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);

    return ageInMinutes < maxAge;
  };

  /**
   * Main fetch function that uses hybrid approach
   */
  const fetchEmails = useCallback(async () => {
    if (!shouldFetchEmails) {
      setEmails([]);
      setHasMore(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, try to get emails from database
      const dbResult = await fetchFromDatabase();
      setLastSyncAt(dbResult.lastSync);

      if (
        preferDatabase &&
        dbResult.emails.length > 0 &&
        isDatabaseFresh(dbResult.lastSync)
      ) {
        // Use database emails if they're fresh
        setEmails(dbResult.emails);
        setHasMore(dbResult.hasMore);
        setSource("database");

        logger.info(
          `Using ${dbResult.emails.length} emails from database for ${contactEmail}`
        );
      } else {
        // Fall back to API if database is empty or stale
        try {
          const apiResult = await fetchFromApi();
          setEmails(apiResult.emails);
          setHasMore(apiResult.hasMore);
          setNextPageToken(apiResult.nextPageToken);
          setSource(dbResult.emails.length > 0 ? "hybrid" : "api");

          logger.info(
            `Using ${apiResult.emails.length} emails from API for ${contactEmail}`
          );

          // Trigger background sync to update database
          if (authUser?.id) {
            triggerContactSync(
              authUser.id,
              connectedAccounts[0].email,
              contactEmail!
            );
          }
        } catch (apiError) {
          // If API fails, use database emails even if stale
          if (dbResult.emails.length > 0) {
            setEmails(dbResult.emails);
            setHasMore(dbResult.hasMore);
            setSource("database");

            logger.warn(
              `API failed, using ${dbResult.emails.length} stale emails from database`
            );
          } else {
            throw apiError;
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch emails";
      setError(errorMessage);
      logger.error("Error in fetchEmails:", error);
    } finally {
      setLoading(false);
    }
  }, [
    shouldFetchEmails,
    fetchFromDatabase,
    fetchFromApi,
    preferDatabase,
    contactEmail,
    authUser?.id,
    connectedAccounts,
  ]);

  /**
   * Fetch more emails (pagination)
   */
  const fetchMore = useCallback(async () => {
    if (!hasMore || loading || !nextPageToken) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // For now, pagination only works with API
      const token = await getAccessToken(
        authUser!.id,
        connectedAccounts[0].email
      );

      if (!token) {
        throw new Error("Unable to get valid Gmail token");
      }

      const response: GmailApiResponse = await getRecentContactEmails(
        token,
        contactEmail!,
        maxResults
      );

      setEmails((prev) => [...prev, ...response.emails]);
      setHasMore(!!response.nextPageToken);
      setNextPageToken(response.nextPageToken);

      logger.info(
        `Fetched ${response.emails.length} more emails for ${contactEmail}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch more emails";
      setError(errorMessage);
      logger.error("Error in fetchMore:", error);
    } finally {
      setLoading(false);
    }
  }, [
    hasMore,
    loading,
    nextPageToken,
    contactEmail,
    authUser,
    connectedAccounts,
    getAccessToken,
    maxResults,
  ]);

  /**
   * Refresh emails (force API fetch)
   */
  const refresh = useCallback(async () => {
    setEmails([]);
    setNextPageToken(undefined);
    setHasMore(false);
    setError(null);
    setSource("api");

    // Force API fetch
    if (shouldFetchEmails) {
      setLoading(true);
      try {
        const apiResult = await fetchFromApi();
        setEmails(apiResult.emails);
        setHasMore(apiResult.hasMore);
        setNextPageToken(apiResult.nextPageToken);

        // Trigger background sync
        if (authUser?.id) {
          triggerContactSync(
            authUser.id,
            connectedAccounts[0].email,
            contactEmail!
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to refresh emails";
        setError(errorMessage);
        logger.error("Error in refresh:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [
    shouldFetchEmails,
    fetchFromApi,
    contactEmail,
    authUser?.id,
    connectedAccounts,
  ]);

  /**
   * Trigger manual sync
   */
  const triggerSync = useCallback(async () => {
    if (!shouldFetchEmails || !authUser?.id) {
      return;
    }

    setSyncStatus("syncing");

    try {
      // Trigger background sync
      triggerContactSync(
        authUser.id,
        connectedAccounts[0].email,
        contactEmail!
      );

      // Wait a bit then refresh from database
      setTimeout(async () => {
        try {
          const dbResult = await fetchFromDatabase();
          if (dbResult.emails.length > 0) {
            setEmails(dbResult.emails);
            setHasMore(dbResult.hasMore);
            setSource("database");
            setLastSyncAt(dbResult.lastSync);
            setSyncStatus("completed");
          }
        } catch (error) {
          logger.error("Error refreshing after sync:", error);
          setSyncStatus("failed");
        }
      }, 5000); // Wait 5 seconds for sync to complete
    } catch (error) {
      logger.error("Error triggering sync:", error);
      setSyncStatus("failed");
    }
  }, [
    shouldFetchEmails,
    authUser?.id,
    contactEmail,
    connectedAccounts,
    fetchFromDatabase,
  ]);

  // Auto-fetch emails when component mounts or dependencies change
  useEffect(() => {
    if (autoFetch && shouldFetchEmails) {
      fetchEmails();
    }
  }, [autoFetch, shouldFetchEmails, fetchEmails]);

  // Reset sync status after a delay
  useEffect(() => {
    if (syncStatus === "completed" || syncStatus === "failed") {
      const timer = setTimeout(() => {
        setSyncStatus("idle");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  return {
    emails,
    loading,
    error,
    hasMore,
    source,
    lastSyncAt,
    syncStatus,
    fetchEmails,
    fetchMore,
    refresh,
    triggerSync,
  };
}
