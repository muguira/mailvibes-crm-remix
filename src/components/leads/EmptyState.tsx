import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onAddClick?: () => void;
}

export default function EmptyState({
  title = 'No leads available',
  description = 'Get started by creating your first lead',
  onAddClick
}: EmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-500"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        
        {onAddClick && (
          <Button onClick={onAddClick} className="gap-1.5">
            <Plus size={16} />
            Add Lead
          </Button>
        )}
      </div>
    </div>
  );
} 