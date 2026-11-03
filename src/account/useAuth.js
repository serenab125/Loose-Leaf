import { useState, useEffect } from 'react';

import { supabaseFor } from '../supabaseClient';

export function useAuth(persistSession = true, restoreSession = true) {
  // Use a separate supabase client with the correct persistSession setting.
  // This ensures "Remember me" off correctly clears sessions across tab closes.
  const supabase = supabaseFor(persistSession);

  // NOTE: we deliberately do NOT restore the session from localStorage here.
  // The login form must always be shown first; the session is restored only
  // after the user has authenticated (via the onAuthStateChange listener
  // below). This prevents "instant login" when the page is refreshed.
  // The loading state starts as true so the app shows a loading screen until
  // the user has either authenticated or the session has been established.
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Determine if there is a saved session in localStorage (used to decide
  // whether to clear the session when "Remember me" is OFF).
  const hasSavedSession = localStorage.getItem('looseleaf_session') !== null;

  // Subscribe to auth state changes. When "Remember me" is OFF and there is
  // no saved session, sign out to clear any pending session from storage.
  // If there IS a saved session, keep it so a closed tab returns the user
  // to the home screen.
  useEffect(() => {
    if (!persistSession && !hasSavedSession) {
      supabase.auth.signOut().catch(() => {});
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // For INITIAL_SESSION events, do NOT restore the session automatically.
      // The user must explicitly authenticate via the login form first.
      if (event === 'INITIAL_SESSION') {
        setUser(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        if (restoreSession) {
          setUser(session.user ?? null);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [persistSession, supabase.auth, restoreSession, hasSavedSession]);

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

      // Persist the session to localStorage only if "Remember me" is ON.
      if (persistSession) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          const sessionJson = JSON.stringify(sessionData.session);
          localStorage.setItem('looseleaf_session', sessionJson);
        }
      }

      // Refresh the session so the auth state is fully committed in memory.
      const { error: refreshError } = await supabase.auth.getSession();
      if (refreshError) {
        console.warn('Failed to refresh session after sign-in:', refreshError.message);
      }

      // "Remember me" off: the session is stored in sessionStorage (memory
      // storage) and is automatically cleared when the tab closes.
      // No signOut() needed here - the session persists in memory only.
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
      // Clear the manually-stored session when "Remember me" is ON.
      if (persistSession) {
        localStorage.removeItem('looseleaf_session');
      }
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
  };
}
