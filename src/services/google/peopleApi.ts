import { ParsedCsvResult } from '@/utils/parseCsv'
import { logger } from '@/utils/logger'

// Google People API types
interface GoogleName {
  displayName?: string
  givenName?: string
  familyName?: string
  middleName?: string
}

interface GoogleEmailAddress {
  value: string
  type?: string
  metadata?: {
    primary?: boolean
  }
}

interface GooglePhoneNumber {
  value: string
  type?: string
}

interface GoogleOrganization {
  name?: string
  title?: string
  department?: string
}

interface GoogleAddress {
  formattedValue?: string
  streetAddress?: string
  city?: string
  region?: string
  postalCode?: string
  country?: string
}

interface GoogleUrl {
  value: string
  type?: string
}

export interface GoogleContact {
  resourceName: string
  etag?: string
  names?: GoogleName[]
  emailAddresses?: GoogleEmailAddress[]
  phoneNumbers?: GooglePhoneNumber[]
  organizations?: GoogleOrganization[]
  addresses?: GoogleAddress[]
  urls?: GoogleUrl[]
}

interface GooglePeopleResponse {
  connections: GoogleContact[]
  nextPageToken?: string
  totalPeople?: number
  totalItems?: number
}

const PEOPLE_API_BASE_URL = 'https://people.googleapis.com/v1'
const FIELDS =
  'connections(names,emailAddresses,phoneNumbers,organizations,addresses,urls),nextPageToken,totalPeople,totalItems'
const PAGE_SIZE = 100

/**
 * Fetches contacts from Google People API
 */
export async function fetchGoogleContacts(
  accessToken: string,
  pageSize: number = PAGE_SIZE,
  pageToken?: string,
): Promise<GooglePeopleResponse> {
  try {
    const params = new URLSearchParams({
      personFields: 'names,emailAddresses,phoneNumbers,organizations,addresses,urls',
      pageSize: pageSize.toString(),
      ...(pageToken && { pageToken }),
    })

    const response = await fetch(`${PEOPLE_API_BASE_URL}/people/me/connections?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || `Failed to fetch contacts: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    logger.error('Error fetching Google contacts:', error)
    throw error
  }
}

/**
 * Gets all contacts with pagination
 */
export async function getAllContactsWithPagination(
  accessToken: string,
  onProgress?: (current: number, total: number) => void,
): Promise<GoogleContact[]> {
  const allContacts: GoogleContact[] = []
  let pageToken: string | undefined
  let totalContacts = 0

  try {
    do {
      const response = await fetchGoogleContacts(accessToken, PAGE_SIZE, pageToken)

      if (response.connections) {
        allContacts.push(...response.connections)
      }

      // Update total count if available
      if (response.totalPeople) {
        totalContacts = response.totalPeople
      }

      // Call progress callback
      if (onProgress && totalContacts > 0) {
        onProgress(allContacts.length, totalContacts)
      }

      pageToken = response.nextPageToken
    } while (pageToken)

    logger.info(`Fetched ${allContacts.length} contacts from Google`)
    return allContacts
  } catch (error) {
    logger.error('Error fetching all contacts:', error)
    throw error
  }
}

/**
 * Gets LinkedIn URL from urls array
 */
function getLinkedInUrl(urls?: GoogleUrl[]): string | undefined {
  if (!urls) return undefined

  const linkedInUrl = urls.find(url => url.value?.toLowerCase().includes('linkedin.com'))

  return linkedInUrl?.value
}

/**
 * Gets Facebook URL from urls array
 */
function getFacebookUrl(urls?: GoogleUrl[]): string | undefined {
  if (!urls) return undefined

  const facebookUrl = urls.find(url => url.value?.toLowerCase().includes('facebook.com'))

  return facebookUrl?.value
}

/**
 * Transforms Google contacts to CSV format
 */
export function transformGoogleContactsToCsvFormat(contacts: GoogleContact[]): ParsedCsvResult {
  // Define headers that match the CSV import expectations
  const headers = [
    'Name',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Company',
    'Job Title',
    'Address',
    'City',
    'State',
    'Zip',
    'Country',
    'LinkedIn',
    'Facebook',
    'Source',
  ]

  // Transform each contact to a row
  const rows = contacts.map(contact => {
    const name = contact.names?.[0]
    const email = contact.emailAddresses?.[0]
    const phone = contact.phoneNumbers?.[0]
    const organization = contact.organizations?.[0]
    const address = contact.addresses?.[0]

    // Create full name
    const fullName =
      name?.displayName || [name?.givenName, name?.middleName, name?.familyName].filter(Boolean).join(' ') || ''

    return {
      Name: fullName,
      'First Name': name?.givenName || '',
      'Last Name': name?.familyName || '',
      Email: email?.value || '',
      Phone: phone?.value || '',
      Company: organization?.name || '',
      'Job Title': organization?.title || '',
      Address: address?.streetAddress || address?.formattedValue || '',
      City: address?.city || '',
      State: address?.region || '',
      Zip: address?.postalCode || '',
      Country: address?.country || '',
      LinkedIn: getLinkedInUrl(contact.urls) || '',
      Facebook: getFacebookUrl(contact.urls) || '',
      Source: 'Gmail Import',
    }
  })

  return {
    headers,
    rows,
    delimiter: ',', // Standard CSV delimiter
  }
}

/**
 * Gets a preview of contacts count without fetching all
 * @throws Error if there are permission issues or other API errors
 */
export async function getContactsCount(accessToken: string): Promise<number> {
  try {
    const response = await fetchGoogleContacts(accessToken, 1)
    return response.totalPeople || response.totalItems || 0
  } catch (error) {
    logger.error('Error getting contacts count:', error)

    // Check if it's a permission/scope error and throw it so the caller can handle it
    if (error instanceof Error) {
      if (error.message.includes('403') || error.message.includes('forbidden')) {
        throw new Error('CONTACTS_PERMISSION_DENIED: Missing contacts scope permission')
      }
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        throw new Error('CONTACTS_TOKEN_INVALID: Invalid or expired token')
      }
    }

    // For other errors, return 0 to not break the UI
    return 0
  }
}
