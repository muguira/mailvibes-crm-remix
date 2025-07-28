import { useAuth } from '@/components/auth'
import { useStore } from '@/stores/index'
import { Opportunity } from '@/stores/useOpportunitiesSlice'
import { useEffect, useMemo } from 'react'
import { usePerformanceMonitor } from './use-performance-monitor'

interface ColumnFilter {
  columnId: string
  value: any
  type?: string
  operator?: string
}

interface UseInstantOpportunitiesOptions {
  searchTerm: string
  pageSize: number
  currentPage: number
  columnFilters?: ColumnFilter[]
}

interface UseInstantOpportunitiesReturn {
  rows: Opportunity[]
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
const getOpportunitySearchFields = (opportunity: Opportunity): string[] => {
  const cacheKey = `${opportunity.id}-${opportunity.opportunity}-${opportunity.company}-${opportunity.status}`

  if (SEARCH_FIELDS_CACHE.has(cacheKey)) {
    return SEARCH_FIELDS_CACHE.get(cacheKey)!
  }

  const fields = [
    opportunity.opportunity?.toLowerCase() || '',
    opportunity.company?.toLowerCase() || '',
    opportunity.status?.toLowerCase() || '',
    opportunity.stage?.toLowerCase() || '',
    opportunity.priority?.toLowerCase() || '',
    opportunity.owner?.toLowerCase() || '',
    opportunity.revenue?.toString().toLowerCase() || '',
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

export function useInstantOpportunities({
  searchTerm,
  pageSize,
  currentPage,
  columnFilters = [],
}: UseInstantOpportunitiesOptions): UseInstantOpportunitiesReturn {
  const { user } = useAuth()

  // Performance monitoring for optimization tracking
  const { logSummary, renderCount } = usePerformanceMonitor('useInstantOpportunities')

  // Subscribe to all opportunities store state changes
  const {
    opportunitiesCache: cache,
    opportunitiesOrderedIds: orderedIds,
    opportunitiesLoading: { fetching, initializing, backgroundLoading: isBackgroundLoading },
    opportunitiesPagination: { totalCount, loadedCount, isInitialized },
    opportunitiesInitialize: initialize,
  } = useStore()

  // 🚀 FIX: Only show main loading for initial load, not for background fetching
  // Background fetching and pagination should not block the main UI
  const loading = initializing

  // 🚀 DEBUG: Temporary logging to understand loading state
  useEffect(() => {
    console.log('🔍 useInstantOpportunities Debug:', {
      loading,
      initializing,
      fetching,
      isBackgroundLoading,
      isInitialized,
      cacheSize: Object.keys(cache).length,
      orderedIdsLength: orderedIds.length,
      totalCount,
      loadedCount,
    })
  }, [loading, initializing, fetching, isBackgroundLoading, isInitialized, cache, orderedIds, totalCount, loadedCount])

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

  // OPTIMIZED: Memoize processed search term to avoid repeated processing
  const processedSearchTerm = useMemo(() => {
    return searchTerm ? getProcessedSearchTerm(searchTerm) : ''
  }, [searchTerm])

  // OPTIMIZED: Memoize individual filter functions for better performance
  const filterFunctions = useMemo(() => {
    return columnFilters.map(filter => {
      const { columnId, value, type, operator } = filter

      if (type === 'status' && Array.isArray(value)) {
        return (opportunity: Opportunity) => value.includes(opportunity[columnId as keyof Opportunity])
      }

      if (type === 'dropdown') {
        if (Array.isArray(value) && value.length > 0) {
          return (opportunity: Opportunity) => value.includes(opportunity[columnId as keyof Opportunity])
        } else if (value && value !== '') {
          return (opportunity: Opportunity) => opportunity[columnId as keyof Opportunity] === value
        }
        return () => true
      }

      if (type === 'date') {
        return (opportunity: Opportunity) => {
          const cellValue = opportunity[columnId as keyof Opportunity]

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

        return (opportunity: Opportunity) => {
          const cellValue = opportunity[columnId as keyof Opportunity]
          return filterFn(cellValue, searchValue)
        }
      }

      if (type === 'number' && operator && numberFilterFunctions[operator as keyof typeof numberFilterFunctions]) {
        const filterFn = numberFilterFunctions[operator as keyof typeof numberFilterFunctions]

        return (opportunity: Opportunity) => {
          const cellValue = opportunity[columnId as keyof Opportunity]
          const numValue = cellValue ? parseFloat(cellValue as string) : null
          return filterFn(numValue, value)
        }
      }

      // Backward compatibility for filters without operators
      if (!operator) {
        return (opportunity: Opportunity) => opportunity[columnId as keyof Opportunity] === value
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
        const opportunity = cache[id]
        if (!opportunity) return false

        const searchFields = getOpportunitySearchFields(opportunity)
        return searchFields.some(field => field.includes(processedSearchTerm))
      })
    }

    // Apply column filters with memoized functions
    if (filterFunctions.length > 0) {
      filtered = filtered.filter(id => {
        const opportunity = cache[id]
        if (!opportunity) return false

        return filterFunctions.every(filterFn => filterFn(opportunity))
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

  // Check if we need more data for the current page size and we're on page 1
  const needsMoreDataForPageSize = useMemo(() => {
    return currentPage === 1 && pageSize > loadedCount && pageSize >= 100
  }, [currentPage, pageSize, loadedCount])

  // Show loading when we need more data for large page sizes
  const isLoadingForPageSize = needsMoreDataForPageSize && (fetching || isBackgroundLoading)

  return {
    rows: paginatedRows,
    loading: (loading && orderedIds.length === 0) || isLoadingForPageSize, // Show loading on initial load or when loading for page size
    totalCount: filteredIds.length, // Use actual loaded and filtered count for pagination
    isBackgroundLoading,
    loadedCount,
  }
}
