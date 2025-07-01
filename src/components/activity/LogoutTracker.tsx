import { useEffect } from 'react';
import { useActivity } from '@/contexts/ActivityContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export function LogoutTracker() {
    const { logLogout } = useActivity();

    useEffect(() => {
        // Subscribe to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            logger.log('LogoutTracker: Auth state changed:', event, session?.user?.id);

            // We no longer need to track logout here since it's handled in the ProfileMenu component
            // This prevents duplicate logout activities

            // Keep this component for potential future auth state tracking needs
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [logLogout]);

    return null; // This component doesn't render anything
} 