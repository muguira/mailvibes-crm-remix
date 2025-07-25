import { mockContactsById } from '@/components/stream/sample-data'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useActivity } from '@/contexts/ActivityContext'
import {
  Calendar,
  CalendarClock,
  CheckSquare,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
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

  // Log action to activity feed
  const logContactAction = (actionType: string) => {
    if (contactId) {
      logNoteAdd(contactId, contactName, `Performed ${actionType} action`)
    }
  }

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
            <DropdownMenuItem disabled className="text-gray-500 text-sm">
              No additional options available
            </DropdownMenuItem>
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
