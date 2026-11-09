import { useState } from 'react';
import styles from './CreateAccount.module.css';
import { useAuth } from './useAuth';

export function CreateAccount({ onNavigateToLogin }) {
  const { createAccount, loading, error, clearError } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');

  const validate = () => {
    if (!fullName.trim()) return 'Full Name is required.';
    if (!email.trim()) return 'Email Address is required.';
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError('');
    try {
      const result = await createAccount(email.trim(), password, fullName.trim());

      if (result?.user && !result?.session) {
        setVerificationEmail(email.trim());
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create account. Please try again.');
    }
  };

  if (verificationEmail) {
    return (
      <div className={styles.container}>
        <div className={styles.card} style={{ textAlign: 'center' }}>
          <h1 className={styles.heading}>Check your email!</h1>

          <p className={styles.tagline}>
            We sent a verification link to {verificationEmail}.
            Please confirm your email address before signing in.
          </p>

          <button
            type="button"
            className={styles.button}
            onClick={onNavigateToLogin}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Join LooseLeaf</h1>
        <p className={styles.tagline}>Build your personal shelf.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              className={styles.input}
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Sarah Johnson"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="email">Email Address</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              className={styles.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
            />
          </div>

          {formError && <p className={styles.error}>{formError}</p>}

          <button
            type="submit"
            className={styles.button}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>



        {onNavigateToLogin && (
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={onNavigateToLogin}
          >
            <span>Already have an account? </span>
            <strong>Sign in</strong>
          </button>
        )}
      </div>
    </div>
  );
}
