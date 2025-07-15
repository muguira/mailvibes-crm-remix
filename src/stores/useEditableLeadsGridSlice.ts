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
import {
  TEditableLeadsGridStore,
  IActiveFilters,
  IDeleteColumnDialog,
  IColumnOperationLoading,
  IEditableLeadsGridErrorState,
} from '@/types/store/editable-leads-grid'
import { Column } from '@/components/grid-view/types'
import { INITIAL_EDITABLE_LEADS_GRID_STATE } from '@/constants/store/editable-leads-grid'

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

  editableLeadsGridInitialize: async () => {
    console.log('editableLeadsGridInitialize - placeholder')
  },

  editableLeadsGridReset: () => {
    console.log('editableLeadsGridReset - placeholder')
  },

  editableLeadsGridHandlePageChange: () => {
    console.log('editableLeadsGridHandlePageChange - placeholder')
  },

  editableLeadsGridHandlePageSizeChange: () => {
    console.log('editableLeadsGridHandlePageSizeChange - placeholder')
  },

  editableLeadsGridAddColumn: async () => {
    console.log('editableLeadsGridAddColumn - placeholder')
  },

  editableLeadsGridInsertColumn: async () => {
    console.log('editableLeadsGridInsertColumn - placeholder')
  },

  editableLeadsGridDeleteColumn: async () => {
    console.log('editableLeadsGridDeleteColumn - placeholder')
  },

  editableLeadsGridHideColumn: async () => {
    console.log('editableLeadsGridHideColumn - placeholder')
  },

  editableLeadsGridUnhideColumn: async () => {
    console.log('editableLeadsGridUnhideColumn - placeholder')
  },

  editableLeadsGridReorderColumns: () => {
    console.log('editableLeadsGridReorderColumns - placeholder')
  },

  editableLeadsGridPersistColumns: async () => {
    console.log('editableLeadsGridPersistColumns - placeholder')
  },

  editableLeadsGridLoadStoredColumns: async () => {
    console.log('editableLeadsGridLoadStoredColumns - placeholder')
  },

  editableLeadsGridSaveHiddenColumns: async () => {
    console.log('editableLeadsGridSaveHiddenColumns - placeholder')
  },

  editableLeadsGridLoadHiddenColumns: async () => {
    console.log('editableLeadsGridLoadHiddenColumns - placeholder')
  },

  editableLeadsGridDeleteContacts: async () => {
    console.log('editableLeadsGridDeleteContacts - placeholder')
  },

  editableLeadsGridOpenDeleteColumnDialog: () => {
    console.log('editableLeadsGridOpenDeleteColumnDialog - placeholder')
  },

  editableLeadsGridCloseDeleteColumnDialog: () => {
    console.log('editableLeadsGridCloseDeleteColumnDialog - placeholder')
  },

  editableLeadsGridConfirmDeleteColumn: async () => {
    console.log('editableLeadsGridConfirmDeleteColumn - placeholder')
  },

  editableLeadsGridAddDynamicColumns: () => {
    console.log('editableLeadsGridAddDynamicColumns - placeholder')
  },

  editableLeadsGridExtractDynamicFields: () => {
    console.log('editableLeadsGridExtractDynamicFields - placeholder')
    return new Set<string>()
  },

  editableLeadsGridHandleResize: () => {
    console.log('editableLeadsGridHandleResize - placeholder')
  },

  editableLeadsGridGetColumnFilters: () => {
    console.log('editableLeadsGridGetColumnFilters - placeholder')
    return []
  },

  editableLeadsGridGetDynamicColumnsToAdd: () => {
    console.log('editableLeadsGridGetDynamicColumnsToAdd - placeholder')
    return []
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

  editableLeadsGridHandleCellEdit: async () => {
    console.log('editableLeadsGridHandleCellEdit - placeholder')
  },
})
