// src/helpers/updateContact.ts

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';

type ContactUpdate = Partial<Database['public']['Tables']['contacts']['Row']> &
  Pick<Database['public']['Tables']['contacts']['Row'], 'id'>;

// List of columns that are directly in the contacts table
const DIRECT_COLUMNS = ['id', 'name', 'email', 'phone', 'company', 'status', 'user_id', 'created_at', 'updated_at'];

export async function updateContact({ id, ...patch }: ContactUpdate) {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated - cannot update contact');
    }
    
    // First check if this is a UI ID (lead-XXX) that needs to be mapped to a DB ID
    const idMapping = JSON.parse(localStorage.getItem('id-mapping') || '{}');
    
    // Determine the correct database ID
    const dbId = idMapping[id] || id;
    
    // First retrieve the existing record to ensure we have required fields
    const { data: existingData, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', dbId)
      .maybeSingle();
      
    if (fetchError) {
      logger.error('Failed to fetch existing contact:', fetchError);
      return { error: fetchError };
    }
    
    // Separate direct columns from data fields
    const directFields: Record<string, any> = {};
    const dataFields: Record<string, any> = {};
    
    // Process each field in the patch
    Object.entries(patch).forEach(([key, value]) => {
      if (DIRECT_COLUMNS.includes(key)) {
        directFields[key] = value;
      } else {
        dataFields[key] = value;
      }
    });
    
    // Create the complete record for update
    const updatedRecord: Record<string, any> = {
      ...directFields,
      user_id: user.id, // Always include user_id to satisfy RLS policy
    };
    
    // Add the name field if it doesn't exist to avoid non-null constraint errors
    if (!updatedRecord.name && (!existingData || !existingData.name)) {
      updatedRecord.name = 'Untitled Contact'; 
    }
    
    // If we have data fields, merge them with existing data
    if (Object.keys(dataFields).length > 0) {
      updatedRecord.data = {
        ...(existingData?.data || {}),
        ...dataFields
      };
    }
    
    // Update the database with our combined record
    const { data, error } = await supabase
      .from('contacts')
      .update(updatedRecord)
      .eq('id', dbId)
      .select();
      
    // If record doesn't exist yet, insert it instead
    if (error && error.code === '22P02') {
      const { data: insertData, error: insertError } = await supabase
        .from('contacts')
        .insert({
          id: dbId,
          ...updatedRecord
        })
        .select();
        
      if (insertError) {
        logger.error('Failed to insert contact:', insertError);
        return { error: insertError };
      }
      
      return { data: insertData };
    }
    
    if (error) {
      logger.error('Failed to update contact:', error);
      return { error };
    }
    
    // After updating the database, also update any mock data
    // This ensures that the stream view shows the same data as the grid view
    try {
      // Use global mockContactsById if it exists
      const mockContactsById = (window as any).mockContactsById || {};
      
      // If this contact exists in the mock data, update it
      if (mockContactsById[id]) {
        // Create a properly formatted mock contact from our data
        mockContactsById[id] = {
          ...mockContactsById[id],
          ...patch,
          // Ensure these fields are always present with correct names
          id: id,
          name: updatedRecord.name || 'Untitled Contact',
          email: updatedRecord.email || '',
          phone: updatedRecord.phone || '',
          company: updatedRecord.company || '',
          status: updatedRecord.status || 'New'
        };
      }
    } catch (mockError) {
      logger.warn('Could not sync with mock data:', mockError);
    }
    
    return { data };
  } catch (e) {
    logger.error('Error in updateContact:', e);
    return { error: e };
  }
}