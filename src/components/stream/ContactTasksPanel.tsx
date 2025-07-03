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

interface ContactTasksPanelProps {
  contactId: string;
  contactName?: string;
}

export function ContactTasksPanel({ contactId, contactName }: ContactTasksPanelProps) {
  const { user } = useAuth();
  const store = useStore();
  const { tasks: allTasks, loading: { fetching: isLoading }, createTask, updateTask, deleteTask } = store;
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Estado para la tarea en borrador (igual que en tasks-panel)
  const [draftTask, setDraftTask] = useState<{
    id: string;
    title: string;
    deadline?: string;
  } | null>(null);
  
  // Estado para indicar si se está creando una tarea
  const [isTaskBeingCreated, setIsTaskBeingCreated] = useState(false);
  
  // Ref para el input de nueva tarea
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // Filter tasks for this contact
  const contactTasks = useMemo(() => {
    return allTasks.filter(task => task.contact === contactId);
  }, [allTasks, contactId]);

  // Separate tasks by status with draft task logic
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
  
  const overdueTasks = useMemo(() => 
    contactTasks.filter(task => task.display_status === "overdue"),
    [contactTasks]
  );
  
  const completedTasks = useMemo(() => 
    contactTasks.filter(task => task.display_status === "completed"),
    [contactTasks]
  );

  const handleTaskStatusChange = (taskId: string, newStatus: Task["display_status"]) => {
    const taskToUpdate = contactTasks.find(task => task.id === taskId);
    if (taskToUpdate && user) {
      updateTask({
        ...taskToUpdate,
        display_status: newStatus,
      });
    }
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    if (!user) return;
    updateTask({
      ...updatedTask,
    });
  };

  const handleTaskDelete = (taskId: string) => {
    deleteTask(taskId);
  };

  // Crear tarea temporal en estado local (igual que en tasks-panel)
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

  // Crear la tarea en Supabase y limpiar el estado local
  const createTaskInSupabase = async () => {
    if (!draftTask || !draftTask.title.trim()) return;

    try {
      // Limpiar estado local antes de crear en Supabase
      const taskToCreate = { ...draftTask };
      setDraftTask(null);
      setIsTaskBeingCreated(false);

      await createTask({
        title: taskToCreate.title,
        deadline: taskToCreate.deadline || null,
        contact: contactId, // Automáticamente ligada al contacto
        type: 'task',
        display_status: 'upcoming',
        status: 'on-track',
        description: null,
        tag: null,
        priority: 'medium'
      });
    } catch (error) {
      // El error ya se maneja en el store
    }
  };

  // Manejar cambio de título
  const handleTaskTitleChange = (taskId: string, newTitle: string) => {
    // Si es la tarea en borrador, actualizar estado local
    if (draftTask && taskId === draftTask.id) {
      setDraftTask(prev => prev ? { ...prev, title: newTitle } : null);
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

  // Manejar blur del input
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

  // Manejar teclas en el input
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

  // Manejar cambio de deadline
  const handleDeadlineChange = (taskId: string, deadline: string | undefined) => {
    // Si es la tarea en borrador, actualizar estado local
    if (draftTask && taskId === draftTask.id) {
      setDraftTask(prev => prev ? { ...prev, deadline } : null);
      
      // NO crear automáticamente en Supabase aquí, solo actualizar el estado local
      // La tarea se creará cuando el usuario haga blur o presione Enter
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

  const handleTaskDoubleClick = (task: Task) => {
    setEditingTask(task);
  };

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

      <Tabs defaultValue="upcoming">
        <TabsList className="w-full flex p-0 bg-transparent h-auto mb-2">
          <TabsTrigger
            value="upcoming"
            className="flex-1 py-1 px-2 text-xs rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
          >
            Upcoming {upcomingTasks.length > 0 && `(${upcomingTasks.length})`}
          </TabsTrigger>
          <TabsTrigger
            value="overdue"
            className="flex-1 py-1 px-2 text-xs rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
          >
            Overdue {overdueTasks.length > 0 && `(${overdueTasks.length})`}
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="flex-1 py-1 px-2 text-xs rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
          >
            Done {completedTasks.length > 0 && `(${completedTasks.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="m-0">
          <div className="h-[280px] overflow-y-auto pr-2 border border-gray-200 rounded">
            {upcomingTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 px-2">No upcoming tasks</p>
            ) : (
              upcomingTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  isNew={isTaskBeingCreated && task.id === draftTask?.id}
                  inputRef={isTaskBeingCreated && task.id === draftTask?.id ? newTaskInputRef : undefined}
                  onDoubleClick={handleTaskDoubleClick}
                  onTitleChange={handleTaskTitleChange}
                  onTitleBlur={handleTaskTitleBlur}
                  onTitleKeyDown={handleTaskTitleKeyDown}
                  onDeadlineChange={handleDeadlineChange}
                  onStatusChange={handleTaskStatusChange}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="overdue" className="m-0">
          <div className="h-[280px] overflow-y-auto pr-2 border border-gray-200 rounded">
            {overdueTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 px-2">No overdue tasks</p>
            ) : (
              overdueTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  isNew={false}
                  onDoubleClick={handleTaskDoubleClick}
                  onTitleChange={handleTaskTitleChange}
                  onTitleBlur={handleTaskTitleBlur}
                  onTitleKeyDown={handleTaskTitleKeyDown}
                  onDeadlineChange={handleDeadlineChange}
                  onStatusChange={handleTaskStatusChange}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="m-0">
          <div className="h-[280px] overflow-y-auto pr-2 border border-gray-200 rounded">
            {completedTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 px-2">No completed tasks</p>
            ) : (
              completedTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  isNew={false}
                  onDoubleClick={handleTaskDoubleClick}
                  onTitleChange={handleTaskTitleChange}
                  onTitleBlur={handleTaskTitleBlur}
                  onTitleKeyDown={handleTaskTitleKeyDown}
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

interface TaskListItemProps {
  task: Task;
  isNew?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
  onStatusChange: (taskId: string, newStatus: Task["display_status"]) => void;
  onDeadlineChange: (taskId: string, deadline: string | undefined) => void;
  onTitleChange: (taskId: string, newTitle: string) => void;
  onTitleBlur: (taskId: string, e: React.FocusEvent<HTMLInputElement>) => void;
  onTitleKeyDown: (e: React.KeyboardEvent, taskId: string) => void;
  onDoubleClick: (task: Task) => void;
}

function TaskListItem({ 
  task, 
  isNew, 
  inputRef, 
  onStatusChange, 
  onDeadlineChange, 
  onTitleChange, 
  onTitleBlur, 
  onTitleKeyDown, 
  onDoubleClick 
}: TaskListItemProps) {
  const deadline = task.deadline ? parseISO(task.deadline) : undefined;

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
          ) : (
            <div onDoubleClick={() => onDoubleClick(task)}>
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