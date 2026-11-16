import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables...');
}

// Persistent client — used when "Remember me" is ON.
// Survives browser restarts via localStorage.
export const supabasePersistent = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Ephemeral client — used when "Remember me" is OFF.
// Session lives for the tab's lifetime via sessionStorage (survives refresh,
// dies on tab close). Uses a different storage key so it never collides with
// the persistent client's session.
export const supabaseEphemeral = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: window.sessionStorage,
    storageKey: 'looseleaf-ephemeral-auth',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Single shared client per mode. This is the crux of the fix: all useAuth()
// callers with the same persistSession value share one client instance, so the
// in-memory session created by signIn is visible everywhere.
export function supabaseFor(persistSession = true) {
  return persistSession ? supabasePersistent : supabaseEphemeral;
}

// Default export used by ResetPassword.jsx and any direct consumers.
export const supabase = supabasePersistent;