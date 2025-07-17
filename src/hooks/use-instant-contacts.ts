import { useEffect, useMemo, useCallback } from 'react'
import { useStore } from '@/stores/index'
import { useAuth } from '@/components/auth'
import { LeadContact } from '@/components/stream/sample-data'
import { mockContactsById } from '@/components/stream/sample-data'
import { usePerformanceMonitor } from './use-performance-monitor'

interface ColumnFilter {
  columnId: string
  value: any
  type?: string
  operator?: string
}

interface UseInstantContactsOptions {
  searchTerm: string
  pageSize: number
  currentPage: number
  columnFilters?: ColumnFilter[]
}

interface UseInstantContactsReturn {
  rows: LeadContact[]
  loading: boolean
  totalCount: number
  isBackgroundLoading: boolean
  loadedCount: number
}

// OPTIMIZED: Create search fields cache to avoid repeated operations
const SEARCH_FIELDS_CACHE = new Map<string, string[]>()
const DATE_CACHE = new Map<string, Date>()
const PROCESSED_SEARCH_TERMS = new Map<string, string>()

// OPTIMIZED: Memoized search term processing
const getProcessedSearchTerm = (searchTerm: string): string => {
  if (PROCESSED_SEARCH_TERMS.has(searchTerm)) {
    return PROCESSED_SEARCH_TERMS.get(searchTerm)!
  }

  const processed = searchTerm.trim().toLowerCase()
  PROCESSED_SEARCH_TERMS.set(searchTerm, processed)

  // Clear cache if it gets too large
  if (PROCESSED_SEARCH_TERMS.size > 100) {
    PROCESSED_SEARCH_TERMS.clear()
  }

  return processed
}

// OPTIMIZED: Cached date parsing function
const getCachedDate = (dateStr: string): Date | null => {
  if (DATE_CACHE.has(dateStr)) {
    return DATE_CACHE.get(dateStr)!
  }

  const date = new Date(dateStr)
  const cachedDate = isNaN(date.getTime()) ? null : date
  DATE_CACHE.set(dateStr, cachedDate)

  // Clear cache if it gets too large
  if (DATE_CACHE.size > 1000) {
    DATE_CACHE.clear()
  }

  return cachedDate
}

// OPTIMIZED: Memoized search fields extraction
const getContactSearchFields = (contact: LeadContact): string[] => {
  const cacheKey = `${contact.id}-${contact.name}-${contact.email}-${contact.company}-${contact.phone}`

  if (SEARCH_FIELDS_CACHE.has(cacheKey)) {
    return SEARCH_FIELDS_CACHE.get(cacheKey)!
  }

  const fields = [
    contact.name?.toLowerCase() || '',
    contact.email?.toLowerCase() || '',
    contact.company?.toLowerCase() || '',
    contact.phone?.toLowerCase() || '',
  ]

  SEARCH_FIELDS_CACHE.set(cacheKey, fields)

  // Clear cache if it gets too large
  if (SEARCH_FIELDS_CACHE.size > 1000) {
    SEARCH_FIELDS_CACHE.clear()
  }

  return fields
}

// OPTIMIZED: Memoized filter functions for each type
const textFilterFunctions = {
  is_empty: (cellValue: any) => !cellValue || cellValue === '',
  is_not_empty: (cellValue: any) => cellValue && cellValue !== '',
  contains: (cellValue: any, searchValue: string) =>
    String(cellValue || '')
      .toLowerCase()
      .includes(searchValue),
  equals: (cellValue: any, searchValue: string) => String(cellValue || '').toLowerCase() === searchValue,
  starts_with: (cellValue: any, searchValue: string) =>
    String(cellValue || '')
      .toLowerCase()
      .startsWith(searchValue),
  ends_with: (cellValue: any, searchValue: string) =>
    String(cellValue || '')
      .toLowerCase()
      .endsWith(searchValue),
}

const numberFilterFunctions = {
  is_empty: (numValue: number | null) => numValue === null || numValue === undefined,
  is_not_empty: (numValue: number | null) => numValue !== null && numValue !== undefined,
  equals: (numValue: number | null, value: number) => numValue === value,
  greater_than: (numValue: number | null, value: number) => numValue !== null && numValue > value,
  less_than: (numValue: number | null, value: number) => numValue !== null && numValue < value,
  greater_equal: (numValue: number | null, value: number) => numValue !== null && numValue >= value,
  less_equal: (numValue: number | null, value: number) => numValue !== null && numValue <= value,
  between: (numValue: number | null, value: { min: number; max: number }) =>
    numValue !== null && numValue >= value.min && numValue <= value.max,
}

