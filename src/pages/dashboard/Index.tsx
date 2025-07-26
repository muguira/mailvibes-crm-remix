import { useAuth } from '@/components/auth'
import { AddTeammatesCard } from '@/components/home/add-teammates-card'
import { OptimizedActivityFeedDashboard } from '@/components/home/optimized-activity-feed-dashboard'
import { TasksPanel } from '@/components/home/tasks-panel'
import { WelcomeHeader } from '@/components/home/welcome-header'
import { TopNavbar } from '@/components/layout/top-navbar'
import { CreateOrganizationModal } from '@/components/organization/CreateOrganizationModal'
import { useOrganizationActions, useOrganizationData } from '@/stores/organizationStore'
import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'

const Index = () => {
  const { user, loading } = useAuth()
  const { needsOrganization, organization } = useOrganizationData()
  const { checkUserOrganization } = useOrganizationActions()

  // Check for password recovery redirect from Supabase
  useEffect(() => {
    const handlePasswordRecovery = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const hash = window.location.hash

      // Check if this is a password recovery redirect from Supabase
      if (urlParams.get('type') === 'recovery' || hash.includes('type=recovery')) {
        console.log('🔄 Password recovery detected, redirecting to reset page...')
        // Redirect to reset page with all URL parameters
        window.location.href = '/auth/reset-password' + window.location.search + window.location.hash
      }
    }

    handlePasswordRecovery()
  }, [])

  // Initialize organization data when user is authenticated
  useEffect(() => {
    if (user) {
      checkUserOrganization()
    }
  }, [user, checkUserOrganization])

  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Redirect to auth page if not logged in
  if (!user) {
    return <Navigate to="/auth/login" replace />
  }

  return (
    <div className="flex h-screen bg-slate-light/20">
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavbar />

        {/* Welcome Header Section - Not sticky */}
        <div className="overflow-auto flex-1">
          <WelcomeHeader />

          {/* Content Section - Positioned very close to My Week bar */}
          <div className="md:px-6 px-2 -mt-14">
            <div className="flex justify-between">
              {/* Left Column - Tasks - Fixed width */}
              <div className="w-full md:w-[570px] flex-shrink-0">
                <TasksPanel />
              </div>

              {/* Right Column - Teammates Card + Enhanced Activity Feed - Fixed 400px width */}
              <div className="hidden md:block w-[400px] space-y-4">
                {/* Add Teammates Card */}
                <AddTeammatesCard />

                {/* Enhanced Activity Feed Dashboard with Team Support */}
                <OptimizedActivityFeedDashboard
                  organizationId={organization?.id}
                  defaultView="personal"
                  showStats={true}
                  showFilters={true}
                  enableRealtime={true}
                />
              </div>
            </div>

            {/* Mobile view - Show teammates card and enhanced feed below tasks */}
            <div className="md:hidden mt-6 space-y-4">
              <AddTeammatesCard />
              <OptimizedActivityFeedDashboard
                organizationId={organization?.id}
                defaultView="personal"
                showStats={true}
                showFilters={true}
                enableRealtime={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={needsOrganization}
        onClose={() => {}} // Don't allow closing until organization is created
      />
    </div>
  )
}

export default Index
