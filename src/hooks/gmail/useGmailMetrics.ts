import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth'

export interface GmailSyncMetrics {
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  successRate: number
  totalEmailsSynced: number
  averageSyncDuration: number
  lastSyncTime: Date | null
  recentSyncs: SyncLogEntry[]
  syncsBySource: {
    api: number
    database: number
  }
  todayStats: {
    syncs: number
    emails: number
    avgDuration: number
  }
}

export interface SyncLogEntry {
  id: string
  sync_type: string
  started_at: string | null
  completed_at: string | null
  status: string
  emails_synced: number | null
  emails_created: number | null
  emails_updated: number | null
  error_message: string | null
  metadata: any
  email_account_id: string
  account_email?: string // Will be joined from email_accounts table
  target_contact?: string // Extracted from metadata
  description?: string // Extracted from metadata
}

const initialMetrics: GmailSyncMetrics = {
  totalSyncs: 0,
  successfulSyncs: 0,
  failedSyncs: 0,
  successRate: 0,
  totalEmailsSynced: 0,
  averageSyncDuration: 0,
  lastSyncTime: null,
  recentSyncs: [],
  syncsBySource: { api: 0, database: 0 },
  todayStats: { syncs: 0, emails: 0, avgDuration: 0 },
}

/**
 * Calculate safe duration between two timestamp strings
 * Returns 0 for invalid dates or negative durations
 */
const calculateSafeDuration = (startedAt: string | null, completedAt: string | null): number => {
  // Validate inputs
  if (!startedAt || !completedAt) return 0

  try {
    const startTime = new Date(startedAt).getTime()
    const endTime = new Date(completedAt).getTime()

    // Check for invalid dates
    if (isNaN(startTime) || isNaN(endTime)) return 0

    // Calculate duration and ensure it's positive
    const duration = endTime - startTime
    return Math.max(0, duration) // Ensure never negative
  } catch (error) {
    console.warn('Error calculating sync duration:', error, { startedAt, completedAt })
    return 0
  }
}

