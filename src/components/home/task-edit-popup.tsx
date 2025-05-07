import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Task } from "./tasks-panel";
import { useState, useEffect } from "react";
import { Check, X, Calendar, Plus, ChevronDown, AlertTriangle, User } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DeadlinePopup } from "./deadline-popup";
import { cn } from "@/lib/utils";
import { TaskDropdown } from "./task-dropdown";

interface TaskEditPopupProps {
    task: Task;
    open: boolean;
    onClose: () => void;
    onSave: (updatedTask: Task) => void;
    onStatusChange: (taskId: string, newStatus: Task["displayStatus"]) => void;
}

// Sample data - in a real app, this would come from your backend
const USERS = [
    { value: "franklin", label: "franklin rodriguez", icon: <Avatar className="h-6 w-6"><AvatarFallback>FR</AvatarFallback></Avatar> },
];

const PROJECTS = [
    { value: "cross-functional", label: "Cross-functional project plan", badge: "To do" },
];

const PRIORITIES = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
];

const STATUSES = [
    { value: "on-track", label: "On track" },
    { value: "at-risk", label: "At risk", badge: "At risk" },
    { value: "off-track", label: "Off track" },
];

export function TaskEditPopup({ task, open, onClose, onSave, onStatusChange }: TaskEditPopupProps) {
    const [editedTask, setEditedTask] = useState<Task>({ ...task });

    useEffect(() => {
        setEditedTask({ ...task });
    }, [task]);

    const handleSave = () => {
        onSave(editedTask);
    };

    const handleMarkComplete = () => {
        const newDisplayStatus = task.displayStatus === "completed" ? "upcoming" : "completed";
        onStatusChange(task.id, newDisplayStatus);
    };

    const handleInputChange = (field: keyof Task, value: any) => {
        const updatedTask = { ...editedTask, [field]: value };
        setEditedTask(updatedTask);
        onSave(updatedTask);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-background text-foreground p-0">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkComplete}
                        className={cn(
                            "hover:bg-emerald-500/10 hover:text-emerald-500",
                            task.displayStatus === "completed" && "text-emerald-500"
                        )}
                    >
                        <Check className="h-4 w-4 mr-1" />
                        {task.displayStatus === "completed" ? "Completed" : "Mark complete"}
                    </Button>
                </div>

                <div className="p-6 space-y-6">
                    <Input
                        value={editedTask.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                        className="text-2xl font-semibold border-none p-0 focus-visible:ring-0"
                        placeholder="Task title"
                    />

                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="w-24 text-sm text-muted-foreground">Assignee</span>
                            <select
                                value={editedTask.contact || ""}
                                onChange={(e) => handleInputChange("contact", e.target.value)}
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Select...</option>
                                <option value="franklin">franklin rodriguez</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="w-24 text-sm text-muted-foreground">Due date</span>
                            <DeadlinePopup
                                date={editedTask.deadline ? new Date(editedTask.deadline) : undefined}
                                onSelect={(date) => handleInputChange("deadline", date?.toISOString())}
                            >
                                <Button variant="outline" className="gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {editedTask.deadline ? new Date(editedTask.deadline).toLocaleDateString() : "Set date"}
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DeadlinePopup>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="w-24 text-sm text-muted-foreground">Projects</span>
                            <select
                                value={editedTask.type || ""}
                                onChange={(e) => handleInputChange("type", e.target.value)}
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Select...</option>
                                <option value="cross-functional">Cross-functional project plan</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="w-24 text-sm text-muted-foreground">Dependencies</span>
                            <select
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Add dependencies</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <span className="text-sm text-muted-foreground">Fields</span>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-muted-foreground mb-1">Priority</div>
                                    <select
                                        value={editedTask.priority || "medium"}
                                        onChange={(e) => handleInputChange("priority", e.target.value)}
                                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground mb-1">Status</div>
                                    <select
                                        value={editedTask.status}
                                        onChange={(e) => handleInputChange("status", e.target.value as Task["status"])}
                                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="on-track">On track</option>
                                        <option value="at-risk">At risk</option>
                                        <option value="off-track">Off track</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Description</span>
                        <Textarea
                            value={editedTask.description || ""}
                            onChange={(e) => handleInputChange("description", e.target.value)}
                            placeholder="What is this task about?"
                            className="min-h-[100px] resize-none"
                        />
                    </div>

                    <Button variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add subtask
                    </Button>

                    <div className="space-y-2">
                        <span className="text-sm font-medium">Comments</span>
                        <Textarea
                            placeholder="Add a comment..."
                            className="min-h-[100px] resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Collaborators</span>
                            <div className="flex -space-x-2">
                                <Avatar className="h-6 w-6 border-2 border-background">
                                    <AvatarFallback>FR</AvatarFallback>
                                </Avatar>
                                <Button variant="outline" size="icon" className="h-6 w-6 rounded-full">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                            Leave task
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 