import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  width?: string;
  maxWidth?: number;
  variant?: 'stream' | 'leads';
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  width = "w-[200px]",
  maxWidth,
  variant = "stream"
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div className={`relative ${className}`} style={{ maxWidth: maxWidth ? `${maxWidth}px` : undefined }}>
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`pl-8 pr-4 py-1 text-sm focus:outline-none border-b ${
          isFocused || value 
            ? "border-[#1FAF83]" 
            : "border-[#D7DCE4]"
        } transition-colors ${width}`}
      />
      {value && (
        <button 
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
} 