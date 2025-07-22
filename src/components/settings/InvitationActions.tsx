import React, { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreVertical, Mail, X, Clock, AlertTriangle } from 'lucide-react'
import { OrganizationInvitation } from '@/types/organization'

interface InvitationActionsProps {
  invitation: OrganizationInvitation
  onResend: (invitationId: string) => Promise<void>
  onCancel: (invitationId: string) => Promise<void>
  loading?: boolean
}

export const InvitationActions: React.FC<InvitationActionsProps> = ({
  invitation,
  onResend,
  onCancel,
  loading = false,
}) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const handleResend = async () => {
    setActionLoading(true)
    try {
      await onResend(invitation.id)
    } catch (error) {
      // Error handling by parent
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    setActionLoading(true)
    try {
      await onCancel(invitation.id)
      setShowCancelDialog(false)
    } catch (error) {
      // Error handling by parent
    } finally {
      setActionLoading(false)
    }
  }

  const isExpired = new Date(invitation.expires_at) < new Date()
  const daysUntilExpiry = Math.ceil(
    (new Date(invitation.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  )

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Quick Actions */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={loading || actionLoading}
          className="text-[#00A991] hover:text-[#008A7A] hover:bg-[#E8F5F3] px-3 py-1 h-auto text-xs"
        >
          <Mail className="w-3 h-3 mr-1" />
          {isExpired ? 'Resend' : 'Resend'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCancelDialog(true)}
          disabled={loading || actionLoading}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 h-auto text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={loading || actionLoading} className="h-auto w-auto p-2">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleResend} disabled={actionLoading}>
              <Mail className="w-4 h-4 mr-2" />
              Resend Invitation
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowCancelDialog(true)}
              disabled={actionLoading}
              className="text-red-600 focus:text-red-600"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Invitation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Cancel Invitation
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <span>
                Are you sure you want to cancel the invitation for{' '}
                <span className="font-medium">{invitation.email}</span>? This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Invitation Details - Move outside of description */}
          <div className="py-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{invitation.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium capitalize">{invitation.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Invited by:</span>
                  <span className="font-medium">
                    {invitation.inviter?.first_name} {invitation.inviter?.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{isExpired ? 'Expired:' : 'Expires:'}</span>
                  <span
                    className={`font-medium flex items-center gap-1 ${
                      isExpired ? 'text-red-600' : daysUntilExpiry <= 1 ? 'text-amber-600' : 'text-gray-900'
                    }`}
                  >
                    {isExpired && <AlertTriangle className="w-3 h-3" />}
                    {!isExpired && daysUntilExpiry <= 1 && <Clock className="w-3 h-3" />}
                    {new Date(invitation.expires_at).toLocaleDateString()}
                    {!isExpired && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({daysUntilExpiry} day{daysUntilExpiry === 1 ? '' : 's'} left)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning Messages */}
            <div className="mt-4 space-y-2">
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <div className="font-medium">This will permanently cancel the invitation</div>
                  <div>The user will no longer be able to join your organization using this invitation.</div>
                </div>
              </div>

              {isExpired && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <div className="font-medium">This invitation has already expired</div>
                    <div>Consider canceling it to clean up your pending invitations.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">
              {actionLoading ? 'Canceling...' : 'Cancel Invitation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
