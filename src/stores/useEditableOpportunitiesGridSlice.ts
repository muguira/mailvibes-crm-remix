import { StateCreator } from 'zustand';
import { Column } from '@/components/grid-view/types';
import { opportunityColumns } from '@/data/opportunities-data';

// Type definitions for opportunities grid
export interface OpportunityGridColumn extends Column {
  hidden?: boolean;
  originalIndex?: number;
}

interface EditableOpportunitiesGridState {
  // Search and filters
  opportunitiesSearchTerm: string;
  opportunitiesActiveFilters: {
    columns: string[];
    values: Record<string, any>;
  };
  
  // Pagination
  opportunitiesCurrentPage: number;
  opportunitiesPageSize: number;
  
  // Columns management
  opportunitiesColumns: OpportunityGridColumn[];
  opportunitiesHiddenColumns: OpportunityGridColumn[];
  opportunitiesDeletedColumnIds: Set<string>;
  
  // Loading states
  opportunitiesIsLoading: boolean;
  opportunitiesIsContactDeletionLoading: boolean;
  
  // Dialogs
  opportunitiesDeleteColumnDialog: {
    isOpen: boolean;
    columnId: string | null;
    columnName: string | null;
  };
  
  // Force render key
  opportunitiesForceRenderKey: number;
}

interface EditableOpportunitiesGridActions {
  // Search and filter actions
  editableOpportunitiesGridSetSearchTerm: (term: string) => void;
  editableOpportunitiesGridSetActiveFilters: (filters: { columns: string[]; values: Record<string, any> }) => void;
  editableOpportunitiesGridGetColumnFilters: () => any[];
  
  // Pagination actions
  editableOpportunitiesGridSetCurrentPage: (page: number) => void;
  editableOpportunitiesGridSetPageSize: (size: number) => void;
  
  // Column actions
  editableOpportunitiesGridSetColumns: (columns: OpportunityGridColumn[]) => void;
  editableOpportunitiesGridAddColumn: (afterColumnId: string) => void;
  editableOpportunitiesGridInsertColumn: (direction: 'left' | 'right', targetIndex: number, headerName: string, columnType: string, config?: any) => void;
  editableOpportunitiesGridDeleteColumn: (columnId: string) => Promise<void>;
  editableOpportunitiesGridConfirmDeleteColumn: () => Promise<void>;
  editableOpportunitiesGridHideColumn: (columnId: string) => Promise<void>;
  editableOpportunitiesGridUnhideColumn: (columnId: string) => Promise<void>;
  editableOpportunitiesGridReorderColumns: (columnIds: string[]) => void;
  editableOpportunitiesGridPersistColumns: (columns: OpportunityGridColumn[], user: any) => Promise<void>;
  
  // Cell edit actions
  editableOpportunitiesGridHandleCellEdit: (rowId: string, columnId: string, value: any) => Promise<void>;
  
  // Opportunity actions
  editableOpportunitiesGridDeleteOpportunities: (opportunityIds: string[]) => Promise<void>;
  
  // Utility actions
  editableOpportunitiesGridForceRerender: () => void;
  editableOpportunitiesGridSetIsLoading: (loading: boolean) => void;
  editableOpportunitiesGridAddDynamicColumns: (rows: any[]) => void;
}

type EditableOpportunitiesGridSlice = EditableOpportunitiesGridState & EditableOpportunitiesGridActions;

// Default opportunity columns with correct structure
const getDefaultOpportunityColumns = (): OpportunityGridColumn[] => {
  return opportunityColumns.map((col, index) => ({
    id: col.key,
    title: col.header,
    type: col.type,
    width: col.key === 'opportunity' ? 180 : 150,
    editable: col.editable || false,
    frozen: col.frozen || col.key === 'opportunity',
    hidden: false,
    originalIndex: index,
    options: col.options,
    colors: col.colors,
  }));
};

export const createEditableOpportunitiesGridSlice: StateCreator<
  EditableOpportunitiesGridSlice,
  [],
  [],
  EditableOpportunitiesGridSlice
