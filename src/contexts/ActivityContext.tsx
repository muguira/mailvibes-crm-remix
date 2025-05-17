import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useActivityTracking } from '@/hooks/use-activity-tracking';

// Create the context with the hook return type
export const ActivityContext = createContext<ReturnType<typeof useActivityTracking> | undefined>(undefined);

// Provider component
export function ActivityProvider({ children }: { children: ReactNode }) {
  const activityTracking = useActivityTracking();

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => activityTracking, [
    activityTracking.activities,
    activityTracking.isLoading,
    // We don't need to include the functions in the dependency array
    // as they are already memoized in useActivityTracking
  ]);

  return (
    <ActivityContext.Provider value={contextValue}>
      {children}
    </ActivityContext.Provider>
  );
}

// Custom hook for using activity tracking
export function useActivity() {
  const context = useContext(ActivityContext);

  if (context === undefined) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }

  return context;
} 