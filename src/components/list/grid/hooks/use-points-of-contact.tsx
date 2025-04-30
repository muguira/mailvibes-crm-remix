
import { useRef } from "react";
import { Pencil } from "lucide-react";

type OpenPointsOfContactFn = (rowId: string, opportunity: string, company?: string) => void;

export function usePointsOfContact() {
  const openPointsOfContactRef = useRef<OpenPointsOfContactFn | null>(null);
  
  // Function to store the reference 
  const setOpenPointsOfContactFn = (fn: OpenPointsOfContactFn) => {
    openPointsOfContactRef.current = fn;
  };
  
  // Function to call the actual implementation
  const openPointsOfContact = (rowId: string, rowData: any) => {
    if (openPointsOfContactRef.current && !rowId.startsWith('empty-row-')) {
      openPointsOfContactRef.current(
        rowId, 
        rowData.opportunity || 'Opportunity', 
        rowData.company
      );
    }
  };

  // Render row action buttons
  const renderRowActions = (rowId: string, rowData: any) => {
    if (rowId.startsWith('empty-row-')) return null;
    
    return (
      <div className="absolute left-0 top-0 h-full opacity-0 group-hover:opacity-100 flex items-center">
        <button 
          className="p-1 bg-white rounded shadow hover:text-blue-600 transition-colors"
          onClick={() => openPointsOfContact(rowId, rowData)}
          title="Edit Points of Contact"
        >
          <Pencil size={14} />
        </button>
      </div>
    );
  };

  return {
    setOpenPointsOfContactFn,
    renderRowActions
  };
}
