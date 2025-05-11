import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  width?: string;
  onSubmit?: (value: string) => void;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search...',
  value,
  onChange,
  className,
  width = 'w-[240px]',
  onSubmit,
  autoFocus,
}) => {
  const [searchValue, setSearchValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Update internal state when external value changes
  useEffect(() => {
    if (value !== undefined) {
      setSearchValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleClear = () => {
    setSearchValue('');
    if (onChange) {
      onChange('');
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(searchValue);
    }
  };

  return (
    <form
      className={cn(
        'relative',
        width,
        className
      )}
      onSubmit={handleSubmit}
    >
      <div className="relative">
        {/* Magnifying glass icon */}
        <Search
          size={16}
          className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500"
        />
        
        {/* Search input with underline styling */}
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className={cn(
            'w-full pl-6 pr-6 py-1 bg-transparent border-b border-gray-300 focus:outline-none',
            {
              'border-b-[#62bfaa]': isFocused || searchValue,
            }
          )}
          value={searchValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoFocus={autoFocus}
        />
        
        {/* Clear button (X) - only shown when there's content */}
        {searchValue && (
          <button
            type="button"
            className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={handleClear}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </form>
  );
};
 