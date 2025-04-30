
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-slate-medium">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction} 
          className="mt-4 bg-teal-primary hover:bg-teal-primary/90 text-white"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
