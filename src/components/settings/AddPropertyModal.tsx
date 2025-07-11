import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Plus, Trash2 } from 'lucide-react';
import { NewAccountProperty, AccountProperty, PROPERTY_TYPE_OPTIONS } from '@/types/account-properties';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (property: NewAccountProperty) => void;
  editingProperty?: AccountProperty | null;
  preselectedType?: 'text' | 'number' | 'date' | 'collaborator' | 'list' | null;
  isLoading?: boolean;
}

export function AddPropertyModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingProperty,
  preselectedType,
  isLoading = false 
}: AddPropertyModalProps) {
  const [propertyName, setPropertyName] = useState('');
  const [propertyType, setPropertyType] = useState<'text' | 'number' | 'date' | 'collaborator' | 'list'>('text');
  const [isRequired, setIsRequired] = useState(false);
  const [listOptions, setListOptions] = useState<string[]>(['']);
  const [allowMultipleCollaborators, setAllowMultipleCollaborators] = useState(false);
  const [enableFiltering, setEnableFiltering] = useState(false);
  const [defaultToRelationshipCreator, setDefaultToRelationshipCreator] = useState(false);

  // Reset form when modal opens/closes or editing property changes
  useEffect(() => {
    if (isOpen) {
      if (editingProperty) {
        // Editing existing property
        setPropertyName(editingProperty.name);
        setPropertyType(editingProperty.type);
        setIsRequired(editingProperty.required || false);
        setListOptions(editingProperty.options && editingProperty.options.length > 0 ? editingProperty.options : ['']);
        // Reset other fields to defaults for editing
        setAllowMultipleCollaborators(false);
        setEnableFiltering(false);
        setDefaultToRelationshipCreator(false);
      } else {
        // Adding new property
        setPropertyName('');
        setPropertyType(preselectedType || 'text');
        setIsRequired(false);
        setListOptions(['']);
        setAllowMultipleCollaborators(false);
        setEnableFiltering(false);
        setDefaultToRelationshipCreator(false);
      }
    }
  }, [isOpen, editingProperty, preselectedType]);

  const handleAddListOption = () => {
    setListOptions([...listOptions, '']);
  };

  const handleRemoveListOption = (index: number) => {
    if (listOptions.length > 1) {
      setListOptions(listOptions.filter((_, i) => i !== index));
    }
  };

  const handleListOptionChange = (index: number, value: string) => {
    const newOptions = [...listOptions];
    newOptions[index] = value;
    setListOptions(newOptions);
  };

  const handleSave = () => {
    if (!propertyName.trim()) return;

    const newProperty: NewAccountProperty = {
      name: propertyName.trim(),
      type: propertyType,
      required: isRequired,
      ...(propertyType === 'list' && { 
        options: listOptions.filter(option => option.trim() !== '') 
      })
    };

    onSave(newProperty);
  };

  const handleClose = () => {
    onClose();
  };

  const isFormValid = propertyName.trim() !== '' && 
    (propertyType !== 'list' || listOptions.some(option => option.trim() !== ''));

  const getModalTitle = () => {
    if (editingProperty) {
      return `Edit ${editingProperty.name} Property`;
    }
    
    if (preselectedType) {
      const typeLabel = PROPERTY_TYPE_OPTIONS.find(opt => opt.value === preselectedType)?.label || preselectedType;
      return `Add New ${typeLabel} Property`;
    }
    
    return 'Add New Property';
  };

  const getPropertyTypeDescription = () => {
    switch (propertyType) {
      case 'collaborator':
        return 'With a collaborator field, users can select one or more contacts to add as collaborators.';
      case 'date':
        return 'Date fields allow users to select dates from a calendar picker.';
      case 'number':
        return 'Number fields only accept numeric values and can be used for calculations.';
      case 'text':
        return 'Text fields allow users to enter any text content.';
      case 'list':
        return 'List fields provide a dropdown with predefined options for users to select from.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white bg-teal-500 -m-6 mb-6 p-4 rounded-t-lg">
            {getModalTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Property Name */}
          <div className="space-y-2">
            <Label htmlFor="property-name" className="text-sm font-medium text-gray-700">
              Set Property Name
            </Label>
            <Input
              id="property-name"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder="Enter a name"
              className="w-full"
            />
          </div>

          {/* Property Type - only show for new properties */}
          {!editingProperty && (
            <div className="space-y-2">
              <Label htmlFor="property-type" className="text-sm font-medium text-gray-700">
                Property Type
              </Label>
              <Select value={propertyType} onValueChange={(value: any) => setPropertyType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Property Type Description */}
          {getPropertyTypeDescription() && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
              {getPropertyTypeDescription()}
            </div>
          )}

          {/* List Options - only show for list type */}
          {propertyType === 'list' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                List Options
              </Label>
              <div className="space-y-2">
                {listOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => handleListOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    {listOptions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveListOption(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddListOption}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {/* Property Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Set Property Options
            </Label>
            
            {propertyType === 'collaborator' && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="default-relationship-creator"
                    checked={defaultToRelationshipCreator}
                    onCheckedChange={setDefaultToRelationshipCreator}
                  />
                  <Label htmlFor="default-relationship-creator" className="text-sm text-gray-700">
                    Automatically default to relationship creator
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allow-multiple-collaborators"
                    checked={allowMultipleCollaborators}
                    onCheckedChange={setAllowMultipleCollaborators}
                  />
                  <Label htmlFor="allow-multiple-collaborators" className="text-sm text-gray-700">
                    Allow multiple collaborators
                  </Label>
                </div>
              </>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable-filtering"
                checked={enableFiltering}
                onCheckedChange={setEnableFiltering}
              />
              <Label htmlFor="enable-filtering" className="text-sm text-gray-700">
                Enable filtering when this field is added to a list
              </Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!isFormValid || isLoading}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              {isLoading ? 'Saving...' : editingProperty ? 'Update Property' : 'Add Property'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 