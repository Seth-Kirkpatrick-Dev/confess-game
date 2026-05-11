import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase] URL:', supabaseUrl);
console.log('[Supabase] Key loaded:', !!supabaseAnonKey, 'starts with eyJ:', supabaseAnonKey?.startsWith('eyJ'));

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] MISSING env vars — check client/.env and restart Vite');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
