import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  Active,
  Over
} from '@dnd-kit/core';
// Temporarily removed sortable imports due to React hooks error
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, DollarSign, Building, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PIPELINE_STAGES } from '@/types/opportunities';
import { OpportunityColumn } from './OpportunityColumn';
import { OpportunityCard } from './OpportunityCard';

// Types
interface Opportunity {
  id: string;
  opportunity: string;
  originalContactId: string;
  stage: string;
  revenue: number;
  closeDate: string;
  company?: string;
  owner?: string;
  priority?: string;
}

interface OpportunitiesKanbanBoardProps {
  opportunities: Opportunity[];
  onStageUpdate: (opportunityId: string, newStage: string) => Promise<void>;
  isLoading?: boolean;
  searchTerm?: string;
}

const OpportunitiesKanbanBoard = React.memo(function OpportunitiesKanbanBoard({
  opportunities = [],
  onStageUpdate,
  isLoading,
  searchTerm = ''
}: OpportunitiesKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [localOpportunities, setLocalOpportunities] = useState<Opportunity[]>(() => opportunities || []);

  // Update local opportunities when props change
  useEffect(() => {
    if (opportunities) {
      setLocalOpportunities(opportunities);
    }
  }, [opportunities]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Group opportunities by stage
  const opportunitiesByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    const stageOpportunities = (localOpportunities || []).filter(opp => opp.stage === stage.value);
    acc[stage.value] = stageOpportunities;
    return acc;
  }, {} as Record<string, Opportunity[]>);

  // Calculate totals for each stage
  const stageTotals = PIPELINE_STAGES.reduce((acc, stage) => {
    const stageOpps = opportunitiesByStage[stage.value];
    acc[stage.value] = {
      count: stageOpps.length,
      revenue: stageOpps.reduce((sum, opp) => sum + (opp.revenue || 0), 0)
    };
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    setOverId(over?.id as string || null);

    if (!over || active.id === over.id) return;

    const activeOpp = localOpportunities.find(o => o.id === active.id);
    if (!activeOpp) return;

    // If dragging over a column (stage)
    if (PIPELINE_STAGES.some(s => s.value === over.id)) {
      const newStage = over.id as string;
      if (activeOpp.stage !== newStage) {
        setLocalOpportunities(prev => 
          prev.map(opp => 
            opp.id === activeOpp.id 
              ? { ...opp, stage: newStage }
              : opp
          )
        );
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const activeOpp = opportunities.find(o => o.id === active.id);
    if (!activeOpp) return;

    let newStage = activeOpp.stage;

    // Check if dropped on a stage column
    if (PIPELINE_STAGES.some(s => s.value === over.id)) {
      newStage = over.id as string;
    } else {
      // Dropped on another card - find its stage
      const overOpp = opportunities.find(o => o.id === over.id);
      if (overOpp) {
        newStage = overOpp.stage;
      }
    }

    // Update stage if changed
    if (newStage !== activeOpp.stage) {
      try {
        await onStageUpdate(activeOpp.id, newStage);
      } catch (error) {
        // Revert on error
        setLocalOpportunities(opportunities);
        console.error('Failed to update opportunity stage:', error);
      }
    }
  };

  const activeOpportunity = localOpportunities.find(o => o.id === activeId);

  // Apply search filter
  const filteredOpportunities = searchTerm
    ? localOpportunities.filter(opp => 
        opp.opportunity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.company?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : localOpportunities;

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-teal mx-auto mb-4"></div>
          <p className="text-gray-500">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full overflow-x-auto overflow-y-hidden bg-white">
        <div className="flex h-full min-w-max">
          {PIPELINE_STAGES.map((stage, index) => (
            <OpportunityColumn
              key={stage.value}
              stage={stage}
              opportunities={opportunitiesByStage[stage.value].filter(opp =>
                filteredOpportunities.some(fo => fo.id === opp.id)
              )}
              total={stageTotals[stage.value]}
              isOver={overId === stage.value}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeId && activeOpportunity ? (
          <OpportunityCard 
            opportunity={activeOpportunity} 
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});

export { OpportunitiesKanbanBoard }; 