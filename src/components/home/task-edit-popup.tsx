// Update task-edit-popup.tsx to use display_status consistently
import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { CalendarIcon, CheckIcon, AlertCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task } from "@/types/task";

import { Combobox } from "@/components/ui/combobox";
import { useContactSearch } from "@/hooks/use-contact-search";

// Extend the Task type to include contactId
interface ExtendedTask extends Task {
  contactId?: string;
}

interface TaskEditPopupProps {
  task: ExtendedTask;
  open: boolean;
  onClose: () => void;
  onSave: (task: ExtendedTask) => void;
  onStatusChange: (taskId: string, status: Task["display_status"]) => void;
  onDelete: (taskId: string) => void;
  allTasks: Task[];
}

export function TaskEditPopup({ task, open, onClose, onSave, onStatusChange, onDelete, allTasks }: TaskEditPopupProps) {
  console.log('TaskEditPopup rendered with:', { task, open, onDelete: typeof onDelete });
  const [editedTask, setEditedTask] = React.useState<ExtendedTask>({ ...task });
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const { contacts, isLoading, searchContacts } = useContactSearch();

  // Reset the form when the task changes
  React.useEffect(() => {
    setEditedTask({ ...task });
  }, [task]);

  // Focus the title input when the dialog opens
  React.useEffect(() => {
    if (open && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleChange = (field: keyof ExtendedTask, value: any) => {
    setEditedTask(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Clean up the task object before saving
    const taskToSave = {
      ...editedTask,
      // Map contactId to contact field if needed
      contact: editedTask.contactId
    };

    onSave(taskToSave);
    onClose();
  };

  const handleDeleteConfirm = () => {
    console.log('handleDeleteConfirm called with task ID:', task.id);
    setShowDeleteConfirm(false);
    onDelete(task.id);
    onClose();
  };

  // Function to disable past dates in the calendar
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    return date < today; // Disable dates before today (allow today and future dates)
  };

  const contactItems = React.useMemo(() =>
    (contacts || []).map(contact => ({
      value: contact.id,
      label: contact.name +
        (contact.company ? ` (${contact.company})` : '') +
        (contact.email ? ` - ${contact.email}` : '')
    })) || [],
    [contacts]
  );

  const handleSearch = React.useCallback((search: string) => {
    if (search === undefined) return;
    searchContacts(search);
  }, [searchContacts]);

  // Initialize contactId from contact field if needed
  React.useEffect(() => {
    if (task.contact && !task.contactId) {
      setEditedTask(prev => ({
        ...prev,
        contactId: task.contact
      }));
    }
  }, [task]);

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}>
        <DialogContent className="sm:max-w-lg w-full max-w-[95vw]">
          <DialogTitle className="sr-only">Edit Task</DialogTitle>
          <div className="space-y-4 py-4 px-6 max-h-[80vh] overflow-y-auto">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input
                ref={titleInputRef}
                value={editedTask.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Task title"
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={editedTask.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Task description"
                className="w-full min-h-[80px] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  value={editedTask.display_status}
                  onValueChange={(value) => handleChange('display_status', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">
                      <div className="flex items-center gap-2">
                        <CheckIcon className="h-4 w-4 text-blue-500" />
                        <span>Upcoming</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="overdue">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span>Overdue</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="completed">
                      <div className="flex items-center gap-2">
                        <CheckIcon className="h-4 w-4 text-green-500" />
                        <span>Completed</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select
                  value={editedTask.type}
                  onValueChange={(value: Task['type']) => handleChange('type', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="follow-up">Follow Up</SelectItem>
                    <SelectItem value="respond">Respond</SelectItem>
                    <SelectItem value="cross-functional">Cross-functional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Deadline</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editedTask.deadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {editedTask.deadline ? (
                          format(parseISO(editedTask.deadline), "PPP")
                        ) : (
                          "No deadline"
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      classNames={{
                        cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 [&:has([aria-selected])]:!bg-transparent",
                        day: "h-9 w-9 p-0 font-normal flex items-center justify-center rounded-full transition-colors cursor-pointer",
                      
                        day_selected: "!bg-teal-600/80 !text-white hover:!bg-teal-700 focus:!bg-teal-500/80 rounded-md",
                        day_today: "!bg-gray-500/10 !text-white hover:!bg-gray/50 !text-gray-500 rounded-md",
                        
                        day_outside: "text-muted-foreground opacity-50",
                        day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
                      }}
                      selected={editedTask.deadline ? parseISO(editedTask.deadline) : undefined}
                      onSelect={(date) => handleChange('deadline', date ? date.toISOString() : undefined)}
                      disabled={isDateDisabled}
                      initialFocus
                    />
                    {editedTask.deadline && (
                      <div className="p-2 border-t flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleChange('deadline', undefined)}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Priority</label>
                <Select
                  value={editedTask.priority || 'medium'}
                  onValueChange={(value: Task['priority']) => handleChange('priority', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Contact</label>
              <div className="w-full">
                <Combobox
                  items={contactItems}
                  value={editedTask.contactId}
                  onValueChange={(value) => {
                    handleChange('contactId', value || '');
                    handleChange('contact', value || ''); // Update both fields
                  }}
                  onSearch={handleSearch}
                  placeholder="Search contacts..."
                  emptyText={isLoading ? "Loading contacts..." : "No contacts found"}
                  isLoading={isLoading}
                  className="w-full"
                />
              </div>
            </div>



            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
              <Popover open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="center" side="top" sideOffset={8}>
                  <div className="p-4 space-y-3">
                    <div className="text-center">
                      <h4 className="font-semibold text-sm">Delete Task</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Are you sure you want to delete this task? This action cannot be undone.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteConfirm}
                        className="flex-1"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={onClose} className="flex-1 sm:flex-none">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} className="flex-1 sm:flex-none">
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </>
  );
}
