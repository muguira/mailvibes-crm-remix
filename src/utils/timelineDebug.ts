// Timeline debug utilities - Available globally
export const timelineDebug = {
  // Clear all viewed activities
  clearViewed: () => {
    sessionStorage.removeItem('viewedTimelineActivities')
    console.log('🔄 Timeline viewed activities cleared')
    window.location.reload() // Reload to reset all percentages
  },

  // Show current viewed activities
  showViewed: () => {
    const viewed = JSON.parse(sessionStorage.getItem('viewedTimelineActivities') || '[]')
    console.log('👁️ Currently viewed activities:', viewed)
    return viewed
  },

  // Reset and test progressive filling
  testProgressive: () => {
    sessionStorage.removeItem('viewedTimelineActivities')
    console.log('🎬 Progressive filling test started!')
    console.log('📍 Make sure you are on a page with timeline (contact profile or stream view)')
    console.log('🐌 After reload, scroll VERY slowly to see gradual line filling')
    console.log('🎯 Watch console for intersection ratios and percentages')
    window.location.reload()
  },

  // Live monitoring of timeline visibility
  startLiveMonitoring: () => {
    console.log('📺 Starting live timeline monitoring...')
    console.log('🎯 This will log all visibility changes in real-time')

    // Store original console.log to avoid infinite loops
    const originalLog = console.log
    ;(window as any)._originalConsoleLog = originalLog

    // Enhanced logging is now handled by the hook itself
    originalLog('✅ Live monitoring active - scroll to see progress!')
  },

  stopLiveMonitoring: () => {
    if ((window as any)._originalConsoleLog) {
      console.log('⏹️ Live monitoring stopped')
    }
  },

  // Get visibility stats
  getStats: () => {
    const viewed = JSON.parse(sessionStorage.getItem('viewedTimelineActivities') || '[]')
    console.log('📊 Timeline Statistics:')
    console.log(`  - Total viewed activities: ${viewed.length}`)
    console.log(`  - Storage key: viewedTimelineActivities`)
    console.log(`  - Anti-retrocession: Locked at 95%+ visibility`)
    return {
      viewedCount: viewed.length,
      viewedIds: viewed,
    }
  },

  // Explain the anti-retrocession feature
  explainAntiRetro: () => {
    console.log('🔒 Anti-Retrocession Feature:')
    console.log('  • Lines fill progressively as cards enter viewport')
    console.log("  • Once a line reaches 95% green, it locks and won't go backward")
    console.log('  • This prevents visual regression when cards move out of viewport')
    console.log('  • Watch console logs for "locked=" values during scroll')
    console.log('  • Use timelineDebug.testProgressive() to reset and test')
  },
}

// Register functions globally as soon as this file is loaded
if (typeof window !== 'undefined') {
  // @ts-ignore - Adding to window for debugging purposes
  window.timelineDebug = timelineDebug

  console.log('🔧 Timeline debug functions loaded globally:')
  console.log('  timelineDebug.clearViewed()        - Clear all viewed states')
  console.log('  timelineDebug.showViewed()         - Show currently viewed activities')
  console.log('  timelineDebug.testProgressive()    - Reset and test progressive effect')
  console.log('  timelineDebug.startLiveMonitoring() - Enhanced real-time logging')
  console.log('  timelineDebug.getStats()           - Get visibility statistics')
  console.log('  timelineDebug.explainAntiRetro()   - Explain anti-retrocession feature')
}

export default timelineDebug
