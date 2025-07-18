import { useEffect, useRef, useState } from 'react'

interface UseTimelineViewportOptions {
  threshold?: number
  rootMargin?: string
}

// Legacy function for backward compatibility (import from utils/timelineDebug for new code)
export const clearViewedActivities = () => {
  sessionStorage.removeItem('viewedTimelineActivities')
  console.log('🔄 Timeline viewed activities cleared')
  window.location.reload()
}

export const useTimelineViewport = (activityId: string, options: UseTimelineViewportOptions = {}) => {
  const { threshold = 0.1, rootMargin = '-10% 0px -10% 0px' } = options

  const [isViewed, setIsViewed] = useState(false)
  const [visibilityPercentage, setVisibilityPercentage] = useState(0)
  const [maxVisibilityReached, setMaxVisibilityReached] = useState(0) // Track peak visibility
  const elementRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    // Always start fresh for progressive effect - check sessionStorage only for "viewed" status
    const viewedActivities = JSON.parse(sessionStorage.getItem('viewedTimelineActivities') || '[]')
    const wasAlreadyViewed = viewedActivities.includes(activityId)

    if (wasAlreadyViewed) {
      setIsViewed(true)
      // Don't set 100% immediately - let the observer handle the progression
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const intersectionRatio = entry.intersectionRatio
        // Use a more granular percentage calculation
        const currentPercentage = Math.max(0, Math.min(100, Math.round(intersectionRatio * 100)))

        // Update max visibility reached (never goes backward)
        setMaxVisibilityReached(prev => Math.max(prev, currentPercentage))

        // Once we reach 95% visibility, lock it in to prevent retrocession
        setVisibilityPercentage(prev => {
          const newMax = Math.max(prev, currentPercentage)
          return newMax >= 95 ? Math.max(newMax, prev) : currentPercentage
        })

        console.log(
          `🎯 Activity ${activityId}: intersecting=${entry.isIntersecting}, ratio=${intersectionRatio.toFixed(3)}, current=${currentPercentage}%, locked=${visibilityPercentage}%, wasViewed=${wasAlreadyViewed}`,
        )

        // Mark as viewed when it reaches 80% visibility (only if not already viewed)
        if (intersectionRatio >= 0.8 && !isViewed && !wasAlreadyViewed) {
          console.log(`✅ Activity ${activityId}: marked as viewed at ${currentPercentage}% visibility`)
          setIsViewed(true)

          // Save to sessionStorage
          const currentViewed = JSON.parse(sessionStorage.getItem('viewedTimelineActivities') || '[]')
          const updatedViewed = [...currentViewed, activityId]
          sessionStorage.setItem('viewedTimelineActivities', JSON.stringify(updatedViewed))
        }
      },
      {
        // More granular thresholds for smoother progression
        threshold: [
          0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95,
          1.0,
        ],
        rootMargin, // This creates a smaller viewport area for triggering
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

  return { elementRef, isViewed, visibilityPercentage, maxVisibilityReached }
}
