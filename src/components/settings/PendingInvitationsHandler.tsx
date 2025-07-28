import React, { useState, useEffect, useCallback } from 'react';
import { InvitationChoiceModal } from './InvitationChoiceModal';
import { usePendingInvitations } from '@/hooks/usePendingInvitations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Building2, Clock, X, Users, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const PendingInvitationsHandler: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
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
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [dismissedInvitations, setDismissedInvitations] = useState<Set<string>>(new Set());
  const [hasShownInitialPrompt, setHasShownInitialPrompt] = useState(false);

  // Show prominent welcome modal for new invitations on login
  const showInvitationWelcome = useCallback(() => {
    if (pendingInvitations.length > 0 && !loading && !authLoading && !hasShownInitialPrompt) {
      const newInvitations = pendingInvitations.filter(
        inv => !dismissedInvitations.has(inv.id)
      );

      if (newInvitations.length > 0) {
        setShowWelcomeModal(true);
        setHasShownInitialPrompt(true);
      }
    }
  }, [pendingInvitations, loading, authLoading, hasShownInitialPrompt, dismissedInvitations]);

  // Only show modal once when invitations are loaded and user is authenticated
  useEffect(() => {
    if (user && !authLoading && !loading) {
      showInvitationWelcome();
    }
  }, [user, authLoading, loading, showInvitationWelcome]);

  const handleInvitationClick = useCallback((invitation: any) => {
    setSelectedInvitation(invitation);
    setIsModalOpen(true);
  }, []);

  const handleChoice = useCallback(async (choice: 'stay' | 'switch') => {
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
  }, [selectedInvitation, handleInvitationChoice]);

  const handleDismiss = useCallback((invitationId: string) => {
    setDismissedInvitations(prev => new Set([...prev, invitationId]));
  }, []);

  // Early return if still loading authentication or no user
  if (authLoading || !user) {
    return null;
  }

  // Filter out dismissed invitations
  const visibleInvitations = pendingInvitations.filter(
    inv => !dismissedInvitations.has(inv.id)
  );

  // Don't render anything if no visible invitations
  if (visibleInvitations.length === 0) {
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
      {selectedInvitation && currentOrganization && (
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

      {/* Welcome Modal for New Invitations */}
      <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#00A991]/10 rounded-lg">
                <Mail className="w-5 h-5 text-[#00A991]" />
              </div>
              <div>
                <DialogTitle className="text-left">You've Been Invited!</DialogTitle>
                <DialogDescription className="text-left">
                  You have {pendingInvitations.filter(inv => !dismissedInvitations.has(inv.id)).length} pending organization invitation{pendingInvitations.filter(inv => !dismissedInvitations.has(inv.id)).length > 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <Building2 className="w-4 h-4" />
                Pending Invitations
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {pendingInvitations
                  .filter(inv => !dismissedInvitations.has(inv.id))
                  .map((invitation, index) => (
                    <div key={invitation.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{invitation.organization?.name || 'Organization'}</div>
                        <div className="text-xs text-gray-500">Role: {invitation.role}</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Pending
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (pendingInvitations.length === 1) {
                    setSelectedInvitation(pendingInvitations[0]);
                    setIsModalOpen(true);
                  }
                  setShowWelcomeModal(false);
                }}
                className="flex-1 bg-[#00A991] hover:bg-[#00A991]/90"
              >
                <Users className="w-4 h-4 mr-2" />
                Review Invitations
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowWelcomeModal(false)}
                className="flex-1"
              >
                Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}; 