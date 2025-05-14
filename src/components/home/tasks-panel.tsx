import { Check, Plus, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { DeadlinePopup } from "./deadline-popup";
import { format, isToday, isTomorrow, parseISO, isPast, startOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import { TaskEditPopup } from "./task-edit-popup";
import { useTasks, TaskData } from "@/hooks/supabase/use-tasks";
import { useAuth } from "@/contexts/AuthContext";
import { Task } from "@/types/task"; // Import the unified Task type

// Export the Task interface from the unified type
export type { Task };

export function TasksPanel() {
  const { user } = useAuth();
  const { tasks: supabaseTasks, isLoading, createTask, updateTask, deleteTask } = useTasks();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // Transform Supabase tasks to our Task interface format
  useEffect(() => {
    if (supabaseTasks) {
      const formattedTasks = supabaseTasks.map((task) => ({
        id: task.id,
        title: task.title,
        deadline: task.deadline,
        contact: task.contact || '',
        description: task.description,
        display_status: task.display_status as Task['display_status'],
        displayStatus: task.display_status as Task['display_status'], // Add for backward compatibility
        status: task.status as Task['status'],
        type: task.type as Task['type'],
        tag: task.tag,
        priority: task.priority as Task['priority'],
        user_id: task.user_id
      }));
      setTasks(formattedTasks);
    }
  }, [supabaseTasks]);

  // Check for overdue tasks
  const checkOverdueTasks = () => {
    const now = new Date();
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.display_status === "completed" || !task.deadline) return task;

        const deadlineDate = parseISO(task.deadline);
        // Compare with start of current day to match the calendar date concept
        if (isPast(startOfDay(deadlineDate)) && task.display_status !== "overdue") {
          return { 
            ...task, 
            display_status: "overdue",
            displayStatus: "overdue" // Update both fields for compatibility
          };
        }
        return task;
      })
    );
  };

  // Check for overdue tasks on mount and every minute
  useEffect(() => {
    checkOverdueTasks();
    const interval = setInterval(checkOverdueTasks, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []); // Empty dependency array to run only on mount

  const sortTasksByDate = (tasks: Task[], isEditing: boolean) => {
    const today = startOfDay(new Date());

    return [...tasks].sort((a, b) => {
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

  const upcomingTasks = sortTasksByDate(tasks.filter(task => task.display_status === "upcoming"), isCreatingTask);
  const overdueTasks = sortTasksByDate(tasks.filter(task => task.display_status === "overdue"), false);
  const completedTasks = sortTasksByDate(tasks.filter(task => task.display_status === "completed"), false);

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
        priority: taskToUpdate.priority,
        user_id: user?.id // Add user ID here
      });
    }
  };

  const handleDeadlineChange = (taskId: string, deadline: string | undefined) => {
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
      user_id: user?.id // Add user ID here
    });
  };

  const handleCreateNewTask = () => {
    if (!user) return; // Don't allow creating tasks if not logged in

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: "",
      contact: "",
      display_status: "upcoming",
      displayStatus: "upcoming", // For compatibility
      status: "on-track",
      type: "task",
      user_id: user.id
    };
    setTasks(prev => [newTask, ...prev]);
    setIsCreatingTask(true);
    // Focus the input on the next render
    setTimeout(() => {
      newTaskInputRef.current?.focus();
    }, 0);
  };

  const handleCreateTask = (task: {
    title: string;
    deadline?: string;
    type: "follow-up" | "respond" | "task";
    tag?: string;
  }) => {
    if (!user) return; // Don't allow creating tasks if not logged in

    createTask({
      title: task.title,
      deadline: task.deadline || '',
      type: task.type,
      tag: task.tag || '',
      display_status: "upcoming",
      status: "on-track",
      user_id: user.id // Add user ID here
    });
  };

  const handleTaskTitleChange = (taskId: string, newTitle: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, title: newTitle }
          : task
      )
    );
  };

  const handleTaskTitleBlur = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);

    if (task && task.title.trim() !== "" && user) {
      // Create new task in Supabase
      createTask({
        title: task.title,
        type: task.type,
        display_status: "upcoming",
        status: "on-track",
        contact: '',
        deadline: '',
        description: '',
        tag: '',
        priority: 'medium',
        user_id: user.id
      });
    }

    setTasks(prev => prev.filter(task =>
      task.id !== taskId || (task.id === taskId && task.title.trim() !== "")
    ));

    setIsCreatingTask(false);
  };

  const handleTaskTitleKeyDown = (e: React.KeyboardEvent, taskId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setTasks(prev => prev.filter(task => task.id !== taskId));
      setIsCreatingTask(false);
    }
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    if (!user) return;

    updateTask({
      id: updatedTask.id,
      title: updatedTask.title,
      deadline: updatedTask.deadline || '',
      contact: updatedTask.contact || '',
      description: updatedTask.description || '',
      display_status: updatedTask.display_status,
      status: updatedTask.status,
      type: updatedTask.type,
      tag: updatedTask.tag,
      priority: updatedTask.priority,
      user_id: user?.id // Add user ID here
    });
  };

  const handleTaskDelete = (taskId: string) => {
    deleteTask(taskId);
  };

  return (
    <div className="bg-background text-foreground rounded-lg overflow-hidden flex flex-col shadow-lg h-[500px]">
      <div className="p-3 pb-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {/* Add your profile image here */}
          <div className="w-full h-full bg-muted-foreground/20" />
        </div>
        <h2 className="text-xl font-semibold">My tasks</h2>
      </div>

      <Tabs defaultValue="upcoming" className="flex-1">
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

        <div className="p-2 pt-3">
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

        <div className="overflow-y-auto" style={{ height: '392px' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
          <TabsContent value="upcoming" className="m-0">
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
                onDelete={handleTaskDelete}
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
                onTaskUpdate={handleTaskUpdate}
                onDelete={handleTaskDelete}
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
                onTaskUpdate={handleTaskUpdate}
                onDelete={handleTaskDelete}
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
              onBlur={() => onTitleBlur(task.id)}
              onKeyDown={(e) => onTitleKeyDown(e, task.id)}
              className="w-full bg-transparent border-none focus:outline-none text-foreground"
              placeholder="Enter task title"
            />
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
