import { logger } from '@/utils/logger'

export interface GmailEmail {
  id: string
  threadId: string
  messageId?: string // ✅ ADD: RFC 2822 Message-ID for threading
  references?: string // ✅ ADD: RFC 2822 References header for threading
  snippet: string
  subject: string
  from: {
    name?: string
    email: string
  }
  to: Array<{
    name?: string
    email: string
  }>
  cc?: Array<{
    name?: string
    email: string
  }>
  bcc?: Array<{
    name?: string
    email: string
  }>
  date: string
  bodyText?: string
  bodyHtml?: string
  isRead: boolean
  isImportant: boolean
  labels: string[]
  attachments?: Array<{
    id: string
    filename: string
    mimeType: string
    size: number
    inline?: boolean
    contentId?: string
  }>
}

export interface GmailApiResponse {
  emails: GmailEmail[]
  nextPageToken?: string
  resultSizeEstimate: number
}

const GMAIL_API_BASE_URL = 'https://gmail.googleapis.com/gmail/v1'

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
  maxResults: number = 500,
  pageToken?: string,
): Promise<GmailApiResponse> {
  try {
    // Search query to find emails from or to the contact
    const query = `from:${contactEmail} OR to:${contactEmail}`

    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString(),
      ...(pageToken && { pageToken }),
    })

    // First, search for message IDs
    const searchResponse = await fetch(`${GMAIL_API_BASE_URL}/users/me/messages?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!searchResponse.ok) {
      const error = await searchResponse.json()
      throw new Error(error.error?.message || `Gmail API error: ${searchResponse.statusText}`)
    }

    const searchData = await searchResponse.json()

    if (!searchData.messages || searchData.messages.length === 0) {
      return {
        emails: [],
        resultSizeEstimate: 0,
      }
    }

    // Fetch detailed information for each message
    const emailPromises = searchData.messages.map((message: any) => fetchEmailDetails(accessToken, message.id))

    const emails = await Promise.all(emailPromises)

    return {
      emails: emails.filter(email => email !== null) as GmailEmail[],
      nextPageToken: searchData.nextPageToken,
      resultSizeEstimate: searchData.resultSizeEstimate || 0,
    }
  } catch (error) {
    logger.error('Error searching contact emails:', error)
    throw error
  }
}

/**
 * Delay function for rate limiting
 */
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetches detailed information for a specific email with retry logic
 * @param accessToken - Valid Gmail API access token
 * @param messageId - Gmail message ID
 * @param retryCount - Current retry attempt (default: 0)
 * @returns Promise<GmailEmail | null>
 */
export async function fetchEmailDetails(
  accessToken: string,
  messageId: string,
  retryCount: number = 0,
): Promise<GmailEmail | null> {
  const maxRetries = 3
  const baseDelay = 1000 // 1 second base delay

  try {
    const response = await fetch(`${GMAIL_API_BASE_URL}/users/me/messages/${messageId}?format=full`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 429) {
      // Rate limited - implement exponential backoff
      if (retryCount < maxRetries) {
        const delayMs = baseDelay * Math.pow(2, retryCount) + Math.random() * 1000 // Add jitter
        logger.warn(
          `Rate limited for email ${messageId}, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries})`,
        )
        await delay(delayMs)
        return fetchEmailDetails(accessToken, messageId, retryCount + 1)
      } else {
        logger.error(`Max retries exceeded for email ${messageId} due to rate limiting`)
        return null
      }
    }

    if (!response.ok) {
      const error = await response.json()
      logger.error(`Error fetching email ${messageId}:`, error)
      return null
    }

    const emailData = await response.json()
    return parseGmailMessage(emailData)
  } catch (error) {
    logger.error(`Error fetching email details for ${messageId}:`, error)
    return null
  }
}

/**
 * Parses Gmail API message format to our GmailEmail interface
 * @param gmailMessage - Raw Gmail API message object
 * @returns GmailEmail
 */
function parseGmailMessage(gmailMessage: any): GmailEmail {
  const headers = gmailMessage.payload?.headers || []
  const parts = gmailMessage.payload?.parts || []

  // Extract headers
  const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

  const subject = getHeader('Subject')
  const fromHeader = getHeader('From')
  const toHeader = getHeader('To')
  const ccHeader = getHeader('Cc')
  const bccHeader = getHeader('Bcc')
  const dateHeader = getHeader('Date')
  const messageId = getHeader('Message-ID') // ✅ ADD: Extract RFC 2822 Message-ID
  const references = getHeader('References') // ✅ ADD: Extract RFC 2822 References for threading

  // Parse From email
  const fromMatch = fromHeader.match(/^(.+?)\s*<(.+?)>$/) || fromHeader.match(/^(.+)$/)
  const from = {
    name: fromMatch && fromMatch.length > 2 ? fromMatch[1].trim().replace(/"/g, '') : undefined,
    email: fromMatch && fromMatch.length > 1 ? (fromMatch[2] || fromMatch[1]).trim() : fromHeader,
  }

  // Parse To, Cc, Bcc emails
  const toEmails = parseEmailAddresses(toHeader)
  const ccEmails = parseEmailAddresses(ccHeader)
  const bccEmails = parseEmailAddresses(bccHeader)

  // Extract body text and HTML
  let bodyText = ''
  let bodyHtml = ''
  let isCalendarInvitation = false

  if (gmailMessage.payload?.body?.data) {
    // Simple message body - check mimeType to determine if it's HTML or plain text
    const decodedContent = base64UrlDecode(gmailMessage.payload.body.data)
    const mimeType = gmailMessage.payload?.mimeType || ''

    if (mimeType.includes('text/html')) {
      bodyHtml = decodedContent
    } else {
      bodyText = decodedContent
    }
  } else if (parts.length > 0) {
    // Multipart message
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        bodyText = base64UrlDecode(part.body.data)
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        bodyHtml = base64UrlDecode(part.body.data)
      } else if (part.mimeType === 'text/calendar' && part.body?.data) {
        // Handle calendar invitation
        isCalendarInvitation = true
        const calendarData = base64UrlDecode(part.body.data)
        const calendarInfo = parseCalendarData(calendarData)

        // Use calendar info as body content if no other content exists
        if (!bodyText && !bodyHtml) {
          bodyText = calendarInfo
        } else {
          // Append calendar info to existing content
          bodyText += '\n\n' + calendarInfo
        }
      }
    }
  }

  // Check for calendar attachments (.ics files)
  if (!isCalendarInvitation) {
    const calendarAttachment = findCalendarAttachment(parts)
    if (calendarAttachment) {
      isCalendarInvitation = true
      // Add a note about the calendar invitation
      const calendarNote = '📅 Calendar invitation attached'
      if (!bodyText && !bodyHtml) {
        bodyText = calendarNote
      } else {
        bodyText += '\n\n' + calendarNote
      }
    }
  }

  // Parse attachments
  const attachments: Array<{
    id: string
    filename: string
    mimeType: string
    size: number
    inline?: boolean
    contentId?: string
  }> = []

  function extractAttachments(parts: any[]) {
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
          inline: part.headers?.some(
            (h: any) => h.name.toLowerCase() === 'content-disposition' && h.value.includes('inline'),
          ),
          contentId: part.headers?.find((h: any) => h.name.toLowerCase() === 'content-id')?.value?.replace(/[<>]/g, ''),
        })
      }

      if (part.parts) {
        extractAttachments(part.parts)
      }
    }
  }

  if (parts.length > 0) {
    extractAttachments(parts)
  }

  // Check if email is read
  const isRead = !gmailMessage.labelIds?.includes('UNREAD')
  const isImportant = gmailMessage.labelIds?.includes('IMPORTANT') || false

  return {
    id: gmailMessage.id,
    threadId: gmailMessage.threadId,
    messageId: messageId, // ✅ ADD: Include RFC 2822 Message-ID
    references: references, // ✅ ADD: Include RFC 2822 References header
    snippet: gmailMessage.snippet || '',
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
  }
}

/**
 * Parses calendar data from text/calendar MIME type
 * @param calendarData - Raw calendar data in iCal format
 * @returns Formatted calendar information
 */
function parseCalendarData(calendarData: string): string {
  try {
    const lines = calendarData.split('\n')
    let summary = ''
    let dtstart = ''
    let dtend = ''
    let location = ''
    let description = ''
    let organizer = ''
    let method = ''

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('SUMMARY:')) {
        summary = trimmedLine.replace('SUMMARY:', '').trim()
      } else if (trimmedLine.startsWith('DTSTART:')) {
        dtstart = trimmedLine.replace('DTSTART:', '').trim()
      } else if (trimmedLine.startsWith('DTEND:')) {
        dtend = trimmedLine.replace('DTEND:', '').trim()
      } else if (trimmedLine.startsWith('LOCATION:')) {
        location = trimmedLine.replace('LOCATION:', '').trim()
      } else if (trimmedLine.startsWith('DESCRIPTION:')) {
        description = trimmedLine.replace('DESCRIPTION:', '').trim()
      } else if (trimmedLine.startsWith('ORGANIZER:')) {
        organizer = trimmedLine.replace('ORGANIZER:', '').trim()
      } else if (trimmedLine.startsWith('METHOD:')) {
        method = trimmedLine.replace('METHOD:', '').trim()
      }
    }

    // Format the calendar information
    let calendarInfo = '📅 Calendar Invitation\n\n'

    if (method) {
      const methodText =
        method === 'REQUEST'
          ? 'Meeting Request'
          : method === 'REPLY'
            ? 'Meeting Response'
            : method === 'CANCEL'
              ? 'Meeting Cancellation'
              : method
      calendarInfo += `Type: ${methodText}\n`
    }

    if (summary) {
      calendarInfo += `Event: ${summary}\n`
    }

    if (dtstart) {
      const startDate = formatCalendarDate(dtstart)
      calendarInfo += `Start: ${startDate}\n`
    }

    if (dtend) {
      const endDate = formatCalendarDate(dtend)
      calendarInfo += `End: ${endDate}\n`
    }

    if (location) {
      calendarInfo += `Location: ${location}\n`
    }

    if (organizer) {
      const organizerEmail = organizer.replace('mailto:', '').replace(/^.*:/, '')
      calendarInfo += `Organizer: ${organizerEmail}\n`
    }

    if (description) {
      calendarInfo += `\nDescription:\n${description}`
    }

    return calendarInfo
  } catch (error) {
    logger.error('Error parsing calendar data:', error)
    return '📅 Calendar invitation (unable to parse details)'
  }
}

/**
 * Formats calendar date from iCal format to readable format
 * @param dateString - Date string in iCal format (e.g., "20241201T100000Z")
 * @returns Formatted date string
 */
function formatCalendarDate(dateString: string): string {
  try {
    // Handle different date formats
    let date: Date

    if (dateString.includes('T')) {
      // Format: 20241201T100000Z or 20241201T100000
      const cleanDate = dateString.replace(/[TZ]/g, '')
      if (cleanDate.length >= 8) {
        const year = cleanDate.substring(0, 4)
        const month = cleanDate.substring(4, 6)
        const day = cleanDate.substring(6, 8)
        const hour = cleanDate.substring(8, 10) || '00'
        const minute = cleanDate.substring(10, 12) || '00'

        date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`)
      } else {
        date = new Date(dateString)
      }
    } else {
      // Format: 20241201
      const year = dateString.substring(0, 4)
      const month = dateString.substring(4, 6)
      const day = dateString.substring(6, 8)
      date = new Date(`${year}-${month}-${day}`)
    }

    return date.toLocaleString()
  } catch (error) {
    logger.error('Error formatting calendar date:', error)
    return dateString
  }
}

