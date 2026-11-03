import { useState, useEffect, useMemo } from 'react';
import { supabaseFor } from '../supabaseClient';

export function useAuth(persistSession = true) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const supabaseClient = useMemo(() => supabaseFor(persistSession), [persistSession]);

  useEffect(() => {
    if (persistSession) {
      const saved = localStorage.getItem('looseleaf_session');
      if (saved) {
        try {
          const session = JSON.parse(saved);
          if (session.access_token && session.refresh_token) {
            supabaseClient.auth
              .setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              })
              .then(({ data }) => {
                setUser(data.session?.user ?? null);
                setLoading(false);
              })
              .catch(() => {
                setLoading(false);
              });
            return;
          }
        } catch {
          localStorage.removeItem('looseleaf_session');
        }
      }
    }

    supabaseClient.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabaseClient, persistSession]);

  const createAccount = async (email, password, fullName) => {
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabaseClient.auth.signUp({
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
      const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;

      if (persistSession) {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        if (sessionData.session) {
          const sessionJson = JSON.stringify(sessionData.session);
          localStorage.setItem('looseleaf_session', sessionJson);
        }
      }

      const { error: refreshError } = await supabaseClient.auth.getSession();
      if (refreshError) {
        console.warn('Failed to refresh session after sign-in:', refreshError.message);
      }
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
      const { error: authError } = await supabaseClient.auth.resetPasswordForEmail(email, {
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
      const { data, error: authError } = await supabaseClient.auth.updateUser({ password });

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
      await supabaseClient.auth.signOut();
      if (persistSession) {
        localStorage.removeItem('looseleaf_session');
      }
    } catch (err) {
      setError(err.message || 'Sign-out failed');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (preferences) => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      const { data, error: dbError } = await supabaseClient
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
  };

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
  };
}