// @ts-nocheck
import { useAuth } from '@/components/auth'
import { supabase } from '@/integrations/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '../use-toast'
import { v4 as uuidv4 } from 'uuid'
import { GridRow } from '@/components/grid-view/types'
import { LEADS_STORAGE_KEY } from '@/constants/grid'
import { useState, useEffect, useCallback } from 'react'
import { LeadContact } from '@/components/stream/sample-data'
import { mockContactsById } from '@/components/stream/sample-data'
import { updateContact } from '@/helpers/updateContact'
import { withRetrySupabase } from '@/utils/supabaseRetry'
import { logger } from '@/utils/logger'
import { useStore } from '@/stores/index'

/**
 * Helper function to transform row IDs to database-compatible format
 * - Converts "lead-XXX" format to integer if possible
 * - Falls back to original ID if can't be transformed
 */
function transformRowId(id: string): string | number {
  // If ID has format "lead-XXX", try to extract just the number
  if (typeof id === 'string' && id.startsWith('lead-')) {
    try {
      // Extract the number part and convert to integer
      const numericPart = id.replace('lead-', '')
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
    const { data } = await supabase.from('contacts').select('id').eq('user_id', userId).eq('id', rowId).single()

    return !!data // Return true if data exists
  } catch (e) {
    // If there's an error, assume row doesn't exist
    return false
  }
}

// Add a utility function to properly sort rows by ID
function sortRowsByIdAscending(rows: GridRow[]): GridRow[] {
  return [...rows].sort((a, b) => {
    // Extract numeric parts of row IDs for proper numeric sorting
    const getNumericId = (id: string): number => {
      const match = id.match(/lead-(\d+)/)
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
const getProperOrderedData = (rawRows: GridRow[]): GridRow[] => {
  if (!rawRows || rawRows.length === 0) return []

  // Strip any test/temporary data that might cause flashing
  const filteredRows = rawRows.filter(row => row.id !== 'pedro' && !row.id.includes('test-'))

  // Sort rows by ID in ascending order
  return sortRowsByIdAscending(filteredRows)
}

// Constants
export const PAGE_SIZE = 50

// Cache for storing pages of data
const pageCache = new Map<string, { data: LeadContact[]; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache

// Local storage fallback functions
const loadRowsFromLocal = (): LeadContact[] => {
  try {
    const savedRows = localStorage.getItem(LEADS_STORAGE_KEY)
    if (savedRows) {
      return JSON.parse(savedRows)
    }
  } catch (error) {
    logger.error('Failed to load rows from localStorage:', error)
  }
  return []
}

const saveRowsToLocal = (rows: LeadContact[]): void => {
  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(rows))
  } catch (error) {
    logger.error('Failed to save rows to localStorage:', error)
  }
}

// Add a Set to track pages being fetched to prevent duplicate requests
const fetchingPages = new Set<string>()

/**
 * Hook for managing lead rows with Supabase persistence
 * Falls back to localStorage when not authenticated
 */
export function useLeadsRows() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<LeadContact[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [totalCount, setTotalCount] = useState(0) // Add state for total count
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Update mockContactsById whenever rows change
  useEffect(() => {
    rows.forEach(row => {
      mockContactsById[row.id] = row
    })
  }, [rows])

  // Function to get cache key
  const getCacheKey = (page: number, pageSize: number) => {
    return `${user?.id}-page-${page}-size-${pageSize}`
  }

  // Function to check if cache is valid
  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION
  }

  // Function to fetch data from Supabase - only loads what's needed for current page
  const fetchLeadsRows = async (page: number = 1, pageSize: number = 50, forceRefresh: boolean = false) => {
    // Check cache first if not forcing refresh
    const cacheKey = getCacheKey(page, pageSize)

    // Prevent duplicate fetches for the same page
    if (fetchingPages.has(cacheKey) && !forceRefresh) {
      logger.log(`Already fetching page ${page}, skipping duplicate request`)
      return { totalCount: totalCount }
    }

    const cached = pageCache.get(cacheKey)

    if (!forceRefresh && cached && isCacheValid(cached.timestamp)) {
      logger.log(`Using cached data for page ${page}`)
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
      // First try to fetch from Supabase using contacts table
      if (user) {
        // Calculate offset for pagination
        const offset = (page - 1) * pageSize

        // Use smaller page size for faster initial load
        const actualPageSize = pageSize

        // Fetch only the contacts for the current page
        let query = supabase
          .from('contacts')
          .select('id, name, email, phone, company, status, user_id, data, created_at, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }) // Most recent first
          .range(offset, offset + actualPageSize - 1) // Use range for pagination

        // Start both queries in parallel for better performance
        const [dataResult, countResult] = await Promise.all([
          query,
          supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        ])

        const { data, error } = dataResult
        const { count } = countResult

        if (error) {
          logger.error('SUPABASE ERROR:', error)
          throw error
        }

        logger.log(`Loaded page ${page} with ${data?.length || 0} contacts (Total: ${count || 0})`)

        // Store the total count
        setTotalCount(count || 0)
        setIsInitialLoad(false)

        // If we have data in Supabase, use it
        if (data && data.length > 0) {
          // Convert contacts to LeadContact format - use database IDs directly
          const processedRows = data.map(contact => {
            const leadContact: LeadContact = {
              id: contact.id, // Use the actual database ID - no mapping needed
              name: contact.name,
              email: contact.email || '',
              phone: contact.phone || '',
              company: contact.company || '',
              status: contact.status || '',
              // Extract importListName from data field if it exists
              importListName: contact.data?.importListName || '',
              // Extract importOrder to preserve CSV row order
              importOrder: contact.data?.importOrder,
              // Spread the rest of the data field
              ...(contact.data || {}),
            }
            return leadContact
          })

          // Sort the rows properly:
          // 1. Imported contacts (with importListName) come first
          // 2. Within imported lists, sort by importOrder
          // 3. Non-imported contacts come after, sorted by creation date
          const sortedRows = processedRows.sort((a, b) => {
            const aImportList = a.importListName || ''
            const bImportList = b.importListName || ''

            // If one has import list and other doesn't, imported one comes first
            if (aImportList && !bImportList) return -1
            if (!aImportList && bImportList) return 1

            // Both have import lists - sort by list name first
            if (aImportList && bImportList && aImportList !== bImportList) {
              return aImportList.localeCompare(bImportList)
            }

            // Same import list (or both have no list) - check import order
            const aImportOrder = a.importOrder
            const bImportOrder = b.importOrder

            // If both have import order, use that (ascending - first row first)
            if (aImportOrder !== undefined && bImportOrder !== undefined) {
              return aImportOrder - bImportOrder
            }

            // If only one has import order, it goes first
            if (aImportOrder !== undefined) return -1
            if (bImportOrder !== undefined) return 1

            // Neither has import order - they're already sorted by created_at from the query
            return 0
          })

          setRows(sortedRows)

          // Cache the data in memory
          pageCache.set(cacheKey, { data: sortedRows, timestamp: Date.now() })

          // Also cache first page to localStorage for instant load next time
          if (page === 1) {
            try {
              localStorage.setItem(
                'contacts-first-page',
                JSON.stringify({
                  data: sortedRows,
                  totalCount: count,
                  timestamp: Date.now(),
                }),
              )
            } catch (e) {
              logger.warn('Failed to cache to localStorage:', e)
            }
          }

          // Keep mockContactsById in sync (but only for loaded contacts)
          sortedRows.forEach(row => {
            mockContactsById[row.id] = row
          })

          // Return the total count for pagination controls
          return { totalCount: count || 0 }
        } else {
          // Start with an empty array - don't generate dummy data
          setRows([])

          // Clear mockContactsById to ensure no dummy data
          Object.keys(mockContactsById).forEach(key => {
            delete mockContactsById[key]
          })

          return { totalCount: 0 }
        }
      } else {
        // Not logged in - start with empty state
        setRows([])
        return { totalCount: 0 }
      }
    } catch (fetchError) {
      logger.error('Error fetching from Supabase:', fetchError)
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
    fetchLeadsRows()
  }, [user?.id])

  // Listen for contact-added events to refresh the data
  useEffect(() => {
    const handleContactAdded = () => {
      logger.log('Contact added event received, clearing cache and refreshing data...')
      pageCache.clear() // Clear cache when data changes
      fetchLeadsRows(1, 50, true) // Force refresh
    }

    document.addEventListener('contact-added', handleContactAdded)

    return () => {
      document.removeEventListener('contact-added', handleContactAdded)
    }
  }, [])

  // Function to force refresh the data
  const refreshData = () => {
    pageCache.clear() // Clear all cached pages
    // This will reload the data from Supabase
    fetchLeadsRows(1, 50, true)
  }

  // Save a row to both Supabase and localStorage
  const saveRow = async (rowIndex: number, updatedRow: LeadContact) => {
    // Update local state first for immediate UI feedback
    setRows(prevRows => {
      const newRows = [...prevRows]
      newRows[rowIndex] = updatedRow
      return newRows
    })

    // Update mockContactsById for Stream View
    mockContactsById[updatedRow.id] = updatedRow

    try {
      // Save to Supabase contacts table if user is authenticated
      if (user) {
        // Extract basic contact fields
        const { id, name, email, phone, company, status } = updatedRow

        // Everything else goes in the data field
        const data = { ...updatedRow }

        // Remove fields that are columns in the contacts table
        delete data.id
        delete data.name
        delete data.email
        delete data.phone
        delete data.company
        delete data.status

        const { error } = await supabase.from('contacts').upsert({
          id,
          name: name || '',
          email: email || '',
          phone: phone || '',
          company: company || '',
          status: status || '',
          user_id: user.id,
          data,
          updated_at: new Date().toISOString(),
        })

        if (error) {
          throw error
        }
      } else {
        // Fall back to localStorage if not authenticated
        saveRowsToLocal(rows)
      }
    } catch (error) {
      logger.error('Failed to save to Supabase, saving to localStorage instead:', error)

      // Fall back to localStorage
      saveRowsToLocal(rows)
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
    // SOLUCIÓN OPTIMIZADA: Buscar primero en ContactsStore cache (todos los contactos)
    const { contactsCache: cache } = useStore.getState()
    let currentRow = cache[rowId]
    let rowIndex = -1 // Inicializar rowIndex

    // Fallback: Si no está en cache, buscar en rows local (página actual)
    if (!currentRow) {
      rowIndex = rows.findIndex(row => row.id === rowId)
      if (rowIndex === -1) {
        logger.error(`Row with id ${rowId} not found in cache or local rows`)
        return
      }
      currentRow = rows[rowIndex]
    } else {
      // Si encontramos en cache, buscar el índice en rows local para actualizar UI
      rowIndex = rows.findIndex(row => row.id === rowId)
    }

    // DETAILED LOGGING: Track the cell update request
    logger.log('UpdateCell called:', {
      rowId,
      columnId,
      value,
      currentRowName: currentRow.name,
      currentRowUserId: currentRow.user_id,
      currentRowHasName: !!currentRow.name,
      currentRowHasUserId: !!currentRow.user_id,
      isAuthenticated: !!user,
      authenticatedUserId: user?.id,
      foundInCache: !!cache[rowId],
      foundInRows: rowIndex !== -1,
    })

    // Check if the current row is missing user_id
    if (!currentRow.user_id) {
      logger.warn('POTENTIAL ISSUE: Contact missing user_id before update:', {
        rowId,
        contactName: currentRow.name,
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

    // Update mockContactsById for Stream View
    mockContactsById[updatedRow.id] = updatedRow

    // DEBUG: Add this to test simple connection
    if (columnId === 'name') {
      logger.debug('-----SUPABASE DEBUG-----')
      logger.debug('Testing simple query to contacts table...')
      const { data: testData, error: testError } = await supabase.from('contacts').select('id, name').limit(5)

      if (testError) {
        logger.error('Test query failed:', JSON.stringify(testError, null, 2))
      } else {
        logger.debug('Test query successful:', testData)
      }
      logger.debug('------------------------')
    }

    try {
      // Use our new helper function from updateContact.ts
      // This will handle whether fields go directly in columns or in the data JSON object
      const response = await updateContact({
        id: rowId,
        [columnId]: value,
        name: updatedRow.name, // Ensure name is included for non-null constraint
        user_id: user.id, // Include user_id for RLS policies
      })

      if (response.error) {
        logger.error('UpdateContact returned error:', {
          error: response.error,
          rowId,
          columnId,
          originalName: currentRow.name,
          updatedName: updatedRow.name,
        })
        throw response.error
      }

      // Log successful update
      logger.log('UpdateCell completed successfully:', {
        rowId,
        columnId,
        originalName: currentRow.name,
        finalName: updatedRow.name,
        hadUserIdBefore: !!currentRow.user_id,
        hasUserIdAfter: !!user?.id,
      })
    } catch (error) {
      logger.error('Error updating cell:', {
        error,
        rowId,
        columnId,
        contactName: currentRow.name,
        hadUserId: !!currentRow.user_id,
      })
      // Fall back to localStorage
      saveRowsToLocal(rows)

      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to update contact in database. Changes saved locally.',
        variant: 'destructive',
      })
    }

    // Persist the latest rows to local storage regardless of Supabase outcome
    saveRowsToLocal(rows)

    return updatedRow
  }

  /**
   * Bulk delete column data for all contacts
   * This is specifically for column deletion operations - NOT for individual cell edits
   *
   * @param {string} columnId - The column ID to remove data from
   * @returns {Promise<{ success: boolean, affectedRows?: number, error?: any }>}
   */
  const bulkDeleteColumnData = async (columnId: string) => {
    if (!user?.id) {
      logger.error('No user ID available for bulk column deletion')
      return { success: false, error: 'No user authenticated' }
    }

    logger.log('🗂️ Starting bulk column deletion:', {
      columnId,
      userId: user.id,
      timestamp: new Date().toISOString(),
    })

    // List of columns that are directly in the contacts table (same as in updateContact.ts)
    const DIRECT_COLUMNS = ['id', 'name', 'email', 'phone', 'company', 'status', 'user_id', 'created_at', 'updated_at']

    try {
      let affectedRows = 0

      if (DIRECT_COLUMNS.includes(columnId)) {
        // ✅ Handle direct columns: set to null
        logger.log(`📋 Deleting direct column: ${columnId}`)

        const { data, error, count } = await supabase
          .from('contacts')
          .update({ [columnId]: null })
          .eq('user_id', user.id)
          .select('id', { count: 'exact' })

        if (error) {
          logger.error('❌ Direct column deletion failed:', {
            error,
            columnId,
            userId: user.id,
          })
          throw error
        }

        affectedRows = count || 0
      } else {
        // ✅ Handle custom columns stored in JSONB data field
        logger.log(`📦 Deleting custom column from data JSONB: ${columnId}`)

        // Get all contacts that have this column in their data field
        const { data: contacts, error: fetchError } = await supabase
          .from('contacts')
          .select('id, data')
          .eq('user_id', user.id)
          .not('data', 'is', null)

        if (fetchError) {
          logger.error('❌ Failed to fetch contacts for custom column deletion:', {
            error: fetchError,
            columnId,
            userId: user.id,
          })
          throw fetchError
        }

        if (contacts && contacts.length > 0) {
          // Process contacts to remove the column from their data
          const updates = contacts
            .filter(contact => {
              const data = contact.data
              return data && typeof data === 'object' && columnId in data
            })
            .map(contact => {
              const newData = { ...contact.data }
              delete newData[columnId]
              return {
                id: contact.id,
                data: newData,
              }
            })

          if (updates.length > 0) {
            logger.log(`🔄 Updating ${updates.length} contacts to remove custom column: ${columnId}`)

            // Process updates in batches to avoid potential payload size limits
            const BATCH_SIZE = 100
            let totalUpdated = 0

            for (let i = 0; i < updates.length; i += BATCH_SIZE) {
              const batch = updates.slice(i, i + BATCH_SIZE)

              // Use individual updates with WHERE clause for better RLS compatibility
              for (const update of batch) {
                const { error: updateError } = await supabase
                  .from('contacts')
                  .update({ data: update.data })
                  .eq('id', update.id)
                  .eq('user_id', user.id)

                if (updateError) {
                  logger.error('❌ Custom column update failed for contact:', {
                    error: updateError,
                    contactId: update.id,
                    columnId,
                    userId: user.id,
                  })
                  throw updateError
                }
                totalUpdated++
              }

              logger.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} completed: ${batch.length} contacts updated`)
            }

            affectedRows = totalUpdated
            logger.log(`✅ Successfully removed custom column from ${totalUpdated} contacts`)
          } else {
            logger.log(`ℹ️ No contacts found with custom column: ${columnId}`)
          }
        }
      }

      logger.log('✅ Bulk column deletion completed successfully:', {
        columnId,
        affectedRows,
        userId: user.id,
        columnType: DIRECT_COLUMNS.includes(columnId) ? 'direct' : 'custom',
        duration: 'immediate',
      })

      // Update local ContactsStore cache to reflect the changes
      try {
        const { contactsCache: cache, contactsUpdateContact: updateContactInCache } = useStore.getState()
        Object.keys(cache).forEach(contactId => {
          const contact = cache[contactId]
          if (contact.user_id === user.id) {
            // Check both direct column and data object
            const hasDirectColumn = contact[columnId] !== undefined
            const hasDataColumn = contact.data && typeof contact.data === 'object' && columnId in contact.data

            if (hasDirectColumn || hasDataColumn) {
              const updateData: any = {}

              if (hasDirectColumn) {
                updateData[columnId] = null
              }

              if (hasDataColumn) {
                const newData = { ...contact.data }
                delete newData[columnId]
                updateData.data = newData
              }

              updateContactInCache(contactId, updateData)
            }
          }
        })
        logger.log('📦 Updated ContactsStore cache after bulk deletion')
      } catch (cacheError) {
        logger.warn('⚠️ Failed to update ContactsStore cache:', cacheError)
        // Non-critical error - the UI will still work
      }

      // Update local rows state if any of the current page contacts were affected
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

      // Update mockContactsById for Stream View consistency
      Object.keys(mockContactsById).forEach(contactId => {
        if (mockContactsById[contactId][columnId] !== undefined) {
          const updatedContact = { ...mockContactsById[contactId] }
          delete updatedContact[columnId]
          mockContactsById[contactId] = updatedContact
        }
      })

      return { success: true, affectedRows }
    } catch (error) {
      logger.error('💥 Critical error in bulk column deletion:', {
        error,
        columnId,
        userId: user.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      return { success: false, error }
    }
  }

  // Add a new contact
  const addContact = async (newContact: LeadContact) => {
    try {
      if (user) {
        // Generate a database UUID for storage
        const dbId = uuidv4()

        // Make sure the contact has a proper name
        const contactToSave = {
          ...newContact,
          id: dbId, // Use database ID directly - no mapping needed
          name: newContact.name || 'Untitled Contact', // Ensure name field is used
        }

        logger.log('Adding new contact with name:', contactToSave.name)

        // Add to local state first for immediate UI feedback - always at the beginning
        setRows(prevRows => {
          const newRows = [contactToSave, ...prevRows]
          logger.log(`Updated rows state with new contact. Total rows: ${newRows.length}`)
          return newRows
        })

        // Update mockContactsById for Stream View
        mockContactsById[dbId] = contactToSave

        // Also update the contacts store for consistent UI across components
        try {
          const { contactsAddContact: addContact } = useStore.getState()
          if (typeof addContact === 'function') {
            addContact(contactToSave)
            logger.log('Contact also added to contactsStore for immediate visibility')
          }
        } catch (err) {
          // If the store doesn't have this function, just continue
          logger.warn('Could not update contactsStore:', err)
        }

        // Force a re-render by dispatching a custom event
        setTimeout(() => {
          document.dispatchEvent(
            new CustomEvent('contact-added-immediate', {
              detail: { contact: contactToSave },
            }),
          )
        }, 100) // Small delay to ensure state has updated

        // Extract fields for Supabase
        const { name, email, phone, company, status } = contactToSave

        // Create data object for other fields
        const data = { ...contactToSave }
        delete data.id
        delete data.name
        delete data.email
        delete data.phone
        delete data.company
        delete data.status

        // Save to Supabase
        const { error } = await supabase.from('contacts').insert({
          id: dbId,
          name: name || 'Untitled Contact',
          email: email || '',
          phone: phone || '',
          company: company || '',
          status: status || '',
          user_id: user.id,
          data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (error) {
          logger.error('Error adding contact to Supabase:', error)
          // Still keep the contact in local state
        } else {
          logger.log('Contact successfully added to Supabase')
          // Clear the page cache to ensure fresh data on next load
          pageCache.clear()
        }

        // Don't refresh the page - the contact is already in the UI
        // await fetchLeadsRows(1, 50); // REMOVED - this was overriding the immediate UI update
      } else {
        // Not logged in, just add to local state
        const uiId = newContact.id || `lead-${crypto.randomUUID().substring(0, 8)}`
        const contactToSave = {
          ...newContact,
          id: uiId,
          name: newContact.name || 'Untitled Contact', // Ensure name field is used
        }

        setRows(prevRows => [contactToSave, ...prevRows])
        mockContactsById[uiId] = contactToSave
        saveRowsToLocal(rows)
      }
    } catch (error) {
      logger.error('Error adding contact:', error)
      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to add contact. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Add function to delete multiple contacts (soft delete)
  const deleteContacts = async (contactIds: string[]): Promise<void> => {
    if (!contactIds.length) return

    // Start timing the delete operation
    const deleteStartTime = performance.now()
    console.log(
      `🚀 [DELETE TIMING] Starting delete operation for ${contactIds.length} contacts at ${deleteStartTime.toFixed(2)}ms`,
    )

    // Store original state in case we need to restore
    const originalRows = [...rows]
    const originalMockContacts: Record<string, LeadContact> = {}
    contactIds.forEach(id => {
      if (mockContactsById[id]) {
        originalMockContacts[id] = { ...mockContactsById[id] }
      }
    })

    try {
      // Convert IDs to database format if needed
      const dbIds = contactIds.map(transformRowId)

      // IMPORTANT: Pause background loading during delete operation
      const {
        contactsPauseBackgroundLoading: pauseBackgroundLoading,
        contactsResumeBackgroundLoading: resumeBackgroundLoading,
      } = useStore.getState()
      pauseBackgroundLoading()

      const uiUpdateStartTime = performance.now()
      console.log(`⚡ [DELETE TIMING] Starting UI updates at ${uiUpdateStartTime.toFixed(2)}ms`)

      // IMPORTANT: Immediately mark contacts as deleted in the store to prevent flickering
      const { contactsRemoveContacts: removeContacts } = useStore.getState()
      removeContacts(contactIds)

      // Update local state by removing deleted contacts immediately
      const newRows = rows.filter(row => !contactIds.includes(row.id))
      setRows(newRows)
      saveRowsToLocal(newRows)

      // Remove from mockContactsById immediately
      contactIds.forEach(id => {
        delete mockContactsById[id]
      })

      const uiUpdateEndTime = performance.now()
      console.log(`✅ [DELETE TIMING] UI updates completed in ${(uiUpdateEndTime - uiUpdateStartTime).toFixed(2)}ms`)

      // Dispatch immediate UI feedback event (this will close the dialog)
      document.dispatchEvent(
        new CustomEvent('contacts-deleted-immediate', {
          detail: {
            count: contactIds.length,
            contactIds: contactIds,
            timing: uiUpdateEndTime - deleteStartTime,
          },
        }),
      )

      if (user) {
        const dbStartTime = performance.now()
        console.log(`🗄️ [DELETE TIMING] Starting database operation at ${dbStartTime.toFixed(2)}ms`)

        // Use the soft delete function with aggressive timeout settings for fast UI response
        const { data, error } = await withRetrySupabase(
          () =>
            supabase.rpc('soft_delete_contacts', {
              contact_ids: dbIds,
              user_id_param: user.id,
            }),
          {
            maxAttempts: 2, // Only retry once
            initialDelay: 300, // Very short initial delay
            maxDelay: 1000, // Maximum 1 second delay
            backoffMultiplier: 1.5, // Gentle backoff
            shouldRetry: (error: any) => {
              // Don't retry on timeout errors for faster response
              if (error?.code === '57014' || error?.message?.includes('timeout')) {
                return false
              }
              // Only retry on network errors, not database errors
              return error?.status >= 500 || !error?.status
            },
          },
        )

        const dbEndTime = performance.now()
        console.log(`🗄️ [DELETE TIMING] Database operation completed in ${(dbEndTime - dbStartTime).toFixed(2)}ms`)

        if (error) {
          // If database operation fails, we need to restore the contacts
          console.error(
            `❌ [DELETE TIMING] Database operation failed after ${(dbEndTime - deleteStartTime).toFixed(2)}ms:`,
            error,
          )
          logger.error('Soft delete failed, restoring contacts to UI:', error)

          // Restore contacts to local state
          setRows(originalRows)
          saveRowsToLocal(originalRows)

          // Restore to mockContactsById
          Object.entries(originalMockContacts).forEach(([id, contact]) => {
            mockContactsById[id] = contact
          })

          // Restore to contacts store
          const { contactsRestoreContacts: restoreContacts } = useStore.getState()
          const contactsToRestore = contactIds.map(id => originalMockContacts[id]).filter(Boolean)
          restoreContacts(contactsToRestore)

          throw error
        }

        // Check if any contacts were moved
        const movedCount = data?.[0]?.moved_count || 0
        if (movedCount === 0) {
          // If no contacts were moved, restore them
          console.warn(
            `⚠️ [DELETE TIMING] No contacts were moved, restoring after ${(dbEndTime - deleteStartTime).toFixed(2)}ms`,
          )
          logger.warn('No contacts were moved, restoring to UI')

          // Restore contacts to local state
          setRows(originalRows)
          saveRowsToLocal(originalRows)

          // Restore to mockContactsById
          Object.entries(originalMockContacts).forEach(([id, contact]) => {
            mockContactsById[id] = contact
          })

          // Restore to contacts store
          const { contactsRestoreContacts: restoreContacts } = useStore.getState()
          const contactsToRestore = contactIds.map(id => originalMockContacts[id]).filter(Boolean)
          restoreContacts(contactsToRestore)

          throw new Error('No contacts were deleted')
        }

        const totalTime = dbEndTime - deleteStartTime
        console.log(`🎉 [DELETE TIMING] Successfully deleted ${movedCount} contacts in ${totalTime.toFixed(2)}ms`)
        logger.log(`Soft deleted ${movedCount} contacts`)
      }

      // Resume background loading after successful delete
      setTimeout(() => {
        resumeBackgroundLoading()
      }, 2000) // Wait 2 seconds before resuming to let database settle

      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['leadsRows', user?.id])
      queryClient.invalidateQueries(['contacts', user?.id])

      // Dispatch final success event
      const finalTime = performance.now()
      document.dispatchEvent(
        new CustomEvent('contacts-deleted', {
          detail: {
            count: contactIds.length,
            contactIds: contactIds,
            totalTime: finalTime - deleteStartTime,
          },
        }),
      )

      console.log(`🏁 [DELETE TIMING] Total operation completed in ${(finalTime - deleteStartTime).toFixed(2)}ms`)
    } catch (error) {
      // Resume background loading even if delete failed
      const { contactsResumeBackgroundLoading: resumeBackgroundLoading } = useStore.getState()
      setTimeout(() => {
        resumeBackgroundLoading()
      }, 1000)

      const errorTime = performance.now()
      console.error(
        `💥 [DELETE TIMING] Delete operation failed after ${(errorTime - deleteStartTime).toFixed(2)}ms:`,
        error,
      )
      logger.error('Error deleting contacts:', error)
      throw new Error('Failed to delete contacts')
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
    addContact,
    deleteContacts,
    refreshData,
    fetchLeadsRows,
    totalCount,
  }
}
