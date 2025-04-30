import { useEffect, useState } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export interface PresenceUser {
  id: string;
  email: string;
  name: string;
  initials?: string;
  avatar_url?: string;
  last_active: string;
  cursor_position?: {
    row: string;
    col: string;
  };
}

export function useRealtimePresence(listId?: string) {
  const { user } = useAuth();
  const [presentUsers, setPresentUsers] = useState<Record<string, PresenceUser>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user || !listId) return;

    // Generate a presence key unique to this session (in case user has multiple browser tabs)
    const presenceKey = `${user.id}:${uuidv4()}`;
    
    // Create a channel for this specific list
    const channel = supabase.channel(`list:${listId}`);

    // Initial user data
    const userData: PresenceUser = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous',
      avatar_url: user.user_metadata?.avatar_url,
      last_active: new Date().toISOString(),
    };

    // Set up presence tracking
    channel
      .on('presence', { event: 'sync' }, () => {
        // Update our state with the new presence state
        const newState = channel.presenceState();
        const formattedState: Record<string, PresenceUser> = {};
        
        // Format the presence state for our component
        Object.keys(newState).forEach(key => {
          const presenceData = newState[key][0] as PresenceUser;
          formattedState[key] = presenceData;
        });
        
        setPresentUsers(formattedState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      });

    // Subscribe to the channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        // Track the user's presence
        await channel.track(userData);
        
        // Set up a heartbeat to keep presence alive
        const heartbeatInterval = setInterval(async () => {
          await channel.track({
            ...userData,
            last_active: new Date().toISOString()
          });
        }, 30000); // Every 30 seconds
        
        return () => clearInterval(heartbeatInterval);
      } else {
        setIsConnected(false);
      }
    });

    // Function to update cursor position
    const updateCursorPosition = async (row: string, col: string) => {
      if (isConnected) {
        await channel.track({
          ...userData,
          last_active: new Date().toISOString(),
          cursor_position: { row, col }
        });
      }
    };

    // Cleanup function
    return () => {
      channel.unsubscribe();
    };
  }, [user, listId, isConnected]);

  // Update cursor position function
  const updateCursorPosition = async (row: string, col: string) => {
    if (!user || !listId || !isConnected) return;
    
    const channel = supabase.channel(`list:${listId}`);
    
    const userData: PresenceUser = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous',
      last_active: new Date().toISOString(),
      cursor_position: { row, col }
    };
    
    await channel.track(userData);
  };

  return {
    presentUsers,
    isConnected,
    updateCursorPosition
  };
}
