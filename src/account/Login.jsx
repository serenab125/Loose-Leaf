import { useState } from 'react';
import styles from './Login.module.css';
import { useAuth } from './useAuth';

export function Login({ onNavigateToCreateAccount, onNavigateToForgotPassword }) {
  const { signIn, loading, error, clearError } = useAuth();

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
      await signIn(email.trim(), password);
    } catch (err) {
      setFormError(err.message || 'Failed to sign in. Please try again.');
    }
  };

  const validate = () => {
    if (!email.trim()) return 'Email Address is required.';
    if (!password) return 'Password is required.';
    return '';
  };

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

          {formError && <p className={styles.error}>{formError}</p>}

          <button type="submit" className={styles.buttonPrimary} disabled={loading}>
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
