import { useState, useRef, useCallback, useMemo } from "react";
import { Check, Plus, Calendar } from "lucide-react";
import React from "react";
import { format, isToday, isTomorrow, parseISO, isPast, startOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Task } from "@/types/task";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth";
import { DeadlinePopup } from "./deadline-popup";
import { TaskEditPopup } from "./task-edit-popup";
import { useStore } from "@/stores";
import { usePerformanceMonitor } from "@/hooks/use-performance-monitor";

export type { Task };

// OPTIMIZED: Cache for date operations to avoid repeated parsing
const DATE_CACHE = new Map<string, number>()
const DATE_DISPLAY_CACHE = new Map<string, string>()
const TODAY_TIMESTAMP = startOfDay(new Date()).getTime()

// OPTIMIZED: Cached date parsing function
const getCachedDateTimestamp = (dateStr: string): number => {
  if (DATE_CACHE.has(dateStr)) {
    return DATE_CACHE.get(dateStr)!
  }
  
  const parsed = startOfDay(parseISO(dateStr)).getTime()
  DATE_CACHE.set(dateStr, parsed)
  
  // Clear cache if it gets too large
  if (DATE_CACHE.size > 100) {
    DATE_CACHE.clear()
  }
  
  return parsed
}

// OPTIMIZED: Cached date display formatting
const getCachedDateDisplay = (deadline: Date): string => {
  const dateStr = deadline.toISOString()
  
  if (DATE_DISPLAY_CACHE.has(dateStr)) {
    return DATE_DISPLAY_CACHE.get(dateStr)!
  }
  
  let display: string
  if (isToday(deadline)) {
    display = "Today"
  } else if (isTomorrow(deadline)) {
    display = "Tomorrow"
  } else {
    display = format(deadline, "MMM d, yyyy", { locale: es })
  }
  
  DATE_DISPLAY_CACHE.set(dateStr, display)
  
  // Clear cache if it gets too large
  if (DATE_DISPLAY_CACHE.size > 50) {
    DATE_DISPLAY_CACHE.clear()
  }
  
  return display
}

// OPTIMIZED: Memoized sorting function with efficient date operations
const sortTasksByDateOptimized = (tasks: Task[], isEditing: boolean, sortByCreation: boolean = false): Task[] => {
  if (tasks.length <= 1) return tasks

  return [...tasks].sort((a, b) => {
    // During editing, keep the new task at the top
    if (isEditing) {
      if (a.title === "") return -1
      if (b.title === "") return 1
    }

    // If sorting by creation order (for upcoming tasks), maintain original order
    if (sortByCreation) {
      return 0 // Maintain original order from database (created_at DESC)
    }

    // If neither task has a deadline, maintain original order
    if (!a.deadline && !b.deadline) return 0
    // Tasks with no deadline go to the end
    if (!a.deadline) return 1
    if (!b.deadline) return -1

    // Use cached timestamp operations for performance
    const timestampA = getCachedDateTimestamp(a.deadline)
    const timestampB = getCachedDateTimestamp(b.deadline)

    // Calculate days from today using cached timestamps
    const daysFromTodayA = Math.floor((timestampA - TODAY_TIMESTAMP) / (1000 * 60 * 60 * 24))
    const daysFromTodayB = Math.floor((timestampB - TODAY_TIMESTAMP) / (1000 * 60 * 60 * 24))

    // Sort by days from today (ascending)
    return daysFromTodayA - daysFromTodayB
  })
}

/**
 * TasksPanel
 * 
 * Panel principal para la gestión de tareas del usuario. Permite ver, crear, editar, completar y eliminar tareas.
 * Utiliza Supabase para persistencia y Zustand para estado local temporal de creación.
 * 
 * Características:
 * - Tabs para ver tareas próximas, vencidas y completadas
 * - Crear nueva tarea con input alineado
 * - Edición inline de título y fecha límite
 * - Sincronización con Supabase
 * - Optimización de UX para creación y edición
 *
 * @component
 * @returns {JSX.Element} Panel de tareas del usuario
 */
