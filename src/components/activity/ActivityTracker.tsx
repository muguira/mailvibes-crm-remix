import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityTracking } from '@/hooks/use-activity-tracking';

export function ActivityTracker() {
    const { user } = useAuth();
    const { logLogin } = useActivityTracking();

    useEffect(() => {
        // Log login activity when user is set
        if (user) {
            logLogin();
        }
    }, [user, logLogin]);

    return null; // This is a utility component that doesn't render anything
} 