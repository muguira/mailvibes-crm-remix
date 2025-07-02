import React, { useState, useMemo } from "react";
import { Check, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTasks } from "@/hooks/supabase/use-tasks";
import { useAuth } from "@/contexts/AuthContext";
import { Task } from "@/types/task";
import { TaskEditPopup } from "@/components/home/task-edit-popup";
import { DeadlinePopup } from "@/components/home/deadline-popup";
import { format, isToday, isTomorrow, parseISO, isPast, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ContactTasksPanelProps {
  contactId: string;
  contactName?: string;
}

export function ContactTasksPanel({ contactId, contactName }: ContactTasksPanelProps) {
  const { user } = useAuth();
  const { tasks: allTasks, isLoading, createTask, updateTask, deleteTask } = useTasks();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Filter tasks for this contact
  const contactTasks = useMemo(() => {
    return allTasks.filter(task => task.contact === contactId);
  }, [allTasks, contactId]);

  // Separate tasks by status
  const upcomingTasks = useMemo(() => 
    contactTasks.filter(task => task.display_status === "upcoming"),
    [contactTasks]
  );
  
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
        user_id: user.id
      });
    }
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    if (!user) return;
    updateTask({
      ...updatedTask,
      user_id: user.id
    });
  };

  const handleTaskDelete = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleCreateTask = () => {
    if (!user) return;
    
    createTask({
      title: `New task for ${contactName || 'contact'}`,
      contact: contactId,
      type: "task",
      display_status: "upcoming",
      status: "on-track",
      deadline: '',
      description: '',
      tag: '',
      priority: 'medium',
      user_id: user.id
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
    <div className="flex flex-col h-full">
      <div className="mb-2">
        <button
          onClick={handleCreateTask}
          className="w-full text-left text-sm text-muted-foreground flex items-center gap-2 py-2 px-2 hover:text-foreground hover:bg-slate-50 rounded transition-colors"
          disabled={!user}
        >
          <Plus size={14} />
          Create task
        </button>
      </div>

      <Tabs defaultValue="upcoming" className="flex-1 flex flex-col">
        <TabsList className="w-full flex p-0 bg-transparent h-auto">
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

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="upcoming" className="m-0 p-2">
            {upcomingTasks.length > 0 ? (
              <div className="space-y-1">
                {upcomingTasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    onStatusChange={handleTaskStatusChange}
                    onDoubleClick={handleTaskDoubleClick}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                No upcoming tasks
              </div>
            )}
          </TabsContent>

          <TabsContent value="overdue" className="m-0 p-2">
            {overdueTasks.length > 0 ? (
              <div className="space-y-1">
                {overdueTasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    onStatusChange={handleTaskStatusChange}
                    onDoubleClick={handleTaskDoubleClick}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                No overdue tasks
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="m-0 p-2">
            {completedTasks.length > 0 ? (
              <div className="space-y-1">
                {completedTasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    onStatusChange={handleTaskStatusChange}
                    onDoubleClick={handleTaskDoubleClick}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                No completed tasks
              </div>
            )}
          </TabsContent>
        </div>
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
        />
      )}
    </div>
  );
}

interface TaskListItemProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: Task["display_status"]) => void;
  onDoubleClick: (task: Task) => void;
}

function TaskListItem({ task, onStatusChange, onDoubleClick }: TaskListItemProps) {
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
        
        <div 
          className="flex-1 min-w-0"
          onDoubleClick={() => onDoubleClick(task)}
        >
          <h4 className={cn(
            "text-sm font-medium truncate",
            task.display_status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
          )}>
            {task.title}
          </h4>
          {deadline && (
            <p className={cn("text-xs mt-0.5", getDueDateColor())}>
              {getDueDateDisplay()}
            </p>
          )}
        </div>

        {task.type && task.type !== "task" && (
          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs capitalize flex-shrink-0">
            {task.type === "follow-up" ? "Follow Up" : task.type.replace(/-/g, ' ')}
          </span>
        )}
      </div>
    </div>
  );
} 