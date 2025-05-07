import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  width?: string;
  variant?: 'stream' | 'leads';
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  width = "w-[200px]",
  variant = "stream"
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // If switching to desktop, ensure search is expanded
      if (window.innerWidth >= 768) {
        setIsExpanded(true);
      } else {
        // On mobile, collapse when not focused and empty
        setIsExpanded(isFocused || value.length > 0);
      }
    };
    
    // Set initial state
    checkMobile();
    
    // Update on resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [value, isFocused]);
  
  // Handle search icon click on mobile
  const handleSearchIconClick = () => {
    if (isMobile) {
      setIsExpanded(!isExpanded);
      // If expanding, focus the input
      if (!isExpanded) {
        setTimeout(() => {
          document.querySelector('.search-input-field')?.focus();
        }, 10);
      }
    }
  };
  
  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Search icon - always visible */}
      <div 
        className={`${isMobile ? 'cursor-pointer p-2' : 'absolute left-2 top-1/2 -translate-y-1/2 z-10'}`} 
        onClick={handleSearchIconClick}
      >
        <Search className={`h-4 w-4 text-gray-400 ${isMobile ? 'mx-auto' : ''}`} />
      </div>
      
      {/* Search input - can be collapsed on mobile */}
      {(!isMobile || isExpanded) && (
        <div className={`relative transition-all duration-200 ease-in-out ${isMobile ? 'w-full' : ''}`}>
          <input
            type="text"
            className={`search-input-field pl-8 pr-4 py-1 text-sm focus:outline-none border-b ${
              isFocused || value 
                ? "border-[#1FAF83]" 
                : "border-[#D7DCE4]"
            } transition-colors ${isMobile ? 'w-full' : width}`}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              setIsExpanded(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              if (isMobile && value.length === 0) {
                setTimeout(() => setIsExpanded(false), 100);
              }
            }}
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
      )}
    </div>
  );
} 