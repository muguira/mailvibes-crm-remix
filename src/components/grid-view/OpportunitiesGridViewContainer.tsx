import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GridToolbar } from './grid-toolbar';
import { StaticColumns } from './StaticColumns';
import { MainGridView } from './MainGridView';
import { Column, GridRow, GridContainerProps } from './types';
import { useStore } from '@/stores';
import { useAuth } from '@/components/auth';
import { toast } from '@/hooks/use-toast';

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

  // Handle search change
  const handleSearchChange = useCallback((term: string) => {
    editableOpportunitiesGridSetSearchTerm(term);
    onSearchChange?.(term);
  }, [editableOpportunitiesGridSetSearchTerm, onSearchChange]);

  // Handle columns reorder
  const handleColumnsReorder = useCallback(async (columnIds: string[]) => {
    editableOpportunitiesGridReorderColumns(columnIds);
    await editableOpportunitiesGridPersistColumns(columns, user);
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
    // For now, we don't have pin functionality in opportunities - can be added later
  }, []);

  // Computed props for GridToolbar
  const selectedRowData = data.filter(row => selectedRowIds.has(row.id));
  const frozenColumnIds = columns.filter(col => col.frozen).map(col => col.id);

  // Separar columnas fijas y scrollables manteniendo el orden original
  const frozenColumns = columns.filter(col => frozenColumnIds.includes(col.id));
  const scrollableColumns = columns.filter(col => !frozenColumnIds.includes(col.id));



  return (
    <div className="h-full w-full flex flex-col">
      {/* Opportunities Toolbar */}
      <GridToolbar
        listName="All Opportunities"
        listType="Opportunity"
        searchTerm={opportunitiesSearchTerm}
        onSearchChange={handleSearchChange}
        filterCount={Object.keys(opportunitiesActiveFilters.values).length}
        columns={columns}
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
      <div className="grid-view h-full pb-9" ref={containerRef}>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="text-lg font-medium">No opportunities found</div>
            <div className="text-sm">Create your first opportunity by converting a contact</div>
          </div>
        ) : (
          <div className="h-full relative flex">
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
            <div className="flex-1" style={{ minHeight: '500px' }}>
              <MainGridView
                ref={mainGridRef}
                columns={scrollableColumns}
                data={data}
                scrollLeft={scrollLeft}
                containerWidth={Math.max((containerWidth - frozenColumns.reduce((w, c) => w + (c.width || 180), 0)), 400)}
                containerHeight={Math.max(containerHeight, 500)}
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
          </div>
        )}
      </div>
    </div>
  );
} 