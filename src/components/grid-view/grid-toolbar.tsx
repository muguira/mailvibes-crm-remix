import React, { useState } from "react";
import { ChevronDown, ChevronUp, Filter, Plus, Check } from "lucide-react";
import { ColumnType } from "./types";
import { SearchInput } from "@/components/ui/SearchInput";

interface GridToolbarProps {
  listType: string;
  columns: ColumnType[];
  onAddItem?: (() => void) | null;
}

export function FilterControl({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (term: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center">
      <SearchInput 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder} 
        className="w-80"
      />
    </div>
  );
}

export function SortControl({
  column,
  onSort,
}: {
  column: ColumnType;
  onSort: (direction: "asc" | "desc" | null) => void;
}) {
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  const handleSort = () => {
    let newDirection: "asc" | "desc" | null = "asc";
    if (sortDirection === "asc") {
      newDirection = "desc";
    } else if (sortDirection === "desc") {
      newDirection = null;
    }
    setSortDirection(newDirection);
    onSort(newDirection);
  };

  return (
    <button
      className="flex items-center justify-center px-3 py-1.5 rounded-md bg-white hover:bg-slate-light transition-colors"
      onClick={handleSort}
    >
      {sortDirection === "asc" ? (
        <ChevronUp className="h-4 w-4" />
      ) : sortDirection === "desc" ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <Filter className="h-4 w-4" />
      )}
    </button>
  );
}

export function AddItemControl({ onAddItem }: { onAddItem?: (() => void) | null }) {
  return onAddItem ? (
    <button
      className="flex items-center justify-center px-3 py-1.5 rounded-md bg-white hover:bg-slate-light transition-colors"
      onClick={onAddItem}
      aria-label="Add Contact"
    >
      <Plus className="h-4 w-4" />
    </button>
  ) : null;
}

export function GridToolbar({ listType, columns, onAddItem }: GridToolbarProps) {
  const [filterTerm, setFilterTerm] = useState("");

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-4">
        <FilterControl
          value={filterTerm}
          onChange={setFilterTerm}
          placeholder={`Filter ${listType}...`}
        />
        {columns.map((column) => (
          <SortControl key={column.id} column={column} onSort={() => {}} />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <AddItemControl onAddItem={onAddItem} />
        <button className="flex items-center justify-center px-3 py-1.5 rounded-md bg-white hover:bg-slate-light transition-colors">
          <Check className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
