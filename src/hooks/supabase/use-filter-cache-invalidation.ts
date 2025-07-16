import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/auth'
import { useStore } from '@/stores'
import { logger } from '@/utils/logger'

/**
 * Hook to automatically invalidate filter values cache when columns change
 * Listens to column additions, deletions, and modifications in the grid store
 */
export function useFilterCacheInvalidation() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Get columns from store
  const { columns, deletedColumnIds } = useStore()

  // Track previous state to detect changes
  const prevColumnsRef = useRef<typeof columns>([])
  const prevDeletedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.id) return

    const prevColumns = prevColumnsRef.current
    const prevDeletedIds = prevDeletedIdsRef.current

    // Ensure deletedColumnIds is always iterable - handle both Set and plain object cases
    let currentDeletedIds: Set<string>
    if (deletedColumnIds instanceof Set) {
      currentDeletedIds = deletedColumnIds
    } else if (deletedColumnIds && typeof deletedColumnIds === 'object') {
      // If it's a plain object (from localStorage persistence), convert to array then to Set
      const idsArray = Array.isArray(deletedColumnIds)
        ? deletedColumnIds
        : Object.keys(deletedColumnIds).length > 0
          ? Object.values(deletedColumnIds)
          : []
      currentDeletedIds = new Set(idsArray.filter(id => typeof id === 'string'))
    } else {
      currentDeletedIds = new Set()
    }

    // Detect column additions
    const addedColumns = columns.filter(col => !prevColumns.some(prevCol => prevCol.id === col.id))

    // Detect column deletions
    const deletedColumns = prevColumns.filter(col => !columns.some(currentCol => currentCol.id === col.id))

    // Detect newly deleted column IDs
    const newlyDeletedIds = Array.from(currentDeletedIds).filter(id => !prevDeletedIds.has(id))

    // Detect restored column IDs (removed from deleted set)
    const restoredIds = Array.from(prevDeletedIds).filter(id => !currentDeletedIds.has(id))

    // Log changes for debugging
    if (addedColumns.length > 0) {
      logger.log(
        '📋 Columns added:',
        addedColumns.map(col => ({ id: col.id, title: col.title })),
      )
    }

    if (deletedColumns.length > 0) {
      logger.log(
        '🗑️ Columns removed from view:',
        deletedColumns.map(col => ({ id: col.id, title: col.title })),
      )
    }

    if (newlyDeletedIds.length > 0) {
      logger.log('❌ Columns permanently deleted:', newlyDeletedIds)
    }

    if (restoredIds.length > 0) {
      logger.log('♻️ Columns restored:', restoredIds)
    }

    // Invalidate cache for deleted columns
    if (deletedColumns.length > 0 || newlyDeletedIds.length > 0) {
      const columnsToInvalidate = [...deletedColumns.map(col => col.id), ...newlyDeletedIds]

      columnsToInvalidate.forEach(columnId => {
        queryClient.removeQueries({
          queryKey: ['column_filter_values', user.id, columnId],
        })
        logger.log(`🧹 Removed filter cache for deleted column: ${columnId}`)
      })
    }

    // For restored columns, just log (the hook will reload values when needed)
    if (restoredIds.length > 0) {
      restoredIds.forEach(columnId => {
        logger.log(`🔄 Column ${columnId} restored - cache will reload when filter is opened`)
      })
    }

    // Invalidate all filter caches if there were significant changes
    // This ensures consistency after major column operations
    const hasSignificantChanges =
      addedColumns.length > 0 || deletedColumns.length > 0 || newlyDeletedIds.length > 0 || restoredIds.length > 0

    if (hasSignificantChanges) {
      // Invalidate all column filter caches for this user
      queryClient.invalidateQueries({
        queryKey: ['column_filter_values', user.id],
      })
      logger.log('🔄 Invalidated all filter caches due to column changes')
    }

    // Update refs for next comparison - ensure we safely handle the Set conversion
    prevColumnsRef.current = [...columns]
    prevDeletedIdsRef.current = new Set(Array.from(currentDeletedIds))
  }, [columns, deletedColumnIds, user?.id, queryClient])

  // Function to manually invalidate all filter caches
  const invalidateAllFilterCaches = () => {
    if (!user?.id) return

    queryClient.invalidateQueries({
      queryKey: ['column_filter_values', user.id],
    })
    logger.log('🔄 Manually invalidated all filter caches')
  }

  // Function to invalidate cache for specific column
  const invalidateColumnCache = (columnId: string) => {
    if (!user?.id) return

    queryClient.removeQueries({
      queryKey: ['column_filter_values', user.id, columnId],
    })
    logger.log(`🧹 Manually invalidated filter cache for column: ${columnId}`)
  }

  return {
    invalidateAllFilterCaches,
    invalidateColumnCache,
  }
}
