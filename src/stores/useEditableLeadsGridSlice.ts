/**
 * @fileoverview Editable Leads Grid slice for Zustand store
 * @description This slice manages the complete leads grid state including search,
 * filtering, pagination, column management, data persistence, and contact operations.
 * It provides a centralized state management solution for the EditableLeadsGrid component.
 *
 * @author Mailvibes CRM Team
 * @version 1.0.0
 */

import { StateCreator } from 'zustand'
import { TStore } from '@/types/store/store'
import type {
  TEditableLeadsGridStore,
  IActiveFilters,
  IColumnOperationLoading,
  IDeleteColumnDialog,
  IEditableLeadsGridErrorState,
  IEditableLeadsGridLoadingState,
  ILastCellEdit,
  ILastContactDeletion,
  ILastInitialization,
  IColumnInsertConfig,
} from '@/types/store/editable-leads-grid'
import { Column } from '@/components/grid-view/types'
import { INITIAL_EDITABLE_LEADS_GRID_STATE } from '@/constants/store/editable-leads-grid'
import { getDefaultColumns, saveColumnsToLocal, loadColumnsFromLocal, loadColumnsFromSupabase } from '@/helpers/grid'
import { logger } from '@/utils/logger'
import { DEFAULT_COLUMN_WIDTH, MOBILE_COLUMN_WIDTH } from '@/components/grid-view/grid-constants'

/**
 * Editable Leads Grid slice for Zustand store
 *
 * Manages the complete leads grid state including:
 * - Search and filtering functionality
 * - Column management (add, delete, hide, reorder)
 * - Pagination state
 * - Dialog states
 * - Loading states
 *
 * @example
 * ```typescript
 * // Usage in component
 * const {
 *   searchTerm,
 *   columns,
 *   currentPage,
 *   editableLeadsGridSetSearchTerm,
 *   editableLeadsGridSetColumns
 * } = useStore();
 * ```
 */
export const useEditableLeadsGridSlice: StateCreator<
  TStore,
  [['zustand/subscribeWithSelector', never], ['zustand/immer', never]],
  [],
  TEditableLeadsGridStore
