import { useState, useRef } from "react";
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

export type { Task };

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

  // Initialize tasks if not already initialized
  React.useEffect(() => {
    if (user && !isInitialized && !isLoading) {
      initialize();
    }
  }, [user, isInitialized, isLoading, initialize]);

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

  // Formatear las tareas de Supabase
  const tasks = React.useMemo(() => {
    return (supabaseTasks || []).map((task) => ({
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

  const sortTasksByDate = (tasks: Task[], isEditing: boolean, sortByCreation: boolean = false) => {
    const today = startOfDay(new Date());

    return [...tasks].sort((a, b) => {
      // During editing, keep the new task at the top
      if (isEditing) {
        if (a.title === "") return -1;
        if (b.title === "") return 1;
      }

      // If sorting by creation order (for upcoming tasks), maintain original order
      if (sortByCreation) {
        return 0; // Maintain original order from database (created_at DESC)
      }

      // If neither task has a deadline, maintain original order
      if (!a.deadline && !b.deadline) return 0;
      // Tasks with no deadline go to the end
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;

      const dateA = startOfDay(parseISO(a.deadline));
      const dateB = startOfDay(parseISO(b.deadline));

      // Calculate days from today for both dates
      const daysFromTodayA = Math.floor((dateA.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const daysFromTodayB = Math.floor((dateB.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Sort by days from today (ascending)
      return daysFromTodayA - daysFromTodayB;
    });
  };

  const upcomingTasks = React.useMemo(() => {
    // Si hay una tarea en borrador y no está en las tareas de Supabase
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
      ...tasks.filter(task => task.display_status === "upcoming")
    ] : tasks.filter(task => task.display_status === "upcoming");

    return sortTasksByDate(tasksToSort, isTaskBeingCreated, true);
  }, [tasks, draftTask, isTaskBeingCreated, user?.id]);

  const overdueTasks = React.useMemo(() => 
    sortTasksByDate(tasks.filter(task => task.display_status === "overdue"), false, false),
    [tasks]
  );

  const completedTasks = React.useMemo(() =>
    sortTasksByDate(tasks.filter(task => task.display_status === "completed"), false, false),
    [tasks]
  );

  /**
   * handleTaskStatusChange
   * 
   * Maneja el cambio de estado de una tarea. Actualiza la tarea en Supabase.
   * 
   * @param {string} taskId - ID de la tarea a actualizar
   * @param {Task["display_status"]} newStatus - Nuevo estado de la tarea
   * @returns {void}
   */
  const handleTaskStatusChange = (taskId: string, newStatus: Task["display_status"]) => {
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
  };

  /**
   * handleDeadlineChange
   * 
   * Maneja el cambio de fecha límite de una tarea. Actualiza la tarea en Supabase.
   * 
   * @param {string} taskId - ID de la tarea a actualizar 
   * @param {string | undefined} deadline - Nueva fecha límite
   * @returns {void}
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
    const taskToUpdate = tasks.find(task => task.id === taskId);
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
  };

  /**
   * handleCreateNewTask
   * 
   * Maneja la creación de una nueva tarea. Crea una tarea temporal en estado local.
   * 
   * @returns {void}
   */
  const handleCreateNewTask = () => {
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
  };

  /**
   * handleTaskTitleChange
   * 
   * Maneja el cambio de título de una tarea.
   * 
   * @param {string} taskId - ID de la tarea a actualizar
   * @param {string} newTitle - Nuevo título de la tarea
   * @returns {void}
   */
  const handleTaskTitleChange = (taskId: string, newTitle: string) => {
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
  };

  /**
   * Crea la tarea en Supabase y limpia el estado local
   */
  const createTaskInSupabase = async (taskToCreate?: typeof draftTask) => {
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
  };

  /**
   * handleTaskTitleBlur
   * 
   * Maneja el blur del input de título de una tarea.
   * 
   * @param {string} taskId - ID de la tarea a actualizar 
   * @param {React.FocusEvent<HTMLInputElement>} e - Evento de blur
   * @returns {void}
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
   * handleTaskTitleKeyDown
   * 
   * Maneja el evento de tecla presionada en el input de título de una tarea.
   * 
   * @param {React.KeyboardEvent} e - Evento de teclado 
   * @param {string} taskId - ID de la tarea a actualizar 
   * @returns {void}
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
              {upcomingTasks.length > 0 && (
                <span className="ml-0.5 sm:ml-1">({upcomingTasks.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="flex-1 py-2 px-1 sm:px-2 sm:py-1.5 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors text-xs sm:text-sm min-w-0"
            >
              <span className="hidden md:inline">Overdue</span>
              <span className="md:hidden truncate">Over</span>
              {overdueTasks.length > 0 && (
                <span className="ml-0.5 sm:ml-1">({overdueTasks.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="flex-1 py-2 px-1 sm:px-2 sm:py-1.5 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors text-xs sm:text-sm min-w-0"
            >
              <span className="hidden md:inline">Completed</span>
              <span className="md:hidden truncate">Done</span>
              {completedTasks.length > 0 && (
                <span className="ml-0.5 sm:ml-1">({completedTasks.length})</span>
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
                {upcomingTasks.length > 0 ? (
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
                {overdueTasks.length > 0 ? (
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
                {completedTasks.length > 0 ? (
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

function TaskItem({
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
}: TaskItemProps) {
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
  const deadline = task.deadline ? parseISO(task.deadline) : undefined;

  const getDueDateDisplay = () => {
    if (!deadline) return null;

    if (isToday(deadline)) {
      return "Today";
    }
    if (isTomorrow(deadline)) {
      return "Tomorrow";
    }
    return format(deadline, "MMM d, yyyy", { locale: es });
  };

  const getDueDateColor = () => {
    if (!deadline) return "text-muted-foreground";

    if (task.display_status === "overdue" || isPast(startOfDay(deadline))) {
      return "text-red-400";
    }
    if (isToday(deadline) || isTomorrow(deadline)) {
      return "text-emerald-400";
    }
    return "text-muted-foreground";
  };

  const handleTaskSave = (updatedTask: Task) => {
    // Update all task fields in the parent component
    onTitleChange(updatedTask.id, updatedTask.title);
    if (updatedTask.deadline !== task.deadline) {
      onDeadlineChange(updatedTask.id, updatedTask.deadline);
    }
  };

  return (
    <div className="px-3 py-2 sm:py-1.5 group">
      {/* Desktop Layout */}
      <div className="hidden sm:flex items-center gap-3">
        <button
          onClick={() => onStatusChange(task.id, task.display_status === "completed" ? "upcoming" : "completed")}
          className="flex-shrink-0 hover:opacity-80 transition-opacity"
          aria-label={task.display_status === "completed" ? "Mark as incomplete" : "Mark as complete"}
        >
          <div className={cn(
            "h-5 w-5 rounded-full flex items-center justify-center transition-colors",
            task.display_status === "completed"
              ? "bg-emerald-500 border-emerald-500"
              : "border-2 border-muted-foreground hover:border-emerald-500/50 hover:bg-emerald-500/10"
          )}>
            <Check className={cn(
              "h-3 w-3",
              task.display_status === "completed"
                ? "text-white"
                : "text-muted-foreground hover:text-emerald-500/50"
            )} />
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
          ) : (
            <h3
              onDoubleClick={() => setIsEditPopupOpen(true)}
              className={cn(
                "font-medium cursor-pointer select-none truncate text-sm",
                task.display_status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
              )}
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

      {/* Mobile Layout */}
      <div className="sm:hidden">
        {/* Top Row: Check button + Title */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => onStatusChange(task.id, task.display_status === "completed" ? "upcoming" : "completed")}
            className="flex-shrink-0 hover:opacity-80 transition-opacity p-1 -m-1"
            aria-label={task.display_status === "completed" ? "Mark as incomplete" : "Mark as complete"}
          >
            <div className={cn(
              "h-5 w-5 rounded-full flex items-center justify-center transition-colors",
              task.display_status === "completed"
                ? "bg-emerald-500 border-emerald-500"
                : "border-2 border-muted-foreground hover:border-emerald-500/50 hover:bg-emerald-500/10"
            )}>
              <Check className={cn(
                "h-3 w-3",
                task.display_status === "completed"
                  ? "text-white"
                  : "text-muted-foreground hover:text-emerald-500/50"
              )} />
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
            ) : (
              <h3
                onDoubleClick={() => setIsEditPopupOpen(true)}
                className={cn(
                  "font-medium cursor-pointer select-none truncate text-sm",
                  task.display_status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
                )}
              >
                {task.title}
              </h3>
            )}
          </div>
        </div>

        {/* Bottom Row: Date + Tag (indented to align with title) */}
        <div className="ml-8 flex items-center gap-2">
          <DeadlinePopup
            date={deadline}
            onSelect={(date) => onDeadlineChange(task.id, date?.toISOString())}
          >
            <button
              className={cn(
                "flex items-center gap-1 hover:opacity-80 transition-opacity text-xs p-1 -m-1",
                getDueDateColor()
              )}
            >
              <Calendar className="h-3 w-3" />
              {deadline && (
                <span className="text-xs">{getDueDateDisplay()}</span>
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
        onClose={() => setIsEditPopupOpen(false)}
        onSave={onTaskUpdate}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        allTasks={allTasks}
      />
    </div>
  );
}
