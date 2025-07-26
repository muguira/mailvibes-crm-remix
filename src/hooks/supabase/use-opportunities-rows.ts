// @ts-nocheck
import { useAuth } from '@/components/auth'
import { supabase } from '@/integrations/supabase/client'
import { useStore } from '@/stores/index'
import { Opportunity } from '@/stores/useOpportunitiesSlice'
import { logger } from '@/utils/logger'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { toast } from '../use-toast'

/**
 * Helper function to transform row IDs to database-compatible format
 * - Converts "opportunity-XXX" format to integer if possible
 * - Falls back to original ID if can't be transformed
 */
function transformRowId(id: string): string | number {
  // If ID has format "opportunity-XXX", try to extract just the number
  if (typeof id === 'string' && id.startsWith('opportunity-')) {
    try {
      // Extract the number part and convert to integer
      const numericPart = id.replace('opportunity-', '')
      // Remove leading zeros from numeric part (e.g., '007' becomes '7')
      const cleanNumeric = numericPart.replace(/^0+/, '')
      return parseInt(cleanNumeric, 10)
    } catch (e) {
      logger.warn(`Could not transform row ID ${id} to number:`, e)
    }
  }
  // Return original ID as fallback
  return id
}

/**
 * Helper function to check if a row exists in the database
 */
async function checkRowExistsInDb(userId: string, rowId: string | number) {
  try {
    const { data } = await supabase.from('opportunities').select('id').eq('user_id', userId).eq('id', rowId).single()

    return !!data // Return true if data exists
  } catch (e) {
    // If there's an error, assume row doesn't exist
    return false
  }
}

// Add a utility function to properly sort rows by ID
function sortRowsByIdAscending(rows: Opportunity[]): Opportunity[] {
  return [...rows].sort((a, b) => {
    // Extract numeric parts of row IDs for proper numeric sorting
    const getNumericId = (id: string): number => {
      const match = id.match(/opportunity-(\d+)/)
      // Extract numeric part, or use a very high number for non-numeric IDs
      return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER
    }

    const idA = getNumericId(a.id)
    const idB = getNumericId(b.id)

    // Sort by ID in ascending order (lowest first)
    return idA - idB
  })
}

// Add a utility function to get proper initial data
const getProperOrderedData = (rawRows: Opportunity[]): Opportunity[] => {
  if (!rawRows || rawRows.length === 0) return []

  // Strip any test/temporary data that might cause flashing
  const filteredRows = rawRows.filter(row => row.id !== 'test' && !row.id.includes('test-'))

  // Sort rows by ID in ascending order
  return sortRowsByIdAscending(filteredRows)
}

// Constants
export const PAGE_SIZE = 50

