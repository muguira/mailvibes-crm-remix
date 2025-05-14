
import { useUserActivities } from './supabase/use-user-activities';
import type { UserActivity } from './supabase/use-user-activities';

// Re-export the UserActivity type for compatibility
export type ActivityItem = UserActivity;

// This hook provides a wrapper around useUserActivities for backward compatibility
export function useActivityTracking() {
  const {
    activities,
    isLoading,
    fetchActivities: refreshActivities,
    logCellEdit,
    logContactAdd,
    logActivity,
    isLogging
  } = useUserActivities();

  // Legacy function names for backward compatibility
  const logColumnAdd = (columnId: string, columnName: string) => {
    return logActivity({
      activity_type: 'column_add',
      entity_id: columnId,
      entity_type: 'column',
      entity_name: columnName
    });
  };

  const logColumnDelete = (columnId: string, columnName: string) => {
    return logActivity({
      activity_type: 'column_delete',
      entity_id: columnId,
      entity_type: 'column',
      entity_name: columnName
    });
  };

  const logFilterChange = (filters: any) => {
    return logActivity({
      activity_type: 'filter_change',
      entity_type: 'filter',
      details: filters
    });
  };

  const logNoteAdd = (entityId: string, entityName: string, note: string) => {
    return logActivity({
      activity_type: 'note_add',
      entity_id: entityId,
      entity_type: 'contact',
      entity_name: entityName,
      new_value: note
    });
  };

  return {
    activities,
    isLoading,
    refreshActivities,
    logCellEdit,
    logContactAdd,
    logColumnAdd,
    logColumnDelete,
    logFilterChange,
    logNoteAdd,
    logLogin: () => logActivity({ activity_type: 'login' }),
    isLogging
  };
}
