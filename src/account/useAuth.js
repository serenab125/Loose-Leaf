// useAuth.js — single Supabase client, no persistSession toggle
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const SESSION_KEY = 'looseleaf_session';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      // "Remember me" ON: try the manually-stored session first.
      // Single client always uses persistSession: true, so the manual store
      // is the authoritative session source.
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        try {
          const session = JSON.parse(saved);
          if (session.access_token && session.refresh_token) {
            const { data, error: setErr } = await supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            });
            if (setErr) throw setErr;
            if (!cancelled) setUser(data.session?.user ?? null);
            return; // setSession establishes the session
          }
        } catch {
          // Any failure (parse OR setSession) means the saved tokens are
          // unusable — remove them so we don't retry every mount.
          localStorage.removeItem(SESSION_KEY);
        }
      }

      // Default: read from the client's own storage.
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setUser(data.session?.user ?? null);
    };

    restore()
      .catch(() => {
        /* swallow — user stays null, app should route to login */
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setInitializing(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const createAccount = useCallback(
    async (email, password, fullName) => {
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
    },
    [supabase]
  );

  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      setError('');
      try {
        const { data, error: authError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;

        // Single client always uses persistSession: true, so the manual store
        // is always used. "Remember me" OFF is handled by clearing the
        // manual store on logout (see the logout() function).
        if (data.session) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
        }

        // Update state directly — do not rely on the auth event.
        setUser(data.user ?? null);
        setInitializing(false);
        return data;
      } catch (err) {
        setError(err.message || 'Sign-in failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const resetPassword = useCallback(
    async (email) => {
      setLoading(true);
      setError('');
      try {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: new URL(
              '/reset-password',
              window.location.origin
            ).toString(),
          }
        );
        if (authError) throw authError;
      } catch (err) {
        setError(err.message || 'Password reset failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const updatePassword = useCallback(
    async (password, confirmPassword) => {
      setError('');

      if (typeof password !== 'string' || password.length < 6) {
        const validationError = new Error(
          'Password must be at least 6 characters long.'
        );
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
        const { data, error: authError } = await supabase.auth.updateUser({
          password,
        });
        if (authError) throw authError;
        return data;
      } catch (err) {
        setError(err.message || 'Password update failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      setError(err.message || 'Sign-out failed');
    } finally {
      // Always clear the manual store, regardless of the current mode, so a
      // leftover "Remember me" session can't resurrect on the next mount.
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
      setLoading(false);
    }
  }, [supabase]);

  return {
    user,
    createAccount,
    signUp: createAccount,
    login,
    signIn: login,
    logout,
    signOut: logout,
    resetPassword,
    updatePassword,
    loading,
    initializing,
    error,
    clearError: () => setError(''),
  };
}