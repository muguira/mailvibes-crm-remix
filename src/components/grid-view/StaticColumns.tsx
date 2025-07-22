import React, { useState } from 'react'
import { Column, GridRow } from './types'
import { ROW_HEIGHT, HEADER_HEIGHT, INDEX_COLUMN_WIDTH } from './grid-constants'
import { Link } from 'react-router-dom'
import { GridCell } from './GridCell'
import { Pin, PinOff } from 'lucide-react'
import { logger } from '@/utils/logger'
import { Checkbox } from '@/components/ui/checkbox'
interface StaticColumnsProps {
  data: GridRow[]
  frozenColumns: Column[]
  scrollTop: number
  firstRowIndex: number
  onCellChange: (rowId: string, columnId: string, value: any) => void
  onContextMenu: (columnId: string, position: { x: number; y: number }) => void
  onTogglePin: (columnId: string) => void
  frozenColumnIds: string[]
  editingCell: { rowId: string; columnId: string; directTyping?: boolean; clearDateSelection?: boolean } | null
  setEditingCell: (
    cell: { rowId: string; columnId: string; directTyping?: boolean; clearDateSelection?: boolean } | null,
  ) => void
  selectedRowIds?: Set<string>
  onToggleRowSelection?: (rowId: string) => void
  onSelectAllRows?: (select: boolean) => void
}

export function StaticColumns({
  data,
  frozenColumns,
  scrollTop,
  firstRowIndex,
  onCellChange,
  onContextMenu,
  onTogglePin,
  frozenColumnIds,
  editingCell,
  setEditingCell,
  selectedRowIds = new Set(),
  onToggleRowSelection,
  onSelectAllRows,
}: StaticColumnsProps) {
  // State for hover states
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null)
  const [isHeaderHovered, setIsHeaderHovered] = useState(false)

  // Handle context menu event
  const handleContextMenu = (e: React.MouseEvent, rowId: string, columnId: string) => {
    e.preventDefault()
    if (onContextMenu) {
      onContextMenu(columnId, { x: e.clientX, y: e.clientY })
    }
  }

  // Handle double click for contact/opportunity editing (could implement inline edit)
  const handleDoubleClick = (rowId: string) => {
    logger.log('Double clicked contact/opportunity cell:', rowId)
    // Here you could implement an inline edit functionality
  }

  // Check if all visible rows are selected
  const areAllRowsSelected = data.length > 0 && data.every(row => selectedRowIds.has(row.id))

  // Exit early if no opportunity/contact column
  if (frozenColumns.length === 0) return null

  // Calcular el ancho total de columnas fijas (index + las demás)
  const totalFrozenWidth = INDEX_COLUMN_WIDTH + frozenColumns.reduce((w, c) => w + (c.width || 150), 0)

  return (
    <div
      className="static-columns-container"
      style={{
        width: `${totalFrozenWidth}px`,
        position: 'relative',
        zIndex: 45,
      }}
    >
      {/* Header row */}
      <div className="static-headers" style={{ display: 'flex' }}>
        {/* Columna index siempre fija, sin pin */}
        <div
          className="static-header-cell index-header"
          style={{
            width: INDEX_COLUMN_WIDTH,
            height: HEADER_HEIGHT - 1,
            position: 'sticky',
            left: 0,
            zIndex: 45,
            display: 'flex',
            alignItems: 'center',
            background: '#f9fafb',
            borderRight: '1px solid #e5e7eb',
            borderBottom: '1px solid #e5e7eb',
            fontWeight: 500,
            fontSize: '0.75rem',
            color: '#6b7280',
            boxSizing: 'border-box',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onMouseEnter={() => setIsHeaderHovered(true)}
          onMouseLeave={() => setIsHeaderHovered(false)}
          onClick={() => onSelectAllRows?.(data.length > 0 && !areAllRowsSelected)}
        >
          {isHeaderHovered ? (
            <Checkbox
              checked={areAllRowsSelected}
              onCheckedChange={checked => onSelectAllRows?.(checked === true)}
              className="h-4 w-4"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            '#'
          )}
        </div>
        {/* El resto de columnas fijas */}
        {frozenColumns.map((col, idx) => (
          <div
            key={col.id}
            className={`static-header-cell group`}
            style={{
              width: col.width,
              height: HEADER_HEIGHT - 1,
              position: 'sticky',
              left: `${INDEX_COLUMN_WIDTH + frozenColumns.slice(0, idx).reduce((w, c) => w + (c.width || 150), 0) - 1}px`,
              zIndex: 45,
              display: 'flex',
              alignItems: 'center',
              background: '#f9fafb',
              borderRight: '1px solid #e5e7eb',
              borderBottom: '1px solid #e5e7eb',
              padding: '0 0.75rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: '#111827',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
            onContextMenu={e => {
              e.preventDefault()
              if (onContextMenu) onContextMenu(col.id, { x: e.clientX, y: e.clientY })
            }}
          >
            <span
              className={`pin-icon mr-2 md:ml-2 md:mr-0 md:order-last ${frozenColumnIds.includes(col.id) ? 'text-brand-teal' : 'text-gray-400'} md:group-hover:opacity-100 md:opacity-0 hidden md:block`}
              style={{
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                display: col.id === 'name' ? 'none' : 'flex',
              }}
              onClick={e => {
                e.stopPropagation()
                onTogglePin(col.id)
              }}
            >
              {frozenColumnIds.includes(col.id) ? <PinOff size={16} /> : <Pin size={16} />}
            </span>
            <span style={{ flex: 1 }}>{col.title}</span>
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
          borderBottom: '1px solid #e5e7eb',
          top: 0,
          width: '100%',
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
              zIndex: 44,
              backgroundColor: selectedRowIds.has(row.id) ? '#f0f9ff' : '#fff',
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
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: '#6b7280',
                backgroundColor: selectedRowIds.has(row.id) ? '#f0f9ff' : '#fff',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredRowId(row.id)}
              onMouseLeave={() => setHoveredRowId(null)}
              onClick={() => onToggleRowSelection?.(row.id)}
            >
              {hoveredRowId === row.id || selectedRowIds.has(row.id) ? (
                <Checkbox
                  checked={selectedRowIds.has(row.id)}
                  onCheckedChange={() => onToggleRowSelection?.(row.id)}
                  className="h-4 w-4"
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                firstRowIndex + index + 1
              )}
            </div>
            {/* Celdas de columnas fijas */}
            {frozenColumns.map((col, idx) => (
              <GridCell
                key={col.id}
                row={row}
                column={col}
                value={row[col.id]}
                isEditing={editingCell?.rowId === row.id && editingCell?.columnId === col.id}
                isSelected={false}
                cellId={`${row.id}-${col.id}`}
                contextMenuColumn={undefined}
                onCellClick={undefined}
                onCellDoubleClick={() => setEditingCell({ rowId: row.id, columnId: col.id })}
                onContextMenu={onContextMenu}
                onCellChange={onCellChange}
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                style={{
                  width: col.width,
                  height: ROW_HEIGHT,
                  position: 'sticky',
                  left: `${INDEX_COLUMN_WIDTH + frozenColumns.slice(0, idx).reduce((w, c) => w + (c.width || 150), 0) - 1}px`,
                  zIndex: 44,
                  borderRight: '1px solid #e5e7eb',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: selectedRowIds.has(row.id) ? '#f0f9ff' : '#fff',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  fontSize: '0.875rem',
                  color: '#111827',
                  padding: '0 0.75rem',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
