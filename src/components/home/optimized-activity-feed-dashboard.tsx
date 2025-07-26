import { useAuth } from '@/components/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  OptimizedActivityItem,
  useCombinedActivityFeed,
  usePersonalActivityFeed,
  useTeamActivityFeed,
} from '@/hooks/use-optimized-activity-feed'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Mail,
  MessageSquare,
  Phone,
  Pin,
  Plus,
  RefreshCw,
  TrendingUp,
  User,
  Users,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

interface OptimizedActivityFeedDashboardProps {
  organizationId?: string
  className?: string
  showStats?: boolean
  showFilters?: boolean
  defaultView?: 'personal' | 'team' | 'combined'
  enableRealtime?: boolean
}

export function OptimizedActivityFeedDashboard({
  organizationId,
  className,
  showStats = true,
  showFilters = true,
  defaultView = 'personal',
  enableRealtime = true,
}: OptimizedActivityFeedDashboardProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(defaultView)
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)

  // Use hooks conditionally based on active tab to avoid unnecessary requests
  const personalFeed = usePersonalActivityFeed({
    pageSize: 50,
    enableRealtime: enableRealtime && activeTab === 'personal',
  })

  const teamFeed = useTeamActivityFeed(organizationId || '', {
    pageSize: 50,
    enableRealtime: enableRealtime && activeTab === 'team',
  })

  const combinedFeed = useCombinedActivityFeed(organizationId, {
    pageSize: 50,
    enableRealtime: enableRealtime && activeTab === 'combined',
  })

  // Get current feed based on active tab - memoized to prevent unnecessary re-renders
  const currentFeed = useMemo(() => {
    switch (activeTab) {
      case 'personal':
        return personalFeed
      case 'team':
        return teamFeed
      case 'combined':
        return combinedFeed
      default:
        return personalFeed
    }
  }, [activeTab, personalFeed, teamFeed, combinedFeed])

  // Filter activities if showing pinned only - memoized for performance
  const filteredActivities = useMemo(() => {
    return showPinnedOnly ? currentFeed.activities.filter(activity => activity.is_pinned) : currentFeed.activities
  }, [currentFeed.activities, showPinnedOnly])

  // Group activities by date - memoized for performance
  const groupedActivities = useMemo(() => {
    const groups: Record<string, OptimizedActivityItem[]> = {}

    filteredActivities.forEach(activity => {
      const date = new Date(activity.timestamp)
      let key: string

      if (isToday(date)) {
        key = 'Today'
      } else if (isYesterday(date)) {
        key = 'Yesterday'
      } else {
        key = format(date, 'MMMM d, yyyy')
      }

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(activity)
    })

    return groups
  }, [filteredActivities])

  // Activity type icons mapping - memoized to prevent recreation
  const getActivityIcon = useCallback((type: string) => {
    switch (type) {
      case 'contact_add':
        return <Plus className="h-4 w-4" />
      case 'cell_edit':
        return <Edit className="h-4 w-4" />
      case 'note_add':
        return <MessageSquare className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'call':
        return <Phone className="h-4 w-4" />
      case 'meeting':
        return <Calendar className="h-4 w-4" />
      case 'login':
        return <CheckCircle className="h-4 w-4" />
      case 'task':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }, [])

  // Get activity color based on type - memoized to prevent recreation
  const getActivityColor = useCallback((type: string) => {
    switch (type) {
      case 'contact_add':
        return 'bg-green-100 text-green-800'
      case 'cell_edit':
        return 'bg-blue-100 text-blue-800'
      case 'note_add':
        return 'bg-purple-100 text-purple-800'
      case 'email':
        return 'bg-orange-100 text-orange-800'
      case 'call':
        return 'bg-indigo-100 text-indigo-800'
      case 'meeting':
        return 'bg-pink-100 text-pink-800'
      case 'login':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [])

  // Format activity description - memoized to prevent recreation
  const formatActivityDescription = useCallback(
    (activity: OptimizedActivityItem) => {
      const isCurrentUser = activity.user_id === user?.id
      const userName = isCurrentUser ? 'You' : activity.user_name

      switch (activity.activity_type) {
        case 'contact_add':
          return `${userName} added contact ${activity.entity_name || 'Unknown'}`
        case 'cell_edit':
          return `${userName} updated ${activity.field_name} for ${activity.entity_name || 'contact'}`
        case 'note_add':
          return `${userName} added a note to ${activity.entity_name || 'contact'}`
        case 'email':
          return `${userName} sent an email to ${activity.entity_name || 'contact'}`
        case 'call':
          return `${userName} had a call with ${activity.entity_name || 'contact'}`
        case 'meeting':
          return `${userName} had a meeting with ${activity.entity_name || 'contact'}`
        case 'login':
          return `${userName} logged in`
        case 'task':
          return `${userName} updated task: ${activity.entity_name}`
        default:
          return `${userName} performed ${activity.activity_type}`
      }
    },
    [user?.id],
  )

  // Optimized ActivityItem component with React.memo
  const ActivityItem = useCallback(
    ({ activity }: { activity: OptimizedActivityItem }) => (
      <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full',
            getActivityColor(activity.activity_type),
          )}
        >
          {getActivityIcon(activity.activity_type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">{activity.user_name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-gray-900">
              {activity.user_id === user?.id ? 'You' : activity.user_name}
            </span>
            <Badge variant="outline" className="text-xs">
              {activity.activity_scope}
            </Badge>
          </div>

          <p className="text-sm text-gray-600 mb-1">{formatActivityDescription(activity)}</p>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(parseISO(activity.timestamp), { addSuffix: true })}</span>
            {activity.is_pinned && <Pin className="h-3 w-3 text-blue-500" />}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => currentFeed.togglePin(activity.id)} className="h-6 w-6 p-0">
            <Pin className={cn('h-3 w-3', activity.is_pinned ? 'text-blue-500 fill-current' : 'text-gray-400')} />
          </Button>
        </div>
      </div>
    ),
    [currentFeed.togglePin, getActivityColor, getActivityIcon, formatActivityDescription, user?.id],
  )

  // Optimized EmptyState component
  const EmptyState = useCallback(
    ({ type }: { type: string }) => (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No {type} activities yet</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          {type === 'team'
            ? "When your team members perform activities, they'll appear here."
            : 'Your activities will appear here as you work in the CRM.'}
        </p>
      </div>
    ),
    [],
  )

  // Optimized LoadingState component
  const LoadingState = useCallback(
    () => (
      <div className="space-y-3 p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    ),
    [],
  )

  // Handle tab change with optimization
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as 'personal' | 'team' | 'combined')
  }, [])

  // Handle load more with optimization
  const handleLoadMore = useCallback(() => {
    if (!currentFeed.isLoadingMore && currentFeed.hasMore) {
      currentFeed.loadMore()
    }
  }, [currentFeed.isLoadingMore, currentFeed.hasMore, currentFeed.loadMore])

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Activity Feed</CardTitle>
          <div className="flex items-center gap-2">
            {currentFeed.isConnected && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => currentFeed.refresh()}
              disabled={currentFeed.loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn('h-4 w-4', currentFeed.loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {showStats && (
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-gray-600">Total:</span>
              <span className="font-medium">{currentFeed.stats.totalActivities}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-gray-600">Users:</span>
              <span className="font-medium">{currentFeed.stats.uniqueUsers}</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
          <div className="px-6 pb-3">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal" className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-1" disabled={!organizationId}>
                <Users className="h-4 w-4" />
                Team
              </TabsTrigger>
              <TabsTrigger value="combined" className="flex items-center gap-1" disabled={!organizationId}>
                <Activity className="h-4 w-4" />
                All
              </TabsTrigger>
            </TabsList>

            {showFilters && (
              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant={showPinnedOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                  className="h-7 text-xs"
                >
                  <Pin className="h-3 w-3 mr-1" />
                  Pinned
                  {currentFeed.stats.pinnedActivities > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                      {currentFeed.stats.pinnedActivities}
                    </Badge>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="personal" className="h-full m-0">
              <ScrollArea className="h-full">
                {personalFeed.loading ? (
                  <LoadingState />
                ) : personalFeed.isEmpty ? (
                  <EmptyState type="personal" />
                ) : (
                  <div className="px-3">
                    {Object.entries(groupedActivities).map(([date, activities]) => (
                      <div key={date} className="mb-4">
                        <div className="flex items-center gap-2 mb-2 px-3">
                          <h4 className="text-sm font-medium text-gray-900">{date}</h4>
                          <Separator className="flex-1" />
                          <Badge variant="secondary" className="text-xs">
                            {activities.length}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {activities.map(activity => (
                            <ActivityItem key={activity.id} activity={activity} />
                          ))}
                        </div>
                      </div>
                    ))}

                    {personalFeed.hasMore && (
                      <div className="flex justify-center p-4">
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          disabled={personalFeed.isLoadingMore}
                          className="text-sm"
                        >
                          {personalFeed.isLoadingMore ? 'Loading...' : 'Load More'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {personalFeed.error && (
                  <div className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Failed to load activities</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => personalFeed.refresh()}>
                      Try Again
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="team" className="h-full m-0">
              <ScrollArea className="h-full">
                {teamFeed.loading ? (
                  <LoadingState />
                ) : teamFeed.isEmpty ? (
                  <EmptyState type="team" />
                ) : (
                  <div className="px-3">
                    {Object.entries(groupedActivities).map(([date, activities]) => (
                      <div key={date} className="mb-4">
                        <div className="flex items-center gap-2 mb-2 px-3">
                          <h4 className="text-sm font-medium text-gray-900">{date}</h4>
                          <Separator className="flex-1" />
                          <Badge variant="secondary" className="text-xs">
                            {activities.length}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {activities.map(activity => (
                            <ActivityItem key={activity.id} activity={activity} />
                          ))}
                        </div>
                      </div>
                    ))}

                    {teamFeed.hasMore && (
                      <div className="flex justify-center p-4">
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          disabled={teamFeed.isLoadingMore}
                          className="text-sm"
                        >
                          {teamFeed.isLoadingMore ? 'Loading...' : 'Load More'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {teamFeed.error && (
                  <div className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Failed to load team activities</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => teamFeed.refresh()}>
                      Try Again
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="combined" className="h-full m-0">
              <ScrollArea className="h-full">
                {combinedFeed.loading ? (
                  <LoadingState />
                ) : combinedFeed.isEmpty ? (
                  <EmptyState type="combined" />
                ) : (
                  <div className="px-3">
                    {Object.entries(groupedActivities).map(([date, activities]) => (
                      <div key={date} className="mb-4">
                        <div className="flex items-center gap-2 mb-2 px-3">
                          <h4 className="text-sm font-medium text-gray-900">{date}</h4>
                          <Separator className="flex-1" />
                          <Badge variant="secondary" className="text-xs">
                            {activities.length}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {activities.map(activity => (
                            <ActivityItem key={activity.id} activity={activity} />
                          ))}
                        </div>
                      </div>
                    ))}

                    {combinedFeed.hasMore && (
                      <div className="flex justify-center p-4">
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          disabled={combinedFeed.isLoadingMore}
                          className="text-sm"
                        >
                          {combinedFeed.isLoadingMore ? 'Loading...' : 'Load More'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {combinedFeed.error && (
                  <div className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Failed to load activities</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => combinedFeed.refresh()}>
                      Try Again
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
