import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '@supabase/supabase-js';

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: string;
  activityType: 'cell_edit' | 'contact_add' | 'filter_change' | 'column_add' | 'column_delete' | 'note_add' | 'login' | 'logout';
  entityId?: string;
  entityType?: 'contact' | 'lead' | 'column' | 'filter';
  entityName?: string;
  fieldName?: string;
  oldValue?: any;
  newValue?: any;
  details?: Record<string, any>;
}

// Local storage key for activity items when offline
const ACTIVITY_STORAGE_KEY = 'crm-activity-log';

export function useActivityTracking() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUser(session?.user ?? null);
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Memoize loadFromLocalStorage since it doesn't depend on any state
  const loadFromLocalStorage = useCallback((): ActivityItem[] => {
    try {
      const saved = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load activities from localStorage:', error);
      return [];
    }
  }, []);

  // Memoize fetchActivities
  const fetchActivities = useCallback(async () => {
    setIsLoading(true);

    if (!currentUser) {
      console.log('No user logged in, using localStorage');
      const localActivities = loadFromLocalStorage();
      setActivities(localActivities);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching activities for user:', currentUser.id);
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      const transformedActivities: ActivityItem[] = (data || []).map(activity => ({
        id: activity.id,
        userId: activity.user_id,
        userName: activity.user_name,
        userEmail: activity.user_email || '',
        timestamp: activity.timestamp,
        activityType: activity.activity_type as ActivityItem['activityType'],
        entityId: activity.entity_id || undefined,
        entityType: activity.entity_type as ActivityItem['entityType'] || undefined,
        entityName: activity.entity_name || undefined,
        fieldName: activity.field_name || undefined,
        oldValue: activity.old_value ? JSON.parse(activity.old_value as string) : undefined,
        newValue: activity.new_value ? JSON.parse(activity.new_value as string) : undefined,
        details: activity.details ? JSON.parse(activity.details as string) : undefined
      }));

      setActivities(transformedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      const localActivities = loadFromLocalStorage();
      setActivities(localActivities);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, loadFromLocalStorage]);

  // Fetch activities when user changes
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Memoize logActivity
  const logActivity = useCallback(async (activity: Omit<ActivityItem, 'id' | 'userId' | 'userName' | 'userEmail' | 'timestamp'>) => {
    console.log('LogActivity');
    let user = currentUser;

    // If no user in state, try to get it from current session
    if (!user) {
      console.log('No user in state, checking current session');
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user ?? null;
    }

    if (!user) {
      console.log('No user found, cannot log activity');
      return;
    }

    console.log('Logging activity:', activity);
    const newActivity: ActivityItem = {
      id: uuidv4(),
      userId: user.id,
      userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      userEmail: user.email || '',
      timestamp: new Date().toISOString(),
      ...activity
    };

    // Update local state using functional update
    setActivities(prev => {
      const updated = [newActivity, ...prev].slice(0, 100);
      return updated;
    });

    try {
      const supabaseActivity = {
        id: newActivity.id,
        user_id: newActivity.userId,
        user_name: newActivity.userName,
        user_email: newActivity.userEmail || null,
        timestamp: newActivity.timestamp,
        activity_type: newActivity.activityType,
        entity_id: activity.entityId || null,
        entity_type: activity.entityType || null,
        entity_name: activity.entityName || null,
        field_name: activity.fieldName || null,
        old_value: activity.oldValue ? JSON.stringify(activity.oldValue) : null,
        new_value: activity.newValue ? JSON.stringify(activity.newValue) : null,
        details: activity.details ? JSON.stringify(activity.details) : null
      };

      console.log('Saving activity to Supabase:', supabaseActivity);
      const { data, error } = await supabase
        .from('user_activities')
        .upsert(supabaseActivity)
        .select();

      if (error) {
        console.error('Error logging activity to Supabase:', error);
        throw error;
      } else {
        console.log('Successfully saved activity:', data);
        await fetchActivities();
        console.log('Activities refreshed after successful save');
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, [currentUser, fetchActivities]);

  // Memoize all the logging functions
  const logCellEdit = useCallback((rowId: string, columnId: string, value: any, oldValue: any, message?: string) => {
    logActivity({
      activityType: 'cell_edit',
      entityId: rowId,
      entityType: 'contact',
      fieldName: columnId,
      oldValue,
      newValue: value,
      details: message ? { message } : undefined
    });
  }, [logActivity]);

  const logContactAdd = useCallback((contactId: string, contactName: string) => {
    logActivity({
      activityType: 'contact_add',
      entityId: contactId,
      entityType: 'contact',
      entityName: contactName
    });
  }, [logActivity]);

  const logColumnAdd = useCallback((columnId: string, columnName: string) => {
    logActivity({
      activityType: 'column_add',
      entityId: columnId,
      entityType: 'column',
      entityName: columnName
    });
  }, [logActivity]);

  const logColumnDelete = useCallback((columnId: string, columnName: string) => {
    logActivity({
      activityType: 'column_delete',
      entityId: columnId,
      entityType: 'column',
      entityName: columnName
    });
  }, [logActivity]);

  const logFilterChange = useCallback((filters: any) => {
    logActivity({
      activityType: 'filter_change',
      entityType: 'filter',
      details: filters
    });
  }, [logActivity]);

  const logNoteAdd = useCallback((entityId: string, entityName: string, note: string) => {
    logActivity({
      activityType: 'note_add',
      entityId,
      entityType: 'contact',
      entityName,
      newValue: note
    });
  }, [logActivity]);

  const logLogin = useCallback(() => {
    console.log('Logging login activity');
    logActivity({
      activityType: 'login',
      details: {
        timestamp: new Date().toISOString()
      }
    });
  }, [logActivity]);

  const logLogout = useCallback(() => {
    console.log('Logging logout activity');
    logActivity({
      activityType: 'logout',
      details: {
        timestamp: new Date().toISOString()
      }
    });
  }, [logActivity]);

  // Return memoized value
  return useMemo(() => ({
    activities,
    isLoading,
    refreshActivities: fetchActivities,
    logCellEdit,
    logContactAdd,
    logColumnAdd,
    logColumnDelete,
    logFilterChange,
    logNoteAdd,
    logLogin,
    logLogout,
    currentUser
  }), [
    activities,
    isLoading,
    fetchActivities,
    logCellEdit,
    logContactAdd,
    logColumnAdd,
    logColumnDelete,
    logFilterChange,
    logNoteAdd,
    logLogin,
    logLogout,
    currentUser
  ]);
} 