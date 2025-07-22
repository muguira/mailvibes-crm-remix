import React from 'react';
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
import { UserX, AlertTriangle, Shield } from 'lucide-react';
import { OrganizationMember } from '@/types/organization';

interface RemoveMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: OrganizationMember | null;
  onConfirm: (memberId: string) => Promise<void>;
  loading?: boolean;
}

export const RemoveMemberDialog: React.FC<RemoveMemberDialogProps> = ({
  isOpen,
  onClose,
  member,
  onConfirm,
  loading = false
}) => {
  if (!member) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm(member.id);
      onClose();
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const isAdmin = member.role === 'admin';
  const memberName = `${member.user.first_name} ${member.user.last_name}`;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <UserX className="w-5 h-5" />
            Remove Team Member
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div>
              Are you sure you want to remove{' '}
              <span className="font-medium">{memberName}</span>{' '}
              from your organization?
            </div>

            {/* Member Info */}
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00A991] text-white rounded-full flex items-center justify-center font-medium">
                  {member.user.initials}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{memberName}</div>
                  <div className="text-sm text-gray-600">{member.user.email}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {isAdmin ? (
                      <Shield className="w-3 h-3 text-purple-600" />
                    ) : (
                      <div className="w-3 h-3 bg-gray-400 rounded-full" />
                    )}
                    <span className="text-xs text-gray-500">
                      {isAdmin ? 'Admin' : 'User'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warnings */}
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <div className="font-medium">This action cannot be undone.</div>
                    <div className="mt-1">
                      {memberName} will immediately lose access to:
                    </div>
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      <li>All organization data and contacts</li>
                      <li>Shared lists and reports</li>
                      <li>Team conversations and activities</li>
                      {isAdmin && <li>Organization settings and admin features</li>}
                    </ul>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <div className="font-medium">Removing an Admin</div>
                      <div className="mt-1">
                        {memberName} currently has admin privileges. Make sure another 
                        admin can handle their responsibilities before removing them.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600">
              <strong>Alternative:</strong> You can change their role to limit access 
              instead of removing them completely.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {loading ? 'Removing...' : 'Remove Member'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}; 