import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { persist, createJSONStorage } from 'zustand/middleware'
import { TStore } from '@/types/store/store'
import { useTasksSlice } from './useTasksSlice'
import { useAuthSlice } from './useAuthSlice'
import { useContactProfileSlice } from './useContactProfileSlice'
import { useEditableLeadsGridSlice } from './useEditableLeadsGridSlice'
import { useContactsSlice } from './useContactsSlice'

/**
 * Main store for the application
 *
 * Combines all slices and provides a single point of access to the application state
 *
 * NOTE: Gmail state is now managed separately via src/stores/gmail/gmailStore.ts
 * Use src/hooks/gmail/ for Gmail functionality instead of this store.
 *
 * @example
 * ```typescript
 * // Usage in component
 * const { tasks, createTask, fetchTasks, user, signIn, signOut } = useStore();
 *
 * // For Gmail functionality, use the new hooks:
 * import { useGmail } from '@/hooks/gmail';
 * const gmail = useGmail();
 * ```
 */
export const useStore = create<TStore>()(
  persist(
    subscribeWithSelector(
      immer((...a) => ({
        ...useTasksSlice(...a),
        ...useAuthSlice(...a),
        ...useContactProfileSlice(...a),
        ...useEditableLeadsGridSlice(...a),
        ...useContactsSlice(...a),
      })),
    ),
    {
      name: 'salessheet-crm-store',
      storage: createJSONStorage(() => localStorage),
      partialize: state => {
        const persistedState = {
          // Persist EditableLeadsGrid state
          columns: state.columns,
          activeFilters: state.activeFilters,
          deletedColumnIds: Array.from(state.deletedColumnIds || new Set()), // Convert Set to Array for JSON serialization
          searchTerm: state.searchTerm,
          hiddenColumns: state.hiddenColumns,

          // Persist other critical user preferences (add as needed)
          // Note: We don't persist loading states, errors, or temporary data
        }

        // Debug log to see what's being persisted
        console.log('🔄 Zustand persist - saving to localStorage:', {
          columnsCount: persistedState.columns.length,
          columnIds: persistedState.columns.map(c => c.id),
          hiddenColumnsCount: persistedState.hiddenColumns.length,
          hiddenColumnIds: persistedState.hiddenColumns.map(c => c.id),
          activeFilters: persistedState.activeFilters,
          deletedColumnIds: persistedState.deletedColumnIds,
        })

        return persistedState
      },
      version: 1, // For future migrations if needed
      onRehydrateStorage: () => {
        console.log('🔄 Zustand persist - starting rehydration from localStorage')

        // Check what's actually in localStorage
        const stored = localStorage.getItem('salessheet-crm-store')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            console.log('📦 Raw localStorage data:', {
              hasState: !!parsed.state,
              hasColumns: !!parsed.state?.columns,
              columnsCount: parsed.state?.columns?.length || 0,
            })
          } catch (e) {
            console.error('❌ Failed to parse localStorage data:', e)
          }
        } else {
          console.log('📦 No localStorage data found')
        }

        return (state, error) => {
          if (error) {
            console.error('🚨 Zustand persist - rehydration failed:', error)
          } else {
            // Convert deletedColumnIds array back to Set after rehydration
            if (state && state.deletedColumnIds) {
              if (Array.isArray(state.deletedColumnIds)) {
                state.deletedColumnIds = new Set(state.deletedColumnIds)
              } else if (!(state.deletedColumnIds instanceof Set)) {
                // Handle any other cases where it might not be a Set
                state.deletedColumnIds = new Set()
              }
            } else if (state) {
              state.deletedColumnIds = new Set()
            }

            // Clean up duplicate hidden columns (production bug fix)
            if (state && state.hiddenColumns && Array.isArray(state.hiddenColumns)) {
              const originalCount = state.hiddenColumns.length
              const uniqueHiddenColumns = state.hiddenColumns.filter(
                (column, index, arr) => arr.findIndex(c => c.id === column.id) === index,
              )

              if (uniqueHiddenColumns.length !== originalCount) {
                const duplicateCount = originalCount - uniqueHiddenColumns.length
                const duplicateIds = state.hiddenColumns.map(c => c.id)
                console.log(`🧹 Cleaned up ${duplicateCount} duplicate hidden columns:`, {
                  before: duplicateIds,
                  after: uniqueHiddenColumns.map(c => c.id),
                  duplicatesRemoved: duplicateCount,
                })
                state.hiddenColumns = uniqueHiddenColumns
              }
            }

            console.log('✅ Zustand persist - rehydration completed:', {
              columnsCount: state?.columns?.length || 0,
              columnIds: state?.columns?.map(c => c.id) || [],
              hiddenColumnsCount: state?.hiddenColumns?.length || 0,
              hiddenColumnIds: state?.hiddenColumns?.map(c => c.id) || [],
              deletedColumnIds: state?.deletedColumnIds ? Array.from(state.deletedColumnIds) : [],
              fullState: !!state,
            })
          }
        }
      },
    },
  ),
)
