import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Task } from "./tasks-panel";
import { useState } from "react";
import { Check, X, Calendar, Plus, ChevronDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DeadlinePopup } from "./deadline-popup";

interface TaskEditPopupProps {
    task: Task;
    open: boolean;
    onClose: () => void;
    onSave: (updatedTask: Task) => void;
}

export function TaskEditPopup({ task, open, onClose, onSave }: TaskEditPopupProps) {
    const [editedTask, setEditedTask] = useState<Task>({ ...task });

    const handleSave = () => {
        onSave(editedTask);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-background text-foreground p-0">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-muted"
                    >
                        <Check className="h-4 w-4 mr-1" />
                        Mark complete
                    </Button>

                </div>

                <div className="p-6 space-y-6">
                    <Input
                        value={editedTask.title}
                        onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                        className="text-2xl font-semibold border-none p-0 focus-visible:ring-0"
                        placeholder="Task title"
                    />

                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="w-24 text-sm text-muted-foreground">Assignee</span>
                            <Button variant="outline" className="gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarFallback>FR</AvatarFallback>
                                </Avatar>
                                <span>franklin rodriguez</span>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="w-24 text-sm text-muted-foreground">Due date</span>
                            <DeadlinePopup
                                date={editedTask.deadline ? new Date(editedTask.deadline) : undefined}
                                onSelect={(date) => setEditedTask({ ...editedTask, deadline: date?.toISOString() })}
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
                            <Button variant="outline" className="gap-2">
                                Cross-functional project plan
                                <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs">To do</span>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="w-24 text-sm text-muted-foreground">Dependencies</span>
                            <Button variant="outline" className="text-muted-foreground">
                                Add dependencies
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <span className="text-sm text-muted-foreground">Fields</span>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2 p-3 rounded-lg border border-border">
                                    <div className="flex-1">
                                        <div className="text-sm text-muted-foreground">Priority</div>
                                        <div className="font-medium">Medium</div>
                                    </div>
                                    <ChevronDown className="h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-2 p-3 rounded-lg border border-border">
                                    <div className="flex-1">
                                        <div className="text-sm text-muted-foreground">Status</div>
                                        <div className="font-medium">
                                            <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded">
                                                At risk
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronDown className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Description</span>
                        <Textarea
                            value={editedTask.description || ""}
                            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
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