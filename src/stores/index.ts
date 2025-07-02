import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import { TStore } from "@/types/store/store";
import { useTasksSlice } from "./useTasksSlice";

/**
 * Main store for the application
 *
 * Combines all slices and provides a single point of access to the application state
 *
 * @example
 * ```typescript
 * // Usage in component
 * const { tasks, createTask, fetchTasks } = useStore();
 * ```
 */
export const useStore = create<TStore>()(
  subscribeWithSelector(
    immer((...a) => ({
      ...useTasksSlice(...a),
    }))
  )
);
