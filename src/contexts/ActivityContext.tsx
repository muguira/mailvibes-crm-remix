import React, { createContext, useContext, ReactNode } from 'react';
import { useActivityTracking } from '@/hooks/use-activity-tracking';

// Create the context with the hook return type
export const ActivityContext = createContext<ReturnType<typeof useActivityTracking> | undefined>(undefined);

// Provider component
export function ActivityProvider({ children }: { children: ReactNode }) {
  const activityTracking = useActivityTracking();
  
  return (
    <ActivityContext.Provider value={activityTracking}>
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