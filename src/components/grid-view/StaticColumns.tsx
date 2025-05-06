import React from 'react';
import { Column, GridRow } from './types';
import { ROW_HEIGHT, HEADER_HEIGHT, INDEX_COLUMN_WIDTH } from './grid-constants';
import { Link } from 'react-router-dom';

interface StaticColumnsProps {
  data: GridRow[];
  opportunityColumn?: Column;
  scrollTop: number;
  firstRowIndex: number;
  onCellChange?: (rowId: string, columnId: string, value: any) => void;
  onContextMenu?: (columnId: string | null, position?: { x: number, y: number }) => void;
}

export function StaticColumns({
  data,
  opportunityColumn,
  scrollTop,
  firstRowIndex,
  onCellChange,
  onContextMenu
}: StaticColumnsProps) {
  // Handle context menu event
  const handleContextMenu = (e: React.MouseEvent, rowId: string, columnId: string) => {
    e.preventDefault();
    if (onContextMenu) {
      onContextMenu(columnId, { x: e.clientX, y: e.clientY });
    }
  };

  // Handle double click for opportunity editing (could implement inline edit)
  const handleDoubleClick = (rowId: string) => {
    console.log('Double clicked opportunity cell:', rowId);
    // Here you could implement an inline edit functionality
  };

  // Get opportunity width
  const opportunityWidth = opportunityColumn?.width || 150;

  return (
    <div className="static-columns-container">
      {/* Header row */}
      <div className="static-headers">
        <div 
          className="index-header" 
          style={{ 
            width: INDEX_COLUMN_WIDTH, 
            height: HEADER_HEIGHT 
          }}
        >
          #
        </div>
        
        {opportunityColumn && (
          <div 
            className="opportunity-header" 
            style={{ 
              width: opportunityWidth, 
              height: HEADER_HEIGHT 
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (onContextMenu) {
                onContextMenu(opportunityColumn.id, { x: e.clientX, y: e.clientY });
              }
            }}
          >
            {opportunityColumn.title}
          </div>
        )}
      </div>
      
      {/* Scrollable body that syncs with main grid */}
      <div 
        className="static-rows-container"
        style={{ 
          transform: `translateY(-${scrollTop}px)`,
          height: `${data.length * ROW_HEIGHT}px`,
          position: 'relative',
          top: 0 
        }}
      >
        {data.map((row, index) => (
          <div 
            key={row.id} 
            className="static-row" 
            style={{ 
              position: 'absolute',
              top: `${index * ROW_HEIGHT}px`,
              height: ROW_HEIGHT,
              width: '100%',
              display: 'flex' 
            }}
          >
            {/* Index cell */}
            <div 
              className="index-cell" 
              style={{ 
                width: INDEX_COLUMN_WIDTH,
                height: ROW_HEIGHT 
              }}
            >
              {firstRowIndex + index + 1}
            </div>
            
            {/* Opportunity cell */}
            {opportunityColumn && (
              <div 
                className="opportunity-cell" 
                style={{ 
                  width: opportunityWidth,
                  height: ROW_HEIGHT 
                }}
                onContextMenu={(e) => handleContextMenu(e, row.id, opportunityColumn.id)}
                onDoubleClick={() => handleDoubleClick(row.id)}
              >
                {opportunityColumn.renderCell ? (
                  opportunityColumn.renderCell(row[opportunityColumn.id], row)
                ) : (
                  <span className="opportunity-text">{row[opportunityColumn.id]}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 