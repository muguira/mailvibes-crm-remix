import React, { useState, useEffect } from 'react';
import { TopNavbar } from "@/components/layout/top-navbar";
import { EditableOpportunitiesGrid } from '@/components/grid-view/EditableOpportunitiesGrid';
import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import { OpportunitiesKanbanBoard } from '@/components/opportunities/OpportunitiesKanbanBoard';
import { useOpportunities } from '@/hooks/supabase/use-opportunities';
import { useStore } from '@/stores';
import { toast } from '@/components/ui/use-toast';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SelectContactsForOpportunitiesModal } from '@/components/grid-view/SelectContactsForOpportunitiesModal';
import { OpportunitiesPerformanceMonitor } from '@/components/opportunities/OpportunitiesPerformanceMonitor';
import '@/components/grid-view/styles/toolbar.css';
import '@/components/grid-view/styles/grid-layout.css';

/**
 * Opportunities Page Component
 * 
 * Displays the opportunities grid with all pipeline deals
 */

export default function Opportunities() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [boardSearchTerm, setBoardSearchTerm] = useState('');
  const [isContactSelectionModalOpen, setIsContactSelectionModalOpen] = useState(false);
  const [isConvertLoading, setIsConvertLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [isOpportunitiesLoading, setIsOpportunitiesLoading] = useState(true);
  
  const { updateOpportunity, bulkConvertContactsToOpportunities, getOpportunities, getOpportunitiesCount } = useOpportunities();
  const { editableOpportunitiesGridSetActiveFilters, opportunitiesActiveFilters } = useStore();

  // 🚀 SIMPLIFIED: Fetch opportunities data without complex caching
  const fetchOpportunities = async (forceRefresh = false) => {
    setIsOpportunitiesLoading(true);
    
    try {
      // 🚀 PERFORMANCE: Use paginated API with filters
      const filters = {
        searchTerm: boardSearchTerm || undefined
      };
      
      const response = await getOpportunities(filters, { 
        page: 1, 
        pageSize: 100,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      
      const opportunitiesData = response.data || [];
      setOpportunities(opportunitiesData);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      setOpportunities([]);
    } finally {
      setIsOpportunitiesLoading(false);
    }
  };

  // Load opportunities on mount
  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleViewChange = (newView: ViewMode) => {
    setViewMode(newView);
  };

  // Handle stage update from Kanban board
  const handleStageUpdate = async (opportunityId: string, newStage: string) => {
    try {
      await updateOpportunity(opportunityId, { stage: newStage });
      
      // Update local state and cache
      const updatedOpportunities = opportunities.map(opp => 
        opp.id === opportunityId ? { ...opp, stage: newStage } : opp
      );
      setOpportunities(updatedOpportunities);
      
      // Update cache
      // opportunitiesCache = {
      //   ...opportunitiesCache,
      //   data: updatedOpportunities,
      //   timestamp: Date.now()
      // };
      
      toast({
        title: "Stage updated",
        description: "The opportunity has been moved to the new stage.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update opportunity stage. Please try again.",
        variant: "destructive",
      });
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
        // Refresh opportunities data (force refresh to get new data)
        await fetchOpportunities(true);
        
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
        <div className="h-screen bg-gray-50">
          <ErrorBoundary sectionName="Opportunities View">
          {viewMode === 'list' ? (
            <EditableOpportunitiesGrid 
              viewToggle={
                <ViewToggle 
                  currentView={viewMode} 
                  onViewChange={handleViewChange}
                />
              }
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
      </div>
    </ErrorBoundary>
    </OpportunitiesPerformanceMonitor>
  );
} 