import { useEffect, useRef, useState } from 'react'

interface UseTimelineViewportOptions {
  threshold?: number
  rootMargin?: string
}

// Utility function to clear viewed activities (for testing)
export const clearViewedActivities = () => {
  sessionStorage.removeItem('viewedTimelineActivities')
  console.log('🔄 Timeline viewed activities cleared')
}

export const useTimelineViewport = (activityId: string, options: UseTimelineViewportOptions = {}) => {
  const { threshold = 0.3, rootMargin = '-40% 0px -40% 0px' } = options

  const [isViewed, setIsViewed] = useState(false)
  const elementRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    // Check if this activity was already viewed in sessionStorage
    const viewedActivities = JSON.parse(sessionStorage.getItem('viewedTimelineActivities') || '[]')

    if (viewedActivities.includes(activityId)) {
      setIsViewed(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        console.log(`🎯 Activity ${activityId}: intersecting=${entry.isIntersecting}, isViewed=${isViewed}`)

        if (entry.isIntersecting && !isViewed) {
          console.log(`✅ Activity ${activityId}: marked as viewed`)
          setIsViewed(true)

          // Save to sessionStorage
          const currentViewed = JSON.parse(sessionStorage.getItem('viewedTimelineActivities') || '[]')
          const updatedViewed = [...currentViewed, activityId]
          sessionStorage.setItem('viewedTimelineActivities', JSON.stringify(updatedViewed))
        }
      },
      {
        threshold,
        rootMargin,
      },
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current)
      }
    }
  }, [activityId, threshold, rootMargin, isViewed])

  return { elementRef, isViewed }
}
