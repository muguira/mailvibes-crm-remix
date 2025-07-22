export interface AccountInsert {
  name?: string
  address?: string
  primaryContact?: string
  industry?: string
  [key: string]: string | undefined
}

export interface AccountFieldMapping {
  csvField: string
  accountProperty: string
  addAsListField?: boolean
}

/**
 * Maps CSV row data to account properties based on field mappings
 * @param csvRow - A single row from the CSV data
 * @param mappings - Array of field mappings
 * @returns Partial account data
 */
export function mapColumnsToAccount(
  csvRow: Record<string, string>,
  mappings: AccountFieldMapping[],
): Partial<AccountInsert> {
  const account: Partial<AccountInsert> = {}

  mappings.forEach(mapping => {
    const value = csvRow[mapping.csvField]
    if (!value) return

    account[mapping.accountProperty] = value
  })

  return account
}

/**
 * Gets list of mappings that should also be added as list fields
 * @param mappings - Array of field mappings
 * @returns Mappings that have addAsListField set to true
 */
export function getListFieldMappings(mappings: AccountFieldMapping[]): AccountFieldMapping[] {
  return mappings.filter(m => m.addAsListField === true)
}

/**
 * Validates if the minimum required fields are mapped
 * @param mappings - Array of field mappings
 * @returns True if at least name is mapped
 */
export function hasRequiredAccountMappings(mappings: AccountFieldMapping[]): boolean {
  return mappings.some(m => m.accountProperty === 'name')
}