export function useGmailMetrics(refreshInterval: number = 30000) {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<GmailSyncMetrics>(initialMetrics)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setError(null)

      // Fetch all sync logs for the user with account email
      const { data: syncLogs, error: fetchError } = await supabase
        .from('email_sync_log')
        .select(
          `
          *,
          email_accounts!inner(email, user_id)
        `,
        )
        .eq('email_accounts.user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200) // Increase limit to get more pairs

      if (fetchError) {
        throw new Error(`Failed to fetch sync logs: ${fetchError.message}`)
      }

      if (!syncLogs || syncLogs.length === 0) {
        setMetrics(initialMetrics)
        setLoading(false)
        return
      }

      // Helper function to get contact display name
      const getContactDisplayName = (contactEmail: string): string => {
        if (!contactEmail || contactEmail === 'Unknown Contact') {
          return 'unknown contact'
        }

        // If it's an email, show just the name part
        if (contactEmail.includes('@')) {
          const namePart = contactEmail.split('@')[0]
          return namePart.charAt(0).toUpperCase() + namePart.slice(1)
        }

        return contactEmail
      }

      // Helper function to find matching started record for a completed record
      const findMatchingStartedRecord = (completedLog: any, allLogs: any[]): any | null => {
        if (!completedLog.metadata) return null

        try {
          const completedMetadata =
            typeof completedLog.metadata === 'string' ? JSON.parse(completedLog.metadata) : completedLog.metadata

          const completedTime = new Date(completedLog.created_at || completedLog.completed_at).getTime()

          // Look for a 'started' record with same sync_type and contactEmail within 10 minutes
          const matchingStarted = allLogs.find(log => {
            if (log.status !== 'started') return false
            if (log.sync_type !== completedLog.sync_type) return false

            try {
              const startedMetadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata

              // Check if same contact email
              const sameContact =
                startedMetadata?.contactEmail === completedMetadata?.contactEmail ||
                startedMetadata?.targetContact === completedMetadata?.targetContact

              if (!sameContact) return false

              // Check if within reasonable time window (10 minutes)
              const startedTime = new Date(log.created_at || log.started_at).getTime()
              const timeDiff = Math.abs(completedTime - startedTime)
              const tenMinutes = 10 * 60 * 1000

              return timeDiff <= tenMinutes && startedTime <= completedTime
            } catch (e) {
              return false
            }
          })

          return matchingStarted || null
        } catch (e) {
          return null
        }
      }

      // Filter to only completed and failed records for the dashboard, and calculate real durations
      const completedAndFailedLogs = syncLogs.filter(log => log.status === 'completed' || log.status === 'failed')

      // Transform data to include account email, contact info, and real durations
      const transformedLogs = completedAndFailedLogs.map(log => {
        let targetContact = 'Unknown Contact'
        let description = log.sync_type
        let realStartedAt = log.started_at
        let realDuration = 0

        // Extract contact info from metadata
        if (log.metadata) {
          try {
            const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
            targetContact = metadata.targetContact || metadata.contactEmail || 'Unknown Contact'

            // Use improved description or generate one with display name
            if (metadata.description) {
              description = metadata.description
            } else {
              const displayName = getContactDisplayName(targetContact)
              description = `Sync emails with ${displayName}`
            }
          } catch (e) {
            // Metadata parsing failed, use defaults
            console.warn('Failed to parse sync metadata:', e)
          }
        }

        // For completed records, try to find the matching started record
        if (log.status === 'completed' && !log.started_at) {
          const matchingStarted = findMatchingStartedRecord(log, syncLogs)
          if (matchingStarted) {
            realStartedAt = matchingStarted.started_at
            if (log.completed_at && realStartedAt) {
              realDuration = calculateSafeDuration(realStartedAt, log.completed_at)
            }
          }
        } else if (log.started_at && log.completed_at) {
          // If both timestamps exist in same record, use them
          realDuration = calculateSafeDuration(log.started_at, log.completed_at)
        }

        return {
          ...log,
          account_email: (log as any).email_accounts?.email || 'Unknown',
          target_contact: targetContact,
          description: description,
          // Override with real timing data
          started_at: realStartedAt,
          real_duration: realDuration,
        }
      })

      // Also include in-progress records (they won't have duration but should show in dashboard)
      const inProgressLogs = syncLogs.filter(log => log.status === 'started')
      const transformedInProgressLogs = inProgressLogs.map(log => {
        let targetContact = 'Unknown Contact'
        let description = log.sync_type

        if (log.metadata) {
          try {
            const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
            targetContact = metadata.targetContact || metadata.contactEmail || 'Unknown Contact'
            if (metadata.description) {
              description = metadata.description
            } else {
              const displayName = getContactDisplayName(targetContact)
              description = `Sync emails with ${displayName}`
            }
          } catch (e) {
            console.warn('Failed to parse sync metadata:', e)
          }
        }

        return {
          ...log,
          account_email: (log as any).email_accounts?.email || 'Unknown',
          target_contact: targetContact,
          description: description,
          real_duration: 0, // In progress, no duration yet
        }
      })

      // Combine all logs and sort by creation time
      const allTransformedLogs = [...transformedLogs, ...transformedInProgressLogs].sort(
        (a, b) =>
          new Date(b.created_at || b.started_at || '').getTime() -
          new Date(a.created_at || a.started_at || '').getTime(),
      )

      // Calculate metrics using the combined logs
      const totalSyncs = allTransformedLogs.length
      const successfulSyncs = allTransformedLogs.filter(log => log.status === 'completed').length
      const failedSyncs = allTransformedLogs.filter(log => log.status === 'failed').length
      const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0

      const totalEmailsSynced = allTransformedLogs
        .filter(log => log.emails_synced !== null)
        .reduce((sum, log) => sum + (log.emails_synced || 0), 0)

      // Calculate average duration using real_duration
      const logsWithDuration = allTransformedLogs.filter(log => (log as any).real_duration > 0)
      const averageSyncDuration =
        logsWithDuration.length > 0
          ? logsWithDuration.reduce((sum, log) => sum + ((log as any).real_duration || 0), 0) / logsWithDuration.length
          : 0

      const lastSyncTime =
        allTransformedLogs.length > 0 && allTransformedLogs[0].started_at
          ? new Date(allTransformedLogs[0].started_at)
          : null
      const recentSyncs = allTransformedLogs.slice(0, 10)

      // Count syncs by type (since we don't have sync_source)
      const syncsBySource = allTransformedLogs.reduce(
        (acc, log) => {
          // Use sync_type as a proxy for source
          if (log.sync_type?.includes('api') || log.sync_type === 'full') acc.api++
          else acc.database++
          return acc
        },
        { api: 0, database: 0 },
      )

      // Today's statistics
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todaySyncs = allTransformedLogs.filter(log => log.started_at && new Date(log.started_at) >= today)

      const todayStatsWithDuration = todaySyncs.filter(log => (log as any).real_duration > 0)
      const todayStats = {
        syncs: todaySyncs.length,
        emails: todaySyncs
          .filter(log => log.emails_synced !== null)
          .reduce((sum, log) => sum + (log.emails_synced || 0), 0),
        avgDuration:
          todayStatsWithDuration.length > 0
            ? todayStatsWithDuration.reduce((sum, log) => sum + ((log as any).real_duration || 0), 0) /
              todayStatsWithDuration.length
            : 0,
      }

      setMetrics({
        totalSyncs,
        successfulSyncs,
        failedSyncs,
        successRate,
        totalEmailsSynced,
        averageSyncDuration,
        lastSyncTime,
        recentSyncs: allTransformedLogs.slice(0, 10),
        syncsBySource,
        todayStats,
      })
    } catch (err) {
      console.error('Error fetching Gmail metrics:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Fetch metrics on mount and set up polling
  useEffect(() => {
    fetchMetrics()

    // Set up polling if refreshInterval > 0
    if (refreshInterval > 0) {
      const interval = setInterval(fetchMetrics, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchMetrics, refreshInterval])

  // Set up real-time subscription for email_sync_log changes
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('gmail-metrics-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_sync_log',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh metrics when sync log changes
          fetchMetrics()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, fetchMetrics])

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics,
  }
}
