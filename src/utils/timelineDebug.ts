// Timeline Debug Utilities
// Use these functions in browser console for testing

export const timelineDebug = {
  // Clear all viewed activities to reset the timeline
  clearViewed: () => {
    sessionStorage.removeItem('viewedTimelineActivities')
    console.log('🔄 All timeline activities reset to gray')
    console.log('↻ Refresh the page to see the effect')
  },

  // Show current viewed activities
  showViewed: () => {
    const viewed = JSON.parse(sessionStorage.getItem('viewedTimelineActivities') || '[]')
    console.log('👁️ Currently viewed activities:', viewed)
    return viewed
  },

  // Force mark an activity as viewed
  markViewed: (activityId: string) => {
    const currentViewed = JSON.parse(sessionStorage.getItem('viewedTimelineActivities') || '[]')
    if (!currentViewed.includes(activityId)) {
      const updatedViewed = [...currentViewed, activityId]
      sessionStorage.setItem('viewedTimelineActivities', JSON.stringify(updatedViewed))
      console.log(`✅ Activity ${activityId} marked as viewed`)
      console.log('↻ Refresh the page to see the effect')
    } else {
      console.log(`⚠️ Activity ${activityId} already viewed`)
    }
  },
}

// Make it available globally for easy console access
if (typeof window !== 'undefined') {
  ;(window as any).timelineDebug = timelineDebug
}
