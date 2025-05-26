export interface ContactInsert {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  linkedin?: string;
  facebook?: string;
  [key: string]: string | undefined;
}

export interface FieldMapping {
  csvField: string;
  contactProperty: string;
  nameType?: 'full' | 'first' | 'last';
}

/**
 * Maps CSV row data to contact properties based on field mappings
 * @param csvRow - A single row from the CSV data
 * @param mappings - Array of field mappings
 * @returns Partial contact data
 */
export function mapColumnsToContact(
  csvRow: Record<string, string>,
  mappings: FieldMapping[]
): Partial<ContactInsert> {
  const contact: Partial<ContactInsert> = {};

  mappings.forEach((mapping) => {
    const value = csvRow[mapping.csvField];
    if (!value) return;

    // Handle special case for name fields
    if (mapping.contactProperty === 'name') {
      if (mapping.nameType === 'full') {
        contact.name = value;
      } else if (mapping.nameType === 'first') {
        contact.firstName = value;
      } else if (mapping.nameType === 'last') {
        contact.lastName = value;
      }
    } else {
      // Handle other properties
      contact[mapping.contactProperty] = value;
    }
  });

  // If we have first and last name but no full name, combine them
  if (contact.firstName && contact.lastName && !contact.name) {
    contact.name = `${contact.firstName} ${contact.lastName}`;
  }

  return contact;
}

/**
 * Validates if the minimum required fields are mapped
 * @param mappings - Array of field mappings
 * @returns True if at least name and email are mapped
 */
export function hasRequiredMappings(mappings: FieldMapping[]): boolean {
  const hasName = mappings.some(
    (m) => m.contactProperty === 'name' && (m.nameType === 'full' || m.nameType === 'first')
  );
  const hasEmail = mappings.some((m) => m.contactProperty === 'email');
  
  return hasName && hasEmail;
} 