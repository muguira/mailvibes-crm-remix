import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  value: string | null;
  onSelect: (date: string) => void;
  cellRef?: HTMLElement | null;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onTabNavigation?: (e: React.KeyboardEvent) => void;
  autoOpen?: boolean;
}

export function DatePicker({ 
  value, 
  onSelect, 
  cellRef,
  onKeyDown,
  onTabNavigation,
  autoOpen = true
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isPositionReady, setIsPositionReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const hasOpenedRef = useRef(false);

  // Calculate position BEFORE opening
  const calculateAndOpen = () => {
    if (cellRef) {
      // Get the cell's position
      const cellRect = cellRef.getBoundingClientRect();
      
      // Adjust for viewport boundaries
      const popupHeight = 350; // Approximate calendar height
      const popupWidth = 300; // Calendar width
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Default to showing above the cell
      let top = cellRect.top - popupHeight - 5;
      let left = cellRect.left + (cellRect.width / 2) - (popupWidth / 2);
      
      // Check if there's not enough space above, then show below
      if (top < 10) {
        top = cellRect.bottom + 5;
        // Check if it would go off bottom
        if (top + popupHeight > viewportHeight - 60) {
          // Still show above if no space below
          top = Math.max(10, cellRect.top - popupHeight - 5);
        }
      }
      
      // Check if popup would go off right side of screen
      if (left + popupWidth > viewportWidth - 10) {
        left = viewportWidth - popupWidth - 10;
      }
      
      // Check if popup would go off left side of screen
      if (left < 10) {
        left = 10;
      }
      
      setPosition({ top, left });
      setIsPositionReady(true);
      setIsOpen(true);
    }
  };

  // Auto-open on mount only once
  useEffect(() => {
    if (autoOpen && !hasOpenedRef.current) {
      hasOpenedRef.current = true;
      // Small delay to ensure cell element is available
      const timer = setTimeout(() => {
        calculateAndOpen();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [autoOpen]);

  // Handle clicks outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current && 
        !popupRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsPositionReady(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onSelect(format(date, 'yyyy-MM-dd'));
      setIsOpen(false);
      setIsPositionReady(false);
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && onTabNavigation) {
      e.preventDefault();
      onTabNavigation(e);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setIsPositionReady(false);
      if (onKeyDown) onKeyDown(e);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedDate) {
        onSelect(format(selectedDate, 'yyyy-MM-dd'));
      }
      if (onKeyDown) onKeyDown(e);
    } else if (onKeyDown) {
      onKeyDown(e);
    }
  };

  // Format display value
  const displayValue = selectedDate ? format(selectedDate, 'MMM d, yyyy') : '';

  return (
    <>
      <div className="relative w-full h-full flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          readOnly
          className="w-full h-full px-2 pr-8 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (!isOpen) {
              calculateAndOpen();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Select date"
        />
        <button
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isOpen) {
              setIsOpen(false);
              setIsPositionReady(false);
            } else {
              calculateAndOpen();
            }
          }}
          type="button"
        >
          <CalendarIcon className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      
      {isOpen && isPositionReady && cellRef && (
        <div
          ref={popupRef}
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-[10000] p-3"
          style={{
            top: position.top,
            left: position.left,
            minWidth: '300px',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">Select Date</span>
            <button
              onClick={() => {
                setIsOpen(false);
                setIsPositionReady(false);
              }}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
            >
              ×
            </button>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            className="rounded-md border-0"
          />
        </div>
      )}
    </>
  );
} 