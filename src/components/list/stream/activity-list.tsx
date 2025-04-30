
import { ActivityItem } from "./activity-item";
import { ActivityType } from "../types";

interface ActivityListProps {
  activities: {
    id: string;
    type: ActivityType;
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
  }[];
}

export function ActivityList({ activities }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center text-slate-medium p-4">
        No activities yet. Add a comment or update information to see activity.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
