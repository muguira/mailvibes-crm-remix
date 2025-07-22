import { cn } from '@/lib/utils'
import { FieldType } from '@/utils/buildFieldDefinitions'
import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'

/**
 * Props for the ListFieldSlot component
 */
interface ListFieldSlotProps {
  /** Unique identifier for the droppable slot */
  id: string
  /** Display name for the list field */
  fieldName: string
  /** The mapped CSV field name, if any */
  csvField?: string
  /** Data type of the field */
  fieldType?: FieldType
  /** Whether this field is required */
  required?: boolean
  /** Callback fired when the field should be removed */
  onRemove?: () => void
  /** Whether this is a placeholder slot for adding new fields */
  isPlaceholder?: boolean
}

/**
 * A droppable slot component for list fields in the CSV import wizard.
 *
 * This component can function as either a placeholder for adding new fields
 * or as a mapped field slot showing the CSV field assignment. It provides
 * visual feedback for drag operations and allows field removal.
 *
 * Features:
 * - Dual mode: placeholder or mapped field display
 * - Droppable zone with visual feedback
 * - Required field indication
 * - Remove button for mapped fields
 * - Consistent styling with other property slots
 * - Plus icon for add placeholder state
 *
 * @example
 * ```tsx
 * // Placeholder slot
 * <ListFieldSlot
 *   id="add-field"
 *   fieldName="Add a Field"
 *   isPlaceholder
 * />
 *
 * // Mapped field slot
 * <ListFieldSlot
 *   id="deal-amount"
 *   fieldName="Deal Amount"
 *   csvField="amount"
 *   fieldType="number"
 *   onRemove={() => removeField('deal-amount')}
 * />
 * ```
 */
export function ListFieldSlot({
  id,
  fieldName,
  csvField,
  required,
  onRemove,
  isPlaceholder = false,
}: ListFieldSlotProps) {
  /** Droppable hook for handling drag and drop operations */
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled: !isPlaceholder && !!csvField, // Only disabled if not placeholder and already has mapping
  })

  if (isPlaceholder) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'relative min-h-[40px] rounded-md transition-all',
          'border-2 border-dashed border-gray-300',
          isOver && 'border-[#62BFAA] bg-[#62BFAA]/5',
        )}
      >
        {isOver ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-[#62BFAA] text-white rounded-full p-1">
              <Plus size={20} />
            </div>
          </div>
        ) : (
          <div className="px-3 py-2 flex items-center gap-2 text-gray-500">
            <Plus className="w-5 h-5" />
            <span className="text-sm">Add a Field</span>
          </div>
        )}
      </div>
    )
  }

  // Style matching ContactPropertySlot
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{fieldName}</label>
        {required && <span className="text-xs text-red-500">*Required</span>}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'relative min-h-[40px] rounded-md transition-all',
          csvField ? 'bg-gray-50 border border-gray-200' : 'border-2 border-dashed border-gray-300',
          isOver && !csvField && 'border-[#62BFAA] bg-[#62BFAA]/5',
        )}
      >
        {/* Show + icon when hovering with a draggable */}
        {isOver && !csvField && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-[#62BFAA] text-white rounded-full p-1">
              <Plus size={20} />
            </div>
          </div>
        )}

        {/* Show the mapped field */}
        {csvField && (
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-sm text-gray-700">{csvField}</span>
            {onRemove && (
              <button onClick={onRemove} className="text-gray-400 hover:text-gray-600 text-sm">
                ×
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {!csvField && !isOver && (
          <div className="px-3 py-2 pointer-events-none">
            <span className="text-sm text-gray-400">Drag a field here</span>
          </div>
        )}
      </div>
    </div>
  )
}
