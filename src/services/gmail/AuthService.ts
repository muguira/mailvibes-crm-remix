import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/utils/logger'
import {
  buildAuthUrl,
  exchangeCodeForTokens,
  getRedirectUri,
  cleanupCallbackUrl,
  disconnectGmailAccount as disconnectGmailAccountLegacy,
} from '@/services/google/authService'
import { deleteTokens as deleteTokensLegacy } from '@/services/google/tokenService'
import type {
  GmailServiceConfig,
  ConnectionResult,
  TokenStatus,
  GmailError,
  GmailAccount,
  TokenData,
  ServiceState,
} from './types'
import { GmailErrorCode } from './types'

/**
 * AuthService handles all Gmail OAuth2 authentication and token management
 * Encapsulates authentication logic without global state
 */
export class AuthService {
  private userId: string
  private config: GmailServiceConfig
  private state: ServiceState

  // Instance-based state (no more global state!)
  private failedAttempts = new Map<string, number>()
  private ongoingRefresh = new Map<string, Promise<string | null>>()

  // Constants
  private readonly MAX_REFRESH_ATTEMPTS = 2
  private readonly TOKEN_REFRESH_BUFFER = 10 * 60 * 1000 // 10 minutes

  constructor(userId: string, config: GmailServiceConfig) {
    this.userId = userId
    this.config = config
    this.state = {
      isInitialized: true,
      isDisposed: false,
      lastActivity: new Date(),
      errorCount: 0,
    }

    if (config.enableLogging) {
      logger.info(`[AuthService] Initialized for user: ${userId}`)
    }
  }

  /**
   * Initiate OAuth2 flow and return authorization URL
   */
  async initiateOAuth(scopes?: string[]): Promise<string> {
    this.ensureNotDisposed()
    this.updateActivity()

    try {
      const authUrl = await buildAuthUrl(getRedirectUri(), scopes)

      if (this.config.enableLogging) {
        logger.info(`[AuthService] OAuth flow initiated for user: ${this.userId}`)
      }

      return authUrl
    } catch (error) {
      this.handleError('Failed to initiate OAuth flow', error)
      throw this.createError(GmailErrorCode.AUTH_INVALID_TOKEN, 'Failed to initiate OAuth flow', error)
    }
  }

