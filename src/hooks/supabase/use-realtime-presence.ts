
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export interface PresenceUser {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  last_active: string;
  cursor?: {
    rowId: string;
    colKey: string;
  };
}

export function useRealtimePresence(listId?: string) {
  const { user } = useAuth();
  const [presentUsers, setPresentUsers] = useState<Record<string, PresenceUser>>({});

  useEffect(() => {
    if (!user || !listId) return;

    // Create a channel for this list
    const channel = supabase.channel(`presence:list:${listId}`);
    
    // Track the current user's presence
    const userPresence: PresenceUser = {
      id: user.id,
      name: user.user_metadata?.name || user.email || 'Anonymous User',
      email: user.email,
      avatar_url: user.user_metadata?.avatar_url,
      last_active: new Date().toISOString(),
    };

    // Subscribe to the channel and track the user's presence
    channel
      .on('presence', { event: 'sync' }, () => {
        // Get the current state
        const state = channel.presenceState();
        
        // Convert presence state to our user format
        const users: Record<string, PresenceUser> = {};
        
        Object.keys(state).forEach(presenceId => {
          // Each presence ID can have multiple presences (e.g., multiple tabs/devices)
          const presences = state[presenceId] as unknown[];
          if (presences.length > 0) {
            // Just use the first presence for this user
            const presenceData = presences[0] as any;
            
            if (presenceData && presenceData.user_id) {
              users[presenceData.user_id] = {
                id: presenceData.user_id,
                name: presenceData.name || 'Unknown User',
                email: presenceData.email,
                avatar_url: presenceData.avatar_url,
                last_active: presenceData.last_active || new Date().toISOString(),
                cursor: presenceData.cursor
              };
            }
          }
        });
        
        setPresentUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userPresence.id,
            ...userPresence,
            last_active: new Date().toISOString()
          });
        }
      });

    // Update last active time periodically
    const interval = setInterval(async () => {
      await channel.track({
        user_id: userPresence.id,
        ...userPresence,
        last_active: new Date().toISOString()
      });
    }, 30000); // every 30 seconds

    // Cleanup
    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, [user, listId]);

  // Method to update the cursor position
  const updateCursorPosition = async (rowId: string, colKey: string) => {
    if (!user || !listId) return;

    const channel = supabase.channel(`presence:list:${listId}`);
    
    const userPresence: PresenceUser = {
      id: user.id,
      name: user.user_metadata?.name || user.email || 'Anonymous User',
      email: user.email,
      avatar_url: user.user_metadata?.avatar_url,
      last_active: new Date().toISOString(),
      cursor: { rowId, colKey }
    };

    await channel.track({
      user_id: userPresence.id,
      ...userPresence
    });
  };

  return {
    presentUsers,
    updateCursorPosition
  };
}
