import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

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

  // Load activities on mount and when user changes
  useEffect(() => {
    fetchActivities();
  }, [user?.id]);

  // Fetch activities from Supabase or localStorage
  const fetchActivities = async () => {
    setIsLoading(true);
    
    if (!user) {
      // Not logged in, use localStorage
      const localActivities = loadFromLocalStorage();
      setActivities(localActivities);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      setActivities(data || []);
    } catch (error) {
      logger.error('Error fetching activities:', error);
      // Fall back to localStorage
      const localActivities = loadFromLocalStorage();
      setActivities(localActivities);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to load from localStorage
  const loadFromLocalStorage = (): ActivityItem[] => {
    try {
      const saved = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      logger.error('Failed to load activities from localStorage:', error);
      return [];
    }
  };

  // Log a new activity
  const logActivity = async (activity: Omit<ActivityItem, 'id' | 'userId' | 'userName' | 'userEmail' | 'timestamp'>) => {
    if (!user) {
      return; // Don't log when not logged in
    }
    
    // Create new activity object
    const newActivity: ActivityItem = {
      id: uuidv4(),
      userId: user.id,
      userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      userEmail: user.email || '',
      timestamp: new Date().toISOString(),
      ...activity
    };
    
    // Update local state immediately for UI feedback
    setActivities(prev => [newActivity, ...prev].slice(0, 100));
    
    // Store in localStorage as backup
    const localActivities = loadFromLocalStorage();
    localStorage.setItem(
      ACTIVITY_STORAGE_KEY,
      JSON.stringify([newActivity, ...localActivities].slice(0, 100))
    );

    // Enable Supabase activity logging now that we've fixed the core functionality
    try {
      // Store in Supabase if logged in
      if (user) {
        // Get the ID mapping to ensure we have the correct database IDs
        const idMapping = JSON.parse(localStorage.getItem('id-mapping') || '{}');
        
        // If entityId exists and has a mapping, use the mapped ID
        let entityId = activity.entityId;
        if (entityId && idMapping[entityId]) {
          entityId = idMapping[entityId];
        }
        
        // Format the activity for Supabase
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

        logger.log("Logging activity to Supabase:", supabaseActivity);
        
        const { error } = await supabase
          .from('user_activities')
          .upsert(supabaseActivity, { onConflict: 'id' });

        if (error) {
          logger.error('Error logging activity to Supabase:', error);
          // Don't throw the error - we still have the activity in local state
        }
      }
    } catch (error) {
      logger.error('Error logging activity:', error);
      // Activity is already in local state and localStorage, so we continue
    }
  };

  // Log cell edit activity
  const logCellEdit = (rowId: string, columnId: string, value: any, oldValue: any) => {
    logActivity({
      activityType: 'cell_edit',
      entityId: rowId,
      entityType: 'contact',
      fieldName: columnId,
      oldValue,
      newValue: value
    });
  };

  // Log contact add activity
  const logContactAdd = (contactId: string, contactName: string) => {
    logActivity({
      activityType: 'contact_add',
      entityId: contactId,
      entityType: 'contact',
      entityName: contactName
    });
  };

  // Log column add activity
  const logColumnAdd = (columnId: string, columnName: string) => {
    logActivity({
      activityType: 'column_add',
      entityId: columnId,
      entityType: 'column',
      entityName: columnName
    });
  };

  // Log column delete activity
  const logColumnDelete = (columnId: string, columnName: string) => {
    logActivity({
      activityType: 'column_delete',
      entityId: columnId,
      entityType: 'column',
      entityName: columnName
    });
  };

  // Log filter change
  const logFilterChange = (filters: any) => {
    logActivity({
      activityType: 'filter_change',
      entityType: 'filter',
      details: filters
    });
  };

  // Log note add
  const logNoteAdd = (entityId: string, entityName: string, note: string) => {
    logActivity({
      activityType: 'note_add',
      entityId,
      entityType: 'contact',
      entityName,
      newValue: note
    });
  };

  // Log login activity
  const logLogin = () => {
    logActivity({
      activityType: 'login'
    });
  };

  return {
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
  };
} 