
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from './use-toast';

export interface Activity {
  id: string;
  user_id: string;
  user_name: string;
  timestamp: string;
  activity_type: string;
  entity_id?: string;
  entity_type?: string;
  entity_name?: string;
  field_name?: string;
  old_value?: any;
  new_value?: any;
  details?: any;
}

export function useActivityTracking() {
  const { user } = useAuth();
  const [isLogging, setIsLogging] = useState(false);

  // Function to log a change to a cell
  const logCellEdit = useCallback(
    async (entityId: string, fieldName: string, newValue: any, oldValue: any) => {
      if (!user) return null;

      try {
        setIsLogging(true);

        // Prepare the activity data
        const activity = {
          user_id: user.id,
          user_name: user.email || 'User',
          timestamp: new Date().toISOString(),
          activity_type: 'edit',
          entity_id: entityId,
          entity_type: 'contact',
          field_name: fieldName,
          old_value: oldValue,
          new_value: newValue,
        };

        // Try to insert into Supabase
        try {
          const { error } = await supabase.from('user_activities').insert(activity);

          if (error) {
            console.error('Could not log activity to Supabase:', error);
            // Fall back to local storage
            const localActivities = JSON.parse(localStorage.getItem('activities') || '[]');
            localActivities.push({ ...activity, id: crypto.randomUUID() });
            localStorage.setItem('activities', JSON.stringify(localActivities));
          }
        } catch (error) {
          console.error('Error logging activity:', error);
          // Fall back to local storage
          const localActivities = JSON.parse(localStorage.getItem('activities') || '[]');
          localActivities.push({ ...activity, id: crypto.randomUUID() });
          localStorage.setItem('activities', JSON.stringify(localActivities));
        }

        return true;
      } catch (e) {
        console.error('Error in logCellEdit:', e);
        return false;
      } finally {
        setIsLogging(false);
      }
    },
    [user]
  );

  // Function to log a contact being added
  const logContactAdd = useCallback(
    async (entityId: string, contactName: string) => {
      if (!user) return null;

      try {
        setIsLogging(true);

        // Prepare the activity data
        const activity = {
          user_id: user.id,
          user_name: user.email || 'User',
          timestamp: new Date().toISOString(),
          activity_type: 'create',
          entity_id: entityId,
          entity_type: 'contact',
          entity_name: contactName,
        };

        // Try to insert into Supabase
        try {
          const { error } = await supabase.from('user_activities').insert(activity);

          if (error) {
            console.error('Could not log activity to Supabase:', error);
            // Fall back to local storage
            const localActivities = JSON.parse(localStorage.getItem('activities') || '[]');
            localActivities.push({ ...activity, id: crypto.randomUUID() });
            localStorage.setItem('activities', JSON.stringify(localActivities));
          }
        } catch (error) {
          console.error('Error logging activity:', error);
          // Fall back to local storage
          const localActivities = JSON.parse(localStorage.getItem('activities') || '[]');
          localActivities.push({ ...activity, id: crypto.randomUUID() });
          localStorage.setItem('activities', JSON.stringify(localActivities));
        }

        return true;
      } catch (e) {
        console.error('Error in logContactAdd:', e);
        return false;
      } finally {
        setIsLogging(false);
      }
    },
    [user]
  );

  // Function to log a column being added
  const logColumnAdd = useCallback(
    async (columnId: string, columnName: string) => {
      if (!user) return null;

      try {
        setIsLogging(true);

        // Prepare the activity data
        const activity = {
          user_id: user.id,
          user_name: user.email || 'User',
          timestamp: new Date().toISOString(),
          activity_type: 'column_add',
          entity_id: columnId,
          entity_type: 'column',
          entity_name: columnName,
        };

        // Try to insert into Supabase
        try {
          const { error } = await supabase.from('user_activities').insert(activity);

          if (error) {
            console.error('Could not log activity to Supabase:', error);
            // Fall back to local storage
            const localActivities = JSON.parse(localStorage.getItem('activities') || '[]');
            localActivities.push({ ...activity, id: crypto.randomUUID() });
            localStorage.setItem('activities', JSON.stringify(localActivities));
          }
        } catch (error) {
          console.error('Error logging activity:', error);
          // Fall back to local storage
          const localActivities = JSON.parse(localStorage.getItem('activities') || '[]');
          localActivities.push({ ...activity, id: crypto.randomUUID() });
          localStorage.setItem('activities', JSON.stringify(localActivities));
        }

        return true;
      } catch (e) {
        console.error('Error in logColumnAdd:', e);
        return false;
      } finally {
        setIsLogging(false);
      }
    },
    [user]
  );

  // Function to log a column being deleted
  const logColumnDelete = useCallback(
    async (columnId: string, columnName: string) => {
      if (!user) return null;

      try {
        setIsLogging(true);

        // Prepare the activity data
        const activity = {
          user_id: user.id,
          user_name: user.email || 'User',
          timestamp: new Date().toISOString(),
          activity_type: 'column_delete',
          entity_id: columnId,
          entity_type: 'column',
          entity_name: columnName,
        };

        // Try to insert into Supabase
        try {
          const { error } = await supabase.from('user_activities').insert(activity);

          if (error) {
            console.error('Could not log activity to Supabase:', error);
            // Fall back to local storage
            const localActivities = JSON.parse(localStorage.getItem('activities') || '[]');
            localActivities.push({ ...activity, id: crypto.randomUUID() });
            localStorage.setItem('activities', JSON.stringify(localActivities));
          }
        } catch (error) {
          console.error('Error logging activity:', error);
          // Fall back to local storage
          const localActivities = JSON.parse(localStorage.getItem('activities') || '[]');
          localActivities.push({ ...activity, id: crypto.randomUUID() });
          localStorage.setItem('activities', JSON.stringify(localActivities));
        }

        return true;
      } catch (e) {
        console.error('Error in logColumnDelete:', e);
        return false;
      } finally {
        setIsLogging(false);
      }
    },
    [user]
  );

  // Function to log filter changes
  const logFilterChange = useCallback(
    async (filterDetails: { type: string; [key: string]: any }) => {
      if (!user) return null;

      try {
        setIsLogging(true);

        // Prepare the activity data
        const activity = {
          user_id: user.id,
          user_name: user.email || 'User',
          timestamp: new Date().toISOString(),
          activity_type: 'filter_change',
          entity_type: 'filter',
          details: filterDetails,
        };

        // Try to insert into Supabase
        try {
          const { error } = await supabase.from('user_activities').insert(activity);

          if (error) {
            console.error('Could not log activity to Supabase:', error);
            // Fall back to local storage
            const localActivities = JSON.parse(localStorage.getItem('activities') || '[]');
            localActivities.push({ ...activity, id: crypto.randomUUID() });
            localStorage.setItem('activities', JSON.stringify(localActivities));
          }
        } catch (error) {
          console.error('Error logging activity:', error);
          // Fall back to local storage
          const localActivities = JSON.parse(localStorage.getItem('activities') || '[]');
          localActivities.push({ ...activity, id: crypto.randomUUID() });
          localStorage.setItem('activities', JSON.stringify(localActivities));
        }

        return true;
      } catch (e) {
        console.error('Error in logFilterChange:', e);
        return false;
      } finally {
        setIsLogging(false);
      }
    },
    [user]
  );

  // Function to get recent activities
  const getRecentActivities = useCallback(
    async (limit: number = 100) => {
      if (!user) return [];

      try {
        // Try to fetch from Supabase first
        const { data, error } = await supabase
          .from('user_activities')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(limit);

        if (error) {
          console.error('Could not fetch activities from Supabase:', error);
          
          // Fall back to local storage
          const localActivities = JSON.parse(localStorage.getItem('activities') || '[]');
          return localActivities.slice(0, limit);
        }

        return data;
      } catch (e) {
        console.error('Error fetching activities:', e);
        
        // Fall back to local storage
        const localActivities = JSON.parse(localStorage.getItem('activities') || '[]');
        return localActivities.slice(0, limit);
      }
    },
    [user]
  );

  return {
    logCellEdit,
    logContactAdd,
    logColumnAdd,
    logColumnDelete,
    logFilterChange,
    getRecentActivities,
    isLogging
  };
}
