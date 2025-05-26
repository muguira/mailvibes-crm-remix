export type FieldType = 'text' | 'number' | 'date' | 'list';

export interface ListFieldDefinition {
  fieldName: string;
  csvField: string;
  type: FieldType;
  isRequired?: boolean;
}

/**
 * Ensures field names are unique by appending a suffix if needed
 * @param fieldName - The desired field name
 * @param existingFields - Array of existing field definitions
 * @returns A unique field name
 */
export function ensureUniqueFieldName(
  fieldName: string,
  existingFields: ListFieldDefinition[]
): string {
  let uniqueName = fieldName;
  let suffix = 1;
  
  while (existingFields.some(f => f.fieldName === uniqueName)) {
    uniqueName = `${fieldName}_${suffix}`;
    suffix++;
  }
  
  return uniqueName;
}

/**
 * Validates if the number of fields exceeds the recommended limit
 * @param fields - Array of field definitions
 * @returns Warning message if limit exceeded, null otherwise
 */
export function validateFieldCount(fields: ListFieldDefinition[]): string | null {
  const MAX_RECOMMENDED_FIELDS = 100;
  
  if (fields.length > MAX_RECOMMENDED_FIELDS) {
    return `You have ${fields.length} fields. We recommend keeping your list under ${MAX_RECOMMENDED_FIELDS} columns for optimal performance.`;
  }
  
  return null;
}

/**
 * Builds a field definition with proper validation
 * @param csvField - The CSV column name
 * @param fieldName - The desired field name
 * @param type - The field type
 * @param isRequired - Whether the field is required
 * @param existingFields - Array of existing field definitions
 * @returns A new field definition
 */
export function buildFieldDefinition(
  csvField: string,
  fieldName: string,
  type: FieldType,
  isRequired: boolean = false,
  existingFields: ListFieldDefinition[] = []
): ListFieldDefinition {
  const uniqueFieldName = ensureUniqueFieldName(fieldName, existingFields);
  
  return {
    fieldName: uniqueFieldName,
    csvField,
    type,
    isRequired,
  };
}

/**
 * Converts account field mappings that are marked as list fields
 * @param accountMappings - Array of account field mappings
 * @returns Array of list field definitions from account mappings
 */
export function convertAccountMappingsToListFields(
  accountMappings: Array<{
    csvField: string;
    accountProperty: string;
    addAsListField?: boolean;
  }>
): ListFieldDefinition[] {
  return accountMappings
    .filter(m => m.addAsListField)
    .map(m => ({
      fieldName: m.accountProperty,
      csvField: m.csvField,
      type: 'text' as FieldType,
      isRequired: false,
    }));
} 