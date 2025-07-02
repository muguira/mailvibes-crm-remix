import { useContactsStore } from "@/stores/contactsStore";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Database } from "lucide-react";

export function ContactPreloaderIndicator() {
  const { user } = useAuth();
  const { isBackgroundLoading, loadedCount, totalCount } = useContactsStore();
  
  // Don't show if not logged in or not loading
  if (!user || !isBackgroundLoading || totalCount === 0) {
    return null;
  }
  
  const percentage = Math.round((loadedCount / totalCount) * 100);
  
  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 max-w-xs">
      <div className="flex items-center gap-3">
        <Database className="h-4 w-4 text-teal-primary animate-pulse" />
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-700">Preloading contacts...</p>
          <div className="mt-1 flex items-center gap-2">
            <Progress value={percentage} className="h-1.5 flex-1" />
            <span className="text-xs text-gray-500">{percentage}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {loadedCount.toLocaleString()} of {totalCount.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
} 