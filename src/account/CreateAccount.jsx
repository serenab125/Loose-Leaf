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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError('');
    try {
      await createAccount(email.trim(), password, fullName.trim());
    } catch (err) {
      setFormError(err.message || 'Failed to create account. Please try again.');
    }
  };

  const validate = () => {
    if (!fullName.trim()) return 'Full Name is required.';
    if (!email.trim()) return 'Email Address is required.';
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Join LooseLeaf</h1>
        <p className={styles.tagline}>Build your personal shelf.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="fullName">
              FULL NAME
            </label>
            <input
              id="fullName"
              className={styles.input}
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

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

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="confirmPassword">
              CONFIRM PASSWORD
            </label>
            <input
              id="confirmPassword"
              className={styles.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
            />
          </div>

          {formError && <p className={styles.error}>{formError}</p>}

          <button
            type="submit"
            className={styles.buttonPrimary}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => onNavigateToLogin()}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
