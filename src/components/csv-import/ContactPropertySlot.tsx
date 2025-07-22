import { cn } from '@/lib/utils'
import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import React from 'react'

/**
 * Props for the ContactPropertySlot component
 */
interface ContactPropertySlotProps {
  /** Unique identifier for the droppable slot */
  id: string
  /** Display label for the contact property */
  label: string
  /** Whether this property is required for validation */
  required?: boolean
  /** The mapped CSV field name, if any */
  value?: string
  /** Custom content to render instead of value */
  children?: React.ReactNode
  /** Callback fired when the mapping is cleared */
  onClear?: () => void
}

/**
 * A droppable slot component for mapping CSV fields to contact properties.
 *
 * This component provides a drop zone where users can drag CSV fields to map them
 * to specific contact properties. It includes visual feedback for drag states,
 * displays mapped values, and provides a clear button for removing mappings.
 *
 * Features:
 * - Droppable zone with visual feedback on hover
 * - Required field indication
 * - Clear button for removing mappings
 * - Support for custom content rendering (used for name type selector)
 * - Disabled state when already mapped
 * - Visual plus icon when hovering with draggable item
 *
 * @example
 * ```tsx
 * <ContactPropertySlot
 *   id="email"
 *   label="Email Address"
 *   required
 *   value={mappedField}
 *   onClear={() => clearMapping('email')}
 * />
 * ```
 */
export function ContactPropertySlot({ id, label, required, value, children, onClear }: ContactPropertySlotProps) {
  /** Whether the slot has content (either a mapped value or custom children) */
  const hasContent = value || children

  /** Droppable hook for handling drag and drop operations */
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled: !!hasContent, // Disable droppable when slot already has content
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {required && <span className="text-xs text-red-500">*Required</span>}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'relative min-h-[40px] rounded-md transition-all',
          hasContent ? 'bg-gray-50 border border-gray-200' : 'border-2 border-dashed border-gray-300',
          isOver && !hasContent && 'border-[#62BFAA] bg-[#62BFAA]/5',
        )}
      >
        {/* Show + icon when hovering with a draggable */}
        {isOver && !hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-[#62BFAA] text-white rounded-full p-1">
              <Plus size={20} />
            </div>
          </div>
        )}

        {/* Show the mapped field or children */}
        {hasContent && (
          <div className="px-3 py-2 flex items-center justify-between">
            {children || <span className="text-sm text-gray-700">{value}</span>}
            {onClear && (
              <button onClick={onClear} className="text-gray-400 hover:text-gray-600 text-sm">
                ×
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {!hasContent && !isOver && (
          <div className="px-3 py-2 pointer-events-none">
            <span className="text-sm text-gray-400">Drag a field here</span>
          </div>
        )}
      </div>
    </div>
  )
}
