import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/task';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isPast, parseISO, startOfDay } from 'date-fns';
import { Database } from '@/types/supabase';
import { withRetrySupabase } from "@/utils/supabaseRetry";

export interface TaskData {
  id: string;
  title: string;
  deadline?: string;
  contact?: string;
  description?: string;
  display_status: "upcoming" | "overdue" | "completed";
  status: "on-track" | "at-risk" | "off-track";
  type: "follow-up" | "respond" | "task" | "cross-functional";
  tag?: string;
  priority?: "low" | "medium" | "high";
  user_id?: string; // Added user_id property
}

export function useTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchTasks = async (): Promise<TaskData[]> => {
    if (!user) return [];

    const result = await withRetrySupabase(
      () => supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false }),
      {
        maxAttempts: 3,
        onRetry: (error, attempt) => {
          console.log(`Retrying tasks fetch (attempt ${attempt})...`);
          if (attempt === 2) {
            toast({
              title: "Connection issues",
              description: "Having trouble loading tasks. Retrying...",
              variant: "default"
            });
          }
        }
      }
    );

    const { data, error } = result;

    if (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error fetching tasks",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive"
      });
      return [];
    }

    // Check for overdue tasks
    const tasks = data.map(task => {
      if (task.display_status === "completed" || !task.deadline) return task;

      const deadlineDate = parseISO(task.deadline);
      if (isPast(startOfDay(deadlineDate)) && task.display_status !== "overdue") {
        return { ...task, display_status: "overdue" };
      }
      return task;
    }) as TaskData[];

    return tasks;
  };

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: fetchTasks,
    enabled: !!user,
  });

  const createTask = useMutation({
    mutationFn: async (newTask: Omit<TaskData, "id" | "created_at" | "updated_at">) => {
      if (!user) throw new Error('User must be logged in');

      const taskWithUserId = {
        ...newTask,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contact: newTask.contact || null,
        deadline: newTask.deadline || null,
        description: newTask.description || null,
        tag: newTask.tag || null,
        priority: newTask.priority || null
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([taskWithUserId])
        .select('*');

      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      toast({ title: "Task created", description: "Your task has been created successfully" });
    },
    onError: (error: any) => {
      console.error('Error creating task:', error);
      toast({
        title: "Error creating task",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateTask = useMutation({
    mutationFn: async (updatedTask: Omit<TaskData, "created_at" | "updated_at">) => {
      if (!user) throw new Error('User must be logged in');

      // Ensure task has user_id and updated_at
      const taskWithMetadata = {
        ...updatedTask,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('tasks')
        .update(taskWithMetadata)
        .eq('id', updatedTask.id)
        .eq('user_id', user.id) // Ensure we only update user's own tasks
        .select('*');

      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      toast({ title: "Task updated", description: "Your task has been updated successfully" });
    },
    onError: (error: any) => {
      console.error('Error updating task:', error);
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) throw new Error('User must be logged in');

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      toast({ title: "Task deleted", description: "Your task has been deleted successfully" });
    },
    onError: (error: any) => {
      console.error('Error deleting task:', error);
      toast({
        title: "Error deleting task",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return {
    tasks,
    isLoading,
    error,
    createTask: (task: Omit<TaskData, "id" | "created_at" | "updated_at">) => createTask.mutate(task),
    updateTask: (task: Omit<TaskData, "created_at" | "updated_at">) => updateTask.mutate(task),
    deleteTask: (taskId: string) => deleteTask.mutate(taskId)
  };
}
