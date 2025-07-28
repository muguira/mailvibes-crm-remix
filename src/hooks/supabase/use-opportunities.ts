import { supabase } from '@/integrations/supabase/client'
import { useStore } from '@/stores'
import { useOrganizationStore } from '@/stores/organizationStore'
import { OpportunityFilters, PaginationOptions } from '@/types/opportunities'
import { useCallback } from 'react'

// Transform opportunity data from Supabase to frontend format
const transformOpportunity = (opportunity: any) => {
  return {
    id: opportunity.id,
    opportunity: opportunity.opportunity,
    status: opportunity.status,
    revenue: opportunity.revenue,
    revenue_display: opportunity.revenue_display,
    close_date: opportunity.close_date,
    owner: opportunity.owner,
    website: opportunity.website,
    company_name: opportunity.company_name,
    company_linkedin: opportunity.company_linkedin,
    employees: opportunity.employees,
    last_contacted: opportunity.last_contacted,
    next_meeting: opportunity.next_meeting,
    lead_source: opportunity.lead_source,
    priority: opportunity.priority,
    original_contact_id: opportunity.original_contact_id,
    converted_at: opportunity.converted_at,
    data: opportunity.data || {},
    created_at: opportunity.created_at,
    updated_at: opportunity.updated_at,
    organization_id: opportunity.organization_id, // Include organization_id
  }
}

