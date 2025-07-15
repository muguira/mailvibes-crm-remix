/**
 * @fileoverview Types for the Editable Leads Grid slice
 * @description Defines all types, interfaces, and enums needed for the
 * EditableLeadsGrid Zustand slice state management
 */

import { Column } from '@/components/grid-view/types'

/**
 * Column operation types that can be performed
 */
export type TColumnOperationType = 'add' | 'delete' | 'rename' | 'hide' | 'unhide' | null

/**
 * Column filter for instant contacts hook
 */
export interface IColumnFilter {
  columnId: string
  value: any
  type: 'text' | 'dropdown' | 'status' | 'date' | 'number'
  operator?: string
}

/**
 * Active filters state structure
 */
export interface IActiveFilters {
  columns: string[]
  values: Record<string, unknown>
}

/**
 * Column operation loading state
 */
export interface IColumnOperationLoading {
  type: TColumnOperationType
  columnId?: string
}

/**
 * Delete column dialog state
 */
export interface IDeleteColumnDialog {
  isOpen: boolean
  columnId: string
  columnName: string
}

/**
 * Error states for the editable leads grid
 */
export interface IEditableLeadsGridErrorState {
  columnOperation: string | null
  persistence: string | null
  contactDeletion: string | null
  initialization: string | null
}

/**
 * Loading states for the editable leads grid
 */
export interface IEditableLeadsGridLoadingState {
  initializing: boolean
  columnOperation: boolean
  contactDeletion: boolean
  persistence: boolean
}

/**
 * Column insertion configuration
 */
export interface IColumnInsertConfig {
  currencyType?: string
  options?: string[]
  colors?: Record<string, string>
}

/**
 * Main store interface for the Editable Leads Grid slice
 */
export interface TEditableLeadsGridStore {
  // ==================== STATE ====================

  // Core state
  searchTerm: string
  activeFilters: IActiveFilters
  columns: Column[]
  hiddenColumns: Column[]
  deletedColumnIds: Set<string>

  // Pagination state
  currentPage: number
  pageSize: number

  // Loading states
  editableLeadsGridLoading: IEditableLeadsGridLoadingState
  columnOperationLoading: IColumnOperationLoading
  isContactDeletionLoading: boolean

  // Dialog states
  deleteColumnDialog: IDeleteColumnDialog

  // Internal state
  forceRenderKey: number
  isInitialized: boolean
  lastSyncAt: string | null

  // Error states (renamed to avoid conflict with TTaskStore)
  editableLeadsGridErrors: IEditableLeadsGridErrorState

  // ==================== ACTIONS ====================

  // Initialization and reset
  editableLeadsGridInitialize: (user: any) => Promise<void>
  editableLeadsGridReset: () => void

  // Search and filters
  editableLeadsGridSetSearchTerm: (term: string) => void
  editableLeadsGridSetActiveFilters: (filters: IActiveFilters) => void

  // Pagination
  editableLeadsGridSetCurrentPage: (page: number) => void
  editableLeadsGridSetPageSize: (size: number) => void
  editableLeadsGridHandlePageChange: (page: number) => void
  editableLeadsGridHandlePageSizeChange: (size: number) => void

  // Column management
  editableLeadsGridSetColumns: (columns: Column[]) => void
  editableLeadsGridSetHiddenColumns: (columns: Column[]) => void
  editableLeadsGridSetDeletedColumnIds: (ids: Set<string>) => void
  editableLeadsGridSetDeleteColumnDialog: (dialog: IDeleteColumnDialog) => void
  editableLeadsGridSetColumnOperationLoading: (loading: IColumnOperationLoading) => void
  editableLeadsGridSetIsContactDeletionLoading: (loading: boolean) => void
  editableLeadsGridAddColumn: (afterColumnId: string) => Promise<void>
  editableLeadsGridInsertColumn: (
    direction: 'left' | 'right',
    targetIndex: number,
    headerName: string,
    columnType: string,
    config?: IColumnInsertConfig,
  ) => Promise<void>
  editableLeadsGridDeleteColumn: (columnId: string) => Promise<void>
  editableLeadsGridHideColumn: (columnId: string) => Promise<void>
  editableLeadsGridUnhideColumn: (columnId: string) => Promise<void>
  editableLeadsGridReorderColumns: (columnIds: string[]) => void

  // Column persistence
  editableLeadsGridPersistColumns: (columns: Column[]) => Promise<void>
  editableLeadsGridLoadStoredColumns: () => Promise<void>
  editableLeadsGridSaveHiddenColumns: (columns: Column[]) => Promise<void>
  editableLeadsGridLoadHiddenColumns: () => Promise<void>

  // Contact operations
  editableLeadsGridDeleteContacts: (contactIds: string[]) => Promise<void>

  // Dialog management
  editableLeadsGridOpenDeleteColumnDialog: (columnId: string, columnName: string) => void
  editableLeadsGridCloseDeleteColumnDialog: () => void
  editableLeadsGridConfirmDeleteColumn: () => Promise<void>

  // Dynamic columns
  editableLeadsGridAddDynamicColumns: (rows: any[]) => void
  editableLeadsGridExtractDynamicFields: (rows: any[]) => Set<string>

  // Utilities
  editableLeadsGridForceRerender: () => void
  editableLeadsGridHandleResize: () => void

  // Computed getters
  editableLeadsGridGetColumnFilters: () => IColumnFilter[]
  editableLeadsGridGetTotalPages: (totalCount: number) => number
  editableLeadsGridGetGridKey: () => string
  editableLeadsGridGetDynamicColumnsToAdd: (rows: any[]) => Column[]

  // Error management
  editableLeadsGridClearError: (operation: keyof IEditableLeadsGridErrorState) => void
  editableLeadsGridClearAllErrors: () => void

  // Cell editing
  editableLeadsGridHandleCellEdit: (rowId: string, columnId: string, value: any) => Promise<void>
}

/**
 * Input type for column insertion
 */
export interface TColumnInsertInput {
  direction: 'left' | 'right'
  targetIndex: number
  headerName: string
  columnType: string
  config?: IColumnInsertConfig
}

/**
 * Column persistence options
 */
export interface IColumnPersistenceOptions {
  localStorage: boolean
  supabase: boolean
}

/**
 * Grid initialization options
 */
export interface IGridInitializationOptions {
  loadColumns: boolean
  loadHiddenColumns: boolean
  loadDeletedColumns: boolean
}
