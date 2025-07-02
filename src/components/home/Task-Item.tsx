import { useState } from "react";
import { es } from 'date-fns/locale';
import { format, isToday, isTomorrow, parseISO, isPast, startOfDay } from "date-fns";
import { Task } from "@/types/task";
import { Check, Calendar } from "lucide-react";
import { DeadlinePopup } from "./deadline-popup";
import { TaskEditPopup } from "./task-edit-popup";
import { cn } from "@/lib/utils";

interface TaskItemProps {
    task: Task;
    isNew?: boolean;
    inputRef?: React.RefObject<HTMLInputElement>;
    calendarRef?: React.RefObject<HTMLButtonElement>;
    onStatusChange: (taskId: string, newStatus: Task["display_status"]) => void;
    onDeadlineChange: (taskId: string, deadline: string | undefined) => void;
    onTitleChange: (taskId: string, newTitle: string) => void;
    onTitleBlur: (taskId: string) => void;
    onTitleKeyDown: (e: React.KeyboardEvent, taskId: string) => void;
    onTaskUpdate: (updatedTask: Task) => void;
    onDelete: (taskId: string) => void;
    allTasks: Task[];
}

export function TaskItem({
    task,
    isNew,
    inputRef,
    calendarRef,
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
              calendarRef={calendarRef}
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