/**
 * Finds calendar attachment in message parts
 * @param parts - Message parts array
 * @returns Calendar attachment info or null
 */
function findCalendarAttachment(parts: any[]): any {
  for (const part of parts) {
    if (
      part.filename &&
      (part.filename.toLowerCase().endsWith('.ics') ||
        part.mimeType === 'application/ics' ||
        part.mimeType === 'text/calendar')
    ) {
      return part
    }

    if (part.parts) {
      const found = findCalendarAttachment(part.parts)
      if (found) return found
    }
  }
  return null
}

/**
 * Parses email addresses from a header string
 * @param emailHeader - Email header string (e.g., "John Doe <john@example.com>, jane@example.com")
 * @returns Array of parsed email objects
 */
function parseEmailAddresses(emailHeader: string): Array<{ name?: string; email: string }> {
  if (!emailHeader) return []

  const emails: Array<{ name?: string; email: string }> = []

  // Split by comma and parse each email
  const emailParts = emailHeader.split(',')

  for (const part of emailParts) {
    const trimmed = part.trim()
    const match = trimmed.match(/^(.+?)\s*<(.+?)>$/) || trimmed.match(/^(.+)$/)

    if (match) {
      if (match.length > 2) {
        // Format: "Name <email@domain.com>"
        emails.push({
          name: match[1].trim().replace(/"/g, ''),
          email: match[2].trim(),
        })
      } else {
        // Format: "email@domain.com"
        emails.push({
          email: match[1].trim(),
        })
      }
    }
  }

  return emails
}

/**
 * Decodes base64url encoded data
 * @param data - Base64url encoded string
 * @returns Decoded string
 */
function base64UrlDecode(data: string): string {
  try {
    // Convert base64url to base64
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/')

    // Add padding if necessary
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)

    // Decode base64
    const decoded = atob(padded)

    // Convert to UTF-8
    return decodeURIComponent(escape(decoded))
  } catch (error) {
    logger.error('Error decoding base64url data:', error)
    return data // Return original data if decoding fails
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
  maxResults: number = 500,
  enableFullSync: boolean = false, // New: enable complete historical sync
  existingGmailIds?: Set<string>, // New: filter out existing emails
): Promise<GmailApiResponse> {
  try {
    // ✅ ENHANCED: More comprehensive query to catch all possible emails
    const query = `(from:${contactEmail} OR to:${contactEmail} OR cc:${contactEmail} OR bcc:${contactEmail})`

    // Enhanced query logging (disabled to reduce console spam)

    const allEmails: any[] = []
    let nextPageToken: string | undefined
    let totalFetched = 0
    let resultSizeEstimate = 0
    let pagesProcessed = 0

    // If full sync is enabled, we'll get ALL emails regardless of maxResults
    const maxTotalEmails = enableFullSync ? Infinity : maxResults

    logger.info(`[Gmail API] Starting ${enableFullSync ? 'FULL HISTORICAL' : 'LIMITED'} sync for ${contactEmail}`, {
      maxResults,
      enableFullSync,
      maxTotalEmails: enableFullSync ? 'unlimited' : maxTotalEmails,
      query: query,
      hasExistingFilter: !!existingGmailIds,
    })

    // Sync start and configuration logging (disabled to reduce console spam)

    // ✅ ENHANCED: More aggressive pagination - continue until NO MORE RESULTS
    do {
      const requestMaxResults = Math.min(500, maxTotalEmails - totalFetched) // Gmail API max per request is 500

      const params = new URLSearchParams({
        q: query,
        maxResults: requestMaxResults.toString(),
      })

      if (nextPageToken) {
        params.set('pageToken', nextPageToken)
      }

      // Fetching page logging (disabled to reduce console spam)

      logger.info(`[Gmail API] Fetching page ${pagesProcessed + 1} for ${contactEmail}`, {
        pageToken: nextPageToken ? 'exists' : 'none',
        totalFetched,
        requestSize: requestMaxResults,
      })

      const searchResponse = await fetch(`${GMAIL_API_BASE_URL}/users/me/messages?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!searchResponse.ok) {
        const error = await searchResponse.json()
        throw new Error(error.error?.message || `Gmail API error: ${searchResponse.statusText}`)
      }

      const searchData = await searchResponse.json()
      resultSizeEstimate = searchData.resultSizeEstimate || 0
      pagesProcessed++

      // Page response logging (disabled to reduce console spam)

      if (!searchData.messages || searchData.messages.length === 0) {
        // No more emails found logging (disabled to reduce console spam)
        logger.info(`[Gmail API] No more emails found after ${pagesProcessed} pages`)
        break // No more emails
      }

      // Filter out emails we already have if existingGmailIds is provided
      let newMessages = searchData.messages
      if (existingGmailIds) {
        newMessages = searchData.messages.filter((message: any) => !existingGmailIds.has(message.id))
        // Filtered page logging (disabled to reduce console spam)
        logger.info(`[Gmail API] Filtered ${searchData.messages.length - newMessages.length} existing emails from page`)
      }

      // Add new message IDs from this page
      allEmails.push(...newMessages)
      totalFetched += newMessages.length
      nextPageToken = searchData.nextPageToken

      // Page processed logging (disabled to reduce console spam)

      logger.info(`[Gmail API] Fetched ${searchData.messages.length} emails, total: ${totalFetched}`)

      // Check if we should continue based on sync type and limits
      if (!enableFullSync && totalFetched >= maxResults) {
        // Reached maxResults limit logging (disabled to reduce console spam)
        logger.info(`[Gmail API] Reached maxResults limit (${maxResults}), stopping`)
        break
      }

      // ✅ ENHANCED: Increased safety limit from 50 to 200 pages (100,000 emails max)
      if (enableFullSync && pagesProcessed >= 200) {
        console.warn(`⚠️ [Gmail API] Reached enhanced safety limit:`, {
          contactEmail,
          pagesProcessed,
          totalFetched,
          safetyLimit: 200,
          estimatedEmailsAtLimit: 200 * 500,
          reason: 'Enhanced safety limit to prevent infinite loops (increased from 100 to 200 pages)',
          recommendation: 'If you need more emails, contact support to increase limit',
        })
        logger.warn(`[Gmail API] Reached safety limit of 200 pages (${totalFetched} emails), stopping`)
        break
      }

      // Log progress for full sync every 10 pages
      if (enableFullSync && pagesProcessed % 10 === 0) {
        console.log(`🔄 [Gmail API] Full sync progress update:`, {
          contactEmail,
          pagesProcessed,
          totalFetched,
          estimatedRemaining: Math.max(0, resultSizeEstimate - totalFetched),
          hasNextPage: !!nextPageToken,
          progressIndicator: `${pagesProcessed} pages processed`,
        })
      }
    } while (nextPageToken) // Continue until Gmail says no more emails

    if (allEmails.length === 0) {
      return {
        emails: [],
        resultSizeEstimate: 0,
      }
    }

    logger.info(`[Gmail API] Starting to fetch details for ${allEmails.length} emails`)

    // Fetch detailed information for all messages with rate limiting
    const chunkSize = 10 // Reduce chunk size to avoid rate limits
    const emailDetails: (GmailEmail | null)[] = []
    const delayBetweenChunks = 500 // 500ms delay between chunks

    for (let i = 0; i < allEmails.length; i += chunkSize) {
      const chunk = allEmails.slice(i, i + chunkSize)

      // Process chunk with limited concurrency (5 at a time within chunk)
      const concurrencyLimit = 5
      const chunkResults: (GmailEmail | null)[] = []

      for (let j = 0; j < chunk.length; j += concurrencyLimit) {
        const subChunk = chunk.slice(j, j + concurrencyLimit)
        const subChunkPromises = subChunk.map((message: any) => fetchEmailDetails(accessToken, message.id))
        const subChunkResults = await Promise.all(subChunkPromises)
        chunkResults.push(...subChunkResults)

        // Small delay between sub-chunks to avoid rate limits
        if (j + concurrencyLimit < chunk.length) {
          await delay(200)
        }
      }

      emailDetails.push(...chunkResults)

      logger.info(
        `[Gmail API] Processed chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(allEmails.length / chunkSize)}`,
      )

      // Delay between chunks to respect rate limits
      if (i + chunkSize < allEmails.length) {
        await delay(delayBetweenChunks)
      }
    }

    const validEmails = emailDetails.filter(email => email !== null) as GmailEmail[]

    // ✅ IMPROVED: Enhanced completion logging for user debugging
    const oldestEmail =
      validEmails.length > 0
        ? validEmails.reduce((oldest, email) => (new Date(email.date) < new Date(oldest.date) ? email : oldest))
        : null
    const newestEmail =
      validEmails.length > 0
        ? validEmails.reduce((newest, email) => (new Date(email.date) > new Date(newest.date) ? email : newest))
        : null

    const completionInfo = {
      totalEmailsFetched: validEmails.length,
      totalPagesProcessed: pagesProcessed,
      syncType: enableFullSync ? 'FULL HISTORICAL' : 'LIMITED',
      dateRange:
        validEmails.length > 0
          ? {
              oldest: oldestEmail ? new Date(oldestEmail.date).toLocaleDateString() : null,
              newest: newestEmail ? new Date(newestEmail.date).toLocaleDateString() : null,
              yearsSpan:
                oldestEmail && newestEmail
                  ? new Date(newestEmail.date).getFullYear() - new Date(oldestEmail.date).getFullYear() + 1
                  : null,
            }
          : null,
      originalResultEstimate: resultSizeEstimate,
    }

    logger.info(`[Gmail API] Completed fetching emails for ${contactEmail}`, completionInfo)

    // Sync completed and results summary logging (disabled to reduce console spam)

    if (validEmails.length > 0 && oldestEmail) {
      const oldestYear = new Date(oldestEmail.date).getFullYear()
      const newestYear = new Date(validEmails[0].date).getFullYear() // First email is newest due to sorting

      // ✅ ENHANCED: Detailed date analysis to identify 2022 cutoff issue
      const emailsByYear = validEmails.reduce(
        (acc, email) => {
          const year = new Date(email.date).getFullYear()
          acc[year] = (acc[year] || 0) + 1
          return acc
        },
        {} as Record<number, number>,
      )

      // Date analysis logging (disabled to reduce console spam)

      // Date range analysis (logging disabled to reduce console spam)
      // Note: If oldest email is from 2023+, there might be a sync limitation
    }

    logger.info(`[Gmail API] Original completion info:`, {
      totalMessages: allEmails.length,
      validEmails: validEmails.length,
      resultSizeEstimate,
    })

    return {
      emails: validEmails,
      resultSizeEstimate,
    }
  } catch (error) {
    logger.error('Error getting recent contact emails:', error)
    throw error
  }
}

/**
 * ✅ DEBUG: Test different Gmail queries to understand email limitations
 * @param accessToken - Valid Gmail API access token
 * @param contactEmail - Email address of the contact
 * @returns Promise<void> - Logs results to console
 */
export async function debugGmailQueries(accessToken: string, contactEmail: string): Promise<void> {
  const testQueries = [
    {
      name: 'Original Query (comprehensive)',
      query: `(from:${contactEmail} OR to:${contactEmail} OR cc:${contactEmail} OR bcc:${contactEmail})`,
    },
    {
      name: 'Simple From/To Only',
      query: `(from:${contactEmail} OR to:${contactEmail})`,
    },
    {
      name: 'From Only',
      query: `from:${contactEmail}`,
    },
    {
      name: 'To Only',
      query: `to:${contactEmail}`,
    },
    {
      name: 'All emails in account (sample)',
      query: 'in:anywhere',
    },
    {
      name: 'All emails last 5 years',
      query: 'after:2020/01/01',
    },
    {
      name: 'Contact emails last 5 years',
      query: `(from:${contactEmail} OR to:${contactEmail}) after:2020/01/01`,
    },
    {
      name: 'Contact emails 2021-2022',
      query: `(from:${contactEmail} OR to:${contactEmail}) after:2021/01/01 before:2023/01/01`,
    },
    {
      name: 'Contact emails 2020 only',
      query: `(from:${contactEmail} OR to:${contactEmail}) after:2020/01/01 before:2021/01/01`,
    },
    {
      name: 'Contact emails 2023-2025',
      query: `(from:${contactEmail} OR to:${contactEmail}) after:2023/01/01`,
    },
    {
      name: 'Contact emails PRE-2020 (should be 0)',
      query: `(from:${contactEmail} OR to:${contactEmail}) before:2020/01/01`,
    },
    {
      name: 'All account emails PRE-2020',
      query: `before:2020/01/01`,
    },
  ]

  console.log(`🧪 [Gmail Debug] Testing ${testQueries.length} different queries for ${contactEmail}`)

  for (const testQuery of testQueries) {
    try {
      console.log(`🔍 [Gmail Debug] Testing: ${testQuery.name}`)
      console.log(`📝 [Gmail Debug] Query: "${testQuery.query}"`)

      const params = new URLSearchParams({
        q: testQuery.query,
        maxResults: '500',
      })

      const searchResponse = await fetch(`${GMAIL_API_BASE_URL}/users/me/messages?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!searchResponse.ok) {
        const error = await searchResponse.json()
        console.error(`❌ [Gmail Debug] Query "${testQuery.name}" failed:`, error)
        continue
      }

      const searchData = await searchResponse.json()

      console.log(`📊 [Gmail Debug] Results for "${testQuery.name}":`, {
        resultSizeEstimate: searchData.resultSizeEstimate || 0,
        actualMessages: searchData.messages?.length || 0,
        hasNextPage: !!searchData.nextPageToken,
        query: testQuery.query,
        analysis: {
          hasResults: (searchData.messages?.length || 0) > 0,
          significantResults: (searchData.resultSizeEstimate || 0) > 100,
          mightHaveMore: !!searchData.nextPageToken,
        },
      })

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error) {
      console.error(`❌ [Gmail Debug] Error testing "${testQuery.name}":`, error)
    }
  }

  console.log(`✅ [Gmail Debug] Completed testing all queries for ${contactEmail}`)
}

