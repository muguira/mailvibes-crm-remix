/**
 * @fileoverview Constants for the Editable Opportunities Grid slice
 * @description Defines initial states, error messages, success messages,
 * and configuration constants for the EditableOpportunitiesGrid Zustand slice
 */

import {
  IEditableOpportunitiesGridErrorState,
  IEditableOpportunitiesGridLoadingState,
  IActiveFilters,
  IColumnOperationLoading,
  IDeleteColumnDialog,
} from '@/types/store/editable-opportunities-grid'

/**
 * Initial loading state for the editable opportunities grid
 */
export const INITIAL_EDITABLE_OPPORTUNITIES_GRID_LOADING_STATE: IEditableOpportunitiesGridLoadingState = {
  initializing: false,
  columnOperation: false,
  opportunityDeletion: false,
  persistence: false,
}

/**
 * Initial error state for the editable opportunities grid
 */
export const INITIAL_EDITABLE_OPPORTUNITIES_GRID_ERROR_STATE: IEditableOpportunitiesGridErrorState = {
  columnOperation: null,
  persistence: null,
  opportunityDeletion: null,
  initialization: null,
}

/**
 * Initial active filters state
 */
export const INITIAL_ACTIVE_FILTERS: IActiveFilters = {
  columns: [],
  values: {},
}

/**
 * Initial column operation loading state
 */
export const INITIAL_COLUMN_OPERATION_LOADING: IColumnOperationLoading = {
  type: null,
  columnId: undefined,
}

/**
 * Initial delete column dialog state
 */
export const INITIAL_DELETE_COLUMN_DIALOG: IDeleteColumnDialog = {
  isOpen: false,
  columnId: '',
  columnName: '',
}

/**
 * Initial state for the editable opportunities grid slice
 */
export const INITIAL_EDITABLE_OPPORTUNITIES_GRID_STATE = {
  // Core state
  searchTerm: '',
  activeFilters: INITIAL_ACTIVE_FILTERS,
  columns: [],
  hiddenColumns: [],
  deletedColumnIds: new Set<string>(),

  // Pagination state
  currentPage: 1,
  pageSize: 50,

  // Loading states
  editableOpportunitiesGridLoading: INITIAL_EDITABLE_OPPORTUNITIES_GRID_LOADING_STATE,
  columnOperationLoading: INITIAL_COLUMN_OPERATION_LOADING,
  isOpportunityDeletionLoading: false,

  // Dialog states
  deleteColumnDialog: INITIAL_DELETE_COLUMN_DIALOG,

  // Last cell edit tracking
  lastCellEdit: null,

  // Last opportunity deletion tracking
  lastOpportunityDeletion: null,

  // Last initialization tracking
  lastInitialization: null,

  // Internal state
  forceRenderKey: 0,
  isInitialized: false,
  lastSyncAt: null,

  // Error states
  editableOpportunitiesGridErrors: INITIAL_EDITABLE_OPPORTUNITIES_GRID_ERROR_STATE,
}

/**
 * Error messages for the editable opportunities grid operations
 */
export const EDITABLE_OPPORTUNITIES_GRID_ERROR_MESSAGES = {
  INITIALIZATION_FAILED: 'Failed to initialize opportunities grid',
  COLUMN_OPERATION_FAILED: 'Failed to perform column operation',
  COLUMN_ADD_FAILED: 'Failed to add new column',
  COLUMN_DELETE_FAILED: 'Failed to delete column',
  COLUMN_HIDE_FAILED: 'Failed to hide column',
  COLUMN_UNHIDE_FAILED: 'Failed to unhide column',
  COLUMN_REORDER_FAILED: 'Failed to reorder columns',
  PERSISTENCE_FAILED: 'Failed to save grid configuration',
  OPPORTUNITY_DELETION_FAILED: 'Failed to delete opportunities',
  LOAD_COLUMNS_FAILED: 'Failed to load column configuration',
  LOAD_HIDDEN_COLUMNS_FAILED: 'Failed to load hidden columns',
  INVALID_COLUMN_TYPE: 'Invalid column type specified',
  COLUMN_NOT_FOUND: 'Column not found',
  INVALID_USER: 'Invalid user for operation',
  NETWORK_ERROR: 'Network error occurred',
  PERMISSION_DENIED: 'Permission denied for operation',
}

