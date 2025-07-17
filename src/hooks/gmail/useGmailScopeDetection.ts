import { useState, useCallback } from 'react'
import { needsContactsPermission, detectMissingScopes, generateScopeMessage } from '@/services/google/scopeDetection'
import { logger } from '@/utils/logger'

interface UseGmailScopeDetectionOptions {
  enableLogging?: boolean
}

interface UseGmailScopeDetectionReturn {
  checkContactsPermission: (userId: string, email: string) => Promise<boolean>
  checkAllScopes: (
    userId: string,
    email: string,
  ) => Promise<{
    hasAllScopes: boolean
    missingScopes: string[]
    userMessage: string
  }>
  loading: boolean
}

/**
 * Hook to detect missing Gmail OAuth scopes
 * Provides automatic scope validation and user-friendly messages
 */
export function useGmailScopeDetection(options: UseGmailScopeDetectionOptions = {}): UseGmailScopeDetectionReturn {
  const { enableLogging = false } = options
  const [loading, setLoading] = useState(false)

  const checkContactsPermission = useCallback(
    async (userId: string, email: string): Promise<boolean> => {
      setLoading(true)
      try {
        const needsPermission = await needsContactsPermission(userId, email)

        if (enableLogging) {
          logger.info(`[useGmailScopeDetection] Contacts permission check for ${email}:`, {
            needsPermission,
          })
        }

        return !needsPermission // Return true if we DON'T need permission (i.e., we have it)
      } catch (error) {
        if (enableLogging) {
          logger.error('[useGmailScopeDetection] Error checking contacts permission:', error)
        }
        return false // Assume we don't have permission if there's an error
      } finally {
        setLoading(false)
      }
    },
    [enableLogging],
  )

  const checkAllScopes = useCallback(
    async (userId: string, email: string) => {
      setLoading(true)
      try {
        const result = await detectMissingScopes(userId, email)
        const userMessage = result.needsReconnection
          ? generateScopeMessage(result.missingScopes)
          : 'All permissions are available'

        if (enableLogging) {
          logger.info(`[useGmailScopeDetection] Full scope check for ${email}:`, result)
        }

        return {
          hasAllScopes: result.hasAllScopes,
          missingScopes: result.missingScopes,
          userMessage,
        }
      } catch (error) {
        if (enableLogging) {
          logger.error('[useGmailScopeDetection] Error checking all scopes:', error)
        }

        return {
          hasAllScopes: false,
          missingScopes: [],
          userMessage: 'Unable to verify permissions. Please try reconnecting your account.',
        }
      } finally {
        setLoading(false)
      }
    },
    [enableLogging],
  )

  return {
    checkContactsPermission,
    checkAllScopes,
    loading,
  }
}
