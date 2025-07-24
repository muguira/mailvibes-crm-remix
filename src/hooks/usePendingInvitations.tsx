import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth';
import { 
  useOrganizationData, 
  useOrganizationActions 
} from '@/stores/organizationStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingInvitation {
  id: string;
  organization_id: string;
  role: string;
  organization_name: string;
  organization_domain: string;
  inviter_name?: string;
  inviter_email?: string;
  expires_at: string;
}

interface Organization {
  id: string;
  name: string;
  domain: string;
  member_count: number;
  plan: string;
}

export const usePendingInvitations = () => {
  const { user } = useAuth();
  const { organization } = useOrganizationData();
  const { loadOrganization } = useOrganizationActions();
  
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [userRole, setUserRole] = useState<string>('member');
  const [loading, setLoading] = useState(false);

  // Check for pending invitations
  const checkPendingInvitations = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);

      const { data: invitations, error } = await supabase
        .rpc('get_pending_invitations_for_email', { 
          p_email: user.email 
        });

      if (error) throw error;

      // Filter out invitations to organizations the user is already a member of
      const filteredInvitations = [];
      
      for (const invitation of invitations || []) {
        // Check if user is already a member of this organization
        const { data: existingMember } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('organization_id', invitation.organization_id)
          .single();

        // Only include invitations to organizations the user is NOT already a member of
        if (!existingMember) {
          filteredInvitations.push(invitation);
        }
      }

      setPendingInvitations(filteredInvitations);
      
    } catch (error) {
      console.error('Error checking pending invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get user's current role in their organization
  const getUserRole = async () => {
    if (!user?.id || !organization?.id) return;

    try {
      const { data: member } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .single();

      if (member) {
        setUserRole(member.role);
      }
    } catch (error) {
      console.error('Error getting user role:', error);
    }
  };

  // Handle user's choice to stay or switch organizations
  const handleInvitationChoice = async (
    invitationId: string, 
    choice: 'stay' | 'switch'
  ): Promise<void> => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      if (choice === 'stay') {
        // Decline the invitation
        const { error } = await supabase
          .from('organization_invitations')
          .update({ 
            status: 'declined',
            updated_at: new Date().toISOString()
          })
          .eq('id', invitationId);

        if (error) throw error;

        // Remove from local state
        setPendingInvitations(prev => 
          prev.filter(inv => inv.id !== invitationId)
        );

      } else {
        // Switch to the new organization
        const invitation = pendingInvitations.find(inv => inv.id === invitationId);
        if (!invitation) throw new Error('Invitation not found');

        // First, remove user from current organization (if they have one)
        if (organization?.id) {
          const { error: removeError } = await supabase
            .from('organization_members')
            .delete()
            .eq('user_id', user.id)
            .eq('organization_id', organization.id);

          if (removeError) throw removeError;

          // Update old organization member count
          const { error: updateOldOrgError } = await supabase
            .from('organizations')
            .update({ 
              member_count: Math.max(0, (organization.member_count || 1) - 1),
              updated_at: new Date().toISOString()
            })
            .eq('id', organization.id);

          if (updateOldOrgError) throw updateOldOrgError;
        }

        // Accept the invitation using the existing RPC function
        const { data: result, error: acceptError } = await supabase
          .rpc('auto_accept_invitation', { 
            p_invitation_id: invitationId, 
            p_user_id: user.id 
          });

        if (acceptError) throw acceptError;

        const acceptResult = result?.[0];
        if (!acceptResult?.success) {
          throw new Error(acceptResult?.message || 'Failed to accept invitation');
        }

        // Remove from local state
        setPendingInvitations(prev => 
          prev.filter(inv => inv.id !== invitationId)
        );

        // Reload organization data to reflect the change
        await loadOrganization();
      }

    } catch (error) {
      console.error('Error handling invitation choice:', error);
      throw error;
    }
  };

  // Load data when user or organization changes
  useEffect(() => {
    if (user?.email && organization) {
      checkPendingInvitations();
      getUserRole();
    }
  }, [user?.email, organization?.id]);

  // Check for new invitations every 30 seconds
  useEffect(() => {
    if (!user?.email) return;

    const interval = setInterval(() => {
      checkPendingInvitations();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user?.email]);

  return {
    pendingInvitations,
    userRole,
    currentOrganization: organization,
    loading,
    handleInvitationChoice,
    refreshInvitations: checkPendingInvitations
  };
}; 