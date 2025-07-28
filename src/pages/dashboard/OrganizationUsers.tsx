import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { 
  InviteUsersModal, 
  RoleChangeDropdown, 
  RemoveMemberDialog,
  InvitationActions 
} from '@/components/settings';
import { 
  useOrganizationData, 
  useOrganizationActions,
  useOrganizationLoadingStates,
  useOrganizationErrors,
  useOptimisticUpdates,
  useOrganizationStats
} from '@/stores/organizationStore';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  MoreVertical, 
  AlertCircle, 
  Clock,
  CheckCircle,
  UserCheck,
  Mail,
  RefreshCw,
  TrendingUp,
  Shield
} from 'lucide-react';
import { OrganizationMember, InviteUserForm } from '@/types/organization';
import organizationMocks from '@/mocks/organizationMocks';
import { supabase } from '@/integrations/supabase/client';

const OrganizationUsers: React.FC = () => {
  // State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);

  // Store data and actions
  const { organization, members, invitations, lastUpdated } = useOrganizationData();
  const loadingStates = useOrganizationLoadingStates();
  const errors = useOrganizationErrors();
  const optimisticUpdates = useOptimisticUpdates();
  const stats = useOrganizationStats();
  
  const {
    loadOrganization,
    inviteUsers,
    updateMemberRole,
    removeMember,
    resendInvitation,
    cancelInvitation,
    clearError,
    refreshData
  } = useOrganizationActions();

  // Current user info for permissions
  const [currentUserRole, setCurrentUserRole] = useState<string>('user');
  
  // Get actual user role
  useEffect(() => {
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && members.length > 0) {
        const currentMember = members.find(m => m.user_id === user.id);
        if (currentMember) {
          setCurrentUserRole(currentMember.role);
        } else {
          setCurrentUserRole('user');
        }
      }
    };
    getUserRole();
  }, [members]);

  // Load organization data on mount - ensure members are loaded
  useEffect(() => {
    // Only load if we have an organization but no members, and we're not currently loading
    if (organization?.id && (!members || members.length === 0) && !loadingStates.loadingOrganization) {
      console.log('🔄 Loading organization members for org:', organization.id);
      loadOrganization(true); // Force reload to get fresh members data
    }
  }, [organization?.id]); // Only depend on organization ID to prevent excessive reloads

  // Early loading state check - if we have org but no members and not loading, show loading
  const shouldShowLoading = loadingStates.loadingOrganization || 
    (organization && (!members || members.length === 0) && !errors.loadOrganization);

  // Show loading state while data is being fetched
  if (shouldShowLoading) {
    return (
      <SettingsLayout title="Settings">
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00A991] mx-auto mb-4"></div>
                <p className="text-gray-600">Loading organization members...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  // Handle invite users
  const handleInviteUsers = async (formData: InviteUserForm) => {
    try {
      await inviteUsers(formData);
      toast.success(
        `${formData.emails.length} invitation${formData.emails.length === 1 ? '' : 's'} sent successfully!`,
        {
          description: 'Users will receive an email with instructions to join your organization.'
        }
      );
    } catch (error: any) {
      toast.error('Failed to send invitations', {
        description: error.message
      });
      throw error;
    }
  };

  // Handle role change
  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'user') => {
    try {
      await updateMemberRole(memberId, newRole);
      // Toast is already handled by the store function to prevent duplicates
    } catch (error: any) {
      // Error toast is already handled by the store function to prevent duplicates
      throw error;
    }
  };

  // Handle remove member
  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
      // Toast is already handled by the store function to prevent duplicates
    } catch (error: any) {
      // Error toast is already handled by the store function to prevent duplicates
      throw error;
    }
  };

  // Handle resend invitation
  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation(invitationId);
      const invitation = invitations.find(inv => inv.id === invitationId);
      toast.success('Invitation resent', {
        description: `New invitation sent to ${invitation?.email}`
      });
    } catch (error: any) {
      toast.error('Failed to resend invitation', {
        description: error.message
      });
      throw error;
    }
  };

  // Handle cancel invitation
  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const invitation = invitations.find(inv => inv.id === invitationId);
      await cancelInvitation(invitationId);
      toast.success('Invitation canceled', {
        description: `Invitation for ${invitation?.email} has been canceled`
      });
    } catch (error: any) {
      toast.error('Failed to cancel invitation', {
        description: error.message
      });
      throw error;
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await refreshData();
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

  // Get effective members (including optimistic updates)
  const effectiveMembers = members.filter(member => 
    !optimisticUpdates.pendingRemovals.includes(member.id)
  );

  // Get effective invitations (including optimistic updates)
  const effectiveInvitations = [
    ...invitations,
    ...optimisticUpdates.pendingInvitations
  ];

  // Show error state
  if (errors.loadOrganization && !organization) {
    return (
      <SettingsLayout title="Settings">
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load organization</h3>
                <p className="text-gray-600 mb-4">{errors.loadOrganization}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={loadOrganization} variant="outline">
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => clearError('loadOrganization')} 
                    variant="ghost"
                    size="sm"
                  >
                    Dismiss Error
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  const canManageUsers = currentUserRole === 'admin';

  return (
    <SettingsLayout title="Settings">
      {/* Organization Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-[#00A991]" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.activeMembers}</div>
              <div className="text-sm text-gray-600">Active Members</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.pendingInvitations}</div>
              <div className="text-sm text-gray-600">Pending Invites</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.adminCount}</div>
              <div className="text-sm text-gray-600">Administrators</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{Math.round(stats.capacityUsed)}%</div>
              <div className="text-sm text-gray-600">Capacity Used</div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="bg-white shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-gray-600" />
              <div>
                <CardTitle className="text-xl">Organization Users</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your team members and their permissions
                  {lastUpdated && (
                    <span className="ml-2 text-xs text-gray-500">
                      • Last updated {new Date(lastUpdated).toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loadingStates.loadingOrganization}
                className="flex items-center gap-2"
              >
                <RefreshCw 
                  className={`w-4 h-4 ${loadingStates.loadingOrganization ? 'animate-spin' : ''}`} 
                />
                Refresh
              </Button>
              
              {canManageUsers && (
                <Button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 bg-[#00A991] hover:bg-[#008A7A]"
                  disabled={loadingStates.invitingUsers || !stats.hasCapacity}
                >
                  {loadingStates.invitingUsers ? (
                    <>
                      <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Invite Users
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Capacity Warning */}
          {!stats.hasCapacity && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Organization capacity reached ({organization?.member_count}/{organization?.max_members} members)
                </span>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6">
          {/* Error Banner */}
          {errors.inviteUsers && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors.inviteUsers}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearError('inviteUsers')}
                  className="text-red-600 hover:text-red-700"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {/* Active Members */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Active Members ({effectiveMembers.length})
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {organization?.member_count} of {organization?.max_members} members
              </div>
            </div>
            
            <div className="space-y-3">
              {effectiveMembers.map((member) => {
                const isCurrentUser = member.user_id === organizationMocks.currentUser.id;
                const isUpdatingRole = loadingStates.updatingRole?.[member.id] || false;
                const isRemoving = loadingStates.removingMember?.[member.id] || false;
                const roleError = errors.updateRole?.[member.id];
                const removeError = errors.removeMember?.[member.id];
                const pendingRole = optimisticUpdates.pendingRoleChanges?.[member.id];
                const isPendingRemoval = optimisticUpdates.pendingRemovals?.includes(member.id) || false;
                
                return (
                  <div 
                    key={member.id} 
                    className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                      isPendingRemoval 
                        ? 'border-red-200 bg-red-50 opacity-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-10 h-10 bg-[#00A991] text-white rounded-full flex items-center justify-center font-medium">
                          {member.user.initials}
                        </div>
                        {(isUpdatingRole || isRemoving) && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 animate-spin border border-[#00A991] border-t-transparent rounded-full" />
                          </div>
                        )}
                      </div>
                      
                      {/* User Info */}
                      <div>
                        <div className="font-medium text-gray-900">
                          {member.user.first_name} {member.user.last_name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-gray-500">(You)</span>
                          )}
                          {isPendingRemoval && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Removing...
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {member.user.email}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <UserCheck className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-gray-500">
                            Joined {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Recently'}
                          </span>
                          {pendingRole && (
                            <Badge variant="secondary" className="text-xs">
                              Role changing to {pendingRole}...
                            </Badge>
                          )}
                        </div>
                        
                        {/* Error Messages */}
                        {roleError && (
                          <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {roleError}
                            <button
                              onClick={() => clearError('updateRole', member.id)}
                              className="text-red-400 hover:text-red-600 ml-1"
                            >
                              ×
                            </button>
                          </div>
                        )}
                        {removeError && (
                          <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {removeError}
                            <button
                              onClick={() => clearError('removeMember', member.id)}
                              className="text-red-400 hover:text-red-600 ml-1"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Role Dropdown */}
                      <RoleChangeDropdown
                        member={member}
                        currentUserRole={currentUserRole}
                        isCurrentUser={isCurrentUser}
                        onRoleChange={handleRoleChange}
                        loading={isUpdatingRole}
                      />

                      {/* Remove Button */}
                      {canManageUsers && !isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMemberToRemove(member)}
                          disabled={isRemoving || isPendingRemoval}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <MoreVertical size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending Invitations */}
          {effectiveInvitations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Pending Invitations ({effectiveInvitations.length})
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Awaiting acceptance
                </div>
              </div>
              
              <div className="space-y-3">
                {effectiveInvitations.map((invitation) => {
                  const isExpired = new Date(invitation.expires_at) < new Date();
                  const daysUntilExpiry = Math.ceil(
                    (new Date(invitation.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const isOptimistic = optimisticUpdates.pendingInvitations.some(pi => pi.id === invitation.id);
                  const isResending = loadingStates.resendingInvitation[invitation.id];
                  const isCanceling = loadingStates.cancelingInvitation[invitation.id];
                  
                  return (
                    <div 
                      key={invitation.id} 
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        isOptimistic 
                          ? 'border-blue-200 bg-blue-50' 
                          : isExpired 
                            ? 'border-red-200 bg-red-50' 
                            : 'border-amber-200 bg-amber-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                            isOptimistic
                              ? 'bg-blue-100 text-blue-600'
                              : isExpired 
                                ? 'bg-red-100 text-red-600' 
                                : 'bg-amber-100 text-amber-600'
                          }`}>
                            {invitation.email.charAt(0).toUpperCase()}
                          </div>
                          {(isResending || isCanceling) && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              <div className="w-3 h-3 animate-spin border border-amber-500 border-t-transparent rounded-full" />
                            </div>
                          )}
                        </div>
                        
                        {/* Invitation Info */}
                        <div>
                          <div className="font-medium text-gray-900">
                            {invitation.email}
                            {isOptimistic && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Sending...
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            Invited by {invitation.inviter.first_name} {invitation.inviter.last_name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {isExpired ? (
                              <AlertCircle className="w-3 h-3 text-red-500" />
                            ) : (
                              <Mail className="w-3 h-3 text-amber-500" />
                            )}
                            <span className={`text-xs ${
                              isExpired ? 'text-red-600' : 'text-amber-600'
                            }`}>
                              {isExpired ? 'Expired' : `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Role Badge */}
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          invitation.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {invitation.role === 'admin' ? 'Admin' : 'User'}
                        </span>

                        {/* Actions */}
                        {canManageUsers && !isOptimistic && (
                          <InvitationActions
                            invitation={invitation}
                            onResend={handleResendInvitation}
                            onCancel={handleCancelInvitation}
                            loading={isResending || isCanceling}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {effectiveMembers.length === 0 && effectiveInvitations.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
              <p className="text-gray-600 mb-4">
                Start building your team by inviting colleagues to join your organization.
              </p>
              {canManageUsers && (
                <Button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="bg-[#00A991] hover:bg-[#008A7A]"
                  disabled={!stats.hasCapacity}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Your First User
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <InviteUsersModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInviteUsers}
        loading={loadingStates.invitingUsers}
      />

      <RemoveMemberDialog
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        member={memberToRemove}
        onConfirm={handleRemoveMember}
        loading={memberToRemove ? loadingStates.removingMember[memberToRemove.id] : false}
      />
    </SettingsLayout>
  );
};

export default OrganizationUsers; 