
import { useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../supabaseClient';
import styles from './Login.module.css';

export default function ResetPassword() {
    const { updatePassword, loading } = useAuth();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isReturning, setIsReturning] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        try {
            await updatePassword(password, confirmPassword);

            setSuccess(
                'Password updated successfully! You can now sign in with your new password.'
            );

            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(
                err.message || 'Unable to update password. Please try again.'
            );
        }
    };

    const handleReturnToLogin = async () => {
        setIsReturning(true);
        setError('');

        try {
            const { error: signOutError } = await supabase.auth.signOut();

            if (signOutError) throw signOutError;

            window.location.assign('/');
        } catch (err) {
            setError(
                err.message || 'Unable to return to sign in. Please try again.'
            );
            setIsReturning(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.heading}>LooseLeaf</h1>
                <p className={styles.tagline}>
                    Find your next chapter.
                </p>

                {success ? (
                    <div className={styles.form}>
                        <p
                            role="status"
                            style={{
                                textAlign: 'center',
                                color: '#5b3113',
                                lineHeight: '1.6'
                            }}
                        >
                            {success}
                        </p>

                        {error && (
                            <p className={styles.error} role="alert">
                                {error}
                            </p>
                        )}

                        <button
                            type="button"
                            className={styles.buttonPrimary}
                            onClick={handleReturnToLogin}
                            disabled={isReturning}
                        >
                            {isReturning
                                ? 'Returning...'
                                : 'Return to Sign In'}
                        </button>
                    </div>
                ) : (
                    <>
                        <form
                            className={styles.form}
                            onSubmit={handleSubmit}
                        >
                            <div className={styles.fieldGroup}>
                                <label
                                    className={styles.label}
                                    htmlFor="new-password"
                                >
                                    NEW PASSWORD
                                </label>

                                <input
                                    id="new-password"
                                    className={styles.input}
                                    type="password"
                                    placeholder="Enter new password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className={styles.fieldGroup}>
                                <label
                                    className={styles.label}
                                    htmlFor="confirm-new-password"
                                >
                                    CONFIRM NEW PASSWORD
                                </label>

                                <input
                                    id="confirm-new-password"
                                    className={styles.input}
                                    type="password"
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    required
                                />
                            </div>

                            {error && (
                                <p
                                    className={styles.error}
                                    role="alert"
                                >
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                className={styles.buttonPrimary}
                                disabled={loading}
                            >
                                {loading
                                    ? 'Updating Password...'
                                    : 'Update Password'}
                            </button>
                        </form>

                        <button
                            type="button"
                            className={styles.forgotPassword}
                            onClick={handleReturnToLogin}
                            disabled={isReturning}
                        >
                            Back to Sign In
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
