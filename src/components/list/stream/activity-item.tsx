
import { MessageSquare, Check, Edit, Phone } from "lucide-react";
import { Avatar } from "@/components/shared/avatar";
import { ActivityItemProps } from "./activity-item-types";

export function ActivityItem({ activity }: ActivityItemProps) {
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
