import { useState } from 'react';
import { useAuth } from './useAuth';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { updatePassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password, confirmPassword);
      setMessage('Your password has been updated successfully! You can now log in.');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ padding: '40px 20px', maxWidth: '393px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ fontFamily: 'Georgia, serif', color: '#5b3113', textAlign: 'center' }}>Reset Your Password</h2>
      <p style={{ color: '#8c7365', textAlign: 'center', fontSize: '14px', marginBottom: '24px' }}>
        Enter a new password for your LooseLeaf account.
      </p>

      {message && <p style={{ color: '#2e7d32', textAlign: 'center', fontSize: '14px' }}>{message}</p>}
      {error && <p style={{ color: '#d32f2f', textAlign: 'center', fontSize: '14px' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', color: '#5b3113', marginBottom: '6px' }}>New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ebe5d5', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', color: '#5b3113', marginBottom: '6px' }}>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ebe5d5', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '14px',
            borderRadius: '16px',
            backgroundColor: '#5b3113',
            color: '#fff',
            border: 'none',
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: '8px'
          }}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
