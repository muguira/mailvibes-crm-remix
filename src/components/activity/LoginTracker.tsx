import { useEffect } from 'react';
import { useActivity } from '@/contexts/ActivityContext';
import { supabase } from '@/integrations/supabase/client';

export function LoginTracker() {
    const { logLogin, currentUser } = useActivity();

    useEffect(() => {
        // Subscribe to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('LoginTracker: Auth state changed:', event, session?.user?.id);

            if (session?.user && event === 'SIGNED_IN') {
                console.log('LoginTracker: User signed in, logging activity');
                await logLogin();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [logLogin]);

    return null; // This component doesn't render anything
} 