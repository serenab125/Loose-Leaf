// src/account/useAuth.js
//
// Supabase Authentication (email/password) + profile persistence.
// Replaces the former Firebase implementation while keeping the same hook
// contract: returns { user, loading, error, createAccount, signIn, logout,
// isAuthenticated }.
//
// Usage:
//   const { user, error, createAccount, signIn, logout } = useAuth();
//
//   // Create an account (also saves the profile to the `profiles` table).
//   await createAccount(email, password, fullName);
//
//   // Sign in an existing account.
//   await signIn(email, password);
//
//   // Sign out.
//   await logout();

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from './supabase-config.js';

let supabase = null;
let initializedRef = false;
let authChannel = null;

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize the Supabase client once and track auth state.
  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey || initializedRef) return;
    initializedRef = true;

    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true },
    });

    // Hydrate any existing session and start listening for changes.
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        // No existing session — fall through to the default state below.
      });

    authChannel = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      if (authChannel) {
        authChannel.unsubscribe();
        authChannel = null;
      }
    };
  }, []);

  const createAccount = useCallback(
    async (email, password, fullName) => {
      if (!supabase) {
        throw new Error(
          'Supabase is not configured yet. Create src/account/supabase-config.js (see the template file).'
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { fullName: fullName || email.split('@')[0] } },
      });

      if (error) throw error;
      if (!data.user) {
        throw new Error(
          data?.session
            ? 'Account created but no user object returned. Check your email/password settings.'
            : 'Account creation returned no user. Please try again.'
        );
      }

      // Persist the profile to Supabase (RLS `profiles` table).
      const displayName = fullName || email.split('@')[0];
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          full_name: displayName,
          email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (profileError) throw profileError;
      return data.user;
    },
    [supabase]
  );

  const signIn = useCallback(
    async (email, password) => {
      if (!supabase) {
        throw new Error(
          'Supabase is not configured yet. Create src/account/supabase-config.js (see the template file).'
        );
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data.user ?? null;
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [supabase]);

  return { user, loading, error, createAccount, signIn, logout, isAuthenticated: !!user };
}
