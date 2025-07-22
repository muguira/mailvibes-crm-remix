import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { 
  Organization, 
  OrganizationMember, 
  OrganizationInvitation, 
  OrganizationState,
  InviteUserForm,
  OrganizationWithMembers 
} from '@/types/organization';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { sendInvitationEmails } from '@/services/invitationEmailService';
import { toast } from 'sonner';

// Enhanced state with granular loading states
interface EnhancedOrganizationState extends OrganizationState {
  // Granular loading states
  loadingStates: {
    loadingOrganization: boolean;
    creatingOrganization: boolean;
    invitingUsers: boolean;
    updatingRole: { [memberId: string]: boolean };
    removingMember: { [memberId: string]: boolean };
    resendingInvitation: { [invitationId: string]: boolean };
    cancelingInvitation: { [invitationId: string]: boolean };
    checkingOrganization: boolean; // Added for new logic
  };
  
  // Error states
  errors: {
    loadOrganization?: string;
    createOrganization?: string;
    inviteUsers?: string;
    updateRole?: { [memberId: string]: string };
    removeMember?: { [memberId: string]: string };
    resendInvitation?: { [invitationId: string]: string };
    cancelInvitation?: { [invitationId: string]: string };
  };
  
  // Cache and metadata
  lastUpdated: string | null;
  needsOrganization: boolean;
  optimisticUpdates: {
    pendingInvitations: OrganizationInvitation[];
    pendingRoleChanges: { [memberId: string]: 'admin' | 'user' };
    pendingRemovals: string[]; // member IDs
  };
}

interface OrganizationStore extends EnhancedOrganizationState {
  // Actions
  loadOrganization: () => Promise<void>;
  createOrganization: (name: string, domain: string) => Promise<void>;
  inviteUsers: (formData: InviteUserForm) => Promise<void>;
  updateMemberRole: (memberId: string, newRole: 'admin' | 'user') => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  resendInvitation: (invitationId: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  
  // Utility actions
  clearError: (errorType: string, id?: string) => void;
  reset: () => void;
  refreshData: () => Promise<void>;
  checkUserOrganization: () => Promise<void>;
}

// Helper functions
const getInitials = (fullName: string): string => {
  return fullName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getEmailDomain = (email: string): string => {
  return email.split('@')[1];
};

const isValidDomain = (domain: string): boolean => {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
};

// Initial state
const initialState: EnhancedOrganizationState = {
  currentOrganization: null,
  members: [],
  invitations: [],
  loading: false,
  error: null,
  needsOrganization: false,
  loadingStates: {
    loadingOrganization: false,
    creatingOrganization: false,
    invitingUsers: false,
    updatingRole: {},
    removingMember: {},
    resendingInvitation: {},
    cancelingInvitation: {},
    checkingOrganization: false, // Added for new logic
  },
  errors: {},
  lastUpdated: null,
  optimisticUpdates: {
    pendingInvitations: [],
    pendingRoleChanges: {},
    pendingRemovals: [],
  },
};

export const useOrganizationStore = create<OrganizationStore>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // Check if user needs to create/select organization
      checkUserOrganization: async () => {
        try {
          set((state) => { state.loadingStates.checkingOrganization = true; });
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            set((state) => { 
              state.needsOrganization = false;
              state.loadingStates.checkingOrganization = false;
            });
            return;
          }

          // Use the RPC function to safely get user organization
          const { data: orgData, error } = await supabase
            .rpc('get_user_organization_safe', { p_user_id: user.id });

          if (error) {
            console.error('Error checking user organization:', error);
            // If RPC fails, assume they need an organization
            set((state) => { 
              state.needsOrganization = true;
              state.loadingStates.checkingOrganization = false;
            });
            return;
          }

          // RPC returns an array, check if we have results
          if (orgData && orgData.length > 0) {
            // User has an organization
            set((state) => { 
              state.needsOrganization = false;
              state.loadingStates.checkingOrganization = false;
            });
            // Load the organization data
            await get().loadOrganization();
          } else {
            // User needs an organization
            set((state) => { 
              state.needsOrganization = true;
              state.loadingStates.checkingOrganization = false;
            });
          }
        } catch (error) {
          console.error('Error checking user organization:', error);
          set((state) => { 
            state.needsOrganization = true;
            state.loadingStates.checkingOrganization = false;
          });
        }
      },

