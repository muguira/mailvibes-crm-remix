import { Column } from '@/components/grid-view/types'
import { opportunityColumns } from '@/data/opportunities-data'

// Type definitions for opportunities grid
export interface OpportunityGridColumn extends Omit<Column, 'type'> {
  hidden?: boolean
  originalIndex?: number
  type: 'number' | 'status' | 'text' | 'currency' | 'date' | 'url' | 'custom' | 'select'
}

interface EditableOpportunitiesGridState {
  // Search and filters
  opportunitiesSearchTerm: string
  opportunitiesActiveFilters: {
    columns: string[]
    values: Record<string, any>
  }

  // Pagination
  opportunitiesCurrentPage: number
  opportunitiesPageSize: number

  // Columns management
  opportunitiesColumns: OpportunityGridColumn[]
  opportunitiesHiddenColumns: OpportunityGridColumn[]
  opportunitiesDeletedColumnIds: Set<string>

  // Loading states
  opportunitiesIsLoading: boolean
  opportunitiesIsContactDeletionLoading: boolean

  // Dialogs
  opportunitiesDeleteColumnDialog: {
    isOpen: boolean
    columnId: string | null
    columnName: string | null
  }

  // Cell edit tracking
  lastCellEdit?: {
    rowId: string
    columnId: string
    finalValue: any
    originalValue: any
    timestamp: number
  }

  // Force render key
  opportunitiesForceRenderKey: number
}

interface EditableOpportunitiesGridActions {
  // Search and filter actions
  editableOpportunitiesGridSetSearchTerm: (term: string) => void
  editableOpportunitiesGridSetActiveFilters: (filters: { columns: string[]; values: Record<string, any> }) => void
  editableOpportunitiesGridGetColumnFilters: () => any[]

  // Pagination actions
  editableOpportunitiesGridSetCurrentPage: (page: number) => void
  editableOpportunitiesGridSetPageSize: (size: number) => void

  // Column actions
  editableOpportunitiesGridSetColumns: (columns: OpportunityGridColumn[]) => void
  editableOpportunitiesGridAddColumn: (afterColumnId: string) => void
  editableOpportunitiesGridInsertColumn: (
    direction: 'left' | 'right',
    targetIndex: number,
    headerName: string,
    columnType: string,
    config?: any,
  ) => void
  editableOpportunitiesGridDeleteColumn: (columnId: string) => Promise<void>
  editableOpportunitiesGridConfirmDeleteColumn: () => Promise<void>
  editableOpportunitiesGridHideColumn: (columnId: string) => Promise<void>
  editableOpportunitiesGridUnhideColumn: (columnId: string) => Promise<void>
  editableOpportunitiesGridReorderColumns: (columnIds: string[]) => void
  editableOpportunitiesGridPersistColumns: (columns: OpportunityGridColumn[], user: any) => Promise<void>

  // Cell edit actions
  editableOpportunitiesGridHandleCellEdit: (rowId: string, columnId: string, value: any) => Promise<void>

  // Opportunity actions
  editableOpportunitiesGridDeleteOpportunities: (opportunityIds: string[]) => Promise<void>

  // Utility actions
  editableOpportunitiesGridForceRerender: () => void
  editableOpportunitiesGridSetIsLoading: (loading: boolean) => void
  editableOpportunitiesGridAddDynamicColumns: (rows: any[]) => void
}

type EditableOpportunitiesGridSlice = EditableOpportunitiesGridState & EditableOpportunitiesGridActions

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
  }))
}

