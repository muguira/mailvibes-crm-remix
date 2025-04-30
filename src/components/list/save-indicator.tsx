
import { Check } from "lucide-react";

export interface SaveIndicatorProps {
  show: boolean;
}

export function SaveIndicator({ show }: SaveIndicatorProps) {
  if (!show) return null;
  
  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-teal-primary/20 rounded-full p-1">
      <Check size={16} className="text-teal-primary" />
    </div>
  );
}
