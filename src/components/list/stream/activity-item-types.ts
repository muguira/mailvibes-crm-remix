
import { ActivityType } from "../types";

export interface ActivityItemProps {
  activity: {
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
  };
}
