import { useAuth } from '@/components/auth'
import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary'
import { EditableOpportunitiesGrid } from '@/components/grid-view/EditableOpportunitiesGrid'
import { SelectContactsForOpportunitiesModal } from '@/components/grid-view/SelectContactsForOpportunitiesModal'
import '@/components/grid-view/styles/grid-layout.css'
import '@/components/grid-view/styles/toolbar.css'
import { TopNavbar } from '@/components/layout/top-navbar'
import { OpportunitiesKanbanBoard } from '@/components/opportunities/OpportunitiesKanbanBoard'
import { OpportunitiesPerformanceMonitor } from '@/components/opportunities/OpportunitiesPerformanceMonitor'
import { OpportunitiesStoreTest } from '@/components/test/OpportunitiesStoreTest'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { ViewMode, ViewToggle } from '@/components/ui/view-toggle'
import { useOpportunities } from '@/hooks/supabase/use-opportunities'
import { useStore } from '@/stores'
import { useOrganizationStore } from '@/stores/organizationStore'
import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Opportunities Page Component
 *
 * Displays the opportunities grid with all pipeline deals
 */

export default function Opportunities() {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [boardSearchTerm, setBoardSearchTerm] = useState('')
  const [isContactSelectionModalOpen, setIsContactSelectionModalOpen] = useState(false)
  const [isConvertLoading, setIsConvertLoading] = useState(false)

  // 🚀 NEW: Use direct opportunities hook for organization-based data
  const [opportunitiesFromHook, setOpportunitiesFromHook] = useState<any[]>([])
  const [hookLoading, setHookLoading] = useState(true)
  const [hookInitialized, setHookInitialized] = useState(false)

  const { updateOpportunity, bulkConvertContactsToOpportunities, getOpportunities } = useOpportunities()

  // 🚀 NEW: Use store infrastructure instead of manual state
  const {
    editableOpportunitiesGridSetActiveFilters,
    opportunitiesActiveFilters,
    opportunitiesCache,
    opportunitiesOrderedIds,
    opportunitiesLoading,
    opportunitiesPagination,
    opportunitiesInitialize,
    opportunitiesUpdateOpportunity,
    opportunitiesErrors,
    opportunitiesClear,
  } = useStore()

  const { currentOrganization } = useOrganizationStore()

  // 🚀 NEW: Load opportunities directly using the updated hook
  useEffect(() => {
    const loadOpportunitiesDirectly = async () => {
      if (!user?.id || !currentOrganization?.id) {
        setHookLoading(false)
        setHookInitialized(true)
        return
      }

      try {
        setHookLoading(true)
        console.log('🔄 Loading opportunities directly with organization:', currentOrganization.id)

        const result = await getOpportunities({}, { page: 1, pageSize: 100 })
        setOpportunitiesFromHook(result.data || [])
        console.log('✅ Loaded opportunities directly:', result.data?.length || 0)
      } catch (error) {
        console.error('❌ Error loading opportunities directly:', error)
        setOpportunitiesFromHook([])
      } finally {
        setHookLoading(false)
        setHookInitialized(true)
      }
    }

    loadOpportunitiesDirectly()
  }, [user?.id, currentOrganization?.id, getOpportunities])

  // Get opportunities from store (as fallback)
  const opportunitiesFromStore = useMemo(() => {
    return opportunitiesOrderedIds.map(id => opportunitiesCache[id]).filter(Boolean)
  }, [opportunitiesOrderedIds, opportunitiesCache])

  // 🚀 IMPROVED: Better loading and data logic to prevent flickering
  const hasHookData = hookInitialized && opportunitiesFromHook.length > 0
  const hasStoreData = opportunitiesPagination.isInitialized && opportunitiesFromStore.length > 0

  // Use hook data if available and initialized, otherwise fall back to store data
  const opportunities = hasHookData ? opportunitiesFromHook : opportunitiesFromStore

  // Show loading only if we're actually loading and don't have any data yet
  const isOpportunitiesLoading =
    (hookLoading && !hasHookData && !hasStoreData) ||
    (opportunitiesLoading.initializing && !hasHookData && !hasStoreData)

  // 🚀 FIXED: Use useRef to prevent multiple initializations and stable callback
  const initializationAttempted = useRef(false)
  const stableOpportunitiesInitialize = useCallback(
    (userId: string) => {
      if (initializationAttempted.current) {
        console.log('🛡️ Initialization already attempted, skipping...')
        return
      }
      initializationAttempted.current = true
      console.log('🔥 CALLING opportunitiesInitialize with user:', userId)
      return opportunitiesInitialize(userId).finally(() => {
        // Reset flag after completion (success or error) to allow retry if needed
        setTimeout(() => {
          initializationAttempted.current = false
        }, 1000) // 1 second cooldown
      })
    },
    [opportunitiesInitialize],
  )

  // Initialize store when user is available
  useEffect(() => {
    const hasRealData = opportunities.length > 0
    console.log('🚀 Opportunities page - User effect:', {
      userId: user?.id,
      isInitialized: opportunitiesPagination.isInitialized,
      isLoading: isOpportunitiesLoading,
      opportunitiesCount: opportunities.length,
      hasRealData,
      initializationAttempted: initializationAttempted.current,
      loadingStates: {
        initializing: opportunitiesLoading.initializing,
        fetching: opportunitiesLoading.fetching,
        backgroundLoading: opportunitiesLoading.backgroundLoading,
      },
    })

    // Only initialize if we have a user, haven't attempted initialization recently, and need data
    if (
      user?.id &&
      !initializationAttempted.current &&
      !opportunitiesPagination.isInitialized &&
      !isOpportunitiesLoading
    ) {
      console.log('🔥 Starting initialization for user:', user.id)
      stableOpportunitiesInitialize(user.id)
    }
  }, [user?.id, opportunitiesPagination.isInitialized, isOpportunitiesLoading, stableOpportunitiesInitialize])

  // 🚀 SIMPLIFIED FALLBACK: Only retry if we have clear initialization failure
  useEffect(() => {
    // Only retry if we're marked as initialized but have no data and no loading state
    // This handles edge cases where initialization completes but data wasn't loaded properly
    if (
      user?.id &&
      opportunitiesPagination.isInitialized &&
      opportunities.length === 0 &&
      !isOpportunitiesLoading &&
      !initializationAttempted.current
    ) {
      console.log('🔄 Fallback: Retrying initialization due to no data despite initialized flag')
      stableOpportunitiesInitialize(user.id)
    }
  }, [
    user?.id,
    opportunitiesPagination.isInitialized,
    opportunities.length,
    isOpportunitiesLoading,
    stableOpportunitiesInitialize,
  ])

  const handleViewChange = (newView: ViewMode) => {
    setViewMode(newView)
  }

  // Handle stage update from Kanban board
  const handleStageUpdate = async (opportunityId: string, newStage: string) => {
    try {
      // 🚀 OPTIMISTIC UPDATE: Update store immediately for instant UI feedback
      const currentOpportunity = opportunitiesCache[opportunityId]
      if (currentOpportunity) {
        const oldStage = currentOpportunity.stage

        console.log(
          `🚀 Kanban: Optimistically updating opportunity ${opportunityId} stage from "${oldStage}" to "${newStage}"`,
        )

        // Update store immediately (optimistic update)
        opportunitiesUpdateOpportunity(opportunityId, {
          stage: newStage,
          status: newStage, // Keep stage and status in sync
        })

        try {
          // 🚀 BACKGROUND: Update database (with error recovery)
          await updateOpportunity(opportunityId, { stage: newStage })
          console.log(`✅ Successfully updated opportunity ${opportunityId} stage in database`)

          toast({
            title: 'Stage updated',
            description: 'The opportunity has been moved to the new stage.',
          })
        } catch (dbError) {
          // 🚀 ERROR RECOVERY: Revert optimistic update if database fails
          console.error(`❌ Database update failed for opportunity ${opportunityId}:`, dbError)
          opportunitiesUpdateOpportunity(opportunityId, {
            stage: oldStage,
            status: oldStage,
          })

          toast({
            title: 'Error',
            description: 'Failed to update opportunity stage. Please try again.',
            variant: 'destructive',
          })
          throw dbError // Re-throw to trigger revert in Kanban board
        }
      } else {
        console.warn(`Opportunity ${opportunityId} not found in cache for stage update`)
        throw new Error('Opportunity not found')
      }
    } catch (error) {
      if (!error.message?.includes('not found')) {
        // Only show toast for non-"not found" errors since we already handle that above
        toast({
          title: 'Error',
          description: 'Failed to update opportunity stage. Please try again.',
          variant: 'destructive',
        })
      }
      throw error // Re-throw to trigger revert in Kanban board
    }
  }

  // Handle convert from contact selection modal (for board view)
  const handleConvertFromContactSelection = async (
    contacts: Array<{ id: string; name: string; email?: string; company?: string; phone?: string }>,
    conversionData: {
      accountName: string
      dealValue: number
      closeDate?: Date
      stage: string
      priority: string
      contacts: Array<{
        id: string
        name: string
        email?: string
        company?: string
        role: string
      }>
    },
  ) => {
    setIsConvertLoading(true)
    try {
      // Use the actual contact data passed from the modal
      const contactsForConversion = contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        email: contact.email || '',
        company: contact.company || '',
        source: 'Contact Selection',
      }))

      const result = await bulkConvertContactsToOpportunities(contactsForConversion, conversionData)

      if (result.success) {
        console.log('✅ Successfully created opportunity:', conversionData.accountName)
        // 🚀 NEW: Store will be updated automatically by the conversion process

        toast({
          title: 'Opportunity created',
          description: `Successfully created opportunity "${conversionData.accountName}".`,
        })

        setIsContactSelectionModalOpen(false)
      }
    } catch (error) {
      console.error('Error creating opportunity:', error)
      toast({
        title: 'Error',
        description: 'Failed to create opportunity. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsConvertLoading(false)
    }
  }

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
            {/* Error State - Only show if we have a real error and not loading */}
            {opportunitiesErrors.initialize && !isOpportunitiesLoading && hookInitialized && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <div className="text-red-600 text-lg font-semibold mb-2">Failed to load opportunities</div>
                  <div className="text-gray-600 mb-4">{opportunitiesErrors.initialize}</div>
                  <Button
                    onClick={() => user?.id && opportunitiesInitialize(user.id)}
                    className="bg-[#32BAB0] hover:bg-[#28a79d] text-white"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Normal Content - Only show when not loading */}
            {!opportunitiesErrors.initialize && !isOpportunitiesLoading && (
              <>
                {viewMode === 'list' ? (
                  <EditableOpportunitiesGrid
                    viewToggle={<ViewToggle currentView={viewMode} onViewChange={handleViewChange} />}
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
                            <ViewToggle currentView={viewMode} onViewChange={handleViewChange} />
                          </div>
                          {process.env.NODE_ENV === 'development' && (
                            <div className="ml-4 text-xs bg-gray-100 px-2 py-1 rounded flex items-center gap-2">
                              <span>
                                Cache: {Object.keys(opportunitiesCache).length} | Total: {opportunities.length} |
                                {isOpportunitiesLoading ? ' 🔄 Initializing...' : ' ✅ Ready'} |
                                {opportunitiesLoading.fetching ? ' 📥 Fetching' : ''} |
                                {opportunitiesLoading.backgroundLoading ? ' ⚡ Background' : ''}
                              </span>
                              <button
                                onClick={() => {
                                  console.log('📊 Current Store State:', {
                                    opportunitiesCache: Object.keys(opportunitiesCache).length,
                                    opportunitiesOrderedIds: opportunitiesOrderedIds.length,
                                    opportunities: opportunities.length,
                                    isInitialized: opportunitiesPagination.isInitialized,
                                    isLoading: isOpportunitiesLoading,
                                    userId: user?.id,
                                    sampleOpportunity: opportunities[0] || 'none',
                                    cacheKeys: Object.keys(opportunitiesCache).slice(0, 3),
                                  })
                                }}
                                className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                              >
                                Log State
                              </button>
                            </div>
                          )}
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
                          {process.env.NODE_ENV === 'development' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                console.log('🔄 Clearing opportunities store and forcing reload...')
                                console.log('Current state:', {
                                  cache: Object.keys(opportunitiesCache).length,
                                  ordered: opportunitiesOrderedIds.length,
                                  loading: opportunitiesLoading,
                                  pagination: opportunitiesPagination,
                                })
                                opportunitiesClear()
                                setTimeout(() => {
                                  if (user?.id) {
                                    console.log('🚀 Re-initializing opportunities...')
                                    opportunitiesInitialize(user.id)
                                  }
                                }, 100)
                              }}
                              variant="outline"
                              className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                            >
                              🔄 Debug Reload
                            </Button>
                          )}
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
              </>
            )}
          </ErrorBoundary>

          {/* Contact Selection Modal for Board View */}
          <SelectContactsForOpportunitiesModal
            isOpen={isContactSelectionModalOpen}
            onClose={() => setIsContactSelectionModalOpen(false)}
            onConvert={handleConvertFromContactSelection}
            isLoading={isConvertLoading}
          />

          {/* Debug Tools - Hide with CSS during loading to prevent flickering */}
          {process.env.NODE_ENV === 'development' && (
            <div className={`mt-8 border-t pt-8 space-y-4 ${isOpportunitiesLoading ? 'hidden' : ''}`}>
              <div className="flex gap-4 items-center">
                <h3 className="text-lg font-semibold">🧪 Development Tools</h3>
                <button
                  onClick={() => {
                    console.log('🔄 Clearing opportunities store and forcing reload...')
                    opportunitiesClear()
                    setTimeout(() => {
                      if (user?.id) {
                        console.log('🚀 Re-initializing opportunities...')
                        opportunitiesInitialize(user.id)
                      }
                    }, 100)
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  🔄 Reset & Reload Opportunities
                </button>
                <div className="text-sm text-gray-600">
                  Cache: {Object.keys(opportunitiesCache).length} | Ordered: {opportunitiesOrderedIds.length} |
                  Initialized: {opportunitiesPagination.isInitialized ? '✅' : '❌'}
                </div>
              </div>
              <OpportunitiesStoreTest />
            </div>
          )}
        </div>
      </ErrorBoundary>
    </OpportunitiesPerformanceMonitor>
  )
}
