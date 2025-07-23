import React, { useState, useEffect } from 'react';
import { InvitationChoiceModal } from './InvitationChoiceModal';
import { usePendingInvitations } from '@/hooks/usePendingInvitations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Building2, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

export const PendingInvitationsHandler: React.FC = () => {
  const {
    pendingInvitations,
    userRole,
    currentOrganization,
    loading,
    handleInvitationChoice,
    refreshInvitations
  } = usePendingInvitations();

  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dismissedInvitations, setDismissedInvitations] = useState<Set<string>>(new Set());

  // Show notification for new invitations
  useEffect(() => {
    if (pendingInvitations.length > 0 && !loading) {
      const newInvitations = pendingInvitations.filter(
        inv => !dismissedInvitations.has(inv.id)
      );

      if (newInvitations.length > 0) {
        toast.info(
          `You have ${newInvitations.length} pending organization invitation${newInvitations.length > 1 ? 's' : ''}`,
          {
            description: 'Click to review and choose your organization',
            duration: 5000,
            action: {
              label: 'Review',
              onClick: () => {
                if (newInvitations.length === 1) {
                  handleInvitationClick(newInvitations[0]);
                }
              }
            }
          }
        );
      }
    }
  }, [pendingInvitations.length, loading]);

  const handleInvitationClick = (invitation: any) => {
    setSelectedInvitation(invitation);
    setIsModalOpen(true);
  };

  const handleChoice = async (choice: 'stay' | 'switch') => {
    if (!selectedInvitation) return;

    try {
      await handleInvitationChoice(selectedInvitation.id, choice);
      setIsModalOpen(false);
      setSelectedInvitation(null);
      
      // Mark as dismissed
      setDismissedInvitations(prev => new Set([...prev, selectedInvitation.id]));
      
    } catch (error: any) {
      throw error; // Let the modal handle the error display
    }
  };

  const handleDismiss = (invitationId: string) => {
    setDismissedInvitations(prev => new Set([...prev, invitationId]));
  };

  // Filter out dismissed invitations
  const visibleInvitations = pendingInvitations.filter(
    inv => !dismissedInvitations.has(inv.id)
  );

  // Don't render anything if no visible invitations or no current organization
  if (visibleInvitations.length === 0 || !currentOrganization) {
    return null;
  }

  return (
    <>
      {/* Floating notification for pending invitations */}
      <div className="fixed top-20 right-4 z-50 max-w-sm">
        <div className="space-y-2">
          {visibleInvitations.map((invitation) => (
            <Card key={invitation.id} className="shadow-lg border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <Bell className="w-4 h-4 text-amber-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        Organization Invitation
                      </Badge>
                      <Clock className="w-3 h-3 text-gray-400" />
                    </div>
                    
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      Join {invitation.organization_name}
                    </h4>
                    
                    <p className="text-xs text-gray-600 mb-2">
                      You've been invited as {invitation.role === 'admin' ? 'Administrator' : 'Member'}
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleInvitationClick(invitation)}
                        size="sm"
                        className="text-xs h-7"
                      >
                        Choose
                      </Button>
                      
                      <Button
                        onClick={() => handleDismiss(invitation.id)}
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-gray-500"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Choice Modal */}
      {selectedInvitation && (
        <InvitationChoiceModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedInvitation(null);
          }}
          currentOrganization={currentOrganization}
          pendingInvitation={selectedInvitation}
          userRole={userRole}
          onChoice={handleChoice}
        />
      )}
    </>
  );
}; 