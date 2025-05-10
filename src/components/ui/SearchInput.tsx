
import React, { forwardRef, useRef } from 'react';
import { Search } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, placeholder = 'Search...', className = '' }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const combinedRef = (ref || inputRef) as React.RefObject<HTMLInputElement>;

    const handleContainerClick = () => {
      if (combinedRef.current) {
        combinedRef.current.focus();
      }
    };

    return (
      <div
        className={`flex items-center px-3 py-1.5 border border-slate-light rounded-md 
          bg-white hover:border-slate-medium focus-within:border-teal-primary 
          focus-within:ring-1 focus-within:ring-teal-primary transition-colors ${className}`}
        onClick={handleContainerClick}
      >
        <Search className="h-4 w-4 text-slate-medium mr-2" />
        <input
          ref={combinedRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 outline-none text-sm border-none focus:ring-0 p-0"
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export { SearchInput };
