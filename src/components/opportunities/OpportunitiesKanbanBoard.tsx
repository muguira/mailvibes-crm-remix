import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PIPELINE_STAGES } from '@/types/opportunities';

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
  searchTerm?: string;
  isLoading?: boolean;
}

const OpportunitiesKanbanBoard = React.memo(function OpportunitiesKanbanBoard({
  opportunities = [],
  onStageUpdate,
  searchTerm,
  isLoading = false,
}: OpportunitiesKanbanBoardProps) {
  const [localOpportunities, setLocalOpportunities] = useState<Opportunity[]>(() => opportunities || []);

  // Update local opportunities when props change
  useEffect(() => {
    if (opportunities) {
      setLocalOpportunities(opportunities);
    }
  }, [opportunities]);

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

  const filteredOpportunities = searchTerm
    ? localOpportunities.filter(opp => 
        opp.opportunity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.company?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : localOpportunities;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Priority color mapping
  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // If dropped in the same position, do nothing
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const opportunityId = draggableId;
    const newStage = destination.droppableId;

    // Find the opportunity being moved
    const opportunity = localOpportunities.find(opp => opp.id === opportunityId);
    if (!opportunity) return;

    // Optimistically update local state
    setLocalOpportunities(prev => 
      prev.map(opp => 
        opp.id === opportunityId 
          ? { ...opp, stage: newStage }
          : opp
      )
    );

    // Update in database
    try {
      await onStageUpdate(opportunityId, newStage);
    } catch (error) {
      console.error('Failed to update opportunity stage:', error);
      // Revert on error
      setLocalOpportunities(prev => 
        prev.map(opp => 
          opp.id === opportunityId 
            ? { ...opp, stage: opportunity.stage }
            : opp
        )
      );
    }
  };

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
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="h-full overflow-x-auto overflow-y-hidden bg-white">
        <div className="flex h-full min-w-max gap-4 p-4">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.value} className="flex flex-col w-80 bg-gray-50 rounded-lg shadow-sm">
              {/* Column Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{stage.label}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">({stageTotals[stage.value].count})</span>
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(stageTotals[stage.value].revenue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Droppable Column */}
              <Droppable droppableId={stage.value}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 p-3 min-h-96 transition-all duration-200",
                      snapshot.isDraggingOver 
                        ? "bg-gradient-to-br from-blue-50 to-indigo-50 ring-2 ring-blue-300" 
                        : "bg-white"
                    )}
                  >
                    <div className="space-y-3">
                      {opportunitiesByStage[stage.value]
                        .filter(opp => filteredOpportunities.some(fo => fo.id === opp.id))
                        .map((opportunity, index) => (
                          <Draggable 
                            key={opportunity.id} 
                            draggableId={opportunity.id} 
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "transition-all duration-200",
                                  snapshot.isDragging && "rotate-2 scale-105 shadow-lg"
                                )}
                              >
                                <Card className={cn(
                                  "w-full bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200",
                                  "cursor-grab active:cursor-grabbing",
                                  snapshot.isDragging && "shadow-xl",
                                  !snapshot.isDragging && "hover:shadow-md"
                                )}>
                                  <CardContent className="p-3">
                                    {/* Opportunity Name and Priority */}
                                    <div className="flex items-start justify-between mb-2">
                                      <Link 
                                        to={`/stream-view/${opportunity.originalContactId}`}
                                        className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate flex-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {opportunity.opportunity}
                                      </Link>
                                      {opportunity.priority && (
                                        <Badge 
                                          variant="secondary"
                                          className={cn(
                                            "ml-2 text-xs",
                                            getPriorityColor(opportunity.priority)
                                          )}
                                        >
                                          {opportunity.priority}
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Company */}
                                    {opportunity.company && (
                                      <p className="text-xs text-gray-500 mb-2 truncate">{opportunity.company}</p>
                                    )}

                                    {/* Revenue */}
                                    <div className="text-sm font-semibold text-gray-900 mb-2">
                                      {formatCurrency(opportunity.revenue)}
                                    </div>

                                    {/* Close Date and Owner */}
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                      <span>
                                        {opportunity.closeDate ? format(new Date(opportunity.closeDate), 'MMM dd, yyyy') : 'No date'}
                                      </span>
                                      {opportunity.owner && (
                                        <span className="truncate ml-2">
                                          {opportunity.owner}
                                        </span>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>

                    {/* Empty state */}
                    {opportunitiesByStage[stage.value].length === 0 && (
                      <div className={cn(
                        "text-center py-12 transition-all duration-200",
                        snapshot.isDraggingOver ? "text-blue-500 scale-105" : "text-gray-400"
                      )}>
                        <div className={cn(
                          "mx-auto w-16 h-16 rounded-full border-2 border-dashed mb-4 flex items-center justify-center transition-all duration-200",
                          snapshot.isDraggingOver ? "border-blue-300 bg-blue-50" : "border-gray-300"
                        )}>
                          <span className="text-2xl">📋</span>
                        </div>
                        <p className={cn(
                          "text-sm font-medium transition-all duration-200",
                          snapshot.isDraggingOver ? "text-blue-600" : "text-gray-500"
                        )}>
                          {snapshot.isDraggingOver ? "Drop here" : "Drop opportunities here"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </div>
    </DragDropContext>
  );
});

export { OpportunitiesKanbanBoard }; 