> = (set, get) => ({
  // ==================== INITIAL STATE ====================
  ...INITIAL_EDITABLE_LEADS_GRID_STATE,

  // ==================== SEARCH & FILTERS ====================

  /**
   * Set the search term and reset pagination
   * @param term - The search term to set
   */
  editableLeadsGridSetSearchTerm: (term: string) => {
    set(state => {
      // Only update if the term actually changed
      if (state.searchTerm !== term) {
        state.searchTerm = term
        // Reset to first page when search term changes
        state.currentPage = 1
      }
    })
  },

  /**
   * Set the active filters
   * @param filters - The filters to apply
   */
  editableLeadsGridSetActiveFilters: (filters: IActiveFilters) => {
    set(state => {
      state.activeFilters = filters
      // Reset to first page when filters change
      state.currentPage = 1
    })
  },

  // ==================== PAGINATION ====================

  /**
   * Set the current page
   * @param page - The page number to set
   */
  editableLeadsGridSetCurrentPage: (page: number) => {
    set(state => {
      state.currentPage = Math.max(1, page)
    })
  },

  /**
   * Set the page size
   * @param size - The page size to set
   */
  editableLeadsGridSetPageSize: (size: number) => {
    set(state => {
      state.pageSize = Math.max(1, Math.min(size, 100))
      // Reset to first page when page size changes
      state.currentPage = 1
    })
  },

  // ==================== COLUMN MANAGEMENT ====================

  /**
   * Set the columns array
   * @param columns - The columns to set
   */
  editableLeadsGridSetColumns: (columns: Column[]) => {
    set(state => {
      state.columns = columns
    })
  },

  /**
   * Set the hidden columns array
   * @param hiddenColumns - The hidden columns to set
   */
  editableLeadsGridSetHiddenColumns: (hiddenColumns: Column[]) => {
    set(state => {
      state.hiddenColumns = hiddenColumns
    })
  },

  /**
   * Set the deleted column IDs
   * @param deletedColumnIds - The deleted column IDs to set
   */
  editableLeadsGridSetDeletedColumnIds: (deletedColumnIds: Set<string>) => {
    set(state => {
      state.deletedColumnIds = deletedColumnIds
    })
  },

  /**
   * Set the delete column dialog state
   * @param dialog - The dialog state to set
   */
  editableLeadsGridSetDeleteColumnDialog: (dialog: IDeleteColumnDialog) => {
    set(state => {
      state.deleteColumnDialog = dialog
    })
  },

  /**
   * Set the column operation loading state
   * @param loading - The loading state to set
   */
  editableLeadsGridSetColumnOperationLoading: (loading: IColumnOperationLoading) => {
    set(state => {
      state.columnOperationLoading = loading
    })
  },

  /**
   * Set the contact deletion loading state
   * @param loading - The loading state to set
   */
  editableLeadsGridSetIsContactDeletionLoading: (loading: boolean) => {
    set(state => {
      state.isContactDeletionLoading = loading
    })
  },

  /**
   * Force re-render by incrementing the render key
   */
  editableLeadsGridForceRerender: () => {
    set(state => {
      state.forceRenderKey = state.forceRenderKey + 1
    })
  },

  // ==================== COMPUTED GETTERS ====================

  /**
   * Get total pages based on total count and page size
   * @param totalCount - Total number of items
   */
  editableLeadsGridGetTotalPages: (totalCount: number): number => {
    const state = get()
    return Math.ceil(totalCount / state.pageSize)
  },

  /**
   * Get grid key for stable rendering
   */
  editableLeadsGridGetGridKey: (): string => {
    const state = get()
    return `grid-stable-${state.forceRenderKey}`
  },

  // ==================== PLACEHOLDER FUNCTIONS ====================
  // These are kept as simple placeholders to maintain type compatibility

  // 12. Column deletion - Main function that checks if column can be deleted
  editableLeadsGridDeleteColumn: async (columnId: string) => {
    console.log('🔍 editableLeadsGridDeleteColumn called with columnId:', columnId)

    const { columns } = get()

    // Find the column to delete
    const columnToDelete = columns.find(col => col.id === columnId)
    if (!columnToDelete) {
      console.error('❌ Column not found:', columnId)
      return
    }

    console.log('✅ Column found for deletion:', { id: columnToDelete.id, title: columnToDelete.title })

    // Set loading state
    set(state => ({
      columnOperationLoading: { type: 'delete', columnId },
    }))

    try {
      // Check if this is a default column that cannot be deleted
      const defaultColumnIds = [
        'name',
        'email',
        'company',
        'phone',
        'status',
        'owner',
        'revenue',
        'source',
        'created_at',
        'updated_at',
      ]

      if (defaultColumnIds.includes(columnId)) {
        console.log('🚫 Default column cannot be deleted, opening dialog:', { columnId, title: columnToDelete.title })
        get().editableLeadsGridOpenDeleteColumnDialog(columnId, columnToDelete.title)
        return
      }

      // If not a default column, this shouldn't happen now
      // Custom columns are handled directly in the component with persistence
      console.log('⚠️ Non-default column reached slice deletion - this should be handled in component')
      return
    } catch (error) {
      console.error('Error in column deletion process:', error)
      set(state => ({
        editableLeadsGridErrors: {
          ...state.editableLeadsGridErrors,
          columnOperation: error instanceof Error ? error.message : 'Failed to delete column',
        },
      }))
    } finally {
      set({ columnOperationLoading: { type: null } })
    }
  },

  // 13. Confirm column deletion - Executes the actual deletion
  editableLeadsGridConfirmDeleteColumn: async () => {
    const { deleteColumnDialog, columns, deletedColumnIds } = get()

    console.log('🔍 Delete dialog state:', deleteColumnDialog)

    const { columnId, columnName } = deleteColumnDialog

    // Validate that columnId is not empty
    if (!columnId) {
      console.error('❌ Cannot delete column: columnId is empty', { deleteColumnDialog })
      return
    }

    // Close the dialog
    get().editableLeadsGridCloseDeleteColumnDialog()

    // Set loading state
    set({ columnOperationLoading: { type: 'delete', columnId } })

    try {
      // Log the column deletion attempt
      console.log(`🗑️ Attempting to delete column: ${columnId} (${columnName})`)

      // Add to deleted columns set to prevent re-adding
      const newDeletedColumnIds = new Set([...deletedColumnIds, columnId])
      set({ deletedColumnIds: newDeletedColumnIds })
      console.log(`🚫 Added ${columnId} to deleted columns list`)

      // Remove from columns array
      const newColumns = columns.filter(col => col.id !== columnId)
      console.log(`📊 Columns after deletion: ${newColumns.length} remaining`)
      get().editableLeadsGridSetColumns(newColumns)

      // Note: Row updates and persistence will need to be handled by the component
      // since these operations require hooks that can't be used in the slice
      console.log(`✅ Column removal from state completed successfully`)

      // Show success message via global toast
      const toast = (window as any).__toast
      if (toast) {
        toast({
          title: 'Column deleted',
          description: `Successfully deleted column "${columnName}" from the grid`,
        })
      }
    } catch (error) {
      console.error(`❌ Column deletion failed:`, error)

      // Set error state
      set(state => ({
        editableLeadsGridErrors: {
          ...state.editableLeadsGridErrors,
          columnOperation: error instanceof Error ? error.message : 'Failed to delete column',
        },
      }))

      // Show error message via global toast
      const toast = (window as any).__toast
      if (toast) {
        toast({
          title: 'Error deleting column',
          description: error instanceof Error ? error.message : 'Failed to delete the column. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      set({ columnOperationLoading: { type: null } })
    }
  },

  // 14. Add column - Simple addition after specified column
  editableLeadsGridAddColumn: async (afterColumnId: string) => {
    const { columns } = get()

    // Set loading state
    set({ columnOperationLoading: { type: 'add' } })

    try {
      // Import uuid at the top of the file if not already imported
      const { v4: uuidv4 } = await import('uuid')

      // Create a new unique column ID
      const columnId = `column-${uuidv4().substring(0, 8)}`

      // Create the new column - defaulting to text type
      const newColumn: any = {
        id: columnId,
        title: `New Column`,
        type: 'text',
        width: 200, // DEFAULT_COLUMN_WIDTH
        editable: true,
      }

      // Find the index where we need to insert
      const afterIndex = columns.findIndex(col => col.id === afterColumnId)

      // Add the column at the right position
      const newColumns = [...columns.slice(0, afterIndex + 1), newColumn, ...columns.slice(afterIndex + 1)]

      get().editableLeadsGridSetColumns(newColumns)
      await get().editableLeadsGridPersistColumns(newColumns)

      // Show success message
      const toast = (window as any).__toast
      if (toast) {
        toast({
          title: 'Column added',
          description: 'Successfully added new column',
        })
      }

      console.log(`✅ Added new column: ${columnId} after ${afterColumnId}`)
    } catch (error) {
      console.error('Error adding column:', error)

      // Set error state
      set(state => ({
        editableLeadsGridErrors: {
          ...state.editableLeadsGridErrors,
          columnOperation: error instanceof Error ? error.message : 'Failed to add column',
        },
      }))

      // Show error message
      const toast = (window as any).__toast
      if (toast) {
        toast({
          title: 'Error adding column',
          description: 'Failed to add new column. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      set({ columnOperationLoading: { type: null } })
    }
  },

  // 15. Insert column - Advanced insertion with configuration
  editableLeadsGridInsertColumn: async (
    direction: 'left' | 'right',
    targetIndex: number,
    headerName: string,
    columnType: string,
    config?: any,
  ) => {
    const { columns } = get()

    // Set loading state
    set({ columnOperationLoading: { type: 'add' } })

    try {
      // Import uuid
      const { v4: uuidv4 } = await import('uuid')

      // Create a new unique column ID
      const columnId = `column-${uuidv4().substring(0, 8)}`

      // Create the new column with the provided header name and type
      const newColumn: any = {
        id: columnId,
        title: headerName,
        type: columnType,
        width: 200, // DEFAULT_COLUMN_WIDTH
        editable: true,
      }

      // Apply configuration based on column type
      if (columnType === 'currency' && config?.currencyType) {
        newColumn.currencyType = config.currencyType
      } else if (columnType === 'status' && config?.options && config?.colors) {
        newColumn.options = config.options
        newColumn.colors = config.colors
      } else if (columnType === 'status') {
        // Default status options if no config provided
        newColumn.options = ['Option 1', 'Option 2', 'Option 3']
        newColumn.colors = {
          'Option 1': '#E4E5E8',
          'Option 2': '#DBCDF0',
          'Option 3': '#C6DEF1',
        }
      }

      // Calculate insertion index based on direction
      const insertAt = direction === 'left' ? targetIndex : targetIndex + 1

      // Insert the column at the calculated position
      const newColumns = [...columns.slice(0, insertAt), newColumn, ...columns.slice(insertAt)]

      get().editableLeadsGridSetColumns(newColumns)
      await get().editableLeadsGridPersistColumns(newColumns)

      // Show success message
      const toast = (window as any).__toast
      if (toast) {
        toast({
          title: 'Column added',
          description: `Successfully added column "${headerName}"`,
        })
      }

      console.log(`✅ Inserted new column: ${columnId} (${headerName}) at position ${insertAt}`)
    } catch (error) {
      console.error('Error inserting column:', error)

      // Set error state
      set(state => ({
        editableLeadsGridErrors: {
          ...state.editableLeadsGridErrors,
          columnOperation: error instanceof Error ? error.message : 'Failed to insert column',
        },
      }))

      // Show error message
      const toast = (window as any).__toast
      if (toast) {
        toast({
          title: 'Error adding column',
          description: 'Failed to add new column. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      set({ columnOperationLoading: { type: null } })
    }
  },

  // 16. Hide column - Remove from view but keep data
  editableLeadsGridHideColumn: async (columnId: string) => {
    const { columns, hiddenColumns } = get()

    // Set loading state
    set({ columnOperationLoading: { type: 'hide', columnId } })

    try {
      // Find the column to hide
      const column = columns.find(col => col.id === columnId)
      if (!column) return

      // Store the current index of the column before hiding
      const currentIndex = columns.findIndex(col => col.id === columnId)
      const columnWithIndex = { ...column, originalIndex: currentIndex } as any

      // Add to hidden columns list with original index
      const newHiddenColumns = [...hiddenColumns, columnWithIndex]
      get().editableLeadsGridSetHiddenColumns(newHiddenColumns)

      // Remove from columns array (this hides it from view)
      const newColumns = columns.filter(col => col.id !== columnId)
      get().editableLeadsGridSetColumns(newColumns)

      // Persist the column changes
      await get().editableLeadsGridPersistColumns(newColumns)

      // Show success message
      const toast = (window as any).__toast
      if (toast) {
        toast({
          title: 'Column hidden',
          description: `Column "${column.title}" is now hidden`,
        })
      }

      console.log(`✅ Hidden column: ${columnId} (${column.title})`)
    } catch (error) {
      console.error('Error hiding column:', error)

      // Set error state
      set(state => ({
        editableLeadsGridErrors: {
          ...state.editableLeadsGridErrors,
          columnOperation: error instanceof Error ? error.message : 'Failed to hide column',
        },
      }))

      // Show error message
      const toast = (window as any).__toast
      if (toast) {
        toast({
          title: 'Error hiding column',
          description: 'Failed to hide the column. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      set({ columnOperationLoading: { type: null } })
    }
  },

  // 17. Unhide column - Restore hidden column to view
  editableLeadsGridUnhideColumn: async (columnId: string) => {
    const { columns, hiddenColumns } = get()

    // Set loading state
    set({ columnOperationLoading: { type: 'unhide', columnId } })

    try {
      // Find the column in hidden columns
      const columnToUnhide = hiddenColumns.find(col => col.id === columnId) as any
      if (!columnToUnhide) return

      // Remove from hidden columns
      const newHiddenColumns = hiddenColumns.filter(col => col.id !== columnId)
      get().editableLeadsGridSetHiddenColumns(newHiddenColumns)

      // Insert back into columns at original position or at the end
      const { originalIndex, ...columnWithoutIndex } = columnToUnhide
      const insertAt = originalIndex !== undefined && originalIndex <= columns.length ? originalIndex : columns.length

      const newColumns = [...columns.slice(0, insertAt), columnWithoutIndex, ...columns.slice(insertAt)]

      get().editableLeadsGridSetColumns(newColumns)

      // Persist the column changes
      await get().editableLeadsGridPersistColumns(newColumns)

      // Show success message
      const toast = (window as any).__toast
      if (toast) {
        toast({
          title: 'Column restored',
          description: `Column "${columnToUnhide.title}" is now visible`,
        })
      }

      console.log(`✅ Unhidden column: ${columnId} (${columnToUnhide.title})`)
    } catch (error) {
      console.error('Error unhiding column:', error)

      // Set error state
      set(state => ({
        editableLeadsGridErrors: {
          ...state.editableLeadsGridErrors,
          columnOperation: error instanceof Error ? error.message : 'Failed to unhide column',
        },
      }))

      // Show error message
      const toast = (window as any).__toast
      if (toast) {
        toast({
          title: 'Error restoring column',
          description: 'Failed to restore the column. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      set({ columnOperationLoading: { type: null } })
    }
  },

  // 18. Handle cell edit - Core function for editing individual cells
  editableLeadsGridHandleCellEdit: async (rowId: string, columnId: string, value: any) => {
    const { columns } = get()

    try {
      console.log('EditableLeadsGrid slice handleCellEdit called:', {
        rowId,
        columnId,
        value,
        timestamp: new Date().toISOString(),
      })

      // Format date values before processing
      const column = columns.find(c => c.id === columnId)
      let finalValue = value
      if (column && column.type === 'date' && value instanceof Date) {
        finalValue = value.toISOString().split('T')[0]
      }

      console.log('Cell edit processed in slice:', {
        rowId,
        columnId,
        originalValue: value,
        finalValue,
        columnType: column?.type,
      })

      // Store the processed value for component retrieval
      // The component will handle the actual database update and logging
      set(state => ({
        lastCellEdit: {
          rowId,
          columnId,
          finalValue,
          originalValue: value,
          timestamp: Date.now(),
        },
      }))
    } catch (error) {
      console.error('Error in slice cell edit processing:', error)

      // Set error state
      set(state => ({
        editableLeadsGridErrors: {
          ...state.editableLeadsGridErrors,
          persistence: error instanceof Error ? error.message : 'Failed to process cell edit',
        },
      }))

      throw error // Re-throw for component handling
    }
  },

  // 19. Delete contacts - Handles multiple contact deletion
  editableLeadsGridDeleteContacts: async (contactIds: string[]) => {
    if (!contactIds.length) return

    // Set loading state
    set({ isContactDeletionLoading: true })

    try {
      console.log(`🗑️ Slice: Starting deletion of ${contactIds.length} contacts`, contactIds)

      // Store contact IDs for component operations
      set(state => ({
        lastContactDeletion: {
          contactIds,
          timestamp: Date.now(),
          status: 'processing',
        },
      }))

      console.log(`✅ Slice: Contact deletion state prepared for ${contactIds.length} contacts`)
    } catch (error) {
      console.error('Error in slice contact deletion preparation:', error)

      // Set error state
      set(state => ({
        editableLeadsGridErrors: {
          ...state.editableLeadsGridErrors,
          contactDeletion: error instanceof Error ? error.message : 'Failed to prepare contact deletion',
        },
        lastContactDeletion: {
          contactIds,
          timestamp: Date.now(),
          status: 'error',
        },
      }))

      throw error // Re-throw for component handling
    } finally {
      set({ isContactDeletionLoading: false })
    }
  },

  // 20. Initialize grid - Complete grid initialization
  editableLeadsGridInitialize: async (user: any) => {
    // Set initialization loading
    set(state => ({
      editableLeadsGridLoading: {
        ...state.editableLeadsGridLoading,
        initializing: true,
      },
    }))

    try {
      console.log('🚀 Slice: Starting grid initialization', { userId: user?.id })

      // Reset to initial state first
      set(state => {
        Object.assign(state, {
          searchTerm: '',
          currentPage: 1,
          pageSize: 25,
          activeFilters: { columns: [], values: {} },
          deletedColumnIds: new Set<string>(),
          lastCellEdit: null,
          lastContactDeletion: null,
          forceRenderKey: 0,
          editableLeadsGridErrors: {
            columnOperation: null,
            persistence: null,
            contactDeletion: null,
            initialization: null,
          },
        })
      })

      // Load deleted column IDs from localStorage
      try {
        const savedDeletedIds = localStorage.getItem('deletedColumnIds')
        if (savedDeletedIds) {
          const deletedIds = JSON.parse(savedDeletedIds)
          set({ deletedColumnIds: new Set(deletedIds) })
          console.log('✅ Loaded deleted column IDs from localStorage:', deletedIds)
        }
      } catch (error) {
        console.warn('Failed to load deleted column IDs:', error)
      }

      // Initialize timestamp
      set({
        lastSyncAt: new Date().toISOString(),
        isInitialized: true,
      })

      console.log('✅ Slice: Grid initialization completed successfully')

      // Store initialization completion for component operations
      set(state => ({
        lastInitialization: {
          userId: user?.id || null,
          timestamp: Date.now(),
          status: 'completed',
        },
      }))
    } catch (error) {
      console.error('❌ Slice: Grid initialization failed:', error)

      // Set error state
      set(state => ({
        editableLeadsGridErrors: {
          ...state.editableLeadsGridErrors,
          initialization: error instanceof Error ? error.message : 'Failed to initialize grid',
        },
        lastInitialization: {
          userId: user?.id || null,
          timestamp: Date.now(),
          status: 'error',
        },
      }))

      throw error // Re-throw for component handling
    } finally {
      set(state => ({
        editableLeadsGridLoading: {
          ...state.editableLeadsGridLoading,
          initializing: false,
        },
      }))
    }
  },

  /**
   * Reset the slice to initial state
   * Preserves deleted column IDs to prevent re-adding previously deleted columns
   */
  editableLeadsGridReset: () => {
    set(state => {
      // Store current deleted columns to preserve them across reset
      const currentDeletedColumns = state.deletedColumnIds

      // Reset to initial state
      Object.assign(state, INITIAL_EDITABLE_LEADS_GRID_STATE)

      // Preserve deleted column IDs
      state.deletedColumnIds = currentDeletedColumns
    })
  },

  /**
   * Handle page change with auto-scroll to top
   * @param page - The page number to navigate to
   */
  editableLeadsGridHandlePageChange: (page: number) => {
    set(state => {
      state.currentPage = Math.max(1, page)
    })

    // Scroll to top of grid when changing pages
    const gridElement = document.querySelector('.grid-components-container')
    if (gridElement) {
      gridElement.scrollTop = 0
    }
  },

  /**
   * Handle page size change and reset to first page
   * @param size - The new page size to set
   */
  editableLeadsGridHandlePageSizeChange: (size: number) => {
    set(state => ({
      pageSize: Math.max(1, Math.min(100, size)),
      // Reset to first page when changing page size
      currentPage: 1,
    }))
  },

  /**
   * Reorder columns based on new column order
   * @param columnIds - Array of column IDs in the new order
   */
  editableLeadsGridReorderColumns: (columnIds: string[]) => {
    const state = get()

    // Reorder columns based on new order
    const reorderedColumns = columnIds.map(id => state.columns.find(col => col.id === id)).filter(Boolean) as Column[]

    // Update the columns state
    set(state => {
      state.columns = reorderedColumns
    })
  },

  /**
   * Persist columns to both slice state, localStorage, and Supabase
   * @param newColumns - Array of Column objects to persist
   * @param user - User object for Supabase operations (optional)
   */
  editableLeadsGridPersistColumns: async (newColumns: Column[], user?: any) => {
    try {
      // Update slice state first
      set(state => {
        state.columns = newColumns
      })

      // Save to localStorage immediately for fast access
      saveColumnsToLocal(newColumns)

      // Save to Supabase for persistence across devices
      if (user) {
        const { supabase } = await import('@/integrations/supabase/client')
        await supabase.from('user_settings' as any).upsert({
          user_id: user.id,
          setting_key: 'grid_columns',
          setting_value: newColumns,
        })
      }
    } catch (error) {
      logger.error('Error persisting columns:', error)

      // Set error state
      set(state => {
        state.editableLeadsGridErrors.persistence = error instanceof Error ? error.message : 'Failed to persist columns'
      })

      throw error // Re-throw for caller to handle
    }
  },

  /**
   * Load stored columns from localStorage and/or Supabase
   * @param user - User object for Supabase operations (optional)
   * @param renderSocialLink - Function to render social links (optional)
   * @param renderNameLink - Function to render name links (optional)
   */
  editableLeadsGridLoadStoredColumns: async (user?: any, renderSocialLink?: any, renderNameLink?: any) => {
    try {
      // First try localStorage to avoid unnecessary network requests
      let storedColumns: Column[] | null = loadColumnsFromLocal()

      // Only try Supabase if no local storage and user is authenticated
      if (!storedColumns && user) {
        storedColumns = await loadColumnsFromSupabase(user)
      }

      // If we found stored columns, use them
      if (storedColumns && storedColumns.length > 0) {
        // Ensure renderCell functions are preserved for social links
        const columnsWithRenderFunctions = storedColumns.map(col => {
          if (['facebook', 'instagram', 'linkedin', 'twitter'].includes(col.id) && renderSocialLink) {
            return { ...col, renderCell: renderSocialLink }
          }
          if (col.id === 'name' && renderNameLink) {
            return {
              ...col,
              renderCell: renderNameLink,
            }
          }
          return col
        })

        // Update the slice state
        set(state => {
          state.columns = columnsWithRenderFunctions
        })
      }
    } catch (error) {
      logger.error('Error loading stored columns:', error)

      // Set error state
      set(state => {
        state.editableLeadsGridErrors.initialization =
          error instanceof Error ? error.message : 'Failed to load stored columns'
      })

      // Keep default columns on error - don't throw so the app continues working
    }
  },

  // 21. Save hidden columns - Persist hidden columns to localStorage and Supabase
  editableLeadsGridSaveHiddenColumns: async (hiddenCols: Column[]) => {
    try {
      console.log('🔄 Slice: Starting save hidden columns', { count: hiddenCols.length })

      // Update slice state first
      set({ hiddenColumns: hiddenCols })

      // Save to localStorage
      try {
        localStorage.setItem('hiddenColumns-v1', JSON.stringify(hiddenCols))
        console.log('✅ Saved hidden columns to localStorage')
      } catch (localStorageError) {
        console.warn('Failed to save hidden columns to localStorage:', localStorageError)
        // Continue even if localStorage fails
      }

      // Note: Supabase save will be handled by component since user context is needed
      console.log('✅ Hidden columns save to localStorage completed')
    } catch (error) {
      console.error('❌ Critical error in save hidden columns:', error)

      set(state => ({
        editableLeadsGridErrors: {
          ...state.editableLeadsGridErrors,
          persistence: error instanceof Error ? error.message : 'Failed to save hidden columns',
        },
      }))

      throw error // Re-throw for component handling
    }
  },

  // 22. Load hidden columns - Load hidden columns from localStorage and Supabase
  editableLeadsGridLoadHiddenColumns: async (user?: any) => {
    try {
      console.log('🔄 Slice: Starting load hidden columns', { hasUser: !!user })

      let storedHiddenColumns: Column[] | null = null

      // First try localStorage to avoid unnecessary network requests
      try {
        const savedHidden = localStorage.getItem('hiddenColumns-v1')
        if (savedHidden) {
          storedHiddenColumns = JSON.parse(savedHidden)
          console.log('✅ Loaded hidden columns from localStorage', { count: storedHiddenColumns?.length || 0 })
        }
      } catch (localStorageError) {
        console.warn('Failed to load hidden columns from localStorage:', localStorageError)
      }

      // Only try Supabase if no local storage and user is authenticated
      if (!storedHiddenColumns && user) {
        try {
          console.log('🗄️ Attempting to load hidden columns from Supabase')

          const { supabase } = await import('@/integrations/supabase/client')
          const { data, error } = await supabase
            .from('user_settings' as any) // Type assertion to bypass TypeScript error
            .select('setting_value')
            .eq('user_id', user.id)
            .eq('setting_key', 'hidden_columns')
            .single()

          if (data && !error) {
            storedHiddenColumns = (data as any).setting_value as Column[]
            console.log('✅ Loaded hidden columns from Supabase', { count: storedHiddenColumns?.length || 0 })

            // Save to localStorage for faster future loads
            try {
              localStorage.setItem('hiddenColumns-v1', JSON.stringify(storedHiddenColumns))
              console.log('✅ Cached hidden columns to localStorage')
            } catch (cacheError) {
              console.warn('Failed to cache hidden columns to localStorage:', cacheError)
            }
          } else if (error && error.code === '42P01') {
            // Table doesn't exist - silently fall back
            console.log('ℹ️ User settings table not found, using empty hidden columns')
          } else if (error && !error.message?.includes('404') && error.code !== 'PGRST116') {
            console.error('Error loading hidden columns from Supabase:', error)

            set(state => ({
              editableLeadsGridErrors: {
                ...state.editableLeadsGridErrors,
                persistence: `Failed to load hidden columns: ${error.message}`,
              },
            }))
          }
        } catch (supabaseError) {
          console.error('Failed to load hidden columns from Supabase:', supabaseError)

          set(state => ({
            editableLeadsGridErrors: {
              ...state.editableLeadsGridErrors,
              persistence: `Database load failed: ${supabaseError}`,
            },
          }))
        }
      }

      // Update slice state with loaded columns (or empty array if none found)
      const finalHiddenColumns = storedHiddenColumns || []
      set({ hiddenColumns: finalHiddenColumns })

      // Determine source for logging
      let source = 'default'
      if (storedHiddenColumns) {
        const hasLocalStorage = localStorage.getItem('hiddenColumns-v1')
        source = hasLocalStorage ? 'localStorage' : 'supabase'
      }

      console.log('✅ Hidden columns load operation completed', {
        count: finalHiddenColumns.length,
        source,
      })

      // Clear any previous persistence errors if successful
      if (storedHiddenColumns) {
        set(state => ({
          editableLeadsGridErrors: {
            ...state.editableLeadsGridErrors,
            persistence: null,
          },
        }))
      }
    } catch (error) {
      console.error('❌ Critical error in load hidden columns:', error)

      set(state => ({
        editableLeadsGridErrors: {
          ...state.editableLeadsGridErrors,
          persistence: error instanceof Error ? error.message : 'Failed to load hidden columns',
        },
      }))

      // Don't throw - use empty array as fallback
      set({ hiddenColumns: [] })
    }
  },

  /**
   * Open the delete column confirmation dialog
   * @param columnId - The ID of the column to delete
   * @param columnName - The name of the column to delete
   */
  editableLeadsGridOpenDeleteColumnDialog: (columnId: string, columnName: string) => {
    console.log('📝 Opening delete column dialog:', { columnId, columnName })
    set(state => {
      state.deleteColumnDialog = {
        isOpen: true,
        columnId,
        columnName,
      }
    })
    console.log('✅ Delete column dialog state updated')
  },

  /**
   * Close the delete column confirmation dialog
   */
  editableLeadsGridCloseDeleteColumnDialog: () => {
    set(state => {
      state.deleteColumnDialog = {
        isOpen: false,
        columnId: '',
        columnName: '',
      }
    })
  },

  /**
   * Add dynamic columns based on row data
   * @param rows - Array of row data to analyze for dynamic fields
   */
  editableLeadsGridAddDynamicColumns: (rows: any[]) => {
    const state = get()

    // Get dynamic columns that should be added
    const dynamicColumnsToAdd = state.editableLeadsGridGetDynamicColumnsToAdd(rows)

    if (dynamicColumnsToAdd.length > 0) {
      // Filter out columns that might already exist (extra safety check)
      const newColumns = dynamicColumnsToAdd.filter(newColumn => !state.columns.some(col => col.id === newColumn.id))

      if (newColumns.length > 0) {
        // Add the new columns to the existing columns
        set(state => {
          state.columns = [...state.columns, ...newColumns]
        })
      }
    }
  },

  /**
   * Extract dynamic fields from row data
   * @param rows - Array of row data to analyze
   * @returns Set of dynamic field names found in the data
   */
  editableLeadsGridExtractDynamicFields: (rows: any[]): Set<string> => {
    const dynamicFields = new Set<string>()

    // Get standard field names from default columns
    const standardFields = new Set(getDefaultColumns().map((col: any) => col.id))

    rows.forEach(row => {
      // Check fields directly on the row
      Object.keys(row).forEach(key => {
        if (!standardFields.has(key) && key !== 'id' && key !== 'data') {
          dynamicFields.add(key)
        }
      })

      // Check fields in the data object
      if (row.data && typeof row.data === 'object') {
        Object.keys(row.data).forEach(key => {
          // Skip internal fields
          if (!key.startsWith('_') && key !== 'account' && key !== 'importedAt') {
            dynamicFields.add(key)
          }
        })
      }
    })

    return dynamicFields
  },

  /**
   * Action 22: Handle window resize and adjust column widths accordingly
   * Adjusts column widths based on screen size (mobile vs desktop)
   */
  editableLeadsGridHandleResize: () => {
    const state = get()
    const isMobile = window.innerWidth < 768
    const columnWidth = isMobile ? MOBILE_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH

    logger.info('editableLeadsGridHandleResize', {
      isMobile,
      columnWidth,
      columnsCount: state.columns.length,
    })

    const updatedColumns = state.columns.map(col => {
      if (col.id === 'name') {
        return { ...col, width: isMobile ? 120 : 180 }
      }
      return { ...col, width: columnWidth }
    })

    set(state => {
      state.columns = updatedColumns
    })

    logger.info('editableLeadsGridHandleResize completed', {
      updatedColumnsCount: updatedColumns.length,
    })
  },

  /**
   * Action 23: Get column filters converted from activeFilters format
   * Converts activeFilters to ColumnFilter format for useInstantContacts hook
   * @returns Array of column filters in the format expected by useInstantContacts
   */
  editableLeadsGridGetColumnFilters: () => {
    const state = get()
    const { activeFilters, columns } = state

    logger.info('editableLeadsGridGetColumnFilters', {
      activeFiltersColumns: activeFilters.columns?.length || 0,
      hasFilterValues: Object.keys(activeFilters.values || {}).length > 0,
    })

    if (!activeFilters.columns || activeFilters.columns.length === 0) {
      return []
    }

    const columnFilters = activeFilters.columns
      .map(columnId => {
        const filterValue = activeFilters.values[columnId] as any // Type assertion since it's unknown
        const column = columns.find(col => col.id === columnId)

        if (!filterValue || !column) return null

        // Convert based on filter type
        if (filterValue.type === 'text') {
          if (filterValue.operator === 'is_empty') {
            return { columnId, value: null, type: 'text', operator: 'is_empty' }
          } else if (filterValue.operator === 'is_not_empty') {
            return { columnId, value: null, type: 'text', operator: 'is_not_empty' }
          } else if (filterValue.text?.trim()) {
            return {
              columnId,
              value: filterValue.text.trim(),
              type: 'text',
              operator: filterValue.operator,
            }
          }
        } else if (filterValue.type === 'dropdown') {
          // Handle both single-select and multi-select dropdown filters
          if (filterValue.values && Array.isArray(filterValue.values) && filterValue.values.length > 0) {
            // Multi-select dropdown
            return {
              columnId,
              value: filterValue.values,
              type: 'dropdown',
            }
          } else if (filterValue.value && filterValue.value !== '' && filterValue.value !== '__all__') {
            // Single-select dropdown
            return {
              columnId,
              value: filterValue.value,
              type: 'dropdown',
            }
          }
        } else if (filterValue.type === 'status') {
          if (filterValue.statuses?.length > 0) {
            return {
              columnId,
              value: filterValue.statuses,
              type: 'status',
            }
          }
        } else if (filterValue.type === 'date') {
          logger.info('Processing date filter', {
            columnId,
            operator: filterValue.operator,
            startDate: filterValue.startDate,
            endDate: filterValue.endDate,
          })

          if (filterValue.operator === 'is_empty') {
            return { columnId, value: null, type: 'date', operator: 'is_empty' }
          } else if (filterValue.operator === 'is_not_empty') {
            return { columnId, value: null, type: 'date', operator: 'is_not_empty' }
          } else if (filterValue.startDate || filterValue.endDate) {
            // Convert the filter format to match what useInstantContacts expects
            const dateFilter: any = {
              columnId,
              type: 'date',
              operator: filterValue.operator,
            }

            if (filterValue.operator === 'between' && filterValue.startDate && filterValue.endDate) {
              dateFilter.value = {
                start: filterValue.startDate,
                end: filterValue.endDate,
              }
            } else if (filterValue.operator === 'before' && filterValue.startDate) {
              dateFilter.value = { end: filterValue.startDate }
            } else if (filterValue.operator === 'after' && filterValue.startDate) {
              dateFilter.value = { start: filterValue.startDate }
            } else if (filterValue.operator === 'on' && filterValue.startDate) {
              dateFilter.value = {
                start: filterValue.startDate,
                end: filterValue.startDate,
              }
            } else {
              // Fallback for other operators or missing dates
              logger.warn('Date filter missing required dates', { filterValue })
              return null
            }

            logger.info('Created date filter', { dateFilter })
            return dateFilter
          } else {
            logger.warn('Date filter missing startDate/endDate', { filterValue })
          }
        } else if (filterValue.type === 'number') {
          if (filterValue.operator === 'is_empty') {
            return { columnId, value: null, type: 'number', operator: 'is_empty' }
          } else if (filterValue.operator === 'is_not_empty') {
            return { columnId, value: null, type: 'number', operator: 'is_not_empty' }
          } else if (filterValue.number1 !== undefined) {
            const numberFilter: any = {
              columnId,
              type: 'number',
              operator: filterValue.operator,
            }

            if (filterValue.operator === 'between') {
              numberFilter.value = {
                min: filterValue.number1,
                max: filterValue.number2,
              }
            } else {
              numberFilter.value = filterValue.number1
            }

            return numberFilter
          }
        }

        return null
      })
      .filter(filter => filter !== null)

    logger.info('editableLeadsGridGetColumnFilters completed', {
      filtersCreated: columnFilters.length,
    })

    return columnFilters
  },

  /**
   * Get dynamic columns that should be added based on row data
   * @param rows - Array of row data to analyze
   * @returns Array of Column objects for dynamic fields that should be added
   */
  editableLeadsGridGetDynamicColumnsToAdd: (rows: any[]): Column[] => {
    const state = get()

    // Extract dynamic fields from rows
    const dynamicFields = state.editableLeadsGridExtractDynamicFields(rows)

    // Filter fields that should be added (not already in columns, not deleted)
    const fieldsToAdd = Array.from(dynamicFields).filter(
      field => !state.columns.some(col => col.id === field) && !state.deletedColumnIds.has(field),
    )

    // Convert fields to Column objects
    return fieldsToAdd.map(field => ({
      id: field,
      title: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
      type: 'text' as const,
      width: 200, // DEFAULT_COLUMN_WIDTH
      editable: true,
    }))
  },

  editableLeadsGridClearError: (operation: keyof IEditableLeadsGridErrorState) => {
    set(state => {
      state.editableLeadsGridErrors[operation] = null
    })
  },

  editableLeadsGridClearAllErrors: () => {
    set(state => {
      state.editableLeadsGridErrors = {
        columnOperation: null,
        persistence: null,
        contactDeletion: null,
        initialization: null,
      }
    })
  },
})
