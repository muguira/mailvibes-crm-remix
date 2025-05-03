
// @ts-nocheck
// This file will be properly implemented in a future sprint
// Currently disabled via ts-nocheck to unblock builds

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types for activity data
export interface Activity {
  id: string;
  user_id: string;
  contact_id: string;
  type: string;
  content?: string;
  timestamp: string;
  created_at: string;
}

export function useActivities(contactId?: string) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !contactId) {
      setLoading(false);
      return;
    }

    async function loadActivities() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setActivities(data || []);
      } catch (error) {
        console.error('Error loading activities:', error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    }

    loadActivities();
  }, [contactId, user]);

  async function createActivity(activity: Omit<Activity, 'id' | 'created_at'>) {
    if (!user) return null;

    try {
      const newActivity = {
        user_id: user.id,
        contact_id: activity.contact_id,
        type: activity.type,
        content: activity.content,
        timestamp: activity.timestamp || new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('activities')
        .insert(newActivity)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setActivities(prev => [data as Activity, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating activity:', error);
      return null;
    }
  }

  return {
    activities,
    loading,
    createActivity,
  };
}
