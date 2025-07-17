import { logger } from '@/utils/logger'
import { getValidToken } from './tokenService'
import { GOOGLE_OAUTH_SCOPES } from '@/constants/store/google'

/**
 * Scope Detection Service
 * Automatically detects missing OAuth scopes and suggests reconnection
 */

export interface ScopeDetectionResult {
  hasAllScopes: boolean
  missingScopes: string[]
  currentScopes: string[]
  needsReconnection: boolean
  errorMessage?: string
}

/**
 * Check if a Gmail account has all required scopes
 * @param userId - The authenticated user's ID
 * @param email - The Gmail account email
 * @returns Promise<ScopeDetectionResult>
 */
export async function detectMissingScopes(userId: string, email: string): Promise<ScopeDetectionResult> {
  try {
    // Get a valid access token
    const token = await getValidToken(userId, email)

    if (!token) {
      logger.warn(`[ScopeDetection] No valid token available for ${email}`)
      return {
        hasAllScopes: false,
        missingScopes: [...GOOGLE_OAUTH_SCOPES],
        currentScopes: [],
        needsReconnection: true,
        errorMessage: 'No valid token available - account needs to be connected',
      }
    }

    // Check token info with Google
    const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`)

    if (!tokenInfoResponse.ok) {
      throw new Error('Failed to get token info from Google')
    }

    const tokenInfo = await tokenInfoResponse.json()
    const currentScopes = tokenInfo.scope ? tokenInfo.scope.split(' ') : []

    // Check which required scopes are missing
    const requiredScopes = [...GOOGLE_OAUTH_SCOPES]
    const missingScopes = requiredScopes.filter(scope => !currentScopes.includes(scope))

    const hasAllScopes = missingScopes.length === 0

    logger.info(`[ScopeDetection] Scope check for ${email}:`, {
      hasAllScopes,
      currentScopes,
      missingScopes,
      requiredScopes,
    })

    return {
      hasAllScopes,
      missingScopes,
      currentScopes,
      needsReconnection: !hasAllScopes,
    }
  } catch (error) {
    logger.error('[ScopeDetection] Error detecting scopes:', error)

    return {
      hasAllScopes: false,
      missingScopes: [...GOOGLE_OAUTH_SCOPES],
      currentScopes: [],
      needsReconnection: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if the account needs reconnection specifically for contacts access
 * @param userId - The authenticated user's ID
 * @param email - The Gmail account email
 * @returns Promise<boolean>
 */
export async function needsContactsPermission(userId: string, email: string): Promise<boolean> {
  try {
    const result = await detectMissingScopes(userId, email)

    // Check specifically for contacts scope
    const contactsScope = 'https://www.googleapis.com/auth/contacts.readonly'
    return result.missingScopes.includes(contactsScope)
  } catch (error) {
    logger.error('[ScopeDetection] Error checking contacts permission:', error)
    return true // Assume we need permission if we can't check
  }
}

/**
 * Generate a user-friendly message about missing scopes
 * @param missingScopes - Array of missing scope URLs
 * @returns string - Human readable message
 */
export function generateScopeMessage(missingScopes: string[]): string {
  const scopeDescriptions: Record<string, string> = {
    'https://www.googleapis.com/auth/gmail.readonly': 'Gmail access',
    'https://www.googleapis.com/auth/contacts.readonly': 'Google Contacts access',
    'https://www.googleapis.com/auth/userinfo.email': 'Email information',
    'https://www.googleapis.com/auth/userinfo.profile': 'Profile information',
    openid: 'OpenID authentication',
    profile: 'Basic profile',
    email: 'Email address',
  }

  const descriptions = missingScopes.map(scope => scopeDescriptions[scope] || scope).join(', ')

  return `Your account needs additional permissions: ${descriptions}. Please reconnect to enable all features.`
}

/**
 * Automatic scope validation for critical operations
 * @param userId - The authenticated user's ID
 * @param email - The Gmail account email
 * @param requiredScopes - Specific scopes needed for the operation
 * @returns Promise<boolean> - Whether the operation can proceed
 */
export async function validateScopesForOperation(
  userId: string,
  email: string,
  requiredScopes: string[],
): Promise<boolean> {
  try {
    const result = await detectMissingScopes(userId, email)

    // Check if any of the required scopes are missing
    const hasRequiredScopes = requiredScopes.every(scope => result.currentScopes.includes(scope))

    if (!hasRequiredScopes) {
      const missingRequired = requiredScopes.filter(scope => !result.currentScopes.includes(scope))

      logger.warn(`[ScopeDetection] Operation blocked - missing scopes:`, {
        email,
        operation: requiredScopes,
        missing: missingRequired,
      })
    }

    return hasRequiredScopes
  } catch (error) {
    logger.error('[ScopeDetection] Error validating scopes for operation:', error)
    return false
  }
}
