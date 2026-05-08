import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const metaEnv = (import.meta as any).env;
  const supabaseUrl = metaEnv.VITE_SUPABASE_URL;
  const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
  }

  // Ensure URL is just the base URL
  const cleanUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
  const finalUrl = cleanUrl.replace('/rest/v1', '');

  supabaseInstance = createClient(finalUrl, supabaseAnonKey);
  return supabaseInstance;
};
