import { OpportunityGridColumn } from '@/stores/useEditableOpportunitiesGridSlice';

export interface TEditableOpportunitiesGridStore {
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

  // Actions
  editableOpportunitiesGridSetSearchTerm: (term: string) => void;
  editableOpportunitiesGridSetActiveFilters: (filters: { columns: string[]; values: Record<string, any> }) => void;
  editableOpportunitiesGridGetColumnFilters: () => any[];
  editableOpportunitiesGridSetCurrentPage: (page: number) => void;
  editableOpportunitiesGridSetPageSize: (size: number) => void;
  editableOpportunitiesGridSetColumns: (columns: OpportunityGridColumn[]) => void;
  editableOpportunitiesGridAddColumn: (afterColumnId: string) => void;
  editableOpportunitiesGridInsertColumn: (direction: 'left' | 'right', targetIndex: number, headerName: string, columnType: string, config?: any) => void;
  editableOpportunitiesGridDeleteColumn: (columnId: string) => Promise<void>;
  editableOpportunitiesGridConfirmDeleteColumn: () => Promise<void>;
  editableOpportunitiesGridHideColumn: (columnId: string) => Promise<void>;
  editableOpportunitiesGridUnhideColumn: (columnId: string) => Promise<void>;
  editableOpportunitiesGridReorderColumns: (columnIds: string[]) => void;
  editableOpportunitiesGridPersistColumns: (columns: OpportunityGridColumn[], user: any) => Promise<void>;
  editableOpportunitiesGridHandleCellEdit: (rowId: string, columnId: string, value: any) => Promise<void>;
  editableOpportunitiesGridDeleteOpportunities: (opportunityIds: string[]) => Promise<void>;
  editableOpportunitiesGridForceRerender: () => void;
  editableOpportunitiesGridSetIsLoading: (loading: boolean) => void;
  editableOpportunitiesGridAddDynamicColumns: (rows: any[]) => void;
} 