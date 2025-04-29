
import { useState } from "react";
import { Filter, MessageSquare, Check, Calendar, Phone, Edit, Plus } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/shared/avatar";

interface ActivityItem {
  id: string;
  type: 'note' | 'update' | 'call' | 'task-complete';
  timestamp: string;
  content: string;
  user: {
    name: string;
    initials: string;
  };
  field?: {
    name: string;
    value: string;
  };
}

interface ContactData {
  id: string;
  name: string;
  company?: string;
  lastActivity: string;
  activities: ActivityItem[];
  fields: Record<string, any>;
}

interface StreamViewProps {
  contacts: ContactData[];
  listName: string;
}

export function StreamView({ contacts, listName }: StreamViewProps) {
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [activeContactId, setActiveContactId] = useState(contacts[0].id);
  
  const handleContactSelect = (contact: ContactData) => {
    setSelectedContact(contact);
    setActiveContactId(contact.id);
  };

  return (
    <div className="h-full flex">
      {/* Left Column - Contacts List */}
      <div className="w-72 border-r border-slate-light/30 bg-white overflow-y-auto">
        <div className="p-2 border-b border-slate-light/30 flex items-center justify-between">
          <input
            type="text"
            placeholder="Search Field Values"
            className="px-2 py-1 text-sm border border-slate-light/30 rounded w-full"
          />
        </div>
        
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className={`p-3 border-b border-slate-light/30 cursor-pointer ${
              activeContactId === contact.id ? 'bg-teal-primary/10' : 'hover:bg-slate-light/10'
            }`}
            onClick={() => handleContactSelect(contact)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{contact.name}</div>
                {contact.company && (
                  <div className="text-xs text-slate-medium">{contact.company}</div>
                )}
              </div>
              <div className="text-xs text-slate-medium">{contact.lastActivity}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Center Column - Stream */}
      <div className="flex-1 border-r border-slate-light/30 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-light/30 flex items-center justify-between bg-white">
          <div className="flex items-center">
            <h2 className="font-semibold">{selectedContact.name}</h2>
            {selectedContact.company && (
              <span className="ml-1 text-slate-medium text-sm">
                ({selectedContact.company})
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button className="p-1.5 rounded hover:bg-slate-light/20 text-slate-medium">
              <MessageSquare size={16} />
            </button>
            <button className="p-1.5 rounded hover:bg-slate-light/20 text-slate-medium">
              <Phone size={16} />
            </button>
            <button className="p-1.5 rounded hover:bg-slate-light/20 text-slate-medium">
              <Calendar size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 bg-slate-light/5">
          <div className="p-4 space-y-4">
            {selectedContact.activities.map((activity) => (
              <ActivityItemComponent key={activity.id} activity={activity} />
            ))}
            
            <div className="bg-white p-4 shadow-sm rounded-md">
              <div className="flex gap-3">
                <Avatar name="You" initials="YO" />
                <div className="flex-1">
                  <textarea 
                    placeholder="Add a comment or @mention a teammate..."
                    className="w-full p-2 border border-slate-light/30 rounded text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-teal-primary/30 focus:border-teal-primary"
                  />
                  <div className="flex justify-end mt-2">
                    <CustomButton size="sm">Post Comment</CustomButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Fields / Tasks / Sharing */}
      <div className="w-72 bg-white">
        <Tabs defaultValue="fields">
          <TabsList className="w-full border-b border-slate-light/30 rounded-none bg-white">
            <TabsTrigger value="fields" className="flex-1">Fields</TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1">Tasks</TabsTrigger>
            <TabsTrigger value="sharing" className="flex-1">Sharing</TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="p-0 m-0 overflow-y-auto h-[calc(100vh-112px)]">
            <div className="p-3">
              <input
                type="text"
                placeholder="Filter fields"
                className="px-2 py-1 text-sm border border-slate-light/30 rounded w-full mb-3"
              />
              
              <div className="space-y-4">
                {Object.entries(selectedContact.fields).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="text-xs text-slate-medium">{key}</div>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{value}</div>
                      <button className="text-slate-medium hover:text-teal-primary">
                        <Edit size={14} />
                      </button>
                    </div>
                    <div className="border-b border-slate-light/30 pt-2"></div>
                  </div>
                ))}
                
                <div className="pt-2">
                  <CustomButton 
                    variant="outline" 
                    className="w-full flex items-center justify-center gap-2"
                    size="sm"
                  >
                    <Plus size={14} />
                    <span>Add a Field</span>
                  </CustomButton>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="tasks" className="p-3 m-0 overflow-y-auto h-[calc(100vh-112px)]">
            <CustomButton 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 mb-4"
              size="sm"
            >
              <Plus size={14} />
              <span>Create Task</span>
            </CustomButton>
            
            <div className="text-center text-slate-medium py-6">
              <p className="text-sm">No tasks assigned to this contact</p>
            </div>
          </TabsContent>
          
          <TabsContent value="sharing" className="p-3 m-0 overflow-y-auto h-[calc(100vh-112px)]">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Content Sharing</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm">No past content to share</span>
                  <div className="relative inline-block w-10 align-middle select-none">
                    <input type="checkbox" id="toggle" className="hidden" />
                    <label
                      htmlFor="toggle"
                      className="block overflow-hidden h-5 rounded-full bg-slate-light cursor-pointer"
                    >
                      <span className="block h-5 w-5 rounded-full bg-white transform transition-transform duration-200 ease-in"></span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-slate-light/30 pt-4">
                <h3 className="font-medium mb-2">Email Communication</h3>
                <div className="text-sm text-slate-dark">
                  <p>Configure how emails to this contact are tracked and shared with your team.</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ActivityItemComponent({ activity }: { activity: ActivityItem }) {
  let icon;
  
  switch (activity.type) {
    case 'note':
      icon = <MessageSquare size={16} className="text-teal-primary" />;
      break;
    case 'update':
      icon = <Edit size={16} className="text-blue-500" />;
      break;
    case 'call':
      icon = <Phone size={16} className="text-purple-500" />;
      break;
    case 'task-complete':
      icon = <Check size={16} className="text-green-500" />;
      break;
    default:
      icon = <MessageSquare size={16} />;
  }

  return (
    <div className="bg-white shadow-sm rounded-md overflow-hidden">
      <div className="p-3 border-b border-slate-light/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar name={activity.user.name} initials={activity.user.initials} size="sm" />
          <span className="font-medium text-sm">{activity.user.name}</span>
          <span className="text-xs text-slate-medium">{activity.timestamp}</span>
        </div>
        <div className="flex items-center gap-1">
          {icon}
          {activity.field && (
            <span className="text-xs bg-slate-light/30 px-1.5 py-0.5 rounded">
              {activity.field.name} change
            </span>
          )}
        </div>
      </div>
      <div className="p-3">
        {activity.field ? (
          <div>
            <p className="text-sm">
              <span className="font-medium">{activity.field.name}</span> is now{' '}
              <span className="text-teal-primary">{activity.field.value}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm">{activity.content}</p>
        )}
      </div>
      <div className="bg-slate-light/5 p-2 flex justify-end space-x-2">
        <button className="p-1 rounded hover:bg-slate-light/20">
          <MessageSquare size={14} className="text-slate-medium" />
        </button>
        <button className="p-1 rounded hover:bg-slate-light/20">
          <Check size={14} className="text-slate-medium" />
        </button>
      </div>
    </div>
  );
}