export const createEditableOpportunitiesGridSlice = (set: any, get: any) => ({
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
  lastCellEdit: undefined,
  opportunitiesForceRenderKey: 0,

  // Search and filter actions
  editableOpportunitiesGridSetSearchTerm: term => {
    set({ opportunitiesSearchTerm: term })
  },

  editableOpportunitiesGridSetActiveFilters: filters => {
    set({ opportunitiesActiveFilters: filters })
  },

  editableOpportunitiesGridGetColumnFilters: () => {
    const { opportunitiesActiveFilters, opportunitiesColumns } = get()

    if (!opportunitiesActiveFilters.columns || opportunitiesActiveFilters.columns.length === 0) {
      return []
    }

    const columnFilters = opportunitiesActiveFilters.columns
      .map(columnId => {
        const filterValue = opportunitiesActiveFilters.values[columnId] as any
        const column = opportunitiesColumns.find(col => col.id === columnId)

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
          if (filterValue.operator === 'is_empty') {
            return { columnId, value: null, type: 'date', operator: 'is_empty' }
          } else if (filterValue.operator === 'is_not_empty') {
            return { columnId, value: null, type: 'date', operator: 'is_not_empty' }
          } else if (filterValue.startDate || filterValue.endDate) {
            const dateFilter: any = {
              columnId,
              type: 'date',
              operator: filterValue.operator,
            }

            if (filterValue.operator === 'between') {
              dateFilter.value = {
                start: filterValue.startDate,
                end: filterValue.endDate,
              }
            } else if (filterValue.operator === 'before') {
              dateFilter.value = { end: filterValue.startDate }
            } else if (filterValue.operator === 'after') {
              dateFilter.value = { start: filterValue.startDate }
            } else if (filterValue.operator === 'on') {
              dateFilter.value = {
                start: filterValue.startDate,
                end: filterValue.startDate,
              }
            }

            return dateFilter
          }
        } else if (filterValue.type === 'number' || filterValue.type === 'currency') {
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

    return columnFilters
  },

  // Pagination actions
  editableOpportunitiesGridSetCurrentPage: page => {
    set({ opportunitiesCurrentPage: page })
  },

  editableOpportunitiesGridSetPageSize: size => {
    set({ opportunitiesPageSize: size, opportunitiesCurrentPage: 1 })
  },

  // Column actions
  editableOpportunitiesGridSetColumns: columns => {
    set({ opportunitiesColumns: columns })
  },

  editableOpportunitiesGridAddColumn: afterColumnId => {
    const { opportunitiesColumns } = get()
    const targetIndex = opportunitiesColumns.findIndex(col => col.id === afterColumnId)

    const newColumn: OpportunityGridColumn = {
      id: `custom-${Date.now()}`,
      title: 'New Column',
      type: 'text',
      width: 150,
      editable: true,
      frozen: false,
      hidden: false,
    }

    const newColumns = [...opportunitiesColumns]
    newColumns.splice(targetIndex + 1, 0, newColumn)

    set({ opportunitiesColumns: newColumns })
  },

  editableOpportunitiesGridInsertColumn: (direction, targetIndex, headerName, columnType, config) => {
    const { opportunitiesColumns } = get()

    const newColumn: OpportunityGridColumn = {
      id: `custom-${Date.now()}`,
      title: headerName,
      type: columnType,
      width: 150,
      editable: true,
      frozen: false,
      hidden: false,
      ...config,
    }

    const insertIndex = direction === 'left' ? targetIndex : targetIndex + 1
    const newColumns = [...opportunitiesColumns]
    newColumns.splice(insertIndex, 0, newColumn)

    set({ opportunitiesColumns: newColumns })
  },

  editableOpportunitiesGridDeleteColumn: async columnId => {
    set(state => ({
      opportunitiesDeleteColumnDialog: {
        isOpen: true,
        columnId,
        columnName: state.opportunitiesColumns.find(col => col.id === columnId)?.title || null,
      },
    }))
  },

  editableOpportunitiesGridConfirmDeleteColumn: async () => {
    const { opportunitiesDeleteColumnDialog, opportunitiesColumns, opportunitiesDeletedColumnIds } = get()

    if (opportunitiesDeleteColumnDialog.columnId) {
      const newColumns = opportunitiesColumns.filter(col => col.id !== opportunitiesDeleteColumnDialog.columnId)
      const newDeletedIds = new Set(opportunitiesDeletedColumnIds)
      newDeletedIds.add(opportunitiesDeleteColumnDialog.columnId)

      set({
        opportunitiesColumns: newColumns,
        opportunitiesDeletedColumnIds: newDeletedIds,
        opportunitiesDeleteColumnDialog: {
          isOpen: false,
          columnId: null,
          columnName: null,
        },
      })
    }
  },

  editableOpportunitiesGridHideColumn: async columnId => {
    const { opportunitiesColumns, opportunitiesHiddenColumns } = get()
    const columnToHide = opportunitiesColumns.find(col => col.id === columnId)

    if (columnToHide) {
      const originalIndex = opportunitiesColumns.indexOf(columnToHide)
      const hiddenColumn = { ...columnToHide, hidden: true, originalIndex }

      set({
        opportunitiesColumns: opportunitiesColumns.filter(col => col.id !== columnId),
        opportunitiesHiddenColumns: [...opportunitiesHiddenColumns, hiddenColumn],
      })
    }
  },

  editableOpportunitiesGridUnhideColumn: async columnId => {
    const { opportunitiesColumns, opportunitiesHiddenColumns } = get()
    const columnToUnhide = opportunitiesHiddenColumns.find(col => col.id === columnId)

    if (columnToUnhide) {
      const { originalIndex, ...column } = columnToUnhide
      const unhiddenColumn = { ...column, hidden: false }

      const newColumns = [...opportunitiesColumns]
      if (originalIndex !== undefined && originalIndex >= 0) {
        newColumns.splice(Math.min(originalIndex, newColumns.length), 0, unhiddenColumn)
      } else {
        newColumns.push(unhiddenColumn)
      }

      set({
        opportunitiesColumns: newColumns,
        opportunitiesHiddenColumns: opportunitiesHiddenColumns.filter(col => col.id !== columnId),
      })
    }
  },

  editableOpportunitiesGridReorderColumns: columnIds => {
    console.log('🔄 Reordering opportunities columns:', columnIds)

    const { opportunitiesColumns } = get()

    // Create column map for efficient lookup
    const columnMap = new Map(opportunitiesColumns.map(col => [col.id, col]))

    // Map column IDs to full column objects, preserving order
    const reorderedColumns = columnIds.map(id => columnMap.get(id)).filter(Boolean) as any[]

    // Add any columns that weren't in the columnIds array (safety check)
    const missingColumns = opportunitiesColumns.filter(col => !columnIds.includes(col.id))
    const finalColumns = [...reorderedColumns, ...missingColumns]

    console.log('🔄 Column reorder completed:', {
      originalCount: opportunitiesColumns.length,
      reorderedCount: finalColumns.length,
      newOrder: finalColumns.map(c => c.id),
    })

    set({ opportunitiesColumns: finalColumns })
  },

  /**
   * Apply render functions to existing columns
   * Used when columns are already loaded but need render functions applied
   */
  editableOpportunitiesGridApplyRenderFunctions: renderOpportunityLink => {
    const currentColumns = get().opportunitiesColumns
    if (currentColumns.length === 0) {
      console.log('⚠️ No opportunities columns to apply render functions to')
      return
    }

    console.log('🔗 Applying render functions to existing opportunities columns...', {
      totalColumns: currentColumns.length,
      hasOpportunityLink: !!renderOpportunityLink,
    })

    // Apply render functions to existing columns
    const columnsWithRenderFunctions = currentColumns.map(col => {
      // Apply opportunity link render function for opportunity column
      if (col.id === 'opportunity' && renderOpportunityLink) {
        console.log('🔗 Applying renderOpportunityLink to opportunity column - this enables opportunity links!')
        return {
          ...col,
          renderCell: renderOpportunityLink,
        }
      }
      return col
    })

    // Update the slice state
    set(state => {
      state.opportunitiesColumns = columnsWithRenderFunctions
    })

    // Verify that the opportunity column has renderCell function
    const opportunityColumn = columnsWithRenderFunctions.find(col => col.id === 'opportunity')
    if (opportunityColumn) {
      console.log('✅ Opportunity column render function applied successfully:', {
        id: opportunityColumn.id,
        hasRenderCell: !!opportunityColumn.renderCell,
        renderCellType: typeof opportunityColumn.renderCell,
      })
    } else {
      console.log('⚠️ Opportunity column not found during render function application')
    }

    console.log('✅ Render functions applied to all opportunities columns')
  },

  /**
   * Persist columns to both slice state, localStorage, and Supabase
   * @param newColumns - Array of Column objects to persist
   * @param user - User object for Supabase operations (optional)
   */
  editableOpportunitiesGridPersistColumns: async (newColumns, user) => {
    try {
      // Update slice state first
      set(state => {
        state.opportunitiesColumns = newColumns
      })

      // Note: localStorage persistence is now handled automatically by Zustand persist middleware

      // Save to Supabase for persistence across devices
      if (user) {
        const { saveOpportunitiesColumnsToSupabase } = await import('@/helpers/grid')
        await saveOpportunitiesColumnsToSupabase(newColumns, user)
      }
    } catch (error) {
      console.error('Error persisting opportunities columns:', error)

      // Set error state
      set(state => {
        state.opportunitiesErrors.persistence = error instanceof Error ? error.message : 'Failed to persist columns'
      })

      throw error // Re-throw for caller to handle
    }
  },

  /**
   * Load stored columns from localStorage and/or Supabase
   * @param user - User object for Supabase operations (optional)
   * @param renderOpportunityLink - Function to render opportunity links (optional)
   */
  editableOpportunitiesGridLoadStoredColumns: async (user, renderOpportunityLink) => {
    try {
      // Note: localStorage is now handled automatically by Zustand persist middleware
      // We only need to load from Supabase for cross-device synchronization
      let storedColumns: any[] | null = null

      // Try Supabase if user is authenticated
      if (user) {
        const { loadOpportunitiesColumnsFromSupabase } = await import('@/helpers/grid')
        storedColumns = await loadOpportunitiesColumnsFromSupabase(user)
      }

      // Smart priority logic: Compare localStorage vs Supabase
      let columnsToUse: any[]
      const currentColumns = get().opportunitiesColumns
      const { opportunitiesHiddenColumns } = get() // Get current hiddenColumns from Zustand persist
      const hasPersistedColumns = currentColumns.length > 0
      const hasSupabaseColumns = storedColumns && storedColumns.length > 0

      if (hasPersistedColumns && hasSupabaseColumns) {
        // Both exist - prefer Supabase but FILTER OUT hidden columns
        console.log(
          '🔄 Both localStorage and Supabase have opportunities columns, using Supabase for consistency:',
          storedColumns.length,
        )
        columnsToUse = storedColumns
      } else if (hasPersistedColumns) {
        console.log(
          '✅ Using persisted opportunities columns from localStorage (via Zustand persist):',
          currentColumns.length,
        )
        columnsToUse = currentColumns
      } else if (hasSupabaseColumns) {
        console.log('✅ Using Supabase stored opportunities columns:', storedColumns.length)
        columnsToUse = storedColumns
      } else {
        console.log('📋 No stored opportunities columns found, using default columns')
        const { getDefaultOpportunitiesColumns } = await import('@/data/opportunities-data')
        columnsToUse = getDefaultOpportunitiesColumns()
      }

      // 🔧 CRITICAL FIX: Always filter out hidden columns after determining source
      if (opportunitiesHiddenColumns.length > 0) {
        const hiddenColumnIds = opportunitiesHiddenColumns.map(col => col.id)
        const beforeFilterCount = columnsToUse.length
        columnsToUse = columnsToUse.filter(col => !hiddenColumnIds.includes(col.id))

        console.log('🔧 [INIT FIX] Filtered out hidden opportunities columns during load:', {
          beforeCount: beforeFilterCount,
          afterCount: columnsToUse.length,
          hiddenColumnIds,
          removedCount: beforeFilterCount - columnsToUse.length,
        })
      }

      // Filter out deleted columns
      const { opportunitiesDeletedColumnIds } = get()
      const filteredColumns = columnsToUse.filter(col => !opportunitiesDeletedColumnIds.has(col.id))

      console.log('🗑️ Filtered out deleted opportunities columns:', {
        original: columnsToUse.length,
        afterFilter: filteredColumns.length,
        deletedIds: Array.from(opportunitiesDeletedColumnIds),
      })

      // ALWAYS ensure renderCell functions are applied (critical for links to work)
      const columnsWithRenderFunctions = filteredColumns.map(col => {
        // Apply opportunity link renderer for opportunity name column (CRITICAL FIX)
        if (col.id === 'opportunity' && renderOpportunityLink) {
          console.log('🔗 Applying renderOpportunityLink to opportunity column - this enables opportunity links')
          return {
            ...col,
            renderCell: renderOpportunityLink,
          }
        }

        return col
      })

      // Update the slice state
      set(state => {
        state.opportunitiesColumns = columnsWithRenderFunctions
      })

      console.log('✅ Opportunities columns loaded successfully:', columnsWithRenderFunctions.length)
      return columnsWithRenderFunctions
    } catch (error) {
      console.error('❌ Critical error in load stored opportunities columns:', error)

      set(state => ({
        opportunitiesErrors: {
          ...state.opportunitiesErrors,
          persistence: error instanceof Error ? error.message : 'Failed to load stored columns',
        },
      }))

      throw error // Re-throw for component handling
    }
  },

  /**
   * Save hidden columns - Persist hidden columns to localStorage and Supabase
   */
  editableOpportunitiesGridSaveHiddenColumns: async (hiddenCols, user) => {
    try {
      console.log('🔄 Slice: Starting save hidden opportunities columns', { count: hiddenCols.length })

      // Update slice state first
      set({ opportunitiesHiddenColumns: hiddenCols })

      // Save to localStorage (handled by Zustand persist middleware automatically)

      // Save to Supabase for cross-device persistence if user is authenticated
      if (user) {
        try {
          const { saveOpportunitiesHiddenColumnsToSupabase } = await import('@/helpers/grid')
          await saveOpportunitiesHiddenColumnsToSupabase(hiddenCols, user)
        } catch (supabaseError) {
          console.warn('Failed to save hidden opportunities columns to Supabase:', supabaseError)
          // Continue even if Supabase fails - localStorage still works
        }
      }

      console.log('✅ Hidden opportunities columns save completed')
    } catch (error) {
      console.error('❌ Critical error in save hidden opportunities columns:', error)

      set(state => ({
        opportunitiesErrors: {
          ...state.opportunitiesErrors,
          persistence: error instanceof Error ? error.message : 'Failed to save hidden columns',
        },
      }))

      throw error // Re-throw for component handling
    }
  },

  /**
   * Load hidden columns - Load hidden columns from localStorage and Supabase
   */
  editableOpportunitiesGridLoadHiddenColumns: async user => {
    try {
      console.log('🔄 Slice: Starting load hidden opportunities columns', { hasUser: !!user })

      let storedHiddenColumns: any[] | null = null

      // First try localStorage (handled by Zustand persist middleware)
      // Only try Supabase if user is authenticated
      if (user) {
        try {
          console.log('🗄️ Attempting to load hidden opportunities columns from Supabase')

          const { loadOpportunitiesHiddenColumnsFromSupabase } = await import('@/helpers/grid')
          storedHiddenColumns = await loadOpportunitiesHiddenColumnsFromSupabase(user)

          if (storedHiddenColumns) {
            console.log('✅ Loaded hidden opportunities columns from Supabase', { count: storedHiddenColumns.length })

            // Update slice state
            set({ opportunitiesHiddenColumns: storedHiddenColumns })
          }
        } catch (supabaseError) {
          console.warn('Failed to load hidden opportunities columns from Supabase:', supabaseError)
        }
      }

      const finalHiddenColumns = storedHiddenColumns || get().opportunitiesHiddenColumns
      console.log('✅ Hidden opportunities columns load completed', { count: finalHiddenColumns.length })
      return finalHiddenColumns
    } catch (error) {
      console.error('❌ Critical error in load hidden opportunities columns:', error)

      set(state => ({
        opportunitiesErrors: {
          ...state.opportunitiesErrors,
          persistence: error instanceof Error ? error.message : 'Failed to load hidden columns',
        },
      }))

      throw error // Re-throw for component handling
    }
  },

  /**
   * Add dynamic columns based on opportunity row data
   * @param rows - Array of opportunity data to analyze for dynamic fields
   */
  editableOpportunitiesGridAddDynamicColumns: rows => {
    const state = get()

    // Get dynamic columns that should be added
    const dynamicColumnsToAdd = state.editableOpportunitiesGridGetDynamicColumnsToAdd(rows)

    if (dynamicColumnsToAdd.length > 0) {
      // Filter out columns that might already exist (extra safety check)
      const newColumns = dynamicColumnsToAdd.filter(
        newColumn => !state.opportunitiesColumns.some(col => col.id === newColumn.id),
      )

      if (newColumns.length > 0) {
        // Dynamic columns added successfully

        // Add the new columns to the existing columns
        set(state => {
          state.opportunitiesColumns = [...state.opportunitiesColumns, ...newColumns]
        })
      }
    }
  },

  /**
   * Extract dynamic fields from opportunity row data
   * @param rows - Array of opportunity data to analyze
   * @returns Set of dynamic field names found in the data
   */
  editableOpportunitiesGridExtractDynamicFields: (rows): Set<string> => {
    const dynamicFields = new Set<string>()

    // Get standard field names from default columns
    const standardFields = new Set([
      'opportunity',
      'status',
      'revenue',
      'closeDate',
      'owner',
      'company',
      'priority',
      'lastContacted',
      'leadSource',
      'nextMeeting',
      'createdAt',
      'updatedAt',
    ])

    rows.forEach(row => {
      // Check fields directly on the row
      Object.keys(row).forEach(key => {
        // Exclude all system fields and database-specific fields
        const excludedFields = [
          'id',
          'data',
          'originalContactId',
          'stage',
          'userId',
          'user_id',
          'created_at',
          'updated_at',
          'company_name',
          'close_date',
          'last_contacted',
          'next_meeting',
          'lead_source',
          'original_contact_id',
        ]

        if (!standardFields.has(key) && !excludedFields.includes(key)) {
          dynamicFields.add(key)
        }
      })

      // Check fields in the data object if it exists
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
   * Get dynamic columns that should be added based on opportunity row data
   * @param rows - Array of opportunity data to analyze
   * @returns Array of Column objects for dynamic fields that should be added
   */
  editableOpportunitiesGridGetDynamicColumnsToAdd: (rows): any[] => {
    const state = get()

    // Extract dynamic fields from rows
    const dynamicFields = state.editableOpportunitiesGridExtractDynamicFields(rows)

    // Filter fields that should be added (not already in columns, not deleted)
    const fieldsToAdd = Array.from(dynamicFields).filter(
      field =>
        !state.opportunitiesColumns.some(col => col.id === field) && !state.opportunitiesDeletedColumnIds.has(field),
    )

    // Convert fields to Column objects
    return fieldsToAdd.map((field: string) => ({
      id: field,
      title: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
      type: 'text' as const,
      width: 200, // DEFAULT_COLUMN_WIDTH
      editable: true,
      frozen: false,
    }))
  },

  // Cell edit actions
  editableOpportunitiesGridHandleCellEdit: async (rowId, columnId, value) => {
    const { opportunitiesColumns } = get()

    try {
      console.log('EditableOpportunitiesGrid slice handleCellEdit called:', {
        rowId,
        columnId,
        value,
        timestamp: new Date().toISOString(),
      })

      // Format date values before processing
      const column = opportunitiesColumns.find(c => c.id === columnId)
      let finalValue = value

      if (column && column.type === 'date' && value instanceof Date) {
        finalValue = value.toISOString().split('T')[0]
      }

      // Handle currency/revenue formatting
      if (column && column.type === 'currency' && typeof value === 'string') {
        const numValue = parseFloat(value.replace(/[^0-9.-]+/g, ''))
        if (!isNaN(numValue)) {
          finalValue = numValue
        }
      }

      console.log('Opportunity cell edit processed in slice:', {
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
      console.error('Error in opportunities slice cell edit processing:', error)

      // Set error state
      set(state => ({
        opportunitiesErrors: {
          ...state.opportunitiesErrors,
          persistence: error instanceof Error ? error.message : 'Failed to process cell edit',
        },
      }))

      throw error // Re-throw for component handling
    }
  },

  // Bulk Operations - Advanced bulk operations for multiple opportunities
  editableOpportunitiesGridBulkUpdateStatus: async (opportunityIds, newStatus) => {
    if (!opportunityIds.length) return { success: false, error: 'No opportunities selected' }

    console.log(`🔄 Bulk updating status for ${opportunityIds.length} opportunities to: ${newStatus}`)

    try {
      // Update opportunities in store optimistically
      const currentOpportunities = get().opportunitiesCache
      const updatedCache = { ...currentOpportunities }

      opportunityIds.forEach(id => {
        if (updatedCache[id]) {
          updatedCache[id] = {
            ...updatedCache[id],
            status: newStatus,
            stage: newStatus,
            updatedAt: new Date().toISOString(),
          }
        }
      })

      set(state => {
        state.opportunitiesCache = updatedCache
      })

      console.log(`✅ Bulk status update completed for ${opportunityIds.length} opportunities`)

      return { success: true, affectedRows: opportunityIds.length }
    } catch (error) {
      console.error('❌ Error in bulk status update:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  editableOpportunitiesGridBulkUpdatePriority: async (opportunityIds, newPriority) => {
    if (!opportunityIds.length) return { success: false, error: 'No opportunities selected' }

    console.log(`🔄 Bulk updating priority for ${opportunityIds.length} opportunities to: ${newPriority}`)

    try {
      // Update opportunities in store optimistically
      const currentOpportunities = get().opportunitiesCache
      const updatedCache = { ...currentOpportunities }

      opportunityIds.forEach(id => {
        if (updatedCache[id]) {
          updatedCache[id] = {
            ...updatedCache[id],
            priority: newPriority,
            updatedAt: new Date().toISOString(),
          }
        }
      })

      set(state => {
        state.opportunitiesCache = updatedCache
      })

      console.log(`✅ Bulk priority update completed for ${opportunityIds.length} opportunities`)

      return { success: true, affectedRows: opportunityIds.length }
    } catch (error) {
      console.error('❌ Error in bulk priority update:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  editableOpportunitiesGridBulkUpdateOwner: async (opportunityIds, newOwner) => {
    if (!opportunityIds.length) return { success: false, error: 'No opportunities selected' }

    console.log(`🔄 Bulk updating owner for ${opportunityIds.length} opportunities to: ${newOwner}`)

    try {
      // Update opportunities in store optimistically
      const currentOpportunities = get().opportunitiesCache
      const updatedCache = { ...currentOpportunities }

      opportunityIds.forEach(id => {
        if (updatedCache[id]) {
          updatedCache[id] = {
            ...updatedCache[id],
            owner: newOwner,
            updatedAt: new Date().toISOString(),
          }
        }
      })

      set(state => {
        state.opportunitiesCache = updatedCache
      })

      console.log(`✅ Bulk owner update completed for ${opportunityIds.length} opportunities`)

      return { success: true, affectedRows: opportunityIds.length }
    } catch (error) {
      console.error('❌ Error in bulk owner update:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  editableOpportunitiesGridBulkDeleteColumnData: async columnId => {
    console.log(`🗑️ Bulk deleting column data for: ${columnId}`)

    try {
      // Update all opportunities in store to remove the column data
      const currentOpportunities = get().opportunitiesCache
      const updatedCache = { ...currentOpportunities }
      let affectedCount = 0

      Object.keys(updatedCache).forEach(id => {
        if (updatedCache[id] && updatedCache[id][columnId] !== undefined) {
          const updatedOpportunity = { ...updatedCache[id] }
          delete updatedOpportunity[columnId]
          updatedOpportunity.updatedAt = new Date().toISOString()
          updatedCache[id] = updatedOpportunity
          affectedCount++
        }
      })

      set(state => {
        state.opportunitiesCache = updatedCache
      })

      console.log(`✅ Bulk column deletion completed for ${affectedCount} opportunities`)

      return { success: true, affectedRows: affectedCount }
    } catch (error) {
      console.error('❌ Error in bulk column deletion:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  // Opportunity actions
  editableOpportunitiesGridDeleteOpportunities: async opportunityIds => {
    if (!opportunityIds.length) return

    console.log(`🗑️ Starting deletion of ${opportunityIds.length} opportunities`, opportunityIds)
    set({ opportunitiesIsContactDeletionLoading: true })

    try {
      // Store opportunity IDs for component operations
      set(state => ({
        opportunitiesLastDeletion: {
          opportunityIds,
          timestamp: Date.now(),
          status: 'processing',
        },
      }))

      console.log(`✅ Opportunity deletion state prepared for ${opportunityIds.length} opportunities`)
    } catch (error) {
      console.error('Error in opportunity deletion preparation:', error)

      // Set error state
      set(state => ({
        opportunitiesErrors: {
          ...state.opportunitiesErrors,
          deletion: error instanceof Error ? error.message : 'Failed to prepare opportunity deletion',
        },
        opportunitiesLastDeletion: {
          opportunityIds,
          timestamp: Date.now(),
          status: 'error',
        },
      }))

      throw error // Re-throw for component handling
    } finally {
      set({ opportunitiesIsContactDeletionLoading: false })
    }
  },

  // Utility actions
  editableOpportunitiesGridForceRerender: () => {
    set(state => ({ opportunitiesForceRenderKey: state.opportunitiesForceRenderKey + 1 }))
  },

  editableOpportunitiesGridSetIsLoading: loading => {
    set({ opportunitiesIsLoading: loading })
  },
})
