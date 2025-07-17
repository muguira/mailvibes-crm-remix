import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/utils/logger'
import { fetchGoogleContacts, GoogleContact } from '@/services/google/peopleApi'
import type { AuthService } from './AuthService'
import type { GmailServiceConfig, ImportResult, ImportOptions, GmailError, ServiceState } from './types'
import { GmailErrorCode } from './types'

interface LocalContact {
  id?: string
  user_id: string
  name: string // Required field in contacts table
  email?: string
  phone?: string
  company?: string
  list_id?: string
  status?: string
  last_activity?: string
  data?: any // JSON field for extra data
  created_at?: string
  updated_at?: string
}

/**
 * ContactsService handles Google Contacts (People API) operations
 * Integrates with AuthService for token management
 */
export class ContactsService {
  private userId: string
  private authService: AuthService
  private config: GmailServiceConfig
  private state: ServiceState

  constructor(userId: string, authService: AuthService, config: GmailServiceConfig) {
    this.userId = userId
    this.authService = authService
    this.config = config
    this.state = {
      isInitialized: true,
      isDisposed: false,
      lastActivity: new Date(),
      errorCount: 0,
    }

    if (config.enableLogging) {
      logger.info(`[ContactsService] Initialized for user: ${userId}`)
    }
  }

  /**
   * Import contacts from Google People API
   */
  async importContacts(options: ImportOptions = {}): Promise<ImportResult> {
    this.ensureNotDisposed()
    this.updateActivity()

    const { maxContacts = 1000, skipDuplicates = true, targetListId, onProgress } = options

    try {
      if (this.config.enableLogging) {
        logger.info(`[ContactsService] Starting contact import for user: ${this.userId}`)
      }

      // Get valid access token
      const accounts = await this.authService.getConnectedAccounts()
      if (accounts.length === 0) {
        throw this.createError(GmailErrorCode.AUTH_NO_ACCOUNT, 'No connected Gmail accounts found')
      }

      const token = await this.authService.getValidToken(accounts[0].email)
      if (!token) {
        throw this.createError(GmailErrorCode.AUTH_INVALID_TOKEN, 'Unable to get valid access token')
      }

      // Fetch contacts from Google People API
      let allContacts: GoogleContact[] = []
      let pageToken: string | undefined
      let currentPage = 0
      const pageSize = Math.min(100, maxContacts) // Google API limit

      onProgress?.({
        current: 0,
        total: maxContacts,
        phase: 'fetching',
      })

      do {
        const response = await fetchGoogleContacts(token, pageSize, pageToken)

        if (response.connections) {
          allContacts.push(...response.connections)
        }

        pageToken = response.nextPageToken
        currentPage++

        onProgress?.({
          current: allContacts.length,
          total: maxContacts,
          phase: 'fetching',
        })

        // Respect maxContacts limit
        if (allContacts.length >= maxContacts) {
          allContacts = allContacts.slice(0, maxContacts)
          break
        }
      } while (pageToken && allContacts.length < maxContacts)

      if (this.config.enableLogging) {
        logger.info(`[ContactsService] Fetched ${allContacts.length} contacts from Google`)
      }

      // Process and import contacts
      onProgress?.({
        current: 0,
        total: allContacts.length,
        phase: 'processing',
      })

      let imported = 0
      let skipped = 0
      let duplicated = 0

      for (let i = 0; i < allContacts.length; i++) {
        const googleContact = allContacts[i]

        try {
          const result = await this.processContact(googleContact, skipDuplicates, targetListId)

          switch (result.action) {
            case 'imported':
              imported++
              break
            case 'skipped':
              skipped++
              break
            case 'duplicate':
              duplicated++
              break
          }

          onProgress?.({
            current: i + 1,
            total: allContacts.length,
            phase: 'processing',
          })
        } catch (error) {
          skipped++
          if (this.config.enableLogging) {
            logger.warn(`[ContactsService] Failed to process contact ${i}:`, error)
          }
        }
      }

      if (this.config.enableLogging) {
        logger.info(
          `[ContactsService] Import completed: ${imported} imported, ${skipped} skipped, ${duplicated} duplicates`,
        )
      }

      return {
        success: true,
        contactsImported: imported,
        contactsSkipped: skipped,
        contactsDuplicated: duplicated,
        totalContacts: allContacts.length,
      }
    } catch (error) {
      this.handleError('Failed to import contacts', error)

      return {
        success: false,
        contactsImported: 0,
        contactsSkipped: 0,
        contactsDuplicated: 0,
        totalContacts: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get Google contacts (raw data)
   */
  async getGoogleContacts(pageToken?: string): Promise<{ contacts: GoogleContact[]; nextPageToken?: string }> {
    this.ensureNotDisposed()
    this.updateActivity()

    try {
      // Get valid access token
      const accounts = await this.authService.getConnectedAccounts()
      if (accounts.length === 0) {
        return { contacts: [] }
      }

      const token = await this.authService.getValidToken(accounts[0].email)
      if (!token) {
        return { contacts: [] }
      }

      const response = await fetchGoogleContacts(token, 100, pageToken)

      return {
        contacts: response.connections || [],
        nextPageToken: response.nextPageToken,
      }
    } catch (error) {
      this.handleError('Failed to get Google contacts', error)
      return { contacts: [] }
    }
  }

  /**
   * Sync a single contact from Google to local database
   */
  async syncContact(googleContact: GoogleContact): Promise<LocalContact | null> {
    this.ensureNotDisposed()
    this.updateActivity()

    try {
      const localContact = this.mapGoogleToLocalContact(googleContact)

      if (!localContact) {
        return null
      }

      // Check for duplicates
      const existingContact = await this.findExistingContact(localContact.email)

      if (existingContact) {
        // Update existing contact
        const { data, error } = await supabase
          .from('contacts')
          .update({
            ...localContact,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingContact.id)
          .select()
          .single()

        if (error) {
          throw error
        }

        return data
      } else {
        // Create new contact
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            ...localContact,
            user_id: this.userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) {
          throw error
        }

        return data
      }
    } catch (error) {
      this.handleError('Failed to sync contact', error)
      return null
    }
  }

  /**
   * Dispose the service and cleanup resources
   */
  dispose(): void {
    this.state.isDisposed = true

    if (this.config.enableLogging) {
      logger.info(`[ContactsService] Disposed for user: ${this.userId}`)
    }
  }

  // Private methods

  private async processContact(
    googleContact: GoogleContact,
    skipDuplicates: boolean,
    targetListId?: string,
  ): Promise<{ action: 'imported' | 'skipped' | 'duplicate' }> {
    const localContact = this.mapGoogleToLocalContact(googleContact)

    if (!localContact) {
      return { action: 'skipped' }
    }

    // Check for duplicates
    if (skipDuplicates) {
      const existingContact = await this.findExistingContact(localContact.email)

      if (existingContact) {
        return { action: 'duplicate' }
      }
    }

    // Import the contact
    const { error } = await supabase.from('contacts').insert({
      ...localContact,
      user_id: this.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      throw error
    }

    return { action: 'imported' }
  }

  private mapGoogleToLocalContact(googleContact: GoogleContact): LocalContact | null {
    // Extract primary email
    const primaryEmail = googleContact.emailAddresses?.find(
      email => email.metadata?.primary || email.type === 'home' || email.type === 'work',
    )?.value

    if (!primaryEmail) {
      // Skip contacts without email
      return null
    }

    // Extract name
    const name = googleContact.names?.[0]
    const firstName = name?.givenName || ''
    const lastName = name?.familyName || ''
    const fullName = name?.displayName || `${firstName} ${lastName}`.trim()

    // Extract phone
    const phone = googleContact.phoneNumbers?.[0]?.value

    // Extract organization
    const organization = googleContact.organizations?.[0]
    const company = organization?.name
    const jobTitle = organization?.title

    // Extract address
    const address = googleContact.addresses?.[0]?.formattedValue

    return {
      user_id: this.userId,
      name: fullName || 'Unknown',
      email: primaryEmail,
      phone: phone || undefined,
      company: company || undefined,
      status: 'active',
      last_activity: new Date().toISOString(),
      data: {
        source: 'google',
        firstName,
        lastName,
        jobTitle,
        address,
        importedAt: new Date().toISOString(),
      },
    }
  }

  private async findExistingContact(email: string): Promise<LocalContact | null> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', this.userId)
        .eq('email', email)
        .single()

      if (error) {
        return null
      }

      return data
    } catch (error) {
      return null
    }
  }

  private ensureNotDisposed(): void {
    if (this.state.isDisposed) {
      throw this.createError(GmailErrorCode.SERVICE_UNAVAILABLE, 'ContactsService has been disposed')
    }
  }

  private updateActivity(): void {
    this.state.lastActivity = new Date()
  }

  private handleError(message: string, error: unknown): void {
    this.state.errorCount++

    if (this.config.enableLogging) {
      logger.error(`[ContactsService] ${message}`, error)
    }
  }

  private createError(code: GmailErrorCode, message: string, originalError?: unknown): GmailError {
    const error = new Error(message) as GmailError
    error.code = code
    error.context = 'ContactsService'
    error.retryable = this.isRetryableError(code)
    error.originalError = originalError
    return error
  }

  private isRetryableError(code: GmailErrorCode): boolean {
    const retryableCodes = [
      GmailErrorCode.API_NETWORK_ERROR,
      GmailErrorCode.API_TIMEOUT,
      GmailErrorCode.DB_CONNECTION_ERROR,
      GmailErrorCode.SERVICE_UNAVAILABLE,
    ]
    return retryableCodes.includes(code)
  }
}
