import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth'
import { useStore } from '@/stores'

export interface ColumnFilterValue {
  value: string
  count: number
}

interface UseColumnFilterValuesOptions {
  columnId: string
  enabled?: boolean
  maxValues?: number
}

export function useColumnFilterValues({ columnId, enabled = true, maxValues = 100 }: UseColumnFilterValuesOptions) {
  const { user } = useAuth()
  const { columns } = useStore()

  // Determine if this is a standard column or custom field
  const isStandardColumn = ['name', 'email', 'phone', 'company', 'status'].includes(columnId)

  const fetchColumnValues = async (): Promise<ColumnFilterValue[]> => {
    if (!user || !columnId) return []

    try {
      console.log(`🔍 Starting chunked filter values fetch for column: ${columnId}`)

      if (isStandardColumn) {
        // Query standard columns with chunked approach
        const allValues = new Set<string>()
        let offset = 0
        const chunkSize = 1000
        let hasMore = true
        let totalFetched = 0

        while (hasMore && allValues.size < 10000) {
          console.log(`📦 Fetching standard chunk ${Math.floor(offset / chunkSize) + 1} for ${columnId}`)

          // Use explicit any type to avoid deep type instantiation
          const { data: chunk, error } = await (supabase as any)
            .from('contacts')
            .select(columnId)
            .not(columnId, 'is', null)
            .neq(columnId, '')
            .range(offset, offset + chunkSize - 1)

          if (error) {
            console.error(`❌ Error fetching standard column chunk:`, error)
            throw error
          }

          console.log(`📦 Standard chunk returned ${chunk?.length || 0} records`)
          totalFetched += chunk?.length || 0

          if (!chunk || chunk.length === 0) {
            hasMore = false
            break
          }

          // Add values to set
          chunk.forEach((row: any) => {
            const value = row[columnId]
            if (value && typeof value === 'string' && value.trim()) {
              allValues.add(value.trim())
            }
          })

          // Check if we got fewer records than requested (indicates end)
          if (chunk.length < chunkSize) {
            hasMore = false
          } else {
            offset += chunkSize
          }
        }

        console.log(
          `✅ Standard column ${columnId}: found ${allValues.size} unique values from ${totalFetched} total records`,
        )

        return Array.from(allValues)
          .slice(0, maxValues)
          .map(value => ({ value, count: 1 }))
      } else {
        // Query JSONB custom fields with chunked approach
        const allValues = new Set<string>()
        let offset = 0
        const chunkSize = 1000
        let hasMore = true
        let totalProcessed = 0

        while (hasMore && allValues.size < 10000) {
          console.log(`📦 Fetching JSONB chunk ${Math.floor(offset / chunkSize) + 1} for ${columnId}`)

          // Use explicit any type to avoid deep type instantiation
          const { data: contacts, error } = await (supabase as any)
            .from('contacts')
            .select('data')
            .not('data', 'is', null)
            .range(offset, offset + chunkSize - 1)

          if (error) {
            console.error(`❌ Error fetching JSONB chunk:`, error)
            throw error
          }

          console.log(`📦 JSONB chunk returned ${contacts?.length || 0} records`)

          if (!contacts || contacts.length === 0) {
            hasMore = false
            break
          }

          // Extract values from JSONB data
          let chunkValues = 0
          contacts.forEach((contact: any) => {
            totalProcessed++
            if (contact.data && typeof contact.data === 'object') {
              const value = contact.data[columnId]
              if (value && typeof value === 'string' && value.trim()) {
                allValues.add(value.trim())
                chunkValues++
              }
            }
          })

          console.log(
            `📦 JSONB chunk processed ${contacts.length} records, found ${chunkValues} values for ${columnId}`,
          )

          // Check if we got fewer records than requested (indicates end)
          if (contacts.length < chunkSize) {
            hasMore = false
          } else {
            offset += chunkSize
          }
        }

        console.log(
          `✅ JSONB column ${columnId}: processed ${totalProcessed} records, found ${allValues.size} unique values`,
        )

        return Array.from(allValues)
          .slice(0, maxValues)
          .map(value => ({ value, count: 1 }))
      }
    } catch (error) {
      console.error(`❌ Error fetching filter values for ${columnId}:`, error)
      return []
    }
  }

  // Create query with cache that expires quickly during development
  const queryKey = ['column_filter_values', user?.id, columnId, columns.length, 'chunked_v3']

  const query = useQuery({
    queryKey,
    queryFn: fetchColumnValues,
    enabled: !!user && !!columnId && enabled,
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute cache
    retry: 2,
  })

  return {
    values: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
