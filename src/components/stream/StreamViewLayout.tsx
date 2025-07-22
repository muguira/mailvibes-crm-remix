import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { StreamProfileCard } from './index'
import { AboutThisContact } from './index'
import ActionRow from './ActionRow'
import MobileTabView from './MobileTabView'
import StreamTimeline from './StreamTimeline'
import StreamToolbar from './StreamToolbar'
import FilterPanel from './FilterPanel'
import { EmptyState } from '@/components/ui/empty-state'
import { useActivity } from '@/contexts/ActivityContext'
import { useActivities } from '@/hooks/supabase/use-activities'
import { useAuth } from '@/components/auth'
import { logger } from '@/utils/logger'
import { format } from 'date-fns'
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor'

// Layout constants
const LEFT_RAIL_WIDTH = 400 // px
const RIGHT_RAIL_WIDTH = 380 // px - Aumentado de 300px a 380px para hacer la sección de Tasks más ancha

interface StreamViewLayoutProps {
  contact: {
    id: string
    name?: string
    title?: string
    company?: string
    location?: string
    email?: string
    phone?: string
    avatarUrl?: string
    owner?: string
    lastContacted?: string
    leadStatus?: string
    lifecycleStage?: string
    source?: string
    status?: string
    industry?: string
    jobTitle?: string
    address?: string
    description?: string
    facebook?: string
    instagram?: string
    linkedin?: string
    twitter?: string // X platform
    website?: string // Website field
    associatedDeals?: string
    primaryLocation?: string
    data?: Record<string, any>
    activities?: Array<any>
  }
}