export function TasksPanel() {
  const { user } = useAuth();
  
  // Performance monitoring for optimization tracking
  const { logSummary, renderCount } = usePerformanceMonitor('TasksPanel');
  
  const store = useStore();
  const {
    tasks: supabaseTasks,
    loading: { fetching: isLoading, creating: isCreating },
    createTask,
    updateTask,
    deleteTask,
    isInitialized,
    initialize,
    setIsTaskBeingCreated,
    isTaskBeingCreated
  } = store;

  // Log performance summary periodically for monitoring
  React.useEffect(() => {
    if (renderCount > 0 && renderCount % 20 === 0) {
      logSummary();
    }
  }, [renderCount, logSummary]);

  // OPTIMIZED: Memoize initialization effect with user.id dependency
  React.useEffect(() => {
    if (user?.id && !isInitialized && !isLoading) {
      initialize();
    }
  }, [user?.id, isInitialized, isLoading, initialize]);

  /**
   * Estado local para la tarea que se está creando
   */
  const [draftTask, setDraftTask] = useState<{
    id: string;
    title: string;
    deadline?: string;
  } | null>(null);

  /**
   * Ref para el input de nueva tarea
   * @type {React.RefObject<HTMLInputElement>}
   */
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // OPTIMIZED: Memoize task transformation with comprehensive caching
  const tasks = useMemo(() => {
    if (!supabaseTasks?.length) return []
    
    return supabaseTasks.map((task) => ({
      id: task.id,
      title: task.title,
      deadline: task.deadline,
      contact: task.contact || '',
      description: task.description,
      display_status: task.display_status as Task['display_status'],
      status: task.status as Task['status'],
      type: task.type as Task['type'],
      tag: task.tag,
      priority: task.priority as Task['priority'],
      user_id: task.user_id
    })) as Task[];
  }, [supabaseTasks]);

  // OPTIMIZED: Memoize filtered tasks with efficient array operations
  const filteredTasks = useMemo(() => {
    if (tasks.length === 0) {
      return {
        upcoming: [],
        overdue: [],
        completed: []
      }
    }

    // Use reduce for single-pass filtering instead of multiple filter calls
    const categorized = tasks.reduce((acc, task) => {
      const category = task.display_status
      if (category === 'upcoming' || category === 'overdue' || category === 'completed') {
        acc[category].push(task)
      }
      return acc
    }, {
      upcoming: [] as Task[],
      overdue: [] as Task[],
      completed: [] as Task[]
    })

    return categorized
  }, [tasks])

  // OPTIMIZED: Memoize upcoming tasks with draft handling
  const upcomingTasks = useMemo(() => {
    // Handle draft task efficiently
    const draftTaskExists = draftTask && !tasks.some(t => t.id === draftTask.id);
    
    const tasksToSort = draftTaskExists ? [
      {
        id: draftTask.id,
        title: draftTask.title,
        deadline: draftTask.deadline,
        contact: '',
        description: '',
        display_status: 'upcoming' as const,
        status: 'on-track' as const,
        type: 'task' as const,
        tag: '',
        priority: 'medium' as const,
        user_id: user?.id || ''
      },
      ...filteredTasks.upcoming
    ] : filteredTasks.upcoming;

    return sortTasksByDateOptimized(tasksToSort, isTaskBeingCreated, true);
  }, [filteredTasks.upcoming, draftTask, isTaskBeingCreated, user?.id, tasks]);

  // OPTIMIZED: Memoize overdue and completed tasks with optimized sorting
  const overdueTasks = useMemo(() => 
    sortTasksByDateOptimized(filteredTasks.overdue, false, false),
    [filteredTasks.overdue]
  );

  const completedTasks = useMemo(() =>
    sortTasksByDateOptimized(filteredTasks.completed, false, false),
    [filteredTasks.completed]
  );

  // OPTIMIZED: Memoize all event handlers to prevent recreation
  const handleTaskStatusChange = useCallback((taskId: string, newStatus: Task["display_status"]) => {
    const taskToUpdate = tasks.find(task => task.id === taskId);
    if (taskToUpdate && user) {
      updateTask({
        id: taskId,
        display_status: newStatus,
        title: taskToUpdate.title,
        status: taskToUpdate.status,
        type: taskToUpdate.type,
        deadline: taskToUpdate.deadline,
        contact: taskToUpdate.contact,
        description: taskToUpdate.description,
        tag: taskToUpdate.tag,
        priority: taskToUpdate.priority
      });
    }
  }, [tasks, user, updateTask]);

  const handleDeadlineChange = useCallback((taskId: string, deadline: string | undefined) => {
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
    const taskToUpdate = tasks.find(task => task.id === taskId);
    if (!taskToUpdate || !user) return;

    // When setting a new deadline, check if it's already overdue
    let newStatus = taskToUpdate.display_status;
    if (deadline) {
      const deadlineTimestamp = getCachedDateTimestamp(deadline);
      if (deadlineTimestamp < TODAY_TIMESTAMP) {
        newStatus = "overdue";
      }
      // If task was overdue but new deadline is in the future, move back to upcoming
      else if (taskToUpdate.display_status === "overdue") {
        newStatus = "upcoming";
      }
    }

    updateTask({
      id: taskId,
      deadline: deadline || '',
      display_status: newStatus,
      title: taskToUpdate.title,
      status: taskToUpdate.status,
      type: taskToUpdate.type,
      contact: taskToUpdate.contact,
      description: taskToUpdate.description,
      tag: taskToUpdate.tag,
      priority: taskToUpdate.priority
    });
  }, [draftTask, tasks, user, updateTask]);

  const handleCreateNewTask = useCallback(() => {
    if (!user) return; // Don't allow creating tasks if not logged in

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
  }, [user, setIsTaskBeingCreated]);

  const handleTaskTitleChange = useCallback((taskId: string, newTitle: string) => {
    // Si es la tarea en borrador, actualizar estado local
    if (draftTask && taskId === draftTask.id) {
      setDraftTask(prev => prev ? { ...prev, title: newTitle } : null);
      return;
    }

    // Si es una tarea existente, actualizar en Supabase
    const taskToUpdate = tasks.find(task => task.id === taskId);
    if (!taskToUpdate) return;

    updateTask({
      ...taskToUpdate,
      title: newTitle
    });
  }, [draftTask, tasks, updateTask]);

  // OPTIMIZED: Memoize createTaskInSupabase function
  const createTaskInSupabase = useCallback(async (taskToCreate?: typeof draftTask) => {
    const taskData = taskToCreate || draftTask;
    if (!taskData || !taskData.title.trim()) return;

    try {
      // Limpiar estado local antes de crear en Supabase
      const finalTaskToCreate = { ...taskData };
      setDraftTask(null);
      setIsTaskBeingCreated(false);

      await createTask({
        title: finalTaskToCreate.title,
        deadline: finalTaskToCreate.deadline || '',
        type: 'task',
        display_status: 'upcoming',
        status: 'on-track',
        contact: '',
        description: '',
        tag: '',
        priority: 'medium'
      });
    } catch (error) {
      // El error ya se maneja en el store
    }
  }, [draftTask, createTask, setIsTaskBeingCreated]);

  const handleTaskTitleBlur = useCallback((taskId: string, e: React.FocusEvent<HTMLInputElement>) => {
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
  }, [draftTask, createTaskInSupabase, setIsTaskBeingCreated]);

  const handleTaskTitleKeyDown = useCallback((e: React.KeyboardEvent, taskId: string) => {
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
  }, [draftTask, createTaskInSupabase, setIsTaskBeingCreated]);

  // OPTIMIZED: Memoize task counts for efficient badge rendering
  const taskCounts = useMemo(() => ({
    upcoming: upcomingTasks.length,
    overdue: overdueTasks.length,
    completed: completedTasks.length,
  }), [upcomingTasks.length, overdueTasks.length, completedTasks.length]);

  return (
    <div className="bg-background text-foreground rounded-lg overflow-hidden flex flex-col shadow-lg h-[500px]">
      <div className="p-3 pb-2 flex items-center gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {/* Add your profile image here */}
          <div className="w-full h-full bg-muted-foreground/20" />
        </div>
        <h2 className="text-lg sm:text-xl font-semibold">My tasks</h2>
      </div>

      <Tabs defaultValue="upcoming" className="flex-1">
        <div className="border-none">
          <TabsList className="w-full flex p-0 bg-transparent">
            <TabsTrigger
              value="upcoming"
              className="flex-1 py-2 px-1 sm:px-2 sm:py-1.5 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors text-xs sm:text-sm min-w-0"
            >
              <span className="hidden md:inline">Upcoming</span>
              <span className="md:hidden truncate">Up</span>
              {taskCounts.upcoming > 0 && (
                <span className="ml-0.5 sm:ml-1">({taskCounts.upcoming})</span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="flex-1 py-2 px-1 sm:px-2 sm:py-1.5 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors text-xs sm:text-sm min-w-0"
            >
              <span className="hidden md:inline">Overdue</span>
              <span className="md:hidden truncate">Over</span>
              {taskCounts.overdue > 0 && (
                <span className="ml-0.5 sm:ml-1">({taskCounts.overdue})</span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="flex-1 py-2 px-1 sm:px-2 sm:py-1.5 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors text-xs sm:text-sm min-w-0"
            >
              <span className="hidden md:inline">Completed</span>
              <span className="md:hidden truncate">Done</span>
              {taskCounts.completed > 0 && (
                <span className="ml-0.5 sm:ml-1">({taskCounts.completed})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-2 pt-3 px-3 sm:px-2">
          {user ? (
            <>
          <button
                className="w-full text-left text-muted-foreground flex items-center gap-2 py-2 sm:py-1 hover:text-foreground transition-colors"
            onClick={handleCreateNewTask}
            disabled={isTaskBeingCreated}
          >
                <Plus size={16} />
            Create task
          </button>
            </>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-2">
              Please log in to create tasks
            </div>
          )}
        </div>

        <div className="overflow-y-auto" style={{ height: '392px' }}>
          {isLoading ? (
            <div className="px-3 py-2 space-y-2">
              {/* Task item skeletons */}
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="py-1.5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-5 w-16 rounded" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                  {index < 3 && <div className="mt-2 mx-5 border-b border-border/50" />}
                </div>
              ))}
            </div>
          ) : (
            <>
          <TabsContent value="upcoming" className="m-0">
                {taskCounts.upcoming > 0 ? (
                  upcomingTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                isNew={isTaskBeingCreated && task.id === upcomingTasks[0]?.id}
                inputRef={isTaskBeingCreated && task.id === upcomingTasks[0]?.id ? newTaskInputRef : undefined}
                onStatusChange={handleTaskStatusChange}
                onDeadlineChange={handleDeadlineChange}
                onTitleChange={handleTaskTitleChange}
                onTitleBlur={handleTaskTitleBlur}
                onTitleKeyDown={handleTaskTitleKeyDown}
                onTaskUpdate={updateTask}
                onDelete={deleteTask}
                allTasks={tasks}
              />
                  ))
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No upcoming tasks
                  </div>
                )}
          </TabsContent>

          <TabsContent value="overdue" className="m-0">
                {taskCounts.overdue > 0 ? (
                  overdueTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={handleTaskStatusChange}
                onDeadlineChange={handleDeadlineChange}
                onTitleChange={handleTaskTitleChange}
                onTitleBlur={handleTaskTitleBlur}
                onTitleKeyDown={handleTaskTitleKeyDown}
                onTaskUpdate={updateTask}
                onDelete={deleteTask}
                allTasks={tasks}
              />
                  ))
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No overdue tasks
                  </div>
                )}
          </TabsContent>

          <TabsContent value="completed" className="m-0">
                {taskCounts.completed > 0 ? (
                  completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={handleTaskStatusChange}
                onDeadlineChange={handleDeadlineChange}
                onTitleChange={handleTaskTitleChange}
                onTitleBlur={handleTaskTitleBlur}
                onTitleKeyDown={handleTaskTitleKeyDown}
                onTaskUpdate={updateTask}
                onDelete={deleteTask}
                allTasks={tasks}
              />
                  ))
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No completed tasks
                  </div>
                )}
          </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}

