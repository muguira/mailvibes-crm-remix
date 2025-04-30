
import { CustomButton } from "@/components/ui/custom-button";

interface EmptyStateProps {
  isLoading: boolean;
  onCreateContact: () => void;
}

export function EmptyState({ isLoading, onCreateContact }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center text-slate-medium">
        {isLoading ? (
          <p>Loading contacts...</p>
        ) : (
          <>
            <p>Select a contact or create a new one</p>
            <CustomButton 
              variant="link"
              className="mt-2"
              onClick={onCreateContact}
            >
              Create your first contact
            </CustomButton>
          </>
        )}
      </div>
    </div>
  );
}
