import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { persist, createJSONStorage } from 'zustand/middleware'
import { TStore } from '@/types/store/store'
import { useTasksSlice } from './useTasksSlice'
import { useAuthSlice } from './useAuthSlice'
import { useGmailAuthSlice } from './gmailAuthSlice'
import { useContactProfileSlice } from './useContactProfileSlice'
import { useEditableLeadsGridSlice } from './useEditableLeadsGridSlice'
import { useContactsSlice } from './useContactsSlice'

/**
 * Main store for the application
 *
 * Combines all slices and provides a single point of access to the application state
 *
 * @example
 * ```typescript
 * // Usage in component
 * const { tasks, createTask, fetchTasks, user, signIn, signOut } = useStore();
 * ```
 */
export const useStore = create<TStore>()(
  persist(
    subscribeWithSelector(
      immer((...a) => ({
        ...useTasksSlice(...a),
        ...useAuthSlice(...a),
        ...useGmailAuthSlice(...a),
        ...useContactsSlice(...a),
        ...useContactProfileSlice(...a),
        ...useEditableLeadsGridSlice(...a),
      })),
    ),
    {
      name: 'mailvibes-crm-store',
      storage: createJSONStorage(() => localStorage),
      partialize: state => {
        const persistedState = {
          // Persist EditableLeadsGrid state
          columns: state.columns,
          activeFilters: state.activeFilters,
          deletedColumnIds: state.deletedColumnIds,
          searchTerm: state.searchTerm,
          hiddenColumns: state.hiddenColumns,

          // Persist other critical user preferences (add as needed)
          // Note: We don't persist loading states, errors, or temporary data
        }

        // Debug log to see what's being persisted
        console.log('🔄 Zustand persist - saving to localStorage:', {
          columnsCount: persistedState.columns.length,
          columnIds: persistedState.columns.map(c => c.id),
          activeFilters: persistedState.activeFilters,
        })

        return persistedState
      },
      version: 1, // For future migrations if needed
      onRehydrateStorage: () => {
        console.log('🔄 Zustand persist - starting rehydration from localStorage')

        // Check what's actually in localStorage
        const stored = localStorage.getItem('mailvibes-crm-store')
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
            console.log('✅ Zustand persist - rehydration completed:', {
              columnsCount: state?.columns?.length || 0,
              columnIds: state?.columns?.map(c => c.id) || [],
              fullState: !!state,
            })
          }
        }
      },
    },
  ),
)
