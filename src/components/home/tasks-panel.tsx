import { Check, Circle, Plus, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { DeadlinePopup } from "./deadline-popup";
import { format, isToday, isTomorrow, parseISO, isPast, startOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import { TaskEditPopup } from "./task-edit-popup";

export interface Task {
  id: string;
  title: string;
  deadline?: string; // ISO string
  contact: string;
  description?: string;
  displayStatus: "upcoming" | "overdue" | "completed";
  status: "on-track" | "at-risk" | "off-track";
  type: "follow-up" | "respond" | "task" | "cross-functional";
  tag?: string; // For tags like "LATAM"
  hasCalendar?: boolean;
  priority?: "low" | "medium" | "high";
}

// Sample task data
const initialTasks: Task[] = [
  {
    id: "1",
    title: "Ivan Seguimiento",
    contact: "Ivan",
    displayStatus: "upcoming",
    status: "on-track",
    type: "follow-up"
  },
  {
    id: "2",
    title: "QBR's",
    contact: "",
    displayStatus: "upcoming",
    status: "on-track",
    type: "task",
    tag: "LATAM"
  },
  {
    id: "3",
    title: "Seguimiento a Leandro",
    contact: "",
    displayStatus: "upcoming",
    status: "on-track",
    type: "follow-up",
    tag: "LATAM"
  },
  {
    id: "4",
    title: "Viaje CDMX",
    contact: "",
    displayStatus: "upcoming",
    status: "on-track",
    type: "task"
  },
  {
    id: "5",
    title: "Platica o 1-a-1 con Vivek",
    contact: "",
    displayStatus: "upcoming",
    status: "on-track",
    type: "task"
  }
];

export function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // Check for overdue tasks
  const checkOverdueTasks = () => {
    const now = new Date();
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.displayStatus === "completed" || !task.deadline) return task;

        const deadlineDate = parseISO(task.deadline);
        // Compare with start of current day to match the calendar date concept
        if (isPast(startOfDay(deadlineDate)) && task.displayStatus !== "overdue") {
          return { ...task, displayStatus: "overdue" };
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
  }, []);

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

  const upcomingTasks = sortTasksByDate(tasks.filter(task => task.displayStatus === "upcoming"), isCreatingTask);
  const overdueTasks = sortTasksByDate(tasks.filter(task => task.displayStatus === "overdue"), false);
  const completedTasks = sortTasksByDate(tasks.filter(task => task.displayStatus === "completed"), false);

  const handleTaskStatusChange = (taskId: string, newStatus: Task["displayStatus"]) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, displayStatus: newStatus } : task
      )
    );
  };

  const handleDeadlineChange = (taskId: string, deadline: string | undefined) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id !== taskId) return task;

        // When setting a new deadline, check if it's already overdue
        if (deadline) {
          const deadlineDate = parseISO(deadline);
          if (isPast(startOfDay(deadlineDate))) {
            return { ...task, deadline, displayStatus: "overdue" };
          }
          // If task was overdue but new deadline is in the future, move back to upcoming
          if (task.displayStatus === "overdue" && !isPast(startOfDay(deadlineDate))) {
            return { ...task, deadline, displayStatus: "upcoming" };
          }
        }

        return { ...task, deadline };
      })
    );
  };

  const handleCreateNewTask = () => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: "",
      contact: "",
      displayStatus: "upcoming",
      status: "on-track",
      type: "task"
    };
    setTasks(prev => [newTask, ...prev]);
    setIsCreatingTask(true);
    // Focus the input on the next render
    setTimeout(() => {
      newTaskInputRef.current?.focus();
    }, 0);
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
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      )
    );
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  return (
    <div className="bg-background text-foreground rounded-lg overflow-hidden h-full flex flex-col shadow-lg">
      <div className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {/* Add your profile image here */}
          <div className="w-full h-full bg-muted-foreground/20" />
        </div>
        <h2 className="text-2xl font-semibold">My tasks</h2>
      </div>

      <Tabs defaultValue="upcoming" className="flex-1">
        <div className="border-none">
          <TabsList className="w-full flex p-0 bg-transparent border-b border-border">
            <TabsTrigger
              value="upcoming"
              className="flex-1 py-3 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
            >
              Upcoming {upcomingTasks.length > 0 && `(${upcomingTasks.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="flex-1 py-3 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
            >
              Overdue {overdueTasks.length > 0 && `(${overdueTasks.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="flex-1 py-3 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
            >
              Completed {completedTasks.length > 0 && `(${completedTasks.length})`}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-4 border-b border-border">
          <button
            className="w-full text-left text-muted-foreground flex items-center gap-2 py-2 hover:text-foreground transition-colors"
            onClick={handleCreateNewTask}
            disabled={isCreatingTask}
          >
            <Plus size={20} />
            Create task
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <TabsContent value="upcoming" className="m-0">
            {upcomingTasks.map((task) => (
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
            ))}
          </TabsContent>

          <TabsContent value="overdue" className="m-0">
            {overdueTasks.map((task) => (
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
            ))}
          </TabsContent>

          <TabsContent value="completed" className="m-0">
            {completedTasks.map((task) => (
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
            ))}
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
  onStatusChange: (taskId: string, newStatus: Task["displayStatus"]) => void;
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

    if (task.displayStatus === "overdue" || isPast(startOfDay(deadline))) {
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
    <div className="px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onStatusChange(task.id, task.displayStatus === "completed" ? "upcoming" : "completed")}
          className="flex-shrink-0 hover:opacity-80 transition-opacity"
          aria-label={task.displayStatus === "completed" ? "Mark as incomplete" : "Mark as complete"}
        >
          <div className={cn(
            "h-5 w-5 rounded-full flex items-center justify-center transition-colors",
            task.displayStatus === "completed"
              ? "bg-emerald-500 border-emerald-500"
              : "border-2 border-muted-foreground hover:border-emerald-500/50 hover:bg-emerald-500/10"
          )}>
            <Check className={cn(
              "h-3 w-3",
              task.displayStatus === "completed"
                ? "text-white"
                : "text-muted-foreground hover:text-emerald-500/50"
            )} />
          </div>
        </button>
        <div className="flex-1">
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
                "font-medium cursor-pointer select-none",
                task.displayStatus === "completed" ? "line-through text-muted-foreground" : "text-foreground"
              )}
            >
              {task.title}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.tag && (
            <span className="px-3 py-1 bg-primary/10 text-primary rounded text-sm">
              {task.tag}
            </span>
          )}
          <DeadlinePopup
            date={deadline}
            onSelect={(date) => onDeadlineChange(task.id, date?.toISOString())}
          >
            <button
              className={cn(
                "flex items-center gap-1 hover:opacity-80 transition-opacity",
                getDueDateColor()
              )}
            >
              {deadline ? (
                getDueDateDisplay()
              ) : (
                <Calendar className="h-4 w-4" />
              )}
            </button>
          </DeadlinePopup>
        </div>
      </div>
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
