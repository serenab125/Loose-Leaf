import { useState, useEffect } from 'react';

import { supabase } from '../supabaseClient';

export function useAuth(persistSession = true) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  useEffect(() => {
    // If "Remember me" is ON, try to restore the session from localStorage
    // (a manually-persisted copy stored on sign-in).
    if (persistSession) {
      const saved = localStorage.getItem('looseleaf_session');
      if (saved) {
        try {
          const session = JSON.parse(saved);
          // Manually set the session so the auth state is restored immediately.
          // Note: supabase.auth.setSession requires the full session object.
          if (session.access_token && session.refresh_token) {
            supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            }).then(({ data }) => {
              setUser(data.session?.user ?? null);
              setLoading(false);
            }).catch(() => {
              setLoading(false);
            });
            return; // skip the default getSession() below
          }
        } catch {
          localStorage.removeItem('looseleaf_session');
        }
      }
    }

    // Default: read the session from Supabase's memory storage.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [persistSession]);

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
      return data;
    } catch (err) {
      setError(err.message || 'Sign-in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

const resetPassword = async (email) => {
  setLoading(true)
  setError('')

  try {
    const { error: authError } =
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL('/reset-password', window.location.origin).toString(),
      })

    if (authError) throw authError
  } catch (err) {
    setError(err.message || 'Password reset failed')
    throw err
  } finally {
    setLoading(false)
  }
}

const updatePassword = async (password, confirmPassword) => {
  setError('')

  if (typeof password !== 'string' || password.length < 6) {
    const validationError = new Error(
      'Password must be at least 6 characters long.'
    )
    setError(validationError.message)
    throw validationError
  }

  if (password !== confirmPassword) {
    const validationError = new Error('Passwords do not match.')
    setError(validationError.message)
    throw validationError
  }

  setLoading(true)
  try {
    const { data, error: authError } =
      await supabase.auth.updateUser({ password })

    if (authError) throw authError
    return data
  } catch (err) {
    setError(err.message || 'Password update failed')
    throw err
  } finally {
    setLoading(false)
  }
}

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