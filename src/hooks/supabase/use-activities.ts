// @ts-nocheck
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../use-toast";

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
      .from('activities')
      .select('*')
      .eq('contact_id', contactId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activities',
        variant: 'destructive',
      });
      return [];
    }

    return data || [];
  };

  // Query to fetch activities
  const activitiesQuery = useQuery({
    queryKey: ['activities', user?.id, contactId],
    queryFn: fetchActivities,
    enabled: !!user && !!contactId,
  });

  // Mutation to create an activity
  const createActivityMutation = useMutation({
    mutationFn: async (newActivity: { type: string; content?: string; }) => {
      if (!user) throw new Error('User not authenticated');
      if (!contactId) throw new Error('Contact ID is required');

      const { data, error } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          contact_id: contactId,
          type: newActivity.type,
          content: newActivity.content,
        })
        .select();

      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', user?.id, contactId] });
      toast({
        title: 'Success',
        description: 'Activity recorded successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to record activity: ${error.message}`,
        variant: 'destructive',
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
