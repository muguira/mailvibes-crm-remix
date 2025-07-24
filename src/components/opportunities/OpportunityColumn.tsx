import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { OpportunityCard } from './OpportunityCard';

interface OpportunityColumnProps {
  stage: {
    value: string;
    label: string;
    color: string;
  };
  opportunities: Array<{
    id: string;
    name: string;
    contactId: string;
    stage: string;
    revenue: number;
    closeDate: string;
    company?: string;
    owner?: string;
    priority?: string;
  }>;
  total: {
    count: number;
    revenue: number;
  };
  isOver?: boolean;
}

export function OpportunityColumn({
  stage,
  opportunities,
  total,
  isOver
}: OpportunityColumnProps) {
  const { setNodeRef } = useDroppable({
    id: stage.value,
  });

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Determine if this stage should have colored numbers (only Won/Lost)
  const isWonStage = stage.value === 'Won';
  const isLostStage = stage.value === 'Lost';
  
  // Color logic: green for won, red for lost, neutral for others
  const getAmountColor = () => {
    if (isWonStage) return 'text-green-600';
    if (isLostStage) return 'text-red-600';
    return 'text-gray-900';
  };

  const getCountColor = () => {
    if (isWonStage) return 'text-green-600 bg-green-50';
    if (isLostStage) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="flex flex-col h-full min-w-[280px]">
      {/* Slim Header - Like Grid Column Headers */}
      <div className="px-4 py-2 min-h-[40px] flex items-center justify-between border-r border-gray-200" style={{ backgroundColor: '#edf3f8' }}>
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-700 text-sm">{stage.label}</h3>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            getCountColor()
          )}>
            ({total.count})
          </span>
        </div>
        <div className={cn(
          "text-sm font-semibold",
          getAmountColor()
        )}>
          {formatCurrency(total.revenue)}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 bg-white border-r border-gray-200 p-3 overflow-y-auto transition-colors",
          isOver && "bg-blue-50 ring-2 ring-blue-200 ring-opacity-50"
        )}
      >
        <div className="space-y-3">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
            />
          ))}
        </div>

        {/* Empty state */}
        {opportunities.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">Drop opportunities here</p>
          </div>
        )}
      </div>
    </div>
  );
} 