import { useEffect } from 'react'
import { TopNavbar } from '@/components/layout/top-navbar'
import { TasksPanel } from '@/components/home/tasks-panel'
import { FeedPanel } from '@/components/home/feed-panel'
import { WelcomeHeader } from '@/components/home/welcome-header'
import { AddTeammatesCard } from '@/components/home/add-teammates-card'
import { CreateOrganizationModal } from '@/components/organization/CreateOrganizationModal'
import { useAuth } from '@/components/auth'
import { useOrganizationActions, useOrganizationData } from '@/stores/organizationStore'
import { Navigate } from 'react-router-dom'

const Index = () => {
  const { user, loading } = useAuth()
  const { needsOrganization } = useOrganizationData()
  const { checkUserOrganization } = useOrganizationActions()

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
    return <Navigate to="/auth" replace />
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

              {/* Right Column - Teammates Card + Feed - Fixed 400px width */}
              <div className="hidden md:block w-[400px] space-y-4">
                {/* Add Teammates Card */}
                <AddTeammatesCard />

                {/* Activity Feed Panel */}
                <FeedPanel />
              </div>
            </div>

            {/* Mobile view - Show teammates card and feed below tasks */}
            <div className="md:hidden mt-6 space-y-4">
              <AddTeammatesCard />
              <FeedPanel />
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
