import { logger } from "@/utils/logger";

export interface GmailEmail {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: {
    name?: string;
    email: string;
  };
  to: Array<{
    name?: string;
    email: string;
  }>;
  cc?: Array<{
    name?: string;
    email: string;
  }>;
  bcc?: Array<{
    name?: string;
    email: string;
  }>;
  date: string;
  bodyText?: string;
  bodyHtml?: string;
  isRead: boolean;
  isImportant: boolean;
  labels: string[];
  attachments?: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    inline?: boolean;
    contentId?: string;
  }>;
}

export interface GmailApiResponse {
  emails: GmailEmail[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

const GMAIL_API_BASE_URL = "https://gmail.googleapis.com/gmail/v1";

/**
 * Searches for emails related to a specific contact
 * @param accessToken - Valid Gmail API access token
 * @param contactEmail - Email address of the contact
 * @param maxResults - Maximum number of results (default: 50)
 * @param pageToken - Token for pagination
 * @returns Promise<GmailApiResponse>
 */
export async function searchContactEmails(
  accessToken: string,
  contactEmail: string,
  maxResults: number = 50,
  pageToken?: string
): Promise<GmailApiResponse> {
  try {
    // Search query to find emails from or to the contact
    const query = `from:${contactEmail} OR to:${contactEmail}`;

    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString(),
      ...(pageToken && { pageToken }),
    });

    // First, search for message IDs
    const searchResponse = await fetch(
      `${GMAIL_API_BASE_URL}/users/me/messages?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!searchResponse.ok) {
      const error = await searchResponse.json();
      throw new Error(
        error.error?.message || `Gmail API error: ${searchResponse.statusText}`
      );
    }

    const searchData = await searchResponse.json();

    if (!searchData.messages || searchData.messages.length === 0) {
      return {
        emails: [],
        resultSizeEstimate: 0,
      };
    }

    // Fetch detailed information for each message
    const emailPromises = searchData.messages.map((message: any) =>
      fetchEmailDetails(accessToken, message.id)
    );

    const emails = await Promise.all(emailPromises);

    return {
      emails: emails.filter((email) => email !== null) as GmailEmail[],
      nextPageToken: searchData.nextPageToken,
      resultSizeEstimate: searchData.resultSizeEstimate || 0,
    };
  } catch (error) {
    logger.error("Error searching contact emails:", error);
    throw error;
  }
}

/**
 * Fetches detailed information for a specific email
 * @param accessToken - Valid Gmail API access token
 * @param messageId - Gmail message ID
 * @returns Promise<GmailEmail | null>
 */
export async function fetchEmailDetails(
  accessToken: string,
  messageId: string
): Promise<GmailEmail | null> {
  try {
    const response = await fetch(
      `${GMAIL_API_BASE_URL}/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      logger.error(`Error fetching email ${messageId}:`, error);
      return null;
    }

    const emailData = await response.json();
    return parseGmailMessage(emailData);
  } catch (error) {
    logger.error(`Error fetching email details for ${messageId}:`, error);
    return null;
  }
}

/**
 * Parses Gmail API message format to our GmailEmail interface
 * @param gmailMessage - Raw Gmail API message object
 * @returns GmailEmail
 */
