import { DeletedContactsView } from '@/components/deleted-contacts/DeletedContactsView'
import { TopNavbar } from '@/components/layout/top-navbar'
import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary'

export default function DeletedContactsPage() {
  return (
    <ErrorBoundary sectionName="Deleted Contacts Page">
      <div className="flex flex-col h-screen bg-gray-50">
        <TopNavbar />
        <div className="flex-1 overflow-auto mt-12">
          <DeletedContactsView />
        </div>
      </div>
    </ErrorBoundary>
  )
}
