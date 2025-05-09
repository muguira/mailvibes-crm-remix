
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  inputClassName?: string;
  onSubmit?: (value: string) => void;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search...',
  value,
  onChange,
  className,
  inputClassName,
  onSubmit,
  autoFocus,
}) => {
  const [searchValue, setSearchValue] = useState(value || '');
  const [focused, setFocused] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

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
        'relative flex items-center',
        {
          'ring-2 ring-primary/50 rounded-md': focused,
        },
        className
      )}
      onSubmit={handleSubmit}
    >
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        className={cn(
          'pl-10 pr-8 h-9 md:w-64 lg:w-72 rounded-md border border-input bg-background',
          inputClassName
        )}
        value={searchValue}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
      />
      {searchValue && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={handleClear}
        >
          <X size={16} />
        </button>
      )}
    </form>
  );
};
