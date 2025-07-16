import { supabase } from '../../integrations/supabase/client'
import { TokenData, DatabaseTokenRecord, DatabaseEmailAccount, GmailAccount } from '@/types/google'
import { logger } from '@/utils/logger'

/**
 * Token Service for Gmail OAuth2 integration
 * Handles secure storage and retrieval of OAuth tokens in Supabase
 */

// Track failed refresh attempts to prevent infinite loops
const failedRefreshAttempts = new Map<string, number>()
const MAX_REFRESH_ATTEMPTS = 2
const TOKEN_REFRESH_BUFFER = 10 * 60 * 1000 // 10 minutes buffer for token refresh

// Track ongoing refresh operations to prevent multiple simultaneous refreshes
const ongoingRefreshOperations = new Map<string, Promise<string | null>>()

/**
 * Saves OAuth tokens to Supabase database
 * @param userId - The authenticated user's ID
 * @param email - The Gmail account email
 * @param tokens - Token data to save
 * @returns Promise<void>
 */
export async function saveTokens(userId: string, email: string, tokens: TokenData): Promise<void> {
  try {
    logger.info('Saving tokens for user:', { userId, email })

    // First, create or update the email account record
    const { data: emailAccount, error: emailAccountError } = await supabase
      .from('email_accounts')
      .upsert(
        {
          user_id: userId,
          email: email,
          provider: 'gmail',
          sync_enabled: true,
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'completed',
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,email',
        },
      )
      .select()
      .single()

    if (emailAccountError) {
      throw new Error(`Failed to save email account: ${emailAccountError.message}`)
    }

    // Then save the tokens
    const { error: tokenError } = await supabase.from('oauth_tokens').upsert(
      {
        user_id: userId,
        email_account_id: emailAccount.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at.toISOString(),
        token_type: 'Bearer',
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,email_account_id',
      },
    )

    if (tokenError) {
      throw new Error(`Failed to save tokens: ${tokenError.message}`)
    }

    // Clear any failed refresh attempts for this account
    const key = `${userId}-${email}`
    failedRefreshAttempts.delete(key)

    logger.info('Tokens saved successfully', { userId, email })
  } catch (error) {
    logger.error('Error saving tokens:', error)
    throw error
  }
}

/**
 * Retrieves a valid access token for the user
 * @param userId - The authenticated user's ID
 * @param email - Optional specific email account
 * @returns Promise<string | null> - Valid access token or null
 */
export async function getValidToken(userId: string, email?: string): Promise<string | null> {
  try {
    const key = `${userId}-${email || 'default'}`

    // Check if there's an ongoing refresh operation
    if (ongoingRefreshOperations.has(key)) {
      logger.info('Waiting for ongoing refresh operation', { userId, email })
      return await ongoingRefreshOperations.get(key)!
    }

    let query = supabase
      .from('oauth_tokens')
      .select(
        `
        *,
        email_accounts(email, sync_enabled)
      `,
      )
      .eq('user_id', userId)

    // Filter by email_accounts fields using a separate filter
    if (email) {
      query = query.eq('email_accounts.email', email).eq('email_accounts.sync_enabled', true)
    } else {
      query = query.eq('email_accounts.sync_enabled', true)
    }

    const { data: tokens, error } = await query.single()

    if (error || !tokens) {
      logger.warn('No tokens found for user', { userId, email, error })
      return null
    }

    const expiresAt = new Date(tokens.expires_at)
    const now = new Date()

    // If token is still valid (with buffer)
    if (expiresAt.getTime() > now.getTime() + TOKEN_REFRESH_BUFFER) {
      logger.debug('Token is still valid', { userId, email, expiresAt })
      return tokens.access_token
    }

    // Check if we've already tried to refresh this token recently
    const attempts = failedRefreshAttempts.get(key) || 0

    if (attempts >= MAX_REFRESH_ATTEMPTS) {
      logger.error(`Max refresh attempts reached for ${email || 'user'}. User needs to reconnect.`, {
        userId,
        email,
        attempts,
      })

      // Mark account as needing reconnection
      await markAccountAsDisconnected(userId, email || tokens.email_accounts.email)
      return null
    }

    // Try to refresh the token
    logger.info('Token needs refresh, attempting refresh', { userId, email })
    const refreshedToken = await refreshTokenIfNeeded(userId, email)
    return refreshedToken
  } catch (error) {
    logger.error('Error getting valid token:', error)
    return null
  }
}

/**
 * Refreshes an access token if needed
 * @param userId - The authenticated user's ID
 * @param email - Optional specific email account
 * @returns Promise<string | null> - New access token or null
 */
