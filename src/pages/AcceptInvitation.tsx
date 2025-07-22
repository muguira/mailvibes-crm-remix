import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Users, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { useAuth } from '@/components/auth'
import { useOrganizationActions } from '@/stores/organizationStore'
import { supabase } from '@/integrations/supabase/client'

interface InvitationDetails {
  id: string
  organization_name: string
  email: string
  role: 'admin' | 'user'
  status: string
  expires_at: string
  inviter_name: string
  inviter_email: string
}

export const AcceptInvitation: React.FC = () => {
  const { invitationId } = useParams<{ invitationId: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { acceptInvitation } = useOrganizationActions()

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (invitationId) {
      loadInvitationDetails()
    }
  }, [invitationId])

  const loadInvitationDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: inviteError } = await supabase
        .from('organization_invitations')
        .select(
          `
          id,
          email,
          role,
          status,
          expires_at,
          organizations:organization_id (
            name
          ),
          profiles:invited_by (
            full_name,
            email
          )
        `,
        )
        .eq('id', invitationId)
        .single()

      if (inviteError) {
        if (inviteError.code === 'PGRST116') {
          setError('Invitation not found. It may have been cancelled or already used.')
        } else {
          throw inviteError
        }
        return
      }

      if (!data) {
        setError('Invitation not found.')
        return
      }

      setInvitation({
        id: data.id,
        organization_name: data.organizations?.name || 'Unknown Organization',
        email: data.email,
        role: data.role,
        status: data.status,
        expires_at: data.expires_at,
        inviter_name: data.profiles?.full_name || 'Unknown',
        inviter_email: data.profiles?.email || 'Unknown',
      })
    } catch (err) {
      console.error('Error loading invitation:', err)
      setError('Failed to load invitation details.')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!invitation || !user) return

    // Check if email matches
    if (user.email !== invitation.email) {
      setError(
        `This invitation is for ${invitation.email}, but you're logged in as ${user.email}. Please log in with the correct email address.`,
      )
      return
    }

    // Check if already processed
    if (invitation.status !== 'pending') {
      setError('This invitation has already been processed.')
      return
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      setError('This invitation has expired.')
      return
    }

    try {
      setAccepting(true)
      setError(null)

      await acceptInvitation(invitationId!)
      setSuccess(true)

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setAccepting(false)
    }
  }

  const formatRole = (role: string) => {
    return role === 'admin' ? 'Administrator' : 'Member'
  }

  const isExpired = invitation && new Date(invitation.expires_at) < new Date()
  const isProcessed = invitation && invitation.status !== 'pending'
  const emailMismatch = user && invitation && user.email !== invitation.email

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Sign In Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600">You need to sign in to accept this organization invitation.</p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Welcome to the Team!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-gray-600">
              You've successfully joined <strong>{invitation?.organization_name}</strong>!
            </p>
            <p className="text-sm text-gray-500">Redirecting you to the dashboard...</p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Organization Invitation
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {invitation && (
            <>
              {/* Invitation Details */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900">{invitation.organization_name}</h3>
                  <p className="text-sm text-gray-600">
                    You've been invited by <strong>{invitation.inviter_name}</strong>
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{invitation.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium">{formatRole(invitation.role)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Expires:</span>
                    <span className="font-medium">{new Date(invitation.expires_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Role Description */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    As a {formatRole(invitation.role)}, you'll be able to:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    {invitation.role === 'admin' ? (
                      <>
                        <li>• Manage team members and invitations</li>
                        <li>• Access all organization settings</li>
                        <li>• View and edit all contacts and data</li>
                        <li>• Manage integrations and billing</li>
                      </>
                    ) : (
                      <>
                        <li>• View and edit contacts and data</li>
                        <li>• Collaborate with team members</li>
                        <li>• Access shared lists and reports</li>
                        <li>• Use all core CRM features</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* Error States */}
              {isExpired && (
                <Alert variant="destructive">
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    This invitation has expired. Please ask {invitation.inviter_name} to send a new invitation.
                  </AlertDescription>
                </Alert>
              )}

              {isProcessed && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>This invitation has already been {invitation.status}.</AlertDescription>
                </Alert>
              )}

              {emailMismatch && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This invitation is for {invitation.email}, but you're logged in as {user.email}. Please log in with
                    the correct email address.
                  </AlertDescription>
                </Alert>
              )}

              {error && !isExpired && !isProcessed && !emailMismatch && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {!isExpired && !isProcessed && !emailMismatch && (
                  <Button onClick={handleAcceptInvitation} disabled={accepting} className="w-full">
                    {accepting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accept Invitation
                      </>
                    )}
                  </Button>
                )}

                <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                  {emailMismatch ? 'Sign In with Correct Email' : 'Go to Dashboard'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
