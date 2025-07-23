import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PendingInvitation {
  id: string;
  organization_id: string;
  role: 'admin' | 'user';
  invited_by: string;
  expires_at: string;
  organization_name: string;
  organization_domain: string;
}

export interface InvitationAcceptanceResult {
  hasOrganization: boolean;
  organizationId?: string;
  message?: string;
  wasAutoAccepted?: boolean;
}

// Track auto-acceptance attempts to prevent duplicates
const autoAcceptanceAttempts = new Map<string, Promise<InvitationAcceptanceResult>>();

/**
 * Check for pending invitations for a user's email and automatically accept the most recent one
 */
export const checkAndAcceptPendingInvitations = async (
  userEmail: string, 
  userId: string
): Promise<InvitationAcceptanceResult> => {
  const cacheKey = `${userId}:${userEmail}`;
  
  // If we already have an ongoing attempt for this user, return that promise
  if (autoAcceptanceAttempts.has(cacheKey)) {
    console.log('🔄 Auto-acceptance already in progress, returning existing promise');
    return autoAcceptanceAttempts.get(cacheKey)!;
  }

  // Create and cache the promise
  const acceptancePromise = performAutoAcceptance(userEmail, userId);
  autoAcceptanceAttempts.set(cacheKey, acceptancePromise);

  try {
    const result = await acceptancePromise;
    return result;
  } finally {
    // Clean up the cache after completion (success or failure)
    setTimeout(() => {
      autoAcceptanceAttempts.delete(cacheKey);
    }, 5000); // Keep cache for 5 seconds to handle rapid successive calls
  }
};

/**
 * Internal function that performs the actual auto-acceptance logic
 */
const performAutoAcceptance = async (
  userEmail: string, 
  userId: string
): Promise<InvitationAcceptanceResult> => {
  try {
    console.log(`🔍 Checking pending invitations for: ${userEmail}`);

    // Get pending invitations for this email
    const { data: invitations, error: invitationsError } = await supabase
      .rpc('get_pending_invitations_for_email', { p_email: userEmail });

    if (invitationsError) {
      console.error('Error fetching pending invitations:', invitationsError);
      throw invitationsError;
    }

    if (!invitations || invitations.length === 0) {
      console.log('ℹ️ No pending invitations found');
      return { hasOrganization: false };
    }

    console.log(`📧 Found ${invitations.length} pending invitation(s)`);

    // Auto-accept the most recent (first) invitation
    const invitation = invitations[0] as PendingInvitation;
    
    console.log(`🚀 Auto-accepting invitation to: ${invitation.organization_name}`);

    const { data: acceptResult, error: acceptError } = await supabase
      .rpc('auto_accept_invitation', { 
        p_invitation_id: invitation.id, 
        p_user_id: userId 
      });

    if (acceptError) {
      console.error('Error auto-accepting invitation:', acceptError);
      throw acceptError;
    }

    const result = acceptResult?.[0];
    
    if (result?.success) {
      console.log(`✅ Successfully joined organization: ${invitation.organization_name}`);
      
      // Show success toast only once
      toast.success(`Welcome to ${invitation.organization_name}!`, {
        description: result.message,
        id: `invitation-${invitation.id}`, // Prevent duplicate toasts
      });

      return {
        hasOrganization: true,
        organizationId: result.organization_id,
        message: result.message,
        wasAutoAccepted: true
      };
    } else {
      console.error('Failed to auto-accept invitation:', result?.message);
      return { 
        hasOrganization: false, 
        message: result?.message || 'Failed to accept invitation' 
      };
    }

  } catch (error) {
    console.error('Error in checkAndAcceptPendingInvitations:', error);
    return { 
      hasOrganization: false, 
      message: 'Error checking invitations' 
    };
  }
};

/**
 * Check if a user needs to create an organization (considering pending invitations)
 */
export const checkUserNeedsOrganization = async (userId: string): Promise<{
  needsOrganization: boolean;
  hasPendingInvitations: boolean;
  userEmail: string | null;
}> => {
  try {
    const { data: result, error } = await supabase
      .rpc('user_needs_organization', { p_user_id: userId });

    if (error) {
      console.error('Error checking if user needs organization:', error);
      // Default to needs organization if we can't determine
      return { needsOrganization: true, hasPendingInvitations: false, userEmail: null };
    }

    const userData = result?.[0];
    
    return {
      needsOrganization: userData?.needs_org || false,
      hasPendingInvitations: userData?.has_pending_invitation || false,
      userEmail: userData?.user_email || null
    };

  } catch (error) {
    console.error('Error in checkUserNeedsOrganization:', error);
    return { needsOrganization: true, hasPendingInvitations: false, userEmail: null };
  }
};

/**
 * Get all pending invitations for a user's email (for display purposes)
 */
export const getPendingInvitations = async (userEmail: string): Promise<PendingInvitation[]> => {
  try {
    const { data: invitations, error } = await supabase
      .rpc('get_pending_invitations_for_email', { p_email: userEmail });

    if (error) {
      console.error('Error fetching pending invitations:', error);
      return [];
    }

    return invitations || [];
  } catch (error) {
    console.error('Error in getPendingInvitations:', error);
    return [];
  }
};

/**
 * Manually accept a specific invitation (for use in AcceptInvitation page)
 */
export const acceptInvitation = async (
  invitationId: string, 
  userId: string
): Promise<InvitationAcceptanceResult> => {
  try {
    console.log(`🎯 Manually accepting invitation: ${invitationId}`);

    const { data: result, error } = await supabase
      .rpc('auto_accept_invitation', { 
        p_invitation_id: invitationId, 
        p_user_id: userId 
      });

    if (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }

    const acceptResult = result?.[0];
    
    if (acceptResult?.success) {
      console.log(`✅ Successfully accepted invitation`);
      
      toast.success('Invitation accepted!', {
        description: acceptResult.message,
        id: `manual-invitation-${invitationId}`, // Prevent duplicate toasts
      });

      return {
        hasOrganization: true,
        organizationId: acceptResult.organization_id,
        message: acceptResult.message,
        wasAutoAccepted: false
      };
    } else {
      console.error('Failed to accept invitation:', acceptResult?.message);
      throw new Error(acceptResult?.message || 'Failed to accept invitation');
    }

  } catch (error) {
    console.error('Error in acceptInvitation:', error);
    throw error;
  }
};
