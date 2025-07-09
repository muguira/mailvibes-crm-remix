import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/stores";
import {
  getRecentContactEmails,
  searchContactEmails,
  GmailEmail,
  GmailApiResponse,
} from "@/services/google/gmailApi";
import { logger } from "@/utils/logger";

interface UseContactEmailsOptions {
  contactEmail?: string;
  maxResults?: number;
  autoFetch?: boolean;
}

interface UseContactEmailsReturn {
  emails: GmailEmail[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  nextPageToken?: string;
  fetchEmails: () => Promise<void>;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useContactEmails(
  options: UseContactEmailsOptions = {}
): UseContactEmailsReturn {
  const { contactEmail, maxResults = 20, autoFetch = true } = options;

  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  const { getAccessToken, connectedAccounts, authUser } = useStore();

  const fetchEmails = useCallback(async () => {
    if (!contactEmail) {
      setError("Contact email is required");
      return;
    }

    if (!authUser?.id) {
      setError("User not authenticated");
      return;
    }

    if (connectedAccounts.length === 0) {
      // Don't set this as an error - it's a normal state
      setEmails([]);
      setHasMore(false);
      setNextPageToken(undefined);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get valid token for the first connected account
      const token = await getAccessToken(
        authUser.id,
        connectedAccounts[0].email
      );

      if (!token) {
        throw new Error("Unable to get valid Gmail token");
      }

      const response: GmailApiResponse = await getRecentContactEmails(
        token,
        contactEmail,
        maxResults
      );

      setEmails(response.emails);
      setHasMore(!!response.nextPageToken);
      setNextPageToken(response.nextPageToken);

      logger.info(
        `Fetched ${response.emails.length} emails for contact ${contactEmail}`
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch emails";
      setError(errorMessage);
      logger.error("Error fetching contact emails:", err);
    } finally {
      setLoading(false);
    }
  }, [
    contactEmail,
    maxResults,
    connectedAccounts,
    getAccessToken,
    authUser?.id,
  ]);

  const fetchMore = useCallback(async () => {
    if (!contactEmail || !nextPageToken || loading) {
      return;
    }

    if (!authUser?.id) {
      setError("User not authenticated");
      return;
    }

    if (connectedAccounts.length === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken(
        authUser.id,
        connectedAccounts[0].email
      );

      if (!token) {
        throw new Error("Unable to get valid Gmail token");
      }

      const response: GmailApiResponse = await searchContactEmails(
        token,
        contactEmail,
        maxResults,
        nextPageToken
      );

      setEmails((prevEmails) => [...prevEmails, ...response.emails]);
      setHasMore(!!response.nextPageToken);
      setNextPageToken(response.nextPageToken);

      logger.info(
        `Fetched ${response.emails.length} more emails for contact ${contactEmail}`
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch more emails";
      setError(errorMessage);
      logger.error("Error fetching more contact emails:", err);
    } finally {
      setLoading(false);
    }
  }, [
    contactEmail,
    maxResults,
    nextPageToken,
    loading,
    connectedAccounts,
    getAccessToken,
    authUser?.id,
  ]);

  const refresh = useCallback(async () => {
    setEmails([]);
    setNextPageToken(undefined);
    setHasMore(false);
    setError(null);
    await fetchEmails();
  }, [fetchEmails]);

  // Auto-fetch emails when component mounts or contactEmail changes
  useEffect(() => {
    if (autoFetch && contactEmail && authUser?.id) {
      fetchEmails();
    }
  }, [autoFetch, contactEmail, authUser?.id, fetchEmails]);

  return {
    emails,
    loading,
    error,
    hasMore,
    nextPageToken,
    fetchEmails,
    fetchMore,
    refresh,
  };
}

/**
 * Hook to get emails for multiple contacts
 * @param contactEmails - Array of contact email addresses
 * @param maxResults - Maximum results per contact
 * @returns Object with emails grouped by contact email
 */
export function useMultipleContactEmails(
  contactEmails: string[],
  maxResults: number = 10
) {
  const [emailsByContact, setEmailsByContact] = useState<
    Record<string, GmailEmail[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getAccessToken, connectedAccounts, authUser } = useStore();

  const fetchAllEmails = useCallback(async () => {
    if (
      contactEmails.length === 0 ||
      connectedAccounts.length === 0 ||
      !authUser?.id
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken(
        authUser.id,
        connectedAccounts[0].email
      );

      if (!token) {
        throw new Error("Unable to get valid Gmail token");
      }

      // Fetch emails for all contacts in parallel
      const emailPromises = contactEmails.map(async (contactEmail) => {
        try {
          const response = await getRecentContactEmails(
            token,
            contactEmail,
            maxResults
          );
          return { contactEmail, emails: response.emails };
        } catch (err) {
          logger.error(`Error fetching emails for ${contactEmail}:`, err);
          return { contactEmail, emails: [] };
        }
      });

      const results = await Promise.all(emailPromises);

      const emailsMap: Record<string, GmailEmail[]> = {};
      results.forEach(({ contactEmail, emails }) => {
        emailsMap[contactEmail] = emails;
      });

      setEmailsByContact(emailsMap);

      const totalEmails = Object.values(emailsMap).reduce(
        (sum, emails) => sum + emails.length,
        0
      );
      logger.info(
        `Fetched ${totalEmails} emails for ${contactEmails.length} contacts`
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch emails";
      setError(errorMessage);
      logger.error("Error fetching multiple contact emails:", err);
    } finally {
      setLoading(false);
    }
  }, [
    contactEmails,
    maxResults,
    connectedAccounts,
    getAccessToken,
    authUser?.id,
  ]);

  useEffect(() => {
    if (
      contactEmails.length > 0 &&
      connectedAccounts.length > 0 &&
      authUser?.id
    ) {
      fetchAllEmails();
    }
  }, [contactEmails, connectedAccounts.length, authUser?.id, fetchAllEmails]);

  return {
    emailsByContact,
    loading,
    error,
    refresh: fetchAllEmails,
  };
}