// ✅ Make debug function available in browser console for easy testing
if (typeof window !== 'undefined') {
  ;(window as any).debugGmailQueries = debugGmailQueries

  // ✅ Helper function to debug with automatic token retrieval
  ;(window as any).debugContactEmails = async (contactEmail: string, userId?: string) => {
    try {
      console.log(`🔑 [Debug Helper] Getting token for ${contactEmail}...`)

      // Import token service dynamically
      const { getValidToken } = await import('@/services/google/tokenService')

      // Get current user if not provided
      if (!userId) {
        const { supabase } = await import('@/integrations/supabase/client')
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          console.error('❌ [Debug Helper] No authenticated user found')
          return
        }
        userId = user.id
      }

      // Get token
      const token = await getValidToken(userId)

      if (!token) {
        console.error('❌ [Debug Helper] Could not get valid Gmail token')
        console.log('🔧 [Debug Helper] Try reconnecting your Gmail account')
        return
      }

      console.log('✅ [Debug Helper] Got token, running debug queries...')

      // Run debug queries
      await debugGmailQueries(token, contactEmail)

      console.log('🎉 [Debug Helper] Debug completed!')
    } catch (error) {
      console.error('❌ [Debug Helper] Error:', error)
    }
  }

  // ✅ Quick debug function for current contact
  ;(window as any).quickDebugEmails = async () => {
    // Try to get contact email from current page
    const contactEmailElement = document.querySelector('[data-contact-email]')
    const contactEmail = contactEmailElement?.getAttribute('data-contact-email') || 'sergio@tudashboard.com'

    console.log(`🚀 [Quick Debug] Auto-detected contact: ${contactEmail}`)
    await (window as any).debugContactEmails(contactEmail)
  }
  ;(window as any).gmailDebugInfo = {
    howToUse: 'Use these functions in console:',
    functions: {
      'debugContactEmails("email@example.com")': 'Auto-gets token and runs all debug queries',
      'quickDebugEmails()': 'Auto-detects current contact and debugs',
      'debugGmailQueries(token, email)': 'Manual debug (need token first)',
    },
    example: 'debugContactEmails("sergio@tudashboard.com")',
    quickExample: 'quickDebugEmails()',
    currentContact: 'sergio@tudashboard.com',
    purpose: 'Test different Gmail search queries to understand email limitations',
  }

  // Log the available functions
  // Gmail debug helper functions loaded (logging disabled to reduce console spam)
}

