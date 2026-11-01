import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables...');
}

/**
 * Returns a Supabase auth client configured with the requested session persistence.
 *
 * `persistSession = true`  -> the session is saved to localStorage, so a signed-in user
 *                           stays signed in after the browser is closed and reopened.
 *                           ("Remember me" on)
 * `persistSession = false` -> the session lives only in memory and is cleared when the
 *                           tab closes, so the user signs out again on their next visit.
 *                           ("Remember me" off)
 */
const clients = new Map();

export function supabaseFor(persistSession = true) {
  if (!clients.has(persistSession)) {
    clients.set(
      persistSession,
      createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession },
      })
    );
  }
  return clients.get(persistSession);
}

// Default client: "Remember me" is on (the session survives browser restarts).
export const supabase = supabaseFor(true);