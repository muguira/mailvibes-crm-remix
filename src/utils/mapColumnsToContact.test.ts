import { describe, it, expect } from 'vitest';
import { mapColumnsToContact, hasRequiredMappings, FieldMapping } from './mapColumnsToContact';

describe('mapColumnsToContact', () => {
  it('should map CSV fields to contact properties', () => {
    const csvRow = {
      'Full Name': 'John Doe',
      'Email Address': 'john@example.com',
      'Phone Number': '123-456-7890',
    };

    const mappings: FieldMapping[] = [
      { csvField: 'Full Name', contactProperty: 'name', nameType: 'full' },
      { csvField: 'Email Address', contactProperty: 'email' },
      { csvField: 'Phone Number', contactProperty: 'phone' },
    ];

    const result = mapColumnsToContact(csvRow, mappings);

    expect(result).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
    });
  });

  it('should handle first and last name separately', () => {
    const csvRow = {
      'First': 'John',
      'Last': 'Doe',
      'Email': 'john@example.com',
    };

    const mappings: FieldMapping[] = [
      { csvField: 'First', contactProperty: 'name', nameType: 'first' },
      { csvField: 'Last', contactProperty: 'name', nameType: 'last' },
      { csvField: 'Email', contactProperty: 'email' },
    ];

    const result = mapColumnsToContact(csvRow, mappings);

    expect(result).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      name: 'John Doe', // Combined automatically
      email: 'john@example.com',
    });
  });

  it('should ignore missing CSV values', () => {
    const csvRow = {
      'Name': 'John Doe',
      'Email': 'john@example.com',
      // Phone is missing
    };

    const mappings: FieldMapping[] = [
      { csvField: 'Name', contactProperty: 'name', nameType: 'full' },
      { csvField: 'Email', contactProperty: 'email' },
      { csvField: 'Phone', contactProperty: 'phone' }, // This field doesn't exist in csvRow
    ];

    const result = mapColumnsToContact(csvRow, mappings);

    expect(result).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      // phone is not included
    });
  });

  it('should handle empty mappings', () => {
    const csvRow = {
      'Name': 'John Doe',
      'Email': 'john@example.com',
    };

    const mappings: FieldMapping[] = [];

    const result = mapColumnsToContact(csvRow, mappings);

    expect(result).toEqual({});
  });
});

describe('hasRequiredMappings', () => {
  it('should return true when name and email are mapped', () => {
    const mappings: FieldMapping[] = [
      { csvField: 'Full Name', contactProperty: 'name', nameType: 'full' },
      { csvField: 'Email', contactProperty: 'email' },
    ];

    expect(hasRequiredMappings(mappings)).toBe(true);
  });

  it('should return true when first name and email are mapped', () => {
    const mappings: FieldMapping[] = [
      { csvField: 'First', contactProperty: 'name', nameType: 'first' },
      { csvField: 'Email', contactProperty: 'email' },
    ];

    expect(hasRequiredMappings(mappings)).toBe(true);
  });

  it('should return false when only email is mapped', () => {
    const mappings: FieldMapping[] = [
      { csvField: 'Email', contactProperty: 'email' },
    ];

    expect(hasRequiredMappings(mappings)).toBe(false);
  });

  it('should return false when only name is mapped', () => {
    const mappings: FieldMapping[] = [
      { csvField: 'Name', contactProperty: 'name', nameType: 'full' },
    ];

    expect(hasRequiredMappings(mappings)).toBe(false);
  });

  it('should return false when only last name is mapped', () => {
    const mappings: FieldMapping[] = [
      { csvField: 'Last', contactProperty: 'name', nameType: 'last' },
      { csvField: 'Email', contactProperty: 'email' },
    ];

    expect(hasRequiredMappings(mappings)).toBe(false);
  });

  it('should return false for empty mappings', () => {
    expect(hasRequiredMappings([])).toBe(false);
  });
}); 