/**
 * Interface for email data to be sent
 */
export interface SendEmailData {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  bodyHtml: string
  bodyText?: string
  inReplyTo?: string // For threading replies
  references?: string // For threading replies
  threadId?: string // ✅ ADD: For Gmail API threading
}

/**
 * Interface for the response when sending an email
 */
export interface SendEmailResponse {
  messageId: string
  threadId?: string
}

/**
 * Creates a MIME message from email data
 * @param emailData - Email content and metadata
 * @returns MIME formatted message string
 */
function createMimeMessage(emailData: SendEmailData): string {
  const { to, cc, bcc, subject, bodyHtml, bodyText, inReplyTo, references } = emailData

  let mime = ''

  // ✅ CRITICAL: Add unique Message-ID for proper threading
  mime += `Message-ID: <${generateMessageId()}>\r\n`

  // Standard headers
  mime += `To: ${to.join(', ')}\r\n`
  if (cc && cc.length > 0) {
    mime += `Cc: ${cc.join(', ')}\r\n`
  }
  if (bcc && bcc.length > 0) {
    mime += `Bcc: ${bcc.join(', ')}\r\n`
  }
  mime += `Subject: ${subject}\r\n`

  // ✅ CRITICAL: Threading headers for replies (RFC 2822 compliance)
  if (inReplyTo) {
    mime += `In-Reply-To: ${inReplyTo}\r\n`
  }
  if (references) {
    mime += `References: ${references}\r\n`
  }

  mime += `Content-Type: text/html; charset=utf-8\r\n`
  mime += `MIME-Version: 1.0\r\n`
  mime += `\r\n`

  // Body
  mime += bodyHtml

  return mime
}

