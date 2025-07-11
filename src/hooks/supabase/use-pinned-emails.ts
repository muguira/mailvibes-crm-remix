import { useAuth } from "@/components/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../use-toast";
import { logger } from "@/utils/logger";

export interface PinnedEmail {
  id: string;
  user_id: string;
  email_id: string;
  contact_email: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function usePinnedEmails(contactEmail?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchPinnedEmails = async (): Promise<PinnedEmail[]> => {
    if (!user || !contactEmail) return [];

    try {
      const { data, error } = await (supabase as any)
        .from("pinned_emails")
        .select("*")
        .eq("user_id", user.id)
        .eq("contact_email", contactEmail)
        .eq("is_pinned", true);

      if (error) {
        logger.error("Error fetching pinned emails:", error);
        return [];
      }

      return (data || []) as PinnedEmail[];
    } catch (error) {
      logger.error("Error fetching pinned emails:", error);
      return [];
    }
  };

  // Query to fetch pinned emails
  const pinnedEmailsQuery = useQuery({
    queryKey: ["pinned_emails", user?.id, contactEmail],
    queryFn: fetchPinnedEmails,
    enabled: !!user && !!contactEmail,
  });

  // Mutation to toggle pin status for an email
  const toggleEmailPinMutation = useMutation({
    mutationFn: async ({
      emailId,
      isPinned,
    }: {
      emailId: string;
      isPinned: boolean;
    }) => {
      if (!user || !contactEmail)
        throw new Error("User or contact email not available");

      try {
        if (isPinned) {
          // Pin the email - insert or update
          const { data, error } = await (supabase as any)
            .from("pinned_emails")
            .upsert({
              user_id: user.id,
              email_id: emailId,
              contact_email: contactEmail,
              is_pinned: true,
              updated_at: new Date().toISOString(),
            })
            .select();

          if (error) throw error;
          return data[0];
        } else {
          // Unpin the email - delete or set is_pinned to false
          const { data, error } = await (supabase as any)
            .from("pinned_emails")
            .delete()
            .eq("user_id", user.id)
            .eq("email_id", emailId)
            .eq("contact_email", contactEmail)
            .select();

          if (error) throw error;
          return data[0];
        }
      } catch (error) {
        logger.error("Error in toggleEmailPinMutation:", error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate pinned emails query
      queryClient.invalidateQueries({
        queryKey: ["pinned_emails", user?.id, contactEmail],
      });

      // Also invalidate timeline activities to trigger re-sorting
      queryClient.invalidateQueries({
        queryKey: ["timeline_activities"],
      });

      toast({
        title: "Success",
        description: variables.isPinned
          ? "Email pinned successfully"
          : "Email unpinned successfully",
      });
    },
    onError: (error, variables) => {
      logger.error("Error toggling email pin:", error);
      toast({
        title: "Error",
        description: `Failed to ${variables.isPinned ? "pin" : "unpin"} email: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Helper function to check if an email is pinned
  const isEmailPinned = (emailId: string): boolean => {
    return (
      pinnedEmailsQuery.data?.some(
        (pinnedEmail) => pinnedEmail.email_id === emailId
      ) || false
    );
  };

  return {
    pinnedEmails: pinnedEmailsQuery.data || [],
    isLoading: pinnedEmailsQuery.isLoading,
    isError: pinnedEmailsQuery.isError,
    toggleEmailPin: toggleEmailPinMutation.mutate,
    isEmailPinned,
  };
}
