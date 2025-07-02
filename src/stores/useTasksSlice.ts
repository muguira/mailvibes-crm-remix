import { StateCreator } from "zustand";
import {
  ITaskWithMetadata,
  TCreateTaskInput,
  TUpdateTaskInput,
  ITaskFilters,
  ITaskSortOptions,
  TTaskStore,
  ITaskErrorState,
  ITaskRetryConfig,
} from "@/types/store/task";
import { TStore } from "@/types/store/store";
import { Task } from "@/types/task";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { withRetrySupabase } from "@/utils/supabaseRetry";
import { logger } from "@/utils/logger";
import { isPast, parseISO, startOfDay } from "date-fns";
import { INITIAL_TASK_STATE, RESET_TASK_STATE } from "@/constants/store/task";

/**
 * Tasks slice for Zustand store
 *
 * Manages the complete task lifecycle including:
 * - CRUD operations with Supabase backend
 * - Automatic task categorization (upcoming, overdue, completed)
 * - Optimistic UI updates with local tasks
 * - Error handling and retry logic
 * - Task filtering and sorting
 * - Real-time deadline checking
 * - Task statistics and analytics
 *
 * @example
 * ```typescript
 * // Usage in component
 * const { tasks, createTask, fetchTasks } = useStore();
 *
 * // Create a new task
 * await createTask({
 *   title: "Follow up with client",
 *   type: "follow-up",
 *   user_id: "user123",
 *   deadline: "2024-01-15T10:00:00Z"
 * });
 * ```
 */
export const useTasksSlice: StateCreator<
  TStore,
  [["zustand/subscribeWithSelector", never], ["zustand/immer", never]],
  [],
  TTaskStore
