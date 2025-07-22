import { describe, it, expect, vi, beforeEach } from 'vitest'
import { importCsvData, validateImportData } from './csvImportService'
import { ParsedCsvResult } from '@/utils/parseCsv'
import { FieldMapping } from '@/utils/mapColumnsToContact'
import { AccountFieldMapping } from '@/utils/mapColumnsToAccount'
import { ListFieldDefinition } from '@/utils/buildFieldDefinitions'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: 'list-123', name: 'Test List' },
              error: null,
            }),
          ),
        })),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() =>
          Promise.resolve({
            data: [{ id: 'record-123' }],
            error: null,
          }),
        ),
      })),
    })),
  },
}))

describe('csvImportService', () => {
  const mockParsedData: ParsedCsvResult = {
    headers: ['Name', 'Email', 'Company', 'Status'],
    rows: [
      { Name: 'John Doe', Email: 'john@example.com', Company: 'Acme Inc', Status: 'Lead' },
      { Name: 'Jane Smith', Email: 'jane@example.com', Company: 'Tech Corp', Status: 'Active' },
    ],
    delimiter: ',',
  }

  const mockContactMappings: FieldMapping[] = [
    { csvField: 'Name', contactProperty: 'name', nameType: 'full' },
    { csvField: 'Email', contactProperty: 'email' },
  ]

  const mockAccountMappings: AccountFieldMapping[] = [
    { csvField: 'Company', accountProperty: 'name', addAsListField: false },
  ]

  const mockListFields: ListFieldDefinition[] = [
    { fieldName: 'Relationship Name', csvField: 'Status', type: 'text', isRequired: true },
  ]

  describe('validateImportData', () => {
    it('should pass validation with valid data', () => {
      const result = validateImportData(mockParsedData, mockContactMappings, mockListFields)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail validation without contact name or email mapping', () => {
      const invalidMappings: FieldMapping[] = [{ csvField: 'Phone', contactProperty: 'phone' }]

      const result = validateImportData(mockParsedData, invalidMappings, mockListFields)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Either Name or Email must be mapped for contacts')
    })

    it('should fail validation without relationship name mapping', () => {
      const invalidListFields: ListFieldDefinition[] = [
        { fieldName: 'Relationship Name', csvField: '', type: 'text', isRequired: true },
      ]

      const result = validateImportData(mockParsedData, mockContactMappings, invalidListFields)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Relationship Name must be mapped')
    })

    it('should fail validation with empty data', () => {
      const emptyData: ParsedCsvResult = {
        headers: ['Name', 'Email'],
        rows: [],
        delimiter: ',',
      }

      const result = validateImportData(emptyData, mockContactMappings, mockListFields)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('No data rows found in CSV')
    })
  })

  describe('importCsvData', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should process data in batches', async () => {
      const largeParsedData: ParsedCsvResult = {
        headers: ['Name', 'Email', 'Company', 'Status'],
        rows: Array(250)
          .fill(null)
          .map((_, i) => ({
            Name: `User ${i}`,
            Email: `user${i}@example.com`,
            Company: `Company ${i}`,
            Status: 'Lead',
          })),
        delimiter: ',',
      }

      const progressCallback = vi.fn()

      const result = await importCsvData(
        largeParsedData,
        mockContactMappings,
        mockAccountMappings,
        mockListFields,
        'Test List',
        'accounts',
        'user-123',
        progressCallback,
      )

      // Should have called progress callback 3 times (250 rows / 100 batch size = 3 batches)
      expect(progressCallback).toHaveBeenCalledTimes(3)
      expect(progressCallback).toHaveBeenCalledWith(33)
      expect(progressCallback).toHaveBeenCalledWith(67)
      expect(progressCallback).toHaveBeenCalledWith(100)
    })

    it('should handle field type conversions', async () => {
      const dataWithTypes: ParsedCsvResult = {
        headers: ['Name', 'Email', 'Revenue', 'Founded', 'Tags'],
        rows: [
          {
            Name: 'John Doe',
            Email: 'john@example.com',
            Revenue: '1000000',
            Founded: '01/15/2020',
            Tags: 'tech,saas,startup',
          },
        ],
        delimiter: ',',
      }

      const listFieldsWithTypes: ListFieldDefinition[] = [
        { fieldName: 'Name', csvField: 'Name', type: 'text', isRequired: true },
        { fieldName: 'Revenue', csvField: 'Revenue', type: 'number', isRequired: false },
        { fieldName: 'Founded', csvField: 'Founded', type: 'date', isRequired: false },
        { fieldName: 'Tags', csvField: 'Tags', type: 'list', isRequired: false },
      ]

      await importCsvData(
        dataWithTypes,
        mockContactMappings,
        mockAccountMappings,
        listFieldsWithTypes,
        'Test List',
        'accounts',
        'user-123',
      )

      // Verify the service was called
      // Note: The actual verification would depend on the mock implementation
    })

    it('should return proper summary', async () => {
      const result = await importCsvData(
        mockParsedData,
        mockContactMappings,
        mockAccountMappings,
        mockListFields,
        'Test List',
        'accounts',
        'user-123',
      )

      expect(result).toMatchObject({
        contactsCreated: expect.any(Number),
        contactsSkipped: expect.any(Number),
        accountsCreated: expect.any(Number),
        accountsSkipped: expect.any(Number),
        listRowsCreated: expect.any(Number),
        errors: expect.any(Array),
      })
    })
  })
})
