import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: string;
  activityType: 'cell_edit' | 'contact_add' | 'filter_change' | 'column_add' | 'column_delete' | 'note_add' | 'login';
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
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    if (!user) {
      console.log('No user logged in, using localStorage');
      const localActivities = loadFromLocalStorage();
      setActivities(localActivities);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching activities for user:', user.id);
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user.id)
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
  }, [user, loadFromLocalStorage]);

  // Fetch activities on mount and when user changes
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Memoize logActivity
  const logActivity = useCallback(async (activity: Omit<ActivityItem, 'id' | 'userId' | 'userName' | 'userEmail' | 'timestamp'>) => {
    if (!user) return;

    const newActivity: ActivityItem = {
      id: uuidv4(),
      userId: user.id,
      userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      userEmail: user.email || '',
      timestamp: new Date().toISOString(),
      ...activity
    };

    // Update local state using functional update
    setActivities(prev => [newActivity, ...prev].slice(0, 100));

    // Store in localStorage as backup
    const localActivities = loadFromLocalStorage();
    localStorage.setItem(
      ACTIVITY_STORAGE_KEY,
      JSON.stringify([newActivity, ...localActivities].slice(0, 100))
    );

    try {
      if (user) {
        const idMapping = JSON.parse(localStorage.getItem('id-mapping') || '{}');
        let entityId = activity.entityId;
        if (entityId && idMapping[entityId]) {
          entityId = idMapping[entityId];
        }

        const supabaseActivity = {
          id: newActivity.id,
          user_id: newActivity.userId,
          user_name: newActivity.userName,
          user_email: newActivity.userEmail || null,
          timestamp: newActivity.timestamp,
          activity_type: newActivity.activityType,
          entity_id: entityId || null,
          entity_type: newActivity.entityType || null,
          entity_name: newActivity.entityName || null,
          field_name: newActivity.fieldName || null,
          old_value: newActivity.oldValue ? JSON.stringify(newActivity.oldValue) : null,
          new_value: newActivity.newValue ? JSON.stringify(newActivity.newValue) : null,
          details: newActivity.details ? JSON.stringify(newActivity.details) : null
        };

        const { error } = await supabase
          .from('user_activities')
          .upsert(supabaseActivity, { onConflict: 'id' });

        if (error) {
          console.error('Error logging activity to Supabase:', error);
        }
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, [user, loadFromLocalStorage]);

  // Memoize all the logging functions
  const logCellEdit = useCallback((rowId: string, columnId: string, value: any, oldValue: any) => {
    logActivity({
      activityType: 'cell_edit',
      entityId: rowId,
      entityType: 'contact',
      fieldName: columnId,
      oldValue,
      newValue: value
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
    logActivity({
      activityType: 'login'
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
    logLogin
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
    logLogin
  ]);
} 