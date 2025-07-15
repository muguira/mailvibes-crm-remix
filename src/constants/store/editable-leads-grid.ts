/**
 * @fileoverview Constants for the Editable Leads Grid slice
 * @description Defines initial states, error messages, success messages,
 * and configuration constants for the EditableLeadsGrid Zustand slice
 */

import {
  IEditableLeadsGridErrorState,
  IEditableLeadsGridLoadingState,
  IActiveFilters,
  IColumnOperationLoading,
  IDeleteColumnDialog,
} from "@/types/store/editable-leads-grid";

/**
 * Initial loading state for the editable leads grid
 */
export const INITIAL_EDITABLE_LEADS_GRID_LOADING_STATE: IEditableLeadsGridLoadingState =
  {
    initializing: false,
    columnOperation: false,
    contactDeletion: false,
    persistence: false,
  };

/**
 * Initial error state for the editable leads grid
 */
export const INITIAL_EDITABLE_LEADS_GRID_ERROR_STATE: IEditableLeadsGridErrorState =
  {
    columnOperation: null,
    persistence: null,
    contactDeletion: null,
    initialization: null,
  };

/**
 * Initial active filters state
 */
export const INITIAL_ACTIVE_FILTERS: IActiveFilters = {
  columns: [],
  values: {},
};

/**
 * Initial column operation loading state
 */
export const INITIAL_COLUMN_OPERATION_LOADING: IColumnOperationLoading = {
  type: null,
  columnId: undefined,
};

/**
 * Initial delete column dialog state
 */
export const INITIAL_DELETE_COLUMN_DIALOG: IDeleteColumnDialog = {
  isOpen: false,
  columnId: "",
  columnName: "",
};

/**
 * Initial state for the editable leads grid slice
 */
export const INITIAL_EDITABLE_LEADS_GRID_STATE = {
  // Core state
  searchTerm: "",
  activeFilters: INITIAL_ACTIVE_FILTERS,
  columns: [],
  hiddenColumns: [],
  deletedColumnIds: new Set<string>(),

  // Pagination state
  currentPage: 1,
  pageSize: 20,

  // Loading states
  editableLeadsGridLoading: INITIAL_EDITABLE_LEADS_GRID_LOADING_STATE,
  columnOperationLoading: INITIAL_COLUMN_OPERATION_LOADING,
  isContactDeletionLoading: false,

  // Dialog states
  deleteColumnDialog: INITIAL_DELETE_COLUMN_DIALOG,

  // Internal state
  forceRenderKey: 0,
  isInitialized: false,
  lastSyncAt: null,

  // Error states
  editableLeadsGridErrors: INITIAL_EDITABLE_LEADS_GRID_ERROR_STATE,
};

/**
 * Reset state for the editable leads grid slice
 * Preserves deleted column IDs across resets
 */
export const RESET_EDITABLE_LEADS_GRID_STATE = {
  ...INITIAL_EDITABLE_LEADS_GRID_STATE,
  // Keep deleted column IDs on reset
  deletedColumnIds: new Set<string>(),
};

/**
 * Error messages for the editable leads grid operations
 */
export const EDITABLE_LEADS_GRID_ERROR_MESSAGES = {
  INITIALIZATION_FAILED: "Failed to initialize leads grid",
  COLUMN_OPERATION_FAILED: "Failed to perform column operation",
  COLUMN_ADD_FAILED: "Failed to add new column",
  COLUMN_DELETE_FAILED: "Failed to delete column",
  COLUMN_HIDE_FAILED: "Failed to hide column",
  COLUMN_UNHIDE_FAILED: "Failed to unhide column",
  COLUMN_REORDER_FAILED: "Failed to reorder columns",
  PERSISTENCE_FAILED: "Failed to save grid configuration",
  CONTACT_DELETION_FAILED: "Failed to delete contacts",
  LOAD_COLUMNS_FAILED: "Failed to load column configuration",
  LOAD_HIDDEN_COLUMNS_FAILED: "Failed to load hidden columns",
  INVALID_COLUMN_TYPE: "Invalid column type specified",
  COLUMN_NOT_FOUND: "Column not found",
  INVALID_USER: "Invalid user for operation",
  NETWORK_ERROR: "Network error occurred",
  PERMISSION_DENIED: "Permission denied for operation",
};

/**
 * Success messages for the editable leads grid operations
 */
export const EDITABLE_LEADS_GRID_SUCCESS_MESSAGES = {
  INITIALIZATION_SUCCESS: "Leads grid initialized successfully",
  COLUMN_ADDED: "Column added successfully",
  COLUMN_DELETED: "Column deleted successfully",
  COLUMN_HIDDEN: "Column hidden successfully",
  COLUMN_UNHIDDEN: "Column unhidden successfully",
  COLUMNS_REORDERED: "Columns reordered successfully",
  CONFIGURATION_SAVED: "Grid configuration saved successfully",
  CONTACTS_DELETED: "Contacts deleted successfully",
  COLUMNS_LOADED: "Column configuration loaded successfully",
  HIDDEN_COLUMNS_LOADED: "Hidden columns loaded successfully",
};

/**
 * Configuration constants for the editable leads grid
 */
export const EDITABLE_LEADS_GRID_CONFIG = {
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MIN_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],

  // Columns
  MAX_COLUMNS: 50,
  MIN_COLUMN_WIDTH: 100,
  MAX_COLUMN_WIDTH: 500,

  // Storage keys
  STORAGE_KEYS: {
    COLUMNS: "grid-columns-v1",
    HIDDEN_COLUMNS: "hiddenColumns-v1",
    DELETED_COLUMNS: "deletedColumnIds",
    PAGE_SIZE: "grid-page-size-v1",
  },

  // Supabase settings keys
  SUPABASE_SETTINGS_KEYS: {
    COLUMNS: "grid_columns",
    HIDDEN_COLUMNS: "hidden_columns",
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
    STATUS_OPTIONS: [
      "New",
      "In Progress",
      "On Hold",
      "Closed Won",
      "Closed Lost",
    ],
    STATUS_COLORS: {
      New: "#E4E5E8",
      "In Progress": "#DBCDF0",
      "On Hold": "#C6DEF1",
      "Closed Won": "#C9E4DE",
      "Closed Lost": "#F4C6C6",
    },
    CURRENCY_TYPE: "USD",
  },

  // Protected columns that cannot be deleted
  PROTECTED_COLUMNS: [
    "name",
    "email",
    "company",
    "phone",
    "status",
    "owner",
    "revenue",
    "source",
    "created_at",
    "updated_at",
  ],
};

/**
 * Validation rules for the editable leads grid
 */
export const EDITABLE_LEADS_GRID_VALIDATION = {
  SEARCH_TERM: {
    MIN_LENGTH: 0,
    MAX_LENGTH: 255,
  },
  COLUMN_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  PAGE_SIZE: {
    MIN: EDITABLE_LEADS_GRID_CONFIG.MIN_PAGE_SIZE,
    MAX: EDITABLE_LEADS_GRID_CONFIG.MAX_PAGE_SIZE,
  },
};