/**
 * TaskItem
 *
 * Componente para renderizar una fila de tarea, con edición inline y acciones.
 *
 * @param {object} props
 * @param {Task} props.task - Tarea a mostrar
 * @param {boolean} [props.isNew] - Si es una tarea nueva (input editable)
 * @param {React.RefObject<HTMLInputElement>} [props.inputRef] - Ref para el input de nueva tarea
 * @param {function} props.onStatusChange - Handler para cambiar estado (completada/pending)
 * @param {function} props.onDeadlineChange - Handler para cambiar deadline
 * @param {function} props.onTitleChange - Handler para cambiar título
 * @param {function} props.onTitleBlur - Handler para blur del input
 * @param {function} props.onTitleKeyDown - Handler para teclas en input
 * @param {function} props.onTaskUpdate - Handler para actualizar tarea
 * @param {function} props.onDelete - Handler para eliminar tarea
 * @param {Task[]} props.allTasks - Todas las tareas (para popups)
 * @returns {JSX.Element}
 */
interface TaskItemProps {
  task: Task;
  isNew?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
  onStatusChange: (taskId: string, newStatus: Task["display_status"]) => void;
  onDeadlineChange: (taskId: string, deadline: string | undefined) => void;
  onTitleChange: (taskId: string, newTitle: string) => void;
  onTitleBlur: (taskId: string, e: React.FocusEvent<HTMLInputElement>) => void;
  onTitleKeyDown: (e: React.KeyboardEvent, taskId: string) => void;
  onTaskUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
  allTasks: Task[];
}

