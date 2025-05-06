import { Check, Circle, Plus, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  dueDate: string;
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
    dueDate: "Today",
    status: "upcoming",
    type: "follow-up"
  },
  {
    id: "2",
    title: "QBR's",
    contact: "",
    dueDate: "Today",
    status: "upcoming",
    type: "task",
    tag: "LATAM"
  },
  {
    id: "3",
    title: "Seguimiento a Leandro",
    contact: "",
    dueDate: "Tomorrow",
    status: "upcoming",
    type: "follow-up",
    tag: "LATAM"
  },
  {
    id: "4",
    title: "Viaje CDMX",
    contact: "",
    dueDate: "Monday",
    status: "upcoming",
    type: "task"
  },
  {
    id: "5",
    title: "Platica o 1-a-1 con Vivek",
    contact: "",
    dueDate: "May 9",
    status: "upcoming",
    type: "task"
  }
];

export function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

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
          <button className="w-full text-left text-muted-foreground flex items-center gap-2 py-2 hover:text-foreground transition-colors">
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
                onStatusChange={handleTaskStatusChange}
              />
            ))}
          </TabsContent>

          <TabsContent value="overdue" className="m-0">
            {overdueTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={handleTaskStatusChange}
              />
            ))}
          </TabsContent>

          <TabsContent value="completed" className="m-0">
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={handleTaskStatusChange}
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
}

function TaskItem({ task, onStatusChange }: TaskItemProps) {
  const getDueDateColor = (dueDate: string) => {
    if (dueDate.toLowerCase() === 'today' || dueDate.toLowerCase() === 'tomorrow') {
      return 'text-emerald-400';
    }
    if (task.status === 'overdue') {
      return 'text-red-400';
    }
    return 'text-muted-foreground';
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
          <span className={cn("flex items-center gap-1", getDueDateColor(task.dueDate))}>
            {task.hasCalendar && <Calendar className="h-4 w-4" />}
            {task.dueDate}
          </span>
        </div>
      </div>
    </div>
  );
}
