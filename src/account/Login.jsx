// Login.jsx
import { useState, useEffect } from 'react';
import styles from './Login.module.css';
import { useAuth } from './useAuth';

export function Login({
  onNavigateToCreateAccount,
  onNavigateToForgotPassword,
  rememberMe,
  setRememberMe,
  onSuccess,
  signIn,
  loading,
}) {
  const { signIn: signInAuth, loading: authLoading, initializing } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError('');
    try {
      await signInAuth(email.trim(), password);
      // "Remember me" OFF: clear the manual store so the session doesn't
      // persist across page reloads (single client uses persistSession: true).
      if (!rememberMe) {
        localStorage.removeItem('looseleaf_session');
      }
    } catch (err) {
      setFormError(err.message || 'Failed to sign in. Please try again.');
    }
  };

  const validate = () => {
    if (!email.trim()) return 'Email Address is required.';
    if (!password) return 'Password is required.';
    return '';
  };

  const busy = authLoading || initializing;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.heading}>LooseLeaf</h1>
        <p className={styles.tagline}>Find your next chapter.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="email">
              EMAIL ADDRESS
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="password">
              PASSWORD
            </label>
            <input
              id="password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <span>Remember me</span>
            </label>
          </div>

          {formError && <p className={styles.error}>{formError}</p>}

          <button
            type="submit"
            className={styles.buttonPrimary}
            disabled={busy}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>or join the club</span>
        </div>

        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => onNavigateToCreateAccount()}
        >
          Create Account
        </button>
        <button
          type="button"
          className={styles.forgotPassword}
          onClick={() => onNavigateToForgotPassword()}
        >
          Forgot Password?
        </button>
      </div>
    </div>
  );
}