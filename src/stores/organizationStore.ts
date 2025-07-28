import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase } from '@/integrations/supabase/client';
import { 
  OrganizationState, 
  OrganizationMember, 
  OrganizationInvitation, 
  InviteUserForm,
  OrganizationRole 
} from '@/types/organization';
import { toast } from 'sonner';
import { isValidDomain, getEmailDomain, generateInitials } from '@/utils/organization';
import {
  checkUserNeedsOrganization,
  createOrganization,
  createPersonalWorkspace,
  loadUserOrganization
} from '@/services/organizationService';
import { invitationEmailService } from '@/services/invitationEmailService';

// Simple, clean organization state
interface CleanOrganizationState extends OrganizationState {
  // Simple loading states
  loadingStates: {
    checkingOrganization: boolean;
    loadingOrganization: boolean;
    creatingOrganization: boolean;
    invitingUsers: boolean;
  };
  
  // Simple error state
  error: string | null;
  
  // Core state
  needsOrganization: boolean;
  lastUpdated: string | null;
  hasCheckedOrganization: boolean; // Add flag to prevent redundant checks
}

// Store actions interface
interface OrganizationActions {
  // Core actions
  checkUserOrganization: () => Promise<void>;
  loadOrganization: (force?: boolean) => Promise<void>;
  createOrganization: (name: string, domain?: string) => Promise<void>;
  createPersonalWorkspace: () => Promise<void>;
  
