import { useState, useEffect } from 'react'
import { CalendarDays, Users, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/components/auth'
import { useStore } from '@/stores'
import { useOrganizationStats, useOrganizationLoadingStates } from '@/stores/organizationStore'

interface WelcomeHeaderProps {
  username?: string
  taskCount?: number
  collaboratorCount?: number
}

export function WelcomeHeader({ collaboratorCount }: WelcomeHeaderProps) {
  const [timeView, setTimeView] = useState<'week' | 'month'>('week')
  const [greeting, setGreeting] = useState('Good morning')
  const [currentDate, setCurrentDate] = useState('')
  const { tasks } = useStore()
  const { user } = useAuth()
  const stats = useOrganizationStats()
  const loadingStates = useOrganizationLoadingStates()

  const username = user?.email?.split('@')[0] || 'Andres'
  const taskCount = tasks.filter(task => task.display_status === 'completed').length

  // Use real organization data if available, otherwise fall back to prop
  const actualCollaboratorCount = loadingStates.loadingOrganization
    ? collaboratorCount || 0
    : stats.activeMembers || collaboratorCount || 0

  // Update greeting based on time of day
  useEffect(() => {
    const updateGreeting = () => {
      const hours = new Date().getHours()
      if (hours < 12) {
        setGreeting('Good morning')
      } else if (hours < 18) {
        setGreeting('Good afternoon')
      } else {
        setGreeting('Good evening')
      }
    }

    // Format current date like "Friday, May 9"
    const formatDate = () => {
      const now = new Date()
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }),
      )
    }

    updateGreeting()
    formatDate()

    // Update every hour in case user keeps the app open
    const interval = setInterval(() => {
      updateGreeting()
      formatDate()
    }, 3600000) // every hour

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full px-6 py-14 bg-primary-800">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-1">
          <div className="text-lg font-medium text-gray-700 mb-0.5">{currentDate}</div>
          <h1 className="text-4xl font-bold mt-0 text-gray-800">
            {greeting}, {username}
          </h1>
        </div>

        <div className="flex justify-center items-center mt-1 mb-1">
          <div className="bg-primary-700/30 rounded-full px-8 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="hidden md:block">
                <Select value={timeView} onValueChange={value => setTimeView(value as 'week' | 'month')}>
                  <SelectTrigger className="w-[120px] h-8 px-3 bg-primary-600 text-gray-700 rounded-full">
                    <SelectValue placeholder="My week" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">My week</SelectItem>
                    <SelectItem value="month">My month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden md:block h-6 w-px bg-primary-600/50"></div>

              <div className="hidden md:flex items-center gap-2">
                <div className="p-1 rounded-full bg-primary-600/20">
                  <CalendarDays className="w-4 h-4 text-gray-600" />
                </div>
                <span className="font-semibold text-gray-800">{taskCount}</span>
                <span className="text-gray-700">tasks completed</span>
              </div>

              <div className="hidden md:block h-6 w-px bg-primary-600/50"></div>

              <div className="hidden md:flex items-center gap-2">
                <div className="p-1 rounded-full bg-primary-600/20">
                  <Users className="w-4 h-4 text-gray-600" />
                </div>
                <span className="font-semibold text-gray-800">
                  {loadingStates.loadingOrganization ? (
                    <div className="w-4 h-4 animate-spin border border-gray-600 border-t-transparent rounded-full" />
                  ) : (
                    actualCollaboratorCount
                  )}
                </span>
                <span className="text-gray-700">collaborators</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
