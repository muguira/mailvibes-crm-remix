
import React from 'react';
import { Column } from './types';

interface GridHeaderProps {
  columns: Column[];
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void;
  onColumnsReorder?: (columnIds: string[]) => void;
  onColumnResize?: (columnIndex: number, newWidth: number) => void;
  showResizeHandles?: boolean;
  indexColumnWidth?: number;
}

export function GridHeader({ 
  columns, 
  onColumnChange,
  indexColumnWidth = 50
}: GridHeaderProps) {
  return (
    <div className="grid-header">
      {/* Index column header */}
      <div 
        className="index-header" 
        style={{ 
          width: indexColumnWidth, 
          position: 'sticky',
          left: 0,
          zIndex: 10
        }}
      >
        #
      </div>
      
      {/* Column headers */}
      <div className="columns-header">
        {columns.map((column, index) => {
          const isFirstColumn = index === 0;
          
          const headerCellStyle: React.CSSProperties = {
            width: column.width,
            minWidth: column.width,
            maxWidth: column.width,
            position: isFirstColumn && column.frozen ? 'sticky' : 'relative',
            left: isFirstColumn && column.frozen ? indexColumnWidth : 'auto',
            background: '#f9fafb',
            zIndex: isFirstColumn && column.frozen ? 5 : 'auto',
          };
          
          return (
            <div
              key={column.id}
              className={`grid-header-cell ${isFirstColumn && column.frozen ? 'grid-frozen-header' : ''}`}
              style={headerCellStyle}
            >
              <span className="header-title">{column.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
