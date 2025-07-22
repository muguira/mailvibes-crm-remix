// Quick fix to show the invite button
// Since we know andres@mailvibes.io is an admin, we'll hardcode this for now

import React from 'react';

export const ADMIN_EMAILS = ['andres@mailvibes.io'];

export const checkIsAdmin = async () => {
  const { supabase } = await import('@/lib/supabaseClient');
  const { data: { user } } = await supabase.auth.getUser();
  return user && ADMIN_EMAILS.includes(user.email || '');
}; 