export function useInstantContacts({
  searchTerm,
  pageSize,
  currentPage,
  columnFilters = [],
}: UseInstantContactsOptions): UseInstantContactsReturn {
  const { user } = useAuth()

  // Performance monitoring for optimization tracking
  const { logSummary, renderCount } = usePerformanceMonitor('useInstantContacts')

  // Subscribe to all contacts store state changes
  const {
    contactsCache: cache,
    contactsOrderedIds: orderedIds,
    contactsLoading: { fetching, initializing, backgroundLoading: isBackgroundLoading },
    contactsPagination: { totalCount, loadedCount, isInitialized },
    contactsInitialize: initialize,
  } = useStore()

  // Combine loading states
  const loading = fetching || initializing

  // Log performance summary periodically for monitoring
  useEffect(() => {
    if (renderCount > 0 && renderCount % 20 === 0) {
      logSummary()
    }
  }, [renderCount, logSummary])

  // Initialize store when user is available - but only if not already initialized
  useEffect(() => {
    if (user?.id && !isInitialized) {
      initialize(user.id)
    }
  }, [user?.id, isInitialized, initialize])

  // OPTIMIZED: Memoize mockContactsById update to prevent unnecessary operations
  const updateMockContacts = useCallback(() => {
    Object.entries(cache).forEach(([id, contact]) => {
      mockContactsById[id] = contact
    })
  }, [cache])

  useEffect(() => {
    updateMockContacts()
  }, [updateMockContacts])

  // OPTIMIZED: Memoize processed search term to avoid repeated processing
  const processedSearchTerm = useMemo(() => {
    return searchTerm ? getProcessedSearchTerm(searchTerm) : ''
  }, [searchTerm])

  // OPTIMIZED: Memoize individual filter functions for better performance
  const filterFunctions = useMemo(() => {
    return columnFilters.map(filter => {
      const { columnId, value, type, operator } = filter

      if (type === 'status' && Array.isArray(value)) {
        return (contact: LeadContact) => value.includes(contact[columnId as keyof LeadContact])
      }

      if (type === 'dropdown') {
        if (Array.isArray(value) && value.length > 0) {
          return (contact: LeadContact) => value.includes(contact[columnId as keyof LeadContact])
        } else if (value && value !== '') {
          return (contact: LeadContact) => contact[columnId as keyof LeadContact] === value
        }
        return () => true
      }

      if (type === 'date') {
        return (contact: LeadContact) => {
          const cellValue = contact[columnId as keyof LeadContact]

          if (operator === 'is_empty') {
            return !cellValue || cellValue === ''
          } else if (operator === 'is_not_empty') {
            return cellValue && cellValue !== ''
          } else if (value) {
            const dateValue = cellValue ? getCachedDate(cellValue as string) : null

            if (!dateValue) return false

            if (value.start && value.end) {
              const start = getCachedDate(value.start)
              const end = getCachedDate(value.end)

              if (!start || !end) return false

              if (operator === 'on' && value.start === value.end) {
                const dateStr = dateValue.toISOString().split('T')[0]
                const filterDateStr = start.toISOString().split('T')[0]
                return dateStr === filterDateStr
              }

              return dateValue >= start && dateValue <= end
            } else if (value.start) {
              const start = getCachedDate(value.start)
              return start ? dateValue >= start : false
            } else if (value.end) {
              const end = getCachedDate(value.end)
              return end ? dateValue <= end : false
            }
          }

          return false
        }
      }

      if (type === 'text' && operator && textFilterFunctions[operator as keyof typeof textFilterFunctions]) {
        const filterFn = textFilterFunctions[operator as keyof typeof textFilterFunctions]
        const searchValue = String(value || '').toLowerCase()

        return (contact: LeadContact) => {
          const cellValue = contact[columnId as keyof LeadContact]
          return filterFn(cellValue, searchValue)
        }
      }

      if (type === 'number' && operator && numberFilterFunctions[operator as keyof typeof numberFilterFunctions]) {
        const filterFn = numberFilterFunctions[operator as keyof typeof numberFilterFunctions]

        return (contact: LeadContact) => {
          const cellValue = contact[columnId as keyof LeadContact]
          const numValue = cellValue ? parseFloat(cellValue as string) : null
          return filterFn(numValue, value)
        }
      }

      // Backward compatibility for filters without operators
      if (!operator) {
        return (contact: LeadContact) => contact[columnId as keyof LeadContact] === value
      }

      return () => false
    })
  }, [columnFilters])

  // OPTIMIZED: Highly optimized filtering with memoized functions and search
  const filteredIds = useMemo(() => {
    let filtered = orderedIds

    // Apply search term filter first (usually most selective)
    if (processedSearchTerm) {
      filtered = filtered.filter(id => {
        const contact = cache[id]
        if (!contact) return false

        const searchFields = getContactSearchFields(contact)
        return searchFields.some(field => field.includes(processedSearchTerm))
      })
    }

    // Apply column filters with memoized functions
    if (filterFunctions.length > 0) {
      filtered = filtered.filter(id => {
        const contact = cache[id]
        if (!contact) return false

        return filterFunctions.every(filterFn => filterFn(contact))
      })
    }

    return filtered
  }, [processedSearchTerm, filterFunctions, orderedIds, cache])

  // OPTIMIZED: Memoize pagination calculation with stable dependencies
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize

    const rows = filteredIds
      .slice(startIndex, endIndex)
      .map(id => cache[id])
      .filter(Boolean) // Remove any undefined entries

    return rows
  }, [filteredIds, currentPage, pageSize, cache])

  return {
    rows: paginatedRows,
    loading: loading && orderedIds.length === 0, // Only show loading on initial load
    totalCount: filteredIds.length, // Use actual loaded and filtered count for pagination
    isBackgroundLoading,
    loadedCount,
  }
}
