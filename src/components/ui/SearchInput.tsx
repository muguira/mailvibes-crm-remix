import React, { useState, useEffect } from 'react';
import { Search, X, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContactsStore } from '@/stores/contactsStore';
import { toast } from '@/hooks/use-toast';

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

  // Get contacts loading state
  const { loading, isBackgroundLoading, firstBatchLoaded } = useContactsStore();

  // Check if contacts are still loading
  const isContactsLoading = loading || !firstBatchLoaded;
  
  // Track previous loading state to detect when loading completes
  const [wasLoading, setWasLoading] = useState(isContactsLoading);

  // Update internal state when external value changes
  useEffect(() => {
    if (value !== undefined) {
      setSearchValue(value);
    }
  }, [value]);

  // Auto-focus and position cursor when contacts finish loading
  useEffect(() => {
    // Detect when loading transitions from true to false
    if (wasLoading && !isContactsLoading && inputRef.current) {
      // Small delay to ensure UI has updated
      setTimeout(() => {
        if (inputRef.current) {
          // Focus the input
          inputRef.current.focus();
          
          // Position cursor at the end of the current text
          const length = inputRef.current.value.length;
          inputRef.current.setSelectionRange(length, length);
          
          console.log(`[SearchInput] Auto-focused after load complete. Cursor positioned after: "${searchValue}"`);
        }
      }, 50);
    }
    
    // Update the previous loading state
    setWasLoading(isContactsLoading);
  }, [isContactsLoading, wasLoading, searchValue]);

  // Initial focus on mount if contacts are already loaded
  useEffect(() => {
    if (!isContactsLoading && inputRef.current && autoFocus) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Position cursor at the end of the text
          const length = inputRef.current.value.length;
          inputRef.current.setSelectionRange(length, length);
        }
      }, 100);
    }
  }, []); // Run only on mount

  // Show loading toast when user tries to interact while loading
  const showLoadingToast = () => {
    if (isContactsLoading) {
      toast({
        title: "Loading contacts...",
        description: "Please wait while we load all your contacts. You'll be able to edit data once loading is complete.",
        duration: 3000,
      });
      return true;
    }
    return false;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleClear = () => {
    if (showLoadingToast()) return;
    
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
    if (showLoadingToast()) return;
    
    if (onSubmit) {
      onSubmit(searchValue);
    }
  };

  const handleFocus = () => {
    if (showLoadingToast()) {
      inputRef.current?.blur();
      return;
    }
    setIsFocused(true);
  };

  const handleClick = () => {
    if (showLoadingToast()) return;
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
          onFocus={handleFocus}
          onBlur={() => setIsFocused(false)}
          onClick={handleClick}
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
 