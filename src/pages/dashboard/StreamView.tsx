import { useAuth } from '@/components/auth'
import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary'
import { TopNavbar } from '@/components/layout/top-navbar'
import { mockContactsById } from '@/components/stream/sample-data'
import StreamViewLayout from '@/components/stream/StreamViewLayout'
import { useIsMobile } from '@/hooks/use-mobile'
import { supabase } from '@/integrations/supabase/client'
import { useGmailStore } from '@/stores/gmail/gmailStore'
import { logger } from '@/utils/logger'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

export default function StreamView() {
  const isMobile = useIsMobile()
  const { id } = useParams()
  const { user } = useAuth()
  const [contact, setContact] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const gmailStore = useGmailStore()
  const gmailInitialized = useRef(false)
  const lastUserId = useRef<string | null>(null)

  // CRITICAL FIX: Prevent multiple simultaneous contact fetches
  const contactLoadingRef = useRef<Record<string, Promise<any>>>({})
  const contactCacheRef = useRef<Record<string, any>>({})

  // Initialize Gmail service once when user is available - FIXED to prevent infinite loops
  useEffect(() => {
    let isMounted = true

    const initializeGmailService = async () => {
      // Only initialize once per user session, reset if user changes
      if (lastUserId.current !== user?.id) {
        gmailInitialized.current = false
        lastUserId.current = user?.id || null
      }

      if (user?.id && !gmailInitialized.current && isMounted) {
        gmailInitialized.current = true
        logger.info(`[StreamView] Initializing Gmail service for user: ${user.id}`)
        try {
          await gmailStore.initializeService(user.id, {
            enableLogging: false, // Keep logging minimal for production
          })
          // Only load accounts if component is still mounted
          if (isMounted) {
            await gmailStore.loadAccounts()
          }
        } catch (error) {
          gmailInitialized.current = false // Reset on error to allow retry
          if (isMounted) {
            logger.error('[StreamView] Error initializing Gmail service:', error)
          }
        }
      }
    }

    initializeGmailService()

    // Cleanup function to prevent setState on unmounted component
    return () => {
      isMounted = false
    }
  }, [user?.id]) // Only depend on user.id - useRef prevents multiple initializations

  // Load contact data with deduplication
  useEffect(() => {
    const loadContact = async () => {
      if (!id || !user?.id) {
        setLoading(false)
        return
      }

      const cacheKey = `${id}-${user.id}`

      // Check cache first
      if (contactCacheRef.current[cacheKey]) {
        setContact(contactCacheRef.current[cacheKey])
        setLoading(false)
        return
      }

      // Check if already loading this contact
      if (contactLoadingRef.current[cacheKey]) {
        try {
          const cachedContact = await contactLoadingRef.current[cacheKey]
          setContact(cachedContact)
          setLoading(false)
          return
        } catch (error) {
          // If cached promise failed, continue with new request
        }
      }

      // Check mockContactsById
      if (mockContactsById[id]) {
        const contact = mockContactsById[id]
        contactCacheRef.current[cacheKey] = contact
        setContact(contact)
        setLoading(false)
        return
      }

      // Create new request promise and cache it
      const fetchPromise = (async () => {
        const { data, error } = await supabase.from('contacts').select('*').eq('id', id).eq('user_id', user.id).single()

        if (error) {
          logger.error('Error fetching contact:', error)
          throw error
        }

        if (data) {
          // Transform the data to match the expected format
          const contactData = data.data && typeof data.data === 'object' ? (data.data as Record<string, any>) : {}
          const transformedContact = {
            id: data.id,
            name: data.name,
            email: data.email || '',
            phone: data.phone || '',
            company: data.company || '',
            status: data.status || '',
            ...contactData,
          }

          // Cache the result
          contactCacheRef.current[cacheKey] = transformedContact
          mockContactsById[id] = transformedContact
          return transformedContact
        }

        throw new Error('No contact data received')
      })()

      // Store the promise to prevent duplicate requests
      contactLoadingRef.current[cacheKey] = fetchPromise

      try {
        const loadedContact = await fetchPromise
        setContact(loadedContact)
      } catch (error) {
        logger.error('Error fetching contact:', error)
        setContact(null)
      } finally {
        // Clean up loading state
        delete contactLoadingRef.current[cacheKey]
        setLoading(false)
      }
    }

    loadContact()
  }, [id, user?.id]) // Use user.id instead of user object to prevent unnecessary re-runs

  // Memoize contact object to prevent unnecessary re-renders of child components
  const memoizedContact = useMemo(() => {
    if (!contact) {
      return {
        id: id || 'not-found',
        name: 'Contact Not Found',
      }
    }
    return contact
  }, [contact, id])

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-light/20">
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopNavbar />
          <div className="overflow-auto flex-1">
            <div className={`px-6 pt-12 ${isMobile ? 'pb-6' : 'pb-6'}`}>
              {/* ✅ MINIMAL: Subtle loading state */}
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span>Loading contact...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary sectionName="Stream View">
      <div className="flex h-screen bg-slate-light/20">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* TopNav is fixed at the top */}
          <TopNavbar />

          {/* Main content area with scrolling */}
          <div className="overflow-hidden flex-1">
            {/* Content with proper padding to account for fixed navbar */}
            <div className={`px-6 pt-12 ${isMobile ? 'pb-6' : 'pb-6'}`}>
              <ErrorBoundary sectionName="Stream Content">
                <StreamViewLayout contact={memoizedContact} />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
