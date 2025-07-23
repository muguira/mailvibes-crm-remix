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

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

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
    checkingOrganization: boolean;
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
  isDataFresh: boolean; // New: track if data is fresh
  optimisticUpdates: {
    pendingInvitations: OrganizationInvitation[];
    pendingRoleChanges: { [memberId: string]: 'admin' | 'user' };
    pendingRemovals: string[]; // member IDs
  };
}

interface OrganizationStore extends EnhancedOrganizationState {
  // Actions
  loadOrganization: (force?: boolean) => Promise<void>;
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
  invalidateCache: () => void; // New: manually invalidate cache
}

// Initial state
const initialState: EnhancedOrganizationState = {
  currentOrganization: null,
  members: [],
  invitations: [],
  loading: false,
  error: null,
  needsOrganization: false,
  isDataFresh: false,
  loadingStates: {
    loadingOrganization: false,
    creatingOrganization: false,
    invitingUsers: false,
    updatingRole: {},
    removingMember: {},
    resendingInvitation: {},
    cancelingInvitation: {},
    checkingOrganization: false,
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

      // Check if data is fresh (within cache duration)
      isDataFresh: () => {
        const state = get();
        if (!state.lastUpdated) return false;
        
        const lastUpdate = new Date(state.lastUpdated).getTime();
        const now = Date.now();
        return (now - lastUpdate) < CACHE_DURATION;
      },

      // Invalidate cache manually
      invalidateCache: () => {
        set((state) => {
          state.isDataFresh = false;
          state.lastUpdated = null;
        });
      },

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

          // Use the new invitation service to check if user needs organization
          const { checkUserNeedsOrganization } = await import('@/services/invitationService');
          const needsOrgResult = await checkUserNeedsOrganization(user.id);
          
          console.log('🔍 Organization check result:', needsOrgResult);

          if (!needsOrgResult.needsOrganization) {
            set((state) => { 
              state.needsOrganization = false;
              state.loadingStates.checkingOrganization = false;
            });
            // Load organization data but use cache if fresh
            await get().loadOrganization(false); // Don't force reload
          } else {
            console.log('📝 User needs to create an organization');
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

      // Load organization data with intelligent caching
      loadOrganization: async (force = false) => {
        const state = get();
        
        // Check if we have fresh data and don't need to force reload
        if (!force && state.currentOrganization && state.isDataFresh) {
          console.log('🚀 Using cached organization data');
          return;
        }

        try {
          set((state) => {
            state.loadingStates.loadingOrganization = true;
            state.errors.loadOrganization = undefined;
          });

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          console.log('🔄 Fetching fresh organization data...');

          // Use RPC function to get user's organization safely
          const { data: orgData, error: orgError } = await supabase
            .rpc('get_user_organization_safe', { p_user_id: user.id });

          if (orgError) throw orgError;
          if (!orgData || orgData.length === 0) throw new Error('No organization found');

          const orgInfo = orgData[0];
          
          // Get the full organization details using safe RPC
          const { data: orgDetails, error: orgDetailsError } = await supabase
            .rpc('get_organization_details_safe', { p_org_id: orgInfo.organization_id });

          if (orgDetailsError) throw orgDetailsError;
          if (!orgDetails || orgDetails.length === 0) throw new Error('Organization details not found');

          const organization = orgDetails[0];

          // Get organization members using the new safe RPC function
          const { data: membersData, error: membersError } = await supabase
            .rpc('get_organization_members_safe', { p_org_id: organization.id });

          if (membersError) {
            console.warn('Failed to load organization members:', membersError);
          }

          // Transform members data
          const transformedMembers: OrganizationMember[] = (membersData || []).map(member => ({
            id: member.id,
            user_id: member.user_id,
            organization_id: member.organization_id,
            role: member.role as OrganizationRole,
            status: (member.status || 'active') as 'active' | 'inactive',
            invited_by: member.invited_by,
            joined_at: member.joined_at || member.created_at,
            created_at: member.created_at,
            updated_at: member.updated_at,
            user: {
              id: member.user_id,
              email: member.user_email,
              first_name: member.user_first_name,
              last_name: member.user_last_name,
              avatar_url: member.user_avatar_url || null,
              initials: generateInitials(member.user_first_name, member.user_last_name)
            }
          }));

          // Get organization invitations using the new safe RPC function
          const { data: invitationsData, error: invitationsError } = await supabase
            .rpc('get_organization_invitations_safe', { p_org_id: organization.id });

          if (invitationsError) {
            console.warn('Failed to load organization invitations:', invitationsError);
          }

          // Transform invitations data
          const transformedInvitations: OrganizationInvitation[] = (invitationsData || []).map(invitation => ({
            id: invitation.id,
            organization_id: invitation.organization_id,
            email: invitation.email,
            role: invitation.role as 'admin' | 'user',
            status: invitation.status as 'pending' | 'accepted' | 'declined' | 'expired',
            invited_by: invitation.invited_by,
            expires_at: invitation.expires_at,
            accepted_at: invitation.accepted_at,
            created_at: invitation.created_at,
            updated_at: invitation.updated_at,
            token: invitation.token,
            inviter: {
              id: invitation.invited_by,
              email: invitation.inviter_email,
              first_name: invitation.inviter_name.split(' ')[0] || '',
              last_name: invitation.inviter_name.split(' ').slice(1).join(' ') || ''
            }
          }));

          set((state) => {
            state.currentOrganization = {
              id: organization.id,
              name: organization.name,
              domain: organization.domain,
              plan: organization.plan || 'free',
              member_count: transformedMembers.length,
              max_members: organization.max_members || 25,
              created_at: organization.created_at,
              updated_at: organization.updated_at
            };
            state.members = transformedMembers;
            state.invitations = transformedInvitations;
            state.loading = false;
            state.needsOrganization = false;
            state.lastUpdated = new Date().toISOString();
            state.isDataFresh = true;
            state.loadingStates.loadingOrganization = false;
          });

          console.log('✅ Organization data loaded and cached');

        } catch (error: any) {
          set((state) => {
            state.loadingStates.loadingOrganization = false;
            state.errors.loadOrganization = error.message;
          });
          console.error('Error loading organization:', error);
        }
      },

      // ... rest of the existing functions with minimal changes
      // (I'll include the key functions for brevity)

      reset: () => {
        set(() => ({ ...initialState }));
      },

      refreshData: async () => {
        await get().loadOrganization(true); // Force reload
      },

      // Rest of the methods remain the same...
      // (createOrganization, inviteUsers, updateMemberRole, etc.)

    })),
    {
      name: 'organization-store',
      partialize: (state) => ({
        currentOrganization: state.currentOrganization,
        members: state.members,
        invitations: state.invitations,
        lastUpdated: state.lastUpdated,
        isDataFresh: state.isDataFresh, // Persist cache freshness
      }),
    }
  )
);

// ... rest of the selector hooks remain the same
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

export const useOrganizationErrors = () => {
  const store = useOrganizationStore();
  return store.errors;
};

export const useOptimisticUpdates = () => {
  const store = useOrganizationStore();
  return store.optimisticUpdates;
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
    invalidateCache: store.invalidateCache,
  };
};
