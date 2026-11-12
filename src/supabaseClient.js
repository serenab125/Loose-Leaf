import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables...');
}

// One persistent client (Remember me ON), one ephemeral (OFF).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, storage: localStorage, autoRefreshToken: true },
});
