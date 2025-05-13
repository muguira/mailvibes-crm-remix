import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/shared/avatar";
import { Card } from "@/components/ui/card";
import { useActivityTracking, ActivityItem } from "@/hooks/use-activity-tracking";
import { Edit, MessageSquare, UserPlus, Plus, Filter, BarChart, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";

// Memoize the ActivityFeedItem component
const ActivityFeedItem = memo(({ activity }: { activity: ActivityItem }) => {
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState("");

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
    const userName = activity.userName.split('@')[0]; // Remove email domain if present

    switch (activity.activityType) {
      case 'cell_edit':
        return (
          <span>
            <span className="font-medium">{userName}</span> updated{' '}
            <span className="text-teal-primary">{activity.fieldName}</span>
            {activity.entityName && (
              <> for <span className="text-teal-primary">{activity.entityName}</span></>
            )}
          </span>
        );
      case 'contact_add':
        return (
          <span>
            <span className="font-medium">{userName}</span> added a new contact{' '}
            <span className="text-teal-primary">{activity.entityName}</span>
          </span>
        );
      case 'note_add':
        return (
          <span>
            <span className="font-medium">{userName}</span> commented on a{' '}
            <span className="text-teal-primary">Lead</span>
          </span>
        );
      case 'login':
        return (
          <span>
            <span className="font-medium">{userName}</span> logged in to the system
          </span>
        );
      case 'logout':
        return (
          <span>
            <span className="font-medium">{userName}</span> logged out of the system
          </span>
        );
      default:
        return (
          <span>
            <span className="font-medium">{userName}</span> performed an action
          </span>
        );
    }
  };

  const handleAddComment = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && comment.trim()) {
      // TODO: Implement comment functionality
      console.log('Adding comment:', comment);
      setComment('');
      setShowCommentInput(false);
    }
  };

  return (
    <div className="py-4 px-6 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-start gap-3">
        <Avatar
          name={activity.userName}
          className="h-8 w-8 bg-blue-500"
        />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-700">
                {getActivityText()}
              </p>
              {activity.details?.message && (
                <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded-md">
                  {activity.details.message}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {format(parseISO(activity.timestamp), "MMM d 'at' h:mm a")}
            </span>
          </div>

          {/* Comment section */}
          <div className="mt-2">
            {showCommentInput ? (
              <div className="flex gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={handleAddComment}
                  placeholder="Add a comment..."
                  className="text-sm flex-1"
                />
                <button
                  onClick={() => {
                    if (comment.trim()) {
                      handleAddComment({ key: 'Enter' } as React.KeyboardEvent<HTMLInputElement>);
                    }
                  }}
                  className="px-3 py-1 text-sm bg-teal-primary text-white rounded-md hover:bg-teal-dark transition-colors"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCommentInput(true)}
                className="text-sm text-gray-500 hover:text-teal-primary transition-colors flex items-center gap-1"
              >
                <MessageSquare className="h-3 w-3" />
                Add comment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ActivityFeedItem.displayName = 'ActivityFeedItem';

export function FeedPanel() {
  const [activeTab, setActiveTab] = useState("my-feed");
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const { activities, isLoading } = useActivityTracking();
  const { user } = useAuth();

  // Memoize the filtered activities
  const filteredActivities = useMemo(() => {
    if (activeTab === "my-feed" && user) {
      return activities.filter(activity => activity.userId === user.id);
    }
    return activities;
  }, [activities, activeTab, user]);

  // Group activities by date and combine login/logout activities
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};
    const loginLogoutGroups: Record<string, { logins: ActivityItem[], logouts: ActivityItem[] }> = {};

    filteredActivities.forEach(activity => {
      const date = format(parseISO(activity.timestamp), 'MMM d, yyyy');

      if (!groups[date]) {
        groups[date] = [];
        loginLogoutGroups[date] = { logins: [], logouts: [] };
      }

      if (activity.activityType === 'login') {
        loginLogoutGroups[date].logins.push(activity);
      } else if (activity.activityType === 'logout') {
        loginLogoutGroups[date].logouts.push(activity);
      } else {
        groups[date].push(activity);
      }
    });

    // Combine login/logout activities for each date
    Object.entries(loginLogoutGroups).forEach(([date, { logins, logouts }]) => {
      if (logins.length > 0 || logouts.length > 0) {
        groups[date] = [
          ...(logins.length > 0 ? [logins[0]] : []), // Show only the first login
          ...(logouts.length > 0 ? [logouts[0]] : []), // Show only the first logout
          ...groups[date]
        ];
      }
    });

    return groups;
  }, [filteredActivities]);

  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-feed">My Feed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedActivities).map(([date, dateActivities]) => (
          <div key={date}>
            <button
              onClick={() => toggleDateExpansion(date)}
              className="w-full bg-white border-y border-gray-100 px-6 py-2 sticky top-0 z-10 backdrop-blur-sm bg-white/90 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
            >
              <h3 className="text-sm font-semibold text-gray-900">{date}</h3>
              <span className="text-xs text-gray-500">
                {expandedDates[date] ? 'Collapse' : 'Expand'} ({dateActivities.length} activities)
              </span>
            </button>
            {expandedDates[date] && dateActivities.map((activity) => (
              <ActivityFeedItem
                key={activity.id}
                activity={activity}
              />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
