import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseFor, signOutEverywhere } from '../supabaseClient';

export function useAuth(persistSession = true) {
  const supabase = useMemo(() => supabaseFor(persistSession), [persistSession]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return;
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
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
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        setUser(data.user);
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
            redirectTo: new URL('/reset-password', window.location.origin).toString(),
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
        const e = new Error('Password must be at least 6 characters long.');
        setError(e.message);
        throw e;
      }
      if (password !== confirmPassword) {
        const e = new Error('Passwords do not match.');
        setError(e.message);
        throw e;
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
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await signOutEverywhere();
    } catch (err) {
      setError(err.message || 'Sign-out failed');
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const savePreferences = useCallback(
    async (preferences) => {
      if (!user) return;
      setLoading(true);
      setError('');
      try {
        const { data, error: dbError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || '',
              reading_preferences: preferences,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        if (dbError) throw dbError;
        return data;
      } catch (err) {
        console.error('Error saving preferences:', err);
        setError(err.message || 'Failed to save reading preferences');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase, user]
  );

  return {
    user,
    createAccount,
    signUp: createAccount,
    login,
    signIn: login,
    logout,
    savePreferences,
    resetPassword,
    updatePassword,
    loading,
    error,
    clearError: () => setError(''),
    supabase,
  };
}