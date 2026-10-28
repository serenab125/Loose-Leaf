import { useState } from 'react'
import { useAuth } from './useAuth'

export default function ResetPassword() {
    const { updatePassword, loading } = useAuth()

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        if (password.length < 6) {
            setError(
                'Password must be at least 6 characters long.'
            )
            return
        }

        try {
            await updatePassword(password, confirmPassword)

            setSuccess(
                'Password updated successfully. You can now log in with your new password.'
            )

            setError('')
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div>
            <h2>Create New Password</h2>

            <form onSubmit={handleSubmit}>
                <input
                type="password"
                placeholder="New Password"
                value={password}
                onChange = {(e) =>
                    setPassword(e.target.value)
                }
                />
                <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange = {(e) =>
                    setConfirmPassword(e.target.value)
                }
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Updating Password...' : 'Update Password'}
                    </button>
            </form>

            {error && <p>{error}</p>}
            {success && <p>{success}</p>}
        </div>
    )
}
import { useState } from 'react'
import { useAuth } from './useAuth'

export default function ResetPassword() {
    const { updatePassword, loading } = useAuth()

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        if (password.length < 6) {
            setError(
                'Password must be at least 6 characters long.'
            )
            return
        }

        try {
            await updatePassword(password, confirmPassword)

            setSuccess(
                'Password updated successfully. You can now log in with your new password.'
            )

            setError('')
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div>
            <h2>Create New Password</h2>

            <form onSubmit={handleSubmit}>
                <input
                type="password"
                placeholder="New Password"
                value={password}
                onChange = {(e) =>
                    setPassword(e.target.value)
                }
                />
                <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange = {(e) =>
                    setConfirmPassword(e.target.value)
                }
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Updating Password...' : 'Update Password'}
                    </button>
            </form>

            {error && <p>{error}</p>}
            {success && <p>{success}</p>}
        </div>
    )
}