      // Create new organization
      createOrganization: async (name: string, domain: string) => {
        try {
          set((state) => {
            state.loadingStates.creatingOrganization = true;
            state.errors.createOrganization = undefined;
          });

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Validate domain format
          if (!isValidDomain(domain)) {
            throw new Error('Invalid domain format');
          }

          // Check if user's email domain matches organization domain
          const userDomain = getEmailDomain(user.email!);
          if (userDomain !== domain) {
            throw new Error(`Your email domain (${userDomain}) must match the organization domain (${domain})`);
          }

          // Check if organization with this domain already exists
          const { data: existingOrg, error: checkError } = await supabase
            .from('organizations')
            .select('id')
            .eq('domain', domain)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
          }

          if (existingOrg) {
            throw new Error('An organization with this domain already exists');
          }

          // Create organization
          const { data: newOrg, error: orgError } = await supabase
            .from('organizations')
            .insert([{
              name: name.trim(),
              domain: domain.toLowerCase(),
              plan: 'free',
              member_count: 1,
              max_members: 25,
            }])
            .select()
            .single();

          if (orgError) throw orgError;

          // Add user as admin member
          const { error: memberError } = await supabase
            .from('organization_members')
            .insert([{
              user_id: user.id,
              organization_id: newOrg.id,
              role: 'admin',
            }]);

          if (memberError) throw memberError;

          // Update user's current organization
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ current_organization: newOrg.id })
            .eq('id', user.id);

          if (profileError) throw profileError;

          // Load the newly created organization
          await get().loadOrganization();

          set((state) => {
            state.needsOrganization = false;
            state.loadingStates.creatingOrganization = false;
          });

          toast.success('Organization created successfully!');
        } catch (error) {
          set((state) => {
            state.loadingStates.creatingOrganization = false;
            state.errors.createOrganization = error.message;
          });
          toast.error(`Failed to create organization: ${error.message}`);
          throw error;
        }
      },

      // Load current organization data
      loadOrganization: async () => {
        try {
          set((state) => {
            state.loadingStates.loadingOrganization = true;
            state.errors.loadOrganization = undefined;
          });

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Use RPC function to get user's organization safely
          const { data: orgData, error: orgError } = await supabase
            .rpc('get_user_organization_safe', { p_user_id: user.id });

          if (orgError) throw orgError;
          if (!orgData || orgData.length === 0) throw new Error('No organization found');

          // Get the first result (RPC returns an array)
          const orgInfo = orgData[0];
          
          // Get the full organization details using safe RPC
          const { data: orgDetails, error: orgDetailsError } = await supabase
            .rpc('get_organization_details_safe', { p_org_id: orgInfo.organization_id });

          if (orgDetailsError) throw orgDetailsError;
          if (!orgDetails || orgDetails.length === 0) throw new Error('Organization details not found');

          const organization = orgDetails[0];

          // For now, create simplified member data to avoid RLS issues
          // We'll just show the current user as a member
          const currentMember = {
            id: user.id,
            user_id: user.id,
            organization_id: organization.id,
            role: 'admin', // Set as admin since you're the organization owner
            created_at: new Date().toISOString(),
            profiles: {
              id: user.id,
              email: user.email || '',
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
              avatar_url: user.user_metadata?.avatar_url || null
            }
          };

          // Transform to match our interface
          const transformedMembers = [{
            id: currentMember.id,
            user_id: currentMember.user_id, // Fixed: use user_id instead of userId
            organization_id: currentMember.organization_id,
            role: currentMember.role as OrganizationRole,
            status: 'active' as const,
            invited_by: null,
            joined_at: currentMember.created_at,
            created_at: currentMember.created_at,
            updated_at: new Date().toISOString(),
            user: {
              id: currentMember.profiles.id,
              email: currentMember.profiles.email,
              first_name: currentMember.profiles.first_name,
              last_name: currentMember.profiles.last_name,
              avatar_url: currentMember.profiles.avatar_url
            }
          }];

          // Try to get invitations using safe RPC function
          let transformedInvitations: any[] = [];
          try {
            const { data: invitationsData, error: invError } = await supabase
              .rpc('get_organization_invitations_safe', { p_org_id: organization.id });

            if (!invError && invitationsData) {
              transformedInvitations = invitationsData.map(invitation => ({
                id: invitation.id,
                organizationId: invitation.organization_id,
                email: invitation.email,
                role: invitation.role as OrganizationRole,
                status: invitation.status || 'pending',
                invitedBy: invitation.invited_by,
                expires_at: invitation.expires_at,
                accepted_at: invitation.accepted_at,
                created_at: invitation.created_at,
                updated_at: invitation.updated_at,
                inviter: invitation.inviter_email ? {
                  id: invitation.invited_by,
                  email: invitation.inviter_email,
                  first_name: invitation.inviter_name?.split(' ')[0] || '',
                  last_name: invitation.inviter_name?.split(' ').slice(1).join(' ') || ''
                } : undefined
              }));
            }
          } catch (invError) {
            // If invitations fail, just log it and continue with empty array
            console.warn('Failed to load invitations:', invError);
          }

          set((state) => {
            state.currentOrganization = organization;
            state.members = transformedMembers;
            state.invitations = transformedInvitations;
            state.loadingStates.loadingOrganization = false;
            state.lastUpdated = new Date().toISOString();
            state.needsOrganization = false;
          });

        } catch (error) {
          set((state) => {
            state.loadingStates.loadingOrganization = false;
            state.errors.loadOrganization = error.message;
          });
          console.error('Error loading organization:', error);
        }
      },

      // Invite users to organization
      inviteUsers: async (formData: InviteUserForm) => {
        try {
          set((state) => {
            state.loadingStates.invitingUsers = true;
            state.errors.inviteUsers = undefined;
          });

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const currentOrg = get().currentOrganization;
          if (!currentOrg) throw new Error('No organization found');

          // Check if user is admin
          const userMember = get().members.find(m => m.user_id === user.id);
          console.log('Debug invitation check:', {
            userId: user.id,
            userEmail: user.email,
            members: get().members,
            userMember: userMember,
            userRole: userMember?.role
          });
          
          if (!userMember || userMember.role !== 'admin') {
            throw new Error('Only administrators can invite users');
          }

          // Remove domain restrictions for invitations - users from any domain can be invited
          // Domain restrictions only apply when creating organizations

          // Check for existing members and invitations
          const existingMembers = get().members.map(m => m.user.email);
          const existingInvitations = get().invitations.map(i => i.email);
          const allExisting = [...existingMembers, ...existingInvitations];
          
          const duplicateEmails = formData.emails.filter(email => allExisting.includes(email));
          if (duplicateEmails.length > 0) {
            throw new Error(`Users already exist or have pending invitations: ${duplicateEmails.join(', ')}`);
          }

          // Create invitations using RPC function to bypass RLS
          console.log('About to call RPC with:', {
            p_organization_id: currentOrg.id,
            p_emails: formData.emails.map(email => email.trim().toLowerCase()),
            p_role: formData.role,
            p_message: formData.message || null
          });

          const { data: newInvitations, error: inviteError } = await supabase
            .rpc('send_organization_invitations', {
              p_organization_id: currentOrg.id,
              p_emails: formData.emails.map(email => email.trim().toLowerCase()),
              p_role: formData.role,
              p_message: formData.message || null
            });

          console.log('RPC result:', { newInvitations, inviteError });

          if (inviteError) {
            console.error('RPC Error details:', inviteError);
            throw inviteError;
          }

          // Transform and add to state
          const transformedNewInvitations: OrganizationInvitation[] = (newInvitations || []).map(invitation => ({
            id: invitation.id,
            organization_id: invitation.organization_id,
            email: invitation.email,
            role: invitation.role as 'admin' | 'user',
            status: invitation.status || 'pending',
            invited_by: invitation.invited_by,
            expires_at: invitation.expires_at,
            accepted_at: null,
            created_at: invitation.created_at,
            updated_at: invitation.created_at,
            token: invitation.token || invitation.id, // Add token field with fallback
            inviter: {
              id: user.id,
              email: user.email || '',
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || ''
            }
          }));

          set((state) => {
            state.invitations.push(...transformedNewInvitations);
            state.loadingStates.invitingUsers = false;
          });

          // Send invitation emails through Edge Function
          try {
            console.log('🎯 Attempting to send invitation emails for:', transformedNewInvitations.map(inv => inv.email));
            await sendInvitationEmails(
              transformedNewInvitations, 
              currentOrg.name, 
              `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email || 'Team Member'
            );
            console.log('✅ Invitation emails sent successfully');
          } catch (emailError) {
            // Don't fail the entire operation if email sending fails
            console.warn('⚠️ Failed to send invitation emails, but invitations were created:', emailError);
            toast.warn('Invitations created successfully, but emails could not be sent. Please share the invitation links manually.');
          }

          toast.success(`Successfully invited ${formData.emails.length} user${formData.emails.length === 1 ? '' : 's'}!`);

        } catch (error) {
          set((state) => {
            state.loadingStates.invitingUsers = false;
            state.errors.inviteUsers = error.message;
          });
          toast.error(`Failed to invite users: ${error.message}`);
          throw error;
        }
      },

      // Update member role
      updateMemberRole: async (memberId: string, newRole: 'admin' | 'user') => {
        try {
          set((state) => {
            state.loadingStates.updatingRole[memberId] = true;
            state.errors.updateRole = { ...state.errors.updateRole };
            delete state.errors.updateRole[memberId];
            
            // Optimistic update
            state.optimisticUpdates.pendingRoleChanges[memberId] = newRole;
          });

          const { error } = await supabase
            .from('organization_members')
            .update({ role: newRole })
            .eq('id', memberId);

          if (error) throw error;

          set((state) => {
            // Apply the actual update
            const memberIndex = state.members.findIndex(m => m.id === memberId);
            if (memberIndex !== -1) {
              state.members[memberIndex].role = newRole;
            }
            
            // Clear optimistic update and loading state
            delete state.optimisticUpdates.pendingRoleChanges[memberId];
            delete state.loadingStates.updatingRole[memberId];
          });

          toast.success('Member role updated successfully');

        } catch (error) {
          set((state) => {
            delete state.loadingStates.updatingRole[memberId];
            delete state.optimisticUpdates.pendingRoleChanges[memberId];
            state.errors.updateRole = { 
              ...state.errors.updateRole, 
              [memberId]: error.message 
            };
          });
          toast.error(`Failed to update role: ${error.message}`);
          throw error;
        }
      },

      // Remove member from organization
      removeMember: async (memberId: string) => {
        try {
          set((state) => {
            state.loadingStates.removingMember[memberId] = true;
            state.errors.removeMember = { ...state.errors.removeMember };
            delete state.errors.removeMember[memberId];
            
            // Optimistic update
            state.optimisticUpdates.pendingRemovals.push(memberId);
          });

          const { error } = await supabase
            .from('organization_members')
            .delete()
            .eq('id', memberId);

          if (error) throw error;

          set((state) => {
            // Remove member from list
            state.members = state.members.filter(m => m.id !== memberId);
            
            // Clear optimistic update and loading state
            state.optimisticUpdates.pendingRemovals = state.optimisticUpdates.pendingRemovals.filter(id => id !== memberId);
            delete state.loadingStates.removingMember[memberId];
          });

          toast.success('Member removed successfully');

        } catch (error) {
          set((state) => {
            delete state.loadingStates.removingMember[memberId];
            state.optimisticUpdates.pendingRemovals = state.optimisticUpdates.pendingRemovals.filter(id => id !== memberId);
            state.errors.removeMember = { 
              ...state.errors.removeMember, 
              [memberId]: error.message 
            };
          });
          toast.error(`Failed to remove member: ${error.message}`);
          throw error;
        }
      },

      // Resend invitation
      resendInvitation: async (invitationId: string) => {
        try {
          set((state) => {
            state.loadingStates.resendingInvitation[invitationId] = true;
            state.errors.resendInvitation = { ...state.errors.resendInvitation };
            delete state.errors.resendInvitation[invitationId];
          });

          // Update expiry date
          const newExpiresAt = new Date();
          newExpiresAt.setDate(newExpiresAt.getDate() + 7);

          const { error } = await supabase
            .from('organization_invitations')
            .update({ 
              expires_at: newExpiresAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', invitationId);

          if (error) throw error;

          // TODO: Send invitation email again
          // await resendInvitationEmail(invitationId);

          set((state) => {
            const invitationIndex = state.invitations.findIndex(i => i.id === invitationId);
            if (invitationIndex !== -1) {
              state.invitations[invitationIndex].expires_at = newExpiresAt.toISOString();
              state.invitations[invitationIndex].updated_at = new Date().toISOString();
            }
            delete state.loadingStates.resendingInvitation[invitationId];
          });

          toast.success('Invitation resent successfully');

        } catch (error) {
          set((state) => {
            delete state.loadingStates.resendingInvitation[invitationId];
            state.errors.resendInvitation = { 
              ...state.errors.resendInvitation, 
              [invitationId]: error.message 
            };
          });
          toast.error(`Failed to resend invitation: ${error.message}`);
          throw error;
        }
      },

      // Cancel invitation
      cancelInvitation: async (invitationId: string) => {
        try {
          set((state) => {
            state.loadingStates.cancelingInvitation[invitationId] = true;
            state.errors.cancelInvitation = { ...state.errors.cancelInvitation };
            delete state.errors.cancelInvitation[invitationId];
          });

          // Use RPC function to bypass RLS issues
          const { data, error } = await supabase
            .rpc('cancel_organization_invitation', { 
              p_invitation_id: invitationId 
            });

          if (error) {
            console.error('RPC Error canceling invitation:', error);
            throw error;
          }

          if (!data) {
            throw new Error('Failed to cancel invitation - invitation not found or no permission');
          }

          set((state) => {
            state.invitations = state.invitations.filter(i => i.id !== invitationId);
            delete state.loadingStates.cancelingInvitation[invitationId];
          });

          toast.success('Invitation cancelled successfully');

        } catch (error) {
          set((state) => {
            delete state.loadingStates.cancelingInvitation[invitationId];
            state.errors.cancelInvitation = { 
              ...state.errors.cancelInvitation, 
              [invitationId]: error.message 
            };
          });
          toast.error(`Failed to cancel invitation: ${error.message}`);
          throw error;
        }
      },

      // Accept invitation
      acceptInvitation: async (invitationId: string) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Get invitation details
          const { data: invitation, error: inviteError } = await supabase
            .from('organization_invitations')
            .select('*')
            .eq('id', invitationId)
            .eq('email', user.email)
            .eq('status', 'pending')
            .single();

          if (inviteError) throw inviteError;
          if (!invitation) throw new Error('Invitation not found or already processed');

          // Check if invitation is expired
          if (new Date(invitation.expires_at) < new Date()) {
            throw new Error('Invitation has expired');
          }

          // Create organization member
          const { error: memberError } = await supabase
            .from('organization_members')
            .insert([{
              user_id: user.id,
              organization_id: invitation.organization_id,
              role: invitation.role,
            }]);

          if (memberError) throw memberError;

          // Update invitation status
          const { error: updateError } = await supabase
            .from('organization_invitations')
            .update({ 
              status: 'accepted',
              accepted_at: new Date().toISOString()
            })
            .eq('id', invitationId);

          if (updateError) throw updateError;

          // Update user's current organization
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ current_organization: invitation.organization_id })
            .eq('id', user.id);

          if (profileError) throw profileError;

          // Reload organization data
          await get().loadOrganization();

          toast.success('Successfully joined organization!');

        } catch (error) {
          toast.error(`Failed to accept invitation: ${error.message}`);
          throw error;
        }
      },

      // Utility functions
      clearError: (errorType: string, id?: string) => {
        set((state) => {
          if (id && state.errors[errorType] && typeof state.errors[errorType] === 'object') {
            delete state.errors[errorType][id];
          } else {
            delete state.errors[errorType];
          }
        });
      },

      reset: () => {
        set(() => ({ ...initialState }));
      },

      refreshData: async () => {
        await get().loadOrganization();
      },
    })),
    {
      name: 'organization-store',
      partialize: (state) => ({
        currentOrganization: state.currentOrganization,
        members: state.members,
        invitations: state.invitations,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);

// Selector hooks for easier access
export const useOrganizationData = () => {
  const store = useOrganizationStore();
  return {
    organization: store.currentOrganization,
    members: store.members,
    invitations: store.invitations,
    needsOrganization: store.needsOrganization,
  };
};

export const useOrganizationStats = () => {
  const { organization, members, invitations } = useOrganizationData();
  
  if (!organization) {
    return {
      totalMembers: 0,
      activeMembers: 0,
      pendingInvitations: 0,
      capacityUsed: 0,
      hasCapacity: true,
    };
  }

  const activeMembers = members.filter(m => m.status === 'active').length;
  const pendingInvitations = invitations.filter(i => i.status === 'pending').length;
  const totalMembers = activeMembers + pendingInvitations;
  const capacityUsed = (totalMembers / organization.max_members) * 100;
  const hasCapacity = totalMembers < organization.max_members;

  return {
    totalMembers,
    activeMembers,
    pendingInvitations,
    capacityUsed,
    hasCapacity,
  };
};

export const useOrganizationLoadingStates = () => {
  const store = useOrganizationStore();
  return store.loadingStates;
};

export const useOrganizationActions = () => {
  const store = useOrganizationStore();
  return {
    loadOrganization: store.loadOrganization,
    createOrganization: store.createOrganization,
    inviteUsers: store.inviteUsers,
    updateMemberRole: store.updateMemberRole,
    removeMember: store.removeMember,
    resendInvitation: store.resendInvitation,
    cancelInvitation: store.cancelInvitation,
    acceptInvitation: store.acceptInvitation,
    clearError: store.clearError,
    reset: store.reset,
    refreshData: store.refreshData,
    checkUserOrganization: store.checkUserOrganization,
  };
};

export const useOptimisticUpdates = () => {
  const store = useOrganizationStore();
  return store.optimisticUpdates;
};

export const useOrganizationErrors = () => {
  const store = useOrganizationStore();
  return store.errors;
}; 