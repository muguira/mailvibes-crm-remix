import { describe, it, expect } from 'vitest';
import {
  ensureUniqueFieldName,
  validateFieldCount,
  buildFieldDefinition,
  convertAccountMappingsToListFields,
  ListFieldDefinition,
} from './buildFieldDefinitions';

describe('ensureUniqueFieldName', () => {
  it('should return the original name if no duplicates exist', () => {
    const existingFields: ListFieldDefinition[] = [
      { fieldName: 'Name', csvField: 'name', type: 'text' },
      { fieldName: 'Email', csvField: 'email', type: 'text' },
    ];
    
    expect(ensureUniqueFieldName('Phone', existingFields)).toBe('Phone');
  });

  it('should append suffix if duplicate exists', () => {
    const existingFields: ListFieldDefinition[] = [
      { fieldName: 'Status', csvField: 'status', type: 'text' },
    ];
    
    expect(ensureUniqueFieldName('Status', existingFields)).toBe('Status_1');
  });

  it('should increment suffix for multiple duplicates', () => {
    const existingFields: ListFieldDefinition[] = [
      { fieldName: 'Status', csvField: 'status1', type: 'text' },
      { fieldName: 'Status_1', csvField: 'status2', type: 'text' },
      { fieldName: 'Status_2', csvField: 'status3', type: 'text' },
    ];
    
    expect(ensureUniqueFieldName('Status', existingFields)).toBe('Status_3');
  });
});

describe('validateFieldCount', () => {
  it('should return null for fields under the limit', () => {
    const fields: ListFieldDefinition[] = Array(50).fill(null).map((_, i) => ({
      fieldName: `Field${i}`,
      csvField: `field${i}`,
      type: 'text' as const,
    }));
    
    expect(validateFieldCount(fields)).toBeNull();
  });

  it('should return warning message for fields over the limit', () => {
    const fields: ListFieldDefinition[] = Array(150).fill(null).map((_, i) => ({
      fieldName: `Field${i}`,
      csvField: `field${i}`,
      type: 'text' as const,
    }));
    
    const warning = validateFieldCount(fields);
    expect(warning).toContain('150 fields');
    expect(warning).toContain('100 columns');
  });
});

describe('buildFieldDefinition', () => {
  it('should create a field definition with unique name', () => {
    const existingFields: ListFieldDefinition[] = [
      { fieldName: 'Status', csvField: 'status', type: 'text' },
    ];
    
    const field = buildFieldDefinition(
      'another_status',
      'Status',
      'text',
      false,
      existingFields
    );
    
    expect(field).toEqual({
      fieldName: 'Status_1',
      csvField: 'another_status',
      type: 'text',
      isRequired: false,
    });
  });

  it('should preserve original name if no conflicts', () => {
    const field = buildFieldDefinition(
      'email',
      'Email Address',
      'text',
      true,
      []
    );
    
    expect(field).toEqual({
      fieldName: 'Email Address',
      csvField: 'email',
      type: 'text',
      isRequired: true,
    });
  });
});

describe('convertAccountMappingsToListFields', () => {
  it('should only convert mappings with addAsListField=true', () => {
    const accountMappings = [
      { csvField: 'company', accountProperty: 'name', addAsListField: true },
      { csvField: 'addr', accountProperty: 'address', addAsListField: false },
      { csvField: 'industry', accountProperty: 'industry', addAsListField: true },
    ];
    
    const listFields = convertAccountMappingsToListFields(accountMappings);
    
    expect(listFields).toHaveLength(2);
    expect(listFields[0]).toEqual({
      fieldName: 'name',
      csvField: 'company',
      type: 'text',
      isRequired: false,
    });
    expect(listFields[1]).toEqual({
      fieldName: 'industry',
      csvField: 'industry',
      type: 'text',
      isRequired: false,
    });
  });

  it('should return empty array if no fields marked as list fields', () => {
    const accountMappings = [
      { csvField: 'company', accountProperty: 'name', addAsListField: false },
      { csvField: 'addr', accountProperty: 'address', addAsListField: false },
    ];
    
    const listFields = convertAccountMappingsToListFields(accountMappings);
    
    expect(listFields).toHaveLength(0);
  });
}); 