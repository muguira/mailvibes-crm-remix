import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  ArrowRight, 
  UserPlus, 
  Clock,
  CheckCircle,
  Building2
} from 'lucide-react';
import { 
  useOrganizationData, 
  useOrganizationStats, 
  useOrganizationLoadingStates 
} from '@/stores/organizationStore';
import { useAuth } from '@/components/auth';

export const AddTeammatesCard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization, members, invitations } = useOrganizationData();
  const stats = useOrganizationStats();
  const loadingStates = useOrganizationLoadingStates();

  // Get current user's role in the organization
  const currentUserMember = members.find(member => member.user_id === user?.id);
  const isAdmin = currentUserMember?.role === 'admin';

  const handleNavigateToUsers = () => {
    navigate('/settings/organization/users');
  };

  const handleInviteUsers = () => {
    navigate('/settings/organization/users');
  };

  // Don't show if organization is not loaded yet
  if (loadingStates.loadingOrganization || !organization) {
    return (
      <Card className="bg-gradient-to-br from-[#E8F5F3] to-[#D1F2ED] border-[#00A991]/20 shadow-sm w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#00A991] border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only show to admins
  if (!isAdmin) {
    return null;
  }

  // Different content based on team size
  const isNewTeam = stats.totalMembers <= 1;
  const hasCapacity = stats.hasCapacity;
  const pendingInvites = stats.pendingInvitations;

  return (
    <Card className="bg-gradient-to-br from-[#E8F5F3] to-[#D1F2ED] border-[#00A991]/20 shadow-sm hover:shadow-md transition-all duration-200 w-full">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#00A991] rounded-lg">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {isNewTeam ? 'Invite Your Team' : 'Grow Your Team'}
                </h3>
                <p className="text-sm text-gray-600">
                  {isNewTeam 
                    ? 'Start collaborating with your teammates'
                    : 'Invite more colleagues to join your workspace'
                  }
                </p>
              </div>
            </div>
            
            {/* Organization Icon */}
            <div className="p-2 bg-white/50 rounded-lg">
              <Building2 className="w-5 h-5 text-[#00A991]" />
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4">
            {/* Current Members */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-900">
                  {stats.activeMembers}
                </span>
              </div>
              <span className="text-xs text-gray-600">member{stats.activeMembers === 1 ? '' : 's'}</span>
            </div>

            {/* Pending Invitations */}
            {pendingInvites > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-gray-900">
                    {pendingInvites}
                  </span>
                </div>
                <span className="text-xs text-gray-600">pending</span>
              </div>
            )}

            {/* Capacity */}
            <div className="flex items-center gap-2">
              <Badge 
                variant={hasCapacity ? "secondary" : "destructive"}
                className="text-xs"
              >
                {stats.totalMembers}/{organization.max_members}
              </Badge>
              <span className="text-xs text-gray-600">capacity</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Team Growth</span>
              <span className="text-gray-900 font-medium">
                {Math.round(stats.capacityUsed)}%
              </span>
            </div>
            <div className="w-full bg-white/50 rounded-full h-2">
              <div 
                className="bg-[#00A991] h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(stats.capacityUsed, 100)}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {hasCapacity ? (
              <Button
                onClick={handleInviteUsers}
                className="flex-1 bg-[#00A991] hover:bg-[#008A7A] text-white shadow-sm"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                {isNewTeam ? 'Invite Teammates' : 'Invite More'}
              </Button>
            ) : (
              <Button
                onClick={handleNavigateToUsers}
                variant="outline"
                className="flex-1 border-[#00A991] text-[#00A991] hover:bg-[#E8F5F3]"
                size="sm"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Team
              </Button>
            )}
            
            <Button
              onClick={handleNavigateToUsers}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-[#00A991] hover:bg-white/50"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Additional Info */}
          <div className="pt-2 border-t border-white/30">
            {isNewTeam ? (
              <div className="text-xs text-gray-600">
                💡 <strong>Tip:</strong> Collaborating is more fun with teammates!
              </div>
            ) : !hasCapacity ? (
              <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                ⚠️ Team is at capacity. Consider upgrading your plan.
              </div>
            ) : pendingInvites > 0 ? (
              <div className="text-xs text-blue-600">
                📧 {pendingInvites} invitation{pendingInvites === 1 ? '' : 's'} pending acceptance
              </div>
            ) : (
              <div className="text-xs text-gray-600">
                🎯 <strong>{organization.plan}</strong> plan • {organization.max_members - stats.totalMembers} spots available
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
