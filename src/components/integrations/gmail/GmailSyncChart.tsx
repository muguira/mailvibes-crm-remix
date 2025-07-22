import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SyncLogEntry } from '@/hooks/gmail/useGmailMetrics'
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns'

interface GmailSyncChartProps {
  recentSyncs: SyncLogEntry[]
  className?: string
}

interface DayData {
  date: Date
  successful: number
  failed: number
  total: number
  emailsSynced: number
}

export function GmailSyncChart({ recentSyncs, className }: GmailSyncChartProps) {
  const chartData = useMemo(() => {
    // Get last 7 days
    const endDate = new Date()
    const startDate = subDays(endDate, 6)
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    // Process sync data by day
    const dayDataMap = new Map<string, DayData>()

    // Initialize days with zero data
    days.forEach(date => {
      dayDataMap.set(format(date, 'yyyy-MM-dd'), {
        date,
        successful: 0,
        failed: 0,
        total: 0,
        emailsSynced: 0,
      })
    })

    // Aggregate sync data
    recentSyncs.forEach(sync => {
      if (!sync.started_at) return

      const syncDate = new Date(sync.started_at)
      const dayKey = format(syncDate, 'yyyy-MM-dd')
      const dayData = dayDataMap.get(dayKey)

      if (dayData) {
        dayData.total++
        if (sync.status === 'completed') {
          dayData.successful++
        } else if (sync.status === 'failed') {
          dayData.failed++
        }
        dayData.emailsSynced += sync.emails_synced || 0
      }
    })

    return Array.from(dayDataMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [recentSyncs])

  const maxTotal = Math.max(...chartData.map(d => d.total), 1)
  const maxEmails = Math.max(...chartData.map(d => d.emailsSynced), 1)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">7-Day Sync Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Sync Count Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">Daily Sync Operations</h4>
            <div className="flex items-end justify-between h-32 bg-gray-50 rounded-lg p-4">
              {chartData.map((day, index) => (
                <div key={index} className="flex flex-col items-center flex-1 mx-1">
                  <div className="flex flex-col items-center justify-end h-24 w-full">
                    {day.total > 0 && (
                      <div className="w-full flex flex-col justify-end h-full">
                        {/* Failed syncs (red) */}
                        {day.failed > 0 && (
                          <div
                            className="w-full bg-red-400 rounded-t-sm"
                            style={{
                              height: `${(day.failed / maxTotal) * 100}%`,
                              minHeight: day.failed > 0 ? '2px' : '0',
                            }}
                          />
                        )}
                        {/* Successful syncs (green) */}
                        {day.successful > 0 && (
                          <div
                            className="w-full bg-green-400"
                            style={{
                              height: `${(day.successful / maxTotal) * 100}%`,
                              minHeight: day.successful > 0 ? '2px' : '0',
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 text-center">
                    <div>{format(day.date, 'MMM d')}</div>
                    <div className="font-medium">{day.total}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-400 rounded"></div>
                <span className="text-xs text-gray-600">Success</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-400 rounded"></div>
                <span className="text-xs text-gray-600">Failed</span>
              </div>
            </div>
          </div>

          {/* Emails Synced Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">Daily Emails Synced</h4>
            <div className="flex items-end justify-between h-24 bg-gray-50 rounded-lg p-4">
              {chartData.map((day, index) => (
                <div key={index} className="flex flex-col items-center flex-1 mx-1">
                  <div className="flex items-end h-16 w-full">
                    {day.emailsSynced > 0 && (
                      <div
                        className="w-full bg-blue-400 rounded-t-sm"
                        style={{
                          height: `${(day.emailsSynced / maxEmails) * 100}%`,
                          minHeight: day.emailsSynced > 0 ? '2px' : '0',
                        }}
                      />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 text-center">
                    <div>{format(day.date, 'MMM d')}</div>
                    <div className="font-medium">{day.emailsSynced}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {chartData.reduce((sum, day) => sum + day.successful, 0)}
              </div>
              <div className="text-xs text-green-600">Successful</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-bold text-red-600">
                {chartData.reduce((sum, day) => sum + day.failed, 0)}
              </div>
              <div className="text-xs text-red-600">Failed</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {chartData.reduce((sum, day) => sum + day.total, 0)}
              </div>
              <div className="text-xs text-blue-600">Total Syncs</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {chartData.reduce((sum, day) => sum + day.emailsSynced, 0)}
              </div>
              <div className="text-xs text-purple-600">Emails</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
