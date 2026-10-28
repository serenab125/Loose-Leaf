import { useState } from 'react'
import { useAuth } from './useAuth'
import styles from './Login.module.css'

export default function ForgotPassword({ onNavigateToLogin }) {
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      await resetPassword(email.trim())
      setMessage('Password reset email sent. Check your inbox.')
    } catch (err) {
      setError(err.message || 'Failed to send reset email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Reset Password</h1>
        <p className={styles.tagline}>Enter your email to receive a password reset link.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="reset-email">
              EMAIL ADDRESS
            </label>
            <input
              id="reset-email"
              className={styles.input}
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {message && <p style={{ color: '#2e7d32', fontSize: '14px', margin: '8px 0' }}>{message}</p>}
          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.buttonPrimary} disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={onNavigateToLogin}
          style={{ marginTop: '16px' }}
        >
          Back to Login
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react';
import { useAuth } from './useAuth';
import styles from './Login.module.css';

export default function ForgotPassword({ onNavigateToLogin }) {
    const { resetPassword } = useAuth();

    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsSending(true);

        try {
            await resetPassword(email.trim());
            setMessage('Password reset email sent. Check your inbox.');
        } catch (err) {
            setError(err.message || 'Unable to send reset link. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.heading}>LooseLeaf</h1>
                <p className={styles.tagline}>Find your next chapter.</p>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="reset-email">
                            EMAIL ADDRESS
                        </label>
                        <input
                            id="reset-email"
                            className={styles.input}
                            type="email"
                            required
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {message && <p role="status">{message}</p>}
                    {error && <p className={styles.error} role="alert">{error}</p>}

                    <button
                        type="submit"
                        className={styles.buttonPrimary}
                        disabled={isSending}
                    >
                        {isSending ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <button
                    type="button"
                    className={styles.forgotPassword}
                    onClick={() => onNavigateToLogin?.()}
                >
                    Back to Sign In
                </button>
            </div>
        </div>
    );
}
