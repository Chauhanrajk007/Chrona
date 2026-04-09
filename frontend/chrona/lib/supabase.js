import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getCurrentUserId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('chrona_user_id');
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('chrona_token');
}
