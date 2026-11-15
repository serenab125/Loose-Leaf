import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Deliberately OFF. The client keeps the session in memory only, and
    // useAuth owns persistence through the manual `looseleaf_session` store —
    // written on sign-in only when "Remember me" is checked. With the client
    // default (persistSession: true) the browser keeps a
    // sb-<project>-auth-token key and resurrects the session on every reload,
    // which makes the "Remember me" checkbox a no-op.
    persistSession: false,
  },
})