  // User management actions
  inviteUsers: (form: InviteUserForm) => Promise<void>;
  updateMemberRole: (memberId: string, role: OrganizationRole) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  
  // Invitation actions
  resendInvitation: (invitationId: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  
  // Utility actions
  clearError: () => void;
  refresh: () => Promise<void>;
  resetOrganizationCheck: () => void;
}

type OrganizationStore = CleanOrganizationState & OrganizationActions;

// Initial state
const initialState: CleanOrganizationState = {
  currentOrganization: null,
  members: [],
  invitations: [],
  loading: false,
  error: null,
  needsOrganization: false,
  loadingStates: {
    checkingOrganization: false,
    loadingOrganization: false,
    creatingOrganization: false,
    invitingUsers: false,
  },
  lastUpdated: null,
  hasCheckedOrganization: false,
};

export const useOrganizationStore = create<OrganizationStore>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // Clear any error
      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      // Check if user needs to create/select organization
      checkUserOrganization: async () => {
        const state = get();
        
        // Prevent redundant calls if we've already checked and aren't loading
        if (state.hasCheckedOrganization && !state.loadingStates.checkingOrganization) {
          console.log('⏭️ Skipping organization check - already completed');
          return;
        }

        try {
          set((state) => { 
            state.loadingStates.checkingOrganization = true;
            state.error = null;
          });
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            set((state) => { 
              state.needsOrganization = false;
              state.loadingStates.checkingOrganization = false;
              state.hasCheckedOrganization = true;
            });
            return;
          }

          const result = await checkUserNeedsOrganization(user.id);
          
          console.log('🔍 Organization check result:', result);
          
            set((state) => { 
            state.needsOrganization = result.needsOrganization;
              state.loadingStates.checkingOrganization = false;
            state.hasCheckedOrganization = true;
          });

          // If user has organization, load the data (only once)
          if (!result.needsOrganization && !state.currentOrganization) {
            await get().loadOrganization();
          }

        } catch (error) {
          console.error('Error checking user organization:', error);
          set((state) => { 
            state.needsOrganization = true;
            state.loadingStates.checkingOrganization = false;
            state.error = 'Failed to check organization status';
            state.hasCheckedOrganization = true;
          });
        }
      },

      // Load organization data
      loadOrganization: async (force = false) => {
        const state = get();
        
        // Skip if already loaded and not forcing reload
        if (!force && state.currentOrganization && state.members.length > 0) {
          console.log('⏭️ Skipping organization load - data already loaded');
          return;
        }

        try {
          set((state) => { 
            state.loadingStates.loadingOrganization = true;
            state.error = null;
          });
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            set((state) => {
              state.loadingStates.loadingOrganization = false;
            });
            return;
          }

          const orgData = await loadUserOrganization(user.id);

          set((state) => {
            state.currentOrganization = orgData.organization;
            state.members = orgData.members?.map(member => ({
              ...member,
              user: {
                id: member.profiles.id,
                email: member.profiles.email || '',
                first_name: member.profiles.first_name || '',
                last_name: member.profiles.last_name || '',
                avatar_url: member.profiles.avatar_url || null,
                initials: generateInitials(
                  member.profiles.first_name || '',
                  member.profiles.last_name || ''
                )
              }
            })) || [];
            state.invitations = orgData.invitations || [];
            state.needsOrganization = !orgData.organization;
            state.loadingStates.loadingOrganization = false;
            state.lastUpdated = new Date().toISOString();
          });

          console.log('✅ Organization data loaded successfully');

        } catch (error) {
          console.error('Error loading organization:', error);
          set((state) => {
            state.loadingStates.loadingOrganization = false;
            state.loading = false;
            state.error = 'Failed to load organization data';
          });
        }
      },

      // Create new organization
      createOrganization: async (name: string, domain?: string) => {
        try {
          set((state) => {
            state.loadingStates.creatingOrganization = true;
            state.error = null;
          });

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const result = await createOrganization(user.id, name, domain);

          if (!result.success) {
            throw new Error(result.error);
          }

          // Load the newly created organization
          await get().loadOrganization(true);

          set((state) => {
            state.needsOrganization = false;
            state.loadingStates.creatingOrganization = false;
            state.hasCheckedOrganization = false; // Reset to allow fresh checks
          });

          toast.success('Organization created successfully!');

        } catch (error) {
          console.error('Error creating organization:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to create organization';
          set((state) => {
            state.loadingStates.creatingOrganization = false;
            state.error = errorMessage;
          });
          throw error; // Re-throw for UI handling
        }
      },

      // Create personal workspace
      createPersonalWorkspace: async () => {
        try {
          set((state) => {
            state.loadingStates.creatingOrganization = true;
            state.error = null;
          });

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const result = await createPersonalWorkspace(user.id);

          if (!result.success) {
            throw new Error(result.error);
          }

          // Load the workspace data
          await get().loadOrganization(true);

          set((state) => {
            state.needsOrganization = false;
            state.loadingStates.creatingOrganization = false;
            state.hasCheckedOrganization = false; // Reset to allow fresh checks
          });

          toast.success(result.message || 'Personal workspace created!');

        } catch (error) {
          console.error('Error creating personal workspace:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to create workspace';
          set((state) => {
            state.loadingStates.creatingOrganization = false;
            state.error = errorMessage;
          });
          throw error; // Re-throw for UI handling
        }
      },

      // Invite users to organization
      inviteUsers: async (form: InviteUserForm) => {
        try {
          set((state) => {
            state.loadingStates.invitingUsers = true;
            state.error = null;
          });

          const currentOrg = get().currentOrganization;
          if (!currentOrg) {
            throw new Error('No organization selected');
          }

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Use RPC function to create invitations (bypasses all RLS issues)
          const { data: invitations, error } = await supabase
            .rpc('create_organization_invitations', {
              org_id: currentOrg.id,
              email_list: form.emails.map(email => email.trim().toLowerCase()),
              invitation_role: form.role,
              welcome_message: form.message || null
            });

          if (error) {
            throw error;
          }

          // Separate existing vs new invitations for better user feedback
          const existingInvitations = invitations?.filter(inv => inv.is_existing) || [];
          const newInvitations = invitations?.filter(inv => !inv.is_existing) || [];

          // Send invitation emails for all invitations (existing + new)
          try {
            const inviterName = user?.email?.split('@')[0] || 'Your teammate';
            
            console.log(`📧 Sending ${invitations?.length || 0} invitation emails...`);
            
            for (const invitation of invitations || []) {
              await invitationEmailService.sendInvitationEmail(
                invitation as any,
                currentOrg.name,
                inviterName
              );
            }
            console.log('✅ All invitation emails sent successfully');
          } catch (emailError) {
            console.warn('⚠️ Invitations created but email sending failed:', emailError);
            // Don't throw error - invitations were created successfully
          }

          // Refresh organization data to show updated invitations
          await get().loadOrganization(true);

          set((state) => {
            state.loadingStates.invitingUsers = false;
          });

          // Provide user feedback about what happened
          if (existingInvitations.length > 0 && newInvitations.length > 0) {
            console.log(`✅ ${newInvitations.length} new invitation(s) sent, ${existingInvitations.length} already existed`);
          } else if (existingInvitations.length > 0) {
            console.log(`ℹ️ All invited emails already have pending invitations`);
          } else {
            console.log(`✅ ${newInvitations.length} invitation(s) sent successfully`);
          }

        } catch (error) {
          console.error('Error inviting users:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to send invitations';
          set((state) => {
            state.loadingStates.invitingUsers = false;
            state.error = errorMessage;
          });
          throw error;
        }
      },

      // Update member role
      updateMemberRole: async (memberId: string, role: OrganizationRole) => {
        try {
          const { error } = await supabase
            .from('organization_members')
            .update({ role, updated_at: new Date().toISOString() })
            .eq('id', memberId);

          if (error) throw error;

          // Update local state
          set((state) => {
            const member = state.members.find(m => m.id === memberId);
            if (member) {
              member.role = role;
            }
          });

          toast.success('Member role updated successfully');

        } catch (error) {
          console.error('Error updating member role:', error);
          toast.error('Failed to update member role');
          throw error;
        }
      },

      // Remove member
      removeMember: async (memberId: string) => {
        try {
          const { error } = await supabase
            .from('organization_members')
            .delete()
            .eq('id', memberId);

          if (error) throw error;

          // Update local state
          set((state) => {
            state.members = state.members.filter(m => m.id !== memberId);
          });

          toast.success('Member removed successfully');

        } catch (error) {
          console.error('Error removing member:', error);
          toast.error('Failed to remove member');
          throw error;
        }
      },

      // Resend invitation
      resendInvitation: async (invitationId: string) => {
        try {
          // Update invitation timestamp to trigger resend
          const { error } = await supabase
            .from('organization_invitations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', invitationId);

          if (error) throw error;

          toast.success('Invitation resent successfully');

        } catch (error) {
          console.error('Error resending invitation:', error);
          toast.error('Failed to resend invitation');
          throw error;
        }
      },

      // Cancel invitation
      cancelInvitation: async (invitationId: string) => {
        try {
          const { error } = await supabase
            .from('organization_invitations')
            .update({ status: 'cancelled' })
            .eq('id', invitationId);

          if (error) throw error;

          // Update local state
          set((state) => {
            state.invitations = state.invitations.filter(inv => inv.id !== invitationId);
          });

          toast.success('Invitation cancelled successfully');

        } catch (error) {
          console.error('Error cancelling invitation:', error);
          toast.error('Failed to cancel invitation');
          throw error;
        }
      },

      // Refresh all data
      refresh: async () => {
        // Reset the flag to allow fresh checks
        set((state) => {
          state.hasCheckedOrganization = false;
        });
        await get().checkUserOrganization();
      },

      // Reset organization check flag (useful for testing or after major changes)
      resetOrganizationCheck: () => {
        set((state) => {
          state.hasCheckedOrganization = false;
        });
      },

    })),
    {
      name: 'organization-store',
      partialize: (state) => ({
        // Only persist essential data, not loading states
        currentOrganization: state.currentOrganization,
        lastUpdated: state.lastUpdated,
        hasCheckedOrganization: state.hasCheckedOrganization,
      }),
      // Add merge function to handle rehydration properly
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...persistedState };
        // If we have persisted organization but it's older than 5 minutes, reset the check flag
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        if (merged.lastUpdated && merged.lastUpdated < fiveMinutesAgo) {
          merged.hasCheckedOrganization = false;
        }
        return merged;
      },
    }
  )
);

