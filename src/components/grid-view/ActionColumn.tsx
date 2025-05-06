import React from 'react';
import { Plus } from 'lucide-react';
import { ROW_HEIGHT, HEADER_HEIGHT } from './grid-constants';
import { GridRow } from './types';

interface ActionColumnProps {
  data: GridRow[];
  scrollTop: number;
  onAddNewColumn?: () => void;
}

export function ActionColumn({
  data,
  scrollTop,
  onAddNewColumn = () => {}
}: ActionColumnProps) {
  // Calculate the total content height
  const contentHeight = data.length * ROW_HEIGHT;
  
  return (
    <div className="action-column-container">
      {/* Header with add button */}
      <div 
        className="action-column-header"
        style={{ height: HEADER_HEIGHT }}
      >
        <button 
          className="add-column-button"
          onClick={onAddNewColumn}
          aria-label="Add new column"
        >
          <Plus size={16} />
        </button>
      </div>
      
      {/* Action links that sync with grid - removed external links */}
      <div 
        className="action-column-rows"
        style={{ 
          transform: `translateY(-${scrollTop}px)`,
          height: contentHeight,
          position: 'relative',
          top: 0
        }}
      >
        {data.map((row, index) => (
          <div
            key={row.id}
            className="action-row"
            style={{
              position: 'absolute',
              top: `${index * ROW_HEIGHT}px`,
              height: ROW_HEIGHT,
              width: '100%'
            }}
          >
            {/* External link icons removed */}
          </div>
        ))}
      </div>
    </div>
  );
} 