/**
 * ✅ NEW: Generate RFC 2822 compliant Message-ID
 * @returns Unique Message-ID string
 */
function generateMessageId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  // ✅ FIX: Use proper domain for RFC 2822 compliance
  const domain = 'crm.salesheet.com' // Professional domain for better deliverability
  // ✅ CRITICAL: RFC 2822 requires angle brackets around Message-ID
  return `<${timestamp}.${random}@${domain}>`
}

/**
 * Encodes email content to base64url format required by Gmail API
 * @param message - MIME message string
 * @returns base64url encoded string
 */
function encodeEmailMessage(message: string): string {
  return btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Send email using Gmail API
 * @param accessToken - Valid Gmail API access token
 * @param emailData - Email content and metadata
 * @returns Promise<SendEmailResponse>
 */
export async function sendEmail(accessToken: string, emailData: SendEmailData): Promise<SendEmailResponse> {
  try {
    logger.info('[Gmail API] Sending email:', {
      to: emailData.to,
      subject: emailData.subject,
      hasHtml: !!emailData.bodyHtml,
      isReply: !!emailData.inReplyTo,
      threadId: emailData.threadId,
    })

    // Create MIME message
    const mimeMessage = createMimeMessage(emailData)

    // Encode to base64url
    const encodedMessage = encodeEmailMessage(mimeMessage)

    // ✅ ENHANCED: Prepare request body with optional threadId for replies
    const requestBody: any = {
      raw: encodedMessage,
    }

    // ✅ CRITICAL: Include threadId for Gmail API threading
    if (emailData.threadId) {
      requestBody.threadId = emailData.threadId
      logger.info('[Gmail API] Including threadId for reply:', emailData.threadId)
    }

    // Send via Gmail API
    const response = await fetch(`${GMAIL_API_BASE_URL}/users/me/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || `Gmail API error: ${response.statusText}`)
    }

    const result = await response.json()

    logger.info('[Gmail API] Email sent successfully:', {
      messageId: result.id,
      threadId: result.threadId,
      wasReply: !!emailData.threadId,
    })

    return {
      messageId: result.id,
      threadId: result.threadId,
    }
  } catch (error) {
    logger.error('[Gmail API] Error sending email:', error)
    throw error
  }
}

/**
 * Create a draft email using Gmail API
 * @param accessToken - Valid Gmail API access token
 * @param emailData - Email content and metadata
 * @returns Promise with draft ID
 */
export async function createDraft(accessToken: string, emailData: SendEmailData): Promise<{ draftId: string }> {
  try {
    logger.info('[Gmail API] Creating draft:', {
      to: emailData.to,
      subject: emailData.subject,
    })

    // Create MIME message
    const mimeMessage = createMimeMessage(emailData)

    // Encode to base64url
    const encodedMessage = encodeEmailMessage(mimeMessage)

    // Create draft via Gmail API
    const response = await fetch(`${GMAIL_API_BASE_URL}/users/me/drafts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          raw: encodedMessage,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || `Gmail API error: ${response.statusText}`)
    }

    const result = await response.json()

    logger.info('[Gmail API] Draft created successfully:', {
      draftId: result.id,
    })

    return {
      draftId: result.id,
    }
  } catch (error) {
    logger.error('[Gmail API] Error creating draft:', error)
    throw error
  }
}

