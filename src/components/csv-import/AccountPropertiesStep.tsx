import { AccountFieldMapping, hasRequiredAccountMappings, mapColumnsToAccount } from '@/utils/mapColumnsToAccount'
import { ParsedCsvResult } from '@/utils/parseCsv'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AccountPropertySlot } from './AccountPropertySlot'
import { CsvFieldChip } from './CsvFieldChip'
import { LiveAccountCard } from './LiveAccountCard'
import { NewPropertyModal } from './NewPropertyModal'

/**
 * Props for the AccountPropertiesStep component
 */
interface AccountPropertiesStepProps {
  /** Parsed CSV data containing headers and rows */
  parsedData: ParsedCsvResult
  /** Callback fired when field mappings change */
  onMappingsChange: (mappings: AccountFieldMapping[]) => void
  /** Callback fired when validation state changes */
  onValidationChange: (isValid: boolean) => void
}

/**
 * Interface for custom account properties created by the user
 */
interface CustomProperty {
  /** Unique identifier for the custom property */
  id: string
  /** Display label for the custom property */
  label: string
}

/**
 * Step component for mapping CSV fields to account properties during import process.
 *
 * This component provides a drag-and-drop interface for users to map CSV columns
 * to predefined account properties or create custom account properties.
 *
 * Features:
 * - Drag-and-drop interface using @dnd-kit
 * - Predefined account properties (name, address, primary contact, industry)
 * - Custom property creation with modal dialog
 * - Live preview of mapped account data
 * - List field checkbox for each mapping
 * - Real-time validation of required mappings
 * - Responsive three-column layout
 *
 * @example
 * ```tsx
 * <AccountPropertiesStep
 *   parsedData={csvData}
 *   onMappingsChange={(mappings) => setAccountMappings(mappings)}
 *   onValidationChange={(isValid) => setCanProceed(isValid)}
 * />
 * ```
 */
