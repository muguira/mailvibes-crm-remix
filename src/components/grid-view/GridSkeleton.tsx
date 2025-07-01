import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface GridSkeletonProps {
  rowCount?: number;
  columnCount?: number;
  showToolbar?: boolean;
}

export function GridSkeleton({ 
  rowCount = 10, 
  columnCount = 7, 
  showToolbar = true 
}: GridSkeletonProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar skeleton */}
      {showToolbar && (
        <div className="h-14 border-b border-gray-200 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-9" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      )}

      {/* Grid content with loading overlay */}
      <div className="flex-1 relative">
        {/* Simple grid skeleton */}
        <div className="p-4">
          {/* Headers */}
          <div className="flex gap-4 mb-2 pb-2 border-b">
            <div className="w-12"></div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
          
          {/* Rows */}
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className="flex gap-4 py-2">
              <div className="w-12 text-sm text-gray-400">{i + 1}</div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Loading spinner overlay */}
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600 font-medium">Loading contacts...</p>
          </div>
        </div>
      </div>
    </div>
  );
} 