// Cache for storing pages of data
const pageCache = new Map<string, { data: Opportunity[]; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache

// Local storage fallback functions
const OPPORTUNITIES_STORAGE_KEY = 'opportunities-data'

const loadOpportunitiesFromLocal = (): Opportunity[] => {
  try {
    const savedRows = localStorage.getItem(OPPORTUNITIES_STORAGE_KEY)
    if (savedRows) {
      return JSON.parse(savedRows)
    }
  } catch (error) {
    logger.error('Failed to load opportunities from localStorage:', error)
  }
  return []
}

const saveOpportunitiesToLocal = (opportunities: Opportunity[]): void => {
  try {
    localStorage.setItem(OPPORTUNITIES_STORAGE_KEY, JSON.stringify(opportunities))
  } catch (error) {
    logger.error('Failed to save opportunities to localStorage:', error)
  }
}

// Add a Set to track pages being fetched to prevent duplicate requests
const fetchingPages = new Set<string>()

/**
 * Hook for managing opportunity rows with Supabase persistence
 * Falls back to localStorage when not authenticated
 */
export function useOpportunitiesRows() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [totalCount, setTotalCount] = useState(0) // Add state for total count
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Function to get cache key
  const getCacheKey = (page: number, pageSize: number) => {
    return `${user?.id}-opportunity-page-${page}-size-${pageSize}`
  }

  // Function to check if cache is valid
  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION
  }

  // Function to fetch data from Supabase - only loads what's needed for current page
  const fetchOpportunitiesRows = async (page: number = 1, pageSize: number = 50, forceRefresh: boolean = false) => {
    // Check cache first if not forcing refresh
    const cacheKey = getCacheKey(page, pageSize)

    // Prevent duplicate fetches for the same page
    if (fetchingPages.has(cacheKey) && !forceRefresh) {
      logger.log(`Already fetching opportunity page ${page}, skipping duplicate request`)
      return { totalCount: totalCount }
    }

    const cached = pageCache.get(cacheKey)

    if (!forceRefresh && cached && isCacheValid(cached.timestamp)) {
      logger.log(`Using cached data for opportunity page ${page}`)
      setRows(cached.data)
      setLoading(false)
      return { totalCount: totalCount || cached.data.length }
    }

    // Mark this page as being fetched
    fetchingPages.add(cacheKey)

    // Show loading only if we don't have any data yet
    if (rows.length === 0 || forceRefresh) {
      setLoading(true)
    }

    try {
      // First try to fetch from Supabase using opportunities table
      if (user) {
        // Calculate offset for pagination
        const offset = (page - 1) * pageSize

        // Use smaller page size for faster initial load
        const actualPageSize = pageSize

        // Fetch only the opportunities for the current page
        let query = supabase
          .from('opportunities')
          .select(
            'id, opportunity, company_name, status, revenue, close_date, priority, owner, user_id, data, original_contact_id, created_at, updated_at',
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }) // Most recent first
          .range(offset, offset + actualPageSize - 1) // Use range for pagination

        // Start both queries in parallel for better performance
        const [dataResult, countResult] = await Promise.all([
          query,
          supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        ])

        const { data, error } = dataResult
        const { count } = countResult

        if (error) {
          logger.error('SUPABASE ERROR:', error)
          throw error
        }

        logger.log(`Loaded opportunity page ${page} with ${data?.length || 0} opportunities (Total: ${count || 0})`)

        // Store the total count
        setTotalCount(count || 0)
        setIsInitialLoad(false)

        // If we have data in Supabase, use it
        if (data && data.length > 0) {
          // Convert opportunities to Opportunity format - use database IDs directly
          const processedRows = data.map(opportunity => {
            const processedOpportunity: Opportunity = {
              id: opportunity.id, // Use the actual database ID - no mapping needed
              opportunity: opportunity.opportunity || '',
              company: opportunity.company_name || '', // Map company_name to company
              companyName: opportunity.company_name || '', // Also provide companyName for compatibility
              status: opportunity.status || 'Lead/New',
              stage: opportunity.status || 'Lead/New', // Use status as stage for now
              revenue: opportunity.revenue || 0,
              closeDate: opportunity.close_date || '',
              priority: opportunity.priority || 'Medium',
              owner: opportunity.owner || '',
              originalContactId: opportunity.original_contact_id || '',
              userId: opportunity.user_id,
              createdAt: opportunity.created_at,
              updatedAt: opportunity.updated_at,
              // Spread the rest of the data field
              ...(opportunity.data || {}),
            }
            return processedOpportunity
          })

          // Sort the rows by creation date (most recent first)
          const sortedRows = processedRows.sort((a, b) => {
            const dateA = new Date(a.createdAt || '').getTime()
            const dateB = new Date(b.createdAt || '').getTime()
            return dateB - dateA // Descending order (newest first)
          })

          setRows(sortedRows)

          // Cache the data in memory
          pageCache.set(cacheKey, { data: sortedRows, timestamp: Date.now() })

          // Also cache first page to localStorage for instant load next time
          if (page === 1) {
            try {
              localStorage.setItem(
                'opportunities-first-page',
                JSON.stringify({
                  data: sortedRows,
                  totalCount: count,
                  timestamp: Date.now(),
                }),
              )
            } catch (e) {
              logger.warn('Failed to cache opportunities to localStorage:', e)
            }
          }

          // Return the total count for pagination controls
          return { totalCount: count || 0 }
        } else {
          // Start with an empty array - don't generate dummy data
          setRows([])

          return { totalCount: 0 }
        }
      } else {
        // Not logged in - start with empty state
        setRows([])
        return { totalCount: 0 }
      }
    } catch (fetchError) {
      logger.error('Error fetching opportunities from Supabase:', fetchError)
      // Start with empty state on error
      setRows([])
      setTotalCount(0)
      return { totalCount: 0 }
    } finally {
      // Remove from fetching set when done
      fetchingPages.delete(cacheKey)
      setLoading(false)
    }
  }

  // Clear cache when user changes
  useEffect(() => {
    pageCache.clear()
    setIsInitialLoad(true)
  }, [user?.id])

  // Load data on component mount
  useEffect(() => {
    fetchOpportunitiesRows()
  }, [user?.id])

  // Listen for opportunity-added events to refresh the data
  useEffect(() => {
    const handleOpportunityAdded = () => {
      logger.log('Opportunity added event received, clearing cache and refreshing data...')
      pageCache.clear() // Clear cache when data changes
      fetchOpportunitiesRows(1, 50, true) // Force refresh
    }

    document.addEventListener('opportunity-added', handleOpportunityAdded)

    return () => {
      document.removeEventListener('opportunity-added', handleOpportunityAdded)
    }
  }, [])

  // Function to force refresh the data
  const refreshData = () => {
    pageCache.clear() // Clear all cached pages
    // This will reload the data from Supabase
    fetchOpportunitiesRows(1, 50, true)
  }

  // Save a row to both Supabase and localStorage
  const saveRow = async (rowIndex: number, updatedRow: Opportunity) => {
    // Update local state first for immediate UI feedback
    setRows(prevRows => {
      const newRows = [...prevRows]
      newRows[rowIndex] = updatedRow
      return newRows
    })

    try {
      // Save to Supabase opportunities table if user is authenticated
      if (user) {
        // Extract basic opportunity fields
        const { id, opportunity, company, stage, status, revenue, closeDate, priority, owner, originalContactId } =
          updatedRow

        // Everything else goes in the data field
        const data = { ...updatedRow }

        // Remove fields that are columns in the opportunities table
        delete data.id
        delete data.opportunity
        delete data.company
        delete data.stage
        delete data.status
        delete data.revenue
        delete data.closeDate
        delete data.priority
        delete data.owner
        delete data.originalContactId
        delete data.userId
        delete data.createdAt
        delete data.updatedAt

        const { error } = await supabase.from('opportunities').upsert({
          id,
          opportunity: opportunity || '',
          company_name: company || '',
          status: status || 'Lead/New',
          revenue: revenue || 0,
          close_date: closeDate || null,
          priority: priority || 'Medium',
          owner: owner || '',
          original_contact_id: originalContactId || null,
          user_id: user.id,
          data,
          updated_at: new Date().toISOString(),
        })

        if (error) {
          throw error
        }
      } else {
        // Fall back to localStorage if not authenticated
        saveOpportunitiesToLocal(rows)
      }
    } catch (error) {
      logger.error('Failed to save opportunity to Supabase, saving to localStorage instead:', error)

      // Fall back to localStorage
      saveOpportunitiesToLocal(rows)
    }
  }

  // Get filtered and paginated data
  const getFilteredRows = () => {
    if (!filter) return rows

    return rows.filter(row =>
      Object.values(row).some(value => String(value).toLowerCase().includes(filter.toLowerCase())),
    )
  }

  // Update a cell value
  const updateCell = async ({ rowId, columnId, value }: { rowId: string; columnId: string; value: any }) => {
    // SOLUCIÓN OPTIMIZADA: Buscar primero en OpportunitiesStore cache (todas las oportunidades)
    const { opportunitiesCache: cache } = useStore.getState()
    let currentRow = cache[rowId]
    let rowIndex = -1 // Inicializar rowIndex

    // Fallback: Si no está en cache, buscar en rows local (página actual)
    if (!currentRow) {
      rowIndex = rows.findIndex(row => row.id === rowId)
      if (rowIndex === -1) {
        logger.error(`Opportunity with id ${rowId} not found in cache or local rows`)
        return
      }
      currentRow = rows[rowIndex]
    } else {
      // Si encontramos en cache, buscar el índice en rows local para actualizar UI
      rowIndex = rows.findIndex(row => row.id === rowId)
    }

    // DETAILED LOGGING: Track the cell update request
    logger.log('UpdateCell called for opportunity:', {
      rowId,
      columnId,
      value,
      currentOpportunityName: currentRow.opportunity,
      currentUserId: currentRow.userId,
      isAuthenticated: !!user,
      authenticatedUserId: user?.id,
      foundInCache: !!cache[rowId],
      foundInRows: rowIndex !== -1,
    })

    // Check if the current row is missing user_id
    if (!currentRow.userId) {
      logger.warn('POTENTIAL ISSUE: Opportunity missing user_id before update:', {
        rowId,
        opportunityName: currentRow.opportunity,
        columnBeingUpdated: columnId,
        willAddUserId: !!user?.id,
      })
    }

    // Create updated row
    const updatedRow = {
      ...currentRow,
      [columnId]: value,
    }

    // Update local state first for immediate UI feedback (solo si el row está en la página actual)
    if (rowIndex !== -1) {
      setRows(prevRows => {
        const newRows = [...prevRows]
        newRows[rowIndex] = updatedRow
        return newRows
      })
    }

    try {
      // Save to Supabase opportunities table
      if (user) {
        // Handle field mapping from camelCase to snake_case
        const fieldMapping: { [key: string]: string } = {
          closeDate: 'close_date',
          originalContactId: 'original_contact_id',
          company: 'company_name',
          companyName: 'company_name', // Handle both variants
          lastContacted: 'last_contacted',
          nextMeeting: 'next_meeting',
          leadSource: 'lead_source',
          companyLinkedin: 'company_linkedin',
        }

        // Map field name if needed
        const dbFieldName = fieldMapping[columnId] || columnId

        // Handle data type conversions
        let dbValue = value

        // Handle date formatting for close_date
        if (columnId === 'closeDate' && value) {
          if (value instanceof Date) {
            dbValue = value.toISOString().split('T')[0]
          } else if (typeof value === 'string') {
            const date = new Date(value)
            if (!isNaN(date.getTime())) {
              dbValue = date.toISOString().split('T')[0]
            }
          }
        }

        // Handle revenue conversion to number
        if (columnId === 'revenue' && value !== null && value !== undefined) {
          // Convert string currency values to numbers
          if (typeof value === 'string') {
            // Remove currency symbols and commas
            const cleanValue = value.replace(/[$,]/g, '')
            const numericValue = parseFloat(cleanValue)
            dbValue = isNaN(numericValue) ? 0 : numericValue
          } else if (typeof value === 'number') {
            dbValue = value
          }
        }

        // Check if this is a direct column or should go in data field
        const DIRECT_COLUMNS = [
          'id',
          'opportunity',
          'company_name',
          'status',
          'revenue',
          'close_date',
          'priority',
          'owner',
          'original_contact_id',
          'user_id',
          'created_at',
          'updated_at',
          'last_contacted',
          'next_meeting',
          'lead_source',
          'company_linkedin',
          'website',
          'employees',
        ]

        let updateData: any = { updated_at: new Date().toISOString() }

        if (DIRECT_COLUMNS.includes(dbFieldName)) {
          // Direct column update
          updateData[dbFieldName] = dbValue
        } else {
          // Custom field - update in data JSONB field
          // First get current data
          const { data: currentOpportunity, error: fetchError } = await supabase
            .from('opportunities')
            .select('data')
            .eq('id', rowId)
            .eq('user_id', user.id)
            .single()

          if (fetchError) throw fetchError

          // Update the data field
          const updatedData = {
            ...(currentOpportunity?.data && typeof currentOpportunity.data === 'object' ? currentOpportunity.data : {}),
            [columnId]: dbValue, // Use original columnId, not dbFieldName for custom fields
          }

          updateData.data = updatedData
        }

        // Log the update data being sent to Supabase
        logger.log('💾 Sending update to Supabase:', {
          updateData,
          rowId,
          columnId,
          dbFieldName,
          originalValue: currentRow[columnId],
          newValue: dbValue,
          opportunityName: currentRow.opportunity,
        })

        const { data: updateResult, error } = await supabase
          .from('opportunities')
          .update(updateData)
          .eq('id', rowId)
          .eq('user_id', user.id)
          .select() // ← Add select to see what was actually updated

        if (error) {
          logger.error('❌ UpdateCell returned error for opportunity:', {
            error: error,
            rowId,
            columnId,
            dbFieldName,
            updateData,
            originalName: currentRow.opportunity,
          })
          throw error
        }

        // Log successful update with returned data
        logger.log('✅ Successfully updated opportunity in database:', {
          rowId,
          columnId,
          dbFieldName,
          updateResult,
          sentData: updateData,
        })

        // Log successful update
        logger.log('UpdateCell completed successfully for opportunity:', {
          rowId,
          columnId,
          dbFieldName,
          originalName: currentRow.opportunity,
          finalName: updatedRow.opportunity,
          hadUserIdBefore: !!currentRow.userId,
          hasUserIdAfter: !!user?.id,
        })

        // 🚀 FORCE CACHE INVALIDATION: Clear page cache to ensure fresh data on next load
        pageCache.clear()
        logger.log('🗑️ Cleared page cache to ensure fresh data on next load')

        // Also update the OpportunitiesStore to reflect database changes
        try {
          const { opportunitiesUpdateOpportunity } = useStore.getState()
          if (updateResult && updateResult.length > 0) {
            const updatedOpportunity = updateResult[0]
            // Update store with the actual database result
            const storeUpdate: any = {}

            // Map database fields back to store format
            if (updatedOpportunity.company_name !== undefined) {
              storeUpdate.company = updatedOpportunity.company_name
              storeUpdate.companyName = updatedOpportunity.company_name
            }
            if (updatedOpportunity.close_date !== undefined) {
              storeUpdate.closeDate = updatedOpportunity.close_date
            }
            if (updatedOpportunity.original_contact_id !== undefined) {
              storeUpdate.originalContactId = updatedOpportunity.original_contact_id
            }
            // Add the original field that was updated
            storeUpdate[columnId] = dbValue

            opportunitiesUpdateOpportunity(rowId, storeUpdate)
            logger.log('🔄 Updated opportunities store with database result')
          }
        } catch (storeError) {
          logger.warn('⚠️ Failed to update opportunities store:', storeError)
        }
      }
    } catch (error) {
      logger.error('Error updating opportunity cell:', {
        error,
        rowId,
        columnId,
        opportunityName: currentRow.opportunity,
        hadUserId: !!currentRow.userId,
      })
      // Fall back to localStorage
      saveOpportunitiesToLocal(rows)

      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to update opportunity in database. Changes saved locally.',
        variant: 'destructive',
      })
    }

    // Persist the latest rows to local storage regardless of Supabase outcome
    saveOpportunitiesToLocal(rows)

    return updatedRow
  }

  /**
   * Bulk delete column data for all opportunities
   * This is specifically for column deletion operations - NOT for individual cell edits
   *
   * @param {string} columnId - The column ID to remove data from
   * @returns {Promise<{ success: boolean, affectedRows?: number, error?: any }>}
   */
  const bulkDeleteColumnData = async (columnId: string) => {
    if (!user?.id) {
      logger.error('No user ID available for bulk opportunity column deletion')
      return { success: false, error: 'No user authenticated' }
    }

    logger.log('🗂️ Starting bulk opportunity column deletion:', {
      columnId,
      userId: user.id,
      timestamp: new Date().toISOString(),
    })

    // List of columns that are directly in the opportunities table
    const DIRECT_COLUMNS = [
      'id',
      'opportunity',
      'company_name',
      'status',
      'revenue',
      'close_date',
      'priority',
      'owner',
      'original_contact_id',
      'user_id',
      'created_at',
      'updated_at',
    ]

    try {
      let affectedRows = 0

      if (DIRECT_COLUMNS.includes(columnId)) {
        // ✅ Handle direct columns: set to null or default value
        logger.log(`📋 Deleting direct opportunity column: ${columnId}`)

        const { data, error, count } = await supabase
          .from('opportunities')
          .update({ [columnId]: null })
          .eq('user_id', user.id)
          .select('id', { count: 'exact' })

        if (error) {
          logger.error('❌ Direct opportunity column deletion failed:', {
            error,
            columnId,
            userId: user.id,
          })
          throw error
        }

        affectedRows = count || 0
      } else {
        // ✅ Handle custom columns stored in JSONB data field
        logger.log(`📦 Deleting custom opportunity column from data JSONB: ${columnId}`)

        // Get all opportunities that have this column in their data field
        const { data: opportunities, error: fetchError } = await supabase
          .from('opportunities')
          .select('id, data')
          .eq('user_id', user.id)
          .not('data', 'is', null)

        if (fetchError) {
          logger.error('❌ Failed to fetch opportunities for custom column deletion:', {
            error: fetchError,
            columnId,
            userId: user.id,
          })
          throw fetchError
        }

        if (opportunities && opportunities.length > 0) {
          // Process opportunities to remove the column from their data
          const updates = opportunities
            .filter(opportunity => {
              const data = opportunity.data
              return data && typeof data === 'object' && columnId in data
            })
            .map(opportunity => {
              const newData = { ...opportunity.data }
              delete newData[columnId]
              return {
                id: opportunity.id,
                data: newData,
              }
            })

          if (updates.length > 0) {
            logger.log(`🔄 Updating ${updates.length} opportunities to remove custom column: ${columnId}`)

            // Process updates in batches to avoid potential payload size limits
            const BATCH_SIZE = 100
            let totalUpdated = 0

            for (let i = 0; i < updates.length; i += BATCH_SIZE) {
              const batch = updates.slice(i, i + BATCH_SIZE)

              // Use individual updates with WHERE clause for better RLS compatibility
              for (const update of batch) {
                const { error: updateError } = await supabase
                  .from('opportunities')
                  .update({ data: update.data })
                  .eq('id', update.id)
                  .eq('user_id', user.id)

                if (updateError) {
                  logger.error('❌ Custom opportunity column update failed:', {
                    error: updateError,
                    opportunityId: update.id,
                    columnId,
                    userId: user.id,
                  })
                  throw updateError
                }
                totalUpdated++
              }

              logger.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} completed: ${batch.length} opportunities updated`)
            }

            affectedRows = totalUpdated
            logger.log(`✅ Successfully removed custom column from ${totalUpdated} opportunities`)
          } else {
            logger.log(`ℹ️ No opportunities found with custom column: ${columnId}`)
          }
        }
      }

      logger.log('✅ Bulk opportunity column deletion completed successfully:', {
        columnId,
        affectedRows,
        userId: user.id,
        columnType: DIRECT_COLUMNS.includes(columnId) ? 'direct' : 'custom',
        duration: 'immediate',
      })

      // Update local OpportunitiesStore cache to reflect the changes
      try {
        const { opportunitiesCache: cache, opportunitiesUpdateOpportunity: updateOpportunityInCache } =
          useStore.getState()
        Object.keys(cache).forEach(opportunityId => {
          const opportunity = cache[opportunityId]
          if (opportunity.userId === user.id) {
            // Check both direct column and data object
            const hasDirectColumn = opportunity[columnId] !== undefined
            const hasDataColumn =
              opportunity.data && typeof opportunity.data === 'object' && columnId in opportunity.data

            if (hasDirectColumn || hasDataColumn) {
              const updateData: any = {}

              if (hasDirectColumn) {
                updateData[columnId] = null
              }

              if (hasDataColumn) {
                const newData = { ...opportunity.data }
                delete newData[columnId]
                updateData.data = newData
              }

              updateOpportunityInCache(opportunityId, updateData)
            }
          }
        })
        logger.log('📦 Updated OpportunitiesStore cache after bulk deletion')
      } catch (cacheError) {
        logger.warn('⚠️ Failed to update OpportunitiesStore cache:', cacheError)
        // Non-critical error - the UI will still work
      }

      // Update local rows state if any of the current page opportunities were affected
      setRows(prevRows => {
        const updatedRows = prevRows.map(row => {
          if (row[columnId] !== undefined) {
            const updatedRow = { ...row }
            delete updatedRow[columnId] // Remove the property entirely
            return updatedRow
          }
          return row
        })
        return updatedRows
      })

      return { success: true, affectedRows }
    } catch (error) {
      logger.error('💥 Critical error in bulk opportunity column deletion:', {
        error,
        columnId,
        userId: user.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      return { success: false, error }
    }
  }

  // Add a new opportunity
  const addOpportunity = async (newOpportunity: Opportunity) => {
    try {
      if (user) {
        // Generate a database UUID for storage
        const dbId = uuidv4()

        // Make sure the opportunity has a proper name
        const opportunityToSave = {
          ...newOpportunity,
          id: dbId, // Use database ID directly - no mapping needed
          opportunity: newOpportunity.opportunity || 'Untitled Opportunity', // Ensure opportunity field is used
        }

        logger.log('Adding new opportunity with name:', opportunityToSave.opportunity)

        // Add to local state first for immediate UI feedback - always at the beginning
        setRows(prevRows => {
          const newRows = [opportunityToSave, ...prevRows]
          logger.log(`Updated opportunities rows state with new opportunity. Total rows: ${newRows.length}`)
          return newRows
        })

        // Also update the opportunities store for consistent UI across components
        try {
          const { opportunitiesAddOpportunity: addOpportunity } = useStore.getState()
          if (typeof addOpportunity === 'function') {
            addOpportunity(opportunityToSave)
            logger.log('Opportunity also added to opportunitiesStore for immediate visibility')
          }
        } catch (err) {
          // If the store doesn't have this function, just continue
          logger.warn('Could not update opportunitiesStore:', err)
        }

        // Force a re-render by dispatching a custom event
        setTimeout(() => {
          document.dispatchEvent(
            new CustomEvent('opportunity-added-immediate', {
              detail: { opportunity: opportunityToSave },
            }),
          )
        }, 100) // Small delay to ensure state has updated

        // Extract fields for Supabase
        const { opportunity, company, stage, status, revenue, closeDate, priority, owner, originalContactId } =
          opportunityToSave

        // Create data object for other fields
        const data = { ...opportunityToSave }
        delete data.id
        delete data.opportunity
        delete data.company
        delete data.stage
        delete data.status
        delete data.revenue
        delete data.closeDate
        delete data.priority
        delete data.owner
        delete data.originalContactId
        delete data.userId
        delete data.createdAt
        delete data.updatedAt

        // Save to Supabase
        const { error } = await supabase.from('opportunities').insert({
          id: dbId,
          opportunity: opportunity || 'Untitled Opportunity',
          company_name: company || '',
          status: status || 'Lead/New',
          revenue: revenue || 0,
          close_date: closeDate || null,
          priority: priority || 'Medium',
          owner: owner || '',
          original_contact_id: originalContactId || null,
          user_id: user.id,
          data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (error) {
          logger.error('Error adding opportunity to Supabase:', error)
          // Still keep the opportunity in local state
        } else {
          logger.log('Opportunity successfully added to Supabase')
          // Clear the page cache to ensure fresh data on next load
          pageCache.clear()
        }

        // Don't refresh the page - the opportunity is already in the UI
      } else {
        // Not logged in, just add to local state
        const uiId = newOpportunity.id || `opportunity-${crypto.randomUUID().substring(0, 8)}`
        const opportunityToSave = {
          ...newOpportunity,
          id: uiId,
          opportunity: newOpportunity.opportunity || 'Untitled Opportunity', // Ensure opportunity field is used
        }

        setRows(prevRows => [opportunityToSave, ...prevRows])
        saveOpportunitiesToLocal(rows)
      }
    } catch (error) {
      logger.error('Error adding opportunity:', error)
      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to add opportunity. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Add function to delete multiple opportunities (soft delete)
  const deleteOpportunities = async (opportunityIds: string[]): Promise<void> => {
    if (!opportunityIds.length) return

    // Start timing the delete operation
    const deleteStartTime = performance.now()
    console.log(
      `🚀 [DELETE TIMING] Starting delete operation for ${opportunityIds.length} opportunities at ${deleteStartTime.toFixed(2)}ms`,
    )

    // Store original state in case we need to restore
    const originalRows = [...rows]

    try {
      // Convert IDs to database format if needed
      const dbIds = opportunityIds.map(transformRowId)

      // IMPORTANT: Pause background loading during delete operation
      const {
        opportunitiesPauseBackgroundLoading: pauseBackgroundLoading,
        opportunitiesResumeBackgroundLoading: resumeBackgroundLoading,
      } = useStore.getState()
      pauseBackgroundLoading()

      const uiUpdateStartTime = performance.now()
      console.log(`⚡ [DELETE TIMING] Starting UI updates at ${uiUpdateStartTime.toFixed(2)}ms`)

      // IMPORTANT: Immediately mark opportunities as deleted in the store to prevent flickering
      const { opportunitiesRemoveOpportunities: removeOpportunities } = useStore.getState()
      removeOpportunities(opportunityIds)

      // Update local state by removing deleted opportunities immediately
      const newRows = rows.filter(row => !opportunityIds.includes(row.id))
      setRows(newRows)
      saveOpportunitiesToLocal(newRows)

      const uiUpdateEndTime = performance.now()
      console.log(`✅ [DELETE TIMING] UI updates completed in ${(uiUpdateEndTime - uiUpdateStartTime).toFixed(2)}ms`)

      // Dispatch immediate UI feedback event (this will close the dialog)
      document.dispatchEvent(
        new CustomEvent('opportunities-deleted-immediate', {
          detail: {
            count: opportunityIds.length,
            opportunityIds: opportunityIds,
            timing: uiUpdateEndTime - deleteStartTime,
          },
        }),
      )

      if (user) {
        const dbStartTime = performance.now()
        console.log(`🗄️ [DELETE TIMING] Starting database operation at ${dbStartTime.toFixed(2)}ms`)

        // Delete opportunities from database
        const { error } = await supabase.from('opportunities').delete().in('id', dbIds).eq('user_id', user.id)

        const dbEndTime = performance.now()
        console.log(`🗄️ [DELETE TIMING] Database operation completed in ${(dbEndTime - dbStartTime).toFixed(2)}ms`)

        if (error) {
          // If database operation fails, we need to restore the opportunities
          console.error(
            `❌ [DELETE TIMING] Database operation failed after ${(dbEndTime - deleteStartTime).toFixed(2)}ms:`,
            error,
          )
          logger.error('Delete failed, restoring opportunities to UI:', error)

          // Restore opportunities to local state
          setRows(originalRows)
          saveOpportunitiesToLocal(originalRows)

          // Restore to opportunities store
          const { opportunitiesRestoreOpportunities: restoreOpportunities } = useStore.getState()
          const opportunitiesToRestore = originalRows.filter(opp => opportunityIds.includes(opp.id))
          restoreOpportunities(opportunitiesToRestore)

          throw error
        }

        const totalTime = dbEndTime - deleteStartTime
        console.log(
          `🎉 [DELETE TIMING] Successfully deleted ${opportunityIds.length} opportunities in ${totalTime.toFixed(2)}ms`,
        )
        logger.log(`Deleted ${opportunityIds.length} opportunities`)
      }

      // Resume background loading after successful delete
      setTimeout(() => {
        resumeBackgroundLoading()
      }, 2000) // Wait 2 seconds before resuming to let database settle

      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['opportunitiesRows', user?.id])
      queryClient.invalidateQueries(['opportunities', user?.id])

      // Dispatch final success event
      const finalTime = performance.now()
      document.dispatchEvent(
        new CustomEvent('opportunities-deleted', {
          detail: {
            count: opportunityIds.length,
            opportunityIds: opportunityIds,
            totalTime: finalTime - deleteStartTime,
          },
        }),
      )

      console.log(`🏁 [DELETE TIMING] Total operation completed in ${(finalTime - deleteStartTime).toFixed(2)}ms`)
    } catch (error) {
      // Resume background loading even if delete failed
      const { opportunitiesResumeBackgroundLoading: resumeBackgroundLoading } = useStore.getState()
      setTimeout(() => {
        resumeBackgroundLoading()
      }, 1000)

      const errorTime = performance.now()
      console.error(
        `💥 [DELETE TIMING] Delete operation failed after ${(errorTime - deleteStartTime).toFixed(2)}ms:`,
        error,
      )
      logger.error('Error deleting opportunities:', error)
      throw new Error('Failed to delete opportunities')
    }
  }

  return {
    rows: getFilteredRows(),
    loading,
    saveRow,
    filter,
    setFilter,
    PAGE_SIZE,
    updateCell,
    bulkDeleteColumnData, // 🆕 New function for efficient column deletion
    addOpportunity,
    deleteOpportunities,
    refreshData,
    fetchOpportunitiesRows,
    totalCount,
  }
}
