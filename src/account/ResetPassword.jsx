import { useState } from 'react'
import { useAuth } from './useAuth'
import styles from './Login.module.css'

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await updatePassword(password, confirmPassword)
      setMessage('Your password has been reset successfully!')
    } catch (err) {
      setError(err.message || 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Set New Password</h1>
        <p className={styles.tagline}>Enter your new password below.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="new-password">
              NEW PASSWORD
            </label>
            <input
              id="new-password"
              className={styles.input}
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="confirm-password">
              CONFIRM PASSWORD
            </label>
            <input
              id="confirm-password"
              className={styles.input}
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {message && <p style={{ color: '#2e7d32', fontSize: '14px', margin: '8px 0' }}>{message}</p>}
          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.buttonPrimary} disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}