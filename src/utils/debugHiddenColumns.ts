/**
 * Debug utility for hidden columns - Available in browser console
 * Call `window.debugHiddenColumns()` in production to get detailed info
 */

// Make this available globally
declare global {
  interface Window {
    debugHiddenColumns: () => void
    fixHiddenColumnsState: () => void
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

      // Check for state inconsistencies
      if (parsedStore?.state?.columns && parsedStore?.state?.hiddenColumns) {
        const visibleColumns = parsedStore.state.columns.map(c => c.id)
        const hiddenColumns = parsedStore.state.hiddenColumns.map(c => c.id)
        const intersection = visibleColumns.filter(id => hiddenColumns.includes(id))

        if (intersection.length > 0) {
          console.error('🚨 STATE INCONSISTENCY DETECTED:', {
            message: 'Columns exist in BOTH visible and hidden arrays',
            inconsistentColumns: intersection,
            visibleColumnsCount: visibleColumns.length,
            hiddenColumnsCount: hiddenColumns.length,
            allVisibleColumns: visibleColumns,
            allHiddenColumns: hiddenColumns,
          })
        } else {
          console.log('✅ State consistency check passed')
        }
      }
    } catch (error) {
      console.error('❌ Error in debug function:', error)
    }

    console.groupEnd()
  }

  // Hidden columns debug function loaded (logging disabled to reduce console spam)

  // Add a repair function
  window.fixHiddenColumnsState = () => {
    console.group('🔧 FIXING HIDDEN COLUMNS STATE')

    try {
      const zustandStore = localStorage.getItem('mailvibes-crm-store')
      if (!zustandStore) {
        console.log('❌ No Zustand store found')
        return
      }

      const parsedStore = JSON.parse(zustandStore)
      if (!parsedStore.state) {
        console.log('❌ No state found in store')
        return
      }

      const { columns, hiddenColumns } = parsedStore.state
      if (!columns || !hiddenColumns) {
        console.log('❌ Columns or hiddenColumns not found')
        return
      }

      const visibleColumnIds = columns.map(c => c.id)
      const hiddenColumnIds = hiddenColumns.map(c => c.id)
      const intersection = visibleColumnIds.filter(id => hiddenColumnIds.includes(id))

      if (intersection.length === 0) {
        console.log('✅ No inconsistencies found')
        return
      }

      console.log('🔧 Fixing inconsistencies for columns:', intersection)

      // Remove inconsistent columns from visible columns
      const cleanedColumns = columns.filter(col => !hiddenColumnIds.includes(col.id))

      parsedStore.state.columns = cleanedColumns

      // Save back to localStorage
      localStorage.setItem('mailvibes-crm-store', JSON.stringify(parsedStore))

      console.log('✅ Fixed state:', {
        removedFromVisible: intersection,
        newVisibleCount: cleanedColumns.length,
        hiddenCount: hiddenColumns.length,
      })

      console.log('🔄 Please refresh the page to see changes')
    } catch (error) {
      console.error('❌ Error fixing state:', error)
    }

    console.groupEnd()
  }

  // Debug functions available (logging disabled to reduce console spam)
  // Available: window.debugHiddenColumns(), window.fixHiddenColumnsState()
}
