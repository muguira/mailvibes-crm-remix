import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FieldType,
  ListFieldDefinition,
  buildFieldDefinition,
  convertAccountMappingsToListFields,
  validateFieldCount,
} from '@/utils/buildFieldDefinitions'
import { AccountFieldMapping } from '@/utils/mapColumnsToAccount'
import { ParsedCsvResult } from '@/utils/parseCsv'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CsvFieldChip } from './CsvFieldChip'
import { FieldDefinitionModal } from './FieldDefinitionModal'
import { ListFieldSlot } from './ListFieldSlot'

/**
 * Props for the ListFieldsStep component
 */
interface ListFieldsStepProps {
  /** Parsed CSV data containing headers and rows */
  parsedData: ParsedCsvResult
  /** Account field mappings from previous step */
  accountFieldMappings: AccountFieldMapping[]
  /** Type of relationships (contacts or accounts) */
  relationType: 'contacts' | 'accounts'
  /** Callback fired when list field definitions change */
  onFieldsChange: (fields: ListFieldDefinition[]) => void
  /** Callback fired when validation state changes */
  onValidationChange: (isValid: boolean) => void
}

/**
 * Step component for defining list fields during CSV import process.
 *
 * This component allows users to create custom list fields by mapping CSV columns
 * to new field definitions. It automatically includes account fields marked as
 * list fields and provides a required "Relationship Name" field.
 *
 * Features:
 * - Drag-and-drop interface for field creation
 * - Required "Relationship Name" field mapping
 * - Automatic inclusion of account list fields
 * - Custom field creation via modal dialog
 * - Field count validation and warnings
 * - Live preview of example field data
 * - Field removal capabilities
 * - Three-column responsive layout
 *
 * @example
 * ```tsx
 * <ListFieldsStep
 *   parsedData={csvData}
 *   accountFieldMappings={accountMappings}
 *   relationType="accounts"
 *   onFieldsChange={(fields) => setListFields(fields)}
 *   onValidationChange={(isValid) => setCanProceed(isValid)}
 * />
 * ```
 */
export function ListFieldsStep({
  parsedData,
  accountFieldMappings,
  onFieldsChange,
  onValidationChange,
}: ListFieldsStepProps) {
  const [listFields, setListFields] = useState<ListFieldDefinition[]>([])
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingCsvField, setPendingCsvField] = useState<string>('')

  // Initialize with required relationship field and account fields marked as list fields
  useEffect(() => {
    const initialFields: ListFieldDefinition[] = [
      {
        fieldName: 'Relationship Name',
        csvField: '', // To be mapped
        type: 'text',
        isRequired: true,
      },
    ]

    // Add account fields that were marked as list fields
    const accountListFields = convertAccountMappingsToListFields(accountFieldMappings)

    setListFields([...initialFields, ...accountListFields])
  }, [accountFieldMappings])

  // Get unmapped fields
  const mappedCsvFields = listFields.map(f => f.csvField).filter(Boolean)
  const unmappedFields = parsedData.headers.filter(header => !mappedCsvFields.includes(header))

  // Update parent component when fields change
  useEffect(() => {
    onFieldsChange(listFields)
    // Valid if relationship name is mapped
    const isValid = listFields.some(f => f.isRequired && f.csvField)
    onValidationChange(isValid)
  }, [listFields, onFieldsChange, onValidationChange])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)

    // If not dropped on a valid target, do nothing (field stays in CSV fields)
    if (!over) return

    const draggedField = active.id as string
    const droppedOnSlot = over.id as string

    if (droppedOnSlot === 'add-field') {
      // Open modal for new field
      setPendingCsvField(draggedField)
      setModalOpen(true)
    } else if (droppedOnSlot === 'relationship-name') {
      // Map to relationship name
      setListFields(prev =>
        prev.map(field =>
          field.isRequired && field.fieldName === 'Relationship Name' ? { ...field, csvField: draggedField } : field,
        ),
      )
    }
  }

  const handleFieldDefinition = (fieldName: string, type: FieldType) => {
    const newField = buildFieldDefinition(pendingCsvField, fieldName, type, false, listFields)

    setListFields(prev => [...prev, newField])
    setPendingCsvField('')
  }

  const handleRemoveField = (index: number) => {
    setListFields(prev => prev.filter((_, i) => i !== index))
  }

  const fieldCountWarning = validateFieldCount(listFields)

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Fields to a New List</h2>
        <p className="text-gray-600 text-sm">
          Now, create your list. Each row in your CSV will correspond to a relationship on your new list. It should have
          a unique name to describe the opportunity, deal, or person you are tracking, and will tie to an account or a
          contact. Drag and drop from your CSV file to create the columns in your list.
        </p>
      </div>

      {fieldCountWarning && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">{fieldCountWarning}</AlertDescription>
        </Alert>
      )}

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

          {/* Middle column - List Fields */}
          <div className="col-span-5 space-y-4 border border-gray-200 rounded-lg">
            <div className="bg-[#62BFAA] text-white rounded-t-lg px-4 py-3">
              <h3 className="font-medium">List Fields</h3>
            </div>

            <div className="space-y-4 p-2 max-h-[calc(100vh-500px)] overflow-y-auto">
              {/* Relationship Name - Required Field */}
              <ListFieldSlot
                id="relationship-name"
                fieldName="Relationship Name"
                csvField={listFields[0]?.csvField}
                fieldType="text"
                required
                isPlaceholder={false}
                onRemove={() => {
                  setListFields(prev =>
                    prev.map(field =>
                      field.isRequired && field.fieldName === 'Relationship Name' ? { ...field, csvField: '' } : field,
                    ),
                  )
                }}
              />

              {/* Other fields */}
              <div className="space-y-3">
                {listFields.slice(1).map((field, index) => (
                  <ListFieldSlot
                    key={field.fieldName}
                    id={field.fieldName}
                    fieldName={field.fieldName}
                    csvField={field.csvField}
                    fieldType={field.type}
                    onRemove={() => handleRemoveField(index + 1)}
                  />
                ))}
              </div>

              {/* Add Field Placeholder */}
              <ListFieldSlot id="add-field" fieldName="Add a Field" isPlaceholder />
            </div>
          </div>

          {/* Right column - Example Data */}
          <div className="col-span-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Example List Field Data</h3>
              <div className="space-y-3">
                {listFields.map(field => (
                  <div key={field.fieldName}>
                    <div className="text-xs text-gray-500 italic">{field.fieldName}</div>
                    <div className="text-sm text-gray-900">
                      {field.csvField && parsedData.rows[0]?.[field.csvField]
                        ? parsedData.rows[0][field.csvField]
                        : '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

      {/* Field Definition Modal */}
      <FieldDefinitionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setPendingCsvField('')
        }}
        onConfirm={handleFieldDefinition}
        csvField={pendingCsvField}
      />
    </div>
  )
}
