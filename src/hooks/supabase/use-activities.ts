// @ts-nocheck
import { useAuth } from "@/components/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../use-toast";
import { logger } from "@/utils/logger";

export interface Activity {
  id: string;
  contact_id: string;
  type: string;
  content?: string | null;
  timestamp: string;
}

// Hook for activities CRUD operations
export function useActivities(contactId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchActivities = async (): Promise<Activity[]> => {
    if (!user || !contactId) return [];

    const { data, error } = await supabase
      .from("user_activities")
      .select("*")
      .eq("entity_id", contactId)
      .eq("entity_type", "contact")
      .in("activity_type", ["note_add", "email", "call", "meeting"])
      .order("timestamp", { ascending: false });

    if (error) {
      logger.error("Error fetching activities:", error);
      toast({
        title: "Error",
        description: "Failed to load activities",
        variant: "destructive",
      });
      return [];
    }

    // Transform user_activities to match Activity interface
    const activities = (data || []).map((item: any) => {
      let content = null;
      try {
        if (item.new_value) {
          // For note_add activities, new_value should be stored as plain string
          if (item.activity_type === "note_add") {
            content = item.new_value;
          } else {
            // For other activities, try to parse JSON if it's a string
            content =
              typeof item.new_value === "string"
                ? item.new_value.startsWith("{") ||
                  item.new_value.startsWith("[")
                  ? JSON.parse(item.new_value)
                  : item.new_value
                : item.new_value;
          }
        } else if (item.details) {
          const details =
            typeof item.details === "string"
              ? JSON.parse(item.details)
              : item.details;
          content = details.content || null;
        }
      } catch (e) {
        logger.error("Error parsing activity content:", e);
        content = item.new_value || null;
      }

      return {
        id: item.id,
        contact_id: item.entity_id,
        type: item.activity_type === "note_add" ? "note" : item.activity_type,
        content,
        timestamp: item.timestamp,
      };
    });

    return activities;
  };

  // Query to fetch activities
  const activitiesQuery = useQuery({
    queryKey: ["activities", user?.id, contactId],
    queryFn: fetchActivities,
    enabled: !!user && !!contactId,
  });

  // Mutation to create an activity
  const createActivityMutation = useMutation({
    mutationFn: async (newActivity: {
      type: string;
      content?: string;
      timestamp?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");
      if (!contactId) throw new Error("Contact ID is required");

      const activityType =
        newActivity.type === "note" ? "note_add" : newActivity.type;

      const { data, error } = await supabase
        .from("user_activities")
        .insert({
          user_id: user.id,
          user_name: user.email?.split("@")[0] || "User",
          user_email: user.email,
          activity_type: activityType,
          entity_id: contactId,
          entity_type: "contact",
          entity_name: "",
          new_value: newActivity.content || null, // Store as string directly
          timestamp: newActivity.timestamp || new Date().toISOString(),
        })
        .select();

      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activities", user?.id, contactId],
      });
      // Also invalidate user activities
      queryClient.invalidateQueries({
        queryKey: ["user_activities", user?.id],
      });
      toast({
        title: "Success",
        description: "Activity recorded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record activity: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    activities: activitiesQuery.data || [],
    isLoading: activitiesQuery.isLoading,
    isError: activitiesQuery.isError,
    createActivity: createActivityMutation.mutate,
  };
}