function parseGmailMessage(gmailMessage: any): GmailEmail {
  const headers = gmailMessage.payload?.headers || [];
  const parts = gmailMessage.payload?.parts || [];

  // Extract headers
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
      ?.value || "";

  const subject = getHeader("Subject");
  const fromHeader = getHeader("From");
  const toHeader = getHeader("To");
  const ccHeader = getHeader("Cc");
  const bccHeader = getHeader("Bcc");
  const dateHeader = getHeader("Date");

  // Parse From email
  const fromMatch =
    fromHeader.match(/^(.+?)\s*<(.+?)>$/) || fromHeader.match(/^(.+)$/);
  const from = {
    name:
      fromMatch && fromMatch.length > 2
        ? fromMatch[1].trim().replace(/"/g, "")
        : undefined,
    email:
      fromMatch && fromMatch.length > 1
        ? (fromMatch[2] || fromMatch[1]).trim()
        : fromHeader,
  };

  // Parse To, Cc, Bcc emails
  const toEmails = parseEmailAddresses(toHeader);
  const ccEmails = parseEmailAddresses(ccHeader);
  const bccEmails = parseEmailAddresses(bccHeader);

  // Extract body text and HTML
  let bodyText = "";
  let bodyHtml = "";

  if (gmailMessage.payload?.body?.data) {
    // Simple message body
    bodyText = base64UrlDecode(gmailMessage.payload.body.data);
  } else if (parts.length > 0) {
    // Multipart message
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        bodyText = base64UrlDecode(part.body.data);
      } else if (part.mimeType === "text/html" && part.body?.data) {
        bodyHtml = base64UrlDecode(part.body.data);
      }
    }
  }

  // Parse attachments
  const attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    inline?: boolean;
    contentId?: string;
  }> = [];

  function extractAttachments(parts: any[]) {
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
          inline: part.headers?.some(
            (h: any) =>
              h.name.toLowerCase() === "content-disposition" &&
              h.value.includes("inline")
          ),
          contentId: part.headers
            ?.find((h: any) => h.name.toLowerCase() === "content-id")
            ?.value?.replace(/[<>]/g, ""),
        });
      }

      if (part.parts) {
        extractAttachments(part.parts);
      }
    }
  }

  if (parts.length > 0) {
    extractAttachments(parts);
  }

  // Check if email is read
  const isRead = !gmailMessage.labelIds?.includes("UNREAD");
  const isImportant = gmailMessage.labelIds?.includes("IMPORTANT") || false;

  return {
    id: gmailMessage.id,
    threadId: gmailMessage.threadId,
    snippet: gmailMessage.snippet || "",
    subject,
    from,
    to: toEmails,
    cc: ccEmails.length > 0 ? ccEmails : undefined,
    bcc: bccEmails.length > 0 ? bccEmails : undefined,
    date: dateHeader,
    bodyText,
    bodyHtml,
    isRead,
    isImportant,
    labels: gmailMessage.labelIds || [],
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

/**
 * Parses email addresses from a header string
 * @param emailHeader - Email header string (e.g., "John Doe <john@example.com>, jane@example.com")
 * @returns Array of parsed email objects
 */
function parseEmailAddresses(
  emailHeader: string
): Array<{ name?: string; email: string }> {
  if (!emailHeader) return [];

  const emails: Array<{ name?: string; email: string }> = [];

  // Split by comma and parse each email
  const emailParts = emailHeader.split(",");

  for (const part of emailParts) {
    const trimmed = part.trim();
    const match = trimmed.match(/^(.+?)\s*<(.+?)>$/) || trimmed.match(/^(.+)$/);

    if (match) {
      if (match.length > 2) {
        // Format: "Name <email@domain.com>"
        emails.push({
          name: match[1].trim().replace(/"/g, ""),
          email: match[2].trim(),
        });
      } else {
        // Format: "email@domain.com"
        emails.push({
          email: match[1].trim(),
        });
      }
    }
  }

  return emails;
}

/**
 * Decodes base64url encoded data
 * @param data - Base64url encoded string
 * @returns Decoded string
 */
function base64UrlDecode(data: string): string {
  try {
    // Convert base64url to base64
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");

    // Add padding if necessary
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    // Decode base64
    const decoded = atob(padded);

    // Convert to UTF-8
    return decodeURIComponent(escape(decoded));
  } catch (error) {
    logger.error("Error decoding base64url data:", error);
    return data; // Return original data if decoding fails
  }
}

/**
 * Gets recent emails for a contact (last 30 days)
 * @param accessToken - Valid Gmail API access token
 * @param contactEmail - Email address of the contact
 * @param maxResults - Maximum number of results
 * @returns Promise<GmailApiResponse>
 */
export async function getRecentContactEmails(
  accessToken: string,
  contactEmail: string,
  maxResults: number = 20
): Promise<GmailApiResponse> {
  try {
    // Search for all emails from/to the contact (no date filter for recent emails)
    const query = `(from:${contactEmail} OR to:${contactEmail})`;

    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString(),
    });

    const searchResponse = await fetch(
      `${GMAIL_API_BASE_URL}/users/me/messages?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!searchResponse.ok) {
      const error = await searchResponse.json();
      throw new Error(
        error.error?.message || `Gmail API error: ${searchResponse.statusText}`
      );
    }

    const searchData = await searchResponse.json();

    if (!searchData.messages || searchData.messages.length === 0) {
      return {
        emails: [],
        resultSizeEstimate: 0,
      };
    }

    // Fetch detailed information for each message
    const emailPromises = searchData.messages.map((message: any) =>
      fetchEmailDetails(accessToken, message.id)
    );

    const emails = await Promise.all(emailPromises);

    return {
      emails: emails.filter((email) => email !== null) as GmailEmail[],
      resultSizeEstimate: searchData.resultSizeEstimate || 0,
    };
  } catch (error) {
    logger.error("Error getting recent contact emails:", error);
    throw error;
  }
}