/**
 * 🚀 NEW: Get Gmail History for incremental sync
 * Fetches changes since a specific historyId using Gmail History API
 * @param accessToken - Valid Gmail API access token
 * @param startHistoryId - History ID to start from (returned by previous sync)
 * @param options - Additional options for the history request
 * @returns Promise with history changes
 */
export async function getHistory(
  accessToken: string,
  startHistoryId: string,
  options: {
    historyTypes?: string[]
    maxResults?: number
    pageToken?: string
  } = {},
): Promise<{
  history: any[]
  historyId: string
  nextPageToken?: string
}> {
  try {
    logger.info('[Gmail API] 🔄 Fetching history changes since:', startHistoryId)

    const params = new URLSearchParams({
      startHistoryId,
      historyTypes: options.historyTypes?.join(',') || 'messageAdded',
      maxResults: (options.maxResults || 500).toString(),
      ...(options.pageToken && { pageToken: options.pageToken }),
    })

    const response = await fetch(`${GMAIL_API_BASE_URL}/users/me/history?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        // History ID is invalid/expired
        const error = await response.json()
        logger.warn('[Gmail API] History ID expired or invalid:', {
          startHistoryId,
          error: error.error?.message,
        })
        throw new Error('HISTORY_ID_INVALID')
      }

      const error = await response.json()
      throw new Error(error.error?.message || `History API error: ${response.statusText}`)
    }

    const result = await response.json()

    logger.info('[Gmail API] ✅ History fetched successfully:', {
      historyCount: result.history?.length || 0,
      newHistoryId: result.historyId,
      hasMore: !!result.nextPageToken,
    })

    return {
      history: result.history || [],
      historyId: result.historyId,
      nextPageToken: result.nextPageToken,
    }
  } catch (error) {
    logger.error('[Gmail API] Error fetching history:', error)
    throw error
  }
}

/**
 * 🚀 NEW: Get emails by History ID changes
 * Processes Gmail History API results to extract email details for specific messages
 * @param accessToken - Valid Gmail API access token
 * @param historyChanges - History changes from getHistory()
 * @param contactEmail - Contact email to filter messages for
 * @returns Promise with filtered and detailed emails
 */
export async function getEmailsByHistoryChanges(
  accessToken: string,
  historyChanges: any[],
  contactEmail: string,
): Promise<GmailEmail[]> {
  try {
    // Extract message IDs from history changes
    const messageIds = historyChanges
      .flatMap(h => h.messagesAdded || [])
      .map(ma => ma.message?.id)
      .filter(id => id)

    if (messageIds.length === 0) {
      logger.info('[Gmail API] No new messages in history changes')
      return []
    }

    logger.info(`[Gmail API] Processing ${messageIds.length} messages from history changes`)

    // Fetch detailed information for each message
    const emailPromises = messageIds.map((messageId: string) => fetchEmailDetails(accessToken, messageId))

    const emails = await Promise.all(emailPromises)
    const validEmails = emails.filter(email => email !== null) as GmailEmail[]

    // Filter emails related to the specific contact
    const contactEmails = validEmails.filter(
      email =>
        email.from.email.toLowerCase() === contactEmail.toLowerCase() ||
        email.to.some(recipient => recipient.email.toLowerCase() === contactEmail.toLowerCase()) ||
        email.cc?.some(recipient => recipient.email.toLowerCase() === contactEmail.toLowerCase()),
    )

    logger.info(`[Gmail API] Found ${contactEmails.length} emails related to ${contactEmail}`)

    return contactEmails
  } catch (error) {
    logger.error('[Gmail API] Error processing history changes:', error)
    throw error
  }
}
