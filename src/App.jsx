import './App.css'
import { useState } from 'react'
import { useAuth } from './account/useAuth'
import { CreateAccount } from './account/CreateAccount'
import ForgotPassword from './account/ForgotPassword'
import ResetPassword from './account/ResetPassword'
import { Login } from './account/Login'
import { Quiz } from './quiz/Quiz'

function App() {
  const { user, logout, loading, savePreferences } = useAuth()
  const [view, setView] = useState(() =>
    window.location.pathname === '/reset-password' ? 'reset' : 'login'
  )

  if (loading) {
    return (
      <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fdf8f3' }}>
        <p style={{ color: '#5b3113', fontFamily: 'Georgia, serif' }}>Loading LooseLeaf...</p>
      </main>
    )
  }

  if (view === 'reset') {
    return (
      <main>
        <ResetPassword />
      </main>
    )
  }

  if (!user) {
    return (
      <main>
        {view === 'create' ? (
          <CreateAccount onNavigateToLogin={() => setView('login')} />
        ) : view === 'forgot' ? (
          <ForgotPassword onNavigateToLogin={() => setView('login')} />
        ) : (
          <Login
            onNavigateToCreateAccount={() => setView('create')}
            onNavigateToForgotPassword={() => setView('forgot')} 
          />
        )}
      </main>
    )
  }

  const handleQuizComplete = async (quizAnswers) => {
    try {
      if (savePreferences) {
        await savePreferences(quizAnswers)
        console.log('Successfully saved reading preferences to Supabase!')
      } else {
        console.log('Quiz completed with answers:', quizAnswers)
      }
      // TODO: Redirect to book recommendations or bookshelf view here
    } catch (err) {
      console.error('Error saving quiz results:', err)
    }
  }

  return (
    <main>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 20px',
          background: '#fdf8f3',
          fontSize: '12px',
          fontWeight: '400',
          color: '#b69b8d'
        }}
      >
        <span>
          Welcome, {user.user_metadata?.full_name?.split(' ')[0] || user.email}!
        </span>

        <button
          type="button"
          onClick={logout}
          style={{
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: '#b69b8d',
            fontSize: '12px',
            fontWeight: '400',
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          Sign out
        </button>
      </div>

      <Quiz
        user={user}
        onSkip={() => console.log('Quiz skipped')}
        onComplete={handleQuizComplete}
      />
    </main>
  )
}

export default App