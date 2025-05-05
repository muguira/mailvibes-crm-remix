import { Check, Circle, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface Task {
  id: string;
  title: string;
  dueDate: string;
  contact: string;
  description?: string;
  status: "upcoming" | "overdue" | "completed";
  type: "follow-up" | "respond" | "task";
  tag?: string; // For tags like "LATAM"
}

// Sample task data
const tasks: Task[] = [
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
  return (
    <div className="bg-background text-foreground rounded-lg overflow-hidden h-full flex flex-col shadow-relate">
      <div className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium" />
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          My tasks
          <span className="text-muted-foreground">🔒</span>
        </h2>
      </div>

      <Tabs defaultValue="upcoming" className="flex-1">
        <div className="border-none">
          <TabsList className="w-full flex p-0 bg-transparent">
            <TabsTrigger
              value="upcoming"
              className="flex-1 py-3 border data-[state=active]:border-primary rounded-none bg-transparent data-[state=active]:text-foreground"
            >
              Upcoming
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="flex-1 py-3 border data-[state=active]:border-primary rounded-none bg-transparent data-[state=active]:text-foreground"
            >
              Overdue (43)
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="flex-1 py-3 border data-[state=active]:border-primary rounded-none bg-transparent data-[state=active]:text-foreground"
            >
              Completed
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
            {tasks
              .filter(task => task.status === "upcoming")
              .map((task) => (
                <TaskItem key={task.id} task={task} />
              ))
            }
          </TabsContent>

          <TabsContent value="overdue" className="m-0">
            {tasks
              .filter(task => task.status === "overdue")
              .map((task) => (
                <TaskItem key={task.id} task={task} />
              ))
            }
          </TabsContent>

          <TabsContent value="completed" className="m-0">
            {tasks
              .filter(task => task.status === "completed")
              .map((task) => (
                <TaskItem key={task.id} task={task} />
              ))
            }
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function TaskItem({ task }: { task: Task }) {
  const [isCompleted, setIsCompleted] = useState(task.status === "completed");

  const handleToggleComplete = () => {
    setIsCompleted(!isCompleted);
    // Here you would typically make an API call to update the task status
    // For now, we'll just update the local state
  };

  return (
    <div className="px-4 py-3 border-b border-border hover:bg-accent/5 transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggleComplete}
          className="flex-shrink-0 hover:opacity-80 transition-opacity"
          aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
        >
          {isCompleted ? (
            <Check className="h-5 w-5 text-primary" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        <div className="flex-1">
          <h3 className={`text-foreground font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {task.tag && (
            <span className="px-3 py-1 bg-primary/10 text-primary rounded text-sm">
              {task.tag}
            </span>
          )}
          <span className="text-primary">{task.dueDate}</span>
        </div>
      </div>
    </div>
  );
}
