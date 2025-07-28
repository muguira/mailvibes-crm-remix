import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreateOrganizationResult {
  success: boolean;
  organizationId?: string;
  organizationName?: string;
  message?: string;
  error?: string;
}

export interface CheckUserOrganizationResult {
  needsOrganization: boolean;
  organization?: {
    id: string;
    name: string;
    domain: string;
  };
  message?: string;
}

/**
 * Clean, simple organization service
 * Frontend-controlled workflow without conflicting database triggers
 */

/**
 * Check if user needs to create an organization
 */
export const checkUserNeedsOrganization = async (userId: string): Promise<CheckUserOrganizationResult> => {
  try {
    console.log('🔍 Checking if user needs organization:', userId);

    // Use RPC function to check organization membership (bypasses RLS)
    const { data: membership, error: membershipError } = await supabase
      .rpc('get_user_organization_membership', { user_uuid: userId });

    if (membershipError) {
      console.warn('Warning checking membership:', membershipError);
    }

    if (membership && membership.length > 0) {
      const org = membership[0];
      console.log('✅ User has organization:', org.organization_name);
      
      // Ensure profile points to correct organization
      await supabase
        .from('profiles')
        .update({ current_organization: org.organization_id })
        .eq('id', userId);

      return {
        needsOrganization: false,
        organization: {
          id: org.organization_id,
          name: org.organization_name,
          domain: org.organization_domain
        }
      };
    }

    console.log('📝 User needs to create organization');
    return {
      needsOrganization: true,
      message: 'No organization found'
    };

  } catch (error) {
    console.error('❌ Error checking user organization:', error);
    return {
      needsOrganization: true,
      message: 'Error checking organization status'
    };
  }
};

/**
 * Create a new organization
 */
