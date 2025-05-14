
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/shared/avatar";
import { Plus, AlertCircle, CheckCircle2, PencilLine, ArrowRight, Info } from "lucide-react";
import { UserActivity } from "@/hooks/supabase/use-user-activities";
import { useUserActivities } from "@/hooks/supabase/use-user-activities";
import { formatDistanceToNow } from "date-fns";

export function FeedPanel() {
  const { user } = useAuth();
  const { activities, isLoading } = useUserActivities();
  const [filter, setFilter] = useState<string>("all");

  // Function to render activity content
  const renderActivityContent = (activity: UserActivity) => {
    switch (activity.activity_type) {
      case "contact_add":
        return (
          <div className="flex items-start gap-2">
            <Plus className="h-4 w-4 mt-0.5 text-emerald-500" />
            <div>
              <span className="font-medium">Added new contact</span>
              <p className="text-muted-foreground text-sm">{activity.entity_name}</p>
            </div>
          </div>
        );
      case "cell_edit":
        return (
          <div className="flex items-start gap-2">
            <PencilLine className="h-4 w-4 mt-0.5 text-blue-500" />
            <div>
              <span className="font-medium">Updated {activity.field_name}</span>
              <p className="text-muted-foreground text-sm">
                <span className="line-through">{String(activity.old_value)}</span> 
                <ArrowRight className="h-3 w-3 mx-1 inline" />
                {String(activity.new_value)}
              </p>
            </div>
          </div>
        );
      case "contact_update":
        return (
          <div className="flex items-start gap-2">
            <PencilLine className="h-4 w-4 mt-0.5 text-amber-500" />
            <div>
              <span className="font-medium">
                Updated {activity.entity_name}'s {activity.field_name}
              </span>
              <p className="text-muted-foreground text-sm">
                <span className="line-through">{String(activity.old_value)}</span>
                <ArrowRight className="h-3 w-3 mx-1 inline" />
                {String(activity.new_value)}
              </p>
            </div>
          </div>
        );
      case "login":
        return (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500" />
            <div>
              <span className="font-medium">Logged in</span>
            </div>
          </div>
        );
      case "logout":
        return (
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-slate-500" />
            <div>
              <span className="font-medium">Logged out</span>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-slate-500" />
            <div>
              <span className="font-medium">{activity.activity_type}</span>
              {activity.entity_name && (
                <p className="text-muted-foreground text-sm">{activity.entity_name}</p>
              )}
            </div>
          </div>
        );
    }
  };

  // Filter activities based on the selected filter
  const filteredActivities = activities.filter(activity => {
    if (filter === "all") return true;
    if (filter === "contacts" && (activity.activity_type === "contact_add" || activity.activity_type === "contact_update")) return true;
    if (filter === "edits" && activity.activity_type === "cell_edit") return true;
    if (filter === "system" && (activity.activity_type === "login" || activity.activity_type === "logout")) return true;
    return false;
  });

  return (
    <div className="bg-background text-foreground rounded-lg overflow-hidden flex flex-col shadow-lg h-[500px]">
      <div className="p-3 pb-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border">
          <Avatar
            email={user?.email}
            name={user?.user_metadata?.name || user?.email?.split("@")[0] || "User"}
            className="h-full w-full"
          />
        </div>
        <h2 className="text-xl font-semibold">Activity Feed</h2>
      </div>

      <Tabs defaultValue="all" className="flex-1">
        <div className="border-none">
          <TabsList className="w-full flex p-0 bg-transparent">
            <TabsTrigger
              value="all"
              onClick={() => setFilter("all")}
              className="flex-1 py-1.5 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="contacts"
              onClick={() => setFilter("contacts")}
              className="flex-1 py-1.5 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
            >
              Contacts
            </TabsTrigger>
            <TabsTrigger
              value="edits"
              onClick={() => setFilter("edits")}
              className="flex-1 py-1.5 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
            >
              Edits
            </TabsTrigger>
            <TabsTrigger
              value="system"
              onClick={() => setFilter("system")}
              className="flex-1 py-1.5 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary hover:text-foreground transition-colors"
            >
              System
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="overflow-y-auto" style={{ height: '445px' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredActivities.length > 0 ? (
            <ul className="p-2">
              {filteredActivities.map((activity) => (
                <li key={activity.id} className="py-2 border-b border-border/50 last:border-0">
                  <div className="flex gap-2 items-start">
                    <div className="w-8 h-8 rounded-full flex-shrink-0 bg-muted flex items-center justify-center">
                      <Avatar
                        email={activity.user_email || ""}
                        name={activity.user_name || "User"}
                        className="h-full w-full"
                      />
                    </div>
                    <div className="flex-1">
                      {renderActivityContent(activity)}
                      <p className="text-muted-foreground text-xs mt-1">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>No activities found</p>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
