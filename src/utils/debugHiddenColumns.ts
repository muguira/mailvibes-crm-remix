/**
 * Debug utility for hidden columns - Available in browser console
 * Call `window.debugHiddenColumns()` in production to get detailed info
 */

// Make this available globally
declare global {
  interface Window {
    debugHiddenColumns: () => void
    __zustand_store?: any
    editableLeadsGridHideColumn?: any
  }
}

export function initializeHiddenColumnsDebug() {
  window.debugHiddenColumns = () => {
    console.group('🔍 HIDDEN COLUMNS DEBUG')

    try {
      // Get localStorage data
      const zustandStore = localStorage.getItem('mailvibes-crm-store')
      let parsedStore = null

      if (zustandStore) {
        parsedStore = JSON.parse(zustandStore)
        console.log('📦 Zustand Store (localStorage):', parsedStore)

        if (parsedStore.state) {
          console.log('📊 Store State:', {
            columns: parsedStore.state.columns?.length || 0,
            hiddenColumns: parsedStore.state.hiddenColumns?.length || 0,
            columnsIds: parsedStore.state.columns?.map(c => c.id) || [],
            hiddenColumnIds: parsedStore.state.hiddenColumns?.map(c => c.id) || [],
          })

          // Check for duplicates
          if (parsedStore.state.hiddenColumns) {
            const ids = parsedStore.state.hiddenColumns.map(c => c.id)
            const uniqueIds = [...new Set(ids)]
            if (ids.length !== uniqueIds.length) {
              console.warn('⚠️ DUPLICATE HIDDEN COLUMNS DETECTED:', {
                total: ids.length,
                unique: uniqueIds.length,
                duplicates: ids.length - uniqueIds.length,
                duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
              })
            } else {
              console.log('✅ No duplicate hidden columns found')
            }
          }
        }
      } else {
        console.log('❌ No Zustand store found in localStorage')
      }

      // Environment info
      console.log('🌍 Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        userAgent: navigator.userAgent,
        location: window.location.href,
        timestamp: new Date().toISOString(),
      })

      // Function availability check
      console.log('🔧 Function Availability:', {
        hasZustandStore: !!window.__zustand_store,
        hasEditableLeadsGridHideColumn: typeof window.editableLeadsGridHideColumn === 'function',
        hasConsoleLog: typeof console.log === 'function',
        hasLocalStorage: typeof localStorage !== 'undefined',
      })
    } catch (error) {
      console.error('❌ Error in debug function:', error)
    }

    console.groupEnd()
  }

  console.log('🔧 Hidden columns debug function available: window.debugHiddenColumns()')
}
