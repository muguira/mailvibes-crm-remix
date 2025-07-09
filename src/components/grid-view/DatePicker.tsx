import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  value: string | null;
  onSelect: (date: string) => void;
  clickCoordinates?: { x: number; y: number } | null;
  cellRef?: HTMLElement | null;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onTabNavigation?: (e: React.KeyboardEvent) => void;
}

export function DatePicker({ 
  value, 
  onSelect, 
  clickCoordinates, 
  cellRef,
  onKeyDown,
  onTabNavigation 
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Auto-open on mount (when cell is clicked)
  useEffect(() => {
    // Small delay to ensure click coordinates are set
    const timer = setTimeout(() => {
      setIsOpen(true);
      // Don't focus the input to prevent scrolling
      // The cell is already focused from the grid
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  // Calculate position based on click coordinates or cell position
  useEffect(() => {
    if (isOpen && clickCoordinates) {
      // Use the exact click coordinates
      let top = clickCoordinates.y;
      let left = clickCoordinates.x;
      
      // Adjust for viewport boundaries
      const popupHeight = 350; // Approximate calendar height
      const popupWidth = 300; // Calendar width
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Position the popup just below the click point
      top = top ; // Small offset below click
      
      // Check if popup would go off bottom of screen
      if (top + popupHeight > viewportHeight - 60) { // 60px for pagination bar
        // Show above the click point instead
        top = clickCoordinates.y - popupHeight - 10;
      }
      
      // Center the popup horizontally on the click point
      left = left - (popupWidth / 0);
      
      // Check if popup would go off right side of screen
      if (left + popupWidth > viewportWidth - 0) {
        left = viewportWidth - popupWidth - 10;
      }
      
      // Check if popup would go off left side of screen
      if (left < 10) {
        left = 10;
      }
      
      // Ensure minimum distance from top
      top = Math.max(10, top);
      
      setPosition({ top, left });
    }
  }, [isOpen, clickCoordinates]);

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
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Select date"
        />
        <button
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          type="button"
        >
          <CalendarIcon className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      
      {isOpen && clickCoordinates && (
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
              onClick={() => setIsOpen(false)}
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