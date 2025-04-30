
import { Check } from "lucide-react";

interface SaveIndicatorProps {
  show: boolean;
}

export function SaveIndicator({ show }: SaveIndicatorProps) {
  if (!show) return null;
  
  return (
    <div className="save-indicator">
      <Check size={16} />
    </div>
  );
}
