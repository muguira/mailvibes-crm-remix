import React from 'react';
import { Column, GridRow } from './types';
import { ROW_HEIGHT, HEADER_HEIGHT, INDEX_COLUMN_WIDTH } from './grid-constants';
import { Link } from 'react-router-dom';

interface StaticColumnsProps {
  data: GridRow[];
  opportunityColumn?: Column;  // This can be either opportunity or name(contact) column
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
  onContextMenu
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
  if (!opportunityColumn) return null;

  // Get contact/opportunity width
  const contactWidth = opportunityColumn?.width || 150;

  // Determine if this is a name (contact) or opportunity column
  const isNameColumn = opportunityColumn.id === 'name';
  const columnTitle = isNameColumn ? 'Contact' : opportunityColumn.title;

  return (
    <div
      className="static-columns-container"
      style={{
        width: `${INDEX_COLUMN_WIDTH + contactWidth}px`,
        position: 'relative',
        zIndex: 45
      }}
    >
      {/* Header row */}
      <div className="static-headers">
        <div
          className="index-header"
          style={{
            width: INDEX_COLUMN_WIDTH,
            height: HEADER_HEIGHT,
            position: 'sticky',
            left: 0,
            zIndex: 45
          }}
        >
          #
        </div>

        <div
          className="opportunity-header"
          style={{
            width: contactWidth,
            height: HEADER_HEIGHT,
            position: 'sticky',
            left: INDEX_COLUMN_WIDTH,
            zIndex: 45
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            if (onContextMenu) {
              onContextMenu(opportunityColumn.id, { x: e.clientX, y: e.clientY });
            }
          }}
        >
          {columnTitle}
        </div>
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
                zIndex: 44
              }}
            >
              {firstRowIndex + index + 1}
            </div>

            {/* Contact/Opportunity cell */}
            <div
              className="opportunity-cell"
              style={{
                width: contactWidth,
                height: ROW_HEIGHT,
                position: 'sticky',
                left: INDEX_COLUMN_WIDTH,
                zIndex: 44
              }}
              onContextMenu={(e) => handleContextMenu(e, row.id, opportunityColumn.id)}
              onDoubleClick={() => handleDoubleClick(row.id)}
            >
              {opportunityColumn.renderCell ? (
                opportunityColumn.renderCell(row[opportunityColumn.id], row)
              ) : (
                <span className="opportunity-text">
                  {isNameColumn ? (
                    <Link to={`/stream-view/${row.id}`} className="text-primary hover:underline">
                      {row[opportunityColumn.id]}
                    </Link>
                  ) : (
                    row[opportunityColumn.id]
                  )}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 