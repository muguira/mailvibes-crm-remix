/**
 * @fileoverview Editable Leads Grid slice for Zustand store
 * @description This slice manages the complete leads grid state including search,
 * filtering, pagination, column management, data persistence, and contact operations.
 * It provides a centralized state management solution for the EditableLeadsGrid component.
 *
 * @author Mailvibes CRM Team
 * @version 1.0.0
 */

import { StateCreator } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { TStore } from "@/types/store/store";
import {
  TEditableLeadsGridStore,
  IColumnFilter,
  IActiveFilters,
  IColumnInsertConfig,
  IEditableLeadsGridErrorState,
  IDeleteColumnDialog,
  IColumnOperationLoading,
} from "@/types/store/editable-leads-grid";
import { Column } from "@/components/grid-view/types";
import {
  INITIAL_EDITABLE_LEADS_GRID_STATE,
  RESET_EDITABLE_LEADS_GRID_STATE,
  EDITABLE_LEADS_GRID_ERROR_MESSAGES,
  EDITABLE_LEADS_GRID_SUCCESS_MESSAGES,
  EDITABLE_LEADS_GRID_CONFIG,
} from "@/constants/store/editable-leads-grid";
import {
  getDefaultColumns,
  saveColumnsToLocal,
  loadColumnsFromLocal,
  loadColumnsFromSupabase,
  extractDynamicFields,
  syncContact,
} from "@/helpers/grid";
import {
  DEFAULT_COLUMN_WIDTH,
  MOBILE_COLUMN_WIDTH,
} from "@/components/grid-view/grid-constants";
import { renderSocialLink } from "@/components/grid-view/RenderSocialLink";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { logger } from "@/utils/logger";

/**
 * Editable Leads Grid slice for Zustand store
 *
 * Manages the complete leads grid state including:
 * - Search and filtering functionality
 * - Column management (add, delete, hide, reorder)
 * - Pagination state
 * - Data persistence to localStorage and Supabase
 * - Contact operations (delete, bulk operations)
 * - Dynamic column detection and addition
 * - Error handling and loading states
 * - Dialog states
 *
 * @example
 * ```typescript
 * // Usage in component
 * const {
 *   searchTerm,
 *   columns,
 *   currentPage,
 *   editableLeadsGridSetSearchTerm,
 *   editableLeadsGridAddColumn,
 *   editableLeadsGridDeleteColumn
 * } = useStore();
 *
 * // Set search term
 * editableLeadsGridSetSearchTerm("John Doe");
 *
 * // Add new column
 * await editableLeadsGridAddColumn("name");
 * ```
 */
export const useEditableLeadsGridSlice: StateCreator<
  TStore,
  [["zustand/subscribeWithSelector", never], ["zustand/immer", never]],
  [],
  TEditableLeadsGridStore
