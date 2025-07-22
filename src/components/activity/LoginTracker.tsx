import { useActivity } from '@/contexts/ActivityContext'
import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/utils/logger'
import { useEffect } from 'react'

export function LoginTracker() {
  const { logLogin } = useActivity()

  useEffect(() => {
    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.log('LoginTracker: Auth state changed:', event, session?.user?.id)

      // We no longer need to track login here since it's handled in the Auth component
      // This prevents duplicate login activities

      // Keep this component for potential future auth state tracking needs
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [logLogin])

  return null // This component doesn't render anything
}
