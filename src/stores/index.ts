import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { TStore } from '@/types/store/store'
import { useTasksSlice } from './useTasksSlice'
import { useAuthSlice } from './useAuthSlice'
import { useGmailAuthSlice } from './gmailAuthSlice'
import { useContactProfileSlice } from './useContactProfileSlice'
import { useEditableLeadsGridSlice } from './useEditableLeadsGridSlice'

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
  subscribeWithSelector(
    immer((...a) => ({
      ...useTasksSlice(...a),
      ...useAuthSlice(...a),
      ...useGmailAuthSlice(...a),
      ...useContactProfileSlice(...a),
      ...useEditableLeadsGridSlice(...a),
    })),
  ),
)
