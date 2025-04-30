
import { useRef, useState, useMemo } from "react";
import { GridToolbar } from "../grid-toolbar";
import { GridHeaders } from "../grid-headers";
import { GridBody } from "../grid-body";
import { useGridSetup } from "./use-grid-setup";
import { GridViewProps } from "./types";
import { Pencil } from "lucide-react";
import { PointsOfContactDialog } from "../dialogs/points-of-contact-dialog";
import "./grid-view.css";

export function GridView({ 
  columns: initialColumns, 
  data: initialData, 
  listName, 
  listType,
  listId,
  onCellChange,
  onAddItem
}: GridViewProps & { 
  listId?: string,
  onCellChange?: (rowId: string, colKey: string, value: any) => void,
  onAddItem?: (() => void) | null
}) {
  // Container references for sync scrolling
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  
  // Points of Contact dialog state
  const [isPointsOfContactOpen, setIsPointsOfContactOpen] = useState(false);
  const [currentOpportunity, setCurrentOpportunity] = useState<{
    id: string;
    name: string;
    company?: string;
  } | null>(null);
  
  // Add zoom state
  const [zoomLevel, setZoomLevel] = useState('100%');
  
  const {
    // State
    columns,
    data,
    activeCell,
    editingHeader,
    setEditingHeader,
    draggedColumn,
    dragOverColumn,
    newColumn,
    setNewColumn,
    isAddingColumn,
    setIsAddingColumn,
    showSaveIndicator,
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    
    // Computed values
    frozenColumns,
    scrollableColumns,
    frozenColsTemplate,
    scrollableColsTemplate,
    
    // Actions
    handleCellClick,
    handleHeaderDoubleClick,
    handleCellChange,
    addColumn,
    deleteColumn,
    duplicateColumn,
    renameColumn,
    sortColumn,
    moveColumn,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleKeyDown,
  } = useGridSetup({
    initialColumns,
    initialData,
    headerRef,
    bodyRef
  });
  
  // Calculate grid style based on zoom level
  const gridStyle = useMemo(() => {
    // Remove the % sign and convert to a number
    const zoomPercentage = parseFloat(zoomLevel.replace('%', '')) / 100;
    
    return {
      // Scale font size to adjust content size
      fontSize: `${13 * zoomPercentage}px`,
      // Adjust row height based on zoom
      '--row-height': `${24 * zoomPercentage}px`,
      '--cell-min-width': `${150 * zoomPercentage}px`,
    } as React.CSSProperties;
  }, [zoomLevel]);
  
  // Extract domain from company name
  const getCompanyDomain = (companyName?: string) => {
    if (!companyName) return undefined;
    // Convert company name to a domain-like string
    return companyName.toLowerCase().replace(/\s+/g, '') + '.com';
  };

  // Open Points of Contact dialog for an opportunity
  const openPointsOfContact = (rowId: string) => {
    const row = data.find(r => r.id === rowId);
    if (row) {
      setCurrentOpportunity({
        id: row.id,
        name: row.opportunity || 'Opportunity',
        company: row.company
      });
      setIsPointsOfContactOpen(true);
    }
  };

  // Handle zoom change
  const handleZoomChange = (zoom: string) => {
    setZoomLevel(zoom);
  };

  // Wrap the cell change handler to save to Supabase
  const handleCellChangeAndSave = (rowId: string, colKey: string, value: any, type: string) => {
    // First handle the local change
    handleCellChange(rowId, colKey, value);
    
    // Then save to Supabase if callback is provided
    if (onCellChange && !rowId.startsWith('empty-row-')) {
      onCellChange(rowId, colKey, value);
    }
  };

  // Handle saving contacts
  const handleSaveContacts = (contacts: any[]) => {
    if (!currentOpportunity) return;
    
    // In a real implementation, this would update the opportunity's contacts in the database
    console.log(`Saved ${contacts.length} contacts for opportunity ${currentOpportunity.name}`);
    
    // Update the primary contact in the grid if needed
    if (contacts.length > 0 && onCellChange) {
      onCellChange(currentOpportunity.id, 'primary_contact', contacts[0].name);
    }
  };
  
  // Add row hover actions to render function
  const renderRowActions = (rowId: string) => {
    if (rowId.startsWith('empty-row-')) return null;
    
    return (
      <div className="absolute left-0 top-0 h-full opacity-0 group-hover:opacity-100 flex items-center">
        <button 
          className="p-1 bg-white rounded shadow hover:text-blue-600 transition-colors"
          onClick={() => openPointsOfContact(rowId)}
          title="Edit Points of Contact"
        >
          <Pencil size={14} />
        </button>
      </div>
    );
  };
  
  return (
    <div 
      className="h-full flex flex-col full-screen-grid" 
      onKeyDown={(e) => handleKeyDown(e)} 
      tabIndex={-1}
      style={gridStyle}
    >
      {/* Grid Toolbar - Including filter options */}
      <GridToolbar 
        listType={listType} 
        columns={columns}
        onAddItem={onAddItem || undefined}
        onZoomChange={handleZoomChange}
        currentZoom={zoomLevel}
      />
      
      {/* Grid Headers */}
      <GridHeaders 
        frozenColumns={frozenColumns}
        scrollableColumns={scrollableColumns}
        frozenColsTemplate={frozenColsTemplate}
        scrollableColsTemplate={scrollableColsTemplate}
        editingHeader={editingHeader}
        setEditingHeader={setEditingHeader}
        draggedColumn={draggedColumn}
        dragOverColumn={dragOverColumn}
        headerRef={headerRef}
        isAddingColumn={isAddingColumn}
        setIsAddingColumn={setIsAddingColumn}
        newColumn={newColumn}
        setNewColumn={setNewColumn}
        addColumn={addColumn}
        onHeaderDoubleClick={handleHeaderDoubleClick}
        onRenameColumn={renameColumn}
        onDuplicateColumn={duplicateColumn}
        onMoveColumn={moveColumn}
        onSortColumn={sortColumn}
        onDeleteColumn={deleteColumn}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
      
      {/* Grid Content */}
      <GridBody
        data={data}
        frozenColumns={frozenColumns}
        scrollableColumns={scrollableColumns}
        frozenColsTemplate={frozenColsTemplate}
        scrollableColsTemplate={scrollableColsTemplate}
        activeCell={activeCell}
        showSaveIndicator={showSaveIndicator}
        bodyRef={bodyRef}
        onCellClick={handleCellClick}
        onCellChange={handleCellChangeAndSave}
        renderRowActions={renderRowActions}
      />
      
      {/* Points of Contact Dialog */}
      {currentOpportunity && listId && (
        <PointsOfContactDialog
          isOpen={isPointsOfContactOpen}
          onClose={() => setIsPointsOfContactOpen(false)}
          listId={listId}
          opportunityId={currentOpportunity.id}
          opportunityName={currentOpportunity.name}
          companyDomain={getCompanyDomain(currentOpportunity.company)}
          onSave={handleSaveContacts}
          initialContacts={[]} // Would be populated from real data in a complete implementation
        />
      )}
    </div>
  );
}
