import { useState, useEffect } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/shared/avatar";
import { Card } from "@/components/ui/card";
import { useActivityTracking, ActivityItem } from "@/hooks/use-activity-tracking";
import { Edit, MessageSquare, UserPlus, Plus, Trash2, Filter, BarChart } from "lucide-react";
import { useAuth } from "@/components/auth";
import { Skeleton } from "@/components/ui/skeleton";

export function FeedPanel() {
  const [activeTab, setActiveTab] = useState("my-feed");
  const { activities, isLoading } = useActivityTracking();
  const { user } = useAuth();
  const [groupedActivities, setGroupedActivities] = useState<Record<string, ActivityItem[]>>({});
  
  // Group activities by date
  useEffect(() => {
    if (!activities.length) return;
    
    const grouped: Record<string, ActivityItem[]> = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(activity);
    });
    
    setGroupedActivities(grouped);
  }, [activities]);
  
  // Filter activities based on active tab
  const getFilteredActivities = () => {
    if (activeTab === "my-feed" && user) {
      // Filter to only show current user's activities
      return activities.filter(activity => activity.userId === user.id);
    }
    return activities;
  };

  // Get activity icon based on type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'cell_edit':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'contact_add':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'column_add':
        return <Plus className="h-4 w-4 text-teal-primary" />;
      case 'column_delete':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'filter_change':
        return <Filter className="h-4 w-4 text-purple-500" />;
      case 'note_add':
        return <MessageSquare className="h-4 w-4 text-orange-500" />;
      case 'login':
        return <BarChart className="h-4 w-4 text-gray-500" />;
      default:
        return <Edit className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get activity text based on type
  const getActivityText = (activity: ActivityItem) => {
    switch (activity.activityType) {
      case 'cell_edit':
        return (
          <span>
            updated <span className="text-teal-primary">{activity.fieldName}</span> for{' '}
            <span className="text-teal-primary">{getEntityName(activity)}</span>
          </span>
        );
      case 'contact_add':
        return (
          <span>
            added a new contact <span className="text-teal-primary">{activity.entityName}</span>
          </span>
        );
      case 'column_add':
        return (
          <span>
            added a new column <span className="text-teal-primary">{activity.entityName}</span>
          </span>
        );
      case 'column_delete':
        return (
          <span>
            deleted column <span className="text-teal-primary">{activity.entityName}</span>
          </span>
        );
      case 'filter_change':
        return (
          <span>
            changed filters in <span className="text-teal-primary">Contacts list</span>
          </span>
        );
      case 'note_add':
        return (
          <span>
            added a note to <span className="text-teal-primary">{activity.entityName}</span>
          </span>
        );
      case 'login':
        return <span>logged in to the system</span>;
      default:
        return <span>performed an action</span>;
    }
  };

  // Helper to get entity name or default
  const getEntityName = (activity: ActivityItem) => {
    if (activity.entityName) return activity.entityName;
    
    // For contact updates without a name, use ID or default
    if (activity.entityId && activity.entityType === 'contact') {
      return activity.entityId.replace('lead-', 'Contact ');
    }
    
    return 'Unknown';
  };

  // Render date header
  const renderDateHeader = (dateString: string) => {
    const date = parseISO(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = dateString === today.toISOString().split('T')[0];
    const isYesterday = dateString === yesterday.toISOString().split('T')[0]; 
    
    let dateDisplay;
    if (isToday) {
      dateDisplay = 'Today';
    } else if (isYesterday) {
      dateDisplay = 'Yesterday';
    } else if (differenceInDays(today, date) < 7) {
      dateDisplay = format(date, 'EEEE'); // e.g. "Monday"
    } else {
      dateDisplay = format(date, 'MMM d, yyyy');
    }
    
    return (
      <div className="px-4 py-3 bg-[#f3f4f5] border-b border-slate-light/30">
        <h3 className="text-sm font-medium text-slate-medium">
          {dateDisplay}
        </h3>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-white rounded-lg shadow-sm overflow-hidden h-full flex flex-col">
        {/* Tabs skeleton */}
        <div className="border-b border-slate-light/30">
          <div className="flex justify-between items-center px-4 pt-4">
            <div className="flex gap-1 p-1 bg-muted rounded-md">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        </div>

        {/* Activity items skeleton */}
        <div className="overflow-y-auto flex-1">
          {/* Date header skeleton */}
          <div className="px-4 py-3 bg-[#f3f4f5] border-b border-slate-light/30">
            <Skeleton className="h-4 w-16" />
          </div>
          
          {/* Activity items */}
          <div className="divide-y divide-slate-light/30">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-16 w-full rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }
  
  const filteredActivities = getFilteredActivities();
  const sortedDates = Object.keys(groupedActivities).sort((a, b) => b.localeCompare(a));
  
  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-slate-light/30">
          <div className="flex justify-between items-center px-4 pt-4">
            <TabsList>
              <TabsTrigger value="my-feed">My Activity</TabsTrigger>
              <TabsTrigger value="all">Team Activity</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {filteredActivities.length === 0 ? (
            <div className="p-4 text-center text-slate-medium">
              No activities to display.
            </div>
          ) : (
            <>
              {sortedDates.map(date => {
                const dateActivities = groupedActivities[date]?.filter(
                  activity => activeTab === "all" || activity.userId === user?.id
                );
                
                if (!dateActivities || dateActivities.length === 0) return null;
                
                return (
                  <div key={date}>
                    {renderDateHeader(date)}
                    <div className="divide-y divide-slate-light/30">
                      {dateActivities.map(activity => (
                        <ActivityFeedItem key={activity.id} activity={activity} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </Tabs>
    </Card>
  );
}

function ActivityFeedItem({ activity }: { activity: ActivityItem }) {
  // Format timestamp
  const formattedTime = format(new Date(activity.timestamp), "h:mm a");
  
  // Get icon based on activity type
  const getActivityIcon = () => {
    switch (activity.activityType) {
      case 'cell_edit':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'contact_add':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'column_add':
        return <Plus className="h-4 w-4 text-teal-primary" />;
      case 'column_delete':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'filter_change':
        return <Filter className="h-4 w-4 text-purple-500" />;
      case 'note_add':
        return <MessageSquare className="h-4 w-4 text-orange-500" />;
      case 'login':
        return <BarChart className="h-4 w-4 text-gray-500" />;
      default:
        return <Edit className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get activity description based on type
  const getActivityText = () => {
    switch (activity.activityType) {
      case 'cell_edit':
        return (
          <span>
            updated <span className="text-teal-primary">{activity.fieldName}</span> 
            {activity.entityName && (
              <> for <span className="text-teal-primary">{activity.entityName}</span></>
            )}
          </span>
        );
      case 'contact_add':
        return (
          <span>
            added a new contact <span className="text-teal-primary">{activity.entityName}</span>
          </span>
        );
      case 'column_add':
        return (
          <span>
            added a new column <span className="text-teal-primary">{activity.entityName}</span>
          </span>
        );
      case 'column_delete':
        return (
          <span>
            deleted column <span className="text-teal-primary">{activity.entityName}</span>
          </span>
        );
      case 'filter_change':
        return (
          <span>
            changed filters in <span className="text-teal-primary">Contacts list</span>
          </span>
        );
      case 'note_add':
        return (
          <span>
            added a note to <span className="text-teal-primary">{activity.entityName}</span>
          </span>
        );
      case 'login':
        return <span>logged in to the system</span>;
      default:
        return <span>performed an action</span>;
    }
  };

  // Show changes for cell edit activities
  const renderValueChange = () => {
    if (activity.activityType !== 'cell_edit' && activity.activityType !== 'note_add') {
      return null;
    }

    if (activity.activityType === 'note_add' && activity.newValue) {
      return (
        <div className="bg-slate-light/10 p-3 rounded-md text-sm mt-2">
          {activity.newValue}
        </div>
      );
    }

    // Format old and new values
    const oldVal = activity.oldValue === undefined || activity.oldValue === null 
      ? '—' 
      : activity.oldValue;
    
    const newVal = activity.newValue === undefined || activity.newValue === null 
      ? '—' 
      : activity.newValue;

    return (
      <div className="bg-slate-light/10 p-3 rounded-md text-sm mt-2">
        <div className="flex">
          <div className="text-gray-500 mr-2">From:</div>
          <div className="flex-1">{oldVal}</div>
        </div>
        <div className="flex mt-1">
          <div className="text-gray-500 mr-2">To:</div>
          <div className="flex-1 text-teal-primary">{newVal}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 hover:bg-slate-light/10">
      <div className="flex gap-3">
        <Avatar 
          name={activity.userName} 
          initials={activity.userName.substring(0, 2).toUpperCase()} 
        />
        
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="font-semibold">{activity.userName}</span>
            <span className="text-slate-medium">{getActivityText()}</span>
          </div>
          
          <div className="text-xs text-slate-medium mb-2">
            {formattedTime}
          </div>
          
          {renderValueChange()}
          
          {activity.entityId && activity.entityType === 'contact' && (
            <div className="mt-3">
              <div className="flex items-center">
                <Avatar 
                  name={activity.entityName || activity.entityId} 
                  size="sm" 
                />
                <span className="ml-2 text-sm">
                  {activity.entityName || activity.entityId.replace('lead-', 'Contact ')}
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-start pt-1">
          {getActivityIcon()}
        </div>
      </div>
    </div>
  );
}