export function AccountPropertiesStep({
  parsedData,
  onMappingsChange,
  onValidationChange,
}: AccountPropertiesStepProps) {
  /** Current field mappings between CSV columns and account properties */
  const [mappings, setMappings] = useState<AccountFieldMapping[]>([])
  /** ID of the currently dragged CSV field for visual feedback */
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  /** List of custom properties created by the user */
  const [customProperties, setCustomProperties] = useState<CustomProperty[]>([])
  /** Whether the new property modal is open */
  const [modalOpen, setModalOpen] = useState(false)

  /** CSV fields that haven't been mapped to any account property yet */
  const unmappedFields = parsedData.headers.filter(header => !mappings.some(m => m.csvField === header))

  /** First row of CSV data used for live preview */
  const firstRow = parsedData.rows[0] || {}
  /** Preview account object based on current mappings */
  const previewAccount = mapColumnsToAccount(firstRow, mappings)

  /**
   * Effect to notify parent component when mappings change
   * Also validates if required account mappings are present
   */
  useEffect(() => {
    onMappingsChange(mappings)
    onValidationChange(hasRequiredAccountMappings(mappings))
  }, [mappings, onMappingsChange, onValidationChange])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  /**
   * Handles the start of a drag operation
   * @param event - The drag start event containing the dragged element ID
   */
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }

  /**
   * Handles the end of a drag operation, creating new field mappings
   * @param event - The drag end event containing active and over elements
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)

    // If not dropped on a valid target, do nothing (field stays in CSV fields)
    if (!over) return

    const draggedField = active.id as string
    const droppedOnSlot = over.id as string

    // Add new mapping, replacing any existing mapping for this property
    const newMapping: AccountFieldMapping = {
      csvField: draggedField,
      accountProperty: droppedOnSlot,
      addAsListField: false,
    }

    setMappings(prev => [...prev.filter(m => m.accountProperty !== droppedOnSlot), newMapping])
  }

  /**
   * Removes a field mapping for a specific account property
   * @param accountProperty - The property to clear the mapping for
   */
  const handleClearMapping = (accountProperty: string) => {
    setMappings(prev => prev.filter(m => m.accountProperty !== accountProperty))
  }

  /**
   * Toggles whether a mapped field should also be added as a list field
   * @param accountProperty - The property to toggle list field status for
   * @param checked - Whether the list field option should be enabled
   */
  const handleListFieldToggle = (accountProperty: string, checked: boolean) => {
    setMappings(prev => prev.map(m => (m.accountProperty === accountProperty ? { ...m, addAsListField: checked } : m)))
  }

  /**
   * Gets the CSV field mapped to a specific account property
   * @param property - The account property to look up
   * @returns The CSV field name or undefined if not mapped
   */
  const getMappedFieldForProperty = (property: string): string | undefined => {
    const mapping = mappings.find(m => m.accountProperty === property)
    return mapping?.csvField
  }

  /**
   * Checks if the list field option is enabled for a specific property
   * @param property - The account property to check
   * @returns Whether the list field option is checked
   */
  const isListFieldChecked = (property: string): boolean => {
    const mapping = mappings.find(m => m.accountProperty === property)
    return mapping?.addAsListField || false
  }

  return (
    <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-hidden">
      {/* Instructions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Account Properties</h2>
        <p className="text-gray-600 text-sm">
          Drag and drop the fields from your CSV file that you would like to use to populate existing Account properties
          in RelateIQ. Or, create new Account properties for the information in your CSV file. These properties will be
          stored at the account level, and are common to every relationship with that single account.
        </p>
        <p className="text-xs text-gray-500 mt-2">Check the box next to a field to also add it as a list field</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-12 gap-6">
          {/* Left column - CSV Fields */}
          <div className="col-span-3 space-y-4 border border-gray-200 rounded-lg">
            <div className="bg-[#62BFAA] text-white rounded-t-lg px-4 py-3">
              <h3 className="font-medium">CSV Fields</h3>
            </div>
            <div className="space-y-2 p-2 max-h-[calc(100vh-500px)] overflow-y-auto">
              {unmappedFields.map(field => (
                <CsvFieldChip key={field} id={field} label={field} isDragging={activeDragId === field} />
              ))}
            </div>
          </div>

          {/* Middle column - Account Properties */}
          <div className="col-span-5 space-y-4 border border-gray-200 rounded-lg">
            <div className="bg-[#62BFAA] text-white rounded-t-lg px-4 py-3">
              <h3 className="font-medium">Account Properties</h3>
            </div>

            <div className="space-y-4 p-2 max-h-[calc(100vh-500px)] overflow-y-auto">
              <AccountPropertySlot
                id="name"
                label="Name"
                required
                value={getMappedFieldForProperty('name')}
                onClear={() => handleClearMapping('name')}
                isListFieldChecked={isListFieldChecked('name')}
                onListFieldToggle={checked => handleListFieldToggle('name', checked)}
              />

              <AccountPropertySlot
                id="address"
                label="Address"
                value={getMappedFieldForProperty('address')}
                onClear={() => handleClearMapping('address')}
                isListFieldChecked={isListFieldChecked('address')}
                onListFieldToggle={checked => handleListFieldToggle('address', checked)}
              />

              <AccountPropertySlot
                id="primaryContact"
                label="Primary Contact"
                value={getMappedFieldForProperty('primaryContact')}
                onClear={() => handleClearMapping('primaryContact')}
                isListFieldChecked={isListFieldChecked('primaryContact')}
                onListFieldToggle={checked => handleListFieldToggle('primaryContact', checked)}
              />

              <AccountPropertySlot
                id="industry"
                label="Industry"
                value={getMappedFieldForProperty('industry')}
                onClear={() => handleClearMapping('industry')}
                isListFieldChecked={isListFieldChecked('industry')}
                onListFieldToggle={checked => handleListFieldToggle('industry', checked)}
              />

              {/* Custom properties */}
              {customProperties.map(property => (
                <AccountPropertySlot
                  key={property.id}
                  id={property.id}
                  label={property.label}
                  value={getMappedFieldForProperty(property.id)}
                  onClear={() => handleClearMapping(property.id)}
                  isListFieldChecked={isListFieldChecked(property.id)}
                  onListFieldToggle={checked => handleListFieldToggle(property.id, checked)}
                />
              ))}

              {/* Create new account property */}
              <button
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mt-6"
                onClick={() => setModalOpen(true)}
              >
                <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center">
                  <Plus size={12} />
                </div>
                Create a new account property
              </button>
            </div>
          </div>

          {/* Right column - Live Preview */}
          <div className="col-span-4">
            <LiveAccountCard
              account={previewAccount}
              customProperties={customProperties.map(property => ({
                id: property.id,
                label: property.label,
                value: firstRow[mappings.find(m => m.accountProperty === property.id)?.csvField || ''],
              }))}
            />
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeDragId ? (
            <div className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-lg">
              <span className="text-sm text-gray-700">{activeDragId}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* New Property Modal */}
      <NewPropertyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={propertyName => {
          const newProperty: CustomProperty = {
            id: `custom-${Date.now()}`,
            label: propertyName,
          }
          setCustomProperties([...customProperties, newProperty])
        }}
        title="Create New Account Property"
      />
    </div>
  )
}
