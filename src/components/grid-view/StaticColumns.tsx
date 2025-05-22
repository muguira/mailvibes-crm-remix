import React from 'react';
import { Column, GridRow } from './types';
import { ROW_HEIGHT, HEADER_HEIGHT, INDEX_COLUMN_WIDTH } from './grid-constants';
import { Link } from 'react-router-dom';

interface StaticColumnsProps {
  data: GridRow[];
  frozenColumns: Column[];
  scrollTop: number;
  firstRowIndex: number;
  onCellChange?: (rowId: string, columnId: string, value: any) => void;
  onContextMenu?: (columnId: string | null, position?: { x: number, y: number }) => void;
  onTogglePin: (columnId: string) => void;
  frozenColumnIds: string[];
}

export function StaticColumns({
  data,
  frozenColumns,
  scrollTop,
  firstRowIndex,
  onContextMenu,
  onTogglePin,
  frozenColumnIds
}: StaticColumnsProps) {
  // Handle context menu event
  const handleContextMenu = (e: React.MouseEvent, rowId: string, columnId: string) => {
    e.preventDefault();
    if (onContextMenu) {
      onContextMenu(columnId, { x: e.clientX, y: e.clientY });
    }
  };

  // Handle double click for contact/opportunity editing (could implement inline edit)
  const handleDoubleClick = (rowId: string) => {
    console.log('Double clicked contact/opportunity cell:', rowId);
    // Here you could implement an inline edit functionality
  };

  // Exit early if no opportunity/contact column
  if (frozenColumns.length === 0) return null;

  // Calcular el ancho total de columnas fijas (index + las demás)
  const totalFrozenWidth = INDEX_COLUMN_WIDTH + frozenColumns.reduce((w, c) => w + (c.width || 150), 0);

  return (
    <div
      className="static-columns-container"
      style={{
        width: `${totalFrozenWidth}px`,
        position: 'relative',
        zIndex: 45
      }}
    >
      {/* Header row */}
      <div className="static-headers" style={{ display: 'flex' }}>
        {/* Columna index siempre fija, sin pin */}
        <div
          className="static-header-cell index-header"
          style={{
            width: INDEX_COLUMN_WIDTH,
            height: HEADER_HEIGHT,
            position: 'sticky',
            left: 0,
            zIndex: 45,
            display: 'flex',
            alignItems: 'center',
            background: '#f9fafb',
            borderRight: '1px solid #e5e7eb',
            fontWeight: 500,
            fontSize: '0.75rem',
            color: '#6b7280',
            boxSizing: 'border-box',
            justifyContent: 'center',
          }}
        >
          #
        </div>
        {/* El resto de columnas fijas */}
        {frozenColumns.map((col, idx) => (
          <div
            key={col.id}
            className={`static-header-cell group`}
            style={{
              width: col.width,
              height: HEADER_HEIGHT,
              position: 'sticky',
              left: `${INDEX_COLUMN_WIDTH + frozenColumns.slice(0, idx).reduce((w, c) => w + (c.width || 150), 0) - 1}px`,
              zIndex: 45,
              display: 'flex',
              alignItems: 'center',
              background: '#f9fafb',
              borderRight: '1px solid #e5e7eb',
              padding: '0 0.75rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: '#111827',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
            onContextMenu={e => {
              e.preventDefault();
              if (onContextMenu) onContextMenu(col.id, { x: e.clientX, y: e.clientY });
            }}
          >
            <span style={{ flex: 1 }}>{col.title}</span>
            <span
              className={`pin-icon ml-2 ${frozenColumnIds.includes(col.id) ? 'text-[#62BFAA]' : 'text-gray-400'} group-hover:opacity-100 opacity-0`}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
              onClick={e => { e.stopPropagation(); onTogglePin(col.id); }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 7l-10 10M20 4l-3 3m-7 7l-3 3m9-9l-9 9"/></svg>
            </span>
          </div>
        ))}
      </div>

      {/* Scrollable body that syncs with main grid */}
      <div
        className="static-rows-container"
        style={{
          transform: `translateY(-${scrollTop}px)`,
          height: `${data.length * ROW_HEIGHT}px`,
          position: 'relative',
          borderRight: '1px solid #e5e7eb',
          top: 0,
          width: '100%'
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
              display: 'flex',
              zIndex: 44
            }}
          >
            {/* Index cell */}
            <div
              className="index-cell"
              style={{
                width: INDEX_COLUMN_WIDTH,
                height: ROW_HEIGHT,
                position: 'sticky',
                left: 0,
                zIndex: 44,
                borderRight: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: '#6b7280',
                backgroundColor: '#fff',
                boxSizing: 'border-box',
              }}
            >
              {firstRowIndex + index + 1}
            </div>
            {/* Celdas de columnas fijas */}
            {frozenColumns.map((col, idx) => (
              <div
                key={col.id}
                className={`opportunity-cell`}
                style={{
                  width: col.width,
                  height: ROW_HEIGHT,
                  position: 'sticky',
                  left: `${INDEX_COLUMN_WIDTH + frozenColumns.slice(0, idx).reduce((w, c) => w + (c.width || 150), 0) - 1}px`,
                  zIndex: 44,
                  borderRight: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  fontSize: '0.875rem',
                  color: '#111827',
                  padding: '0 0.75rem',
                }}
                onContextMenu={e => handleContextMenu(e, row.id, col.id)}
                onDoubleClick={() => handleDoubleClick(row.id)}
              >
                {col.renderCell ? (
                  col.renderCell(row[col.id], row)
                ) : (
                  <span className="opportunity-text">
                    {col.id === 'name' ? (
                      <Link to={`/stream-view/${row.id}`} className="text-primary hover:underline">
                        {row[col.id]}
                      </Link>
                    ) : (
                      row[col.id]
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
} 