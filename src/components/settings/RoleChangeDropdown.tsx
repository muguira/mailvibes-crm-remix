import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Shield, Users, AlertTriangle } from 'lucide-react';
import { OrganizationMember } from '@/types/organization';

interface RoleChangeDropdownProps {
  member: OrganizationMember;
  currentUserRole: 'admin' | 'user';
  isCurrentUser: boolean;
  onRoleChange: (memberId: string, newRole: 'admin' | 'user') => Promise<void>;
  loading?: boolean;
}

export const RoleChangeDropdown: React.FC<RoleChangeDropdownProps> = ({
  member,
  currentUserRole,
  isCurrentUser,
  onRoleChange,
  loading = false
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<'admin' | 'user' | null>(null);

  // Can't change roles if not admin, or if it's your own role
  const canChangeRole = currentUserRole === 'admin' && !isCurrentUser;

  const handleRoleClick = (newRole: 'admin' | 'user') => {
    if (newRole === member.role) return; // No change needed
    
    setPendingRole(newRole);
    setIsConfirmOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!pendingRole) return;

    try {
      await onRoleChange(member.id, pendingRole);
      setIsConfirmOpen(false);
      setPendingRole(null);
    } catch (error) {
      // Error handling is done by parent component
      setIsConfirmOpen(false);
      setPendingRole(null);
    }
  };

  const getRoleInfo = (role: 'admin' | 'user') => {
    return role === 'admin' 
      ? {
          label: 'Admin',
          icon: Shield,
          description: 'Full access to organization settings',
          badgeClass: 'bg-purple-100 text-purple-800'
        }
      : {
          label: 'User', 
          icon: Users,
          description: 'Can view and edit data',
          badgeClass: 'bg-gray-100 text-gray-800'
        };
  };

  const currentRoleInfo = getRoleInfo(member.role);
  const pendingRoleInfo = pendingRole ? getRoleInfo(pendingRole) : null;

  if (!canChangeRole) {
    // Show static badge for non-admins or current user
    return (
      <Badge className={`px-3 py-1 text-xs font-medium ${currentRoleInfo.badgeClass}`}>
        {currentRoleInfo.label}
        {isCurrentUser && <span className="ml-1">(You)</span>}
      </Badge>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            className="h-auto p-0 hover:bg-transparent"
          >
            <Badge className={`px-3 py-1 text-xs font-medium cursor-pointer hover:opacity-80 ${currentRoleInfo.badgeClass}`}>
              {currentRoleInfo.label}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Badge>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem 
            onClick={() => handleRoleClick('user')}
            disabled={member.role === 'user'}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2 w-full">
              <Users className="w-4 h-4 text-gray-600" />
              <div className="flex-1">
                <div className="font-medium">User</div>
                <div className="text-xs text-gray-500">Can view and edit data</div>
              </div>
              {member.role === 'user' && (
                <div className="w-2 h-2 bg-[#00A991] rounded-full" />
              )}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => handleRoleClick('admin')}
            disabled={member.role === 'admin'}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2 w-full">
              <Shield className="w-4 h-4 text-purple-600" />
              <div className="flex-1">
                <div className="font-medium">Admin</div>
                <div className="text-xs text-gray-500">Full organization access</div>
              </div>
              {member.role === 'admin' && (
                <div className="w-2 h-2 bg-[#00A991] rounded-full" />
              )}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Change User Role
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div>
                Are you sure you want to change{' '}
                <span className="font-medium">
                  {member.user.first_name} {member.user.last_name}
                </span>{' '}
                from <span className="font-medium">{currentRoleInfo.label}</span> to{' '}
                <span className="font-medium">{pendingRoleInfo?.label}</span>?
              </div>
              
              {pendingRole && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-2 text-sm">
                    {pendingRoleInfo && <pendingRoleInfo.icon className="w-4 h-4" />}
                    <span className="font-medium">{pendingRoleInfo?.label} permissions:</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {pendingRoleInfo?.description}
                  </div>
                </div>
              )}

              {pendingRole === 'admin' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="text-sm text-amber-800">
                    <strong>Warning:</strong> Admin users can invite new members, change roles, 
                    and access sensitive organization settings.
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRoleChange}
              className="bg-[#00A991] hover:bg-[#008A7A]"
            >
              Change Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}; 