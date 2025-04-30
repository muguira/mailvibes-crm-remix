
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
  return (
    <div className="overflow-y-auto flex-1 bg-slate-light/5">
      <div className="p-4 space-y-4">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}
