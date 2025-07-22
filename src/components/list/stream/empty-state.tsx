import { CustomButton } from '@/components/ui/custom-button'

interface EmptyStateProps {
  isLoading: boolean
  onCreateContact: () => void
}

export function EmptyState({ isLoading, onCreateContact }: EmptyStateProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-medium">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <h3 className="text-lg font-semibold">No Contact Selected</h3>
      <p className="text-sm text-slate-medium mt-2">Select a contact from the list or create a new one</p>
      <CustomButton onClick={onCreateContact} className="mt-4 bg-teal-primary hover:bg-teal-primary/90 text-white">
        Create Contact
      </CustomButton>
    </div>
  )
}