export function useOpportunities() {
  const { authUser: user } = useStore()
  const { currentOrganization } = useOrganizationStore()

  // Helper to get current organization ID
  const getCurrentOrganizationId = useCallback(() => {
    if (!currentOrganization?.id) {
      throw new Error('No organization selected. Please select an organization first.')
    }
    return currentOrganization.id
  }, [currentOrganization])

  // 🚀 OPTIMIZED: Bulk convert contacts to opportunities with better error handling
  const bulkConvertContactsToOpportunities = useCallback(
    async (
      contacts: Array<{
        id: string
        name?: string
        email?: string
        company?: string
        source?: string
      }>,
      conversionData: {
        accountName: string
        dealValue: number
        closeDate?: Date
        stage: string
        priority: string
        contacts: Array<{
          id: string
          name: string
          email?: string
          company?: string
          role: string
        }>
      },
    ) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const organizationId = getCurrentOrganizationId()

      try {
        console.log('🔄 Converting contacts to opportunity...', {
          contactCount: contacts.length,
          organizationId,
          conversionData,
        })

        // Create a single opportunity from multiple contacts
        const opportunityData = {
          user_id: user.id,
          organization_id: organizationId, // Add organization_id
          opportunity: conversionData.accountName,
          status: conversionData.stage,
          revenue: conversionData.dealValue,
          revenue_display: `$${conversionData.dealValue.toLocaleString()}`,
          close_date: conversionData.closeDate?.toISOString().split('T')[0] || null,
          priority: conversionData.priority,
          company_name: conversionData.accountName,
          owner: user.email || '',
          lead_source: contacts[0]?.source || 'Contact Conversion',
          original_contact_id: contacts[0]?.id || null,
          data: {
            converted_from_contacts: contacts.map(c => ({
              id: c.id,
              name: c.name,
              email: c.email,
              company: c.company,
            })),
            contact_roles: conversionData.contacts.reduce(
              (acc, contact) => {
                acc[contact.id] = contact.role
                return acc
              },
              {} as Record<string, string>,
            ),
          },
        }

        const { data, error } = await supabase.from('opportunities').insert([opportunityData]).select().single()

        if (error) {
          console.error('❌ Error creating opportunity:', error)
          throw error
        }

        console.log('✅ Successfully created opportunity:', data)

        return {
          success: true,
          data,
          convertedCount: 1, // One opportunity created from multiple contacts
        }
      } catch (error) {
        console.error('❌ Error in bulkConvertContactsToOpportunities:', error)
        throw error
      }
    },
    [user, getCurrentOrganizationId],
  )

  // 🚀 OPTIMIZED: Get opportunities with pagination, filtering, and field selection
  const getOpportunities = useCallback(
    async (filters: OpportunityFilters = {}, pagination: PaginationOptions = {}) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const organizationId = getCurrentOrganizationId()
      const startTime = performance.now()

      try {
        const { page = 1, pageSize = 50, sortBy = 'created_at', sortOrder = 'desc' } = pagination

        const { stage, priority, searchTerm, dateRange } = filters

        // 🚀 PERFORMANCE: Select only essential fields to reduce payload size
        let query = supabase
          .from('opportunities')
          .select(
            `
          id,
          opportunity,
          status,
          revenue,
          revenue_display,
          close_date,
          owner,
          company_name,
          priority,
          original_contact_id,
          created_at,
          updated_at,
          organization_id
        `,
          )
          .eq('organization_id', organizationId) // Filter by organization instead of user

        // 🚀 PERFORMANCE: Apply filters at database level
        if (stage) {
          query = query.eq('status', stage)
        }

        if (priority) {
          query = query.eq('priority', priority)
        }

        if (searchTerm && searchTerm.trim()) {
          query = query.or(
            `opportunity.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,owner.ilike.%${searchTerm}%`,
          )
        }

        if (dateRange) {
          query = query.gte('close_date', dateRange.start).lte('close_date', dateRange.end)
        }

        // 🚀 PERFORMANCE: Add sorting and pagination
        query = query
          .order(sortBy, { ascending: sortOrder === 'asc' })
          .range((page - 1) * pageSize, page * pageSize - 1)

        // 🚀 PERFORMANCE: Get count separately to avoid heavy payload
        const [dataResult, countResult] = await Promise.all([
          query,
          supabase
            .from('opportunities')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId), // Filter count by organization too
        ])

        const { data, error } = dataResult
        const { count } = countResult

        if (error) {
          console.error('❌ Error fetching opportunities:', error)
          throw error
        }

        const endTime = performance.now()
        console.log(`⚡ Opportunities fetched in ${(endTime - startTime).toFixed(2)}ms`, {
          count: data?.length,
          total: count,
          page,
          organizationId,
        })

        // 🚀 PERFORMANCE: Transform data efficiently
        const transformedData = data?.map(transformOpportunity) || []

        return {
          data: transformedData,
          totalCount: count || 0,
          hasMore: data && data.length === pageSize,
          page,
          pageSize,
        }
      } catch (error) {
        console.error('❌ Error fetching opportunities:', error)
        throw error
      }
    },
    [user, getCurrentOrganizationId],
  )

  // 🚀 OPTIMIZED: Get opportunities count only (for dashboards/stats)
  const getOpportunitiesCount = useCallback(
    async (filters: OpportunityFilters = {}) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const organizationId = getCurrentOrganizationId()

      try {
        let query = supabase
          .from('opportunities')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId) // Filter by organization instead of user

        // Apply same filters as main query
        if (filters.stage) {
          query = query.eq('status', filters.stage)
        }

        if (filters.priority) {
          query = query.eq('priority', filters.priority)
        }

        if (filters.searchTerm && filters.searchTerm.trim()) {
          query = query.or(
            `opportunity.ilike.%${filters.searchTerm}%,company_name.ilike.%${filters.searchTerm}%,owner.ilike.%${filters.searchTerm}%`,
          )
        }

        const { count, error } = await query

        if (error) {
          console.error('❌ Error fetching opportunities count:', error)
          throw error
        }

        return count || 0
      } catch (error) {
        console.error('❌ Error fetching opportunities count:', error)
        throw error
      }
    },
    [user, getCurrentOrganizationId],
  )

  // Update opportunity
  const updateOpportunity = useCallback(
    async (opportunityId: string, updates: Partial<any>) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      try {
        // Transform updates to match database schema - map camelCase to snake_case
        const dbUpdates: any = {}

        // Field mapping from camelCase (grid) to snake_case (database)
        const fieldMapping: { [key: string]: string } = {
          closeDate: 'close_date',
          companyName: 'company_name',
          company: 'company_name', // Grid uses 'company', DB uses 'company_name'
          companyLinkedin: 'company_linkedin',
          lastContacted: 'last_contacted',
          nextMeeting: 'next_meeting',
          leadSource: 'lead_source',
          createdAt: 'created_at',
          updatedAt: 'updated_at',
          // Add reverse mapping for data that comes from DB in snake_case
          close_date: 'close_date',
          company_name: 'company_name',
          company_linkedin: 'company_linkedin',
          last_contacted: 'last_contacted',
          next_meeting: 'next_meeting',
          lead_source: 'lead_source',
          created_at: 'created_at',
          updated_at: 'updated_at',
        }

        // Apply field mappings and copy values
        for (const [key, value] of Object.entries(updates)) {
          const dbFieldName = fieldMapping[key] || key // Use mapped name or original if no mapping

          // Skip readonly fields that shouldn't be updated
          if (['created_at', 'updated_at', 'id'].includes(dbFieldName)) {
            continue
          }

          dbUpdates[dbFieldName] = value
        }

        // Handle revenue formatting
        if (dbUpdates.revenue && typeof dbUpdates.revenue === 'number') {
          dbUpdates.revenue_display = `$${dbUpdates.revenue.toLocaleString()}`
        }

        // Handle date formatting for all date fields
        const dateFields = ['close_date', 'last_contacted', 'next_meeting']
        dateFields.forEach(field => {
          const dateValue = dbUpdates[field]
          if (dateValue) {
            let formattedDate: string

            if (dateValue instanceof Date) {
              formattedDate = dateValue.toISOString().split('T')[0]
            } else if (typeof dateValue === 'string') {
              // Handle ISO string dates from grid editing
              const date = new Date(dateValue)
              if (!isNaN(date.getTime())) {
                formattedDate = date.toISOString().split('T')[0]
              } else {
                throw new Error(`Invalid date format for ${field}: ${dateValue}`)
              }
            } else {
              throw new Error(`Unsupported date type for ${field}: ${typeof dateValue}`)
            }

            dbUpdates[field] = formattedDate
          }
        })

        const { data, error } = await supabase
          .from('opportunities')
          .update(dbUpdates)
          .eq('id', opportunityId)
          .eq('user_id', user.id)
          .select()
          .single()

        if (error) {
          console.error('❌ Error creating opportunity:', error)
          throw error
        }

        console.log('✅ Successfully created opportunity:', data)
        return transformOpportunity(data)
      } catch (error) {
        console.error('❌ Error creating opportunity:', error)
        throw error
      }
    },
    [user, getCurrentOrganizationId],
  )

  // 🚀 OPTIMIZED: Delete opportunity with confirmation
  const deleteOpportunity = useCallback(
    async (opportunityId: string) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const organizationId = getCurrentOrganizationId()

      try {
        console.log('🔄 Deleting opportunity:', { opportunityId, organizationId })

        const { error } = await supabase
          .from('opportunities')
          .delete()
          .eq('id', opportunityId)
          .eq('organization_id', organizationId) // Ensure user can only delete opportunities in their organization

        if (error) {
          console.error('❌ Error deleting opportunity:', error)
          throw error
        }

        console.log('✅ Successfully deleted opportunity:', opportunityId)
        return true
      } catch (error) {
        console.error('❌ Error deleting opportunity:', error)
        throw error
      }
    },
    [user, getCurrentOrganizationId],
  )

  return {
    getOpportunities,
    getOpportunitiesCount,
    updateOpportunity,
    deleteOpportunity,
    bulkConvertContactsToOpportunities,
  }
}
