import React, { useState, useMemo, useRef } from "react";
import { Check, Plus, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth";
import { Task } from "@/types/task";
import { TaskEditPopup } from "@/components/home/task-edit-popup";
import { DeadlinePopup } from "@/components/home/deadline-popup";
import { format, isToday, isTomorrow, parseISO, isPast, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/stores";

/**
 * Props for the ContactTasksPanel component
 * @interface ContactTasksPanelProps
 */
interface ContactTasksPanelProps {
  /** The unique identifier of the contact */
  contactId: string;
  /** Optional display name of the contact */
  contactName?: string;
}

/**
 * ContactTasksPanel Component
 * 
 * A specialized task management panel for displaying and managing tasks associated with a specific contact.
 * This component is used within the Stream View to show contact-specific tasks in a compact, organized format.
 * 
 * Features:
 * - Filters tasks by contact ID
 * - Displays tasks in three categories: Upcoming, Overdue, and Done
 * - Allows creating new tasks directly associated with the contact
 * - Supports inline editing of task titles and deadlines
 * - Provides task status management (complete/incomplete)
 * - Integrates with Supabase for data persistence
 * - Uses Zustand store for state management
 * 
 * @component
 * @param {ContactTasksPanelProps} props - The component props
 * @param {string} props.contactId - The unique identifier of the contact
 * @param {string} [props.contactName] - Optional display name of the contact
 * @returns {JSX.Element} The rendered contact tasks panel
 * 
 * @example
 * ```tsx
 * <ContactTasksPanel 
 *   contactId="contact-123" 
 *   contactName="John Doe" 
 * />
 * ```
 */
export function ContactTasksPanel({ contactId, contactName }: ContactTasksPanelProps) {
  const { user } = useAuth();
  const store = useStore();
  const { tasks: allTasks, loading: { fetching: isLoading }, createTask, updateTask, deleteTask } = store;
  
  /** State for tracking the currently editing task */
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  /** State for managing the draft task during creation */
  const [draftTask, setDraftTask] = useState<{
    id: string;
    title: string;
    deadline?: string;
  } | null>(null);
  
  /** State to indicate if a task is currently being created */
  const [isTaskBeingCreated, setIsTaskBeingCreated] = useState(false);
  
  /** State to track which task is being edited inline */
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  /** Reference to the new task input element for focus management */
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  
  /** Reference to the inline editing input element for focus management */
  const editingInputRef = useRef<HTMLInputElement>(null);
  
  /** Reference to store the single click timeout */
  const singleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Filters all tasks to show only those associated with the current contact
   * @returns {Task[]} Array of tasks filtered by contact ID
   */
  const contactTasks = useMemo(() => {
    return allTasks.filter(task => task.contact === contactId);
  }, [allTasks, contactId]);

  /**
   * Computes upcoming tasks including any draft task being created
   * @returns {Task[]} Array of upcoming tasks with draft task if applicable
   */
  const upcomingTasks = useMemo(() => {
    // Si hay una tarea en borrador y no está en las tareas de contacto
    const draftTaskExists = draftTask && !contactTasks.some(t => t.id === draftTask.id);
    
    const tasksToSort = draftTaskExists ? [
      {
        id: draftTask.id,
        title: draftTask.title,
        deadline: draftTask.deadline,
        contact: contactId,
        description: '',
        display_status: 'upcoming' as const,
        status: 'on-track' as const,
        type: 'task' as const,
        tag: '',
        priority: 'medium' as const,
        user_id: user?.id || ''
      },
      ...contactTasks.filter(task => task.display_status === "upcoming")
    ] : contactTasks.filter(task => task.display_status === "upcoming");

    return tasksToSort;
  }, [contactTasks, draftTask, contactId, user?.id]);
  
  /**
   * Computes overdue tasks for the contact
   * @returns {Task[]} Array of overdue tasks
   */
  const overdueTasks = useMemo(() => 
    contactTasks.filter(task => task.display_status === "overdue"),
    [contactTasks]
  );
  
  /**
   * Computes completed tasks for the contact
   * @returns {Task[]} Array of completed tasks
   */
  const completedTasks = useMemo(() => 
    contactTasks.filter(task => task.display_status === "completed"),
    [contactTasks]
  );

  /**
   * Handles task status changes (complete/incomplete)
   * @param {string} taskId - The ID of the task to update
   * @param {Task["display_status"]} newStatus - The new status to set
   */
  const handleTaskStatusChange = (taskId: string, newStatus: Task["display_status"]) => {
    const taskToUpdate = contactTasks.find(task => task.id === taskId);
    if (taskToUpdate && user) {
      updateTask({
        ...taskToUpdate,
        display_status: newStatus,
      });
    }
  };

  /**
   * Handles comprehensive task updates from the edit popup
   * @param {Task} updatedTask - The updated task object
   */
  const handleTaskUpdate = (updatedTask: Task) => {
    if (!user) return;
    updateTask({
      ...updatedTask,
    });
  };

  /**
   * Handles task deletion
   * @param {string} taskId - The ID of the task to delete
   */
  const handleTaskDelete = (taskId: string) => {
    deleteTask(taskId);
  };

  /**
   * Initiates the creation of a new task by setting up draft state
   * Creates a temporary task in local state and focuses the input
   */
  const handleCreateTask = () => {
    if (!user) return;
    
    const newTaskId = crypto.randomUUID();
    setDraftTask({
      id: newTaskId,
      title: ""
    });
    setIsTaskBeingCreated(true);
    
    // Focus the input on the next render
    setTimeout(() => {
      newTaskInputRef.current?.focus();
    }, 0);
  };

  /**
   * Creates the draft task in Supabase and cleans up local state
   * Only executes if the draft task has a valid title
   */
  const createTaskInSupabase = async (taskToCreate?: typeof draftTask) => {
    const taskData = taskToCreate || draftTask;
    if (!taskData || !taskData.title.trim()) return;

    // Guardar referencia a la tarea antes de limpiar el estado
    const finalTaskToCreate = { ...taskData };
    
    try {
      // Limpiar estado local antes de crear en Supabase
      setDraftTask(null);
      setIsTaskBeingCreated(false);

      await createTask({
        title: finalTaskToCreate.title,
        deadline: finalTaskToCreate.deadline || null,
        contact: contactId, // Automáticamente ligada al contacto
        type: 'task',
        display_status: 'upcoming',
        status: 'on-track',
        description: null,
        tag: null,
        priority: 'medium'
      });
    } catch (error) {
      // En caso de error, restaurar el estado para que el usuario pueda intentar de nuevo
      console.error('Error creating task:', error);
      setDraftTask(finalTaskToCreate);
      setIsTaskBeingCreated(true);
    }
  };

  /**
   * Handles task title changes for both draft and existing tasks
   * @param {string} taskId - The ID of the task being edited
   * @param {string} newTitle - The new title text
   */
  const handleTaskTitleChange = (taskId: string, newTitle: string) => {
    // Si es la tarea en borrador, actualizar estado local
    if (draftTask && taskId === draftTask.id) {
      setDraftTask(prev => prev ? { ...prev, title: newTitle } : null);
      return;
    }

    // Si es una tarea existente siendo editada inline, no actualizar en Supabase aún
    // Solo actualizar cuando se termine la edición
    if (editingTaskId === taskId) {
      return;
    }

    // Si es una tarea existente, actualizar en Supabase
    const taskToUpdate = contactTasks.find(task => task.id === taskId);
    if (!taskToUpdate) return;

    updateTask({
      ...taskToUpdate,
      title: newTitle
    });
  };

  /**
   * Handles input blur events for task title editing
   * Determines whether to save or cancel the draft task based on user interaction
   * @param {string} taskId - The ID of the task being edited
   * @param {React.FocusEvent<HTMLInputElement>} e - The blur event
   */
  const handleTaskTitleBlur = (taskId: string, e: React.FocusEvent<HTMLInputElement>) => {
    // Solo procesar si es la tarea en borrador
    if (!draftTask || taskId !== draftTask.id) return;

    // Si el título está vacío, eliminar el borrador
    if (!draftTask.title.trim()) {
      setDraftTask(null);
      setIsTaskBeingCreated(false);
      return;
    }

    // Verificar si el click fue en el botón del calendario
    const relatedTarget = e.relatedTarget as HTMLElement;
    const isCalendarButton = relatedTarget?.closest('button')?.querySelector('.lucide-calendar');
    
    // Si no se hizo click en el botón del calendario, crear la tarea
    if (!isCalendarButton) {
      createTaskInSupabase();
    }
  };

  /**
   * Handles keyboard events for task title input
   * Supports Enter to save and Escape to cancel
   * @param {React.KeyboardEvent} e - The keyboard event
   * @param {string} taskId - The ID of the task being edited
   */
  const handleTaskTitleKeyDown = (e: React.KeyboardEvent, taskId: string) => {
    // Solo procesar si es la tarea en borrador
    if (!draftTask || taskId !== draftTask.id) return;
    
    if (e.key === "Enter" && draftTask.title.trim()) {
      e.preventDefault();
      createTaskInSupabase();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setDraftTask(null);
      setIsTaskBeingCreated(false);
    }
  };

  /**
   * Handles deadline changes for tasks
   * Updates draft task locally or existing task in Supabase
   * Automatically adjusts task status based on deadline
   * @param {string} taskId - The ID of the task being updated
   * @param {string | undefined} deadline - The new deadline (ISO string) or undefined to remove
   */
  const handleDeadlineChange = (taskId: string, deadline: string | undefined) => {
    // Si es la tarea en borrador, actualizar estado local
    if (draftTask && taskId === draftTask.id) {
      const updatedDraftTask = { ...draftTask, deadline };
      setDraftTask(updatedDraftTask);
      
      // Si tiene título, crear en Supabase
      if (updatedDraftTask.title.trim()) {
        createTaskInSupabase(updatedDraftTask);
      }
      return;
    }

    // Si es una tarea existente, actualizar en Supabase
    const taskToUpdate = contactTasks.find(task => task.id === taskId);
    if (!taskToUpdate || !user) return;

    // When setting a new deadline, check if it's already overdue
    let newStatus = taskToUpdate.display_status;
    if (deadline) {
      const deadlineDate = parseISO(deadline);
      if (isPast(startOfDay(deadlineDate))) {
        newStatus = "overdue";
      }
      // If task was overdue but new deadline is in the future, move back to upcoming
      else if (taskToUpdate.display_status === "overdue") {
        newStatus = "upcoming";
      }
    }

    updateTask({
      ...taskToUpdate,
      deadline: deadline || null,
      display_status: newStatus
    });
  };

  /**
   * Handles single-click events on task items to start inline editing
   * Uses a timeout to distinguish between single and double clicks
   * @param {Task} task - The task to edit inline
   */
  const handleTaskSingleClick = (task: Task) => {
    // No permitir edición inline si es una tarea en borrador o ya se está editando otra
    if (draftTask || editingTaskId || isTaskBeingCreated) return;
    
    // Clear any existing timeout
    if (singleClickTimeoutRef.current) {
      clearTimeout(singleClickTimeoutRef.current);
    }
    
    // Set a timeout to handle single click after double click delay
    singleClickTimeoutRef.current = setTimeout(() => {
      setEditingTaskId(task.id);
      
      // Focus the input on the next render
      setTimeout(() => {
        editingInputRef.current?.focus();
      }, 0);
    }, 300); // 300ms delay to allow for double click
  };

  /**
   * Handles double-click events on task items to open edit popup
   * @param {Task} task - The task to edit
   */
  const handleTaskDoubleClick = (task: Task) => {
    // Clear the single click timeout to prevent inline editing
    if (singleClickTimeoutRef.current) {
      clearTimeout(singleClickTimeoutRef.current);
      singleClickTimeoutRef.current = null;
    }
    
    // Si está en modo de edición inline, cancelar y abrir popup
    if (editingTaskId === task.id) {
      setEditingTaskId(null);
    }
    setEditingTask(task);
  };

  /**
   * Handles finishing inline editing of a task title
   * @param {string} taskId - The ID of the task being edited
   * @param {string} newTitle - The new title text
   */
  const handleInlineEditComplete = (taskId: string, newTitle: string) => {
    const taskToUpdate = contactTasks.find(task => task.id === taskId);
    if (!taskToUpdate) return;

    // Solo actualizar si el título cambió
    if (newTitle.trim() !== taskToUpdate.title) {
      updateTask({
        ...taskToUpdate,
        title: newTitle.trim()
      });
    }
    
    setEditingTaskId(null);
  };

  /**
   * Handles canceling inline editing
   */
  const handleInlineEditCancel = () => {
    setEditingTaskId(null);
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (singleClickTimeoutRef.current) {
        clearTimeout(singleClickTimeoutRef.current);
      }
    };
  }, []);

  // Show loading skeleton while tasks are being fetched
  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="h-full p-3">
      <div className="mb-2">
        <button
          onClick={handleCreateTask}
          className="w-full text-left text-sm text-muted-foreground flex items-center gap-2 py-2 px-2 hover:text-foreground hover:bg-slate-50 rounded transition-colors"
          disabled={!user || isTaskBeingCreated}
        >
          <Plus size={14} />
          Create task
        </button>
      </div>

      <Tabs defaultValue="overdue">
        <TabsList className="w-full flex p-0 bg-transparent h-auto mb-2">
          <TabsTrigger
            value="overdue"
            className="flex-1 py-1 px-2 text-xs rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
          >
            Overdue {overdueTasks.length > 0 && `(${overdueTasks.length})`}
          </TabsTrigger>
          <TabsTrigger
            value="upcoming"
            className="flex-1 py-1 px-2 text-xs rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
          >
            Upcoming {upcomingTasks.length > 0 && `(${upcomingTasks.length})`}
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="flex-1 py-1 px-2 text-xs rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
          >
            Done {completedTasks.length > 0 && `(${completedTasks.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overdue" className="m-0">
          <div className="h-[280px] overflow-y-auto pr-2 rounded">
            {overdueTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 px-2">No overdue tasks</p>
            ) : (
              overdueTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  isNew={false}
                  isInlineEditing={editingTaskId === task.id}
                  inlineEditRef={editingTaskId === task.id ? editingInputRef : undefined}
                  onSingleClick={handleTaskSingleClick}
                  onDoubleClick={handleTaskDoubleClick}
                  onTitleChange={handleTaskTitleChange}
                  onTitleBlur={handleTaskTitleBlur}
                  onTitleKeyDown={handleTaskTitleKeyDown}
                  onInlineEditComplete={handleInlineEditComplete}
                  onInlineEditCancel={handleInlineEditCancel}
                  onDeadlineChange={handleDeadlineChange}
                  onStatusChange={handleTaskStatusChange}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="m-0">
          <div className="h-[280px] overflow-y-auto pr-2 rounded">
            {upcomingTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 px-2">No upcoming tasks</p>
            ) : (
              upcomingTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  isNew={isTaskBeingCreated && task.id === draftTask?.id}
                  isInlineEditing={editingTaskId === task.id}
                  inputRef={isTaskBeingCreated && task.id === draftTask?.id ? newTaskInputRef : undefined}
                  inlineEditRef={editingTaskId === task.id ? editingInputRef : undefined}
                  onSingleClick={handleTaskSingleClick}
                  onDoubleClick={handleTaskDoubleClick}
                  onTitleChange={handleTaskTitleChange}
                  onTitleBlur={handleTaskTitleBlur}
                  onTitleKeyDown={handleTaskTitleKeyDown}
                  onInlineEditComplete={handleInlineEditComplete}
                  onInlineEditCancel={handleInlineEditCancel}
                  onDeadlineChange={handleDeadlineChange}
                  onStatusChange={handleTaskStatusChange}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="m-0">
          <div className="h-[280px] overflow-y-auto pr-2 rounded">
            {completedTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 px-2">No completed tasks</p>
            ) : (
              completedTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  isNew={false}
                  isInlineEditing={editingTaskId === task.id}
                  inlineEditRef={editingTaskId === task.id ? editingInputRef : undefined}
                  onSingleClick={handleTaskSingleClick}
                  onDoubleClick={handleTaskDoubleClick}
                  onTitleChange={handleTaskTitleChange}
                  onTitleBlur={handleTaskTitleBlur}
                  onTitleKeyDown={handleTaskTitleKeyDown}
                  onInlineEditComplete={handleInlineEditComplete}
                  onInlineEditCancel={handleInlineEditCancel}
                  onDeadlineChange={handleDeadlineChange}
                  onStatusChange={handleTaskStatusChange}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {editingTask && (
        <TaskEditPopup
          task={editingTask}
          open={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleTaskUpdate}
          onStatusChange={handleTaskStatusChange}
          onDelete={handleTaskDelete}
          allTasks={contactTasks}
          isContactLocked={true}
          lockedContactName={contactName}
        />
      )}
    </div>
  );
}

/**
 * Props for the TaskListItem component
 * @interface TaskListItemProps
 */
interface TaskListItemProps {
  /** The task object to display */
  task: Task;
  /** Whether this is a new task being created */
  isNew?: boolean;
  /** Whether this task is being edited inline */
  isInlineEditing?: boolean;
  /** Reference to the input element for focus management */
  inputRef?: React.RefObject<HTMLInputElement>;
  /** Reference to the inline editing input element */
  inlineEditRef?: React.RefObject<HTMLInputElement>;
  /** Callback for single-click events to start inline editing */
  onSingleClick: (task: Task) => void;
  /** Callback for double-click events to open edit popup */
  onDoubleClick: (task: Task) => void;
  /** Callback for task status changes */
  onStatusChange: (taskId: string, newStatus: Task["display_status"]) => void;
  /** Callback for deadline changes */
  onDeadlineChange: (taskId: string, deadline: string | undefined) => void;
  /** Callback for title changes */
  onTitleChange: (taskId: string, newTitle: string) => void;
  /** Callback for input blur events */
  onTitleBlur: (taskId: string, e: React.FocusEvent<HTMLInputElement>) => void;
  /** Callback for keyboard events on title input */
  onTitleKeyDown: (e: React.KeyboardEvent, taskId: string) => void;
  /** Callback for completing inline editing */
  onInlineEditComplete: (taskId: string, newTitle: string) => void;
  /** Callback for canceling inline editing */
  onInlineEditCancel: () => void;
}

/**
 * TaskListItem Component
 * 
 * Renders an individual task item within the contact tasks panel.
 * Supports both display and edit modes, with inline editing capabilities.
 * 
 * Features:
 * - Displays task title with completion status styling
 * - Shows deadline with contextual coloring (today, tomorrow, overdue)
 * - Provides checkbox for status toggling
 * - Supports inline title editing for new tasks
 * - Shows task type badges when applicable
 * - Integrates with deadline picker popup
 * - Handles double-click to open full edit popup
 * 
 * @component
 * @param {TaskListItemProps} props - The component props
 * @returns {JSX.Element} The rendered task list item
 */
function TaskListItem({ 
  task, 
  isNew, 
  isInlineEditing,
  inputRef, 
  inlineEditRef,
  onSingleClick,
  onDoubleClick,
  onStatusChange, 
  onDeadlineChange, 
  onTitleChange, 
  onTitleBlur, 
  onTitleKeyDown,
  onInlineEditComplete,
  onInlineEditCancel
}: TaskListItemProps) {
  /** State for inline editing title */
  const [inlineTitle, setInlineTitle] = useState(task.title);
  
  /** Parsed deadline date object */
  const deadline = task.deadline ? parseISO(task.deadline) : undefined;

  /**
   * Update inline title when task title changes
   */
  React.useEffect(() => {
    setInlineTitle(task.title);
  }, [task.title]);

  /**
   * Handles inline editing blur events
   */
  const handleInlineBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Check if the blur was caused by clicking on the calendar button
    const relatedTarget = e.relatedTarget as HTMLElement;
    const isCalendarButton = relatedTarget?.closest('button')?.querySelector('.lucide-calendar');
    
    if (!isCalendarButton) {
      onInlineEditComplete(task.id, inlineTitle);
    }
  };

  /**
   * Handles inline editing keyboard events
   */
  const handleInlineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onInlineEditComplete(task.id, inlineTitle);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setInlineTitle(task.title); // Reset to original title
      onInlineEditCancel();
    }
  };

  /**
   * Formats the deadline for display
   * @returns {string | null} Formatted deadline string or null if no deadline
   */
  const getDueDateDisplay = () => {
    if (!deadline) return null;

    if (isToday(deadline)) {
      return "Today";
    }
    if (isTomorrow(deadline)) {
      return "Tomorrow";
    }
    return format(deadline, "MMM d");
  };

  /**
   * Determines the color class for the deadline display based on urgency
   * @returns {string} CSS class name for deadline color
   */
  const getDueDateColor = () => {
    if (!deadline) return "text-muted-foreground";

    if (task.display_status === "overdue" || isPast(startOfDay(deadline))) {
      return "text-red-500";
    }
    if (isToday(deadline) || isTomorrow(deadline)) {
      return "text-emerald-500";
    }
    return "text-muted-foreground";
  };

  return (
    <div className="group px-2 py-2 hover:bg-slate-50 rounded cursor-pointer transition-colors">
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange(task.id, task.display_status === "completed" ? "upcoming" : "completed");
          }}
          className="flex-shrink-0 mt-0.5 hover:opacity-80 transition-opacity"
          aria-label={task.display_status === "completed" ? "Mark as incomplete" : "Mark as complete"}
        >
          <div className={cn(
            "h-4 w-4 rounded-full flex items-center justify-center transition-colors",
            task.display_status === "completed"
              ? "bg-emerald-500 border-emerald-500"
              : "border-2 border-muted-foreground hover:border-emerald-500/50 hover:bg-emerald-500/10"
          )}>
            {task.display_status === "completed" && (
              <Check className="h-2.5 w-2.5 text-white" />
            )}
          </div>
        </button>
        
        <div className="flex-1 min-w-0">
          {isNew ? (
            <input
              ref={inputRef}
              type="text"
              value={task.title}
              onChange={(e) => onTitleChange(task.id, e.target.value)}
              onBlur={(e) => onTitleBlur(task.id, e)}
              onKeyDown={(e) => onTitleKeyDown(e, task.id)}
              className="w-full bg-transparent border-none focus:outline-none text-foreground text-sm"
              placeholder="Enter task title"
            />
          ) : isInlineEditing ? (
            <input
              ref={inlineEditRef}
              type="text"
              value={inlineTitle}
              onChange={(e) => setInlineTitle(e.target.value)}
              onBlur={handleInlineBlur}
              onKeyDown={handleInlineKeyDown}
              className="w-full bg-transparent border-none focus:outline-none text-foreground text-sm"
            />
          ) : (
            <div 
              onClick={() => onSingleClick(task)}
              onDoubleClick={() => onDoubleClick(task)}
              className="cursor-pointer"
            >
              <h4 className={cn(
                "text-sm font-medium truncate",
                task.display_status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
              )}>
                {task.title}
              </h4>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {task.type && task.type !== "task" && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs capitalize">
              {task.type === "follow-up" ? "Follow Up" : task.type.replace(/-/g, ' ')}
            </span>
          )}
          <DeadlinePopup
            date={deadline}
            onSelect={(date) => onDeadlineChange(task.id, date?.toISOString())}
          >
            <button
              className={cn(
                "flex items-center gap-1 hover:opacity-80 transition-opacity text-xs ml-1",
                getDueDateColor()
              )}
            >
              {deadline ? (
                getDueDateDisplay()
              ) : (
                <Calendar className="h-3.5 w-3.5" />
              )}
            </button>
          </DeadlinePopup>
        </div>
      </div>
    </div>
  );
} 