import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GridToolbar } from './grid-toolbar';
import { StaticColumns } from './StaticColumns';
import { MainGridView } from './MainGridView';
import { Column, GridRow, GridContainerProps } from './types';
import { INDEX_COLUMN_WIDTH } from './grid-constants';
import { useStore } from '@/stores';
import { useAuth } from '@/components/auth';
import { toast } from '@/hooks/use-toast';
import './styles/index.css'; // Import grid styles to ensure scrollbar hiding works

interface OpportunitiesGridViewContainerProps extends Omit<GridContainerProps, 'listName' | 'listType' | 'listId'> {
  onSearchChange?: (term: string) => void;
  onConvertToOpportunities?: (contacts: Array<{ id: string; name: string; email?: string; company?: string; phone?: string; }>, conversionData: {
    accountName: string;
    dealValue: number;
    closeDate?: Date;
    stage: string;
    priority: string;
    contacts: Array<{
      id: string;
      name: string;
      email?: string;
      company?: string;
      role: string;
    }>;
  }) => void;
  viewToggle?: React.ReactNode;
}

/**
 * OpportunitiesGridViewContainer
 * 
 * Wrapper component that provides proper state management for opportunities grid
 */
export function OpportunitiesGridViewContainer({
  columns,
  data,
  firstRowIndex = 0,
  onCellChange,
  onDeleteColumn,
  onAddColumn,
  onInsertColumn,
  onHideColumn,
  onUnhideColumn,
  onShowColumn,
  onDeleteContacts,
  isColumnTemporarilyVisible,
  onSearchChange,
  onConvertToOpportunities,
  viewToggle,
}: OpportunitiesGridViewContainerProps) {
  const { user } = useAuth();
  
  // Get opportunities-specific state and actions from Zustand
  const {
    opportunitiesSearchTerm,
    opportunitiesActiveFilters,
    opportunitiesHiddenColumns,
    opportunitiesIsContactDeletionLoading,
    editableOpportunitiesGridSetSearchTerm,
    editableOpportunitiesGridSetActiveFilters,
    editableOpportunitiesGridUnhideColumn,
    editableOpportunitiesGridReorderColumns,
    editableOpportunitiesGridPersistColumns,
  } = useStore();

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  
  // Container references for sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const mainGridRef = useRef<any>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Sync scroll positions between components
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Estado para edición de celdas (global)
  const [editingCell, setEditingCell] = useState<any>(null);

  // Context menu state
  const [contextMenuColumn, setContextMenuColumn] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);

  // Container sizing - critical for horizontal scrolling
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width);
        setContainerHeight(rect.height);
      }
    };
    
    updateSize();
    
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Handle search change
  const handleSearchChange = useCallback((term: string) => {
    editableOpportunitiesGridSetSearchTerm(term);
    onSearchChange?.(term);
  }, [editableOpportunitiesGridSetSearchTerm, onSearchChange]);

  // Handle columns reorder - ensure opportunity column remains unchanged
  const handleColumnsReorder = useCallback(async (newColumnIds: string[]) => {
    console.log('🔄 Opportunities container: Handling column reorder', newColumnIds);
    
    // Make sure opportunity column stays in the correct position
    const opportunityColumnIndex = columns.findIndex(col => col.id === 'opportunity');
    const opportunityColumn = columns.find(col => col.id === 'opportunity');
    
    const newColumns = newColumnIds
      .filter(id => id !== 'opportunity') // Remove opportunity if it's in the list
      .map(id => columns.find(col => col.id === id)!) // Map to full column objects
      .filter(Boolean); // Remove any undefined entries

    // Re-insert opportunity at its original position if needed
    if (opportunityColumnIndex >= 0 && opportunityColumn) {
      // Only re-insert if it was in the original columns array
      newColumns.splice(opportunityColumnIndex, 0, opportunityColumn);
    }

    const finalColumnIds = newColumns.map(col => col.id);
    
    console.log('🔄 Final column order:', finalColumnIds);
    
    // Update slice state (localStorage persistence handled automatically by Zustand persist middleware)
    editableOpportunitiesGridReorderColumns(finalColumnIds);
    
    // Optionally sync to Supabase for cross-device persistence (debounced to avoid conflicts)
    if (user) {
      // Add small delay to avoid rapid successive calls
      setTimeout(async () => {
        try {
          await editableOpportunitiesGridPersistColumns(newColumns, user);
        } catch (error) {
          // Supabase sync failed, but localStorage persistence still works via persist middleware
          console.warn('Supabase opportunities column sync failed:', error);
        }
      }, 500); // 500ms delay
    }
  }, [editableOpportunitiesGridReorderColumns, editableOpportunitiesGridPersistColumns, columns, user]);

  // Handle container sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width);
        setContainerHeight(rect.height);
      }
    };

    // Initial size
    setTimeout(updateSize, 100); // Delay to ensure layout is ready
    
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Handle scroll from MainGridView
  const handleScroll = useCallback((scrollInfo: { scrollLeft: number; scrollTop: number; }) => {
    setScrollLeft(scrollInfo.scrollLeft);
    setScrollTop(scrollInfo.scrollTop);
  }, []);

  // Handle row selection
  const handleToggleRowSelection = useCallback((rowId: string) => {
    setSelectedRowIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllRows = useCallback((select: boolean) => {
    if (select) {
      setSelectedRowIds(new Set(data.map(row => row.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  }, [data]);

  // Handle context menu
  const handleOpenContextMenu = useCallback((columnId: string | null, position?: { x: number, y: number }) => {
    setContextMenuColumn(columnId);
    setContextMenuPosition(position || null);
  }, []);

  // Handle column pinning with restrictions for opportunities column
  const handleTogglePin = useCallback((columnId: string) => {
    // Don't allow unpinning index or opportunity columns
    if (columnId === 'index' || columnId === 'opportunity') {
      return;
    }
    
    setFrozenColumnIds(prev => {
      const isMobile = window.innerWidth < 768;
      // Always keep index and opportunity columns, plus allow 2 more on mobile or unlimited on desktop
      const maxFrozenColumns = isMobile ? 4 : Infinity;

      if (prev.includes(columnId)) {
        // Unfreezing a column
        return prev.filter(id => id !== columnId);
      } else {
        // Freezing a column
        // Count non-required columns (not index or opportunity)
        const nonRequiredFrozenColumns = prev.filter(id => id !== 'index' && id !== 'opportunity');

        if (isMobile && nonRequiredFrozenColumns.length >= (maxFrozenColumns - 2)) {
          // Show toast with shorter duration and better styling
          toast({
            title: "Column limit reached",
            description: "You can pin up to 2 additional columns on mobile.",
            variant: "destructive",
            duration: 2000,
          });
          return prev;
        }
        return [...prev, columnId];
      }
    });
  }, []);

  // Estado para columnas fijas (frozen) - similar to contacts grid
  const [frozenColumnIds, setFrozenColumnIds] = useState<string[]>(() => {
    const key = 'frozenColumnIds-opportunities';
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        // Get stored columns but ensure index and opportunity are always included
        const storedColumns = JSON.parse(stored);
        if (!storedColumns.includes('index')) storedColumns.unshift('index');
        if (!storedColumns.includes('opportunity')) storedColumns.push('opportunity');
        return storedColumns;
      }
    } catch (error) {
      console.error('Error parsing frozen column IDs:', error);
    }
    // Default: index and opportunity columns are always pinned
    return ['index', 'opportunity'];
  });

  // Guardar en localStorage cuando cambian
  useEffect(() => {
    const key = 'frozenColumnIds-opportunities';
    localStorage.setItem(key, JSON.stringify(frozenColumnIds));
  }, [frozenColumnIds]);

  // Separar columnas fijas y scrollables manteniendo el orden original
  const frozenColumns = columns.filter(col => frozenColumnIds.includes(col.id));
  const scrollableColumns = columns.filter(col => !frozenColumnIds.includes(col.id));

  // Find the opportunity column for width calculation - similar to contacts grid
  const opportunityColumn = columns.find(col => col.id === 'opportunity');

  // Width calculation for the static columns area
  const staticColumnsWidth = INDEX_COLUMN_WIDTH + (opportunityColumn?.width || 180);

  // Computed props for GridToolbar
  const selectedRowData = data.filter(row => selectedRowIds.has(row.id));



  // Filter columns for opportunities grid - exclude basic search fields and add hidden columns option
  const filterColumns = useMemo(() => {
    const baseFilterColumns = columns.filter(col => {
      // Exclude opportunity search fields that are covered by global search
      const excludedColumns = ['opportunity', 'company', 'owner', 'status'];
      
      // Only include filterable column types and exclude basic search columns
      return ['text', 'number', 'date', 'status', 'currency'].includes(col.type) && 
             !excludedColumns.includes(col.id);
    });
    
    // Add Hidden Columns filter if there are hidden columns available
    if (opportunitiesHiddenColumns && opportunitiesHiddenColumns.length > 0) {
      baseFilterColumns.push({
        id: '__hidden_columns__',
        title: 'Hidden Columns',
        type: 'text',
        width: 200,
        editable: false
      });
    }
    
    return baseFilterColumns;
  }, [columns, opportunitiesHiddenColumns]);

  return (
    <div className="grid-view h-full pb-9" ref={containerRef}>
      {/* Opportunities Toolbar */}
      <GridToolbar
        listName="All Opportunities"
        listType="Opportunity"
        searchTerm={opportunitiesSearchTerm}
        onSearchChange={handleSearchChange}
        filterCount={Object.keys(opportunitiesActiveFilters.values).length}
        columns={filterColumns}
        onApplyFilters={(filters) => editableOpportunitiesGridSetActiveFilters(filters)}
        activeFilters={opportunitiesActiveFilters}
        hiddenColumns={opportunitiesHiddenColumns}
        onUnhideColumn={editableOpportunitiesGridUnhideColumn}
        frozenColumnIds={frozenColumnIds}
        onTogglePin={handleTogglePin}
        selectedRowIds={selectedRowIds}
        data={selectedRowData}
        onDeleteSelectedContacts={() => onDeleteContacts && onDeleteContacts(Array.from(selectedRowIds))}
        onConvertToOpportunities={onConvertToOpportunities}
        isContactDeletionLoading={opportunitiesIsContactDeletionLoading}
        viewToggle={viewToggle}
      />
      
      {/* Grid Body - Full implementation */}
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="text-lg font-medium">No opportunities found</div>
            <div className="text-sm">Create your first opportunity by converting a contact</div>
          </div>
        ) : (
          <div className="grid-components-container">
            {/* Static columns (index + frozen columns) */}
            <StaticColumns
              data={data}
              frozenColumns={frozenColumns}
              scrollTop={scrollTop}
              firstRowIndex={0}
              onCellChange={onCellChange}
              onContextMenu={handleOpenContextMenu}
              onTogglePin={handleTogglePin}
              frozenColumnIds={frozenColumnIds}
              editingCell={editingCell}
              setEditingCell={setEditingCell}
              selectedRowIds={selectedRowIds}
              onToggleRowSelection={handleToggleRowSelection}
              onSelectAllRows={handleSelectAllRows}
            />

            {/* Main data grid - adjust width to account for static columns */}
            <MainGridView
              ref={mainGridRef}
              columns={scrollableColumns}
              data={data}
              scrollLeft={scrollLeft}
              containerWidth={(containerWidth - INDEX_COLUMN_WIDTH - frozenColumns.reduce((w, c) => w + (c.width || 180), 0)) || 300}
              containerHeight={containerHeight}
              onScroll={handleScroll}
              onCellChange={onCellChange}
              onColumnsReorder={handleColumnsReorder}
              onAddColumn={onAddColumn}
              onDeleteColumn={onDeleteColumn}
              onHideColumn={onHideColumn}
              onShowColumn={onShowColumn}
              onContextMenu={handleOpenContextMenu}
              contextMenuColumn={contextMenuColumn}
              contextMenuPosition={contextMenuPosition}
              onTogglePin={handleTogglePin}
              frozenColumnIds={frozenColumnIds}
              editingCell={editingCell}
              setEditingCell={setEditingCell}
              onInsertColumn={onInsertColumn}
              allColumns={columns}
              selectedRowIds={selectedRowIds}
              isColumnTemporarilyVisible={isColumnTemporarilyVisible}
              dataType="opportunities"
            />
          </div>
        )}
    </div>
  );
} 