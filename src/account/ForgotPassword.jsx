import { useState } from 'react'
import { useAuth } from './useAuth'

export default function ForgotPassword() {
    const { resetPassword } = useAuth()

    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            await resetPassword(email)

            setMessage(
                'Password reset email sent. Check your inbox.'
            )

            setError('')
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div>
            <h2>Forgot Password</h2>

            <form onSubmit={handleSubmit}>
                <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) =>
                    setEmail(e.target.value)
                }
                />

                <button type="submit">
                    Send Reset Link
                </button>
            </form>

            {message && <p>{message}</p>}
            {error && <p>{error}</p>}
        </div>
    )
}
import { useState } from 'react'
import { useAuth } from './useAuth'

export default function ForgotPassword() {
    const { resetPassword } = useAuth()

    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            await resetPassword(email)

            setMessage(
                'Password reset email sent. Check your inbox.'
            )

            setError('')
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div>
            <h2>Forgot Password</h2>

            <form onSubmit={handleSubmit}>
                <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) =>
                    setEmail(e.target.value)
                }
                />

                <button type="submit">
                    Send Reset Link
                </button>
            </form>

            {message && <p>{message}</p>}
            {error && <p>{error}</p>}
        </div>
    )
}