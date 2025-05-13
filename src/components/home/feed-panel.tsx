import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { format, parseISO, differenceInDays, differenceInMinutes } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/shared/avatar";
import { Card } from "@/components/ui/card";
import { useActivityTracking, ActivityItem } from "@/hooks/use-activity-tracking";
import { Edit, MessageSquare, UserPlus, Plus, Trash2, Filter, BarChart, ChevronDown, ChevronRight, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Helper function to group activities
const groupSimilarActivities = (activities: ActivityItem[]) => {
  const grouped: ActivityItem[][] = [];
  let currentGroup: ActivityItem[] = [];

  activities.forEach((activity, index) => {
    if (index === 0) {
      currentGroup = [activity];
    } else {
      const prevActivity = activities[index - 1];
      const timeDiff = differenceInMinutes(
        parseISO(activity.timestamp),
        parseISO(prevActivity.timestamp)
      );

      // Group activities if they are the same type and within 5 minutes of each other
      if (
        activity.activityType === prevActivity.activityType &&
        (activity.activityType === 'login' || activity.activityType === 'logout') &&
        timeDiff <= 5 &&
        activity.userId === prevActivity.userId
      ) {
        currentGroup.push(activity);
      } else {
        if (currentGroup.length > 0) {
          grouped.push(currentGroup);
        }
        currentGroup = [activity];
      }
    }
  });

  if (currentGroup.length > 0) {
    grouped.push(currentGroup);
  }

  return grouped;
};

// Memoize the ActivityFeedItem component
const ActivityFeedItem = memo(({ activity, groupedActivities }: { activity: ActivityItem, groupedActivities?: ActivityItem[] }) => {
  // Get activity icon based on type
  const getActivityIcon = () => {
    switch (activity.activityType) {
      case 'cell_edit':
        return <Edit className="h-4 w-4" />;
      case 'contact_add':
        return <UserPlus className="h-4 w-4" />;
      case 'column_add':
      case 'column_delete':
        return <Plus className="h-4 w-4" />;
      case 'filter_change':
        return <Filter className="h-4 w-4" />;
      case 'note_add':
        return <MessageSquare className="h-4 w-4" />;
      case 'login':
      case 'logout':
        return <LogIn className="h-4 w-4" />;
      default:
        return <BarChart className="h-4 w-4" />;
    }
  };

  // Get activity description based on type
  const getActivityText = () => {
    switch (activity.activityType) {
      case 'cell_edit':
        return (
          <span>
            {activity.details?.message || (
              <>
                updated <span className="text-teal-primary">{activity.fieldName}</span>
                {activity.entityName && (
                  <> for <span className="text-teal-primary">{activity.entityName}</span></>
                )}
              </>
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
        if (groupedActivities && groupedActivities.length > 1) {
          return <span>logged in {groupedActivities.length} times</span>;
        }
        return <span>logged in to the system</span>;
      case 'logout':
        if (groupedActivities && groupedActivities.length > 1) {
          return <span>logged out {groupedActivities.length} times</span>;
        }
        return <span>logged out of the system</span>;
      default:
        return <span>performed an action</span>;
    }
  };

  return (
    <div className="flex items-start space-x-4 p-4">
      <Avatar
        name={activity.userName}
        className="h-8 w-8"
      />
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{activity.userName}</p>
          <span className="text-xs text-gray-500">
            {format(parseISO(activity.timestamp), 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="rounded-full bg-gray-100 p-1">
            {getActivityIcon()}
          </span>
          <p className="text-sm text-gray-600">{getActivityText()}</p>
        </div>
      </div>
    </div>
  );
});

ActivityFeedItem.displayName = 'ActivityFeedItem';

export function FeedPanel() {
  const [activeTab, setActiveTab] = useState("my-feed");
  const { activities, isLoading } = useActivityTracking();
  const { user } = useAuth();
  const [groupedActivities, setGroupedActivities] = useState<Record<string, ActivityItem[][]>>({});
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  // Memoize the filtered activities
  const filteredActivities = useMemo(() => {
    if (activeTab === "my-feed" && user) {
      return activities.filter(activity => activity.userId === user.id);
    }
    return activities;
  }, [activities, activeTab, user]);

  // Group activities by date and similar actions
  useEffect(() => {
    if (!filteredActivities.length) return;

    const grouped: Record<string, ActivityItem[][]> = {};
    const sortedActivities = [...filteredActivities].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const groupedByDate = sortedActivities.reduce((acc, activity) => {
      const date = new Date(activity.timestamp).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(activity);
      return acc;
    }, {} as Record<string, ActivityItem[]>);

    // Group similar activities within each day
    Object.entries(groupedByDate).forEach(([date, dateActivities]) => {
      grouped[date] = groupSimilarActivities(dateActivities);
    });

    setGroupedActivities(grouped);

    // Initialize collapsed state for new days
    const newCollapsedState = { ...collapsedDays };
    Object.keys(grouped).forEach(date => {
      if (newCollapsedState[date] === undefined) {
        newCollapsedState[date] = false; // Default to expanded
      }
    });
    setCollapsedDays(newCollapsedState);
  }, [filteredActivities]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const toggleDayCollapse = useCallback((date: string) => {
    setCollapsedDays(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  }, []);

  if (isLoading) {
    return (
      <Card className="h-full overflow-hidden flex flex-col">
        <div className="p-4">Loading activities...</div>
      </Card>
    );
  }

  if (!filteredActivities.length) {
    return (
      <Card className="h-full overflow-hidden flex flex-col">
        <div className="p-4">No activities to display</div>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <div className="border-b p-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="my-feed">My Feed</TabsTrigger>
            <TabsTrigger value="all">All Activities</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedActivities).map(([date, groupedDateActivities]) => (
          <div key={date} className="border-b last:border-0">
            <button
              onClick={() => toggleDayCollapse(date)}
              className="w-full bg-gray-50 px-4 py-2 sticky top-0 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                {collapsedDays[date] ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {differenceInDays(new Date(), parseISO(date)) === 0
                  ? "Today"
                  : format(parseISO(date), "MMMM d, yyyy")}
                <span className="text-xs text-gray-400">
                  ({groupedDateActivities.reduce((sum, group) => sum + group.length, 0)} activities)
                </span>
              </p>
            </button>
            {!collapsedDays[date] && groupedDateActivities.map((group) => (
              <ActivityFeedItem
                key={group[0].id}
                activity={group[0]}
                groupedActivities={group.length > 1 ? group : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
