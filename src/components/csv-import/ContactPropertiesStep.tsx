import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FieldMapping, hasRequiredMappings, mapColumnsToContact } from '@/utils/mapColumnsToContact'
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
import { useEffect, useState } from 'react'
import { ContactPropertySlot } from './ContactPropertySlot'
import { CsvFieldChip } from './CsvFieldChip'
import { LiveContactCard } from './LiveContactCard'

/**
 * Props for the ContactPropertiesStep component
 */
interface ContactPropertiesStepProps {
  /** Parsed CSV data containing headers and rows */
  parsedData: ParsedCsvResult
  /** Callback fired when field mappings change */
  onMappingsChange: (mappings: FieldMapping[]) => void
  /** Callback fired when validation state changes */
  onValidationChange: (isValid: boolean) => void
}

/**
 * Type definition for name field handling options
 */
type NameType = 'full' | 'first' | 'last'

/**
 * Step component for mapping CSV fields to contact properties during import process.
 *
 * This component provides a comprehensive drag-and-drop interface for mapping CSV columns
 * to contact properties with special handling for name fields and multiple email addresses.
 *
 * Features:
 * - Drag-and-drop interface using @dnd-kit
 * - Predefined contact properties (name, email, phone, address, social links)
 * - Special name handling (full name, first/last name split)
 * - Dynamic additional email fields
 * - Live preview of mapped contact data
 * - Real-time validation of required mappings (name + email)
 * - Responsive three-column layout
 *
 * @example
 * ```tsx
 * <ContactPropertiesStep
 *   parsedData={csvData}
 *   onMappingsChange={(mappings) => setContactMappings(mappings)}
 *   onValidationChange={(isValid) => setCanProceed(isValid)}
 * />
 * ```
 */
