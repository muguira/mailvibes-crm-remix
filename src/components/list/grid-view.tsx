
import { useState } from "react";
import { 
  ChevronDown, 
  Filter, 
  Plus, 
  FileDown, 
  ChevronRight, 
  ArrowDownAZ, 
  ArrowUpZA,
  Edit
} from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";

interface ColumnDef {
  key: string;
  header: string;
  type: "text" | "number" | "date" | "status";
  editable?: boolean;
  width?: number;
}

interface RowData {
  id: string;
  [key: string]: any;
}

interface GridViewProps {
  columns: ColumnDef[];
  data: RowData[];
  listName: string;
  listType: string;
}

export function GridView({ columns, data, listName, listType }: GridViewProps) {
  const [activeCell, setActiveCell] = useState<{ row: string; col: string } | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  
  const handleCellClick = (rowId: string, colKey: string) => {
    setActiveCell({ row: rowId, col: colKey });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-light/30 p-2 flex items-center justify-between">
        <div className="flex items-center">
          <button className="p-1 rounded hover:bg-slate-light/20 text-slate-medium">
            <input type="checkbox" className="mr-2" />
          </button>
          <button className="ml-2 w-8 h-8 flex items-center justify-center rounded hover:bg-slate-light/20 text-slate-medium">
            <FileDown size={18} />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <CustomButton 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <Filter size={14} />
              <span>Filters</span>
              <span className="text-xs bg-teal-primary text-white rounded-full px-1.5">2</span>
            </CustomButton>
            
            {filterOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-light/50 shadow-relate rounded-md z-20">
                <div className="p-3 border-b border-slate-light/30">
                  <p className="font-semibold text-sm">Custom Filter</p>
                </div>
                
                <div className="p-3 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {columns.map(col => (
                      <div key={col.key} className="flex items-center">
                        <input type="checkbox" id={`filter-${col.key}`} className="mr-2" />
                        <label htmlFor={`filter-${col.key}`} className="text-sm">{col.header}</label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-3 border-t border-slate-light/30 flex justify-end space-x-2">
                  <button className="px-3 py-1 text-sm border border-slate-light/50 rounded">
                    Close
                  </button>
                  <button className="px-3 py-1 text-sm bg-teal-primary text-white rounded">
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <CustomButton 
            variant="default" 
            size="sm"
            className="flex items-center gap-1"
          >
            <Plus size={14} />
            <span>Add {listType}</span>
          </CustomButton>
        </div>
      </div>
      
      {/* Grid Headers */}
      <div className="grid-header grid" style={{ gridTemplateColumns: `40px repeat(${columns.length}, minmax(150px, 1fr))` }}>
        <div className="grid-header-cell"></div>
        {columns.map((column) => (
          <div 
            key={column.key} 
            className="grid-header-cell"
          >
            <span>{column.header}</span>
            <div className="flex items-center">
              <button className="p-1 rounded hover:bg-slate-light/20">
                <ArrowDownAZ size={14} />
              </button>
              <button className="p-1 rounded hover:bg-slate-light/20">
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Grid Content */}
      <div className="overflow-auto flex-1">
        {data.map((row, rowIndex) => (
          <div 
            key={row.id}
            className="grid grid-row"
            style={{ gridTemplateColumns: `40px repeat(${columns.length}, minmax(150px, 1fr))` }}
          >
            <div className="grid-cell flex items-center">
              <input type="checkbox" className="ml-2" />
              <button className="ml-2 text-slate-medium">
                <Edit size={14} />
              </button>
            </div>
            
            {columns.map((col) => (
              <div 
                key={`${row.id}-${col.key}`} 
                className={`grid-cell ${activeCell?.row === row.id && activeCell?.col === col.key ? 'bg-blue-50' : ''}`}
                onClick={() => col.editable && handleCellClick(row.id, col.key)}
                tabIndex={0}
              >
                {activeCell?.row === row.id && activeCell?.col === col.key ? (
                  <input 
                    type="text"
                    className="w-full bg-transparent outline-none"
                    defaultValue={row[col.key]}
                    autoFocus
                    onBlur={() => setActiveCell(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setActiveCell(null)}
                  />
                ) : (
                  col.type === 'status' ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      row[col.key] === 'Deal Won' ? 'bg-teal-primary/20 text-teal-primary' : 
                      row[col.key] === 'Qualified' ? 'bg-blue-100 text-blue-600' : 
                      row[col.key] === 'In Procurement' ? 'bg-purple-100 text-purple-600' :
                      row[col.key] === 'Contract Sent' ? 'bg-yellow-100 text-yellow-600' :
                      row[col.key] === 'Discovered' ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {row[col.key]}
                    </span>
                  ) : (
                    <span>{row[col.key]}</span>
                  )
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