> = (set, get) => ({
  // ...INITIAL_TASK_STATE with constants,
  ...INITIAL_TASK_STATE,

  /**
   * Initialize the tasks state by fetching tasks for a specific user
   * @param userId - The ID of the user to initialize tasks for
   * @returns Promise that resolves when initialization is complete
   */
  initialize: async (userId: string) => {
    set((state) => {
      state.loading.fetching = true;
      state.errors.fetch = null;
    });

    try {
      await get().fetchTasks(userId);
      set((state) => {
        state.isInitialized = true;
        state.lastSyncAt = new Date().toISOString();
      });
    } catch (error) {
      logger.error("Error initializing tasks:", error);
      set((state) => {
        state.errors.fetch =
          error instanceof Error ? error.message : "Failed to initialize tasks";
      });
    } finally {
      set((state) => {
        state.loading.fetching = false;
      });
    }
  },

  /**
   * Reset the tasks state to its initial values
   * Clears all tasks, local tasks, errors, and loading states
   */
  reset: () => {
    set((state) => {
      Object.assign(state, RESET_TASK_STATE);
    });
  },

  /**
   * Set the flag to indicate if a task is being created
   * @param isCreating - The flag to set
   */
  setIsTaskBeingCreated: (isCreating: boolean) => {
    set((state) => {
      state.isTaskBeingCreated = isCreating;
    });
  },

  /**
   * Fetch tasks from the database
   * @param userId - The ID of the user to fetch tasks for
   */
  fetchTasks: async (userId: string) => {
    set((state) => {
      state.loading.fetching = true;
      state.errors.fetch = null;
    });

    try {
      const result = await withRetrySupabase<any[]>(
        async () =>
          await supabase
            .from("tasks")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
        get().retryConfig
      );

      const { data, error } = result;

      if (error) throw error;

      const tasks = (data || []).map((task: any) => {
        if (task.display_status === "completed" || !task.deadline) return task;

        const deadlineDate = parseISO(task.deadline);
        if (
          isPast(startOfDay(deadlineDate)) &&
          task.display_status !== "overdue"
        ) {
          return { ...task, display_status: "overdue" };
        }
        return task;
      }) as ITaskWithMetadata[];

      set((state) => {
        state.tasks = tasks;
        state.lastSyncAt = new Date().toISOString();
      });

      get().categorizeTasks();
    } catch (error) {
      logger.error("Error fetching tasks:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch tasks";
      set((state) => {
        state.errors.fetch = errorMessage;
      });
      toast({
        title: "Error fetching tasks",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      set((state) => {
        state.loading.fetching = false;
      });
    }
  },

  /**
   * Create a new task
   * @param task - The task to create
   * @returns The created task
   */
  createTask: async (task: TCreateTaskInput): Promise<ITaskWithMetadata> => {
    set((state) => {
      state.loading.creating = true;
      state.errors.create = null;
    });

    try {
      const taskWithMetadata = {
        ...task,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contact: task.contact || null,
        deadline: task.deadline || null,
        description: task.description || null,
        tag: task.tag || null,
        priority: task.priority || null,
      };

      const { data, error } = await supabase
        .from("tasks")
        .insert([taskWithMetadata])
        .select("*");

      if (error) throw error;

      const newTask = data[0] as ITaskWithMetadata;

      set((state) => {
        state.tasks.unshift(newTask);
      });

      get().categorizeTasks();

      toast({
        title: "Task created",
        description: "Your task has been created successfully",
      });

      return newTask;
    } catch (error) {
      logger.error("Error creating task:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create task";
      set((state) => {
        state.errors.create = errorMessage;
      });
      toast({
        title: "Error creating task",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      set((state) => {
        state.loading.creating = false;
      });
    }
  },

  /**
   * Update a task
   * @param task - The task to update
   * @returns The updated task
   */
  updateTask: async (task: TUpdateTaskInput): Promise<ITaskWithMetadata> => {
    set((state) => {
      state.loading.updating = true;
      state.errors.update = null;
    });

    try {
      const taskWithMetadata = {
        ...task,
        updated_at: new Date().toISOString(),
        contact: task.contact || null,
        deadline: task.deadline || null,
        description: task.description || null,
        tag: task.tag || null,
        priority: task.priority || null,
      };

      const { data, error } = await supabase
        .from("tasks")
        .update(taskWithMetadata)
        .eq("id", task.id)
        .eq("user_id", task.user_id)
        .select("*");

      if (error) throw error;

      const updatedTask = data[0] as ITaskWithMetadata;

      set((state) => {
        const index = state.tasks.findIndex((t) => t.id === task.id);
        if (index !== -1) {
          state.tasks[index] = updatedTask;
        }
      });

      get().categorizeTasks();

      toast({
        title: "Task updated",
        description: "Your task has been updated successfully",
      });

      return updatedTask;
    } catch (error) {
      logger.error("Error updating task:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update task";
      set((state) => {
        state.errors.update = errorMessage;
      });
      toast({
        title: "Error updating task",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      set((state) => {
        state.loading.updating = false;
      });
    }
  },

  /**
   * Delete a task
   * @param taskId - The ID of the task to delete
   * @returns The deleted task
   */
  deleteTask: async (taskId: string): Promise<void> => {
    const state = get();
    const task = state.getTaskById(taskId);
    if (!task) return;

    set((state) => {
      state.loading.deleting = true;
      state.errors.delete = null;
    });

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .eq("user_id", task.user_id);

      if (error) throw error;

      set((state) => {
        state.tasks = state.tasks.filter((t) => t.id !== taskId);
      });

      get().categorizeTasks();

      toast({
        title: "Task deleted",
        description: "Your task has been deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting task:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete task";
      set((state) => {
        state.errors.delete = errorMessage;
      });
      toast({
        title: "Error deleting task",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      set((state) => {
        state.loading.deleting = false;
      });
    }
  },

  /**
   * Change the status of a specific task
   * @param taskId - The ID of the task to update
   * @param status - The new status to set for the task
   * @returns Promise that resolves when the task status is updated
   */
  changeTaskStatus: async (taskId: string, status: Task["display_status"]) => {
    const state = get();
    const task = state.getTaskById(taskId);
    if (!task) return;

    await state.updateTask({ ...task, display_status: status });
  },

  /**
   * Change the deadline of a specific task
   * Automatically updates the task status based on the new deadline
   * @param taskId - The ID of the task to update
   * @param deadline - The new deadline (ISO string) or undefined to remove deadline
   * @returns Promise that resolves when the task deadline is updated
   */
  changeTaskDeadline: async (taskId: string, deadline: string | undefined) => {
    const state = get();
    const task = state.getTaskById(taskId);
    if (!task) return;

    let newStatus = task.display_status;
    if (deadline) {
      const deadlineDate = parseISO(deadline);
      if (isPast(startOfDay(deadlineDate))) {
        newStatus = "overdue";
      } else if (task.display_status === "overdue") {
        newStatus = "upcoming";
      }
    }

    await state.updateTask({
      ...task,
      deadline: deadline || "",
      display_status: newStatus,
    });
  },

  /**
   * Mark a specific task as overdue
   * Updates the task status directly without database call
   * @param taskId - The ID of the task to mark as overdue
   */
  markTaskOverdue: (taskId: string) => {
    set((state) => {
      const task = state.tasks.find((t) => t.id === taskId);
      if (task) {
        task.display_status = "overdue";
      }
    });
    get().categorizeTasks();
  },

  /**
   * Add a task to the local tasks array for optimistic UI updates
   * Used during task creation before database confirmation
   * @param task - The task to add to local state
   */
  addLocalTask: (task: ITaskWithMetadata) => {
    set((state) => {
      state.localTasks.unshift(task);
    });
  },

  /**
   * Remove a task from the local tasks array
   * Used to clean up optimistic updates after database operations
   * @param taskId - The ID of the task to remove from local state
   */
  removeLocalTask: (taskId: string) => {
    set((state) => {
      state.localTasks = state.localTasks.filter((t) => t.id !== taskId);
    });
  },

  /**
   * Update a task in the local tasks array
   * Used for optimistic updates before database confirmation
   * @param taskId - The ID of the task to update
   * @param updates - Partial task data to merge with existing task
   */
  updateLocalTask: (taskId: string, updates: Partial<ITaskWithMetadata>) => {
    set((state) => {
      const index = state.localTasks.findIndex((t) => t.id === taskId);
      if (index !== -1) {
        Object.assign(state.localTasks[index], updates);
      }
    });
  },

  /**
   * Clear all local tasks from the state
   * Used to clean up optimistic updates after successful operations
   */
  clearLocalTasks: () => {
    set((state) => {
      state.localTasks = [];
    });
  },

  /**
   * Categorize all tasks (local + database) by their display status
   * Updates the categorizedTasks object with upcoming, overdue, and completed tasks
   */
  categorizeTasks: () => {
    const state = get();
    const allTasks = [...state.localTasks, ...state.tasks];

    set((state) => {
      state.categorizedTasks = {
        upcoming: allTasks.filter((task) => task.display_status === "upcoming"),
        overdue: allTasks.filter((task) => task.display_status === "overdue"),
        completed: allTasks.filter(
          (task) => task.display_status === "completed"
        ),
      };
    });
  },

  /**
   * Check all tasks and automatically mark overdue tasks based on their deadlines
   * Compares task deadlines with current date and updates status if needed
   */
  checkOverdueTasks: () => {
    const state = get();
    let hasChanges = false;

    state.tasks.forEach((task) => {
      if (task.display_status === "completed" || !task.deadline) return;

      const deadlineDate = parseISO(task.deadline);
      if (
        isPast(startOfDay(deadlineDate)) &&
        task.display_status !== "overdue"
      ) {
        set((state) => {
          const taskIndex = state.tasks.findIndex((t) => t.id === task.id);
          if (taskIndex !== -1) {
            state.tasks[taskIndex].display_status = "overdue";
          }
        });
        hasChanges = true;
      }
    });

    if (hasChanges) {
      get().categorizeTasks();
    }
  },

  /**
   * Set filters for task queries
   * Merges new filters with existing ones
   * @param filters - Partial filters object to apply
   */
  setFilters: (filters: Partial<ITaskFilters>) => {
    set((state) => {
      Object.assign(state.filters, filters);
    });
  },

  /**
   * Set sorting options for task queries
   * @param options - Sort options specifying field and direction
   */
  setSortOptions: (options: ITaskSortOptions) => {
    set((state) => {
      state.sortOptions = options;
    });
  },

  /**
   * Get tasks filtered by current filter criteria
   * Applies all active filters (status, type, priority, deadline, contact)
   * @returns Array of tasks that match the current filters
   */
  getFilteredTasks: () => {
    const state = get();
    const { tasks, filters } = state;

    return tasks.filter((task) => {
      if (filters.status && !filters.status.includes(task.display_status))
        return false;
      if (filters.type && !filters.type.includes(task.type)) return false;
      if (
        filters.priority &&
        task.priority &&
        !filters.priority.includes(task.priority)
      )
        return false;
      if (
        filters.hasDeadline !== undefined &&
        !!task.deadline !== filters.hasDeadline
      )
        return false;
      if (filters.contactId && task.contact !== filters.contactId) return false;
      return true;
    });
  },

  /**
   * Get a specific task by its ID
   * Searches both local tasks and database tasks
   * @param taskId - The ID of the task to find
   * @returns The task if found, undefined otherwise
   */
  getTaskById: (taskId: string) => {
    const state = get();
    return [...state.localTasks, ...state.tasks].find(
      (task) => task.id === taskId
    );
  },

  /**
   * Get all tasks associated with a specific contact
   * @param contactId - The ID of the contact to find tasks for
   * @returns Array of tasks associated with the contact
   */
  getTasksByContact: (contactId: string) => {
    const state = get();
    return [...state.localTasks, ...state.tasks].filter(
      (task) => task.contact === contactId
    );
  },

  /**
   * Get all tasks of a specific type
   * @param type - The type of tasks to find (task, follow-up, respond, cross-functional)
   * @returns Array of tasks of the specified type
   */
  getTasksByType: (type: Task["type"]) => {
    const state = get();
    return [...state.localTasks, ...state.tasks].filter(
      (task) => task.type === type
    );
  },

  /**
   * Get all upcoming tasks from categorized tasks
   * @returns Array of tasks with 'upcoming' status
   */
  getUpcomingTasks: () => {
    const state = get();
    return state.categorizedTasks.upcoming;
  },

  /**
   * Get all overdue tasks from categorized tasks
   * @returns Array of tasks with 'overdue' status
   */
  getOverdueTasks: () => {
    const state = get();
    return state.categorizedTasks.overdue;
  },

  /**
   * Get all completed tasks from categorized tasks
   * @returns Array of tasks with 'completed' status
   */
  getCompletedTasks: () => {
    const state = get();
    return state.categorizedTasks.completed;
  },

  /**
   * Get comprehensive statistics about all tasks
   * Calculates totals, status counts, type distribution, and priority distribution
   * @returns Object containing task statistics and breakdowns
   */
  getTaskStats: () => {
    const state = get();
    const allTasks = [...state.localTasks, ...state.tasks];

    const stats = {
      total: allTasks.length,
      upcoming: allTasks.filter((t) => t.display_status === "upcoming").length,
      overdue: allTasks.filter((t) => t.display_status === "overdue").length,
      completed: allTasks.filter((t) => t.display_status === "completed")
        .length,
      byType: {} as Record<Task["type"], number>,
      byPriority: {} as Record<Task["priority"], number>,
    };

    const types: Task["type"][] = [
      "task",
      "follow-up",
      "respond",
      "cross-functional",
    ];
    types.forEach((type) => {
      stats.byType[type] = allTasks.filter((t) => t.type === type).length;
    });

    const priorities: Task["priority"][] = ["low", "medium", "high"];
    priorities.forEach((priority) => {
      stats.byPriority[priority] = allTasks.filter(
        (t) => t.priority === priority
      ).length;
    });

    return stats;
  },

  /**
   * Clear a specific error from the error state
   * @param operation - The operation error to clear (fetch, create, update, delete)
   */
  clearError: (operation: keyof ITaskErrorState) => {
    set((state) => {
      state.errors[operation] = null;
    });
  },

  /**
   * Clear all errors from the error state
   * Resets all operation errors to null
   */
  clearAllErrors: () => {
    set((state) => {
      state.errors = { fetch: null, create: null, update: null, delete: null };
    });
  },

  /**
   * Update the retry configuration for failed operations
   * @param config - Partial retry configuration to merge with existing config
   */
  setRetryConfig: (config: Partial<ITaskRetryConfig>) => {
    set((state) => {
      Object.assign(state.retryConfig, config);
    });
  },
});