export default function StreamViewLayout({ contact }: StreamViewLayoutProps) {
  // Performance monitoring for optimization tracking
  const { logSummary, renderCount } = usePerformanceMonitor('StreamViewLayout')

  // State to trigger updates on avatar when contact data changes
  const [updatedContact, setUpdatedContact] = useState(contact)
  const { logCellEdit } = useActivity()
  const { user } = useAuth()
  const { activities: contactActivities, createActivity } = useActivities(contact.id)

  // Log performance summary periodically for monitoring
  useEffect(() => {
    if (renderCount > 0 && renderCount % 10 === 0) {
      logSummary()
    }
  }, [renderCount, logSummary])

  // OPTIMIZED: Memoize user info extraction to avoid repeated string operations
  const userInfo = useMemo(() => {
    const email = user?.email || ''
    const userName = email.split('@')[0] || 'User'
    const userInitials = (email.substring(0, 2) || 'US').toUpperCase()

    return {
      email,
      userName,
      userInitials,
    }
  }, [user?.email])

  // OPTIMIZED: Memoize event handlers to prevent recreation on every render
  const handleContactUpdate = useCallback(
    (event: CustomEvent) => {
      const { contactId, field, value, oldValue } = event.detail

      if (contactId === contact.id) {
        // Update local state to trigger component re-render
        setUpdatedContact(prevContact => {
          logger.log(`StreamViewLayout: Updating field ${field} to: ${value}`)
          return {
            ...prevContact,
            [field]: value,
          }
        })

        // Log the update to the activity feed
        logCellEdit(contactId, field, value, oldValue)

        logger.log(`Profile card updated: ${field} = ${value}`)
      }
    },
    [contact.id, logCellEdit],
  )

  // OPTIMIZED: Memoize status change handler
  const handleStatusChange = useCallback(
    (event: CustomEvent) => {
      const { contactId, status, previousStatus } = event.detail

      if (contactId === contact.id) {
        logger.log(`StreamViewLayout: Status change detected: ${previousStatus} -> ${status}`)
        // Force update for status field specifically
        setUpdatedContact(prevContact => ({
          ...prevContact,
          status,
        }))

        // Log the status change to activity feed
        logCellEdit(contactId, 'status', status, previousStatus)
      }
    },
    [contact.id, logCellEdit],
  )

  // Listen for mockContactsUpdated event to refresh the UI
  useEffect(() => {
    // Add event listeners with type casting
    window.addEventListener('mockContactsUpdated', handleContactUpdate as EventListener)

    window.addEventListener('contactStatusChanged', handleStatusChange as EventListener)

    return () => {
      window.removeEventListener('mockContactsUpdated', handleContactUpdate as EventListener)

      window.removeEventListener('contactStatusChanged', handleStatusChange as EventListener)
    }
  }, [handleContactUpdate, handleStatusChange])

  // Early return if contact is undefined or null
  if (!contact) {
    return <EmptyState title="Contact Not Found" description="No data for this record yet." />
  }

  // OPTIMIZED: Memoize contact field extraction to avoid repeated destructuring
  const contactFields = useMemo(() => {
    // Safely destructure contact with default values
    const {
      name = '',
      title = '',
      company = '',
      location = '',
      phone = '',
      email = '',
      status = '', // Just use status field
      lifecycleStage = '',
      source = '',
      industry = '',
      owner = '',
      description = '',
      facebook = '',
      instagram = '',
      linkedin = '',
      twitter = '',
      website = '',
      jobTitle = '',
      associatedDeals = '',
      primaryLocation = '',
      activities = [],
      data = {},
    } = { ...contact, ...updatedContact } // Merge with updatedContact

    return {
      name,
      title,
      company,
      location,
      phone,
      email,
      status,
      lifecycleStage,
      source,
      industry,
      owner,
      description,
      facebook,
      instagram,
      linkedin,
      twitter,
      website,
      jobTitle,
      associatedDeals,
      primaryLocation,
      activities,
      data,
    }
  }, [contact, updatedContact])

  // OPTIMIZED: Memoize formatted activities with extensive caching
  const formattedActivities = useMemo(() => {
    logger.log('Formatting activities:', {
      contactActivities,
      contactId: contact.id,
    })

    // Only use contact activities from the useActivities hook to prevent duplicates
    const allActivities = contactActivities.map(activity => {
      // Cache the timestamp formatting
      const timestamp = new Date(activity.timestamp)
      const relativeTime = format(timestamp, 'dd/MM')

      return {
        id: activity.id,
        type: activity.type as 'email' | 'call' | 'note' | 'meeting' | 'status_update',
        timestamp: activity.timestamp,
        relativeTime,
        user: {
          name: userInfo.userName,
          initials: userInfo.userInitials,
        },
        summary: `${userInfo.userName} added a ${activity.type}`,
        body: activity.content || '',
        author: userInfo.userName,
      }
    })

    logger.log('Formatted activities:', allActivities)

    // Sort by timestamp descending - cache the comparison function
    return allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [contactActivities, contact.id, userInfo])

  // OPTIMIZED: Memoize safeContact object creation to prevent unnecessary re-creates
  const safeContact = useMemo(() => {
    // Log the status fields for debugging
    logger.log('Stream View status fields:', {
      contactStatus: contact.status,
      updatedStatus: updatedContact.status,
      finalStatus: contactFields.status,
    })

    return {
      ...contact,
      ...updatedContact, // Include any updated values
      ...contactFields, // Use optimized fields
      status: contactFields.status || '', // Use status consistently
      linkedIn: contactFields.linkedin, // Add linkedIn alias
    }
  }, [contact, updatedContact, contactFields])

  // OPTIMIZED: Memoize style objects for desktop layout
  const leftRailStyle = useMemo(
    () => ({
      minWidth: 'auto',
      maxWidth: '100%',
      // Apply fixed width only on desktop
      ...(typeof window !== 'undefined' && window.innerWidth >= 1024
        ? {
            width: LEFT_RAIL_WIDTH,
            minWidth: LEFT_RAIL_WIDTH,
            maxWidth: LEFT_RAIL_WIDTH,
          }
        : {}),
    }),
    [],
  )

  const rightRailStyle = useMemo(
    () => ({
      width: RIGHT_RAIL_WIDTH,
      minWidth: RIGHT_RAIL_WIDTH,
      maxWidth: RIGHT_RAIL_WIDTH,
    }),
    [],
  )

  return (
    <div className="flex flex-col w-full">
      {/* Desktop Toolbar - hidden on mobile */}
      <div className="hidden lg:block">
        <StreamToolbar />
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[400px_1fr_380px] lg:gap-4 mt-4">
        {/* Left rail - w-full on mobile, fixed 400px width on desktop */}
        <div className="w-full lg:w-[400px] shrink-0 self-start" style={leftRailStyle}>
          {/* Profile card */}
          <StreamProfileCard contact={safeContact} />

          {/* Action row - visible on all screen sizes, below profile card */}
          <div className="mt-6 flex items-center justify-center">
            <ActionRow className="w-full" contact={safeContact} />
          </div>

          {/* Mobile Tab View - only visible on mobile/tablet */}
          <div className="mt-4">
            <MobileTabView contact={safeContact} />
          </div>

          {/* About This Contact - only visible on desktop with single-column layout */}
          <div className="hidden lg:block mt-4">
            <AboutThisContact compact={true} contact={safeContact} />
          </div>
        </div>

        {/* Main content area - desktop only */}
        <div className="hidden lg:block flex-1 bg-slate-light/5 rounded-md overflow-y-auto self-start h-full">
          {(() => {
            console.log('🔍 [StreamViewLayout] Rendering StreamTimeline with:', {
              contactId: contact.id,
              contactEmail: contactFields.email,
              contactName: contactFields.name,
              contactFieldsDebug: contactFields,
            })
            return null
          })()}
          <StreamTimeline contactId={contact.id} contactEmail={contactFields.email} contactName={contactFields.name} />
        </div>

        {/* Right rail - desktop only */}
        <div className="hidden lg:block self-start" style={rightRailStyle}>
          <FilterPanel contact={safeContact} />
        </div>
      </div>
    </div>
  )
}
