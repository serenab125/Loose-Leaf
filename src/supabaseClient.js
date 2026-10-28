import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables...');
}

/**
 * Single auth client: memory-only storage (persistSession: false).
 *
 * "Remember me" is handled at the application level:
 * - When ON: the session is manually saved to localStorage on sign-in and
 *   restored from localStorage on app load.
 * - When OFF: the session lives only in memory and is cleared when the tab
 *   closes (no localStorage writes).
 *
 * This guarantees exactly ONE GoTrueClient instance in the browser context,
 * avoiding the "multiple instances detected" warning and its undefined
 * behavior (crossed session writes/reads between two client instances).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
