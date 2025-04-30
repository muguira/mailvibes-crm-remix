
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/custom-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChangeRecord } from "@/hooks/supabase";
import { format } from "date-fns";

interface HistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  changes: ChangeRecord[];
}

export function HistoryDialog({ isOpen, onClose, changes }: HistoryDialogProps) {
  // Format a date string for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Change History</DialogTitle>
        </DialogHeader>
        <div className="py-4 overflow-y-auto">
          {changes.length === 0 ? (
            <p className="text-center text-slate-500">No changes have been recorded yet</p>
          ) : (
            <div className="space-y-4">
              {changes.map((change: ChangeRecord) => (
                <div key={change.id} className="border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>{getInitials(change.user_name || '')}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{change.user_name || 'Unknown User'}</span>
                    <span className="text-xs text-slate-500">
                      {formatDate(change.changed_at)}
                    </span>
                  </div>
                  <div className="ml-8 mt-1">
                    <p className="text-sm">
                      Changed <span className="font-semibold">{change.column_key}</span> from{' '}
                      <span className="bg-red-50 px-1 rounded">{JSON.stringify(change.old_value)}</span> to{' '}
                      <span className="bg-green-50 px-1 rounded">{JSON.stringify(change.new_value)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <CustomButton onClick={onClose}>
            Close
          </CustomButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
