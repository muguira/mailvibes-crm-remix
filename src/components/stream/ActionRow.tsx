import { mockContactsById } from '@/components/stream/sample-data'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/use-toast'
import { useActivity } from '@/contexts/ActivityContext'
import { useEmails } from '@/hooks/use-emails-store'
import { useStore } from '@/stores'
import {
  Calendar,
  CalendarClock,
  CheckSquare,
  Download,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Search,
  StickyNote,
} from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

interface ActionRowProps {
  className?: string
  contact?: {
    id?: string
    email?: string
    phone?: string
    name?: string
  }
}

export default function ActionRow({ className = '', contact }: ActionRowProps) {
  const { logNoteAdd } = useActivity()
  const { recordId } = useParams()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const contactId = contact?.id || recordId
  const contactName =
    contact?.name || (contactId ? mockContactsById[contactId]?.name || `Contact ${contactId}` : 'Unknown Contact')

  // Get auth user and emails store
  const { authUser } = useStore()
  const emails = useEmails()

  // Get email data for this contact
  const contactEmails = contact?.email ? emails.getEmailsForContact(contact.email) : []
  const syncStatus = contact?.email ? emails.getSyncState(contact.email) : 'idle'
  const hasMoreEmails = contact?.email ? emails.hasMoreEmails(contact.email) : false

  // Log action to activity feed
  const logContactAction = (actionType: string) => {
    if (contactId) {
      logNoteAdd(contactId, contactName, `Performed ${actionType} action`)
    }
  }

  // Handle sync historical emails
  const handleSyncHistoricalEmails = async () => {
    if (contact?.email && authUser?.id) {
      const startTime = Date.now()

      try {
        await emails.syncContactHistory(contact.email, authUser.id)

        const endTime = Date.now()
        const syncDuration = endTime - startTime

        // Get updated email count after sync
        const updatedEmails = emails.getEmailsForContact(contact.email)
      } catch (error) {
        console.error('Historical email sync failed:', error)
      }
    }
  }

  // Handle force full sync (debug option)
  const handleForceFullSync = async () => {
    if (contact?.email && authUser?.id) {
      const startTime = Date.now()

      try {
        // Clear existing emails first
        emails.clearContactEmails(contact.email)

        // Force full sync with debugging enabled
        await emails.syncContactHistory(contact.email, authUser.id, {
          forceFullSync: true,
          isAfterEmailSend: false,
        })

        const endTime = Date.now()
        const syncDuration = endTime - startTime

        // Get updated email count after sync
        const updatedEmails = emails.getEmailsForContact(contact.email)

        // Show success message
        toast({
          title: 'Force sync completed',
          description: `Synced ${updatedEmails.length} emails in ${Math.round(syncDuration / 1000)}s`,
        })
      } catch (error) {
        console.error('Force full sync failed:', error)
        toast({
          title: 'Force sync failed',
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          variant: 'destructive',
        })
      }
    }
  }

  // Handle debug analyze (simplified)
  const handleDebugAnalyze = async () => {
    if (!contact?.email || !authUser?.id) return

    try {
      // Basic email analysis without excessive logging
      const currentEmails = emails.getEmailsForContact(contact.email)
      const hasMore = emails.hasMoreEmails(contact.email)
      const syncState = emails.getSyncState(contact.email)

      toast({
        title: 'Debug Analysis',
        description: `${currentEmails.length} emails loaded, hasMore: ${hasMore}, status: ${syncState}`,
      })
    } catch (error) {
      console.error('Debug analysis failed:', error)
    }
  }

  // Handle test Gmail API (simplified)
  const handleTestGmailAPI = async () => {
    try {
      // Simple Gmail connectivity test
      toast({
        title: 'Gmail API Test',
        description: 'Testing Gmail connectivity... Check console for results.',
      })

      // Basic test without excessive logging
      // Implementation can be added here if needed
    } catch (error) {
      console.error('Gmail API test failed:', error)
    }
  }

  // Test Gmail queries (simplified debug)
  const handleTestGmailQueries = async () => {
    if (contact?.email && authUser?.id) {
      try {
        // Import the debugGmailQueries function and token service
        const { debugGmailQueries } = await import('@/services/google/gmailApi')
        const { getValidToken } = await import('@/services/google/tokenService')

        // Get Gmail access token
        const token = await getValidToken(authUser.id)

        if (!token) {
          toast({
            title: 'Gmail Token Error',
            description: 'Could not get valid Gmail token. Try reconnecting your account.',
            variant: 'destructive',
          })
          return
        }

        // Run the debug queries
        await debugGmailQueries(token, contact.email)

        toast({
          title: 'Gmail Test Completed',
          description: 'Check browser console for detailed results.',
        })
      } catch (error) {
        console.error('Test Gmail Queries failed:', error)
        toast({
          title: 'Gmail Test Failed',
          description: 'Could not test Gmail queries. Check console for details.',
          variant: 'destructive',
        })
      }
    }
  }

  // Check if we should show sync option - show when there might be more emails to sync
  // Always show sync if we have less than 100 emails (reasonable assumption that Gmail should have more)
  const shouldShowSync = contact?.email && (hasMoreEmails || contactEmails.length < 100)

  // Action buttons configuration - all buttons for desktop
  const desktopActions = [
    {
      icon: Phone,
      label: 'Call',
      href: contact?.phone ? `tel:${contact.phone}` : undefined,
      onClick: () => logContactAction('call'),
    },
    {
      icon: Mail,
      label: 'Email',
      href: contact?.email ? `mailto:${contact.email}` : undefined,
      onClick: () => logContactAction('email'),
    },
    {
      icon: CheckSquare,
      label: 'Task',
      onClick: () => logContactAction('task'),
    },
    {
      icon: StickyNote,
      label: 'Note',
      onClick: () => logContactAction('note'),
    },
    {
      icon: CalendarClock,
      label: 'Meeting',
      onClick: () => logContactAction('meeting'),
    },
    {
      icon: MoreHorizontal,
      label: 'More',
      isDropdown: true,
      onClick: () => {},
    },
  ]

  // Mobile shows 5 buttons in the specified order
  const mobileActions = [
    {
      icon: Phone,
      label: 'Call',
      href: contact?.phone ? `tel:${contact.phone}` : undefined,
      onClick: () => logContactAction('call'),
    },
    {
      icon: Calendar,
      label: 'Meeting',
      onClick: () => logContactAction('meeting'),
    },
    {
      icon: Mail,
      label: 'Email',
      href: contact?.email ? `mailto:${contact.email}` : undefined,
      onClick: () => logContactAction('email'),
    },
    {
      icon: MessageCircle,
      label: 'Text',
      onClick: () => logContactAction('text'),
    },
    {
      icon: MoreHorizontal,
      label: 'More',
      isDropdown: true,
      onClick: () => {},
    },
  ]

  // Render dropdown menu item for More button
  const renderMoreButton = (action: any, index: number) => {
    if (action.isDropdown) {
      return (
        <DropdownMenu key={index}>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center justify-center p-2 group">
              <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center border border-slate-light/30 group-hover:bg-slate-light/10 group-hover:border-teal-primary group-hover:border-2 transition-colors">
                <action.icon size={20} strokeWidth={1.5} className="text-teal-primary" />
              </div>
              <span className="text-xs text-slate-dark mt-1">{action.label}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56">
            {shouldShowSync && (
              <DropdownMenuItem
                onClick={handleSyncHistoricalEmails}
                disabled={syncStatus === 'syncing'}
                className="flex items-center gap-2 cursor-pointer"
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span>Sync Email History</span>
                      <span className="text-xs text-gray-500">
                        {contactEmails.length} emails loaded • {hasMoreEmails ? 'More available' : 'All synced'}
                      </span>
                    </div>
                  </>
                )}
              </DropdownMenuItem>
            )}
            {shouldShowSync && (
              <DropdownMenuItem
                onClick={handleForceFullSync}
                disabled={syncStatus === 'syncing'}
                className="flex items-center gap-2 cursor-pointer"
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span>🔄 Force Full Sync (Debug)</span>
                      <span className="text-xs text-gray-500">Ignore cache, sync all emails</span>
                    </div>
                  </>
                )}
              </DropdownMenuItem>
            )}
            {shouldShowSync && (
              <DropdownMenuItem
                onClick={handleTestGmailQueries}
                disabled={syncStatus === 'syncing'}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Search className="h-4 w-4" />
                <div className="flex flex-col">
                  <span>🔍 Test Gmail Queries (Debug)</span>
                  <span className="text-xs text-gray-500">Test different search patterns</span>
                </div>
              </DropdownMenuItem>
            )}
            {!shouldShowSync && (
              <DropdownMenuItem disabled className="text-gray-500 text-sm">
                Email history is up to date
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return (
      <button
        key={index}
        className="flex flex-col items-center justify-center p-2 group"
        onClick={() => {
          action.onClick?.()
          if (action.href) window.location.href = action.href
        }}
      >
        <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center border border-slate-light/30 group-hover:bg-slate-light/10 group-hover:border-teal-primary group-hover:border-2 transition-colors">
          <action.icon size={20} strokeWidth={1.5} className="text-teal-primary" />
        </div>
        <span className="text-xs text-slate-dark mt-1">{action.label}</span>
      </button>
    )
  }

  return (
    <div className={`${className}`}>
      {/* Mobile buttons (visible on smaller screens) */}
      <div className="flex items-center justify-between w-full lg:hidden">
        {mobileActions.map((action, index) => renderMoreButton(action, index))}
      </div>

      {/* Desktop buttons (visible on larger screens) - Now with gap-4 instead of gap-6 */}
      <div className="hidden lg:grid grid-cols-6 gap-4 w-full">
        {desktopActions.map((action, index) => renderMoreButton(action, index))}
      </div>
    </div>
  )
}
