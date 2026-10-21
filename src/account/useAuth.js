import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

    try{
      const {error: authError} =
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:5173/reset-password',
      })

      if (authError) throw authError
    } catch (err) {
      setError(err.message || 'Password reset failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (password) => {
    setLoading(true)
    setError('')

    try {
      const {error: authError}  =
      await supabase.auth.updateUser({ 
        password,
      })

      if (authError) throw authError
    } catch (err) {
      setError(err.message || "Password update failed")
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true);
    setError('');
    try {
      await supabase.auth.signOut();
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
    const { data, error: dbError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        reading_preferences: preferences,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

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