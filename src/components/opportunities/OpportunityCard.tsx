import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface OpportunityCardProps {
  opportunity: {
    id: string;
    opportunity: string;
    originalContactId: string;
    stage: string;
    revenue: number;
    closeDate: string;
    company?: string;
    owner?: string;
    priority?: string;
  };
  isDragging?: boolean;
}

export function OpportunityCard({ opportunity, isDragging }: OpportunityCardProps) {
  // Temporarily disabled sortable functionality
  const attributes = {};
  const listeners = {};
  const setNodeRef = null;
  const isSortableDragging = false;
  
  const style = {};

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab",
        (isSortableDragging || isDragging) && "opacity-50"
      )}
    >
      <Card className={cn(
        "bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200",
        (isSortableDragging || isDragging) && "shadow-lg cursor-grabbing rotate-2"
      )}>
        <CardContent className="p-3">
          {/* Header with contact name */}
          <div className="mb-2">
            <Link
              to={`/leads/${opportunity.originalContactId}`}
              className="font-medium text-sm text-gray-900 hover:text-[#32BAB0] truncate block leading-tight"
              onClick={(e) => e.stopPropagation()}
            >
              {opportunity.opportunity}
            </Link>
          </div>

          {/* Company */}
          {opportunity.company && (
            <div className="text-xs text-gray-500 mb-2 truncate">
              {opportunity.company}
            </div>
          )}

          {/* Revenue */}
          <div className="text-base font-semibold text-gray-900 mb-2">
            {formatCurrency(opportunity.revenue)}
          </div>

          {/* Close Date */}
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span>Close date:</span>
            <span>{opportunity.closeDate ? format(new Date(opportunity.closeDate), 'dd/MM/yyyy') : 'No date'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 