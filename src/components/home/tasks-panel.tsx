import { Check, Plus, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { DeadlinePopup } from "./deadline-popup";
import { format, isToday, isTomorrow, parseISO, isPast, startOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import { TaskEditPopup } from "./task-edit-popup";
import { useTasks, TaskData } from "@/hooks/supabase/use-tasks";
import { useAuth } from "@/contexts/AuthContext";
import { Task } from "@/types/task"; // Import the unified Task type
import { useActivity } from "@/contexts/ActivityContext";

// Export the Task interface from the unified type
export type { Task };

export function TasksPanel() {
  const { user } = useAuth();
  const { tasks: supabaseTasks, isLoading, createTask, updateTask, deleteTask } = useTasks();
  const { logCellEdit, logContactAdd, logColumnAdd, logColumnDelete, logFilterChange, logNoteAdd } = useActivity();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // Memoize the formatted tasks to prevent unnecessary re-renders
  const formattedTasks = useMemo(() => {
    if (!supabaseTasks || !user) return [];

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
      user_id: user.id
    }));
  }, [supabaseTasks, user]);

  // Memoize checkOverdueTasks with proper dependencies
  const checkOverdueTasks = useCallback(() => {
    const now = startOfDay(new Date());
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.display_status === "completed" || !task.deadline) return task;

        const deadlineDate = parseISO(task.deadline);
        if (isPast(now) && task.display_status !== "overdue") {
          return { ...task, display_status: "overdue" };
        }
        return task;
      })
    );
  }, []); // Empty dependency array since we use functional updates

  // Update tasks state only when formattedTasks changes
  useEffect(() => {
    if (JSON.stringify(tasks) !== JSON.stringify(formattedTasks)) {
      setTasks(formattedTasks);
    }
  }, [formattedTasks]);

  // Check for overdue tasks on mount and every minute
  useEffect(() => {
    // Initial check
    checkOverdueTasks();

    // Set up interval
    const interval = setInterval(checkOverdueTasks, 60000);

    // Cleanup
    return () => clearInterval(interval);
  }, []); // Empty dependency array since checkOverdueTasks is stable

  // Memoize sorted tasks
  const { upcomingTasks, overdueTasks, completedTasks } = useMemo(() => {
    const sortTasksByDate = (tasksToSort: Task[], isEditing: boolean) => {
      const today = startOfDay(new Date());

      return [...tasksToSort].sort((a, b) => {
        // During editing, keep the new task at the top
        if (isEditing) {
          if (a.title === "") return -1;
          if (b.title === "") return 1;
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

    return {
      upcomingTasks: sortTasksByDate(tasks.filter(task => task.display_status === "upcoming"), isCreatingTask),
      overdueTasks: sortTasksByDate(tasks.filter(task => task.display_status === "overdue"), false),
      completedTasks: sortTasksByDate(tasks.filter(task => task.display_status === "completed"), false)
    };
  }, [tasks, isCreatingTask]);

  const handleTaskStatusChange = useCallback((taskId: string, newStatus: Task["display_status"]) => {
    const taskToUpdate = tasks.find(task => task.id === taskId);
    if (taskToUpdate && user) {
      const updatedTask = {
        id: taskId,
        title: taskToUpdate.title,
        type: taskToUpdate.type,
        display_status: newStatus,
        status: taskToUpdate.status,
        user_id: user.id,
        deadline: taskToUpdate.deadline || null,
        contact: taskToUpdate.contact || null,
        description: taskToUpdate.description || null,
        tag: taskToUpdate.tag || null,
        priority: taskToUpdate.priority || null
      };

      updateTask(updatedTask);

      // Log task status change activity
      const statusChangeText = newStatus === "completed" ? "Completed task" : "Reopened task";
      logCellEdit(
        taskId,
        'status',
        newStatus,
        taskToUpdate.display_status,
        `${statusChangeText}: ${taskToUpdate.title}`
      );
    }
  }, [tasks, user, updateTask, logCellEdit]);

  const handleDeadlineChange = useCallback((taskId: string, deadline: string | undefined) => {
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
      priority: taskToUpdate.priority,
      user_id: user.id
    });
  }, [tasks, user, updateTask]);

  const handleCreateNewTask = useCallback(() => {
    if (!user || isCreatingTask) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: "",
      contact: "",
      display_status: "upcoming",
      status: "on-track",
      type: "task",
      user_id: user.id
    };

    setTasks(prev => [newTask, ...prev]);
    setIsCreatingTask(true);
    setTimeout(() => {
      newTaskInputRef.current?.focus();
    }, 0);
  }, [user, isCreatingTask]);

  const handleTaskTitleChange = useCallback((taskId: string, newTitle: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, title: newTitle }
          : task
      )
    );
  }, []);

  const handleTaskTitleBlur = useCallback((taskId: string) => {
    // On blur, do nothing - let the task stay in edit mode
    // This allows the user to keep typing without creating the task
  }, []);

  const handleTaskTitleKeyDown = useCallback((e: React.KeyboardEvent, taskId: string) => {
    const task = tasks.find(t => t.id === taskId);

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (task && task.title.trim() !== "" && user) {
        const newTask = {
          title: task.title.trim(),
          type: "task" as const,
          display_status: "upcoming" as const,
          status: "on-track" as const,
          user_id: user.id,
          contact: null,
          deadline: null,
          description: null,
          tag: null,
          priority: null
        };

        createTask(newTask);
        // Log task creation activity
        logNoteAdd(taskId, task.title, `Created new task: ${task.title}`);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setIsCreatingTask(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setIsCreatingTask(false);
    }
  }, [tasks, user, createTask, logNoteAdd]);

  const handleTaskUpdate = useCallback((updatedTask: Task) => {
    if (!user) return;

    const originalTask = tasks.find(t => t.id === updatedTask.id);
    if (!originalTask) return;

    const taskToUpdate = {
      id: updatedTask.id,
      title: updatedTask.title,
      type: updatedTask.type,
      display_status: updatedTask.display_status,
      status: updatedTask.status,
      user_id: user.id,
      deadline: updatedTask.deadline || null,
      contact: updatedTask.contact || null,
      description: updatedTask.description || null,
      tag: updatedTask.tag || null,
      priority: updatedTask.priority || null
    };

    updateTask(taskToUpdate);

    // Log changes for each modified field with descriptive messages
    if (originalTask.title !== updatedTask.title) {
      logCellEdit(
        updatedTask.id,
        'title',
        updatedTask.title,
        originalTask.title,
        `Updated task title from "${originalTask.title}" to "${updatedTask.title}"`
      );
    }
    if (originalTask.deadline !== updatedTask.deadline) {
      logCellEdit(
        updatedTask.id,
        'deadline',
        updatedTask.deadline,
        originalTask.deadline,
        `Updated task deadline for "${updatedTask.title}"`
      );
    }
    if (originalTask.contact !== updatedTask.contact) {
      logCellEdit(
        updatedTask.id,
        'contact',
        updatedTask.contact,
        originalTask.contact,
        `Updated related contact for task "${updatedTask.title}"`
      );
    }
    if (originalTask.description !== updatedTask.description) {
      logCellEdit(
        updatedTask.id,
        'description',
        updatedTask.description,
        originalTask.description,
        `Updated description for task "${updatedTask.title}"`
      );
    }
    if (originalTask.type !== updatedTask.type) {
      logCellEdit(
        updatedTask.id,
        'type',
        updatedTask.type,
        originalTask.type,
        `Changed task type from "${originalTask.type}" to "${updatedTask.type}"`
      );
    }
    if (originalTask.tag !== updatedTask.tag) {
      logCellEdit(
        updatedTask.id,
        'tag',
        updatedTask.tag,
        originalTask.tag,
        `Updated tag for task "${updatedTask.title}"`
      );
    }
    if (originalTask.priority !== updatedTask.priority) {
      logCellEdit(
        updatedTask.id,
        'priority',
        updatedTask.priority,
        originalTask.priority,
        `Changed priority from "${originalTask.priority || 'none'}" to "${updatedTask.priority || 'none'}"`
      );
    }
  }, [user, tasks, updateTask, logCellEdit]);

  const handleDeleteTask = useCallback((taskId: string) => {
    const taskToDelete = tasks.find(task => task.id === taskId);
    if (taskToDelete) {
      deleteTask(taskId);
      // Log task deletion activity
      logCellEdit(
        taskId,
        'status',
        'deleted',
        taskToDelete.display_status,
        `Deleted task: ${taskToDelete.title}`
      );
    }
  }, [tasks, deleteTask, logCellEdit]);

  if (isLoading) {
    return (
      <div className="bg-background text-foreground rounded-lg overflow-hidden flex flex-col shadow-lg h-[500px]">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground rounded-lg overflow-hidden flex flex-col shadow-lg h-[500px]">
      <div className="p-3 pb-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          <div className="w-full h-full bg-muted-foreground/20" />
        </div>
        <h2 className="text-xl font-semibold">My tasks</h2>
      </div>

      <Tabs defaultValue="upcoming" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-none">
          <TabsList className="w-full flex p-0 bg-transparent">
            <TabsTrigger
              value="upcoming"
              className="flex-1 py-1.5 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
            >
              Upcoming {upcomingTasks.length > 0 && `(${upcomingTasks.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="flex-1 py-1.5 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
            >
              Overdue {overdueTasks.length > 0 && `(${overdueTasks.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="flex-1 py-1.5 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
            >
              Completed {completedTasks.length > 0 && `(${completedTasks.length})`}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-2 pt-3 border-b">
          {user ? (
            <>
              <button
                className="w-full text-left text-muted-foreground flex items-center gap-2 py-1 hover:text-foreground transition-colors"
                onClick={handleCreateNewTask}
                disabled={isCreatingTask}
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

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="upcoming" className="m-0 h-full">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isNew={isCreatingTask && task.id === upcomingTasks[0]?.id}
                  inputRef={isCreatingTask && task.id === upcomingTasks[0]?.id ? newTaskInputRef : undefined}
                  onStatusChange={handleTaskStatusChange}
                  onDeadlineChange={handleDeadlineChange}
                  onTitleChange={handleTaskTitleChange}
                  onTitleBlur={handleTaskTitleBlur}
                  onTitleKeyDown={handleTaskTitleKeyDown}
                  onTaskUpdate={handleTaskUpdate}
                  onDelete={handleDeleteTask}
                  allTasks={tasks}
                />
              ))
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">
                No upcoming tasks
              </div>
            )}
          </TabsContent>

          <TabsContent value="overdue" className="m-0 h-full">
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
                  onTaskUpdate={handleTaskUpdate}
                  onDelete={handleDeleteTask}
                  allTasks={tasks}
                />
              ))
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">
                No overdue tasks
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="m-0 h-full">
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
                  onTaskUpdate={handleTaskUpdate}
                  onDelete={handleDeleteTask}
                  allTasks={tasks}
                />
              ))
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">
                No completed tasks
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  isNew?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
  onStatusChange: (taskId: string, newStatus: Task["display_status"]) => void;
  onDeadlineChange: (taskId: string, deadline: string | undefined) => void;
  onTitleChange: (taskId: string, newTitle: string) => void;
  onTitleBlur: (taskId: string) => void;
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
    <div className="px-3 py-1.5 group">
      <div className="flex items-center gap-3">
        {!isNew && (
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
        )}
        <div className="flex-1 min-w-0">
          {isNew ? (
            <div className="flex items-center gap-2 w-full">
              <input
                ref={inputRef}
                type="text"
                value={task.title}
                onChange={(e) => onTitleChange(task.id, e.target.value)}
                onBlur={() => onTitleBlur(task.id)}
                onKeyDown={(e) => onTitleKeyDown(e, task.id)}
                className="w-full bg-transparent border-none focus:outline-none text-foreground"
                placeholder="Enter task title and press Enter to create"
                autoFocus
              />
            </div>
          ) : (
            <h3
              onDoubleClick={() => setIsEditPopupOpen(true)}
              className={cn(
                "font-medium cursor-pointer select-none truncate",
                task.display_status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
              )}
            >
              {task.title}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {task.type && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs capitalize">
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
