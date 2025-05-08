import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { Check, X, Calendar, Plus, ChevronDown, AlertTriangle, User, Search, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DeadlinePopup } from "./deadline-popup";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Task {
    id: string;
    title: string;
    deadline?: string;
    displayStatus: "upcoming" | "overdue" | "completed";
    contact?: string;
    type?: string;
    priority?: "low" | "medium" | "high";
    status?: "on-track" | "at-risk" | "off-track";
    description?: string;
    dependencies?: string[];
    subtasks?: string[];
    comments?: Comment[];
}

interface Comment {
    id: string;
    text: string;
    author: string;
    createdAt: string;
}

interface TaskEditPopupProps {
    task: Task;
    open: boolean;
    onClose: () => void;
    onSave: (updatedTask: Task) => void;
    onStatusChange: (taskId: string, newStatus: Task["displayStatus"]) => void;
    onDelete?: (taskId: string) => void;
    allTasks?: Task[];
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

export function TaskEditPopup({ task, open, onClose, onSave, onStatusChange, onDelete, allTasks = [] }: TaskEditPopupProps) {
    const [editedTask, setEditedTask] = useState<Task>({ ...task });
    const [openDependencies, setOpenDependencies] = useState(false);
    const [openSubtasks, setOpenSubtasks] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [subtaskSearchQuery, setSubtaskSearchQuery] = useState("");
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
    const [newComment, setNewComment] = useState("");

    useEffect(() => {
        setEditedTask({ ...task });
    }, [task]);

    useEffect(() => {
        if (isEditingDescription && descriptionInputRef.current) {
            descriptionInputRef.current.focus();
            // Place cursor at the end of the text
            const length = descriptionInputRef.current.value.length;
            descriptionInputRef.current.setSelectionRange(length, length);
        }
    }, [isEditingDescription]);

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

    const handleLeaveTask = () => {
        const updatedTask = { ...editedTask, contact: "" };
        setEditedTask(updatedTask);
        onSave(updatedTask);
    };

    const toggleDependency = (taskId: string) => {
        const currentDependencies = editedTask.dependencies || [];
        let newDependencies: string[];

        if (currentDependencies.includes(taskId)) {
            newDependencies = currentDependencies.filter(id => id !== taskId);
        } else {
            newDependencies = [...currentDependencies, taskId];
        }

        const updatedTask = { ...editedTask, dependencies: newDependencies };
        setEditedTask(updatedTask);
        onSave(updatedTask);
    };

    const toggleSubtask = (taskId: string) => {
        const currentSubtasks = editedTask.subtasks || [];
        let newSubtasks: string[];

        if (currentSubtasks.includes(taskId)) {
            newSubtasks = currentSubtasks.filter(id => id !== taskId);
        } else {
            newSubtasks = [...currentSubtasks, taskId];
        }

        const updatedTask = { ...editedTask, subtasks: newSubtasks };
        setEditedTask(updatedTask);
        onSave(updatedTask);
    };

    const handleDescriptionDoubleClick = () => {
        setIsEditingDescription(true);
    };

    const handleDescriptionBlur = () => {
        setIsEditingDescription(false);
    };

    const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            setIsEditingDescription(false);
        }
    };

    const addComment = () => {
        if (!newComment.trim()) return;

        const comment: Comment = {
            id: crypto.randomUUID(),
            text: newComment.trim(),
            author: "franklin rodriguez", // This should come from the current user
            createdAt: new Date().toISOString()
        };

        const updatedTask = {
            ...editedTask,
            comments: [...(editedTask.comments || []), comment]
        };

        setEditedTask(updatedTask);
        onSave(updatedTask);
        setNewComment("");
    };

    const handleCommentKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            addComment();
        }
    };

    const handleDelete = () => {
        setIsDeleting(true);
    };

    const handleUndelete = () => {
        setIsDeleting(false);
    };

    const handlePermanentDelete = () => {
        if (onDelete) {
            onDelete(task.id);
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-background text-foreground p-0">
                <div>
                    <DialogTitle className="sr-only">Edit Task</DialogTitle>
                    <div className="flex items-center justify-between p-2 border-b border-border">
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
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDelete}
                                className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 mr-10 mb-[4px]"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    {isDeleting && (
                        <div className="bg-red-50 p-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-red-600">
                                <Trash2 className="h-4 w-4" />
                                <span className="text-sm">This task is deleted.</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleUndelete}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    Undelete
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handlePermanentDelete}
                                >
                                    Delete permanently
                                </Button>
                            </div>
                        </div>
                    )}
                </div>



                <div className="p-6 pt-0 space-y-6">
                    <Input
                        value={editedTask.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                        className="text-2xl font-semibold border-none p-0 focus-visible:ring-0"
                        placeholder="Task title"
                    />



                    <div className="space-y-4">
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                            <span className="text-sm text-muted-foreground">Assignee</span>
                            <div className="relative w-full">
                                <select
                                    value={editedTask.contact || ""}
                                    onChange={(e) => handleInputChange("contact", e.target.value)}
                                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-8"
                                >
                                    <option value="">Select...</option>
                                    <option value="franklin">franklin rodriguez</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                            <span className="text-sm text-muted-foreground">Due date</span>
                            <DeadlinePopup
                                date={editedTask.deadline ? new Date(editedTask.deadline) : undefined}
                                onSelect={(date) => handleInputChange("deadline", date?.toISOString())}
                            >
                                <Button variant="outline" className="gap-2 justify-start w-full relative pr-8">
                                    <Calendar className="h-4 w-4" />
                                    <span className="flex-1 text-left">{editedTask.deadline ? new Date(editedTask.deadline).toLocaleDateString() : "Set date"}</span>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                                </Button>
                            </DeadlinePopup>
                        </div>

                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                            <span className="text-sm text-muted-foreground">Projects</span>
                            <div className="relative w-full">
                                <select
                                    value={editedTask.type || ""}
                                    onChange={(e) => handleInputChange("type", e.target.value)}
                                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-8"
                                >
                                    <option value="">Select...</option>
                                    <option value="cross-functional">Cross-functional project plan</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                            <span className="text-sm text-muted-foreground">Dependencies</span>
                            <div className="relative w-full">
                                <Popover open={openDependencies} onOpenChange={setOpenDependencies}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                                "w-full justify-between border-input"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                {editedTask.dependencies?.length ? (
                                                    <span>{editedTask.dependencies.length} selected</span>
                                                ) : (
                                                    <span>Add dependencies</span>
                                                )}
                                            </div>
                                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <div className="p-2 border-b">
                                            <Input
                                                placeholder="Search tasks..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="h-8"
                                            />
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto py-1">
                                            {allTasks
                                                .filter(t =>
                                                    t.id !== task.id &&
                                                    t.title.toLowerCase().includes(searchQuery.toLowerCase())
                                                )
                                                .map(t => (
                                                    <div
                                                        key={t.id}
                                                        role="option"
                                                        className={cn(
                                                            "flex items-center w-full px-2 py-2 cursor-pointer hover:bg-muted gap-2",
                                                            editedTask.dependencies?.includes(t.id) && "bg-muted"
                                                        )}
                                                        onClick={() => toggleDependency(t.id)}
                                                    >
                                                        <div className={cn(
                                                            "h-4 w-4 border rounded flex items-center justify-center",
                                                            editedTask.dependencies?.includes(t.id)
                                                                ? "bg-[#2A7B88] border-[#2A7B88]"
                                                                : "border-input"
                                                        )}>
                                                            {editedTask.dependencies?.includes(t.id) && (
                                                                <Check className="h-3 w-3 text-white" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <span className="flex-1">{t.title}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs px-2 py-0.5 rounded bg-muted">
                                                                    {t.type}
                                                                </span>
                                                                {t.displayStatus === "completed" && (
                                                                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                                                                        Completed
                                                                    </span>
                                                                )}
                                                                {t.displayStatus === "overdue" && (
                                                                    <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-500">
                                                                        Overdue
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            {allTasks.filter(t =>
                                                t.id !== task.id &&
                                                t.title.toLowerCase().includes(searchQuery.toLowerCase())
                                            ).length === 0 && (
                                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                                        No tasks found.
                                                    </div>
                                                )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-sm text-muted-foreground">Fields</span>
                            <div className="border rounded-lg overflow-hidden">
                                <div className="grid grid-cols-[100px_1fr] border-b border-border">
                                    <div className="flex items-center px-4 py-2">
                                        <span className="text-sm text-muted-foreground">Priority</span>
                                    </div>
                                    <div className="flex items-center px-4 py-2">
                                        <Select
                                            value={editedTask.priority || "medium"}
                                            onValueChange={(value) => handleInputChange("priority", value)}
                                        >
                                            <SelectTrigger className="w-[140px] h-7 text-sm">
                                                <SelectValue placeholder="Select priority">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "w-2 h-2 rounded-full",
                                                            editedTask.priority === "high" && "bg-red-500",
                                                            editedTask.priority === "medium" && "bg-yellow-500",
                                                            editedTask.priority === "low" && "bg-emerald-500",
                                                            !editedTask.priority && "bg-gray-400"
                                                        )} />
                                                        {editedTask.priority ? editedTask.priority.charAt(0).toUpperCase() + editedTask.priority.slice(1) : "Medium"}
                                                    </div>
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                        <span>Low</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="medium">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                                        <span>Medium</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="high">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-red-500" />
                                                        <span>High</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-[100px_1fr]">
                                    <div className="flex items-center px-4 py-2">
                                        <span className="text-sm text-muted-foreground">Status</span>
                                    </div>
                                    <div className="flex items-center px-4 py-2">
                                        <Select
                                            value={editedTask.status || "on-track"}
                                            onValueChange={(value) => handleInputChange("status", value)}
                                        >
                                            <SelectTrigger className="w-[140px] h-7 text-sm">
                                                <SelectValue placeholder="Select status">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "w-2 h-2 rounded-full",
                                                            editedTask.status === "on-track" && "bg-emerald-500",
                                                            editedTask.status === "at-risk" && "bg-yellow-500",
                                                            editedTask.status === "off-track" && "bg-red-500",
                                                            !editedTask.status && "bg-emerald-500"
                                                        )} />
                                                        {editedTask.status ?
                                                            (editedTask.status === "on-track" ? "On track" :
                                                                editedTask.status === "at-risk" ? "At risk" :
                                                                    "Off track") : "On track"}
                                                    </div>
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="on-track">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                        <span>On track</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="at-risk">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                                        <span>At risk</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="off-track">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-red-500" />
                                                        <span>Off track</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Description</span>
                        {isEditingDescription ? (
                            <Textarea
                                ref={descriptionInputRef}
                                value={editedTask.description || ""}
                                onChange={(e) => handleInputChange("description", e.target.value)}
                                onBlur={handleDescriptionBlur}
                                onKeyDown={handleDescriptionKeyDown}
                                placeholder="What is this task about?"
                                className="min-h-[100px] resize-none border-teal-500"
                            />
                        ) : (
                            <div
                                onDoubleClick={handleDescriptionDoubleClick}
                                className="min-h-[100px] p-3 rounded-md cursor-text hover:border-input"
                            >
                                {editedTask.description || "What is this task about?"}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <span className="text-sm font-medium">Subtasks</span>
                        <div className="relative w-full">
                            <Popover open={openSubtasks} onOpenChange={setOpenSubtasks}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn(
                                            "w-full justify-between",
                                            openSubtasks && "bg-[#2A7B88] text-white border-[#2A7B88]"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {editedTask.subtasks?.length ? (
                                                <span>{editedTask.subtasks.length} selected</span>
                                            ) : (
                                                <span>Add subtask</span>
                                            )}
                                        </div>
                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                    <div className="p-2 border-b">
                                        <Input
                                            placeholder="Search tasks..."
                                            value={subtaskSearchQuery}
                                            onChange={(e) => setSubtaskSearchQuery(e.target.value)}
                                            className="h-8"
                                        />
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto py-1">
                                        {allTasks
                                            .filter(t =>
                                                t.id !== task.id &&
                                                t.title.toLowerCase().includes(subtaskSearchQuery.toLowerCase())
                                            )
                                            .map(t => (
                                                <div
                                                    key={t.id}
                                                    role="option"
                                                    className={cn(
                                                        "flex items-center w-full px-2 py-2 cursor-pointer hover:bg-muted gap-2",
                                                        editedTask.subtasks?.includes(t.id) && "bg-muted"
                                                    )}
                                                    onClick={() => toggleSubtask(t.id)}
                                                >
                                                    <div className={cn(
                                                        "h-4 w-4 border rounded flex items-center justify-center",
                                                        editedTask.subtasks?.includes(t.id)
                                                            ? "bg-[#2A7B88] border-[#2A7B88]"
                                                            : "border-input"
                                                    )}>
                                                        {editedTask.subtasks?.includes(t.id) && (
                                                            <Check className="h-3 w-3 text-white" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <span className="flex-1">{t.title}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs px-2 py-0.5 rounded bg-muted">
                                                                {t.type}
                                                            </span>
                                                            {t.displayStatus === "completed" && (
                                                                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                                                                    Completed
                                                                </span>
                                                            )}
                                                            {t.displayStatus === "overdue" && (
                                                                <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-500">
                                                                    Overdue
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        {allTasks.filter(t =>
                                            t.id !== task.id &&
                                            t.title.toLowerCase().includes(subtaskSearchQuery.toLowerCase())
                                        ).length === 0 && (
                                                <div className="py-6 text-center text-sm text-muted-foreground">
                                                    No tasks found.
                                                </div>
                                            )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="space-y-3 border-t pt-6">
                        <span className="text-sm font-medium">Comments</span>
                        <div className="flex flex-col h-[300px]">
                            <div className="flex-1 overflow-y-auto pr-2">
                                <div className="space-y-6">
                                    {editedTask.comments?.map((comment) => (
                                        <div key={comment.id} className="flex gap-3">
                                            <Avatar className="h-8 w-8 flex-shrink-0">
                                                <AvatarFallback>
                                                    {comment.author.split(' ').map(n => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{comment.author}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(parseISO(comment.createdAt), "MMM d 'at' h:mmaaa", { locale: es })}
                                                    </span>
                                                </div>
                                                <p className="text-sm">{comment.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t mt-2">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarFallback>FR</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <Textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={handleCommentKeyDown}
                                        placeholder="Add a comment..."
                                        className="min-h-[80px] resize-none border border-input bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
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
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={handleLeaveTask}
                            disabled={!editedTask.contact}
                        >
                            Leave task
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 