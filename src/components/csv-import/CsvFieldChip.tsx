import { cn } from '@/lib/utils'
import { useDraggable } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'

/**
 * Props for the CsvFieldChip component
 */
interface CsvFieldChipProps {
  /** Unique identifier for the draggable element */
  id: string
  /** Display label for the CSV field */
  label: string
  /** Whether this chip is currently being dragged */
  isDragging?: boolean
}

/**
 * A draggable chip component representing a CSV field that can be mapped to properties.
 *
 * This component renders as a draggable element that users can drag from the CSV fields
 * column to property slots. It provides visual feedback during drag operations and
 * includes a grip handle for better UX.
 *
 * Features:
 * - Draggable using @dnd-kit
 * - Visual grip handle indicator
 * - Opacity changes during drag operations
 * - Touch-friendly with touch-none class
 * - Hover effects and transitions
 * - Hidden original element during drag (overlay handles visual)
 *
 * @example
 * ```tsx
 * <CsvFieldChip
 *   id="email"
 *   label="Email Address"
 *   isDragging={currentDragId === 'email'}
 * />
 * ```
 */
export function CsvFieldChip({ id, label, isDragging }: CsvFieldChipProps) {
  /** Draggable hook providing drag capabilities and state */
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingInternal } = useDraggable({ id })

  /** Transform style applied during drag operations */
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  /** Whether the chip is currently being dragged (from either external or internal state) */
  const isCurrentlyDragging = isDragging || isDraggingInternal

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isCurrentlyDragging ? 0 : 1,
      }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md cursor-move',
        'hover:shadow-sm transition-shadow',
        'touch-none', // Prevents touch scrolling interference
      )}
      {...attributes}
      {...listeners}
    >
      <div className="text-gray-400">
        <GripVertical size={16} />
      </div>
      <span className="text-sm text-gray-700 select-none">{label}</span>
    </div>
  )
}
