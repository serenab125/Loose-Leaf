import { useState, useEffect } from 'react';

import { supabaseFor } from '../supabaseClient';

export function useAuth(persistSession = true, restoreSession = true) {
  // Use a separate supabase client with the correct persistSession setting.
  // This ensures "Remember me" off correctly clears sessions across tab closes.
  const supabase = supabaseFor(persistSession);

  // Export the supabase client so it can be shared with other modules
  const authClient = supabase;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // NOTE: hasSavedSession is checked inside the effect below so it re-reads
  // the session on every run; this avoids stale-closure issues when the
  // persistSession flag flips during login/logout.

  // Subscribe to auth state changes. When "Remember me" is OFF and there is
  // no saved session, sign out to clear any pending session. If there IS a
  // saved session, keep it so a closed tab returns the user to home.
  useEffect(() => {
    // Load initial session asynchronously to avoid blocking the render.
    let active = true;
    let subscription = null;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;

      // Only sign out if there's a stale persisted session that shouldn't be there.
      // (When persistSession=false, the session is memory-only and should be cleared.)
      if (!persistSession && session) {
        await supabase.auth.signOut().catch(() => {});
      }
    })();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        setUser(restoreSession ? session?.user ?? null : null);
        setLoading(false);
        return;
      }
      if (session?.user) {
        setUser(restoreSession ? session.user : null);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    subscription = data.subscription;

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [persistSession, supabase.auth, restoreSession]);

  const createAccount = async (email, password, fullName) => {
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (authError) throw authError;
      return data;
    } catch (err) {
      setError(err.message || 'Sign-up failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;

      // The supabase client (persistSession=true) already persists the session
      // to localStorage; no manual localStorage.setItem needed here.
      // The session is stored in sessionStorage (memory) when persistSession
      // is false, which is automatically cleared when the tab closes.
      return data;
    } catch (err) {
      setError(err.message || 'Sign-in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL('/reset-password', window.location.origin).toString(),
      });

      if (authError) throw authError;
    } catch (err) {
      setError(err.message || 'Password reset failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (password, confirmPassword) => {
    setError('');

    if (typeof password !== 'string' || password.length < 6) {
      const validationError = new Error('Password must be at least 6 characters long.');
      setError(validationError.message);
      throw validationError;
    }

    if (password !== confirmPassword) {
      const validationError = new Error('Passwords do not match.');
      setError(validationError.message);
      throw validationError;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.updateUser({ password });

      if (authError) throw authError;
      return data;
    } catch (err) {
      setError(err.message || 'Password update failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError('');
    try {
      await supabase.auth.signOut();
      // The supabase client (persistSession=true) handles session cleanup;
      // no manual localStorage.removeItem needed here.
    } catch (err) {
      setError(err.message || 'Sign-out failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    createAccount,
    login,
    signIn: login,
    logout,
    resetPassword,
    updatePassword,
    loading,
    error,
    clearError: () => setError(''),
    supabase: authClient,  // Export the supabase client for use by other modules
  };
}