export async function refreshTokenIfNeeded(userId: string, email?: string): Promise<string | null> {
  const key = `${userId}-${email || 'default'}`

  // Check if there's already a refresh operation in progress
  if (ongoingRefreshOperations.has(key)) {
    logger.info('Refresh already in progress, waiting...', { userId, email })
    return await ongoingRefreshOperations.get(key)!
  }

  // Start the refresh operation
  const refreshPromise = performTokenRefresh(userId, email)
  ongoingRefreshOperations.set(key, refreshPromise)

  try {
    const result = await refreshPromise
    return result
  } finally {
    // Clean up the ongoing operation
    ongoingRefreshOperations.delete(key)
  }
}

/**
 * Performs the actual token refresh operation
 * @param userId - The authenticated user's ID
 * @param email - Optional specific email account
 * @returns Promise<string | null> - New access token or null
 */
async function performTokenRefresh(userId: string, email?: string): Promise<string | null> {
  const key = `${userId}-${email || 'default'}`

  try {
    let query = supabase
      .from('oauth_tokens')
      .select(
        `
        *,
        email_accounts(email, sync_enabled)
      `,
      )
      .eq('user_id', userId)

    // Filter by email_accounts fields using a separate filter
    if (email) {
      query = query.eq('email_accounts.email', email).eq('email_accounts.sync_enabled', true)
    } else {
      query = query.eq('email_accounts.sync_enabled', true)
    }

    const { data: tokenRecord, error } = await query.single()

    if (error || !tokenRecord || !tokenRecord.refresh_token) {
      logger.error('Token record not found or missing refresh token', {
        userId,
        email,
        error,
      })
      return null
    }

    const targetEmail = email || tokenRecord.email_accounts.email

    // Check if token needs refresh (expires in less than buffer time)
    const expiresAt = new Date(tokenRecord.expires_at)
    const now = new Date()

    if (expiresAt.getTime() > now.getTime() + TOKEN_REFRESH_BUFFER) {
      logger.debug('Token is still valid after double-check', {
        userId,
        email: targetEmail,
      })
      return tokenRecord.access_token // Still valid
    }

    logger.info('Calling refresh token Edge Function', {
      userId,
      email: targetEmail,
    })

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
        user_id: userId,
        email: targetEmail,
      }),
    })

    const refreshData = await refreshResponse.json()

    if (!refreshResponse.ok || !refreshData.success) {
      // Track failed attempts
      failedRefreshAttempts.set(key, (failedRefreshAttempts.get(key) || 0) + 1)

      logger.error('Token refresh failed', {
        userId,
        email: targetEmail,
        error: refreshData.error,
        attempts: failedRefreshAttempts.get(key),
      })

      // If it's a token error, the refresh token is likely invalid
      if (
        refreshData.error?.includes('Invalid refresh token') ||
        refreshData.error?.includes('Token not found') ||
        refreshData.error?.includes('invalid_grant')
      ) {
        logger.error('Refresh token is invalid. Marking account as disconnected.', { userId, email: targetEmail })

        await markAccountAsDisconnected(userId, targetEmail)
        return null
      }

      throw new Error(refreshData.error || 'Token refresh failed')
    }

    // Clear failed attempts on successful refresh
    failedRefreshAttempts.delete(key)

    logger.info('Token refresh successful', { userId, email: targetEmail })
    return refreshData.access_token
  } catch (error) {
    logger.error('Error refreshing token:', error)

    // Track failed attempts
    failedRefreshAttempts.set(key, (failedRefreshAttempts.get(key) || 0) + 1)

    return null
  }
}

/**
 * Marks an email account as disconnected due to token issues
 * @param userId - The authenticated user's ID
 * @param email - The Gmail account email
 */