export function ContactPropertiesStep({
  parsedData,
  onMappingsChange,
  onValidationChange,
}: ContactPropertiesStepProps) {
  /** Current field mappings between CSV columns and contact properties */
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  /** Type of name field mapping (full, first, or last name) */
  const [nameType, setNameType] = useState<NameType | null>(null)
  /** ID of the currently dragged CSV field for visual feedback */
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  /** Array of additional email field indices created by user */
  const [additionalEmails, setAdditionalEmails] = useState<number[]>([])

  /** CSV fields that haven't been mapped to any contact property yet */
  const unmappedFields = parsedData.headers.filter(header => !mappings.some(m => m.csvField === header))

  /** First row of CSV data used for live preview */
  const firstRow = parsedData.rows[0] || {}
  /** Preview contact object based on current mappings */
  const previewContact = mapColumnsToContact(firstRow, mappings)

  /**
   * Effect to notify parent component when mappings change
   * Also validates if required contact mappings are present (name + email)
   */
  useEffect(() => {
    onMappingsChange(mappings)
    onValidationChange(hasRequiredMappings(mappings))
  }, [mappings, onMappingsChange, onValidationChange])

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

    // Special handling for name field
    if (droppedOnSlot === 'name') {
      // Add a default mapping with 'full' type
      const newMapping: FieldMapping = {
        csvField: draggedField,
        contactProperty: 'name',
        nameType: 'full',
      }

      setMappings(prev => [...prev.filter(m => m.contactProperty !== 'name'), newMapping])

      setNameType('full')
      return
    }

    // Handle lastName field mapping
    if (droppedOnSlot === 'lastName') {
      const newMapping: FieldMapping = {
        csvField: draggedField,
        contactProperty: 'name',
        nameType: 'last',
      }

      setMappings(prev => [...prev.filter(m => !(m.contactProperty === 'name' && m.nameType === 'last')), newMapping])
      return
    }

    // Add new mapping for other fields
    const newMapping: FieldMapping = {
      csvField: draggedField,
      contactProperty: droppedOnSlot,
    }

    setMappings(prev => [...prev.filter(m => m.contactProperty !== droppedOnSlot), newMapping])
  }

  const handleNameTypeSelect = (value: NameType) => {
    setNameType(value)

    // Get the current name mapping
    const currentNameMapping = mappings.find(m => m.contactProperty === 'name' && m.nameType !== 'last')
    if (!currentNameMapping) return

    // Update the name mapping with new type
    const newMapping: FieldMapping = {
      csvField: currentNameMapping.csvField,
      contactProperty: 'name',
      nameType: value,
    }

    setMappings(prev => [...prev.filter(m => !(m.contactProperty === 'name' && m.nameType !== 'last')), newMapping])
  }

  const handleClearMapping = (contactProperty: string) => {
    if (contactProperty === 'name') {
      setMappings(prev => prev.filter(m => !(m.contactProperty === 'name' && m.nameType !== 'last')))
      setNameType(null)
    } else if (contactProperty === 'lastName') {
      setMappings(prev => prev.filter(m => !(m.contactProperty === 'name' && m.nameType === 'last')))
    } else {
      setMappings(prev => prev.filter(m => m.contactProperty !== contactProperty))
    }
  }

  const getMappedFieldForProperty = (property: string): string | undefined => {
    if (property === 'lastName') {
      const mapping = mappings.find(m => m.contactProperty === 'name' && m.nameType === 'last')
      return mapping?.csvField
    }

    const mapping = mappings.find(m => m.contactProperty === property)
    return mapping?.csvField
  }

  return (
    <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-hidden">
      {/* Instructions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Contact Properties</h2>
        <p className="text-gray-600 text-sm">
          Your organization has a shared list of Contacts. Any Contacts imported from your CSV will be added to your
          organization's contacts.
        </p>
        <p className="text-gray-600 text-sm mt-2">
          Drag and drop the fields from your CSV file that you would like to use to populate Contact properties in
          RelateIQ.
        </p>
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
            <div className="space-y-2 max-h-[calc(100vh-500px)] overflow-y-auto p-2">
              {unmappedFields.map(field => (
                <CsvFieldChip key={field} id={field} label={field} isDragging={activeDragId === field} />
              ))}
            </div>
          </div>

          {/* Middle column - Contact Properties */}
          <div className="col-span-5 space-y-4 border border-gray-200 rounded-lg">
            <div className="bg-[#62BFAA] text-white rounded-t-lg px-4 py-3">
              <h3 className="font-medium">Contact Properties</h3>
            </div>

            <div className="space-y-4 max-h-[calc(100vh-500px)] overflow-y-auto p-2">
              {/* Name field with special handling */}
              {getMappedFieldForProperty('name') ? (
                <ContactPropertySlot
                  id="name"
                  label="Name"
                  required
                  value={getMappedFieldForProperty('name')}
                  onClear={() => handleClearMapping('name')}
                >
                  <div className="flex items-center gap-2 w-full pr-6">
                    <span className="text-sm text-gray-700 flex-1">{getMappedFieldForProperty('name')}</span>
                    <Select value={nameType || ''} onValueChange={handleNameTypeSelect}>
                      <SelectTrigger
                        id="name-type-select"
                        className="w-44 h-8 text-xs border-gray-300 bg-gray-50 hover:bg-gray-100"
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="full" className="text-sm">
                          Contact Full Name
                        </SelectItem>
                        <SelectItem value="first" className="text-sm">
                          Contact First Name
                        </SelectItem>
                        <SelectItem value="last" className="text-sm">
                          Contact Last Name
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </ContactPropertySlot>
              ) : (
                <ContactPropertySlot
                  id="name"
                  label="Name"
                  required
                  value={getMappedFieldForProperty('name')}
                  onClear={() => handleClearMapping('name')}
                />
              )}

              {/* Show Last Name field if First Name is selected */}
              {nameType === 'first' && (
                <ContactPropertySlot
                  id="lastName"
                  label="Name: Last Name"
                  required
                  value={getMappedFieldForProperty('lastName')}
                  onClear={() => handleClearMapping('lastName')}
                />
              )}

              <ContactPropertySlot
                id="email"
                label="Email"
                required
                value={getMappedFieldForProperty('email')}
                onClear={() => handleClearMapping('email')}
              />

              {additionalEmails.map(emailIndex => (
                <ContactPropertySlot
                  key={`email-${emailIndex}`}
                  id={`email-${emailIndex}`}
                  label={`Email ${emailIndex + 1}`}
                  value={getMappedFieldForProperty(`email-${emailIndex}`)}
                  onClear={() => {
                    handleClearMapping(`email-${emailIndex}`)
                    setAdditionalEmails(prev => prev.filter(i => i !== emailIndex))
                  }}
                />
              ))}

              <div
                className="text-xs text-[#62BFAA] hover:underline cursor-pointer"
                onClick={() => {
                  const newIndex = additionalEmails.length > 0 ? Math.max(...additionalEmails) + 1 : 1
                  setAdditionalEmails([...additionalEmails, newIndex])
                }}
              >
                Add another email
              </div>

              <ContactPropertySlot
                id="phone"
                label="Phone"
                value={getMappedFieldForProperty('phone')}
                onClear={() => handleClearMapping('phone')}
              />

              <ContactPropertySlot
                id="address"
                label="Address"
                value={getMappedFieldForProperty('address')}
                onClear={() => handleClearMapping('address')}
              />

              <ContactPropertySlot
                id="linkedin"
                label="LinkedIn"
                value={getMappedFieldForProperty('linkedin')}
                onClear={() => handleClearMapping('linkedin')}
              />

              <ContactPropertySlot
                id="facebook"
                label="Facebook"
                value={getMappedFieldForProperty('facebook')}
                onClear={() => handleClearMapping('facebook')}
              />
            </div>
          </div>

          {/* Right column - Live Preview */}
          <div className="col-span-4">
            <LiveContactCard
              contact={previewContact}
              additionalEmails={additionalEmails.map(index => ({
                index,
                value: firstRow[mappings.find(m => m.contactProperty === `email-${index}`)?.csvField || ''],
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
    </div>
  )
}
