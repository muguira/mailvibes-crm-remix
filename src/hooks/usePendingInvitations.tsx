import { useAuth } from '@/components/auth'
import { supabase } from '@/integrations/supabase/client'
import { useOrganizationActions, useOrganizationData } from '@/stores/organizationStore'
import { useCallback, useEffect, useState } from 'react'

interface PendingInvitation {
  id: string
  organization_id: string
  role: string
  organization_name: string
  organization_domain: string
  inviter_name?: string
  inviter_email?: string
  expires_at: string
}

interface Organization {
  id: string
  name: string
  domain: string
  member_count: number
  plan: string
}
export const usePendingInvitations = () => {
  const { user } = useAuth()
  const { currentOrganization } = useOrganizationData()
  const { loadOrganization: refreshOrganization } = useOrganizationActions()

  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [userRole, setUserRole] = useState<string>('member')
  const [loading, setLoading] = useState(false)

  // Check for pending invitations
  const checkPendingInvitations = useCallback(async () => {
    if (!user?.email) return

    try {
      setLoading(true)

      const { data: invitations, error } = await supabase.rpc('get_pending_invitations_for_email', {
        p_email: user.email,
      })

      if (error) throw error

      // Filter out invitations to organizations the user is already a member of
      const filteredInvitations = []

      if (Array.isArray(invitations)) {
        for (const invitation of invitations as PendingInvitation[]) {
          // Check if user is already a member of this organization
          const { data: existingMember } = await supabase
            .from('organization_members')
            .select('id')
            .eq('user_id', user.id)
            .eq('organization_id', invitation.organization_id)
            .single()

          // Only include invitations to organizations the user is NOT already a member of
          if (!existingMember) {
            filteredInvitations.push(invitation)
          }
        }
      }

      setPendingInvitations(filteredInvitations)
    } catch (error) {
      console.error('Error checking pending invitations:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.email])

  // Get user's current role in their organization
  const getUserRole = useCallback(async () => {
    if (!user?.id || !currentOrganization?.id) return

    try {
      const { data: member } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrganization.id)
        .single()

      if (member) {
        setUserRole(member.role)
      }
    } catch (error) {
      console.error('Error getting user role:', error)
    }
  }, [user?.id, currentOrganization?.id])

  // Handle user's choice to stay or switch organizations
  const handleInvitationChoice = useCallback(
    async (invitationId: string, choice: 'stay' | 'switch'): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated')

      try {
        if (choice === 'stay') {
          // Decline the invitation
          const { error } = await supabase
            .from('organization_invitations')
            .update({
              status: 'declined',
              updated_at: new Date().toISOString(),
            })
            .eq('id', invitationId)

          if (error) throw error

          // Remove from local state
          setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))
        } else {
          // Switch to the new organization
          const invitation = pendingInvitations.find(inv => inv.id === invitationId)
          if (!invitation) throw new Error('Invitation not found')

          // First, remove user from current organization (if they have one)
          if (currentOrganization?.id) {
            const { error: removeError } = await supabase
              .from('organization_members')
              .delete()
              .eq('user_id', user.id)
              .eq('organization_id', currentOrganization.id)

            if (removeError) throw removeError

            // Update old organization member count
            const { error: updateOldOrgError } = await supabase
              .from('organizations')
              .update({
                member_count: Math.max(0, (currentOrganization.member_count || 1) - 1),
                updated_at: new Date().toISOString(),
              })
              .eq('id', currentOrganization.id)

            if (updateOldOrgError) throw updateOldOrgError
          }

          // Accept the invitation using the existing RPC function
          const { data: result, error: acceptError } = await supabase.rpc('auto_accept_invitation', {
            p_invitation_id: invitationId,
            p_user_id: user.id,
          })

          if (acceptError) throw acceptError

          const acceptResult = result?.[0]
          if (!acceptResult?.success) {
            throw new Error(acceptResult?.message || 'Failed to accept invitation')
          }

          // Remove from local state
          setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))

          // Reload organization data to reflect the change
          await refreshOrganization()
        }
      } catch (error) {
        console.error('Error handling invitation choice:', error)
        throw error
      }
    },
    [user?.id, pendingInvitations, currentOrganization, refreshOrganization],
  )

  // Load data when user or organization changes - only on organization ID change
  useEffect(() => {
    if (user?.email && currentOrganization) {
      checkPendingInvitations()
      getUserRole()
    }
  }, [user?.email, currentOrganization?.id, checkPendingInvitations, getUserRole])

  // Check for new invitations every 30 seconds - but only if user exists
  useEffect(() => {
    if (!user?.email) return

    const interval = setInterval(() => {
      checkPendingInvitations()
    }, 300000) // 5 minutes (300,000ms) instead of 30 seconds

    return () => clearInterval(interval)
  }, [user?.email, checkPendingInvitations])

  return {
    pendingInvitations,
    userRole,
    currentOrganization,
    loading,
    handleInvitationChoice,
    refreshInvitations: checkPendingInvitations,
  }
}
