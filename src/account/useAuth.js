import { useState, useEffect } from 'react';
import { supabase } from './supabase-config';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  const createAccount = async (email, password, fullName) => {
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (authError) throw authError;
      if (data.user) {
        await saveProfile(fullName, email, data.user.id);
      }
      return data;
    } catch (err) {
      setError(err.message || 'Sign-up failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (fullName, email, userId) => {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName,
        email,
        updated_at: new Date().toISOString(),
      });
    if (profileError) throw profileError;
  };

  const signIn = async (email, password) => {
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

  const logout = async () => {
    setLoading(true);
    setError('');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      setError(err.message || 'Sign-out failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    createAccount,
    signIn,
    logout,
    loading,
    error,
    clearError: () => setError(''),
  };
}