export const createOrganization = async (
  userId: string,
  name: string,
  domain?: string
): Promise<CreateOrganizationResult> => {
  try {
    console.log('🏢 Creating organization:', { name, domain: domain || 'auto-generated', userId });

    // Simple validation - only organization name is required
    if (!name.trim()) {
      return { success: false, error: 'Organization name is required' };
    }

    // Check if organization name already exists and suggest alternatives
    const { data: existingOrgs, error: checkError } = await supabase
      .from('organizations')
      .select('name')
      .ilike('name', name.trim());

    if (checkError) {
      console.warn('Warning checking organization names:', checkError);
      // Continue anyway - database will handle conflicts
    }

    if (existingOrgs && existingOrgs.length > 0) {
      // Generate suggestions
      const suggestions = [];
      const baseName = name.trim();
      
      for (let i = 2; i <= 5; i++) {
        const suggestion = `${baseName} ${i}`;
        const exists = existingOrgs.some(org => 
          org.name.toLowerCase() === suggestion.toLowerCase()
        );
        if (!exists) {
          suggestions.push(suggestion);
        }
      }
      
      // Add year-based suggestion
      const currentYear = new Date().getFullYear();
      const yearSuggestion = `${baseName} ${currentYear}`;
      if (!existingOrgs.some(org => 
        org.name.toLowerCase() === yearSuggestion.toLowerCase()
      )) {
        suggestions.push(yearSuggestion);
      }

      return {
        success: false,
        error: `Organization name "${baseName}" is already taken. Try: ${suggestions.slice(0, 3).join(', ')}`
      };
    }

    // Use the RPC function to create organization and add admin member atomically
    console.log('🔧 Using RPC function to create organization with admin member');
    
    const { data: result, error: rpcError } = await supabase
      .rpc('create_organization_with_admin', {
        p_org_name: name.trim(),
        p_org_domain: domain?.trim() || null,
        p_user_id: userId
      });

    if (rpcError) {
      console.error('❌ RPC error creating organization:', rpcError);
      return {
        success: false,
        error: `Failed to create organization: ${rpcError.message}`
      };
    }

    if (!result.success) {
      console.error('❌ Organization creation failed:', result.error);
      return {
        success: false,
        error: result.error
      };
    }

    console.log('✅ Organization created successfully via RPC:', result);

    return {
      success: true,
      organizationId: result.organization_id,
      organizationName: name.trim(),
      message: `Organization "${name.trim()}" created successfully!`
    };

  } catch (error) {
    console.error('❌ Error creating organization:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Create an automatic personal workspace for users who skip organization creation
 */
export const createPersonalWorkspace = async (userId: string): Promise<CreateOrganizationResult> => {
  try {
    console.log('🏢 Creating personal workspace for user:', userId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if user already has an organization
    const existingCheck = await checkUserNeedsOrganization(userId);
    if (!existingCheck.needsOrganization) {
      return {
        success: true,
        organizationId: existingCheck.organization!.id,
        organizationName: existingCheck.organization!.name,
        message: `Using existing workspace: "${existingCheck.organization!.name}"`
      };
    }

    // Generate unique workspace name and domain
    const timestamp = Date.now();
    const userEmail = user.email || 'user';
    const emailPrefix = userEmail.split('@')[0];
    
    const workspaceName = `${emailPrefix}'s Workspace`;
    const workspaceDomain = `workspace-${timestamp}.personal`;

    console.log(`📝 Creating personal workspace: ${workspaceName} with domain: ${workspaceDomain}`);

    return await createOrganization(userId, workspaceName, workspaceDomain);

  } catch (error) {
    console.error('❌ Error creating personal workspace:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create personal workspace'
    };
  }
};

/**
 * Load organization data for a user
 */
export const loadUserOrganization = async (userId: string) => {
  try {
    console.log('📋 Loading organization data for user:', userId);

    // Use RPC function to get user's organization membership
    const { data: membershipData, error: orgError } = await supabase
      .rpc('get_user_organization_membership', { user_uuid: userId });

    if (orgError) {
      throw orgError;
    }

    if (!membershipData || membershipData.length === 0) {
      // No organization found
      return { organization: null, members: [], invitations: [] };
    }

    const membership = membershipData[0];
    
    // Get full organization details
    const { data: orgDetails, error: orgDetailsError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', membership.organization_id)
      .single();

    if (orgDetailsError) {
      throw orgDetailsError;
    }

    // Use RPC function to get organization members (bypasses RLS)
    const { data: membersData, error: membersError } = await supabase
      .rpc('get_organization_members', { org_id: membership.organization_id });

    if (membersError) {
      console.warn('Warning loading members:', membersError);
    }

    // Process members with user data (already included from RPC)
    const members = [];
    if (membersData && membersData.length > 0) {
      for (const member of membersData) {
        // RPC function now includes actual member ID, use it directly
        members.push({
          id: member.id, // Use actual member ID from database
          user_id: member.user_id,
          organization_id: membership.organization_id,
          role: member.role,
          status: member.status,
          invited_by: null, // Not included in RPC response
          joined_at: member.joined_at,
          created_at: member.joined_at, // Use joined_at as fallback
          updated_at: member.joined_at, // Use joined_at as fallback
          profiles: {
            id: member.user_id,
            first_name: member.user_first_name || 'User',
            last_name: member.user_last_name || '',
            email: member.user_email || 'user@example.com',
            avatar_url: member.user_avatar_url || null,
          }
        });
      }
    }

    // Load pending invitations using RPC function (bypasses RLS)
    const { data: invitations, error: invitationsError } = await supabase
      .rpc('get_organization_invitations', { org_id: membership.organization_id });

    if (invitationsError) {
      console.warn('Warning loading invitations:', invitationsError);
    }

    console.log('✅ Organization data loaded successfully');

    return {
      organization: orgDetails,
      members: members || [],
      invitations: invitations || []
    };

  } catch (error) {
    console.error('❌ Error loading organization:', error);
    throw error;
  }
}; 