> = (set, get) => ({
  // ==================== INITIAL STATE ====================
  ...INITIAL_EDITABLE_LEADS_GRID_STATE,

  // ==================== INITIALIZATION & RESET ====================

  /**
   * Initialize the editable leads grid state
   * Loads columns from storage and sets up initial configuration
   * @param user - The authenticated user object
   * @returns Promise that resolves when initialization is complete
   */
  editableLeadsGridInitialize: async (user: any) => {
    const state = get();

    // Prevent multiple initializations
    if (state.isInitialized) {
      logger.debug("Editable leads grid already initialized, skipping...");
      return;
    }

    set((state) => {
      state.editableLeadsGridLoading.initializing = true;
      state.errors.initialization = null;
    });

    try {
      // Load default columns first
      const defaultColumns = getDefaultColumns();

      set((state) => {
        state.columns = defaultColumns;
      });

      // Load stored columns if available
      await get().editableLeadsGridLoadStoredColumns();

      // Load hidden columns
      await get().editableLeadsGridLoadHiddenColumns();

      // Load deleted column IDs from localStorage
      try {
        const saved = localStorage.getItem(
          EDITABLE_LEADS_GRID_CONFIG.STORAGE_KEYS.DELETED_COLUMNS
        );
        if (saved) {
          const deletedIds = JSON.parse(saved);
          set((state) => {
            state.deletedColumnIds = new Set(deletedIds);
          });
        }
      } catch (error) {
        logger.error("Failed to load deleted column IDs:", error);
      }

      set((state) => {
        state.isInitialized = true;
        state.lastSyncAt = new Date().toISOString();
        state.editableLeadsGridLoading.initializing = false;
      });

      logger.log("Editable leads grid initialized successfully");
    } catch (error) {
      logger.error("Error initializing editable leads grid:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : EDITABLE_LEADS_GRID_ERROR_MESSAGES.INITIALIZATION_FAILED;

      set((state) => {
        state.errors.initialization = errorMessage;
        state.editableLeadsGridLoading.initializing = false;
      });

      toast({
        title: "Initialization Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  },

  /**
   * Reset the editable leads grid state to initial values
   * Preserves deleted column IDs across resets
   */
  editableLeadsGridReset: () => {
    const currentDeletedIds = get().deletedColumnIds;

    set((state) => {
      Object.assign(state, RESET_EDITABLE_LEADS_GRID_STATE);
      // Preserve deleted column IDs
      state.deletedColumnIds = currentDeletedIds;
    });

    logger.log("Editable leads grid state reset");
  },

  // ==================== SEARCH & FILTERS ====================

  /**
   * Set the search term and reset pagination
   * @param term - The search term to set
   */
  editableLeadsGridSetSearchTerm: (term: string) => {
    set((state) => {
      // Only update if the term actually changed
      if (state.searchTerm !== term) {
        state.searchTerm = term;
        // Reset to first page when search term changes
        state.currentPage = 1;
      }
    });
  },

  /**
   * Set the active filters
   * @param filters - The filters to apply
   */
  editableLeadsGridSetActiveFilters: (filters: IActiveFilters) => {
    set((state) => {
      state.activeFilters = filters;
      // Reset to first page when filters change
      state.currentPage = 1;
    });
  },

  // ==================== PAGINATION ====================

  /**
   * Set the current page
   * @param page - The page number to set
   */
  editableLeadsGridSetCurrentPage: (page: number) => {
    set((state) => {
      state.currentPage = Math.max(1, page);
    });
  },

  /**
   * Set the page size
   * @param size - The page size to set
   */
  editableLeadsGridSetPageSize: (size: number) => {
    const validSize = Math.max(
      EDITABLE_LEADS_GRID_CONFIG.MIN_PAGE_SIZE,
      Math.min(size, EDITABLE_LEADS_GRID_CONFIG.MAX_PAGE_SIZE)
    );

    set((state) => {
      state.pageSize = validSize;
      // Reset to first page when page size changes
      state.currentPage = 1;
    });
  },

  /**
   * Handle page change with scroll to top
   * @param page - The page number to navigate to
   */
  editableLeadsGridHandlePageChange: (page: number) => {
    get().editableLeadsGridSetCurrentPage(page);

    // Scroll to top of grid when changing pages
    const gridElement = document.querySelector(".grid-components-container");
    if (gridElement) {
      gridElement.scrollTop = 0;
    }
  },

  /**
   * Handle page size change
   * @param size - The new page size
   */
  editableLeadsGridHandlePageSizeChange: (size: number) => {
    get().editableLeadsGridSetPageSize(size);
  },

  // ==================== COLUMN MANAGEMENT ====================

  /**
   * Set the columns array
   * @param columns - The columns to set
   */
  editableLeadsGridSetColumns: (columns: Column[]) => {
    set((state) => {
      state.columns = columns;
    });
  },

  /**
   * Set the hidden columns array
   * @param hiddenColumns - The hidden columns to set
   */
  editableLeadsGridSetHiddenColumns: (hiddenColumns: Column[]) => {
    set((state) => {
      state.hiddenColumns = hiddenColumns;
    });
  },

  /**
   * Set the deleted column IDs
   * @param deletedColumnIds - The deleted column IDs to set
   */
  editableLeadsGridSetDeletedColumnIds: (deletedColumnIds: Set<string>) => {
    set((state) => {
      state.deletedColumnIds = deletedColumnIds;
    });
  },

  /**
   * Set the delete column dialog state
   * @param dialog - The dialog state to set
   */
  editableLeadsGridSetDeleteColumnDialog: (dialog: IDeleteColumnDialog) => {
    set((state) => {
      state.deleteColumnDialog = dialog;
    });
  },

  /**
   * Set the column operation loading state
   * @param loading - The loading state to set
   */
  editableLeadsGridSetColumnOperationLoading: (
    loading: IColumnOperationLoading
  ) => {
    set((state) => {
      state.columnOperationLoading = loading;
    });
  },

  /**
   * Set the force render key
   * @param key - The key to set
   */
  editableLeadsGridSetForceRenderKey: (key: number) => {
    set((state) => {
      state.forceRenderKey = key;
    });
  },

  /**
   * Add a new column after the specified column
   * @param afterColumnId - The ID of the column to add after
   */
  editableLeadsGridAddColumn: async (afterColumnId: string) => {
    set((state) => {
      state.columnOperationLoading = { type: "add" };
    });

    try {
      const state = get();
      const columnId = `column-${uuidv4().substring(0, 8)}`;

      const newColumn: Column = {
        id: columnId,
        title: "New Column",
        type: "text",
        width: DEFAULT_COLUMN_WIDTH,
        editable: true,
      };

      // Find the index where we need to insert
      const afterIndex = state.columns.findIndex(
        (col) => col.id === afterColumnId
      );

      // Add the column at the right position
      const newColumns = [
        ...state.columns.slice(0, afterIndex + 1),
        newColumn,
        ...state.columns.slice(afterIndex + 1),
      ];

      set((state) => {
        state.columns = newColumns;
      });

      // Persist the new columns
      await get().editableLeadsGridPersistColumns(newColumns);

      toast({
        title: "Column Added",
        description: EDITABLE_LEADS_GRID_SUCCESS_MESSAGES.COLUMN_ADDED,
      });
    } catch (error) {
      logger.error("Error adding column:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : EDITABLE_LEADS_GRID_ERROR_MESSAGES.COLUMN_ADD_FAILED;

      set((state) => {
        state.errors.columnOperation = errorMessage;
      });

      toast({
        title: "Error Adding Column",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      set((state) => {
        state.columnOperationLoading = { type: null };
      });
    }
  },

  // ==================== PLACEHOLDER ACTIONS ====================
  // These will be implemented in the next phases

  editableLeadsGridInsertColumn: async (
    direction,
    targetIndex,
    headerName,
    columnType,
    config
  ) => {
    // TODO: Implement in Phase 3
    logger.warn("editableLeadsGridInsertColumn not yet implemented");
  },

  editableLeadsGridDeleteColumn: async (columnId) => {
    // TODO: Implement in Phase 3
    logger.warn("editableLeadsGridDeleteColumn not yet implemented");
  },

  editableLeadsGridHideColumn: async (columnId) => {
    // TODO: Implement in Phase 3
    logger.warn("editableLeadsGridHideColumn not yet implemented");
  },

  editableLeadsGridUnhideColumn: async (columnId) => {
    // TODO: Implement in Phase 3
    logger.warn("editableLeadsGridUnhideColumn not yet implemented");
  },

  editableLeadsGridReorderColumns: (columnIds) => {
    // TODO: Implement in Phase 3
    logger.warn("editableLeadsGridReorderColumns not yet implemented");
  },

  editableLeadsGridPersistColumns: async (columns) => {
    // TODO: Implement in Phase 3
    logger.warn("editableLeadsGridPersistColumns not yet implemented");
  },

  editableLeadsGridLoadStoredColumns: async () => {
    // TODO: Implement in Phase 3
    logger.warn("editableLeadsGridLoadStoredColumns not yet implemented");
  },

  editableLeadsGridSaveHiddenColumns: async (columns) => {
    // TODO: Implement in Phase 3
    logger.warn("editableLeadsGridSaveHiddenColumns not yet implemented");
  },

  editableLeadsGridLoadHiddenColumns: async () => {
    // TODO: Implement in Phase 3
    logger.warn("editableLeadsGridLoadHiddenColumns not yet implemented");
  },

  editableLeadsGridDeleteContacts: async (contactIds) => {
    // TODO: Implement in Phase 4
    logger.warn("editableLeadsGridDeleteContacts not yet implemented");
  },

  editableLeadsGridOpenDeleteColumnDialog: (columnId, columnName) => {
    // TODO: Implement in Phase 4
    logger.warn("editableLeadsGridOpenDeleteColumnDialog not yet implemented");
  },

  editableLeadsGridCloseDeleteColumnDialog: () => {
    // TODO: Implement in Phase 4
    logger.warn("editableLeadsGridCloseDeleteColumnDialog not yet implemented");
  },

  editableLeadsGridConfirmDeleteColumn: async () => {
    // TODO: Implement in Phase 4
    logger.warn("editableLeadsGridConfirmDeleteColumn not yet implemented");
  },

  editableLeadsGridAddDynamicColumns: (rows) => {
    // TODO: Implement in Phase 3
    logger.warn("editableLeadsGridAddDynamicColumns not yet implemented");
  },

  editableLeadsGridExtractDynamicFields: (rows) => {
    // TODO: Implement in Phase 3
    logger.warn("editableLeadsGridExtractDynamicFields not yet implemented");
    return new Set<string>();
  },

  editableLeadsGridForceRerender: () => {
    set((state) => {
      state.forceRenderKey = state.forceRenderKey + 1;
    });
  },

  editableLeadsGridHandleResize: () => {
    // TODO: Implement in Phase 3
    logger.warn("editableLeadsGridHandleResize not yet implemented");
  },

  editableLeadsGridGetColumnFilters: () => {
    // TODO: Implement in Phase 5
    logger.warn("editableLeadsGridGetColumnFilters not yet implemented");
    return [];
  },

  editableLeadsGridGetTotalPages: (totalCount) => {
    const state = get();
    return Math.ceil(totalCount / state.pageSize);
  },

  editableLeadsGridGetGridKey: () => {
    const state = get();
    return `grid-stable-${state.forceRenderKey}`;
  },

  editableLeadsGridGetDynamicColumnsToAdd: (rows) => {
    // TODO: Implement in Phase 5
    logger.warn("editableLeadsGridGetDynamicColumnsToAdd not yet implemented");
    return [];
  },

  editableLeadsGridClearError: (operation) => {
    set((state) => {
      state.errors[operation] = null;
    });
  },

  editableLeadsGridClearAllErrors: () => {
    set((state) => {
      state.errors.columnOperation = null;
      state.errors.persistence = null;
      state.errors.contactDeletion = null;
      state.errors.initialization = null;
    });
  },

  // ==========================================
  // CONTACT OPERATIONS (Advanced)
  // ==========================================

  /**
   * Handle cell editing with optimistic updates and error handling
   * @param rowId - The ID of the row being edited
   * @param columnId - The ID of the column being edited
   * @param value - The new value for the cell
   * @param oldValue - The previous value for rollback on error
   */
  editableLeadsGridHandleCellEdit: async (
    rowId: string,
    columnId: string,
    value: any,
    oldValue?: any
  ) => {
    try {
      // TODO: Implement cell editing with optimistic updates
      // This will be implemented in the next phase when integrating with the component
      console.log("Cell edit:", { rowId, columnId, value, oldValue });
    } catch (error) {
      console.error("Error updating cell:", error);
    }
  },

  /**
   * Handle contact deletion with batch operations
   * @param contactIds - Array of contact IDs to delete
   */
  editableLeadsGridDeleteContacts: async (contactIds: string[]) => {
    // TODO: Implement contact deletion with proper state management
    // This will be implemented in the component integration phase
    console.log("Delete contacts:", contactIds);
  },

  /**
   * Handle contact updates from external sources (e.g., stream view)
   * @param contactId - The ID of the contact being updated
   * @param field - The field being updated
   * @param value - The new value
   */
  editableLeadsGridHandleExternalContactUpdate: (
    contactId: string,
    field: string,
    value: any
  ) => {
    // TODO: Implement external contact update handling
    // This will be implemented in the component integration phase
    console.log("External contact update:", { contactId, field, value });
  },

  /**
   * Force refresh data from external sources
   */
  editableLeadsGridForceRerender: () => {
    set((state) => ({
      ...state,
      forceRenderKey: state.forceRenderKey + 1,
    }));
  },

  // ==========================================
  // COLUMN OPERATIONS (Advanced)
  // ==========================================

  /**
   * Handle column deletion with data cleanup
   * @param columnId - The ID of the column to delete
   */
  editableLeadsGridDeleteColumn: async (columnId: string) => {
    // TODO: Implement column deletion with proper state management
    // This will be implemented in the component integration phase
    console.log("Delete column:", columnId);
  },

  /**
   * Confirm column deletion after user confirmation
   */
  editableLeadsGridConfirmDeleteColumn: async () => {
    // TODO: Implement column deletion confirmation
    // This will be implemented in the component integration phase
    console.log("Confirm delete column");
  },

  /**
   * Handle adding a new column
   * @param afterColumnId - The ID of the column after which to insert
   */
  editableLeadsGridAddColumn: async (afterColumnId: string) => {
    // TODO: Implement column addition
    // This will be implemented in the component integration phase
    console.log("Add column after:", afterColumnId);
  },

  /**
   * Handle inserting a new column with specific configuration
   * @param direction - Direction to insert ('left' or 'right')
   * @param targetIndex - Index of the target column
   * @param headerName - Name for the new column header
   * @param columnType - Type of the new column
   * @param config - Additional configuration for the column
   */
  editableLeadsGridInsertColumn: async (
    direction: "left" | "right",
    targetIndex: number,
    headerName: string,
    columnType: string,
    config?: any
  ) => {
    // TODO: Implement column insertion
    // This will be implemented in the component integration phase
    console.log("Insert column:", {
      direction,
      targetIndex,
      headerName,
      columnType,
      config,
    });
  },

  /**
   * Handle hiding a column
   * @param columnId - The ID of the column to hide
   */
  editableLeadsGridHideColumn: async (columnId: string) => {
    // TODO: Implement column hiding
    // This will be implemented in the component integration phase
    console.log("Hide column:", columnId);
  },

  /**
   * Handle unhiding a column
   * @param columnId - The ID of the column to unhide
   */
  editableLeadsGridUnhideColumn: async (columnId: string) => {
    // TODO: Implement column unhiding
    // This will be implemented in the component integration phase
    console.log("Unhide column:", columnId);
  },

  /**
   * Handle columns reordering
   * @param columnIds - Array of column IDs in the new order
   */
  editableLeadsGridReorderColumns: async (columnIds: string[]) => {
    // TODO: Implement column reordering
    // This will be implemented in the component integration phase
    console.log("Reorder columns:", columnIds);
  },

  // ==========================================
  // STORAGE & PERSISTENCE
  // ==========================================

  /**
   * Persist columns to both localStorage and Supabase
   * @param columns - The columns to persist
   */
  editableLeadsGridPersistColumns: async (columns: Column[]) => {
    // TODO: Implement column persistence
    // This will be implemented in the component integration phase
    console.log("Persist columns:", columns.length);
  },

  /**
   * Save hidden columns to storage
   * @param hiddenColumns - The hidden columns to save
   */
  editableLeadsGridSaveHiddenColumns: async (hiddenColumns: TColumn[]) => {
    // TODO: Implement hidden columns saving
    // This will be implemented in the component integration phase
    console.log("Save hidden columns:", hiddenColumns.length);
  },

  /**
   * Load configuration from storage
   */
  editableLeadsGridLoadStoredColumns: async () => {
    // TODO: Implement configuration loading
    // This will be implemented in the component integration phase
    console.log("Load stored columns");
  },

  /**
   * Load hidden columns from storage
   */
  editableLeadsGridLoadHiddenColumns: async () => {
    // TODO: Implement hidden columns loading
    // This will be implemented in the component integration phase
    console.log("Load hidden columns");
  },

  // ==========================================
  // DIALOG MANAGEMENT
  // ==========================================

  /**
   * Open delete column dialog
   * @param columnId - The ID of the column to delete
   * @param columnName - The name of the column to delete
   */
  editableLeadsGridOpenDeleteColumnDialog: (
    columnId: string,
    columnName: string
  ) => {
    set((state) => ({
      ...state,
      deleteColumnDialog: {
        isOpen: true,
        columnId,
        columnName,
      },
    }));
  },

  /**
   * Close delete column dialog
   */
  editableLeadsGridCloseDeleteColumnDialog: () => {
    set((state) => ({
      ...state,
      deleteColumnDialog: {
        isOpen: false,
        columnId: "",
        columnName: "",
      },
    }));
  },

  // ==========================================
  // DYNAMIC COLUMNS
  // ==========================================

  /**
   * Add dynamic columns based on imported data
   * @param rows - The rows to extract dynamic fields from
   */
  editableLeadsGridAddDynamicColumns: (rows: any[]) => {
    // TODO: Implement dynamic columns addition
    // This will be implemented in the component integration phase
    console.log("Add dynamic columns from rows:", rows.length);
  },

  /**
   * Extract dynamic fields from rows
   * @param rows - The rows to extract fields from
   */
  editableLeadsGridExtractDynamicFields: (rows: any[]): Set<string> => {
    // TODO: Implement dynamic fields extraction
    // This will be implemented in the component integration phase
    console.log("Extract dynamic fields from rows:", rows.length);
    return new Set();
  },

  // ==========================================
  // UTILITIES
  // ==========================================

  /**
   * Handle resize events
   */
  editableLeadsGridHandleResize: () => {
    // TODO: Implement resize handling
    // This will be implemented in the component integration phase
    console.log("Handle resize");
  },

  // ==========================================
  // COMPUTED GETTERS
  // ==========================================

  /**
   * Get column filters for instant contacts hook
   */
  editableLeadsGridGetColumnFilters: (): IColumnFilter[] => {
    const state = get();
    // TODO: Implement column filters computation
    // This will be implemented in the component integration phase
    console.log("Get column filters");
    return [];
  },

  /**
   * Get total pages based on total count and page size
   * @param totalCount - Total number of items
   */
  editableLeadsGridGetTotalPages: (totalCount: number): number => {
    const state = get();
    return Math.ceil(totalCount / state.pageSize);
  },

  /**
   * Get grid key for stable rendering
   */
  editableLeadsGridGetGridKey: (): string => {
    const state = get();
    return `grid-stable-${state.forceRenderKey}`;
  },

  /**
   * Get dynamic columns to add based on rows
   * @param rows - The rows to analyze
   */
  editableLeadsGridGetDynamicColumnsToAdd: (rows: any[]): TColumn[] => {
    // TODO: Implement dynamic columns computation
    // This will be implemented in the component integration phase
    console.log("Get dynamic columns to add from rows:", rows.length);
    return [];
  },

  // ==========================================
  // ERROR MANAGEMENT
  // ==========================================

  /**
   * Clear specific error
   * @param operation - The operation to clear error for
   */
  editableLeadsGridClearError: (
    operation: keyof IEditableLeadsGridErrorState
  ) => {
    set((state) => ({
      ...state,
      errors: {
        ...state.errors,
        [operation]: null,
      },
    }));
  },

  /**
   * Clear all errors
   */
  editableLeadsGridClearAllErrors: () => {
    set((state) => ({
      ...state,
      errors: INITIAL_EDITABLE_LEADS_GRID_STATE.errors, // Assuming INITIAL_EDITABLE_LEADS_GRID_STATE has an errors property
    }));
  },

  // ==========================================
  // CONTACT OPERATIONS (Advanced)
  // ==========================================

  /**
   * Handle cell editing with optimistic updates and error handling
   * @param rowId - The ID of the row being edited
   * @param columnId - The ID of the column being edited
   * @param value - The new value for the cell
   * @param oldValue - The previous value for rollback on error
   */
  editableLeadsGridHandleCellEdit: async (
    rowId: string,
    columnId: string,
    value: any,
    oldValue?: any
  ) => {
    try {
      // TODO: Implement cell editing with optimistic updates
      // This will be implemented in the next phase when integrating with the component
      console.log("Cell edit:", { rowId, columnId, value, oldValue });
    } catch (error) {
      console.error("Error updating cell:", error);
    }
  },

  /**
   * Handle contact deletion with batch operations
   * @param contactIds - Array of contact IDs to delete
   */
  handleDeleteContacts: async (contactIds: string[]) => {
    const { state, actions } = get();

    try {
      // Set loading state
      actions.setLoading("contact_operations", true);

      // Delete contacts using external hook (will be injected)
      if (actions.deleteContacts) {
        await actions.deleteContacts(contactIds);
      }

      // Remove contacts from local state
      const updatedRows = state.rows.filter(
        (row) => !contactIds.includes(row.id)
      );
      set((state) => ({
        ...state,
        rows: updatedRows,
        totalCount: state.totalCount - contactIds.length,
      }));

      // Update pagination if needed
      const newTotalPages = Math.ceil(
        (state.totalCount - contactIds.length) / state.pageSize
      );
      if (state.currentPage > newTotalPages && newTotalPages > 0) {
        actions.setCurrentPage(newTotalPages);
      }

      // Show success message
      actions.showToast({
        title: "Contacts deleted",
        description: `Successfully deleted ${contactIds.length} contact${contactIds.length === 1 ? "" : "s"}.`,
        variant: "default",
      });

      // Force data refresh
      actions.forceRefresh();
    } catch (error) {
      // Set error state
      actions.setError(
        "contact_operations",
        error instanceof Error ? error.message : "Failed to delete contacts"
      );

      // Show error message
      actions.showToast({
        title: "Error",
        description: "Failed to delete contacts. Please try again.",
        variant: "destructive",
      });

      console.error("Error deleting contacts:", error);
    } finally {
      // Clear loading state
      actions.setLoading("contact_operations", false);
    }
  },

  /**
   * Sync contact data with external stores
   * @param contact - The contact data to sync
   */
  syncContactData: (contact: any) => {
    try {
      // Sync with contacts store using the helper function
      if (typeof window !== "undefined" && (window as any).syncContact) {
        (window as any).syncContact(contact);
      }
    } catch (error) {
      console.warn("Failed to sync contact data:", error);
    }
  },

  /**
   * Handle contact updates from external sources (e.g., stream view)
   * @param contactId - The ID of the contact being updated
   * @param field - The field being updated
   * @param value - The new value
   */
  handleExternalContactUpdate: (
    contactId: string,
    field: string,
    value: any
  ) => {
    const { state } = get();

    try {
      // Find and update the contact in local state
      const rowIndex = state.rows.findIndex((row) => row.id === contactId);
      if (rowIndex !== -1) {
        const updatedRows = [...state.rows];
        updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value };
        set((state) => ({ ...state, rows: updatedRows }));
      }

      // Sync with external stores
      const contact = state.rows.find((row) => row.id === contactId);
      if (contact) {
        get().syncContactData({ ...contact, [field]: value });
      }
    } catch (error) {
      console.error("Error handling external contact update:", error);
    }
  },

  /**
   * Force refresh data from external sources
   */
  forceRefresh: () => {
    set((state) => ({
      ...state,
      forceRenderKey: state.forceRenderKey + 1,
    }));

    // Trigger refresh in external hooks if available
    if (get().refreshData) {
      get().refreshData();
    }
  },

  // ==========================================
  // COLUMN OPERATIONS (Advanced)
  // ==========================================

  /**
   * Handle column deletion with data cleanup
   * @param columnId - The ID of the column to delete
   */
  handleDeleteColumn: async (columnId: string) => {
    const { state, actions } = get();

    try {
      // Find the column to delete
      const columnToDelete = state.columns.find((col) => col.id === columnId);
      if (!columnToDelete) return;

      // Set loading state
      actions.setColumnOperationLoading("delete", columnId);

      // Check if this is a protected column
      if (PROTECTED_COLUMNS.includes(columnId)) {
        actions.setDeleteColumnDialog({
          isOpen: true,
          columnId,
          columnName: columnToDelete.title,
        });
        return;
      }

      // Remove the column from the columns array
      const updatedColumns = state.columns.filter((col) => col.id !== columnId);
      actions.setColumns(updatedColumns);

      // Add to deleted columns set
      const newDeletedColumnIds = new Set([
        ...state.deletedColumnIds,
        columnId,
      ]);
      actions.setDeletedColumnIds(newDeletedColumnIds);

      // Remove column data from all rows
      const updatedRows = state.rows.map((row) => {
        const { [columnId]: _, ...rest } = row as any;
        return rest;
      });

      // Update rows in database
      let updateErrors = 0;
      for (const row of updatedRows) {
        try {
          if (actions.updateCell) {
            await actions.updateCell({
              rowId: (row as any).id,
              columnId,
              value: undefined,
            });
          }
        } catch (error) {
          updateErrors++;
          console.error(`Error updating row ${(row as any).id}:`, error);
        }
      }

      // Log the column deletion
      if (actions.logColumnDelete) {
        actions.logColumnDelete(columnId, columnToDelete.title);
      }

      // Persist the updated columns
      await actions.persistColumns(updatedColumns);

      // Show success message
      actions.showToast({
        title: "Column deleted",
        description:
          updateErrors > 0
            ? `Column "${columnToDelete.title}" deleted with ${updateErrors} update errors.`
            : `Column "${columnToDelete.title}" deleted successfully.`,
        variant: updateErrors > 0 ? "destructive" : "default",
      });
    } catch (error) {
      // Set error state
      actions.setError(
        "column_operations",
        error instanceof Error ? error.message : "Failed to delete column"
      );

      // Show error message
      actions.showToast({
        title: "Error",
        description: "Failed to delete column. Please try again.",
        variant: "destructive",
      });

      console.error("Error deleting column:", error);
    } finally {
      // Clear loading state
      actions.setColumnOperationLoading(null);
    }
  },

  /**
   * Confirm column deletion after user confirmation
   */
  confirmDeleteColumn: async () => {
    const { state, actions } = get();
    const { columnId, columnName } = state.deleteColumnDialog;

    // Close the dialog
    actions.setDeleteColumnDialog({
      isOpen: false,
      columnId: "",
      columnName: "",
    });

    // Set loading state
    actions.setColumnOperationLoading("delete", columnId);

    try {
      // Log the column deletion attempt
      console.log(
        `🗑️ Attempting to delete column: ${columnId} (${columnName})`
      );
      if (actions.logColumnDelete) {
        actions.logColumnDelete(columnId, columnName);
      }

      // Add to deleted columns set to prevent re-adding
      const newDeletedColumnIds = new Set([
        ...state.deletedColumnIds,
        columnId,
      ]);
      actions.setDeletedColumnIds(newDeletedColumnIds);
      console.log(`🚫 Added ${columnId} to deleted columns list`);

      // Remove from columns array
      const newColumns = state.columns.filter((col) => col.id !== columnId);
      console.log(`📊 Columns after deletion: ${newColumns.length} remaining`);
      actions.setColumns(newColumns);

      // Remove column data from all rows
      const updatedRows = state.rows.map((row) => {
        const { [columnId]: _, ...rest } = row as any;
        return rest;
      });
      console.log(
        `📝 Updated ${updatedRows.length} rows to remove column data`
      );

      // Update the rows in the database
      let updateErrors = 0;
      for (const row of updatedRows) {
        try {
          if (actions.updateCell) {
            await actions.updateCell({
              rowId: (row as any).id,
              columnId,
              value: undefined,
            });
          }
        } catch (error) {
          updateErrors++;
          console.error(`❌ Failed to update row ${(row as any).id}:`, error);
        }
      }

      if (updateErrors > 0) {
        console.warn(
          `⚠️ ${updateErrors} rows failed to update during column deletion`
        );
      }

      // Persist the column deletion
      await actions.persistColumns(newColumns);
      console.log(`✅ Column deletion completed successfully`);

      // Show success message
      actions.showToast({
        title: "Column deleted",
        description: `Successfully deleted column "${columnName}" and all its data`,
        variant: "default",
      });
    } catch (error) {
      // Set error state
      actions.setError(
        "column_operations",
        error instanceof Error ? error.message : "Failed to delete column"
      );

      // Show error message
      actions.showToast({
        title: "Error deleting column",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete the column. Please try again.",
        variant: "destructive",
      });

      console.error(`❌ Column deletion failed:`, error);
    } finally {
      // Clear loading state
      actions.setColumnOperationLoading(null);
    }
  },

  /**
   * Handle adding a new column
   * @param afterColumnId - The ID of the column after which to insert
   */
  handleAddColumn: async (afterColumnId: string) => {
    const { state, actions } = get();

    try {
      // Set loading state
      actions.setColumnOperationLoading("add");

      // Create a new unique column ID
      const columnId = `column-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

      // Create the new column
      const newColumn = {
        id: columnId,
        title: "New Column",
        type: "text" as const,
        width: DEFAULT_COLUMN_WIDTH,
        editable: true,
      };

      // Find the index where we need to insert
      const afterIndex = state.columns.findIndex(
        (col) => col.id === afterColumnId
      );

      // Log the activity
      if (actions.logColumnAdd) {
        actions.logColumnAdd(newColumn.id, newColumn.title);
      }

      // Add the column at the right position
      const newColumns = [
        ...state.columns.slice(0, afterIndex + 1),
        newColumn,
        ...state.columns.slice(afterIndex + 1),
      ];

      actions.setColumns(newColumns);
      await actions.persistColumns(newColumns);

      // Show success message
      actions.showToast({
        title: "Column added",
        description: "Successfully added new column",
        variant: "default",
      });
    } catch (error) {
      // Set error state
      actions.setError(
        "column_operations",
        error instanceof Error ? error.message : "Failed to add column"
      );

      // Show error message
      actions.showToast({
        title: "Error adding column",
        description: "Failed to add new column. Please try again.",
        variant: "destructive",
      });

      console.error("Error adding column:", error);
    } finally {
      // Clear loading state
      actions.setColumnOperationLoading(null);
    }
  },

  /**
   * Handle inserting a new column with specific configuration
   * @param direction - Direction to insert ('left' or 'right')
   * @param targetIndex - Index of the target column
   * @param headerName - Name for the new column header
   * @param columnType - Type of the new column
   * @param config - Additional configuration for the column
   */
  handleInsertColumn: async (
    direction: "left" | "right",
    targetIndex: number,
    headerName: string,
    columnType: string,
    config?: any
  ) => {
    const { state, actions } = get();

    try {
      // Set loading state
      actions.setColumnOperationLoading("add");

      // Create a new unique column ID
      const columnId = `column-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

      // Create the new column with the provided configuration
      const newColumn: any = {
        id: columnId,
        title: headerName,
        type: columnType,
        width: DEFAULT_COLUMN_WIDTH,
        editable: true,
      };

      // Apply configuration based on column type
      if (columnType === "currency" && config?.currencyType) {
        newColumn.currencyType = config.currencyType;
      } else if (columnType === "status" && config?.options && config?.colors) {
        newColumn.options = config.options;
        newColumn.colors = config.colors;
      } else if (columnType === "status") {
        // Default status options if no config provided
        newColumn.options = ["Option 1", "Option 2", "Option 3"];
        newColumn.colors = {
          "Option 1": "#E4E5E8",
          "Option 2": "#DBCDF0",
          "Option 3": "#C6DEF1",
        };
      }

      // Calculate insertion index based on direction
      const insertAt = direction === "left" ? targetIndex : targetIndex + 1;

      // Log the activity
      if (actions.logColumnAdd) {
        actions.logColumnAdd(newColumn.id, newColumn.title);
      }

      // Insert the column at the calculated position
      const newColumns = [
        ...state.columns.slice(0, insertAt),
        newColumn,
        ...state.columns.slice(insertAt),
      ];

      actions.setColumns(newColumns);
      await actions.persistColumns(newColumns);

      // Show success message
      actions.showToast({
        title: "Column added",
        description: `Successfully added column "${headerName}"`,
        variant: "default",
      });
    } catch (error) {
      // Set error state
      actions.setError(
        "column_operations",
        error instanceof Error ? error.message : "Failed to add column"
      );

      // Show error message
      actions.showToast({
        title: "Error adding column",
        description: "Failed to add new column. Please try again.",
        variant: "destructive",
      });

      console.error("Error adding column:", error);
    } finally {
      // Clear loading state
      actions.setColumnOperationLoading(null);
    }
  },

  /**
   * Handle hiding a column
   * @param columnId - The ID of the column to hide
   */
  handleHideColumn: async (columnId: string) => {
    const { state, actions } = get();

    try {
      // Set loading state
      actions.setColumnOperationLoading("hide", columnId);

      // Find the column to hide
      const column = state.columns.find((col) => col.id === columnId);
      if (!column) return;

      // Log the activity
      if (actions.logFilterChange) {
        actions.logFilterChange({
          type: "column_hidden",
          columnId,
          columnName: column.title,
        });
      }

      // Store the current index of the column before hiding
      const currentIndex = state.columns.findIndex(
        (col) => col.id === columnId
      );
      const columnWithIndex = { ...column, originalIndex: currentIndex };

      // Add to hidden columns list with original index
      const newHiddenColumns = [...state.hiddenColumns, columnWithIndex];
      actions.setHiddenColumns(newHiddenColumns);
      await actions.saveHiddenColumns(newHiddenColumns);

      // Remove from columns array (this hides it from view)
      const newColumns = state.columns.filter((col) => col.id !== columnId);
      actions.setColumns(newColumns);

      // Persist the column changes
      await actions.persistColumns(newColumns);

      // Show success message
      actions.showToast({
        title: "Column hidden",
        description: `Column "${column.title}" is now hidden`,
        variant: "default",
      });
    } catch (error) {
      // Set error state
      actions.setError(
        "column_operations",
        error instanceof Error ? error.message : "Failed to hide column"
      );

      // Show error message
      actions.showToast({
        title: "Error hiding column",
        description: "Failed to hide the column. Please try again.",
        variant: "destructive",
      });

      console.error("Error hiding column:", error);
    } finally {
      // Clear loading state
      actions.setColumnOperationLoading(null);
    }
  },

  /**
   * Handle unhiding a column
   * @param columnId - The ID of the column to unhide
   */
  handleUnhideColumn: async (columnId: string) => {
    const { state, actions } = get();

    try {
      // Set loading state
      actions.setColumnOperationLoading("unhide", columnId);

      // Find the column in hidden columns
      const columnToUnhide = state.hiddenColumns.find(
        (col) => col.id === columnId
      );
      if (!columnToUnhide) return;

      // Restore render functions for social links and contact column
      let restoredColumn = { ...columnToUnhide };
      if (
        ["facebook", "instagram", "linkedin", "twitter"].includes(
          columnToUnhide.id
        )
      ) {
        // Will be handled by component when rendering
        restoredColumn.renderCell = undefined;
      } else if (columnToUnhide.id === "name") {
        // Will be handled by component when rendering
        restoredColumn.renderCell = undefined;
      }

      // Remove the originalIndex property as it's not part of the Column interface
      const { originalIndex, ...cleanColumn } = restoredColumn as any;

      // Calculate where to insert the column based on original index
      let insertIndex = originalIndex || 0;

      // Adjust the insert index if columns have been removed since hiding
      const currentColumnIds = state.columns.map((col) => col.id);

      // Ensure we don't insert beyond the current array length
      insertIndex = Math.min(insertIndex, state.columns.length);

      // Always keep lastContacted at the end if it exists
      const lastContactedIndex = state.columns.findIndex(
        (col) => col.id === "lastContacted"
      );
      if (lastContactedIndex !== -1 && insertIndex >= lastContactedIndex) {
        insertIndex = lastContactedIndex;
      }

      // Insert the column at the calculated position
      const newColumns = [...state.columns];
      newColumns.splice(insertIndex, 0, cleanColumn);

      actions.setColumns(newColumns);
      await actions.persistColumns(newColumns);

      // Remove from hidden columns
      const newHiddenColumns = state.hiddenColumns.filter(
        (col) => col.id !== columnId
      );
      actions.setHiddenColumns(newHiddenColumns);
      await actions.saveHiddenColumns(newHiddenColumns);

      // Log the activity
      if (actions.logFilterChange) {
        actions.logFilterChange({
          type: "column_unhidden",
          columnId,
          columnName: cleanColumn.title,
        });
      }

      // Show success message
      actions.showToast({
        title: "Column unhidden",
        description: `Column "${cleanColumn.title}" is now visible`,
        variant: "default",
      });
    } catch (error) {
      // Set error state
      actions.setError(
        "column_operations",
        error instanceof Error ? error.message : "Failed to unhide column"
      );

      // Show error message
      actions.showToast({
        title: "Error unhiding column",
        description: "Failed to unhide the column. Please try again.",
        variant: "destructive",
      });

      console.error("Error unhiding column:", error);
    } finally {
      // Clear loading state
      actions.setColumnOperationLoading(null);
    }
  },

  /**
   * Handle columns reordering
   * @param columnIds - Array of column IDs in the new order
   */
  handleColumnsReorder: async (columnIds: string[]) => {
    const { state, actions } = get();

    try {
      // Reorder columns based on new order
      const reorderedColumns = columnIds
        .map((id) => state.columns.find((col) => col.id === id))
        .filter(Boolean);

      // Update state
      actions.setColumns(reorderedColumns);

      // Persist the new order
      await actions.persistColumns(reorderedColumns);
    } catch (error) {
      console.error("Error reordering columns:", error);
      // Set error state
      actions.setError(
        "column_operations",
        error instanceof Error ? error.message : "Failed to reorder columns"
      );
    }
  },

  // ==========================================
  // STORAGE & PERSISTENCE
  // ==========================================

  /**
   * Persist columns to both localStorage and Supabase
   * @param columns - The columns to persist
   */
  persistColumns: async (columns: TColumn[]) => {
    try {
      // Save to localStorage immediately for fast access
      if (typeof window !== "undefined" && (window as any).saveColumnsToLocal) {
        (window as any).saveColumnsToLocal(columns);
      }

      // Save to Supabase for persistence across devices
      const user = get().user;
      if (user) {
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.from("user_settings" as any).upsert({
          user_id: user.id,
          setting_key: "grid_columns",
          setting_value: columns,
        });
      }
    } catch (error) {
      console.error("Error persisting columns:", error);
      // Don't throw error to prevent UI disruption
    }
  },

  /**
   * Save hidden columns to storage
   * @param hiddenColumns - The hidden columns to save
   */
  saveHiddenColumns: async (hiddenColumns: TColumn[]) => {
    try {
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("hiddenColumns-v1", JSON.stringify(hiddenColumns));
      }

      // Save to Supabase
      const user = get().user;
      if (user) {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error } = await supabase.from("user_settings" as any).upsert({
          user_id: user.id,
          setting_key: "hidden_columns",
          setting_value: hiddenColumns,
          updated_at: new Date().toISOString(),
        });

        if (
          error &&
          !error.message?.includes("404") &&
          error.code !== "42P01"
        ) {
          console.error("Failed to save hidden columns:", error);
        }
      }
    } catch (error) {
      const errorMessage = String(error);
      if (!errorMessage.includes("404") && !errorMessage.includes("42P01")) {
        console.error("Failed to save hidden columns:", error);
      }
    }
  },

  /**
   * Load configuration from storage
   */
  loadFromStorage: async () => {
    const { actions } = get();

    try {
      actions.setLoading("initialization", true);

      // Load columns
      let storedColumns: TColumn[] | null = null;

      // First try localStorage
      if (
        typeof window !== "undefined" &&
        (window as any).loadColumnsFromLocal
      ) {
        storedColumns = (window as any).loadColumnsFromLocal();
      }

      // Try Supabase if no local storage and user is authenticated
      const user = get().user;
      if (!storedColumns && user && (window as any).loadColumnsFromSupabase) {
        storedColumns = await (window as any).loadColumnsFromSupabase(user);
      }

      // Set columns if found
      if (storedColumns && storedColumns.length > 0) {
        actions.setColumns(storedColumns);
      }

      // Load hidden columns
      let storedHiddenColumns: TColumn[] | null = null;

      // First try localStorage
      if (typeof window !== "undefined") {
        const savedHidden = localStorage.getItem("hiddenColumns-v1");
        storedHiddenColumns = savedHidden ? JSON.parse(savedHidden) : null;
      }

      // Try Supabase if no local storage and user is authenticated
      if (!storedHiddenColumns && user) {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase
          .from("user_settings" as any)
          .select("setting_value")
          .eq("user_id", user.id)
          .eq("setting_key", "hidden_columns")
          .single();

        if (data && !error) {
          storedHiddenColumns = (data as any).setting_value as TColumn[];
        }
      }

      // Set hidden columns if found
      if (storedHiddenColumns) {
        actions.setHiddenColumns(storedHiddenColumns);
      }

      // Load deleted column IDs
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("deletedColumnIds");
        if (saved) {
          const deletedIds = new Set(JSON.parse(saved));
          actions.setDeletedColumnIds(deletedIds);
        }
      }
    } catch (error) {
      console.error("Error loading from storage:", error);
      // Set error but don't throw to prevent app crash
      actions.setError(
        "initialization",
        error instanceof Error ? error.message : "Failed to load configuration"
      );
    } finally {
      actions.setLoading("initialization", false);
    }
  },
});
