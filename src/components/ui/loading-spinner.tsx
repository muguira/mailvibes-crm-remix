import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  inline?: boolean;
}

export function LoadingSpinner({ 
  size = 'md', 
  className,
  inline = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const spinner = (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-[#32BAB0]',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (inline) {
    return spinner;
  }

  return (
    <div className="flex items-center justify-center p-4">
      {spinner}
    </div>
  );
}

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
  className?: string;
}

export function LoadingOverlay({ 
  show, 
  message = 'Loading...', 
  className 
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50',
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        {message && (
          <p className="text-sm text-gray-600 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
} 