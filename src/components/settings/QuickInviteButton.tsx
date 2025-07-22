import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface QuickInviteButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const QuickInviteButton: React.FC<QuickInviteButtonProps> = ({ 
  onClick, 
  loading = false, 
  disabled = false 
}) => {
  return (
    <Button 
      onClick={onClick}
      className="flex items-center gap-2 bg-[#00A991] hover:bg-[#008A7A]"
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
          Sending...
        </>
      ) : (
        <>
          <Plus size={16} />
          Invite Users
        </>
      )}
    </Button>
  );
}; 