import { Check, Circle, Plus, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DeadlinePopup } from "./deadline-popup";
import { format, isToday, isTomorrow, parseISO, isPast, startOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import { CreateTaskDialog } from "./create-task-dialog";

interface Task {
  id: string;
  title: string;
  deadline?: string; // ISO string
  contact: string;
  description?: string;
  status: "upcoming" | "overdue" | "completed";
  type: "follow-up" | "respond" | "task";
  tag?: string; // For tags like "LATAM"
  hasCalendar?: boolean;
}

// Sample task data
const initialTasks: Task[] = [
  {
    id: "1",
    title: "Ivan Seguimiento",
    contact: "Ivan",
    status: "upcoming",
    type: "follow-up"
  },
  {
    id: "2",
    title: "QBR's",
    contact: "",
    status: "upcoming",
    type: "task",
    tag: "LATAM"
  },
  {
    id: "3",
    title: "Seguimiento a Leandro",
    contact: "",
    status: "upcoming",
    type: "follow-up",
    tag: "LATAM"
  },
  {
    id: "4",
    title: "Viaje CDMX",
    contact: "",
    status: "upcoming",
    type: "task"
  },
  {
    id: "5",
    title: "Platica o 1-a-1 con Vivek",
    contact: "",
    status: "upcoming",
    type: "task"
  }
];

export function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // Check for overdue tasks
  const checkOverdueTasks = () => {
    const now = new Date();
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.status === "completed" || !task.deadline) return task;

        const deadlineDate = parseISO(task.deadline);
        // Compare with start of current day to match the calendar date concept
        if (isPast(startOfDay(deadlineDate)) && task.status !== "overdue") {
          return { ...task, status: "overdue" };
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

  const upcomingTasks = tasks.filter(task => task.status === "upcoming");
  const overdueTasks = tasks.filter(task => task.status === "overdue");
  const completedTasks = tasks.filter(task => task.status === "completed");

  const handleTaskStatusChange = (taskId: string, newStatus: Task["status"]) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
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
            return { ...task, deadline, status: "overdue" };
          }
          // If task was overdue but new deadline is in the future, move back to upcoming
          if (task.status === "overdue" && !isPast(startOfDay(deadlineDate))) {
            return { ...task, deadline, status: "upcoming" };
          }
        }

        return { ...task, deadline };
      })
    );
  };

  const handleCreateTask = (newTask: {
    title: string;
    deadline?: string;
    type: "follow-up" | "respond" | "task";
    tag?: string;
  }) => {
    const task: Task = {
      id: crypto.randomUUID(),
      title: newTask.title,
      deadline: newTask.deadline,
      contact: "",
      // Check if the task is overdue when creating
      status: newTask.deadline && isPast(startOfDay(parseISO(newTask.deadline)))
        ? "overdue"
        : "upcoming",
      type: newTask.type,
      tag: newTask.tag
    };

    setTasks(prev => [...prev, task]);
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
          <CreateTaskDialog onCreateTask={handleCreateTask} />
        </div>

        <div className="overflow-y-auto flex-1">
          <TabsContent value="upcoming" className="m-0">
            {upcomingTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={handleTaskStatusChange}
                onDeadlineChange={handleDeadlineChange}
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
  onStatusChange: (taskId: string, newStatus: Task["status"]) => void;
  onDeadlineChange: (taskId: string, deadline: string | undefined) => void;
}

function TaskItem({ task, onStatusChange, onDeadlineChange }: TaskItemProps) {
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

    if (task.status === "overdue" || isPast(startOfDay(deadline))) {
      return "text-red-400";
    }
    if (isToday(deadline) || isTomorrow(deadline)) {
      return "text-emerald-400";
    }
    return "text-muted-foreground";
  };

  const handleDeadlineChange = (date: Date | undefined) => {
    onDeadlineChange(task.id, date?.toISOString());
  };

  return (
    <div className="px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onStatusChange(task.id, task.status === "completed" ? "upcoming" : "completed")}
          className="flex-shrink-0 hover:opacity-80 transition-opacity"
          aria-label={task.status === "completed" ? "Mark as incomplete" : "Mark as complete"}
        >
          {task.status === "completed" ? (
            <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center bg-primary">
              <Check className="h-3 w-3 text-primary-foreground" />
            </div>
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        <div className="flex-1">
          <h3 className={cn(
            "font-medium",
            task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
          )}>
            {task.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {task.tag && (
            <span className="px-3 py-1 bg-primary/10 text-primary rounded text-sm">
              {task.tag}
            </span>
          )}
          <DeadlinePopup
            date={deadline}
            onSelect={handleDeadlineChange}
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
    </div>
  );
}