// Export hooks for cleaner component usage - using individual selectors to prevent infinite re-renders
export const useOrganizationData = () => ({
  currentOrganization: useOrganizationStore((state) => state.currentOrganization),
  organization: useOrganizationStore((state) => state.currentOrganization), // Backward compatibility
  members: useOrganizationStore((state) => state.members),
  invitations: useOrganizationStore((state) => state.invitations),
  needsOrganization: useOrganizationStore((state) => state.needsOrganization),
  loading: useOrganizationStore((state) => state.loading),
  error: useOrganizationStore((state) => state.error),
  lastUpdated: useOrganizationStore((state) => state.lastUpdated),
});

export const useOrganizationLoadingStates = () => {
  const loadingStates = useOrganizationStore((state) => state.loadingStates);
  return {
    ...loadingStates,
    // Add missing loading states for backward compatibility
    updatingRole: {},
    removingMember: {},
    resendingInvitation: {},
    cancellingInvitation: {},
  };
};

export const useOrganizationStats = () => {
  const currentOrganization = useOrganizationStore((state) => state.currentOrganization);
  const members = useOrganizationStore((state) => state.members);
  const invitations = useOrganizationStore((state) => state.invitations);
  
  if (!currentOrganization) {
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
  const capacityUsed = Math.round((totalMembers / currentOrganization.max_members) * 100);
  const hasCapacity = totalMembers < currentOrganization.max_members;

  return {
    totalMembers,
    activeMembers,
    pendingInvitations,
    capacityUsed,
    hasCapacity,
  };
};

// Backward compatibility hooks for components that haven't been updated yet
export const useOrganizationErrors = () => {
  const error = useOrganizationStore((state) => state.error);
  return {
    // Simple error structure for backward compatibility
    loadOrganization: error,
    createOrganization: error,
    inviteUsers: error,
    updateRole: {},
    removeMember: {},
    resendInvitation: {},
    cancelInvitation: {},
  };
};

export const useOptimisticUpdates = () => ({
  // Empty optimistic updates for backward compatibility
  pendingInvitations: [],
  pendingRoleChanges: {},
  pendingRemovals: [],
});

export const useOrganizationActions = () => ({
  checkUserOrganization: useOrganizationStore((state) => state.checkUserOrganization),
  loadOrganization: useOrganizationStore((state) => state.loadOrganization),
  createOrganization: useOrganizationStore((state) => state.createOrganization),
  createPersonalWorkspace: useOrganizationStore((state) => state.createPersonalWorkspace),
  inviteUsers: useOrganizationStore((state) => state.inviteUsers),
  updateMemberRole: useOrganizationStore((state) => state.updateMemberRole),
  removeMember: useOrganizationStore((state) => state.removeMember),
  resendInvitation: useOrganizationStore((state) => state.resendInvitation),
  cancelInvitation: useOrganizationStore((state) => state.cancelInvitation),
  clearError: useOrganizationStore((state) => state.clearError),
  refresh: useOrganizationStore((state) => state.refresh),
  resetOrganizationCheck: useOrganizationStore((state) => state.resetOrganizationCheck),
}); 