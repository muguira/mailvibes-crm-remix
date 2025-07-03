import { useAuth } from "@/components/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../use-toast";
import { Tables } from "@/types/supabase";
import { logger } from "@/utils/logger";

export type Comment = Tables<"comments"> & {
  user?: {
    email: string;
  };
};

export function useComments(activityId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchComments = async (): Promise<Comment[]> => {
    if (!user || !activityId) return [];

    try {
      // First get the comment IDs for this activity
      const { data: userActivityComments, error: linkError } = await supabase
        .from("user_activity_comments")
        .select("comment_id")
        .eq("user_activity_id", activityId);

      if (linkError) throw linkError;

      if (!userActivityComments?.length) return [];

      const commentIds = userActivityComments.map((uac) => uac.comment_id);

      // Then get the actual comments
      const { data: comments, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .in("id", commentIds)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      // Get the activity to get the user's email
      const { data: activity } = await supabase
        .from("user_activities")
        .select("user_email")
        .eq("id", activityId)
        .single();

      return (comments || []).map((comment) => ({
        ...comment,
        user: {
          email: activity?.user_email || user.email || "",
        },
      }));
    } catch (error) {
      logger.error("Error fetching comments:", error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
      return [];
    }
  };

  // Query to fetch comments
  const commentsQuery = useQuery({
    queryKey: ["comments", activityId],
    queryFn: fetchComments,
    enabled: !!user && !!activityId,
  });

  // Mutation to create a comment
  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("User not authenticated");
      if (!activityId) throw new Error("Activity ID is required");

      // First create the comment
      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .insert({
          user_id: user.id,
          content: content,
        })
        .select()
        .single();

      if (commentError) throw commentError;

      // Then create the link between comment and activity
      const { error: linkError } = await supabase
        .from("user_activity_comments")
        .insert({
          comment_id: comment.id,
          user_activity_id: activityId,
        });

      if (linkError) throw linkError;

      return {
        ...comment,
        user: {
          email: user.email || "",
        },
      } as Comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", activityId] });
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add comment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a comment
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id); // Ensure user can only delete their own comments

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", activityId] });
      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete comment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    comments: commentsQuery.data || [],
    isLoading: commentsQuery.isLoading,
    createComment: (content: string) => createCommentMutation.mutate(content),
    deleteComment: (commentId: string) =>
      deleteCommentMutation.mutate(commentId),
  };
}
