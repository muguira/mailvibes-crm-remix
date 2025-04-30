
import { Plus } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";

interface ContactSidebarHeaderProps {
  listName: string;
  onCreateContact: () => void;
}

export function ContactSidebarHeader({ listName, onCreateContact }: ContactSidebarHeaderProps) {
  return (
    <div className="p-3 border-b border-slate-light/30 flex items-center justify-between">
      <h3 className="font-medium">{listName}</h3>
      <CustomButton 
        variant="outline" 
        size="sm"
        className="flex items-center gap-1"
        onClick={onCreateContact}
      >
        <Plus size={14} />
        <span>New</span>
      </CustomButton>
    </div>
  );
}
