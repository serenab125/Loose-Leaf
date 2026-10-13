// src/account/CreateAccount.jsx
//
// "Join LooseLeaf" – account registration screen (ATH-01).
// Matches the attached Figma design:
//   - FULL NAME, EMAIL ADDRESS, PASSWORD, CONFIRM PASSWORD
//   - "Create Account" primary button
//
// Validation rules:
//   - name    : required (min 2 chars)
//   - email   : required + valid email format
//   - password: required (min 6 chars)
//   - confirm : required + must match password
//
// On success it calls Firebase Auth + profile save, then notifies the
// parent so the app redirects to the reading-preference quiz (AC 3).

import { useState } from 'react';
import styles from './CreateAccount.module.css';
import { useAuth } from './useAuth';

export function CreateAccount({ onAccountCreated }) {
  const { createAccount, loading, error } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // clear the field's error as the user types
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setErrors({});
    setServerError('');

    try {
      await createAccount(form.email, form.password, form.fullName.trim());
      // Profile is saved by useAuth after a successful sign-up.
      onAccountCreated();
    } catch (err) {
      setServerError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const validate = () => {
    const errs = {};
    const name = form.fullName.trim();
    const email = form.email.trim();
    const pass = form.password;
    const confirm = form.confirmPassword;

    if (!name) {
      errs.fullName = 'Full name is required.';
    } else if (name.length < 2) {
      errs.fullName = 'Full name must be at least 2 characters.';
    }

    if (!email) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!pass) {
      errs.password = 'Password is required.';
    } else if (pass.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (!confirm) {
      errs.confirmPassword = 'Please confirm your password.';
    } else if (pass !== confirm) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    return errs;
  };

  const clearError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.iconCircle}>
        <svg viewBox="0 0 48 48" className={styles.icon} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="6" width="36" height="36" rx="4" />
          <path d="M14 14 h20 v8 h8 v16 h-8 v-16 h-16 v8 z" fill="currentColor" stroke="none" />
        </svg>
      </div>

      <h1 className={styles.headline}>Join LooseLeaf</h1>
      <p className={styles.bodyText}>Find your next chapter — your reading journey starts here.</p>
      <p className={styles.subtext}>We&apos;ll match you with books based on what you love (and what you don&apos;t).</p>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="fullName">Full Name</label>
          <div className={styles.inputWrapper}>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="e.g. Ada Lovelace"
              value={form.fullName}
              onChange={handleChange}
              className={`${styles.input} ${errors.fullName ? styles.error : ''}`}
            />
          </div>
          {errors.fullName && <p className={styles.errorMessage}>{errors.fullName}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="email">Email Address</label>
          <div className={styles.inputWrapper}>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              className={`${styles.input} ${errors.email ? styles.error : ''}`}
            />
          </div>
          {errors.email && <p className={styles.errorMessage}>{errors.email}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="password">Password</label>
          <div className={styles.inputWrapper}>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 6 characters"
              value={form.password}
              onChange={handleChange}
              className={`${styles.input} ${errors.password ? styles.error : ''}`}
            />
            <span
              className={styles.eyeIcon}
              onClick={() => setShowPassword((prev) => !showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 6C7.59 6 6 9.59 6 14c0 4.41 1.59 7.41 4.32 14M2 2l20 20M2 22l20-20" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              )}
            </span>
          </div>
          {errors.password && <p className={styles.errorMessage}>{errors.password}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="confirmPassword">Confirm Password</label>
          <div className={styles.inputWrapper}>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={handleChange}
              className={`${styles.input} ${errors.confirmPassword ? styles.error : ''}`}
            />
            <span
              className={styles.eyeIcon}
              onClick={() => setShowPassword((prev) => !showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 6C7.59 6 6 9.59 6 14c0 4.41 1.59 7.41 4.32 14M2 2l20 20M2 22l20-20" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              )}
            </span>
          </div>
          {errors.confirmPassword && <p className={styles.errorMessage}>{errors.confirmPassword}</p>}
        </div>

        {serverError && <p className={`${styles.errorMessage} ${styles.danger}`} role="alert">{serverError}</p>}

        <div className={styles.buttonRow}>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className={styles.spinner} />
                Creating account&hellip;
              </>
            ) : (
              'Create Account'
            )}
          </button>

          <button type="button" className={styles.secondaryLink} onClick={() => window.location.href = '#/login'}>
            Already have an account? Sign in
          </button>
        </div>
      </form>
    </div>
  );
}