async function markAccountAsDisconnected(userId: string, email: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('email_accounts')
      .update({
        sync_enabled: false,
        last_sync_status: 'failed',
        last_sync_error: 'Token refresh failed - account needs reconnection',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('email', email)

    if (error) {
      logger.error('Error marking account as disconnected:', error)
    } else {
      logger.info('Account marked as disconnected', { userId, email })
    }
  } catch (error) {
    logger.error('Error marking account as disconnected:', error)
  }
}

/**
 * Deletes all tokens for a user's Gmail account
 * @param userId - The authenticated user's ID
 * @param email - Optional specific email account
 * @returns Promise<void>
 */
export async function deleteTokens(userId: string, email?: string): Promise<void> {
  try {
    logger.info('Deleting tokens', { userId, email })

    if (email) {
      // First get the email account ID
      const { data: emailAccount } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('email', email)
        .single()

      if (emailAccount) {
        // Delete tokens
        const { error: tokenError } = await supabase
          .from('oauth_tokens')
          .delete()
          .eq('user_id', userId)
          .eq('email_account_id', emailAccount.id)

        if (tokenError) {
          throw new Error(`Failed to delete tokens: ${tokenError.message}`)
        }

        // Delete the email account
        const { error: accountError } = await supabase
          .from('email_accounts')
          .delete()
          .eq('user_id', userId)
          .eq('email', email)

        if (accountError) {
          throw new Error(`Failed to delete email account: ${accountError.message}`)
        }
      }
    } else {
      // Delete all tokens for the user
      const { error: tokenError } = await supabase.from('oauth_tokens').delete().eq('user_id', userId)

      if (tokenError) {
        throw new Error(`Failed to delete tokens: ${tokenError.message}`)
      }

      // Delete all email accounts for the user
      const { error: accountError } = await supabase
        .from('email_accounts')
        .delete()
        .eq('user_id', userId)
        .eq('provider', 'gmail')

      if (accountError) {
        throw new Error(`Failed to delete email accounts: ${accountError.message}`)
      }
    }

    // Clear failed refresh attempts
    const key = `${userId}-${email || 'default'}`
    failedRefreshAttempts.delete(key)

    logger.info('Tokens deleted successfully', { userId, email })
  } catch (error) {
    logger.error('Error deleting tokens:', error)
    throw error
  }
}

/**
 * Gets all connected Gmail accounts for a user
 * @param userId - The authenticated user's ID
 * @returns Promise<GmailAccount[]>
 */
export async function getConnectedAccounts(userId: string): Promise<GmailAccount[]> {
  try {
    const { data: accounts, error } = await supabase
      .from('email_accounts')
      .select(
        `
        *,
        oauth_tokens(expires_at)
      `,
      )
      .eq('user_id', userId)
      .eq('provider', 'gmail')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get connected accounts: ${error.message}`)
    }

    return accounts.map((account: any) => {
      const tokenExpiresAt = account.oauth_tokens[0]?.expires_at
      const isTokenValid = tokenExpiresAt
        ? new Date(tokenExpiresAt).getTime() > Date.now() + TOKEN_REFRESH_BUFFER
        : false

      return {
        id: account.id,
        user_id: account.user_id,
        email: account.email,
        provider: 'gmail' as const,
        sync_enabled: account.sync_enabled,
        last_sync_at: account.last_sync_at ? new Date(account.last_sync_at) : undefined,
        last_sync_status: account.last_sync_status,
        last_sync_error: account.last_sync_error,
        created_at: new Date(account.created_at),
        updated_at: new Date(account.updated_at),
        is_connected: account.sync_enabled && account.oauth_tokens.length > 0 && isTokenValid,
        token_expires_at: tokenExpiresAt ? new Date(tokenExpiresAt) : undefined,
      }
    })
  } catch (error) {
    logger.error('Error getting connected accounts:', error)
    return []
  }
}

/**
 * Checks if a user has any connected Gmail accounts
 * @param userId - The authenticated user's ID
 * @returns Promise<boolean>
 */
export async function hasConnectedAccounts(userId: string): Promise<boolean> {
  try {
    const accounts = await getConnectedAccounts(userId)
    return accounts.some(account => account.is_connected)
  } catch (error) {
    logger.error('Error checking connected accounts:', error)
    return false
  }
}

/**
 * Updates the last sync time for an email account
 * @param userId - The authenticated user's ID
 * @param email - The email account
 * @returns Promise<void>
 */
export async function updateLastSyncTime(userId: string, email: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('email_accounts')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'completed',
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('email', email)

    if (error) {
      throw new Error(`Failed to update last sync time: ${error.message}`)
    }
  } catch (error) {
    logger.error('Error updating last sync time:', error)
    throw error
  }
}

/**
 * Enables or disables sync for an email account
 * @param userId - The authenticated user's ID
 * @param email - The email account
 * @param enabled - Whether to enable or disable sync
 * @returns Promise<void>
 */
export async function setSyncEnabled(userId: string, email: string, enabled: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('email_accounts')
      .update({
        sync_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('email', email)

    if (error) {
      throw new Error(`Failed to update sync status: ${error.message}`)
    }
  } catch (error) {
    logger.error('Error updating sync status:', error)
    throw error
  }
}

/**
 * Forces a token refresh for testing purposes
 * @param userId - The authenticated user's ID
 * @param email - The Gmail account email
 * @returns Promise<string | null>
 */
export async function forceTokenRefresh(userId: string, email: string): Promise<string | null> {
  const key = `${userId}-${email}`

  // Clear any failed attempts to allow retry
  failedRefreshAttempts.delete(key)

  logger.info('Forcing token refresh', { userId, email })
  return await refreshTokenIfNeeded(userId, email)
}

/**
 * Get diagnostic information about token status
 * @param userId - The authenticated user's ID
 * @param email - The Gmail account email
 * @returns Promise<object> - Diagnostic information
 */
export async function getTokenDiagnostics(
  userId: string,
  email: string,
): Promise<{
  hasToken: boolean
  tokenExpired: boolean
  timeUntilExpiry?: number
  lastRefreshAttempt?: Date
  failedAttempts: number
  refreshTokenPresent: boolean
  accountEnabled: boolean
}> {
  const key = `${userId}-${email}`

  try {
    const { data: tokenRecord, error } = await supabase
      .from('oauth_tokens')
      .select(
        `
        *,
        email_accounts(email, sync_enabled)
      `,
      )
      .eq('user_id', userId)
      .eq('email_accounts.email', email)
      .single()

    if (error || !tokenRecord) {
      return {
        hasToken: false,
        tokenExpired: true,
        failedAttempts: failedRefreshAttempts.get(key) || 0,
        refreshTokenPresent: false,
        accountEnabled: false,
      }
    }

    const expiresAt = new Date(tokenRecord.expires_at)
    const now = new Date()
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()

    return {
      hasToken: true,
      tokenExpired: timeUntilExpiry <= TOKEN_REFRESH_BUFFER,
      timeUntilExpiry: Math.max(0, timeUntilExpiry),
      failedAttempts: failedRefreshAttempts.get(key) || 0,
      refreshTokenPresent: !!tokenRecord.refresh_token,
      accountEnabled: tokenRecord.email_accounts.sync_enabled,
    }
  } catch (error) {
    logger.error('Error getting token diagnostics:', error)
    return {
      hasToken: false,
      tokenExpired: true,
      failedAttempts: failedRefreshAttempts.get(key) || 0,
      refreshTokenPresent: false,
      accountEnabled: false,
    }
  }
}

/**
 * Check if automatic token refresh is working
 * @param userId - The authenticated user's ID
 * @param email - The Gmail account email
 * @returns Promise<boolean> - Whether auto-refresh is working
 */
export async function testTokenAutoRefresh(userId: string, email: string): Promise<boolean> {
  try {
    // First check if we have a token
    const diagnostics = await getTokenDiagnostics(userId, email)

    if (!diagnostics.hasToken || !diagnostics.refreshTokenPresent) {
      logger.warn('Cannot test auto-refresh: no token or refresh token', diagnostics)
      return false
    }

    // Try to get a valid token - this should trigger refresh if needed
    const token = await getValidToken(userId, email)

    if (!token) {
      logger.warn('Auto-refresh test failed: no valid token returned')
      return false
    }

    // Check diagnostics again to see if refresh happened
    const postDiagnostics = await getTokenDiagnostics(userId, email)

    logger.info('Auto-refresh test completed', {
      before: diagnostics,
      after: postDiagnostics,
      success: !postDiagnostics.tokenExpired,
    })

    return !postDiagnostics.tokenExpired
  } catch (error) {
    logger.error('Error testing auto-refresh:', error)
    return false
  }
}

/**
 * Get a summary of all Gmail accounts and their token status
 * @param userId - The authenticated user's ID
 * @returns Promise<object[]> - Array of account summaries
 */
export async function getAccountsSummary(userId: string): Promise<
  Array<{
    email: string
    isConnected: boolean
    tokenExpired: boolean
    timeUntilExpiry?: number
    failedAttempts: number
    needsReconnection: boolean
    lastSyncAt?: Date
  }>
> {
  try {
    const accounts = await getConnectedAccounts(userId)

    const summaries = await Promise.all(
      accounts.map(async account => {
        const diagnostics = await getTokenDiagnostics(userId, account.email)

        return {
          email: account.email,
          isConnected: account.is_connected,
          tokenExpired: diagnostics.tokenExpired,
          timeUntilExpiry: diagnostics.timeUntilExpiry,
          failedAttempts: diagnostics.failedAttempts,
          needsReconnection: diagnostics.tokenExpired || diagnostics.failedAttempts >= MAX_REFRESH_ATTEMPTS,
          lastSyncAt: account.last_sync_at,
        }
      }),
    )

    return summaries
  } catch (error) {
    logger.error('Error getting accounts summary:', error)
    return []
  }
}