  /**
   * Handle OAuth callback and complete authentication
   */
  async handleCallback(code: string, state: string): Promise<TokenData> {
    this.ensureNotDisposed()
    this.updateActivity()

    try {
      if (this.config.enableLogging) {
        logger.info('[AuthService] Starting OAuth callback handling', {
          userId: this.userId,
          code: code.substring(0, 10) + '...',
          state,
        })
      }

      // ✅ CRITICAL FIX: Get the actual PKCE parameters instead of using empty string
      // Import the functions we need to retrieve PKCE params
      const { retrievePKCEParams, validateState, clearPKCEParams } = await import('@/services/google/pkceService')
      const { getRedirectUri } = await import('@/services/google/authService')

      // Validate state parameter and get PKCE params
      const pkceParams = retrievePKCEParams()
      if (!pkceParams || !validateState(state, pkceParams.state)) {
        throw new Error('Invalid state parameter - possible CSRF attack')
      }

      if (this.config.enableLogging) {
        logger.info('[AuthService] ✅ PKCE params validated, code_verifier available')
      }

      // Use existing authService logic for handling callback with REAL code_verifier
      const tokenResponse = await exchangeCodeForTokens(code, pkceParams.code_verifier, getRedirectUri())

      // Clear PKCE params after successful exchange
      clearPKCEParams()

      if (this.config.enableLogging) {
        logger.info('[AuthService] exchangeCodeForTokens response:', {
          hasAccessToken: !!tokenResponse.access_token,
          hasRefreshToken: !!tokenResponse.refresh_token,
          email: tokenResponse.email,
          scope: tokenResponse.scope,
          expiresIn: tokenResponse.expires_in,
        })
      }

      // Convert TokenResponse to TokenData
      const tokenData: TokenData = {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || '',
        expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000),
        scope: tokenResponse.scope,
        email: tokenResponse.email,
        user_info: tokenResponse.user_info,
      }

      // ✅ CRITICAL: Manually save tokens because Edge Function might not be doing it properly
      if (tokenData.email && this.userId) {
        if (this.config.enableLogging) {
          logger.info('[AuthService] Manually saving tokens to ensure they are stored', {
            userId: this.userId,
            email: tokenData.email,
          })
        }

        try {
          // Import saveTokens dynamically to avoid circular import
          const { saveTokens } = await import('@/services/google/tokenService')
          await saveTokens(this.userId, tokenData.email, tokenData)

          if (this.config.enableLogging) {
            logger.info('[AuthService] ✅ Tokens saved successfully to database')
          }
        } catch (saveError) {
          logger.error('[AuthService] ❌ Failed to save tokens:', saveError)
          throw saveError
        }
      } else {
        logger.error('[AuthService] ❌ Missing email or userId for token saving', {
          email: tokenData.email,
          userId: this.userId,
        })
        throw new Error('Missing email or userId for token saving')
      }

      // Clean up URL parameters
      cleanupCallbackUrl()

      if (this.config.enableLogging) {
        logger.info(`[AuthService] ✅ OAuth callback handled successfully for user: ${this.userId}`)
      }

      return tokenData
    } catch (error) {
      this.handleError('Failed to handle OAuth callback', error)
      throw this.createError(GmailErrorCode.AUTH_REFRESH_FAILED, 'Failed to handle OAuth callback', error)
    }
  }

  /**
   * Get a valid access token for the user
   */
  async getValidToken(email?: string): Promise<string | null> {
    this.ensureNotDisposed()
    this.updateActivity()

    const key = `${this.userId}-${email || 'default'}`

    try {
      // Check if there's an ongoing refresh operation
      if (this.ongoingRefresh.has(key)) {
        if (this.config.enableLogging) {
          logger.info(`[AuthService] Waiting for ongoing refresh operation for: ${email}`)
        }
        return await this.ongoingRefresh.get(key)!
      }

      // Get token from database
      const tokenRecord = await this.getTokenFromDatabase(email)
      if (!tokenRecord) {
        return null
      }

      // Check if token is still valid
      const expiresAt = new Date(tokenRecord.expires_at)
      const now = new Date()

      if (expiresAt.getTime() > now.getTime() + this.TOKEN_REFRESH_BUFFER) {
        if (this.config.enableLogging) {
          logger.debug(`[AuthService] Token is still valid for: ${email}`)
        }
        return tokenRecord.access_token
      }

      // Check failed attempts
      const attempts = this.failedAttempts.get(key) || 0
      if (attempts >= this.MAX_REFRESH_ATTEMPTS) {
        logger.error(`[AuthService] Max refresh attempts reached for: ${email}`)
        await this.markAccountAsDisconnected(email || tokenRecord.email_accounts.email)
        return null
      }

      // Try to refresh token
      return await this.refreshToken(email)
    } catch (error) {
      this.handleError('Failed to get valid token', error)
      return null
    }
  }

  /**
   * Refresh an access token
   */
  async refreshToken(email: string): Promise<string | null> {
    this.ensureNotDisposed()
    this.updateActivity()

    const key = `${this.userId}-${email}`

    // Check if there's already a refresh operation in progress
    if (this.ongoingRefresh.has(key)) {
      return await this.ongoingRefresh.get(key)!
    }

    // Start the refresh operation
    const refreshPromise = this.performTokenRefresh(email)
    this.ongoingRefresh.set(key, refreshPromise)

    try {
      const result = await refreshPromise
      return result
    } finally {
      // Clean up the ongoing operation
      this.ongoingRefresh.delete(key)
    }
  }

  /**
   * Revoke access token and disconnect account
   */
  async revokeToken(email: string): Promise<void> {
    this.ensureNotDisposed()
    this.updateActivity()

    try {
      // Use legacy disconnect logic for now
      await disconnectGmailAccountLegacy(this.userId, email)

      // Clear failed attempts
      const key = `${this.userId}-${email}`
      this.failedAttempts.delete(key)

      if (this.config.enableLogging) {
        logger.info(`[AuthService] Token revoked for user: ${this.userId}, email: ${email}`)
      }
    } catch (error) {
      this.handleError('Failed to revoke token', error)
      throw this.createError(GmailErrorCode.AUTH_REFRESH_FAILED, 'Failed to revoke token', error)
    }
  }

  /**
   * Get all connected Gmail accounts for the user
   */
  async getConnectedAccounts(): Promise<GmailAccount[]> {
    this.ensureNotDisposed()
    this.updateActivity()

    try {
      const { data: accounts, error } = await supabase
        .from('email_accounts')
        .select(
          `
          id,
          email,
          sync_enabled,
          last_sync_at,
          last_sync_status,
          last_sync_error,
          created_at,
          settings,
          oauth_tokens(expires_at)
        `,
        )
        .eq('user_id', this.userId)
        .eq('provider', 'gmail')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return (accounts || []).map((account: any) => {
        const tokenExpiresAt = account.oauth_tokens[0]?.expires_at
        const isTokenValid = tokenExpiresAt
          ? new Date(tokenExpiresAt).getTime() > Date.now() + this.TOKEN_REFRESH_BUFFER
          : false

        return {
          id: account.id,
          user_id: this.userId,
          email: account.email,
          provider: 'gmail' as const,
          sync_enabled: account.sync_enabled,
          last_sync_at: account.last_sync_at ? new Date(account.last_sync_at) : undefined,
          last_sync_status: account.last_sync_status,
          last_sync_error: account.last_sync_error,
          created_at: new Date(account.created_at),
          updated_at: new Date(account.updated_at || account.created_at),
          is_connected: account.sync_enabled && account.oauth_tokens.length > 0 && isTokenValid,
          token_expires_at: tokenExpiresAt ? new Date(tokenExpiresAt) : undefined,
        }
      })
    } catch (error) {
      this.handleError('Failed to get connected accounts', error)
      return []
    }
  }

  /**
   * Disconnect a specific Gmail account
   */
  async disconnectAccount(email: string): Promise<void> {
    this.ensureNotDisposed()
    this.updateActivity()

    try {
      await this.revokeToken(email)
    } catch (error) {
      this.handleError('Failed to disconnect account', error)
      throw this.createError(GmailErrorCode.AUTH_REFRESH_FAILED, 'Failed to disconnect account', error)
    }
  }

  /**
   * Get token status for a specific email
   */
  async getTokenStatus(email: string): Promise<TokenStatus> {
    this.ensureNotDisposed()
    this.updateActivity()

    const key = `${this.userId}-${email}`

    try {
      const tokenRecord = await this.getTokenFromDatabase(email)

      if (!tokenRecord) {
        return {
          isValid: false,
          needsRefresh: true,
          email,
          failedAttempts: this.failedAttempts.get(key) || 0,
        }
      }

      const expiresAt = new Date(tokenRecord.expires_at)
      const now = new Date()
      const isValid = expiresAt.getTime() > now.getTime() + this.TOKEN_REFRESH_BUFFER

      return {
        isValid,
        expiresAt,
        needsRefresh: !isValid,
        email,
        failedAttempts: this.failedAttempts.get(key) || 0,
      }
    } catch (error) {
      this.handleError('Failed to get token status', error)
      return {
        isValid: false,
        needsRefresh: true,
        email,
        failedAttempts: this.failedAttempts.get(key) || 0,
      }
    }
  }

  /**
   * Dispose the service and cleanup resources
   */
  dispose(): void {
    this.state.isDisposed = true
    this.failedAttempts.clear()
    this.ongoingRefresh.clear()

    if (this.config.enableLogging) {
      logger.info(`[AuthService] Disposed for user: ${this.userId}`)
    }
  }

  // Private methods

  private async getTokenFromDatabase(email?: string) {
    let query = supabase
      .from('oauth_tokens')
      .select(
        `
        *,
        email_accounts(email, sync_enabled)
      `,
      )
      .eq('user_id', this.userId)

    if (email) {
      query = query.eq('email_accounts.email', email).eq('email_accounts.sync_enabled', true)
    } else {
      query = query.eq('email_accounts.sync_enabled', true)
    }

    const { data: tokenRecord, error } = await query.single()

    if (error || !tokenRecord) {
      if (this.config.enableLogging) {
        logger.warn(`[AuthService] No tokens found for user: ${this.userId}, email: ${email}`)
      }
      return null
    }

    return tokenRecord
  }

  private async performTokenRefresh(email: string): Promise<string | null> {
    const key = `${this.userId}-${email}`

    try {
      const tokenRecord = await this.getTokenFromDatabase(email)

      if (!tokenRecord || !tokenRecord.refresh_token) {
        logger.error(`[AuthService] Token record not found or missing refresh token for: ${email}`)
        return null
      }

      const targetEmail = email || tokenRecord.email_accounts.email

      // Use Edge Function to refresh the token securely
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-refresh-token`

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const refreshResponse = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: this.userId,
          email: targetEmail,
        }),
      })

      const refreshData = await refreshResponse.json()

      if (!refreshResponse.ok || !refreshData.success) {
        // Track failed attempts
        this.failedAttempts.set(key, (this.failedAttempts.get(key) || 0) + 1)

        logger.error(`[AuthService] Token refresh failed for: ${targetEmail}`, refreshData.error)

        // If it's a token error, the refresh token is likely invalid
        if (
          refreshData.error?.includes('Invalid refresh token') ||
          refreshData.error?.includes('Token not found') ||
          refreshData.error?.includes('invalid_grant')
        ) {
          await this.markAccountAsDisconnected(targetEmail)
          return null
        }

        throw new Error(refreshData.error || 'Token refresh failed')
      }

      // Clear failed attempts on successful refresh
      this.failedAttempts.delete(key)

      if (this.config.enableLogging) {
        logger.info(`[AuthService] Token refresh successful for: ${targetEmail}`)
      }

      return refreshData.access_token
    } catch (error) {
      this.handleError('Error refreshing token', error)
      // Track failed attempts
      this.failedAttempts.set(key, (this.failedAttempts.get(key) || 0) + 1)
      return null
    }
  }

  private async markAccountAsDisconnected(email: string): Promise<void> {
    try {
      await supabase
        .from('email_accounts')
        .update({
          last_sync_status: 'failed',
          last_sync_error: 'Authentication failed. Please reconnect your Gmail account.',
          sync_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', this.userId)
        .eq('email', email)

      if (this.config.enableLogging) {
        logger.info(`[AuthService] Account marked as disconnected: ${email}`)
      }
    } catch (error) {
      logger.error(`[AuthService] Failed to mark account as disconnected: ${email}`, error)
    }
  }

  private ensureNotDisposed(): void {
    if (this.state.isDisposed) {
      throw this.createError(GmailErrorCode.SERVICE_UNAVAILABLE, 'AuthService has been disposed')
    }
  }

  private updateActivity(): void {
    this.state.lastActivity = new Date()
  }

  private handleError(message: string, error: unknown): void {
    this.state.errorCount++

    if (this.config.enableLogging) {
      logger.error(`[AuthService] ${message}`, error)
    }
  }

  private createError(code: GmailErrorCode, message: string, originalError?: unknown): GmailError {
    const error = new Error(message) as GmailError
    error.code = code
    error.context = 'AuthService'
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
