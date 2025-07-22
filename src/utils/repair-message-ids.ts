/**
 * Utility to repair Message-IDs for existing emails
 * This re-syncs emails from Gmail API to extract real RFC 2822 Message-IDs
 */

import { logger } from '@/utils/logger'
import { supabase } from '@/integrations/supabase/client'
import { createGmailService, createDefaultConfig } from '@/services/gmail'

export async function repairMessageIdsForContact(contactEmail: string): Promise<{
  success: boolean
  emailsProcessed: number
  error?: string
}> {
  try {
    logger.info(`🔧 [RepairMessageIds] Starting repair for ${contactEmail}`)

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Create Gmail service
    const config = createDefaultConfig(user.id)
    config.enableLogging = true
    const gmailService = await createGmailService(config)

    // Force full sync to re-extract Message-IDs from Gmail API
    const result = await gmailService.syncEmails(contactEmail, {
      maxEmails: 500, // Limit to avoid timeouts
      forceFullSync: true, // CRITICAL: Force re-sync to extract Message-IDs
      onProgress: progress => {
        logger.info(`🔧 [RepairMessageIds] Progress: ${progress.current}/${progress.total}`)
      },
    })

    if (result.success) {
      logger.info(`✅ [RepairMessageIds] Successfully repaired ${result.emailsSynced} emails for ${contactEmail}`)
      return {
        success: true,
        emailsProcessed: result.emailsSynced,
      }
    } else {
      throw new Error(result.error || 'Sync failed')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`❌ [RepairMessageIds] Failed for ${contactEmail}:`, error)

    return {
      success: false,
      emailsProcessed: 0,
      error: errorMessage,
    }
  }
}

/**
 * Quick repair function for browser console testing
 */
;(window as any).repairMessageIds = async (contactEmail: string) => {
  const result = await repairMessageIdsForContact(contactEmail)
  console.log('🔧 [RepairMessageIds] Result:', result)
  return result
}