// OPTIMIZED: Memoize TaskItem component to prevent unnecessary re-renders
const TaskItem = React.memo<TaskItemProps>(function TaskItem({
  task,
  isNew,
  inputRef,
  onStatusChange,
  onDeadlineChange,
  onTitleChange,
  onTitleBlur,
  onTitleKeyDown,
  onTaskUpdate,
  onDelete,
  allTasks
}) {
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
  
  // OPTIMIZED: Memoize deadline parsing and calculations
  const deadlineInfo = useMemo(() => {
    if (!task.deadline) return { deadline: undefined, display: null, color: "text-muted-foreground" }
    
    const deadline = parseISO(task.deadline)
    const display = getCachedDateDisplay(deadline)
    
    let color = "text-muted-foreground"
    if (task.display_status === "overdue" || isPast(startOfDay(deadline))) {
      color = "text-red-400"
    } else if (isToday(deadline) || isTomorrow(deadline)) {
      color = "text-emerald-400"
    }
    
    return { deadline, display, color }
  }, [task.deadline, task.display_status])

  // OPTIMIZED: Memoize event handlers
  const handleStatusToggle = useCallback(() => {
    onStatusChange(task.id, task.display_status === "completed" ? "upcoming" : "completed")
  }, [task.id, task.display_status, onStatusChange])

  const handleDoubleClick = useCallback(() => {
    setIsEditPopupOpen(true)
  }, [])

  const handleTaskSave = useCallback((updatedTask: Task) => {
    // Update all task fields in the parent component
    onTitleChange(updatedTask.id, updatedTask.title);
    if (updatedTask.deadline !== task.deadline) {
      onDeadlineChange(updatedTask.id, updatedTask.deadline);
    }
  }, [task.deadline, onTitleChange, onDeadlineChange])

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onTitleChange(task.id, e.target.value)
  }, [task.id, onTitleChange])

  const handleTitleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    onTitleBlur(task.id, e)
  }, [task.id, onTitleBlur])

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    onTitleKeyDown(e, task.id)
  }, [task.id, onTitleKeyDown])

  const handleDeadlineSelect = useCallback((date: Date | undefined) => {
    onDeadlineChange(task.id, date?.toISOString())
  }, [task.id, onDeadlineChange])

  const handleEditPopupClose = useCallback(() => {
    setIsEditPopupOpen(false)
  }, [])

  // OPTIMIZED: Memoize style calculations
  const checkboxStyles = useMemo(() => ({
    container: cn(
      "h-5 w-5 rounded-full flex items-center justify-center transition-colors",
      task.display_status === "completed"
        ? "bg-emerald-500 border-emerald-500"
        : "border-2 border-muted-foreground hover:border-emerald-500/50 hover:bg-emerald-500/10"
    ),
    icon: cn(
      "h-3 w-3",
      task.display_status === "completed"
        ? "text-white"
        : "text-muted-foreground hover:text-emerald-500/50"
    )
  }), [task.display_status])

  const titleStyles = useMemo(() => cn(
    "font-medium cursor-pointer select-none truncate text-sm",
    task.display_status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
  ), [task.display_status])

  return (
    <div className="px-3 py-2 sm:py-1.5 group">
      {/* Desktop Layout */}
      <div className="hidden sm:flex items-center gap-3">
        <button
          onClick={handleStatusToggle}
          className="flex-shrink-0 hover:opacity-80 transition-opacity"
          aria-label={task.display_status === "completed" ? "Mark as incomplete" : "Mark as complete"}
        >
          <div className={checkboxStyles.container}>
            <Check className={checkboxStyles.icon} />
          </div>
        </button>
        <div className="flex-1 min-w-0">
          {isNew ? (
            <input
              ref={inputRef}
              type="text"
              value={task.title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="w-full bg-transparent border-none focus:outline-none text-foreground text-sm"
              placeholder="Enter task title"
            />
          ) : (
            <h3
              onDoubleClick={handleDoubleClick}
              className={titleStyles}
            >
              {task.title}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {task.type && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs capitalize">
              {task.type === "follow-up" ? "Follow Up" : task.type.replace(/-/g, ' ')}
            </span>
          )}
          <DeadlinePopup
            date={deadlineInfo.deadline}
            onSelect={handleDeadlineSelect}
          >
            <button
              className={cn(
                "flex items-center gap-1 hover:opacity-80 transition-opacity text-xs ml-1",
                deadlineInfo.color
              )}
            >
              {deadlineInfo.deadline ? (
                deadlineInfo.display
              ) : (
                <Calendar className="h-3.5 w-3.5" />
              )}
            </button>
          </DeadlinePopup>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="sm:hidden">
        {/* Top Row: Check button + Title */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={handleStatusToggle}
            className="flex-shrink-0 hover:opacity-80 transition-opacity p-1 -m-1"
            aria-label={task.display_status === "completed" ? "Mark as incomplete" : "Mark as complete"}
          >
            <div className={checkboxStyles.container}>
              <Check className={checkboxStyles.icon} />
            </div>
          </button>
          <div className="flex-1 min-w-0">
            {isNew ? (
              <input
                ref={inputRef}
                type="text"
                value={task.title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="w-full bg-transparent border-none focus:outline-none text-foreground text-sm"
                placeholder="Enter task title"
              />
            ) : (
              <h3
                onDoubleClick={handleDoubleClick}
                className={titleStyles}
              >
                {task.title}
              </h3>
            )}
          </div>
        </div>

        {/* Bottom Row: Date + Tag (indented to align with title) */}
        <div className="ml-8 flex items-center gap-2">
          <DeadlinePopup
            date={deadlineInfo.deadline}
            onSelect={handleDeadlineSelect}
          >
            <button
              className={cn(
                "flex items-center gap-1 hover:opacity-80 transition-opacity text-xs p-1 -m-1",
                deadlineInfo.color
              )}
            >
              <Calendar className="h-3 w-3" />
              {deadlineInfo.deadline && (
                <span className="text-xs">{deadlineInfo.display}</span>
              )}
            </button>
          </DeadlinePopup>
          {task.type && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs capitalize">
              {task.type === "follow-up" ? "Follow Up" : task.type.replace(/-/g, ' ')}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 mx-5 border-b border-border/50 group-last:border-0"></div>
      <TaskEditPopup
        task={task}
        open={isEditPopupOpen}
        onClose={handleEditPopupClose}
        onSave={onTaskUpdate}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        allTasks={allTasks}
      />
    </div>
  );
});

export { TaskItem };
