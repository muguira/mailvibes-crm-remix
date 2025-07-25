import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth';
import { toast } from '@/hooks/use-toast';

interface CreateOpportunityData {
  contactId: string;
  contactName: string;
  contactEmail?: string;
  company?: string;
  dealValue: number;
  closeDate: Date;
  stage: string;
  priority: string;
  leadSource?: string;
  owner?: string;
}

interface OpportunityFilters {
  stage?: string;
  priority?: string;
  searchTerm?: string;
  dateRange?: { start: string; end: string };
}

interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'revenue' | 'close_date' | 'opportunity';
  sortOrder?: 'asc' | 'desc';
}

export function useOpportunities() {
  const { user } = useAuth();

  // Convert contact to opportunity
  const convertContactToOpportunity = useCallback(async (
    contactData: CreateOpportunityData
  ) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const newOpportunity = {
        user_id: user.id,
        opportunity: contactData.contactName || 'Unnamed Opportunity',
        status: contactData.stage,
        revenue: contactData.dealValue,
        revenue_display: `$${contactData.dealValue.toLocaleString()}`,
        close_date: contactData.closeDate.toISOString().split('T')[0], // YYYY-MM-DD format
        owner: contactData.owner || user.email || 'Unknown',
        company_name: contactData.company || 'Unknown Company',
        website: '',
        company_linkedin: '',
        employees: 0,
        last_contacted: new Date().toISOString().split('T')[0],
        next_meeting: null,
        lead_source: contactData.leadSource || 'Converted Contact',
        priority: contactData.priority,
        original_contact_id: contactData.contactId,
        data: {
          email: contactData.contactEmail
        }
      };

      const { data, error } = await supabase
        .from('opportunities')
        .insert([newOpportunity])
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error creating opportunity:', error);
        throw error;
      }

      console.log('✅ Opportunity created successfully:', data);
      
      return {
        success: true,
        opportunity: data
      };
      
    } catch (error) {
      console.error('❌ Error creating opportunity:', error);
      throw error;
    }
  }, [user]);

  // Bulk convert multiple contacts to opportunities
  const bulkConvertContactsToOpportunities = useCallback(async (
    contacts: Array<{
      id: string;
      name?: string;
      email?: string;
      company?: string;
      source?: string;
    }>,
    conversionData: {
      accountName: string;
      dealValue: number;
      closeDate?: Date;
      stage: string;
      priority: string;
      contacts: Array<{
        id: string;
        name: string;
        email?: string;
        company?: string;
        role: string;
      }>;
    }
  ) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Create a single opportunity using the account name
      const opportunityToInsert = {
        user_id: user.id,
        opportunity: conversionData.accountName, // Use account name as opportunity name
        status: conversionData.stage,
        revenue: conversionData.dealValue,
        revenue_display: `$${conversionData.dealValue.toLocaleString()}`,
        close_date: conversionData.closeDate ? conversionData.closeDate.toISOString().split('T')[0] : null,
        owner: user.email || 'Unknown',
        company_name: conversionData.accountName, // Use account name for company
        website: '',
        company_linkedin: '',
        employees: 0,
        last_contacted: new Date().toISOString().split('T')[0],
        next_meeting: null,
        lead_source: 'Converted Contact',
        priority: conversionData.priority,
        original_contact_id: contacts[0]?.id || null, // Primary contact
        data: {
          contacts: conversionData.contacts, // Store contact roles in JSONB data
          conversion_source: 'multiple_contacts'
        }
      };

      const { data, error } = await supabase
        .from('opportunities')
        .insert([opportunityToInsert])
        .select();

      if (error) {
        console.error('❌ Supabase error creating opportunity:', error);
        throw error;
      }

      console.log('✅ Successfully created opportunity:', data);

      return {
        success: true,
        data,
        convertedCount: 1 // One opportunity created from multiple contacts
      };
    } catch (error) {
      console.error('❌ Error in bulkConvertContactsToOpportunities:', error);
      throw error;
    }
  }, [user]);

  // 🚀 OPTIMIZED: Get opportunities with pagination, filtering, and field selection
  const getOpportunities = useCallback(async (
    filters: OpportunityFilters = {},
    pagination: PaginationOptions = {}
  ) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const startTime = performance.now();

    try {
      const {
        page = 1,
        pageSize = 50,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = pagination;

      const {
        stage,
        priority,
        searchTerm,
        dateRange
      } = filters;

      // 🚀 PERFORMANCE: Select only essential fields to reduce payload size
      let query = supabase
        .from('opportunities')
        .select(`
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
          updated_at
        `)
        .eq('user_id', user.id);

      // 🚀 PERFORMANCE: Apply filters at database level
      if (stage) {
        query = query.eq('status', stage);
      }

      if (priority) {
        query = query.eq('priority', priority);
      }

      if (searchTerm && searchTerm.trim()) {
        query = query.or(`opportunity.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,owner.ilike.%${searchTerm}%`);
      }

      if (dateRange) {
        query = query
          .gte('close_date', dateRange.start)
          .lte('close_date', dateRange.end);
      }

      // 🚀 PERFORMANCE: Apply sorting and pagination
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range((page - 1) * pageSize, page * pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching opportunities:', error);
        throw error;
      }

      const endTime = performance.now();
      console.log(`🚀 Opportunities query took ${(endTime - startTime).toFixed(2)}ms`);

      // Status mapping from database values to pipeline stages
      const statusMapping: Record<string, string> = {
        // Old Spanish stages mapped to new English stages
        'Demo agendada': 'Lead/New',
        'Demo asistida': 'Discovery', 
        'Propuesta enviada': 'Proposal',
        'Int. de cierre': 'Closing',
        'Confirmación verbal': 'Negotiation',
        'Ganado': 'Won',
        'Perdido': 'Lost',
        
        // Old English stages mapped to new stages  
        'Contract Sent': 'Proposal',
        'In Procurement': 'Discovery',
        'Deal Won': 'Won',
        'Qualified': 'Qualified',
        
        // New stages (direct mapping)
        'Lead/New': 'Lead/New',
        'Discovery': 'Discovery',
        'Proposal': 'Proposal',
        'Negotiation': 'Negotiation',
        'Closing': 'Closing',
        'Won': 'Won',
        'Lost': 'Lost'
      };

      // 🚀 PERFORMANCE: Minimal transformation - moved from client to here but kept lightweight
      const transformedData = data?.map(opp => ({
        id: opp.id,
        opportunity: opp.opportunity,
        status: opp.status,
        stage: statusMapping[opp.status] || opp.status, // Map status to stage for Kanban
        revenue: parseInt(opp.revenue?.toString() || '0'), // Convert revenue to number for calculations
        closeDate: opp.close_date || '',
        owner: opp.owner,
        company: opp.company_name,
        priority: opp.priority,
        originalContactId: opp.original_contact_id,
        createdAt: opp.created_at,
        updatedAt: opp.updated_at
      })) || [];

      return {
        data: transformedData,
        totalCount: count || 0,
        hasMore: data && data.length === pageSize,
        page,
        pageSize
      };
    } catch (error) {
      console.error('❌ Error fetching opportunities:', error);
      throw error;
    }
  }, [user]);

  // 🚀 OPTIMIZED: Get opportunities count only (for dashboards/stats)
  const getOpportunitiesCount = useCallback(async (filters: OpportunityFilters = {}) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      let query = supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Apply same filters as main query
      if (filters.stage) {
        query = query.eq('status', filters.stage);
      }

      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters.searchTerm && filters.searchTerm.trim()) {
        query = query.or(`opportunity.ilike.%${filters.searchTerm}%,company_name.ilike.%${filters.searchTerm}%,owner.ilike.%${filters.searchTerm}%`);
      }

      const { count, error } = await query;

      if (error) {
        console.error('❌ Error fetching opportunities count:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('❌ Error fetching opportunities count:', error);
      throw error;
    }
  }, [user]);

  // Update opportunity
  const updateOpportunity = useCallback(async (
    opportunityId: string,
    updates: Partial<any>
  ) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Transform updates to match database schema - map camelCase to snake_case
      const dbUpdates: any = {};
      
      // Field mapping from camelCase (grid) to snake_case (database)
      const fieldMapping: { [key: string]: string } = {
        'closeDate': 'close_date',
        'companyName': 'company_name',
        'company': 'company_name', // Grid uses 'company', DB uses 'company_name'
        'companyLinkedin': 'company_linkedin',
        'lastContacted': 'last_contacted',
        'nextMeeting': 'next_meeting',
        'leadSource': 'lead_source',
        'stage': 'status', // Kanban uses 'stage', DB uses 'status'
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        // Add reverse mapping for data that comes from DB in snake_case
        'close_date': 'close_date',
        'company_name': 'company_name', 
        'company_linkedin': 'company_linkedin',
        'last_contacted': 'last_contacted',
        'next_meeting': 'next_meeting',
        'lead_source': 'lead_source',
        'created_at': 'created_at',
        'updated_at': 'updated_at'
      };
      
      // Apply field mappings and copy values
      for (const [key, value] of Object.entries(updates)) {
        const dbFieldName = fieldMapping[key] || key; // Use mapped name or original if no mapping
        
        // Skip readonly fields that shouldn't be updated
        if (['created_at', 'updated_at', 'id'].includes(dbFieldName)) {
          continue;
        }
        
        dbUpdates[dbFieldName] = value;
      }
      
      // Handle revenue formatting
      if (dbUpdates.revenue && typeof dbUpdates.revenue === 'number') {
        dbUpdates.revenue_display = `$${dbUpdates.revenue.toLocaleString()}`;
      }

      // Handle date formatting for all date fields
      const dateFields = ['close_date', 'last_contacted', 'next_meeting'];
      dateFields.forEach(field => {
        const dateValue = dbUpdates[field];
        if (dateValue) {
          let formattedDate: string;
          
          if (dateValue instanceof Date) {
            formattedDate = dateValue.toISOString().split('T')[0];
          } else if (typeof dateValue === 'string') {
            // Handle ISO string dates from grid editing
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              formattedDate = date.toISOString().split('T')[0];
            } else {
              throw new Error(`Invalid date format for ${field}: ${dateValue}`);
            }
          } else {
            throw new Error(`Unsupported date type for ${field}: ${typeof dateValue}`);
          }
          
          dbUpdates[field] = formattedDate;
        }
      });

      const { data, error } = await supabase
        .from('opportunities')
        .update(dbUpdates)
        .eq('id', opportunityId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating opportunity:', error);
        throw error;
      }

      return { success: true, opportunity: data };
    } catch (error) {
      console.error('❌ Error updating opportunity:', error);
      throw error;
    }
  }, [user]);

  // Delete opportunity
  const deleteOpportunity = useCallback(async (opportunityId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', opportunityId)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error deleting opportunity:', error);
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting opportunity:', error);
      throw error;
    }
  }, [user]);

  return {
    convertContactToOpportunity,
    bulkConvertContactsToOpportunities,
    getOpportunities,
    getOpportunitiesCount,
    updateOpportunity,
    deleteOpportunity
  };
} 