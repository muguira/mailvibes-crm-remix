import {  useRef, useEffect, useState } from "react";
import {  Plus, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/stores";
import { useAuth } from "@/contexts/AuthContext";
import { Task } from "@/types/task"; // Import the unified Task type
import { Skeleton } from "@/components/ui/skeleton";
import { TaskItem } from "./Task-Item";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DeadlinePopup } from "./deadline-popup";

// Export the Task interface from the unified type
export type { Task };

export function TasksPanel() {
  const { user } = useAuth();
  const {
    // State
    isTaskBeingCreated,
    categorizedTasks,
    localTasks,
    loading,
    isInitialized,
    // Actions
    setIsTaskBeingCreated,
    initialize,
    createTask,
    updateTask,
    deleteTask,
    changeTaskStatus,
    changeTaskDeadline,
    addLocalTask,
    removeLocalTask,
    updateLocalTask,
    getTaskById,
  } = useStore();

  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const newTaskCalendarRef = useRef<HTMLButtonElement>(null);
  const newTaskContainerRef = useRef<HTMLDivElement>(null);
  
  // Local state for the new task being created
  const [newTaskId, setNewTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState<string | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Initialize tasks when component mounts and user is available
  useEffect(() => {
    if (user?.id && !isInitialized) {
      initialize(user.id);
    }
  }, [user?.id, isInitialized, initialize]);

  // Focus the input when a new task is being created
  useEffect(() => {
    if (isTaskBeingCreated && newTaskInputRef.current) {
      setTimeout(() => {
        newTaskInputRef.current?.focus();
      }, 100);
    }
  }, [isTaskBeingCreated]);

  // Handle click outside of the new task input and calendar button
  useEffect(() => {
    /**
     * Handle click outside of the new task input and calendar button
     * @param event - The mouse event
     */
    function handleClickOutside(event: MouseEvent) {
      if (isTaskBeingCreated && !isCalendarOpen && newTaskContainerRef.current && !newTaskContainerRef.current.contains(event.target as Node)) {
        handleCreateTask();
      }
    }

    // Add event listener to document
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup function to remove the event listener when the component unmounts
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTaskBeingCreated, newTaskTitle, newTaskDeadline, isCalendarOpen]);

  // Get categorized tasks from store
  const upcomingTasks = categorizedTasks.upcoming;
  const overdueTasks = categorizedTasks.overdue;
  const completedTasks = categorizedTasks.completed;

  // Combine upcoming tasks with local tasks for display
  const displayUpcomingTasks = [...localTasks, ...upcomingTasks];

  const handleTaskStatusChange = async (taskId: string, newStatus: Task["display_status"]) => {
    try {
      await changeTaskStatus(taskId, newStatus);
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const handleDeadlineChange = async (taskId: string, deadline: string | undefined) => {
    try {
      await changeTaskDeadline(taskId, deadline);
    } catch (error) {
      console.error("Failed to update task deadline:", error);
    }
  };

  const handleCreateNewTask = () => {
    if (!user) return;

    const taskId = crypto.randomUUID();
    setNewTaskId(taskId);
    setNewTaskTitle("");
    setNewTaskDeadline(undefined);
    setIsTaskBeingCreated(true);
  };

  const handleNewTaskTitleChange = (newTitle: string) => {
    setNewTaskTitle(newTitle);
  };

  const handleNewTaskDeadlineChange = (deadline: string | undefined) => {
    setNewTaskDeadline(deadline);
  };

  const handleCalendarOpenChange = (open: boolean) => {
    setIsCalendarOpen(open);
  };

  const handleCreateTask = async () => {
    if (!user || !newTaskTitle.trim()) {
      // Cancel creation if no title
      handleCancelTaskCreation();
      return;
    }

    try {
      // Create new task in database
      await createTask({
        title: newTaskTitle.trim(),
        type: "task",
        display_status: "upcoming",
        status: "on-track",
        contact: '',
        deadline: newTaskDeadline || '',
        description: '',
        tag: '',
        priority: 'medium',
        user_id: user.id
      });
      
      // Reset state after successful creation
      handleCancelTaskCreation();
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleCancelTaskCreation = () => {
    setNewTaskId(null);
    setNewTaskTitle("");
    setNewTaskDeadline(undefined);
    setIsTaskBeingCreated(false);
  };

  const handleNewTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateTask();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancelTaskCreation();
    }
  };

  const handleTaskTitleChange = (taskId: string, newTitle: string) => {
    updateLocalTask(taskId, { title: newTitle });
  };

  const handleTaskTitleBlur = async (taskId: string) => {
    const task = getTaskById(taskId);

    if (task && task.title.trim() !== "" && user) {
      try {
        // Create new task in database
        await createTask({
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
        
        // Remove the local task after successful creation
        removeLocalTask(taskId);
        // Reset the task creation state
        setIsTaskBeingCreated(false);
      } catch (error) {
        console.error("Failed to create task:", error);
      }
    } else {
      // If task is empty or user not logged in, just remove the local task
      removeLocalTask(taskId);
      // Reset the task creation state
      setIsTaskBeingCreated(false);
    }
  };

  const handleTaskTitleKeyDown = (e: React.KeyboardEvent, taskId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      removeLocalTask(taskId);
      setIsTaskBeingCreated(false);
    }
  };

  const handleTaskUpdate = async (updatedTask: Task) => {
    if (!user) return;

    try {
      await updateTask({
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
        user_id: user.id
      });
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
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
              Upcoming {displayUpcomingTasks.length > 0 && `(${displayUpcomingTasks.length})`}
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

        <div className="pt-3">
          {user ? (
            <>
              <button
                className="px-3 w-full text-left text-muted-foreground flex items-center gap-2 py-1 hover:text-foreground transition-colors"
                onClick={handleCreateNewTask}
                disabled={isTaskBeingCreated}
              >
                <Plus size={16} />
                Create task
              </button>
              
              {/* New Task Input */}
              {isTaskBeingCreated && (
                <div ref={newTaskContainerRef} className="px-3 py-1.5 group">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <input
                        ref={newTaskInputRef}
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => handleNewTaskTitleChange(e.target.value)}
                        onKeyDown={handleNewTaskKeyDown}
                        className="w-full bg-transparent border-none focus:outline-none text-foreground"
                        placeholder="Enter task title"
                      />
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs capitalize">
                        task
                      </span>
                      <DeadlinePopup
                        calendarRef={newTaskCalendarRef}
                        date={newTaskDeadline ? new Date(newTaskDeadline) : undefined}
                        onSelect={(date) => handleNewTaskDeadlineChange(date?.toISOString())}
                        onCalendarOpenChange={handleCalendarOpenChange}
                      >
                        <button 
                          className="flex items-center gap-1 hover:opacity-80 transition-opacity text-xs ml-1 text-muted-foreground"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          {newTaskDeadline ? (
                            format(new Date(newTaskDeadline), "MMM d, yyyy", { locale: es })
                          ) : (
                            <Calendar className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </DeadlinePopup>
                    </div>
                  </div>
                  <div className="mt-2 mx-5 border-b border-border/50 group-last:border-0" />
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-2">
              Please log in to create tasks
            </div>
          )}
        </div>

        <div className="overflow-y-auto" style={{ height: '392px' }}>
          {loading.fetching ? (
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
                {displayUpcomingTasks.length > 0 ? (
                  displayUpcomingTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isNew={task.title === ""}
                      inputRef={task.title === "" ? newTaskInputRef : undefined}
                      calendarRef={task.title === "" ? newTaskCalendarRef : undefined}
                      onStatusChange={handleTaskStatusChange}
                      onDeadlineChange={handleDeadlineChange}
                      onTitleChange={handleTaskTitleChange}
                      onTitleBlur={handleTaskTitleBlur}
                      onTitleKeyDown={handleTaskTitleKeyDown}
                      onTaskUpdate={handleTaskUpdate}
                      onDelete={handleTaskDelete}
                      allTasks={[...displayUpcomingTasks, ...overdueTasks, ...completedTasks]}
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
                      allTasks={[...displayUpcomingTasks, ...overdueTasks, ...completedTasks]}
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
                      allTasks={[...displayUpcomingTasks, ...overdueTasks, ...completedTasks]}
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

