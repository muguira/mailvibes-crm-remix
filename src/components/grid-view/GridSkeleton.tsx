import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { INDEX_COLUMN_WIDTH } from './grid-constants';

interface GridSkeletonProps {
  rowCount?: number;
  columnCount?: number;
  showToolbar?: boolean;
}

export function GridSkeleton({ 
  rowCount = 10, 
  columnCount = 8, 
  showToolbar = true 
}: GridSkeletonProps) {
  return (
    <div className="grid-view">
      {/* Toolbar skeleton */}
      {showToolbar && (
        <div className="grid-toolbar">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              {/* Search skeleton */}
              <Skeleton className="h-9 w-64" />
              {/* Filter button skeleton */}
              <Skeleton className="h-9 w-9" />
            </div>
            <div className="flex items-center gap-2">
              {/* Action buttons skeleton */}
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        </div>
      )}

      <div className="grid-components-container">
        {/* Static columns skeleton (index + contact) */}
        <div className="static-columns-container" style={{ width: INDEX_COLUMN_WIDTH + 180 }}>
          {/* Headers */}
          <div className="static-headers">
            <Skeleton className="index-header h-9" style={{ width: INDEX_COLUMN_WIDTH }} />
            <Skeleton className="opportunity-header h-9" style={{ width: 180 }} />
          </div>
          
          {/* Rows */}
          <div className="static-rows-container">
            {Array.from({ length: rowCount }).map((_, index) => (
              <div key={index} className="static-row flex">
                <div className="index-cell" style={{ width: INDEX_COLUMN_WIDTH }}>
                  <Skeleton className="h-4 w-6" />
                </div>
                <div className="opportunity-cell" style={{ width: 180 }}>
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main grid skeleton */}
        <div className="main-grid-view flex-1">
          {/* Headers */}
          <div className="main-grid-header">
            <div className="grid-header-row flex">
              {Array.from({ length: columnCount }).map((_, index) => (
                <div key={index} className="grid-header-cell" style={{ width: 200 }}>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="main-grid-body">
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex" style={{ height: 36 }}>
                {Array.from({ length: columnCount }).map((_, colIndex) => (
                  <div key={colIndex} className="grid-cell" style={{ width: 200 }}>
                    <Skeleton className="h-4 w-full max-w-[150px]" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 