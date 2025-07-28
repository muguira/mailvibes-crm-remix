import React, { useState, useEffect, useMemo } from 'react';
import { TopNavbar } from "@/components/layout/top-navbar";
import { EditableOpportunitiesGrid } from '@/components/grid-view/EditableOpportunitiesGrid';
import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import { OpportunitiesKanbanBoard } from '@/components/opportunities/OpportunitiesKanbanBoard';
import { useOpportunities } from '@/hooks/supabase/use-opportunities';
import { useStore } from '@/stores';
import { useAuth } from '@/components/auth';
import { toast } from '@/components/ui/use-toast';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SelectContactsForOpportunitiesModal } from '@/components/grid-view/SelectContactsForOpportunitiesModal';
import { OpportunitiesPerformanceMonitor } from '@/components/opportunities/OpportunitiesPerformanceMonitor';
import { OpportunitiesStoreTest } from '@/components/test/OpportunitiesStoreTest';
import '@/components/grid-view/styles/toolbar.css';
import '@/components/grid-view/styles/grid-layout.css';

/**
 * Opportunities Page Component
 * 
 * Displays the opportunities grid with all pipeline deals
 */

export default function Opportunities() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [boardSearchTerm, setBoardSearchTerm] = useState('');
  const [isContactSelectionModalOpen, setIsContactSelectionModalOpen] = useState(false);
  const [isConvertLoading, setIsConvertLoading] = useState(false);
  
  const { updateOpportunity, bulkConvertContactsToOpportunities, getOpportunities } = useOpportunities();
  
  // 🚀 NEW: Use store infrastructure instead of manual state
  const { 
    editableOpportunitiesGridSetActiveFilters, 
    opportunitiesActiveFilters,
    opportunitiesCache,
    opportunitiesOrderedIds,
    opportunitiesLoading,
    opportunitiesPagination,
    opportunitiesUpdateOpportunity,
    opportunitiesInitialize,
  } = useStore();

  // Get opportunities from store
  const opportunities = useMemo(() => {
    return opportunitiesOrderedIds.map(id => opportunitiesCache[id]).filter(Boolean);
  }, [opportunitiesOrderedIds, opportunitiesCache]);

  // Simple loading state - only show loading during actual initialization
  const isOpportunitiesLoading = opportunitiesLoading.initializing;

  // 🚀 REMOVED: Manual initialization - now handled automatically by useInstantOpportunities hook
  // This matches how the contacts page works (no manual initialization)

  const handleViewChange = (newView: ViewMode) => {
    setViewMode(newView);
  };

  // Handle stage update from Kanban board
  const handleStageUpdate = async (opportunityId: string, newStage: string) => {
    try {
      // 🚀 Check if this is a temp ID
      if (opportunityId.startsWith('temp-')) {
        console.warn(`⚠️ Attempting to update temp opportunity ${opportunityId} - refreshing data first`);
        
        // Force refresh opportunities to get real IDs
        await opportunitiesInitialize(user?.id || '');
        
        toast({
          title: "Please try again",
          description: "The opportunity is still syncing. Please try moving it again.",
          variant: "destructive",
        });
        return;
      }

      // 🚀 OPTIMISTIC UPDATE: Update store immediately for instant UI feedback
      const currentOpportunity = opportunitiesCache[opportunityId];
      if (currentOpportunity) {
        const oldStage = currentOpportunity.stage;
        
        console.log(`🚀 Kanban: Optimistically updating opportunity ${opportunityId} stage from "${oldStage}" to "${newStage}"`);
        
        // Update store immediately (optimistic update)
        opportunitiesUpdateOpportunity(opportunityId, { 
          stage: newStage, 
          status: newStage // Keep stage and status in sync
        });
        
        try {
          // 🚀 BACKGROUND: Update database (with error recovery)
          await updateOpportunity(opportunityId, { status: newStage });
          console.log(`✅ Successfully updated opportunity ${opportunityId} stage in database`);
          
          toast({
            title: "Stage updated",
            description: "The opportunity has been moved to the new stage.",
          });
        } catch (dbError) {
          // 🚀 ERROR RECOVERY: Revert optimistic update if database fails
          console.error(`❌ Database update failed for opportunity ${opportunityId}:`, dbError);
          opportunitiesUpdateOpportunity(opportunityId, { 
            stage: oldStage, 
            status: oldStage 
          });
          
          toast({
            title: "Error",
            description: "Failed to update opportunity stage. Please try again.",
            variant: "destructive",
          });
          throw dbError; // Re-throw to trigger revert in Kanban board
        }
      } else {
        console.warn(`Opportunity ${opportunityId} not found in cache for stage update`);
        throw new Error('Opportunity not found');
      }
    } catch (error) {
      if (!error.message?.includes('not found')) {
        // Only show toast for non-"not found" errors since we already handle that above
        toast({
          title: "Error",
          description: "Failed to update opportunity stage. Please try again.",
          variant: "destructive",
        });
      }
      throw error; // Re-throw to trigger revert in Kanban board
    }
  };

  // Handle convert from contact selection modal (for board view)
  const handleConvertFromContactSelection = async (
    contacts: Array<{ id: string; name: string; email?: string; company?: string; phone?: string; }>, 
    conversionData: {
      accountName: string;
      dealValue: number;
      closeDate?: Date;
      stage: string;
      priority: string;
      contacts: Array<{
        id: string;
        name: string;
        email?: string;
        company?: string;
        role: string;
      }>;
    }
  ) => {
    setIsConvertLoading(true);
    try {
      // Use the actual contact data passed from the modal
      const contactsForConversion = contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        email: contact.email || '',
        company: contact.company || '',
        source: 'Contact Selection'
      }));

      const result = await bulkConvertContactsToOpportunities(contactsForConversion, conversionData);
      
      if (result.success) {
        console.log('✅ Successfully created opportunity:', conversionData.accountName);
        // 🚀 NEW: Store will be updated automatically by the conversion process
        
        toast({
          title: "Opportunity created",
          description: `Successfully created opportunity "${conversionData.accountName}".`,
        });
        
        setIsContactSelectionModalOpen(false);
      }
    } catch (error) {
      console.error("Error creating opportunity:", error);
      toast({
        title: "Error",
        description: "Failed to create opportunity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConvertLoading(false);
    }
  };

  return (
    <OpportunitiesPerformanceMonitor 
      opportunities={opportunities}
      isLoading={isOpportunitiesLoading}
      viewMode={viewMode}
    >
      <ErrorBoundary sectionName="Opportunities Page">
        <TopNavbar />
        <div className="h-screen bg-gray-50 overflow-hidden">
          <ErrorBoundary sectionName="Opportunities View">
          {viewMode === 'list' ? (
            <EditableOpportunitiesGrid 
              viewToggle={
                <ViewToggle 
                  currentView={viewMode} 
                  onViewChange={handleViewChange}
                />
              }
              externalOpportunities={opportunities}
              externalLoading={isOpportunitiesLoading}
            />
          ) : (
            <div className="grid-view h-full">
              {/* Board View Header - Match Grid Toolbar exactly */}
              <div className="grid-toolbar bg-white border-b border-gray-200">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <SearchInput 
                      value={boardSearchTerm}
                      onChange={setBoardSearchTerm}
                      placeholder="Search opportunities..."
                      className="w-full max-w-xs"
                    />
                    <div className="ml-4">
                      <ViewToggle 
                        currentView={viewMode} 
                        onViewChange={handleViewChange}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={() => setIsContactSelectionModalOpen(true)}
                      className="bg-[#32BAB0] hover:bg-[#28a79d] text-white"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Opportunities
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Kanban Board */}
              <div className="flex-1 overflow-hidden bg-gray-50">
                <OpportunitiesKanbanBoard
                  opportunities={opportunities}
                  onStageUpdate={handleStageUpdate}
                  isLoading={isOpportunitiesLoading}
                  searchTerm={boardSearchTerm}
                />
              </div>
            </div>
          )}
        </ErrorBoundary>

        {/* Contact Selection Modal for Board View */}
        <SelectContactsForOpportunitiesModal
          isOpen={isContactSelectionModalOpen}
          onClose={() => setIsContactSelectionModalOpen(false)}
          onConvert={handleConvertFromContactSelection}
          isLoading={isConvertLoading}
        />

        {/* Test Component - Remove after testing */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 border-t pt-8">
            <h3 className="text-lg font-semibold mb-4">🧪 Development: Store Test Suite</h3>
            <OpportunitiesStoreTest />
          </div>
        )}
      </div>
    </ErrorBoundary>
    </OpportunitiesPerformanceMonitor>
  );
} 