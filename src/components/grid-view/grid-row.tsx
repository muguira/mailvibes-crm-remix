
import React from 'react';
import { GridCell } from '@/components/list/grid-cell';
import { Column } from './types';

interface GridRowProps {
  rowId: string;
  columns: Column[];
  rowData: Record<string, any>;
  onCellClick: (rowId: string, columnId: string) => void;
  onCellChange: (rowId: string, columnId: string, value: any) => void;
  onCellContextMenu?: (columnId: string, position: { x: number, y: number }) => void;
  activeCell?: { row: string, col: string } | null;
  showSaveIndicator?: { row: string, col: string } | null;
}

export function GridRow({
  rowId,
  columns,
  rowData,
  onCellClick,
  onCellChange,
  onCellContextMenu,
  activeCell,
  showSaveIndicator
}: GridRowProps) {
  return (
    <div className="grid-row" data-row-id={rowId}>
      <div className="row-number">{rowId}</div>
      <div className="row-cells">
        {columns.map((column) => {
          const isActive = activeCell?.row === rowId && activeCell?.col === column.id;
          const showIndicator = showSaveIndicator?.row === rowId && showSaveIndicator?.col === column.id;
          
          return (
            <GridCell
              key={column.id}
              rowId={rowId}
              colKey={column.id}
              value={rowData[column.id] || ''}
              type={column.type || 'text'}
              options={column.options}
              colors={column.colors}
              isActive={isActive}
              onClick={() => onCellClick(rowId, column.id)}
              onChange={(value) => onCellChange(rowId, column.id, value)}
              showSaveIndicator={showIndicator}
              onContextMenu={onCellContextMenu}
            />
          );
        })}
      </div>
    </div>
  );
}
