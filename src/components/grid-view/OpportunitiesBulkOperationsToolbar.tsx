import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  Trash2, 
  Target, 
  User, 
  AlertTriangle, 
  MoreHorizontal,
  Tag,
  Flag
} from 'lucide-react';
import { useStore } from '@/stores';
import { toast } from '@/components/ui/use-toast';

interface OpportunitiesBulkOperationsToolbarProps {
  selectedRowIds: Set<string>;
  onClearSelection: () => void;
  onDeleteOpportunities?: (opportunityIds: string[]) => Promise<void>;
}

export function OpportunitiesBulkOperationsToolbar({
  selectedRowIds,
  onClearSelection,
  onDeleteOpportunities
}: OpportunitiesBulkOperationsToolbarProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    editableOpportunitiesGridBulkUpdateStatus,
    editableOpportunitiesGridBulkUpdatePriority,
    editableOpportunitiesGridBulkUpdateOwner,
    opportunitiesIsContactDeletionLoading
  } = useStore();

  // Status options for bulk update
  const statusOptions = [
    'Lead/New', 'Qualified', 'Discovery', 'Proposal', 
    'Negotiation', 'Closing', 'Won', 'Lost'
  ];

  // Priority options for bulk update
  const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];

  // Handle bulk status update
  const handleBulkStatusUpdate = async (newStatus: string) => {
    setIsLoading(true);
    try {
      const result = await editableOpportunitiesGridBulkUpdateStatus(
        Array.from(selectedRowIds), 
        newStatus
      );
      
      if (result.success) {
        toast({
          title: "Status updated",
          description: `Updated status for ${result.affectedRows} opportunities to "${newStatus}".`,
        });
        onClearSelection();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle bulk priority update
  const handleBulkPriorityUpdate = async (newPriority: string) => {
    setIsLoading(true);
    try {
      const result = await editableOpportunitiesGridBulkUpdatePriority(
        Array.from(selectedRowIds), 
        newPriority
      );
      
      if (result.success) {
        toast({
          title: "Priority updated",
          description: `Updated priority for ${result.affectedRows} opportunities to "${newPriority}".`,
        });
        onClearSelection();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: "Error",
        description: "Failed to update priority. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (onDeleteOpportunities) {
      try {
        await onDeleteOpportunities(Array.from(selectedRowIds));
        onClearSelection();
      } catch (error) {
        console.error('Error deleting opportunities:', error);
      }
    }
  };

  if (selectedRowIds.size === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-200">
      <span className="text-sm font-medium text-blue-900">
        {selectedRowIds.size} opportunit{selectedRowIds.size === 1 ? 'y' : 'ies'} selected
      </span>
      
      {/* Bulk Status Update */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isLoading}>
            <Tag className="mr-1 h-3 w-3" />
            Update Status
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {statusOptions.map((status) => (
            <DropdownMenuItem 
              key={status}
              onClick={() => handleBulkStatusUpdate(status)}
            >
              {status}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Bulk Priority Update */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isLoading}>
            <Flag className="mr-1 h-3 w-3" />
            Update Priority
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {priorityOptions.map((priority) => (
            <DropdownMenuItem 
              key={priority}
              onClick={() => handleBulkPriorityUpdate(priority)}
            >
              {priority}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* More Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isLoading}>
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onClearSelection()}>
            Clear Selection
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleBulkDelete}
            className="text-red-600 hover:text-red-700"
            disabled={opportunitiesIsContactDeletionLoading}
          >
            <Trash2 className="mr-2 h-3 w-3" />
            Delete Selected
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 