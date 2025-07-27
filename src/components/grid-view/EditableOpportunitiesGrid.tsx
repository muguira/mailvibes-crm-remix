import { useAuth } from '@/components/auth'
import { DeleteColumnDialog } from '@/components/grid-view/DeleteColumnDialog'
import { GridSkeleton } from '@/components/grid-view/GridSkeleton'
import { OpportunitiesGridViewContainer } from '@/components/grid-view/OpportunitiesGridViewContainer'
import { toast } from '@/components/ui/use-toast'
import { useOpportunities } from '@/hooks/supabase/use-opportunities'
import { useOpportunitiesRows } from '@/hooks/supabase/use-opportunities-rows'
import { useDebounce } from '@/hooks/use-debounce'
import { useInstantOpportunities } from '@/hooks/use-instant-opportunities'
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor'
import { useStore } from '@/stores'
import { logger } from '@/utils/logger'
import React, { useCallback, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { GridPagination } from './GridPagination'
// Import useActivity conditionally
let useActivity: any
try {
  useActivity = require('@/contexts/ActivityContext').useActivity
} catch (error) {
  useActivity = () => ({
    logCellEdit: () => {},
    logColumnAdd: () => {},
    logColumnDelete: () => {},
    logFilterChange: () => {},
  })
}

export interface EditableOpportunitiesGridProps {
  viewToggle?: React.ReactNode
  externalOpportunities?: any[]
  externalLoading?: boolean
  onExternalDataUpdate?: (updatedOpportunities: any[]) => void // 🚀 NEW: Callback to update external data
}

/**
 * EditableOpportunitiesGrid Component
 *
 * A comprehensive grid component for managing opportunities with advanced features.
 * Based on EditableLeadsGrid but adapted for opportunities table.
 *
 * @component
 */
export function EditableOpportunitiesGrid({
  viewToggle,
  externalOpportunities,
  externalLoading,
  onExternalDataUpdate, // 🚀 NEW: Extract callback
}: EditableOpportunitiesGridProps = {}) {
  const { user } = useAuth()

  // Activity logging (with defensive import)
  const { logCellEdit, logColumnAdd, logColumnDelete, logFilterChange } = useActivity()

  // Performance monitoring
  const { logSummary, renderCount } = usePerformanceMonitor('EditableOpportunitiesGrid')

  // Destructure Zustand slice state and actions for opportunities
  const {
    opportunitiesSearchTerm,
    opportunitiesActiveFilters,
    opportunitiesCurrentPage,
    opportunitiesPageSize,
    opportunitiesColumns,
    opportunitiesHiddenColumns,
    opportunitiesForceRenderKey,
    opportunitiesDeletedColumnIds,
    opportunitiesDeleteColumnDialog,
    opportunitiesIsContactDeletionLoading,
    editableOpportunitiesGridSetCurrentPage,
    editableOpportunitiesGridSetPageSize,
    editableOpportunitiesGridForceRerender,
    editableOpportunitiesGridSetIsLoading,
    editableOpportunitiesGridAddDynamicColumns,
    editableOpportunitiesGridPersistColumns,
    editableOpportunitiesGridSetColumns,
    editableOpportunitiesGridDeleteColumn,
    editableOpportunitiesGridConfirmDeleteColumn,
    editableOpportunitiesGridAddColumn,
    editableOpportunitiesGridInsertColumn,
    editableOpportunitiesGridHideColumn,
    editableOpportunitiesGridUnhideColumn,
    editableOpportunitiesGridHandleCellEdit,
    editableOpportunitiesGridDeleteOpportunities,
    editableOpportunitiesGridGetColumnFilters,
    editableOpportunitiesGridSetSearchTerm,
    // 🚀 NEW: Advanced store infrastructure
    opportunitiesCache,
    opportunitiesOrderedIds,
    opportunitiesLoading,
    opportunitiesPagination,
    opportunitiesErrors,
    opportunitiesAddOpportunity,
    opportunitiesRemoveOpportunities,
    opportunitiesEnsureMinimumLoaded,
  } = useStore()

  // 🚀 NEW: Advanced hooks with real-time updates and performance optimization
  const { deleteOpportunity, bulkConvertContactsToOpportunities } = useOpportunities()

  // 🚀 OPTIMIZED: Memoize column filters to prevent unnecessary re-calculations
  const memoizedColumnFilters = useMemo(() => {
    return editableOpportunitiesGridGetColumnFilters()
  }, [opportunitiesActiveFilters.columns, opportunitiesActiveFilters.values, opportunitiesColumns])

  // 🚀 PRIORITIZE EXTERNAL DATA: Only use store if we explicitly don't have external data
  const hasExternalData = externalOpportunities && externalOpportunities.length > 0

  // 🚀 NEW: Instant opportunities with advanced filtering and search (only if no external data)
  const storeOpportunities = useInstantOpportunities({
    searchTerm: hasExternalData ? '' : opportunitiesSearchTerm, // Don't search store if using external data
    pageSize: opportunitiesPageSize,
    currentPage: opportunitiesCurrentPage,
    columnFilters: hasExternalData ? [] : memoizedColumnFilters, // Don't filter store if using external data
  })

  // 🚀 FIXED: External data always takes priority, with proper logging
  const instantOpportunities = useMemo(() => {
    if (hasExternalData) {
      // Only log when switching to external data (not every render)
      if (externalOpportunities.length > 0) {
        // This will only log when external data first appears
      }

      // Filter external data based on search term if needed
      const filteredData = opportunitiesSearchTerm
        ? externalOpportunities.filter(
            opp =>
              opp.opportunity?.toLowerCase().includes(opportunitiesSearchTerm.toLowerCase()) ||
              opp.company?.toLowerCase().includes(opportunitiesSearchTerm.toLowerCase()) ||
              opp.companyName?.toLowerCase().includes(opportunitiesSearchTerm.toLowerCase()) ||
              opp.status?.toLowerCase().includes(opportunitiesSearchTerm.toLowerCase()),
          )
        : externalOpportunities

      return {
        rows: filteredData,
        loading: externalLoading || false,
        totalCount: filteredData.length,
        isBackgroundLoading: false,
        loadedCount: filteredData.length,
      }
    }

    // Only log when using store data (not every render)
    return storeOpportunities
  }, [hasExternalData, externalOpportunities, externalLoading, opportunitiesSearchTerm, storeOpportunities.rows.length])

  // 🚀 NEW: Opportunities rows management with chunked loading
  const opportunitiesRows = useOpportunitiesRows()

  // 🚀 TEMP DISABLE: Remove debug logging that's causing infinite renders
  // useEffect(() => {
  //   console.log('📊 [GRID] Data source changed:', {
  //     hasExternalData,
  //     externalCount: externalOpportunities?.length || 0,
  //     storeCount: storeOpportunities.rows.length,
  //     finalCount: instantOpportunities.rows.length,
  //     isUsingExternal: hasExternalData,
  //     timestamp: new Date().toISOString(),
  //   })
  // }, [hasExternalData, externalOpportunities?.length, storeOpportunities.rows.length, instantOpportunities.rows.length])

  // Debounced search term for performance
  const debouncedSearchTerm = useDebounce(opportunitiesSearchTerm, 200)

  // 🚀 REMOVED: Manual state management - now using store infrastructure
  // const [opportunities, setOpportunities] = useState<any[]>([]);
  // const [loading, setLoading] = useState(true);
  // const [totalCount, setTotalCount] = useState(0);
  // const [retryCount, setRetryCount] = useState(0);

  // 🚀 REMOVED: Initialization now handled centrally in Opportunities.tsx to prevent race conditions
  // Previously this component also initialized the store, causing duplicate API calls
  // Now we rely on the parent page to handle initialization properly

  // 🚀 NEW: Ensure minimum data is loaded for current page size
  useEffect(() => {
    if (opportunitiesPagination.isInitialized && opportunitiesPageSize > opportunitiesPagination.loadedCount) {
      const minimumRequired = opportunitiesCurrentPage * opportunitiesPageSize
      if (minimumRequired > opportunitiesPagination.loadedCount) {
        logger.log(`Ensuring minimum ${minimumRequired} opportunities are loaded`)
        opportunitiesEnsureMinimumLoaded(minimumRequired)
      }
    }
  }, [
    opportunitiesPageSize,
    opportunitiesCurrentPage,
    opportunitiesPagination.loadedCount,
    opportunitiesPagination.isInitialized,
    opportunitiesEnsureMinimumLoaded,
  ])

  // 🚀 NEW: Performance monitoring
  useEffect(() => {
    if (renderCount > 0 && renderCount % 10 === 0) {
      logSummary()
    }
  }, [renderCount, logSummary])

  // 🚀 NEW: Reset to first page when search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== opportunitiesSearchTerm) {
      // Search term changed, reset to first page for better UX
      if (opportunitiesCurrentPage !== 1) {
        editableOpportunitiesGridSetCurrentPage(1)
      }
    }
  }, [debouncedSearchTerm, opportunitiesSearchTerm, opportunitiesCurrentPage, editableOpportunitiesGridSetCurrentPage])

  // Render function for opportunity name column with navigation link to contact stream view
  const renderOpportunityLink = useCallback(
    (value: any, row: any) => (
      <Link
        to={`/stream-view/${row.originalContactId || row.id}`}
        className="text-[#32BAB0] hover:text-[#28a79d] hover:underline font-medium"
      >
        {value}
      </Link>
    ),
    [],
  )

  // Add render function to opportunity column
  useEffect(() => {
    const opportunityColumn = opportunitiesColumns.find(col => col.id === 'opportunity')
    if (opportunityColumn && !opportunityColumn.renderCell) {
      const updatedColumns = opportunitiesColumns.map(col =>
        col.id === 'opportunity' ? { ...col, renderCell: renderOpportunityLink } : col,
      )

      // Update the store state immediately (this was missing!)
      editableOpportunitiesGridSetColumns(updatedColumns)

      // Also persist to localStorage for future sessions
      editableOpportunitiesGridPersistColumns(updatedColumns, user)
    }
  }, [
    opportunitiesColumns,
    renderOpportunityLink,
    editableOpportunitiesGridPersistColumns,
    editableOpportunitiesGridSetColumns,
    user,
  ])

  // 🚀 NEW: Add dynamic columns when new fields are detected in opportunity data
  useEffect(() => {
    if (instantOpportunities.rows.length > 0) {
      editableOpportunitiesGridAddDynamicColumns(instantOpportunities.rows)
    }
  }, [instantOpportunities.rows, editableOpportunitiesGridAddDynamicColumns])

  // 🚀 NEW: Handle cell value changes with optimistic updates
  const handleCellChange = useCallback(
    async (rowId: string, columnId: string, value: any) => {
      // Check if this is a readonly column
      const column = opportunitiesColumns.find(col => col.id === columnId)
      if (column && column.editable === false) {
        console.warn(`Cannot edit readonly column: ${columnId}`)
        return // Exit early for readonly columns
      }

      console.log('🔥 [CELL EDIT] handleCellChange TRIGGERED:', {
        rowId,
        columnId,
        value,
        timestamp: new Date().toISOString(),
        currentOpportunity: instantOpportunities.rows.find(r => r.id === rowId),
      })

      try {
        // First update the opportunities store for immediate UI feedback
        const opportunity = instantOpportunities.rows.find(r => r.id === rowId)
        const oldValue = opportunity ? opportunity[columnId] : null

        console.log('Opportunity found for handleCellChange:', {
          rowId,
          opportunityFound: !!opportunity,
          opportunityName: opportunity?.opportunity,
          oldValue,
          newValue: value,
          columnId,
        })

        if (!opportunity) {
          throw new Error(`Opportunity with ID ${rowId} not found`)
        }

        // 🚀 OPTIMISTIC UPDATE: Update store immediately for instant UI feedback
        console.log('🔄 [OPTIMISTIC] About to update store for rowId:', rowId, 'with:', { [columnId]: value })
        const { opportunitiesUpdateOpportunity } = useStore.getState()
        opportunitiesUpdateOpportunity(rowId, { [columnId]: value })
        console.log('✅ [OPTIMISTIC] Store updated successfully')

        // 🚀 NEW: Also update external opportunities if they exist and callback is provided
        if (hasExternalData && onExternalDataUpdate && externalOpportunities) {
          console.log('🔄 [EXTERNAL] Updating external opportunities data...')
          const updatedExternalOpportunities = externalOpportunities.map(opp =>
            opp.id === rowId ? { ...opp, [columnId]: value } : opp,
          )
          onExternalDataUpdate(updatedExternalOpportunities)
          console.log('✅ [EXTERNAL] External opportunities updated successfully')
        }

        // 🚀 PERSISTENCE: Save to database in background
        try {
          // Log cell update for debugging
          console.log('🔍 [DEBUG] Updating cell:', {
            rowId,
            columnId,
            value,
            opportunityName: opportunity.opportunity,
          })

          // Use the opportunities rows hook which handles proper database persistence
          await opportunitiesRows.updateCell({ rowId, columnId, value })

          console.log('✅ Successfully persisted opportunity cell change to database:', {
            rowId,
            columnId,
            value,
            opportunityName: opportunity.opportunity,
          })

          // 🚀 FORCE CACHE REFRESH: Ensure the updated data is immediately visible
          console.log('🔄 Forcing cache refresh to show updated data...')
          if (opportunitiesRows?.refreshData) {
            setTimeout(() => {
              opportunitiesRows.refreshData()
            }, 500)
          }
        } catch (dbError) {
          // 🚀 ERROR RECOVERY: Revert optimistic update if database fails
          console.error('❌ Database persistence failed, reverting optimistic update:', dbError)
          opportunitiesUpdateOpportunity(rowId, { [columnId]: oldValue })

          toast({
            title: 'Error',
            description: 'Failed to save changes to database. Please try again.',
            variant: 'destructive',
          })
          throw dbError
        }

        // Log the successful edit for activity tracking
        logCellEdit(rowId, columnId, value, oldValue)
      } catch (error) {
        console.error('Error updating opportunity:', error)
        toast({
          title: 'Error',
          description: 'Failed to update opportunity. Please try again.',
          variant: 'destructive',
        })
      }
    },
    [
      instantOpportunities.rows,
      opportunitiesRows.updateCell,
      logCellEdit,
      opportunitiesColumns,
      hasExternalData,
      onExternalDataUpdate,
      externalOpportunities,
    ],
  )

  // 🚀 NEW: Handle opportunity deletion with optimistic updates
  const handleDeleteOpportunities = useCallback(
    async (opportunityIds: string[]) => {
      try {
        //  OPTIMISTIC: Remove from store immediately for instant UI feedback
        opportunitiesRemoveOpportunities(opportunityIds)

        // Handle grid-specific deletion logic
        await editableOpportunitiesGridDeleteOpportunities(opportunityIds)

        // 🚀 BACKGROUND: Delete from database with error recovery
        try {
          if (opportunitiesRows.deleteOpportunities) {
            // Use the sophisticated deletion from opportunitiesRows if available
            await opportunitiesRows.deleteOpportunities(opportunityIds)
          } else {
            // Fallback to individual deletions
            for (const id of opportunityIds) {
              await deleteOpportunity(id)
            }
          }

          toast({
            title: 'Opportunities deleted',
            description: `Successfully deleted ${opportunityIds.length} opportunit${opportunityIds.length === 1 ? 'y' : 'ies'}.`,
          })

          logger.log(`✅ Successfully deleted ${opportunityIds.length} opportunities`)
        } catch (dbError) {
          // 🚀 ERROR RECOVERY: If database deletion fails, we'd need to restore
          // For now, just log the error as the opportunities are already removed from UI
          logger.error(`❌ Database deletion failed:`, dbError)
          throw dbError
        }
      } catch (error) {
        console.error('Error deleting opportunities:', error)
        toast({
          title: 'Error',
          description: 'Failed to delete opportunities',
          variant: 'destructive',
        })
      }
    },
    [
      opportunitiesRemoveOpportunities,
      opportunitiesRows,
      deleteOpportunity,
      editableOpportunitiesGridDeleteOpportunities,
    ],
  )

  // Handle column operations
  const handleAddColumn = useCallback(
    async (afterColumnId: string) => {
      editableOpportunitiesGridAddColumn(afterColumnId)
      logColumnAdd(`column-${Math.random().toString(36).substring(2, 10)}`, 'New Column')
    },
    [editableOpportunitiesGridAddColumn, logColumnAdd],
  )

  const handleInsertColumn = useCallback(
    async (direction: 'left' | 'right', targetIndex: number, headerName: string, columnType: string, config?: any) => {
      editableOpportunitiesGridInsertColumn(direction, targetIndex, headerName, columnType, config)
      logColumnAdd(`column-${Math.random().toString(36).substring(2, 10)}`, headerName)
    },
    [editableOpportunitiesGridInsertColumn, logColumnAdd],
  )

  const handleDeleteColumn = useCallback(
    async (columnId: string) => {
      const column = opportunitiesColumns.find(col => col.id === columnId)
      if (column) {
        await editableOpportunitiesGridDeleteColumn(columnId)
      }
    },
    [opportunitiesColumns, editableOpportunitiesGridDeleteColumn],
  )

  const handleConfirmDeleteColumn = useCallback(async () => {
    await editableOpportunitiesGridConfirmDeleteColumn()
  }, [editableOpportunitiesGridConfirmDeleteColumn])

  const handleHideColumn = useCallback(
    async (columnId: string) => {
      const column = opportunitiesColumns.find(col => col.id === columnId)
      if (column) {
        logFilterChange({ type: 'column_hidden', columnId, columnName: column.title })
      }
      await editableOpportunitiesGridHideColumn(columnId)
    },
    [opportunitiesColumns, editableOpportunitiesGridHideColumn, logFilterChange],
  )

  const handleUnhideColumn = useCallback(
    async (columnId: string) => {
      await editableOpportunitiesGridUnhideColumn(columnId)
    },
    [editableOpportunitiesGridUnhideColumn],
  )

  // Helper function to check if a column is temporarily visible
  const isColumnTemporarilyVisible = useCallback(
    (columnId: string) => {
      const hiddenColumnsFilter = opportunitiesActiveFilters.values['__hidden_columns__'] as any
      const showHiddenColumns = hiddenColumnsFilter?.showHidden === true
      return showHiddenColumns && opportunitiesHiddenColumns.some(col => col.id === columnId)
    },
    [opportunitiesActiveFilters.values, opportunitiesHiddenColumns],
  )

  // 🚀 NEW: Handle converting contacts to opportunities with optimistic updates
  const handleConvertToOpportunities = useCallback(
    async (
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
          logger.log('✅ Successfully created opportunity:', conversionData.accountName)

          // 🚀 OPTIMISTIC: Add to store immediately for instant UI feedback
          // Generate a temporary ID until database ID is available
          const newOpportunity = {
            id: `temp-${Date.now()}`, // Temporary ID
            opportunity: conversionData.accountName,
            company: conversionData.accountName,
            status: conversionData.stage,
            stage: conversionData.stage,
            revenue: conversionData.dealValue,
            closeDate: conversionData.closeDate?.toISOString().split('T')[0] || '',
            priority: conversionData.priority,
            owner: user?.email || '',
            originalContactId: contacts[0]?.id || null,
            userId: user?.id || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          opportunitiesAddOpportunity(newOpportunity)

          toast({
            title: 'Opportunity created',
            description: `Successfully created opportunity "${conversionData.accountName}".`,
          })
        }
      } catch (error) {
        console.error('❌ Error creating opportunity:', error)
        toast({
          title: 'Error',
          description: 'Failed to create opportunity. Please try again.',
          variant: 'destructive',
        })
        throw error
      }
    },
    [bulkConvertContactsToOpportunities, opportunitiesAddOpportunity, user],
  )

  // Compute display columns
  const displayColumns = useMemo(() => {
    const hiddenColumnsFilter = opportunitiesActiveFilters.values['__hidden_columns__'] as any
    const showHiddenColumns = hiddenColumnsFilter?.showHidden === true

    if (showHiddenColumns && opportunitiesHiddenColumns.length > 0) {
      let result = [...opportunitiesColumns]

      opportunitiesHiddenColumns.forEach((hiddenCol: any) => {
        const originalIndex = hiddenCol.originalIndex
        if (originalIndex !== undefined && originalIndex >= 0) {
          const insertAt = Math.min(originalIndex, result.length)
          result.splice(insertAt, 0, hiddenCol)
        } else {
          result.push(hiddenCol)
        }
      })

      // Remove duplicates
      const uniqueColumns = Array.from(new Map(result.map(col => [col.id, col])).values())

      return uniqueColumns
    }

    return opportunitiesColumns
  }, [opportunitiesColumns, opportunitiesHiddenColumns, opportunitiesActiveFilters.values])

  // 🚀 NEW: Calculate total pages using store data
  const totalPages = useMemo(
    () => Math.ceil(instantOpportunities.totalCount / opportunitiesPageSize),
    [instantOpportunities.totalCount, opportunitiesPageSize],
  )

  // Stable grid key
  const gridKey = useMemo(() => `opportunities-grid-${opportunitiesForceRenderKey}`, [opportunitiesForceRenderKey])

  // 🚀 FIXED: Improved loading logic to prevent infinite loader
  const isStillLoading =
    // Show loading only if we're actually initializing AND have no data
    (opportunitiesLoading.initializing && instantOpportunities.rows.length === 0) ||
    // OR if not initialized yet and no external data
    (!opportunitiesPagination.isInitialized && !externalOpportunities?.length)

  // 🚀 TEMP DISABLE: Debug logging to prevent infinite logs
  // useEffect(() => {
  //   console.log('🔍 EditableOpportunitiesGrid Loading Debug:', {
  //     'instantOpportunities.loading': instantOpportunities.loading,
  //     'instantOpportunities.rows.length': instantOpportunities.rows.length,
  //     'opportunitiesPagination.isInitialized': opportunitiesPagination.isInitialized,
  //     isStillLoading: isStillLoading,
  //     externalLoading: externalLoading,
  //     opportunitiesLoading: opportunitiesLoading,
  //   })
  // }, [
  //   instantOpportunities.loading,
  //   instantOpportunities.rows.length,
  //   opportunitiesPagination.isInitialized,
  //   isStillLoading,
  //   externalLoading,
  //   opportunitiesLoading,
  // ])

  // Debug logging instead of warning (this is normal during loading)
  useEffect(() => {
    if (
      instantOpportunities.rows.length === 0 &&
      !instantOpportunities.loading &&
      opportunitiesPagination.isInitialized
    ) {
      console.log('🔄 Opportunities initialized but data still loading...', {
        isInitialized: opportunitiesPagination.isInitialized,
        rowsCount: instantOpportunities.rows.length,
        isLoading: instantOpportunities.loading,
        userId: user?.id,
      })
    }
  }, [instantOpportunities.rows.length, instantOpportunities.loading, opportunitiesPagination.isInitialized, user?.id])

  // 🚀 FIXED: Simple and clear loading logic
  // Show loader only during initial loading, not when initialized (even with no data)
  if (opportunitiesLoading.initializing) {
    return <GridSkeleton rowCount={10} columnCount={10} loadingText="Loading opportunities..." />
  }

  // 🚀 NEW: Render the grid with store data
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-hidden relative">
        <OpportunitiesGridViewContainer
          key={gridKey}
          columns={displayColumns as any}
          data={instantOpportunities.rows}
          firstRowIndex={0}
          onCellChange={handleCellChange}
          onAddColumn={handleAddColumn}
          onInsertColumn={handleInsertColumn}
          onDeleteColumn={handleDeleteColumn}
          onHideColumn={handleHideColumn}
          onUnhideColumn={handleUnhideColumn}
          onShowColumn={handleUnhideColumn}
          onDeleteContacts={handleDeleteOpportunities}
          isColumnTemporarilyVisible={isColumnTemporarilyVisible}
          onSearchChange={term => editableOpportunitiesGridSetSearchTerm(term)}
          onConvertToOpportunities={handleConvertToOpportunities}
          viewToggle={viewToggle}
        />
      </div>
      <GridPagination
        totalPages={totalPages}
        totalItems={instantOpportunities.totalCount}
        loading={instantOpportunities.loading}
        isBackgroundLoading={instantOpportunities.isBackgroundLoading}
        loadedCount={instantOpportunities.loadedCount}
        currentPage={opportunitiesCurrentPage}
        pageSize={opportunitiesPageSize}
        onPageChange={editableOpportunitiesGridSetCurrentPage}
        onPageSizeChange={size => {
          // 🚀 IMPLEMENTED: Set page size in opportunities store
          logger.log('Page size change requested:', size)
          editableOpportunitiesGridSetPageSize(size)

          // Ensure we have enough data loaded for the new page size
          if (opportunitiesPagination.isInitialized) {
            const minimumRequired = size
            if (minimumRequired > opportunitiesPagination.loadedCount) {
              opportunitiesEnsureMinimumLoaded(minimumRequired)
            }
          }
        }}
      />

      <DeleteColumnDialog onConfirm={handleConfirmDeleteColumn} />
    </div>
  )
}
