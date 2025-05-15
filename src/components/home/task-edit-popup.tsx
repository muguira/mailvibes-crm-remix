// Update task-edit-popup.tsx to handle both display_status and displayStatus
import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [editedTask, setEditedTask] = React.useState<ExtendedTask>({ ...task });
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
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

    // Special handling for display_status to maintain both fields
    if (field === 'display_status') {
      setEditedTask(prev => ({
        ...prev,
        display_status: value,
        displayStatus: value
      }));
    }
  };

  const handleSave = () => {
    // Ensure both display_status and displayStatus are set for compatibility
    const taskToSave = {
      ...editedTask,
      display_status: editedTask.display_status,
      displayStatus: editedTask.display_status,
      // Map contactId to contact field if needed
      contact: editedTask.contactId
    };

    onSave(taskToSave);
    onClose();
  };

  const handleDelete = () => {
    setIsDeleteAlertOpen(false);
    onDelete(task.id);
    onClose();
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
        <DialogContent className="sm:max-w-md">
          <div className="space-y-4 py-2">
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
                className="w-full min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  value={editedTask.display_status}
                  onValueChange={(value) => handleChange('display_status', value)}
                >
                  <SelectTrigger>
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
                  <SelectTrigger>
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

            <div className="grid grid-cols-2 gap-4">
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
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editedTask.deadline ? (
                        format(parseISO(editedTask.deadline), "PPP")
                      ) : (
                        <span>No deadline</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editedTask.deadline ? parseISO(editedTask.deadline) : undefined}
                      onSelect={(date) => handleChange('deadline', date ? date.toISOString() : undefined)}
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
                  <SelectTrigger>
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
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteAlertOpen(true)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