/**
 * Success messages for the editable opportunities grid operations
 */
export const EDITABLE_OPPORTUNITIES_GRID_SUCCESS_MESSAGES = {
  INITIALIZATION_SUCCESS: 'Opportunities grid initialized successfully',
  COLUMN_ADDED: 'Column added successfully',
  COLUMN_DELETED: 'Column deleted successfully',
  COLUMN_HIDDEN: 'Column hidden successfully',
  COLUMN_UNHIDDEN: 'Column unhidden successfully',
  COLUMNS_REORDERED: 'Columns reordered successfully',
  CONFIGURATION_SAVED: 'Grid configuration saved successfully',
  OPPORTUNITIES_DELETED: 'Opportunities deleted successfully',
  COLUMNS_LOADED: 'Column configuration loaded successfully',
  HIDDEN_COLUMNS_LOADED: 'Hidden columns loaded successfully',
}

/**
 * Configuration constants for the editable opportunities grid
 */
export const EDITABLE_OPPORTUNITIES_GRID_CONFIG = {
  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  MIN_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 2000,
  PAGE_SIZE_OPTIONS: [20, 50, 100, 500, 1000],

  // Columns
  MAX_COLUMNS: 50,
  MIN_COLUMN_WIDTH: 100,
  MAX_COLUMN_WIDTH: 500,

  // Storage keys
  STORAGE_KEYS: {
    COLUMNS: 'opportunities-grid-columns-v1',
    HIDDEN_COLUMNS: 'opportunities-hiddenColumns-v1',
    DELETED_COLUMNS: 'opportunities-deletedColumnIds',
    PAGE_SIZE: 'opportunities-grid-page-size-v1',
  },

  // Supabase settings keys
  SUPABASE_SETTINGS_KEYS: {
    COLUMNS: 'opportunities_grid_columns',
    HIDDEN_COLUMNS: 'opportunities_hidden_columns',
  },

  // Debounce delays
  DEBOUNCE_DELAYS: {
    SEARCH: 200,
    PERSISTENCE: 500,
  },

  // Retry configuration
  RETRY_CONFIG: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    BACKOFF_MULTIPLIER: 2,
  },

  // Default column configuration
  DEFAULT_COLUMN_CONFIG: {
    STATUS_OPTIONS: ['Lead/New', 'Qualified', 'Discovery', 'Proposal', 'Negotiation', 'Closing', 'Won', 'Lost'],
    STATUS_COLORS: {
      'Lead/New': '#6b7280',
      'Qualified': '#3b82f6',
      'Discovery': '#f97316',
      'Proposal': '#eab308',
      'Negotiation': '#8b5cf6',
      'Closing': '#06b6d4',
      'Won': '#22c55e',
      'Lost': '#ef4444',
    },
    CURRENCY_TYPE: 'USD',
  },

  // Protected columns that cannot be deleted
  PROTECTED_COLUMNS: [
    'opportunity',
    'status',
    'revenue',
    'closeDate',
    'owner',
    'companyName',
    'priority',
    'created_at',
    'updated_at',
  ],
}

/**
 * Default status options for opportunity status column
 */
export const DEFAULT_OPPORTUNITY_STATUS_OPTIONS = EDITABLE_OPPORTUNITIES_GRID_CONFIG.DEFAULT_COLUMN_CONFIG.STATUS_OPTIONS

/**
 * Default status colors for opportunity status column
 */
export const DEFAULT_OPPORTUNITY_STATUS_COLORS = EDITABLE_OPPORTUNITIES_GRID_CONFIG.DEFAULT_COLUMN_CONFIG.STATUS_COLORS 