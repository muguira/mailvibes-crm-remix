import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Users, 
  Crown, 
  ArrowRight, 
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Organization {
  id: string;
  name: string;
  domain: string;
  member_count: number;
  plan: string;
}

interface PendingInvitation {
  id: string;
  organization_id: string;
  role: string;
  organization_name: string;
  organization_domain: string;
  inviter_name?: string;
  inviter_email?: string;
}

interface InvitationChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrganization: Organization;
  pendingInvitation: PendingInvitation;
  userRole: string;
  onChoice: (choice: 'stay' | 'switch') => Promise<void>;
}

export const InvitationChoiceModal: React.FC<InvitationChoiceModalProps> = ({
  isOpen,
  onClose,
  currentOrganization,
  pendingInvitation,
  userRole,
  onChoice
}) => {
  const [processing, setProcessing] = useState(false);
  const [choice, setChoice] = useState<'stay' | 'switch' | null>(null);

  const handleChoice = async (selectedChoice: 'stay' | 'switch') => {
    setProcessing(true);
    setChoice(selectedChoice);

    try {
      await onChoice(selectedChoice);
      
      toast.success(
        selectedChoice === 'switch' 
          ? `Successfully joined ${pendingInvitation.organization_name}!`
          : 'Invitation declined. Staying in current organization.'
      );
      
      onClose();
    } catch (error: any) {
      console.error('Error processing choice:', error);
      toast.error('Failed to process your choice', {
        description: error.message
      });
    } finally {
      setProcessing(false);
      setChoice(null);
    }
  };

  const formatRole = (role: string) => {
    return role === 'admin' ? 'Administrator' : 'Member';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Organization Invitation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You've been invited to join another organization. Choose whether to switch to the new organization or stay with your current one.
            </AlertDescription>
          </Alert>

          {/* Current Organization */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Your Current Organization</h3>
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-blue-600" />
                    <div>
                      <div className="font-semibold text-gray-900">
                        {currentOrganization.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {currentOrganization.domain}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1">
                      {formatRole(userRole)}
                    </Badge>
                    <div className="text-xs text-gray-500">
                      {currentOrganization.member_count} members
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invitation Details */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Invitation Details</h3>
            <Card className="border-2 border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-green-600" />
                    <div>
                      <div className="font-semibold text-gray-900">
                        {pendingInvitation.organization_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {pendingInvitation.organization_domain}
                      </div>
                      {pendingInvitation.inviter_name && (
                        <div className="text-xs text-gray-500 mt-1">
                          Invited by {pendingInvitation.inviter_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="default" className="mb-1 bg-green-600">
                      {formatRole(pendingInvitation.role)}
                    </Badge>
                    <div className="text-xs text-gray-500">
                      New invitation
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warning about leaving current org */}
          {userRole === 'admin' && (
            <Alert variant="destructive">
              <Crown className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> You are an administrator of your current organization. 
                If you're the only admin, switching organizations may leave your current organization without an administrator.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stay Option */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Button
                  onClick={() => handleChoice('stay')}
                  disabled={processing}
                  variant="outline"
                  className="w-full h-auto p-4 flex flex-col items-center gap-3"
                >
                  <XCircle className="w-8 h-8 text-gray-600" />
                  <div className="text-center">
                    <div className="font-medium">Stay</div>
                    <div className="text-xs text-gray-500">
                      Decline invitation and remain in {currentOrganization.name}
                    </div>
                  </div>
                  {processing && choice === 'stay' && (
                    <div className="text-xs text-gray-500">Processing...</div>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Switch Option */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Button
                  onClick={() => handleChoice('switch')}
                  disabled={processing}
                  className="w-full h-auto p-4 flex flex-col items-center gap-3"
                >
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-6 h-6" />
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Switch</div>
                    <div className="text-xs opacity-90">
                      Leave current organization and join {pendingInvitation.organization_name}
                    </div>
                  </div>
                  {processing && choice === 'switch' && (
                    <div className="text-xs opacity-90">Processing...</div>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <div className="text-xs text-gray-500 text-center">
            This invitation will expire in 7 days. You can change organizations later through the settings page.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 