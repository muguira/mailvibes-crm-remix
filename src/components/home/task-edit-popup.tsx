
import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, X, Trash2, Check } from "lucide-react";
import { format } from "date-fns";
import { DeadlinePopup } from "./deadline-popup";
import { parseISO } from "date-fns";
import { Task } from "@/types/task"; // Import the unified Task type

interface TaskEditPopupProps {
  task: Task;
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: Task["displayStatus"]) => void;
  onDelete: (taskId: string) => void;
  allTasks: Task[];
}

export function TaskEditPopup({
  task,
  open,
  onClose,
  onSave,
  onStatusChange,
  onDelete,
  allTasks,
}: TaskEditPopupProps) {
  const [editedTask, setEditedTask] = useState<Task>({ ...task });
  const hasChanges = JSON.stringify(task) !== JSON.stringify(editedTask);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedTask({ ...task });
  }, [task]);

  useEffect(() => {
    if (open && titleInputRef.current) {
      // Focus title input when dialog opens
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditedTask((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setEditedTask((prev) => ({ ...prev, [name]: value }));
  };

  const handleDeadlineChange = (date: Date | undefined) => {
    setEditedTask((prev) => ({
      ...prev,
      deadline: date ? date.toISOString() : undefined,
    }));
  };

  const handleSave = () => {
    onSave(editedTask);
    onClose();
  };

  const handleDelete = () => {
    onDelete(task.id);
    onClose();
  };

  const handleMarkCompleted = () => {
    const newStatus = task.displayStatus === "completed" ? "upcoming" : "completed";
    onStatusChange(task.id, newStatus);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Task</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              ref={titleInputRef}
              id="title"
              name="title"
              value={editedTask.title}
              onChange={handleInputChange}
              className="mt-1"
              placeholder="Task title"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label htmlFor="type" className="text-sm font-medium">
                Type
              </label>
              <select
                id="type"
                name="type"
                value={editedTask.type}
                onChange={(e) => handleSelectChange("type", e.target.value as Task["type"])}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="task">Task</option>
                <option value="follow-up">Follow-up</option>
                <option value="respond">Respond</option>
                <option value="cross-functional">Cross-functional</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={editedTask.status}
                onChange={(e) => handleSelectChange("status", e.target.value as Task["status"])}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="on-track">On Track</option>
                <option value="at-risk">At Risk</option>
                <option value="off-track">Off Track</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Deadline */}
            <div>
              <label className="text-sm font-medium">Deadline</label>
              <DeadlinePopup
                date={editedTask.deadline ? parseISO(editedTask.deadline) : undefined}
                onSelect={handleDeadlineChange}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between text-left font-normal mt-1"
                >
                  <span>
                    {editedTask.deadline
                      ? format(parseISO(editedTask.deadline), "PPP")
                      : "No deadline"}
                  </span>
                  <Calendar className="h-4 w-4" />
                </Button>
              </DeadlinePopup>
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="text-sm font-medium">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={editedTask.priority || "medium"}
                onChange={(e) => handleSelectChange("priority", e.target.value as Task["priority"])}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Contact */}
          <div>
            <label htmlFor="contact" className="text-sm font-medium">
              Related Contact
            </label>
            <Input
              id="contact"
              name="contact"
              value={editedTask.contact || ""}
              onChange={handleInputChange}
              className="mt-1"
              placeholder="Contact name"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              value={editedTask.description || ""}
              onChange={handleInputChange}
              className="min-h-[100px] mt-1"
              placeholder="Task description"
            />
          </div>

          {/* Tag */}
          <div>
            <label htmlFor="tag" className="text-sm font-medium">
              Tag
            </label>
            <Input
              id="tag"
              name="tag"
              value={editedTask.tag || ""}
              onChange={handleInputChange}
              className="mt-1"
              placeholder="e.g. LATAM"
            />
          </div>

          {/* Dependencies (placeholder) */}
          {task.dependencies && (
            <div>
              <label className="text-sm font-medium">Dependencies</label>
              <div className="mt-1 text-sm text-muted-foreground">
                {task.dependencies.length > 0 ? "Has dependencies" : "No dependencies"}
              </div>
            </div>
          )}

          {/* Subtasks (placeholder) */}
          {task.subtasks && (
            <div>
              <label className="text-sm font-medium">Subtasks</label>
              <div className="mt-1 text-sm text-muted-foreground">
                {task.subtasks.length > 0 ? "Has subtasks" : "No subtasks"}
              </div>
            </div>
          )}

          {/* Comments (placeholder) */}
          {task.comments && (
            <div>
              <label className="text-sm font-medium">Comments</label>
              <div className="mt-1 text-sm text-muted-foreground">
                {task.comments.length > 0 ? `${task.comments.length} comments` : "No comments"}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant={task.displayStatus === "completed" ? "outline" : "secondary"}
                onClick={handleMarkCompleted}
              >
                {task.displayStatus === "completed" ? (
                  <>
                    <X className="h-4 w-4 mr-1" /> Mark Incomplete
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" /> Mark Complete
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleSave}
                disabled={!hasChanges}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
