import { TopNavbar } from '@/components/layout/top-navbar'
import { EditableLeadsGrid } from '@/components/grid-view/EditableLeadsGrid'
import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary'

export default function Leads() {
  return (
    <ErrorBoundary sectionName="Leads Page">
      <div className="flex flex-col h-screen bg-gray-50">
        <TopNavbar />
        <div className="flex-1 overflow-hidden">
          <ErrorBoundary sectionName="Grid View">
            <EditableLeadsGrid />
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  )
}