> = (set, get) => ({
  // Initial state
  opportunitiesSearchTerm: '',
  opportunitiesActiveFilters: { columns: [], values: {} },
  opportunitiesCurrentPage: 1,
  opportunitiesPageSize: 50,
  opportunitiesColumns: getDefaultOpportunityColumns(),
  opportunitiesHiddenColumns: [],
  opportunitiesDeletedColumnIds: new Set(),
  opportunitiesIsLoading: false,
  opportunitiesIsContactDeletionLoading: false,
  opportunitiesDeleteColumnDialog: {
    isOpen: false,
    columnId: null,
    columnName: null,
  },
  opportunitiesForceRenderKey: 0,

  // Search and filter actions
  editableOpportunitiesGridSetSearchTerm: (term) => {
    set({ opportunitiesSearchTerm: term });
  },

  editableOpportunitiesGridSetActiveFilters: (filters) => {
    set({ opportunitiesActiveFilters: filters });
  },

  editableOpportunitiesGridGetColumnFilters: () => {
    const { opportunitiesActiveFilters, opportunitiesColumns } = get();
    const columnFilters: any[] = [];
    
    // Convert filter values to column filter format
    Object.entries(opportunitiesActiveFilters.values).forEach(([columnId, filterValue]) => {
      if (filterValue && columnId !== '__hidden_columns__') {
        const column = opportunitiesColumns.find(col => col.id === columnId);
        if (column) {
          columnFilters.push({
            columnId,
            value: filterValue,
            type: column.type,
            operator: filterValue.operator || 'contains'
          });
        }
      }
    });
    
    return columnFilters;
  },

  // Pagination actions
  editableOpportunitiesGridSetCurrentPage: (page) => {
    set({ opportunitiesCurrentPage: page });
  },

  editableOpportunitiesGridSetPageSize: (size) => {
    set({ opportunitiesPageSize: size, opportunitiesCurrentPage: 1 });
  },

  // Column actions
  editableOpportunitiesGridSetColumns: (columns) => {
    set({ opportunitiesColumns: columns });
  },

  editableOpportunitiesGridAddColumn: (afterColumnId) => {
    const { opportunitiesColumns } = get();
    const targetIndex = opportunitiesColumns.findIndex(col => col.id === afterColumnId);
    
    const newColumn: OpportunityGridColumn = {
      id: `custom-${Date.now()}`,
      title: 'New Column',
      type: 'text',
      width: 150,
      editable: true,
      frozen: false,
      hidden: false,
    };
    
    const newColumns = [...opportunitiesColumns];
    newColumns.splice(targetIndex + 1, 0, newColumn);
    
    set({ opportunitiesColumns: newColumns });
  },

  editableOpportunitiesGridInsertColumn: (direction, targetIndex, headerName, columnType, config) => {
    const { opportunitiesColumns } = get();
    
    const newColumn: OpportunityGridColumn = {
      id: `custom-${Date.now()}`,
      title: headerName,
      type: columnType,
      width: 150,
      editable: true,
      frozen: false,
      hidden: false,
      ...config
    };
    
    const insertIndex = direction === 'left' ? targetIndex : targetIndex + 1;
    const newColumns = [...opportunitiesColumns];
    newColumns.splice(insertIndex, 0, newColumn);
    
    set({ opportunitiesColumns: newColumns });
  },

  editableOpportunitiesGridDeleteColumn: async (columnId) => {
    set(state => ({
      opportunitiesDeleteColumnDialog: {
        isOpen: true,
        columnId,
        columnName: state.opportunitiesColumns.find(col => col.id === columnId)?.title || null,
      }
    }));
  },

  editableOpportunitiesGridConfirmDeleteColumn: async () => {
    const { opportunitiesDeleteColumnDialog, opportunitiesColumns, opportunitiesDeletedColumnIds } = get();
    
    if (opportunitiesDeleteColumnDialog.columnId) {
      const newColumns = opportunitiesColumns.filter(col => col.id !== opportunitiesDeleteColumnDialog.columnId);
      const newDeletedIds = new Set(opportunitiesDeletedColumnIds);
      newDeletedIds.add(opportunitiesDeleteColumnDialog.columnId);
      
      set({
        opportunitiesColumns: newColumns,
        opportunitiesDeletedColumnIds: newDeletedIds,
        opportunitiesDeleteColumnDialog: {
          isOpen: false,
          columnId: null,
          columnName: null,
        }
      });
    }
  },

  editableOpportunitiesGridHideColumn: async (columnId) => {
    const { opportunitiesColumns, opportunitiesHiddenColumns } = get();
    const columnToHide = opportunitiesColumns.find(col => col.id === columnId);
    
    if (columnToHide) {
      const originalIndex = opportunitiesColumns.indexOf(columnToHide);
      const hiddenColumn = { ...columnToHide, hidden: true, originalIndex };
      
      set({
        opportunitiesColumns: opportunitiesColumns.filter(col => col.id !== columnId),
        opportunitiesHiddenColumns: [...opportunitiesHiddenColumns, hiddenColumn]
      });
    }
  },

  editableOpportunitiesGridUnhideColumn: async (columnId) => {
    const { opportunitiesColumns, opportunitiesHiddenColumns } = get();
    const columnToUnhide = opportunitiesHiddenColumns.find(col => col.id === columnId);
    
    if (columnToUnhide) {
      const { originalIndex, ...column } = columnToUnhide;
      const unhiddenColumn = { ...column, hidden: false };
      
      const newColumns = [...opportunitiesColumns];
      if (originalIndex !== undefined && originalIndex >= 0) {
        newColumns.splice(Math.min(originalIndex, newColumns.length), 0, unhiddenColumn);
      } else {
        newColumns.push(unhiddenColumn);
      }
      
      set({
        opportunitiesColumns: newColumns,
        opportunitiesHiddenColumns: opportunitiesHiddenColumns.filter(col => col.id !== columnId)
      });
    }
  },

  editableOpportunitiesGridReorderColumns: (columnIds) => {
    const { opportunitiesColumns } = get();
    const columnMap = new Map(opportunitiesColumns.map(col => [col.id, col]));
    const reorderedColumns = columnIds.map(id => columnMap.get(id)).filter(Boolean) as OpportunityGridColumn[];
    
    set({ opportunitiesColumns: reorderedColumns });
  },

  editableOpportunitiesGridPersistColumns: async (columns, user) => {
    // Persist to localStorage and potentially Supabase
    const key = `opportunities-grid-columns-${user?.id || 'default'}`;
    localStorage.setItem(key, JSON.stringify(columns));
  },

  // Cell edit actions
  editableOpportunitiesGridHandleCellEdit: async (rowId, columnId, value) => {
    // Handle opportunity cell edit
    console.log('Editing opportunity cell:', { rowId, columnId, value });
  },

  // Opportunity actions
  editableOpportunitiesGridDeleteOpportunities: async (opportunityIds) => {
    set({ opportunitiesIsContactDeletionLoading: true });
    
    try {
      // Delete opportunities logic here
      console.log('Deleting opportunities:', opportunityIds);
      
      // Force re-render after deletion
      set(state => ({ opportunitiesForceRenderKey: state.opportunitiesForceRenderKey + 1 }));
    } catch (error) {
      console.error('Error deleting opportunities:', error);
      throw error;
    } finally {
      set({ opportunitiesIsContactDeletionLoading: false });
    }
  },

  // Utility actions
  editableOpportunitiesGridForceRerender: () => {
    set(state => ({ opportunitiesForceRenderKey: state.opportunitiesForceRenderKey + 1 }));
  },

  editableOpportunitiesGridSetIsLoading: (loading) => {
    set({ opportunitiesIsLoading: loading });
  },

  editableOpportunitiesGridAddDynamicColumns: (rows) => {
    // Add any dynamic columns found in opportunity data
    const { opportunitiesColumns } = get();
    const existingColumnIds = new Set(opportunitiesColumns.map(col => col.id));
    
    rows.forEach(row => {
      Object.keys(row).forEach(key => {
        if (!existingColumnIds.has(key) && key !== 'id') {
          // Add new column if not exists
          console.log('Found new opportunity field:', key);
        }
      });
    });
  },
}); 