
import { Check, MessageSquare, Calendar, Circle, CircleX } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Task {
  id: string;
  title: string;
  dueDate: string;
  contact: string;
  description?: string;
  overdue?: boolean;
  type: "follow-up" | "respond" | "task"; 
}

// Sample task data
const tasks: Task[] = [
  {
    id: "1",
    title: "Follow up with",
    contact: "Mike Vinegar",
    dueDate: "Today",
    description: "Schedule check-in with Mike on final contract.",
    type: "follow-up"
  },
  {
    id: "2",
    title: "You should respond to",
    contact: "Tucker",
    dueDate: "Today",
    description: "Question for you Moxy:",
    type: "respond",
    overdue: true
  },
  {
    id: "3",
    title: "Follow up with",
    contact: "James McSales",
    dueDate: "Tomorrow",
    description: "Reach out to close contract.",
    type: "follow-up"
  },
  {
    id: "4",
    title: "Follow up with",
    contact: "Sarah McGeary",
    dueDate: "Next Week",
    description: "Can you help us figure out why this is happening?",
    type: "task"
  },
];

export function TasksPanel() {
  return (
    <div className="bg-white rounded-lg shadow-relate overflow-hidden h-full flex flex-col">
      <Tabs defaultValue="tasks">
        <div className="border-b border-slate-light/30">
          <div className="flex justify-between items-center px-4 pt-4">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="meetings">Meetings</TabsTrigger>
            </TabsList>

            <div className="flex space-x-2">
              <CustomButton size="sm" variant="outline">Email</CustomButton>
              <CustomButton size="sm">New Task</CustomButton>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <TabsContent value="tasks" className="m-0">
            <div>
              <div className="p-3 bg-coral/5 border-b border-slate-light/30">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-coral">
                  <CircleX size={16} />
                  Overdue Tasks
                </h3>
              </div>
              
              {tasks.filter(task => task.overdue).map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
              
              <div className="p-3 bg-slate-light/10 border-y border-slate-light/30">
                <h3 className="text-sm font-semibold">Today</h3>
              </div>
              
              {tasks.filter(task => task.dueDate === "Today" && !task.overdue).map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
              
              <div className="p-3 bg-slate-light/10 border-y border-slate-light/30">
                <h3 className="text-sm font-semibold">Tomorrow</h3>
              </div>
              
              {tasks.filter(task => task.dueDate === "Tomorrow").map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
              
              <div className="p-3 bg-slate-light/10 border-y border-slate-light/30">
                <h3 className="text-sm font-semibold">Next Week</h3>
              </div>
              
              {tasks.filter(task => task.dueDate === "Next Week").map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="meetings" className="m-0 p-6">
            <div className="text-center text-slate-medium">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No upcoming meetings</h3>
              <p className="text-sm max-w-xs mx-auto mb-4">
                Use the Meetings tab to schedule and manage your calls and meetings with contacts
              </p>
              <CustomButton variant="default">Schedule Meeting</CustomButton>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function TaskItem({ task }: { task: Task }) {
  function getIconByType(type: Task['type']) {
    switch (type) {
      case 'follow-up':
        return <Circle className="h-5 w-5 text-slate-medium" />;
      case 'respond':
        return <MessageSquare className="h-5 w-5 text-teal-primary" />;
      case 'task':
        return <Circle className="h-5 w-5 text-slate-medium" />;
      default:
        return <Circle className="h-5 w-5 text-slate-medium" />;
    }
  }

  return (
    <div className={`p-4 border-b border-slate-light/30 hover:bg-slate-light/10 ${task.overdue ? 'bg-coral/5' : ''}`}>
      <div className="flex justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">
              {task.title} <span className="text-teal-primary">{task.contact}</span>
            </span>
          </div>
          <p className="text-sm text-slate-dark">{task.description}</p>
        </div>
        
        <div className="flex items-start gap-2 ml-4">
          <span className={`text-sm ${task.overdue ? 'text-coral' : 'text-slate-medium'}`}>
            {task.dueDate}
          </span>
        </div>
      </div>
      
      <div className="flex mt-3 space-x-2">
        <button className="p-1.5 hover:bg-slate-light/20 rounded-full">
          <MessageSquare className="h-4 w-4 text-slate-medium" />
        </button>
        <button className="p-1.5 hover:bg-slate-light/20 rounded-full">
          <Check className="h-4 w-4 text-slate-medium" />
        </button>
        <button className="ml-auto text-xs text-slate-medium underline">
          Submit ticket
        </button>
      </div>
    </div>
  );
}
