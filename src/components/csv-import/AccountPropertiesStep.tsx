import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CsvFieldChip } from "./CsvFieldChip";
import { AccountPropertySlot } from "./AccountPropertySlot";
import { LiveAccountCard } from "./LiveAccountCard";
import { NewPropertyModal } from "./NewPropertyModal";
import { ParsedCsvResult } from "@/utils/parseCsv";
import { 
  mapColumnsToAccount, 
  AccountFieldMapping, 
  hasRequiredAccountMappings 
} from "@/utils/mapColumnsToAccount";
import { Plus } from "lucide-react";

interface AccountPropertiesStepProps {
  parsedData: ParsedCsvResult;
  onMappingsChange: (mappings: AccountFieldMapping[]) => void;
  onValidationChange: (isValid: boolean) => void;
}

interface CustomProperty {
  id: string;
  label: string;
}

export function AccountPropertiesStep({
  parsedData,
  onMappingsChange,
  onValidationChange,
}: AccountPropertiesStepProps) {
  const [mappings, setMappings] = useState<AccountFieldMapping[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [customProperties, setCustomProperties] = useState<CustomProperty[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Get unmapped fields
  const unmappedFields = parsedData.headers.filter(
    (header) => !mappings.some((m) => m.csvField === header)
  );

  // Get first row for preview
  const firstRow = parsedData.rows[0] || {};
  const previewAccount = mapColumnsToAccount(firstRow, mappings);

  // Update parent component when mappings change
  useEffect(() => {
    onMappingsChange(mappings);
    onValidationChange(hasRequiredAccountMappings(mappings));
  }, [mappings, onMappingsChange, onValidationChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    // If not dropped on a valid target, do nothing (field stays in CSV fields)
    if (!over) return;

    const draggedField = active.id as string;
    const droppedOnSlot = over.id as string;

    // Add new mapping
    const newMapping: AccountFieldMapping = {
      csvField: draggedField,
      accountProperty: droppedOnSlot,
      addAsListField: false,
    };

    setMappings((prev) => [
      ...prev.filter((m) => m.accountProperty !== droppedOnSlot),
      newMapping,
    ]);
  };

  const handleClearMapping = (accountProperty: string) => {
    setMappings((prev) => prev.filter((m) => m.accountProperty !== accountProperty));
  };

  const handleListFieldToggle = (accountProperty: string, checked: boolean) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.accountProperty === accountProperty
          ? { ...m, addAsListField: checked }
          : m
      )
    );
  };

  const getMappedFieldForProperty = (property: string): string | undefined => {
    const mapping = mappings.find((m) => m.accountProperty === property);
    return mapping?.csvField;
  };

  const isListFieldChecked = (property: string): boolean => {
    const mapping = mappings.find((m) => m.accountProperty === property);
    return mapping?.addAsListField || false;
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-hidden">
      {/* Instructions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Import Account Properties
        </h2>
        <p className="text-gray-600 text-sm">
          Drag and drop the fields from your CSV file that you would like to use to
          populate existing Account properties in RelateIQ. Or, create new Account
          properties for the information in your CSV file. These properties will be
          stored at the account level, and are common to every relationship with that
          single account.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Check the box next to a field to also add it as a list field
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
            <div className="space-y-2 p-2 max-h-[calc(100vh-500px)] overflow-y-auto">
              {unmappedFields.map((field) => (
                <CsvFieldChip
                  key={field}
                  id={field}
                  label={field}
                  isDragging={activeDragId === field}
                />
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
                onListFieldToggle={(checked) => handleListFieldToggle('name', checked)}
              />

              <AccountPropertySlot
                id="address"
                label="Address"
                value={getMappedFieldForProperty('address')}
                onClear={() => handleClearMapping('address')}
                isListFieldChecked={isListFieldChecked('address')}
                onListFieldToggle={(checked) => handleListFieldToggle('address', checked)}
              />

              <AccountPropertySlot
                id="primaryContact"
                label="Primary Contact"
                value={getMappedFieldForProperty('primaryContact')}
                onClear={() => handleClearMapping('primaryContact')}
                isListFieldChecked={isListFieldChecked('primaryContact')}
                onListFieldToggle={(checked) => handleListFieldToggle('primaryContact', checked)}
              />

              <AccountPropertySlot
                id="industry"
                label="Industry"
                value={getMappedFieldForProperty('industry')}
                onClear={() => handleClearMapping('industry')}
                isListFieldChecked={isListFieldChecked('industry')}
                onListFieldToggle={(checked) => handleListFieldToggle('industry', checked)}
              />

              {/* Custom properties */}
              {customProperties.map((property) => (
                <AccountPropertySlot
                  key={property.id}
                  id={property.id}
                  label={property.label}
                  value={getMappedFieldForProperty(property.id)}
                  onClear={() => handleClearMapping(property.id)}
                  isListFieldChecked={isListFieldChecked(property.id)}
                  onListFieldToggle={(checked) => handleListFieldToggle(property.id, checked)}
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
                value: firstRow[mappings.find(m => m.accountProperty === property.id)?.csvField || '']
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
        onConfirm={(propertyName) => {
          const newProperty: CustomProperty = {
            id: `custom-${Date.now()}`,
            label: propertyName,
          };
          setCustomProperties([...customProperties, newProperty]);
        }}
        title="Create New Account Property"
      />
    </div>
  );
} 